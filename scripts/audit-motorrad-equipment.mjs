import { readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:https';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseMotorradEquipmentResponse, MOTORRAD_FEATURE_VOCABULARY } from '../server/motorrad-equipment-parser.js';
import { verifyMotorradDetailIdentity } from '../server/motorrad-detail-identity.js';
import { motorradRowsFromEnvelope } from '../server/stock.js';
import { mapMotorradRaw } from '../server/mapping.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://approvedused.bmw-motorrad.co.uk';
const LANDING = '/UK/ergebnisse.cshtml';
const RESULTS = '/api/ResultOverview/ShowResultsFilterChanged';
const DETAIL = '/api/Detail/GetDetailDataByRowNumber';
const FIXTURE_PATH = join(ROOT, 'server/test/fixtures/motorrad-equipment-responses.json');
const DETAILS_CONCURRENCY = 3;
const PAGE_CONCURRENCY = 4;
const MAX_PAGES = Number(process.env.MOTORRAD_EQUIPMENT_PAGE_LIMIT) || 60;
const SAMPLE_LIMIT = Number(process.env.MOTORRAD_EQUIPMENT_SAMPLE_LIMIT) || 140;
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

function requestText(url, method = 'GET', body = null, headers = {}) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const req = request(url, { method, headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      let text = ''; res.setEncoding('utf8'); res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text, elapsedMs: Date.now() - started }));
    });
    req.on('error', reject); req.setTimeout(30000, () => req.destroy(new Error('request timeout'))); req.end(body || undefined);
  });
}

const bodyFor = (page) => ({
  InitFilter: false, IsFirstCall: false, MarktId: '2', BuNo: '', Culture: 'en-gb', Segment: [], FuelType: [], Marke: 10, Modell: [], Fahrzeugart: 0, Antrieb: 0, EZV: 0, EZB: 0, PreisVon: '', PreisBis: '', KMVon: '', KMBis: '', KWVon: '', KWBis: '', PowerUnit: 'HP', Farbe1Auswahl: [], Merkmale: '', Umkreis: 1, UmkreisPLZ: '', AngebotsNo: '', DetailAngebotsNo: '', Sonderausstattung: '', isSondermodell: false, Pakete: '', FilterHMFAChanged: false, FilterEZChanged: 0, FilterColorChanged: false,
  ResOverviewData: { pagingSize: 20, currResultCountToShow: 20, selectedPage: page, totalItemCount: 0, tableSortColumn: 16, tableSortDirection: 0, pageItemsToShow: 9 }, DetailData: { RowNumber: 0 }, currRequest: 1,
});

async function retry(work) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { const response = await work(); if (response.status < 500 && response.status !== 429) return response; failure = new Error(`HTTP ${response.status}`); } catch (error) { failure = error; }
    // Conservative bounded backoff: public audit only, not production traffic.
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }
  throw failure;
}

async function pool(items, concurrency, worker) {
  const result = []; let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) { const index = next; next += 1; result[index] = await worker(items[index], index); }
  }));
  return result;
}

export async function liveSample() {
  const landing = await retry(() => requestText(`${ORIGIN}${LANDING}`));
  const sid = (landing.text.match(/id="hfSID"[^>]*value="([^"]*)"/) || [])[1];
  if (!sid) throw new Error('normal public landing did not provide GMB-SID');
  const headers = { 'GMB-SID': sid, Origin: ORIGIN, Referer: `${ORIGIN}${LANDING}`, Accept: 'application/json, text/plain, */*' };
  const pages = await pool(Array.from({ length: MAX_PAGES }, (_, i) => i + 1), PAGE_CONCURRENCY, async (page) => {
    const response = await retry(() => requestText(`${ORIGIN}${RESULTS}`, 'POST', JSON.stringify(bodyFor(page)), headers));
    const envelope = JSON.parse(response.text); const rows = motorradRowsFromEnvelope(envelope);
    return { page, rows, elapsedMs: response.elapsedMs };
  });
  // Preserve BMW's own ShowResOvDetail offer/row pair. Array position is not a
  // detail row number and can return a valid response for the wrong bike.
  const rows = pages.flatMap(({ page, rows }) => rows.map((row) => ({ ...row, motorradDetailPage: page })))
    .filter((row) => row.id && row.title && Number.isFinite(row.motorradDetailRowNumber));
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const candidates = unique.map((row) => ({ ...row, mapped: mapMotorradRaw(row) })).filter((row) => row.mapped?.canonicalDerivativeId);
  const byDerivative = new Map();
  for (const row of candidates) { const list = byDerivative.get(row.mapped.canonicalDerivativeId) || []; list.push(row); byDerivative.set(row.mapped.canonicalDerivativeId, list); }
  const selected = [];
  for (const list of byDerivative.values()) {
    list.sort((a, b) => (a.year || 0) - (b.year || 0) || String(a.id).localeCompare(String(b.id)));
    selected.push(list[0]);
    if (list.length > 8 && list.at(-1).year !== list[0].year) selected.push(list.at(-1));
  }
  selected.sort((a, b) => String(a.mapped.canonicalDerivativeId).localeCompare(String(b.mapped.canonicalDerivativeId)) || String(a.id).localeCompare(String(b.id)));
  const sample = selected.slice(0, SAMPLE_LIMIT);
  const detailCache = new Map();
  const detailResults = await pool(sample, DETAILS_CONCURRENCY, async (row) => {
    if (detailCache.has(row.id)) return detailCache.get(row.id);
    const body = bodyFor(row.motorradDetailPage);
    body.DetailAngebotsNo = row.id;
    body.DetailData = { RowNumber: row.motorradDetailRowNumber };
    body.currRequest = 2;
    const started = Date.now();
    try {
      const response = await retry(() => requestText(`${ORIGIN}${DETAIL}`, 'POST', JSON.stringify(body), headers));
      const payload = JSON.parse(response.text);
      const identity = verifyMotorradDetailIdentity(row, payload);
      const item = identity.ok
        ? { ok: true, elapsedMs: Date.now() - started, row, payload, identity }
        : { ok: false, elapsedMs: Date.now() - started, row, identity };
      detailCache.set(row.id, item); return item;
    } catch (error) {
      const item = { ok: false, elapsedMs: Date.now() - started, row, error: String(error.message || error).replace(/[^A-Za-z0-9 .:-]/g, '') };
      detailCache.set(row.id, item); return item;
    }
  });
  return { mode: 'live-stratified-sample', liveOffersDiscovered: unique.length, pagesFetched: pages.length, pageLatencyMs: pages.map((page) => page.elapsedMs), availableCanonicalDerivatives: byDerivative.size, results: detailResults };
}

export function fixtureSample() {
  return {
    mode: 'sanitised-fixture-sample', liveOffersDiscovered: null, pagesFetched: 0, pageLatencyMs: [],
    availableCanonicalDerivatives: new Set(read(FIXTURE_PATH).map((item) => item.canonicalDerivativeId)).size,
    results: read(FIXTURE_PATH).map((item, index) => {
      const id = `sanitised-${index + 1}`;
      const line = item.canonicalDerivativeId === 'bmw-motorrad:s-1000-xr' ? 'S 1000 XR' : 'R 1250 GS';
      const row = { id, title: `BMW ${line}`, mapped: { canonicalDerivativeId: item.canonicalDerivativeId, line }, year: item.registrationYear, motorradDetailPage: 1, motorradDetailRowNumber: index + 1 };
      const payload = { ...item, angebotsNr: id, markeModell: `BMW ${line}` };
      const identity = verifyMotorradDetailIdentity(row, payload);
      return { ok: identity.ok, elapsedMs: 0, row, ...(identity.ok ? { payload } : {}), identity };
    }),
  };
}

function summarise(sample) {
  const phrases = new Map(); const features = new Map(); const featureStates = new Map(); const derivatives = new Map(); const fieldCounts = new Map(); const segments = new Map();
  let success = 0; let populated = 0; let identityMismatches = 0;
  for (const result of sample.results) {
    const derivative = result.row.mapped.canonicalDerivativeId; const bucket = derivatives.get(derivative) || { canonicalDerivativeId: derivative, sampled: 0, success: 0, registrationYears: new Set(), nonEmptyEquipment: 0 }; bucket.sampled += 1; if (result.row.year) bucket.registrationYears.add(result.row.year);
    if (!result.ok && result.identity?.reasonCodes?.includes('DETAIL_IDENTITY_MISMATCH')) identityMismatches += 1;
    if (result.ok) {
      success += 1; bucket.success += 1;
      const segment = result.identity.segment;
      if (segment) {
        const segmentBucket = segments.get(segment) || { exactLabel: segment, verifiedOffers: 0, canonicalDerivatives: new Set(), representatives: [] };
        segmentBucket.verifiedOffers += 1;
        segmentBucket.canonicalDerivatives.add(derivative);
        if (!segmentBucket.representatives.some((item) => item.canonicalDerivativeId === derivative)) segmentBucket.representatives.push({ offerId: String(result.row.id), canonicalDerivativeId: derivative, listingTitle: result.row.title, detailPage: result.row.motorradDetailPage, detailRowNumber: result.row.motorradDetailRowNumber });
        segments.set(segment, segmentBucket);
      }
      for (const field of ['ausstattungsText', 'merkmaleText', 'basisDaten', 'packagesText']) if (result.payload[field] != null && String(result.payload[field]).trim()) fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
      const extracted = parseMotorradEquipmentResponse(result.payload); if (extracted.length) { populated += 1; bucket.nonEmptyEquipment += 1; }
      for (const item of extracted) {
        const key = `${item.sourceField}|${item.normalisedWording}`; const phrase = phrases.get(key) || { rawWording: item.rawWording, normalisedWording: item.normalisedWording, sourceField: item.sourceField, occurrenceCount: 0, exampleCanonicalDerivatives: new Set(), proposedCanonicalFeatureId: item.proposedFeatureId, confidence: item.confidence, classification: item.classification, evidenceState: item.evidenceState, individualAdvert: item.individualAdvert, reviewNotes: item.reviewNotes };
        phrase.occurrenceCount += 1; phrase.exampleCanonicalDerivatives.add(derivative); phrases.set(key, phrase);
        if (item.proposedFeatureId) { features.set(item.proposedFeatureId, (features.get(item.proposedFeatureId) || 0) + 1); const states = featureStates.get(item.proposedFeatureId) || new Map(); states.set(item.evidenceState, (states.get(item.evidenceState) || 0) + 1); featureStates.set(item.proposedFeatureId, states); }
      }
    }
    derivatives.set(derivative, bucket);
  }
  const phraseRecords = [...phrases.values()].map((item) => ({ ...item, exampleCanonicalDerivatives: [...item.exampleCanonicalDerivatives].sort() })).sort((a, b) => b.occurrenceCount - a.occurrenceCount || a.normalisedWording.localeCompare(b.normalisedWording));
  const verifiedSegments = [...segments.values()].map((item) => ({ ...item, canonicalDerivatives: [...item.canonicalDerivatives].sort(), representatives: item.representatives.sort((a, b) => a.canonicalDerivativeId.localeCompare(b.canonicalDerivativeId)) })).sort((a, b) => a.exactLabel.localeCompare(b.exactLabel));
  return { generatedAt: '2026-09-16', mode: sample.mode, scope: sample.mode === 'live-stratified-sample' ? `Derivative-stratified live sample from ${sample.pagesFetched} requested result pages; percentages are sample percentages, not complete-pool percentages.` : 'Sanitised parser fixture sample; no live-coverage percentage is claimed.', liveOffersDiscovered: sample.liveOffersDiscovered, offersSampled: sample.results.length, successfulDetailRequests: success, failedDetailRequests: sample.results.length - success, offersWithNonEmptyEquipmentData: populated, sourceFieldCoverage: Object.fromEntries(fieldCounts), request: { pageRequests: sample.pagesFetched, detailRequests: sample.results.length, detailConcurrency: DETAILS_CONCURRENCY, retries: 2, uniqueOfferRequests: sample.results.length, meanPageLatencyMs: sample.pageLatencyMs.length ? Math.round(sample.pageLatencyMs.reduce((a, b) => a + b, 0) / sample.pageLatencyMs.length) : null, meanDetailLatencyMs: sample.results.length ? Math.round(sample.results.reduce((sum, result) => sum + result.elapsedMs, 0) / sample.results.length) : null }, availableCanonicalDerivatives: sample.availableCanonicalDerivatives, derivativeCoverage: [...derivatives.values()].map((item) => ({ ...item, registrationYears: [...item.registrationYears].sort((a, b) => a - b) })).sort((a, b) => a.canonicalDerivativeId.localeCompare(b.canonicalDerivativeId)), phrases: phraseRecords, featureOccurrenceCounts: Object.fromEntries([...features.entries()].sort()), featureEvidenceStates: Object.fromEntries([...featureStates.entries()].map(([id, states]) => [id, Object.fromEntries(states)]).sort(([a], [b]) => a.localeCompare(b))), phraseMetrics: { distinctRawEquipmentPhrases: phraseRecords.length, confidentlyMapped: phraseRecords.filter((item) => item.proposedCanonicalFeatureId && item.confidence === 'high' && item.evidenceState === 'advertised').length, packageOnly: phraseRecords.filter((item) => item.evidenceState === 'package-mentioned').length, uncertainOrUnmapped: phraseRecords.filter((item) => !item.proposedCanonicalFeatureId || item.evidenceState === 'uncertain').length } };
}

function coverage(audit) {
  const reliable = Object.entries(audit.featureEvidenceStates).filter(([, states]) => states.advertised).map(([id]) => id);
  return `# Motorrad equipment-data coverage\n\n${audit.scope}\n\n| Measure | Value |\n|---|---:|\n| Live offers discovered | ${audit.liveOffersDiscovered ?? 'not queried in fixture mode'} |\n| Offers sampled/audited | ${audit.offersSampled} |\n| Successful detail requests | ${audit.successfulDetailRequests} |\n| Failed detail requests | ${audit.failedDetailRequests} |\n| Non-empty equipment extracts | ${audit.offersWithNonEmptyEquipmentData} |\n| Available canonical derivatives | ${audit.availableCanonicalDerivatives} |\n| Distinct raw equipment phrases | ${audit.phraseMetrics.distinctRawEquipmentPhrases} |\n| Confident advertised mappings | ${audit.phraseMetrics.confidentlyMapped} |\n| Package-only phrases | ${audit.phraseMetrics.packageOnly} |\n| Uncertain/unmapped phrases | ${audit.phraseMetrics.uncertainOrUnmapped} |\n\n## Source-field availability\n\n${Object.entries(audit.sourceFieldCoverage).map(([field, count]) => `- ${field}: ${count}`).join('\n') || 'No response fields available.'}\n\n## Feature occurrences\n\n${Object.entries(audit.featureOccurrenceCounts).map(([id, count]) => `- ${id}: ${count}`).join('\n') || 'No mapped features.'}\n\n## Product-use assessment\n\n- Display/refinement candidates (structured advertised observations): ${reliable.join(', ') || 'none'}.\n- Soft scoring: none pending broader live-pool coverage, phrase stability review and explicit product approval.\n- Neither: package-only, narrative-only, uncertain and candidate-unobserved vocabulary entries.\n\n## Derivative/year sample coverage\n\n| Canonical derivative | Sampled | Successful | Non-empty | Registration years |\n|---|---:|---:|---:|---|\n${audit.derivativeCoverage.map((item) => `| ${item.canonicalDerivativeId} | ${item.sampled} | ${item.success} | ${item.nonEmptyEquipment} | ${item.registrationYears.join(', ') || 'not retained'} |`).join('\n')}\n\n## Operational recommendation\n\nPublic detail enrichment is suitable for a bounded, cached post-ranking display/refinement trial only when the live audit's detail success rate and phrase stability remain high. It is not suitable for first-stage hard filtering: absence means \`absent-from-data\`, not absent from the bike. Only structured \`ausstattungsText\` phrases mapped with high confidence are candidates for later display/refinement. Package labels remain \`package-mentioned\` and do not expand into features.\n`;
}

function vocabulary(audit) {
  return { generatedAt: '2026-09-16', purpose: 'Controlled review-only vocabulary. Candidate-unobserved/package-only entries are not eligible for product use.', features: MOTORRAD_FEATURE_VOCABULARY.map((feature) => {
    const states = audit.featureEvidenceStates[feature.id] || {}; const advertised = states.advertised || 0;
    return { ...feature, observedOccurrences: audit.featureOccurrenceCounts[feature.id] || 0, observedEvidenceStates: states, recommendedUse: advertised && feature.category !== 'package' ? 'display-or-refinement-candidate' : 'neither-pending-review' };
  }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sample = process.argv.includes('--fixtures') ? fixtureSample() : await liveSample();
  const audit = summarise(sample);
  writeFileSync(join(ROOT, 'docs/motorrad-equipment-vocabulary.json'), `${JSON.stringify(vocabulary(audit), null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs/motorrad-equipment-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs/motorrad-equipment-coverage.md'), coverage(audit));
  console.log(coverage(audit));
}
