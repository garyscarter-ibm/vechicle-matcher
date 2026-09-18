import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapMotorradRaw, mapMotorradRawLegacy } from '../server/mapping.js';
import { createMotorradCatalogueResolver } from '../server/motorrad-catalogue-resolver.js';
import { MOTORRAD_RUNTIME_CATALOGUE } from '../server/data/motorrad-runtime-catalogue.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const catalogue = read('docs/motorrad-derivative-catalogue.json');
const classifications = read('docs/motorrad-signature-classification.json').classifications;
const inventory = read('docs/motorrad-title-inventory.json');
const fixtures = read('fixtures/motorrad-bikes.json');
const resolve = createMotorradCatalogueResolver(MOTORRAD_RUNTIME_CATALOGUE);
const classificationBySignature = new Map(classifications.map((item) => [item.stockSignatureId, item]));
const inventoryByOfferId = new Map(inventory.offers.map((offer) => [String(offer.offerId), offer]));
const recordById = new Map(catalogue.records.map((record) => [record.canonicalDerivativeId, record]));

function report(shadow) {
  const offers = shadow.offers;
  const byStatus = Object.groupBy(offers, (offer) => offer.resolverStatus);
  const signatures = new Map();
  for (const offer of offers) signatures.set(offer.stockSignatureId, offer);
  const changes = new Map();
  for (const offer of offers) {
    const key = `${offer.legacyProductionProfile} → ${offer.reviewedExpectedDerivativeId}`;
    const group = changes.get(key) || { count: 0, example: offer };
    group.count += 1;
    changes.set(key, group);
  }
  const changed = [...changes.entries()].filter(([key]) => !key.endsWith(`:${key.split(' → ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`)).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  const unexplained = offers.filter((offer) => !offer.matchesReviewedIdentity);
  const missing = offers.filter((offer) => offer.advertisedCc == null || offer.advertisedPowerKw == null || offer.registrationYear == null);
  const conflicting = offers.filter((offer) => offer.resolverConflicts.some((conflict) => /^MATERIAL_/.test(conflict.code)));
  const yearNotes = offers.filter((offer) => offer.resolverConflicts.some((conflict) => conflict.code === 'REGISTRATION_YEAR_OUTSIDE_DOCUMENTED_RANGE'));
  const line = (status) => (byStatus[status] || []).length;
  return `# Motorrad resolver shadow report

Review date: 2026-09-16. This report compares the retained legacy first-match mapper with the production catalogue resolver. The catalogue resolver is now the Motorrad production identity layer; scoring remains on the explicit legacy compatibility profile.

## Reconciliation

| Measure | Offers | Signatures |
|---|---:|---:|
| Captured / processed | ${offers.length} | ${signatures.size} |
| Resolver exact | ${line('exact')} | ${new Set((byStatus.exact || []).map((offer) => offer.stockSignatureId)).size} |
| Resolver family-only | ${line('family-only')} | ${new Set((byStatus['family-only'] || []).map((offer) => offer.stockSignatureId)).size} |
| Resolver ambiguous | ${line('ambiguous')} | ${new Set((byStatus.ambiguous || []).map((offer) => offer.stockSignatureId)).size} |
| Resolver unknown | ${line('unknown')} | ${new Set((byStatus.unknown || []).map((offer) => offer.stockSignatureId)).size} |
| Agreement with reviewed identity | ${offers.length - unexplained.length} | ${signatures.size - new Set(unexplained.map((offer) => offer.stockSignatureId)).size} |

Unexplained disagreements: ${unexplained.length}. Missing listing facts (year, cc, or kW): ${missing.length}. Material title/spec conflicts: ${conflicting.length}. Non-blocking registration-year notes: ${yearNotes.length}.

## Production profile to canonical derivative

The following are identity granularity changes, not production changes. Each representative is a real captured listing.

| Legacy profile | Canonical derivative | Offers | Representative listing |
|---|---|---:|---|
${changed.map(([key, group]) => { const [profile, derivative] = key.split(' → '); return `| ${profile} | ${derivative} | ${group.count} | ${group.example.title} (${group.example.offerId}) |`; }).join('\n')}

## Highest-volume identity corrections

${changed.slice(0, 10).map(([key, group]) => `- ${key}: ${group.count} offers — ${group.example.title} (${group.example.offerId})`).join('\n') || 'None.'}

## Listing data quality

${missing.length ? missing.slice(0, 25).map((offer) => `- ${offer.offerId}: missing ${[offer.registrationYear == null && 'year', offer.advertisedCc == null && 'cc', offer.advertisedPowerKw == null && 'kW'].filter(Boolean).join(', ')} — ${offer.title}`).join('\n') : 'No captured listing is missing year, advertised cc, or advertised kW.'}

${conflicting.length ? `\nMaterial conflicts:\n\n${conflicting.slice(0, 25).map((offer) => `- ${offer.offerId}: ${offer.title} — ${offer.resolverConflicts.map((conflict) => conflict.code).join(', ')}`).join('\n')}` : '\nNo captured listing has a material title/cc/kW conflict.'}

${yearNotes.length ? `\nRegistration-year notes (first registration is supporting evidence, so these do not force a generation rejection):\n\n${yearNotes.map((offer) => { const note = offer.resolverConflicts.find((conflict) => conflict.code === 'REGISTRATION_YEAR_OUTSIDE_DOCUMENTED_RANGE'); return `- ${offer.offerId}: ${offer.title} — ${note.registrationYear} outside ${note.documentedRange}`; }).join('\n')}` : ''}

## Unexplained disagreements

${unexplained.length ? unexplained.map((offer) => `- ${offer.offerId}: expected ${offer.reviewedExpectedDerivativeId}, resolver ${offer.resolverStatus}/${offer.newCanonicalDerivativeId || 'none'} — ${offer.title}`).join('\n') : 'None.'}
`;
}

const offers = fixtures.map((fixture) => {
  const inventoryOffer = inventoryByOfferId.get(String(fixture.id));
  if (!inventoryOffer) throw new Error(`fixture ${fixture.id} has no title-inventory record`);
  const stockSignatureId = `${inventoryOffer.normalisedTitle}|${inventoryOffer.registrationYear}|${inventoryOffer.advertisedCc}|${inventoryOffer.advertisedPowerKw}`;
  const reviewed = classificationBySignature.get(stockSignatureId);
  if (!reviewed) throw new Error(`fixture ${fixture.id} has no reviewed signature: ${stockSignatureId}`);
  const raw = { id: fixture.id, title: fixture.name, price: fixture.priceMin, cc: fixture.cc, powerKw: fixture.power, year: fixture.year, firstReg: fixture.firstReg, fuel: fixture.fuel, mileage: fixture.mileage, image: fixture.photo, link: fixture.link };
  const legacy = mapMotorradRawLegacy(raw);
  const production = mapMotorradRaw(raw);
  const result = resolve({ title: fixture.name, firstRegistration: fixture.firstReg, year: fixture.year, advertisedCc: fixture.cc, advertisedPowerKw: fixture.power });
  const canonical = recordById.get(reviewed.canonicalDerivativeId);
  return {
    offerId: String(fixture.id), title: fixture.name, firstRegistration: fixture.firstReg ?? null, registrationYear: fixture.year ?? null, advertisedCc: fixture.cc ?? null, advertisedPowerKw: fixture.power ?? null,
    stockSignatureId,
    legacyResolver: { compatibilityProfile: legacy?.line ?? null, productionRule: inventoryOffer.selectedRule, matchesProductionAudit: legacy?.line === inventoryOffer.selectedProfile },
    productionCatalogueResolver: { status: production?.identityResolutionStatus ?? result.status, canonicalDerivativeId: production?.canonicalDerivativeId ?? null, compatibilityScoringProfile: production?.line ?? null },
    legacyProductionProfile: legacy?.line ?? null, legacyProductionRule: inventoryOffer.selectedRule, legacyProfileMatchesAudit: legacy?.line === inventoryOffer.selectedProfile,
    productionCatalogueResolverStatus: production?.identityResolutionStatus ?? result.status, productionCanonicalDerivativeId: production?.canonicalDerivativeId ?? null, compatibilityScoringProfile: production?.line ?? null,
    resolverStatus: result.status, newCanonicalDerivativeId: result.canonicalDerivativeId, reviewedExpectedDerivativeId: reviewed.canonicalDerivativeId, reviewedClassificationStatus: reviewed.classificationStatus,
    resolverConfidence: result.confidence, resolverEvidence: result.evidence, resolverReasonCodes: result.reasonCodes, resolverConflicts: result.conflicts,
    matchesReviewedIdentity: result.status === 'exact' && result.canonicalDerivativeId === reviewed.canonicalDerivativeId,
    productionAndCatalogueDiffer: legacy?.line !== canonical?.derivativeTrim,
  };
});

const shadow = {
  generatedAt: '2026-09-16',
  purpose: 'Shadow comparison only. The generated result is not consumed by production mapping or scoring.',
  input: { fixtureOffers: fixtures.length, reviewedSignatures: classifications.length, catalogueRecords: catalogue.records.length },
  offers,
};
writeFileSync(join(ROOT, 'docs/motorrad-resolver-shadow-results.json'), `${JSON.stringify(shadow, null, 2)}\n`);
writeFileSync(join(ROOT, 'docs/motorrad-resolver-shadow-report.md'), report(shadow));
console.log(report(shadow));
