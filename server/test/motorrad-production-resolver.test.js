import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandTuning } from '../brands.js';
import { rankCars } from '../engine.js';
import { publicCar } from '../index.js';
import { mapMotorradRaw, mapMotorradRawLegacy, mapMotorradRawWithScoringMode, MODEL_SPECS_MOTORRAD } from '../mapping.js';
import { MOTORRAD_RUNTIME_CATALOGUE } from '../data/motorrad-runtime-catalogue.js';
import { buildRuntimeCatalogue, renderRuntimeCatalogue, runtimeCatalogueMatchesGenerated, validateRuntimeCatalogue } from '../../scripts/build-motorrad-runtime-catalogue.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const fixtures = read('fixtures/motorrad-bikes.json');
const inventory = read('docs/motorrad-title-inventory.json');
const reviewedCatalogue = read('docs/motorrad-derivative-catalogue.json');
const classifications = read('docs/motorrad-signature-classification.json').classifications;
const classificationBySignature = new Map(classifications.map((item) => [item.stockSignatureId, item]));
const inventoryById = new Map(inventory.offers.map((item) => [String(item.offerId), item]));
const rawFor = (bike) => ({ id: bike.id, title: bike.name, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, fuel: bike.fuel, mileage: bike.mileage, image: bike.photo, link: bike.link });
const withoutIdentity = (bike) => {
  const { canonicalDerivativeId, identityResolutionStatus, identityResolutionReasonCodes, identityResolutionCandidateDerivativeIds, identityResolutionConflicts, scoringProfileId, scoringProfileMode, scoringExplanationFields, ...publicAndScoring } = bike || {};
  return publicAndScoring;
};

test('runtime catalogue is generated from review data, has no docs dependency, and detects drift', () => {
  assert.equal(MOTORRAD_RUNTIME_CATALOGUE.records.length, 107);
  assert.equal(validateRuntimeCatalogue(MOTORRAD_RUNTIME_CATALOGUE, reviewedCatalogue), true);
  assert.equal(runtimeCatalogueMatchesGenerated(), true);
  assert.equal(renderRuntimeCatalogue(buildRuntimeCatalogue(reviewedCatalogue)), readFileSync(join(ROOT, 'server/data/motorrad-runtime-catalogue.js'), 'utf8'));
  assert.throws(() => validateRuntimeCatalogue({ ...MOTORRAD_RUNTIME_CATALOGUE, records: [...MOTORRAD_RUNTIME_CATALOGUE.records, MOTORRAD_RUNTIME_CATALOGUE.records[0]] }, reviewedCatalogue), /duplicate/);
  assert.throws(() => validateRuntimeCatalogue({ ...MOTORRAD_RUNTIME_CATALOGUE, records: MOTORRAD_RUNTIME_CATALOGUE.records.map((record, index) => index ? record : { ...record, compatibilityProfile: 'not-a-profile' }) }, reviewedCatalogue), /unknown compatibility/);
  assert.doesNotMatch(readFileSync(join(ROOT, 'server/mapping.js'), 'utf8'), /docs\/motorrad-derivative-catalogue/);
});

test('production Motorrad mapping uses canonical identities and covers all reviewed signatures and fixtures', () => {
  assert.equal(classifications.length, 381);
  assert.equal(fixtures.length, 955);
  for (const fixture of fixtures) {
    const audit = inventoryById.get(String(fixture.id));
    const expected = classificationBySignature.get(`${audit.normalisedTitle}|${audit.registrationYear}|${audit.advertisedCc}|${audit.advertisedPowerKw}`);
    const mapped = mapMotorradRaw(rawFor(fixture));
    assert.equal(mapped.identityResolutionStatus, 'exact', fixture.id);
    assert.equal(mapped.canonicalDerivativeId, expected.canonicalDerivativeId, fixture.id);
    assert.ok(MODEL_SPECS_MOTORRAD[mapped.line], `${fixture.id} compatibility profile ${mapped.line}`);
  }
});

test('explicit legacy scoring mode preserves every captured compatibility listing and live cc/kW', () => {
  for (const fixture of fixtures) {
    const legacy = mapMotorradRawLegacy(rawFor(fixture));
    const production = mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy');
    assert.deepEqual(withoutIdentity(production), legacy, fixture.id);
  }
  const live = mapMotorradRawWithScoringMode({ id: 'live', title: 'BMW F900 R', price: 9000, cc: 900, powerKw: 77, year: 2025 }, 'legacy');
  assert.equal(live.canonicalDerivativeId, 'bmw-motorrad:f-900-r');
  assert.equal(live.line, 'F 900 R');
  assert.equal(live.cc, 900);
  assert.equal(live.power, 77);
});

test('catalogue compatibility keeps specific identities on their established scoring profiles', () => {
  for (const [title, cc, powerKw, id, profile] of [
    ['BMW F450 GS', 420, 35, 'f-450-gs', 'F 450 GS'],
    ['BMW F900 R A2', 895, 70, 'f-900-r-a2-70-kw', 'F 900 R'],
    ['BMW F 800 GS', 798, 63, 'f-800-gs-798cc', 'F 800 GS'],
    ['BMW F 800 GS', 895, 64, 'f-800-gs-895cc', 'F 800 GS'],
    ['BMW R 1250 RS', 1254, 100, 'r-1250-rs', 'R 1250 R'],
    ['BMW R 1250 RT', 1254, 96, 'r-1250-rt', 'R 1250 RT'],
    ['BMW R 1250 GS Adventure', 1254, 100, 'r-1250-gs-adventure', 'R 1250 GS Adventure'],
    ['BMW R nineT Pure', 1170, 81, 'r-ninet-pure', 'R nineT'],
    ['BMW HP2 Megamoto', 1170, 83, 'hp2-megamoto', 'R 1250 R'],
  ]) {
    const mapped = mapMotorradRawWithScoringMode({ id, title, price: 9000, cc, powerKw, year: 2022 }, 'legacy');
    assert.equal(mapped.canonicalDerivativeId, `bmw-motorrad:${id}`);
    assert.equal(mapped.line, profile);
  }
});

test('unresolved, ambiguous and conflicting listings are not silently assigned a scoring profile', () => {
  assert.equal(mapMotorradRaw({ id: 'unknown', title: 'BMW GS', price: 9000, cc: 1254, powerKw: 100 }), null);
  assert.equal(mapMotorradRaw({ id: 'ambiguous', title: 'BMW F 800 GS', price: 9000 }), null);
  assert.equal(mapMotorradRaw({ id: 'conflict', title: 'BMW F 900 R', price: 9000, cc: 1254, powerKw: 100 }), null);
});

test('legacy rollback mode retains the Phase 5 representative ranking baseline', () => {
  const oldCars = fixtures.map(rawFor).map(mapMotorradRawLegacy).filter(Boolean);
  const newCars = fixtures.map((fixture) => mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy')).filter(Boolean);
  const questionnaires = [
    { budget: [0, 12000], mileage: 'high', fuel: 'open', bodyStyles: ['scooter'], primaryUse: 'city', priorities: ['economy'], style: 2, licence: 'a1' },
    { budget: [0, 12000], mileage: 'mid', fuel: 'open', bodyStyles: ['adventure'], primaryUse: 'roadtrips', priorities: ['comfort'], style: 3, licence: 'a2' },
    { budget: [0, 30000], mileage: 'mid', fuel: 'open', bodyStyles: ['sport'], primaryUse: 'fun', priorities: ['performance'], style: 5, licence: 'a' },
    { budget: [0, 30000], mileage: 'high', fuel: 'open', bodyStyles: ['tourer'], primaryUse: 'roadtrips', priorities: ['comfort'], style: 2, licence: 'a' },
    { budget: [0, 20000], mileage: 'low', fuel: 'open', bodyStyles: ['heritage'], primaryUse: 'fun', priorities: ['image'], style: 3, licence: 'a' },
  ];
  const summary = (matches) => matches.map((match) => ({ id: match.car.id, score: match.score, fit: match.fit, taste: match.taste, stretch: match.stretch, reasons: match.reasons, tradeOffs: match.tradeOffs, licenceRatioCheck: match.licenceRatioCheck }));
  for (const answers of questionnaires) assert.deepEqual(summary(rankCars(answers, newCars, brandTuning('motorrad'))), summary(rankCars(answers, oldCars, brandTuning('motorrad'))));
});

test('API-safe mapping output excludes catalogue diagnostics and configuration', () => {
  const mapped = mapMotorradRaw(rawFor(fixtures[0]));
  const publicBike = publicCar(mapped);
  for (const key of ['canonicalDerivativeId', 'identityResolutionStatus', 'identityResolutionReasonCodes', 'identityResolutionCandidateDerivativeIds', 'identityResolutionConflicts', 'scoringProfileId', 'scoringProfileMode', 'scoringExplanationFields', 'resolver', 'compatibilityProfile']) assert.ok(!(key in publicBike), key);
  assert.equal(publicBike.cc, fixtures[0].cc);
  assert.equal(publicBike.power, fixtures[0].power);
});
