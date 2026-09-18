import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue, coverage, validate } from '../../scripts/build-motorrad-derivative-catalogue.mjs';

const inventory = { metrics: { totalOffers: 2 }, offers: [{ selectedProfile: 'F 900 R' }, { selectedProfile: 'R 1250 R' }], signatures: [
  { signature: 'a', normalisedTitle: 'BMW F 900 R A2', registrationYear: 2025, advertisedCc: 895, advertisedPowerKw: 70, selectedProfile: 'F 900 R', selectedRule: 'contains:F 900 R', fallback: null, offerCount: 1 },
  { signature: 'b', normalisedTitle: 'BMW HP2 Sport', registrationYear: 2008, advertisedCc: 1170, advertisedPowerKw: 98, selectedProfile: 'R 1250 R', selectedRule: 'fallback:default-r1250r', fallback: 'generic', offerCount: 1 },
] };
const mass = { entries: [{ profile: 'F 900 R', kerbMassKg: 208, sourceUrl: 'https://example.test/f900r' }] };

test('catalogue classifies every signature deterministically and validates references', () => {
  const built = buildCatalogue(inventory, mass);
  assert.equal(validate(built, inventory), true);
  assert.equal(built.classifications.classifications[0].classificationStatus, 'exact');
  assert.equal(built.classifications.classifications[1].classificationStatus, 'exact');
  const hp2 = built.catalogue.records.find((record) => record.canonicalDerivativeId === 'bmw-motorrad:hp2-sport');
  assert.equal(hp2.technicalEvidence.researchComplete, true);
  assert.equal(hp2.technicalEvidence.fields.engine.status, 'unresolved');
  assert.ok(hp2.technicalEvidence.fields.engine.checkedSources.length >= 3);
  assert.match(coverage(built), /All records carry field-level source evidence/);
  assert.deepEqual(built, buildCatalogue(inventory, mass));
});
