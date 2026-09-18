import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapMotorradRaw } from '../server/mapping.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DERIVATIVE_WORDS = ['ADVENTURE', 'RS', 'RT', 'GTL', 'GT', 'CLASSIC', 'ROCTANE', 'PURE', 'SPORT', 'G/S', 'B'];
const RULES = [
  ['M 1000 RR', 'M 1000 RR'], ['S 1000 RR', 'S 1000 RR'], ['M 1000 XR', 'M 1000 XR'], ['S 1000 XR', 'S 1000 XR'],
  ['M 1000 R', 'M 1000 R'], ['S 1000 R', 'S 1000 R'], ['R 1300 GS ADVENTURE', 'R 1300 GS Adventure'], ['R 1300 GSA', 'R 1300 GS Adventure'],
  ['R 1250 GS ADVENTURE', 'R 1250 GS Adventure'], ['R 1250 GSA', 'R 1250 GS Adventure'], ['R 1300 GS', 'R 1300 GS'], ['R 1250 GS', 'R 1250 GS'], ['R 1200 GS', 'R 1200 GS'],
  ['F 900 GS ADVENTURE', 'F 900 GS Adventure'], ['F 900 GSA', 'F 900 GS Adventure'], ['F 900 GS', 'F 900 GS'], ['F 850 GS', 'F 850 GS'], ['F 800 GS', 'F 800 GS'],
  ['F 750 GS', 'F 750 GS'], ['G 310 GS', 'G 310 GS'], ['F 450 GS', 'F 450 GS'], ['F450 GS', 'F 450 GS'], ['K 1600 GRAND AMERICA', 'K 1600 Grand America'],
  ['K 1600 GTL', 'K 1600 GTL'], ['K 1600 GT', 'K 1600 GT'], ['K 1600 B', 'K 1600 B'], ['K 1300 S', 'K 1300 S'], ['R 1300 RT', 'R 1300 RT'],
  ['R 1250 RT', 'R 1250 RT'], ['R 1300 RS', 'R 1300 RS'], ['R 1300 R', 'R 1300 R'], ['R 1250 R', 'R 1250 R'], ['R 1200 R', 'R 1200 R'],
  ['F 900 XR', 'F 900 XR'], ['F 900 R', 'F 900 R'], ['F 800 R', 'F 800 R'], ['G 310 R', 'G 310 R'], ['R 18 TRANSCONTINENTAL', 'R 18 Transcontinental'],
  ['R 18 ROCTANE', 'R 18 Roctane'], ['R 18 CLASSIC', 'R 18 Classic'], ['R 18 B', 'R 18 B'], ['R 18', 'R 18'], ['R 12', 'R 12'],
  ['C 400 GT', 'C 400 GT'], ['C 400 X', 'C 400 X'], ['CE 04', 'CE 04'], ['CE 02', 'CE 02'],
];

export function traceTitle(title = '') {
  const normalisedTitle = String(title).toUpperCase().replace(/\s+/g, ' ').trim();
  const special = [
    [/\bR 12 NINET|R12 NINET/, 'R 12 nineT', 'special:r-12-ninet'],
    [/\bR NINET|RNINET|R NINE T\b/, 'R nineT', 'special:r-ninet'],
    [/\bR 12 G\/?S\b|\bR12 G\/?S\b/, 'R 12 G/S', 'special:r-12-gs'],
    [/\bR 12 S\b|\bR12 S\b/, 'R 12 S', 'special:r-12-s'],
  ].find(([re]) => re.test(normalisedTitle));
  const matches = RULES.filter(([probe]) => normalisedTitle.includes(probe)).map(([probe, profile]) => ({ probe, profile }));
  if (special) return { normalisedTitle, profile: special[1], rule: special[2], fallback: null, matches };
  if (matches.length) return { normalisedTitle, profile: matches[0].profile, rule: `contains:${matches[0].probe}`, fallback: null, matches };
  const fallbacks = [[/\bGS\b/, 'R 1250 GS', 'family:gs'], [/\bRT\b/, 'R 1250 RT', 'family:rt'], [/\bRR\b/, 'S 1000 RR', 'family:rr'], [/NINET|NINE T/, 'R nineT', 'family:ninet']];
  const fallback = fallbacks.find(([re]) => re.test(normalisedTitle));
  return fallback
    ? { normalisedTitle, profile: fallback[1], rule: fallback[2], fallback: 'family', matches }
    : { normalisedTitle, profile: 'R 1250 R', rule: 'fallback:default-r1250r', fallback: 'generic', matches };
}

const value = (n) => Number.isFinite(n) ? n : null;
const yearOf = (bike) => bike.year ?? (String(bike.firstReg || '').match(/(\d{4})$/) || [])[1] ?? null;
const keyOf = (o) => [o.normalisedTitle, o.registrationYear, o.advertisedCc, o.advertisedPowerKw].join('|');

function findingsFor(offers) {
  const findings = [];
  const byProfile = Object.groupBy(offers, (o) => o.selectedProfile);
  for (const [profile, rows] of Object.entries(byProfile)) {
    const clusters = new Set(rows.map((o) => `${o.advertisedCc}|${o.advertisedPowerKw}`));
    if (clusters.size > 1) findings.push({ reasonCode: 'MULTIPLE_SPEC_CLUSTERS', currentProfile: profile, affectedOfferCount: rows.length, evidence: [...clusters].sort(), priority: rows.length >= 20 ? 'high' : 'medium' });
  }
  for (const offer of offers) {
    if (offer.fallback) findings.push({ reasonCode: 'FALLBACK_RULE', currentProfile: offer.selectedProfile, affectedOfferCount: 1, evidence: [offer.originalListingTitle], priority: 'high' });
    if (offer.matchingRules.length > 1) findings.push({ reasonCode: 'OVERLAPPING_RULES', currentProfile: offer.selectedProfile, affectedOfferCount: 1, evidence: offer.matchingRules.map((m) => m.probe), priority: 'medium' });
    const discarded = DERIVATIVE_WORDS.filter((word) => offer.normalisedTitle.includes(word) && !offer.selectedProfile.toUpperCase().includes(word));
    if (discarded.length) findings.push({ reasonCode: 'DISCARDED_DERIVATIVE_TERM', currentProfile: offer.selectedProfile, affectedOfferCount: 1, evidence: discarded, offerId: offer.offerId, priority: 'medium' });
  }
  return findings.sort((a, b) => b.affectedOfferCount - a.affectedOfferCount || a.reasonCode.localeCompare(b.reasonCode));
}

export function buildInventory(bikes) {
  const offers = bikes.map((bike) => {
    const capturedListingTitle = bike.name || '';
    const mapped = mapMotorradRaw({ id: bike.id, title: capturedListingTitle, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, mileage: bike.mileage, image: bike.photo, link: bike.link });
    const trace = traceTitle(capturedListingTitle);
    if (mapped.line !== trace.profile) throw new Error(`trace mismatch for ${bike.id}: ${trace.profile} != ${mapped.line}`);
    return { offerId: String(bike.id), originalListingTitle: capturedListingTitle, normalisedTitle: mapped.name, registrationYear: yearOf(bike), firstRegistration: bike.firstReg || null, advertisedCc: value(bike.cc), advertisedPowerKw: value(bike.power), selectedProfile: mapped.line, selectedRule: trace.rule, fallback: trace.fallback, matchingRules: trace.matches };
  }).sort((a, b) => a.offerId.localeCompare(b.offerId));
  const signatures = Object.values(Object.groupBy(offers, keyOf)).map((rows) => ({ signature: keyOf(rows[0]), offerCount: rows.length, representativeOfferIds: rows.map((o) => o.offerId).sort().slice(0, 10), rawTitleVariations: [...new Set(rows.map((o) => o.originalListingTitle))].sort(), normalisedTitle: rows[0].normalisedTitle, registrationYear: rows[0].registrationYear, advertisedCc: rows[0].advertisedCc, advertisedPowerKw: rows[0].advertisedPowerKw, selectedProfile: rows[0].selectedProfile, selectedRule: rows[0].selectedRule, fallback: rows[0].fallback })).sort((a, b) => a.signature.localeCompare(b.signature));
  const findings = findingsFor(offers);
  const metrics = { totalOffers: offers.length, distinctRawTitles: new Set(offers.map((o) => o.originalListingTitle)).size, distinctStockSignatures: signatures.length, explicitRuleOffers: offers.filter((o) => !o.fallback).length, fallbackOffers: offers.filter((o) => o.fallback === 'family').length, genericFallbackOffers: offers.filter((o) => o.fallback === 'generic').length, unmatchedOffers: offers.filter((o) => o.fallback).length, overlappingRuleOffers: offers.filter((o) => o.matchingRules.length > 1).length, profilesWithMultipleSpecClusters: findings.filter((f) => f.reasonCode === 'MULTIPLE_SPEC_CLUSTERS').length };
  return { generatedFrom: 'fixtures/motorrad-bikes.json', auditVersion: 1, metrics, offers, signatures, findings };
}

export function report(inventory) {
  const m = inventory.metrics;
  const high = inventory.findings.filter((f) => f.priority === 'high').slice(0, 12);
  return `# Motorrad profile coverage audit\n\nProcessed **${m.totalOffers}** offers. The fixture retains the captured display title, not an immutable upstream raw title.\n\n| Measure | Count |\n|---|---:|\n| Distinct captured titles | ${m.distinctRawTitles} |\n| Distinct stock signatures | ${m.distinctStockSignatures} |\n| Explicit-rule offers | ${m.explicitRuleOffers} |\n| Family fallback offers | ${m.fallbackOffers} |\n| Generic fallback offers | ${m.genericFallbackOffers} |\n| Unmatched/fallback offers | ${m.unmatchedOffers} |\n| Parent-prefix rule overlaps | ${m.overlappingRuleOffers} |\n| Profiles with multiple cc/kW clusters | ${m.profilesWithMultipleSpecClusters} |\n\nAn overlap means a title satisfied more than one ordered probe; it is review evidence, not automatically an error.\n\n## Highest-volume findings\n\n${high.map((f) => `- **${f.currentProfile}** (${f.affectedOfferCount}) — ${f.reasonCode}: ${f.evidence.join(', ')}`).join('\n') || 'None.'}\n\nThe machine-readable offer, signature and finding evidence is in motorrad-title-inventory.json.\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bikes = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'motorrad-bikes.json'), 'utf8'));
  const inventory = buildInventory(bikes);
  writeFileSync(join(ROOT, 'docs', 'motorrad-title-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-profile-coverage.md'), report(inventory));
  console.log(JSON.stringify(inventory.metrics, null, 2));
}
