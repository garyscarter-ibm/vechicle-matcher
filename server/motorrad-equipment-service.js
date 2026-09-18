import { request } from 'node:https';
import { MOTORRAD_FEATURE_VOCABULARY, parseMotorradEquipmentResponse } from './motorrad-equipment-parser.js';

const ORIGIN = 'https://approvedused.bmw-motorrad.co.uk';
const DEFAULTS = Object.freeze({ enabled: true, maxOffers: 3, concurrency: 2, requestTimeoutMs: 2500, totalTimeoutMs: 5000, positiveTtlMs: 10 * 60 * 1000, negativeTtlMs: 60 * 1000 });
const allowed = new Map(MOTORRAD_FEATURE_VOCABULARY.filter((feature) => feature.displayEligible).map((feature) => [feature.id, feature]));
const integer = (value, fallback, min, max) => { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= min && n <= max ? n : fallback; };

export function motorradEquipmentConfig(env = process.env) {
  const flag = String(env.MOTORRAD_EQUIPMENT_ENRICHMENT ?? '1').toLowerCase();
  const enabled = ['1', 'true', 'on', 'yes'].includes(flag) ? true : ['0', 'false', 'off', 'no'].includes(flag) ? false : DEFAULTS.enabled;
  return { enabled, maxOffers: integer(env.MOTORRAD_EQUIPMENT_MAX_OFFERS, DEFAULTS.maxOffers, 1, 6), concurrency: integer(env.MOTORRAD_EQUIPMENT_CONCURRENCY, DEFAULTS.concurrency, 1, 3), requestTimeoutMs: integer(env.MOTORRAD_EQUIPMENT_REQUEST_TIMEOUT_MS, DEFAULTS.requestTimeoutMs, 250, 10000), totalTimeoutMs: integer(env.MOTORRAD_EQUIPMENT_TOTAL_TIMEOUT_MS, DEFAULTS.totalTimeoutMs, 500, 15000), positiveTtlMs: integer(env.MOTORRAD_EQUIPMENT_POSITIVE_TTL_MS, DEFAULTS.positiveTtlMs, 1000, 3600000), negativeTtlMs: integer(env.MOTORRAD_EQUIPMENT_NEGATIVE_TTL_MS, DEFAULTS.negativeTtlMs, 1000, 300000) };
}

function requestText(url, method = 'GET', body, headers = {}) {
  return new Promise((resolve, reject) => { const req = request(url, { method, headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => { let text = ''; res.setEncoding('utf8'); res.on('data', (chunk) => { text += chunk; }); res.on('end', () => resolve({ status: res.statusCode, text })); }); req.on('error', reject); req.end(body); });
}

function detailBody(offer) { return { InitFilter: false, IsFirstCall: false, MarktId: '2', Culture: 'en-gb', Marke: 10, ResOverviewData: { pagingSize: 20, currResultCountToShow: 20, selectedPage: offer.motorradDetailPage, totalItemCount: 0, tableSortColumn: 16, tableSortDirection: 0, pageItemsToShow: 9 }, DetailAngebotsNo: offer.id, DetailData: { RowNumber: offer.motorradDetailRowNumber }, currRequest: 2 }; }

/** Normal browser journey: landing page mints a session, then public detail. */
export function createMotorradPublicDetailTransport() {
  let session;
  async function sid() {
    if (!session) session = requestText(`${ORIGIN}/UK/ergebnisse.cshtml`).then((res) => { const value = (res.text.match(/id="hfSID"[^>]*value="([^"]*)"/) || [])[1]; if (res.status !== 200 || !value) throw new Error('SESSION_UNAVAILABLE'); return value; });
    return session;
  }
  return async (offer) => {
    if (!offer?.motorradDetailPage || !offer?.motorradDetailRowNumber) throw new Error('DETAIL_CONTEXT_UNAVAILABLE');
    const token = await sid(); const body = JSON.stringify(detailBody(offer));
    const res = await requestText(`${ORIGIN}/api/Detail/GetDetailDataByRowNumber`, 'POST', body, { 'GMB-SID': token, Origin: ORIGIN, Referer: `${ORIGIN}/UK/ergebnisse.cshtml`, Accept: 'application/json, text/plain, */*' });
    if (res.status !== 200) throw new Error(`DETAIL_HTTP_${res.status}`);
    return JSON.parse(res.text);
  };
}

const timeout = (promise, ms) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('DETAIL_TIMEOUT')), ms); Promise.resolve(promise).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); }); });

export function createMotorradEquipmentEnricher({ transport = createMotorradPublicDetailTransport(), now = () => Date.now(), config = motorradEquipmentConfig(), cache = new Map() } = {}) {
  const inFlight = new Map(); const stats = { cacheHit: 0, cacheMiss: 0, success: 0, failed: 0, timedOut: 0, returnedWithFeatures: 0, returnedWithoutFeatures: 0 };
  const safe = (offerId, payload) => {
    const advertisedFeatures = parseMotorradEquipmentResponse(payload).filter((item) => item.sourceField === 'ausstattungsText' && item.evidenceState === 'advertised' && item.individualAdvert && item.confidence === 'high' && item.classification === 'feature' && item.proposedFeatureId && allowed.has(item.proposedFeatureId)).map((item) => allowed.get(item.proposedFeatureId)).filter((feature, index, all) => all.findIndex((candidate) => candidate.id === feature.id) === index).map(({ id, displayLabel: label, category }) => ({ id, label, category }));
    return { offerId: String(offerId), status: advertisedFeatures.length ? 'advertised-features' : 'no-approved-features', advertisedFeatures, checkedAt: now(), reasonCodes: advertisedFeatures.length ? ['STRUCTURED_ADVERTISED_FEATURES'] : ['NO_APPROVED_STRUCTURED_FEATURES'] };
  };
  const one = (offer) => {
    const id = String(offer.id); const hit = cache.get(id);
    if (hit && hit.expiresAt > now()) { stats.cacheHit += 1; return Promise.resolve(hit.value); }
    if (inFlight.has(id)) return inFlight.get(id);
    stats.cacheMiss += 1;
    const task = timeout(Promise.resolve().then(() => transport(offer)), config.requestTimeoutMs).then((payload) => { const value = safe(id, payload); stats.success += 1; stats.returnedWithFeatures += Number(value.advertisedFeatures.length > 0); stats.returnedWithoutFeatures += Number(value.advertisedFeatures.length === 0); cache.set(id, { expiresAt: now() + config.positiveTtlMs, value }); return value; }, (error) => { const code = error.message === 'DETAIL_TIMEOUT' ? 'DETAIL_TIMEOUT' : 'DETAIL_UNAVAILABLE'; stats.failed += 1; stats.timedOut += Number(code === 'DETAIL_TIMEOUT'); const value = { offerId: id, status: 'detail-unavailable', advertisedFeatures: [], checkedAt: now(), reasonCodes: [code] }; cache.set(id, { expiresAt: now() + config.negativeTtlMs, value }); return value; }).finally(() => inFlight.delete(id));
    inFlight.set(id, task); return task;
  };
  const enrich = async (offers = []) => {
    if (!config.enabled) return new Map();
    const selected = [...new Map(offers.filter(Boolean).map((offer) => [String(offer.id), offer])).values()].slice(0, config.maxOffers);
    const deadline = now() + config.totalTimeoutMs; const out = new Map(); let next = 0;
    await Promise.all(Array.from({ length: Math.min(config.concurrency, selected.length) }, async () => { while (next < selected.length && now() < deadline) { const index = next; next += 1; try { out.set(String(selected[index].id), await timeout(one(selected[index]), Math.max(1, deadline - now()))); } catch { out.set(String(selected[index].id), { offerId: String(selected[index].id), status: 'detail-unavailable', advertisedFeatures: [], checkedAt: now(), reasonCodes: ['ENRICHMENT_TOTAL_TIMEOUT'] }); } } }));
    return out;
  };
  return { enrich, cache, stats, config };
}

export const motorradEquipmentEnricher = createMotorradEquipmentEnricher();
