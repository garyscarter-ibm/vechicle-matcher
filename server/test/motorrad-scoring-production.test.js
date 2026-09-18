import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicCar } from '../index.js';
import { licenceRatioCheck, rankCars } from '../engine.js';
import { brandTuning } from '../brands.js';
import { mapMotorradRaw, mapMotorradRawWithScoringMode, motorradScoringMode } from '../mapping.js';
import { MOTORRAD_RUNTIME_SCORING_PROFILES } from '../data/motorrad-runtime-scoring-profiles.js';
import { buildRuntimeScoringProfiles, renderRuntimeScoringProfiles, runtimeScoringProfilesMatchGenerated, validateRuntimeScoringProfiles } from '../../scripts/build-motorrad-runtime-scoring-profiles.mjs';
import { runMotorradProductionScoringAudit } from '../../scripts/audit-motorrad-scoring-production.mjs';
import { buildMotorradPerformanceCurveAudit } from '../../scripts/audit-motorrad-performance-curve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const fixtures = read('fixtures/motorrad-bikes.json');
const proposed = read('docs/motorrad-proposed-scoring-profiles.json');
const fieldAudit = read('docs/motorrad-scoring-field-audit.json');
const rawFor = (bike) => ({ id: bike.id, title: bike.name, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, fuel: bike.fuel, mileage: bike.mileage, image: bike.photo, link: bike.link });

test('all canonical runtime scoring profiles are generated, validated and drift-free', () => {
  assert.equal(MOTORRAD_RUNTIME_SCORING_PROFILES.profiles.length, 107);
  assert.equal(validateRuntimeScoringProfiles(MOTORRAD_RUNTIME_SCORING_PROFILES, proposed, fieldAudit), true);
  assert.equal(runtimeScoringProfilesMatchGenerated(), true);
  assert.equal(renderRuntimeScoringProfiles(buildRuntimeScoringProfiles(proposed, fieldAudit)), readFileSync(join(ROOT, 'server/data/motorrad-runtime-scoring-profiles.js'), 'utf8'));
  assert.throws(() => validateRuntimeScoringProfiles({ ...MOTORRAD_RUNTIME_SCORING_PROFILES, profiles: [...MOTORRAD_RUNTIME_SCORING_PROFILES.profiles, MOTORRAD_RUNTIME_SCORING_PROFILES.profiles[0]] }, proposed, fieldAudit), /count mismatch/);
});

test('catalogue is the production default, legacy is an explicit rollback, invalid mode fails safe', () => {
  const previous = process.env.MOTORRAD_SCORING_MODE;
  delete process.env.MOTORRAD_SCORING_MODE;
  assert.equal(motorradScoringMode(), 'catalogue');
  const catalogue = mapMotorradRaw({ id: 'catalogue', title: 'BMW F 900 R', price: 9000, cc: 895, powerKw: 77, year: 2025 });
  const legacy = mapMotorradRawWithScoringMode({ id: 'legacy', title: 'BMW F 900 R', price: 9000, cc: 895, powerKw: 77, year: 2025 }, 'legacy');
  assert.equal(catalogue.scoringProfileMode, 'catalogue');
  assert.equal(catalogue.zeroTo62, undefined);
  assert.equal(legacy.scoringProfileMode, 'legacy');
  assert.equal(legacy.zeroTo62, 3.7);
  process.env.MOTORRAD_SCORING_MODE = 'bad-value';
  assert.equal(motorradScoringMode(), 'catalogue');
  assert.equal(mapMotorradRaw({ id: 'safe', title: 'BMW F 900 R', price: 9000, cc: 895, powerKw: 77, year: 2025 }).scoringProfileMode, 'catalogue');
  if (previous == null) delete process.env.MOTORRAD_SCORING_MODE; else process.env.MOTORRAD_SCORING_MODE = previous;
});

test('catalogue mode maps all captures exactly with live facts intact and safe unavailable fields', () => {
  for (const fixture of fixtures) {
    const mapped = mapMotorradRawWithScoringMode(rawFor(fixture), 'catalogue');
    assert.equal(mapped.identityResolutionStatus, 'exact', fixture.id);
    assert.equal(mapped.scoringProfileId, mapped.canonicalDerivativeId, fixture.id);
    assert.equal(mapped.cc, fixture.cc, fixture.id);
    assert.equal(mapped.power, fixture.power, fixture.id);
    assert.equal(mapped.priceMin, fixture.priceMin, fixture.id);
    assert.equal(mapped.mileage, fixture.mileage, fixture.id);
  }
});

test('catalogue profile suppresses unavailable performance, luggage and pillion claims', () => {
  const bike = mapMotorradRawWithScoringMode({ id: 'unavailable', title: 'BMW F 900 R', price: 9000, cc: 895, powerKw: 77, year: 2025 }, 'catalogue');
  assert.equal(bike.zeroTo62, undefined);
  assert.equal(bike.boot, undefined);
  assert.equal(bike.seats, undefined);
  assert.equal(bike.mpg, 67.26, 'calculated official consumption retains its documented conversion');
  const answer = { budget: [0, 10000], mileage: 'high', fuel: 'open', bodyStyles: ['roadster'], primaryUse: 'roadtrips', priorities: ['performance'], style: 5, licence: 'a' };
  const match = rankCars(answer, [bike], brandTuning('motorrad'))[0];
  assert.ok(Number.isFinite(match.score));
  assert.doesNotMatch(match.reasons.join(' '), /0–62|luggage|seat/i);
});

test('licence eligibility uses live cc/kW and remains identical in both scoring modes', () => {
  const base = { budget: [0, 1000000], mileage: 'mid', fuel: 'open', bodyStyles: ['any'], primaryUse: 'fun', priorities: [], style: 3 };
  for (const licence of ['a1', 'a2', 'a']) {
    const answers = { ...base, licence };
    const legacy = fixtures.map(rawFor).map((raw) => mapMotorradRawWithScoringMode(raw, 'legacy')).filter(Boolean);
    const catalogue = fixtures.map(rawFor).map((raw) => mapMotorradRawWithScoringMode(raw, 'catalogue')).filter(Boolean);
    assert.deepEqual(rankCars(answers, legacy, brandTuning('motorrad')).map((match) => match.car.id).sort(), rankCars(answers, catalogue, brandTuning('motorrad')).map((match) => match.car.id).sort(), licence);
  }
});

test('production modes reproduce all twelve reviewed shadow scenarios', () => {
  const result = runMotorradProductionScoringAudit();
  assert.equal(result.offers, 955);
  assert.equal(result.canonicalExact, 955);
  assert.equal(result.scenarios.length, 12);
  assert.equal(result.allLegacyShadowMatches, true);
  assert.equal(result.allCatalogueShadowMatches, true);
  assert.ok(result.licence.every((row) => row.sameEligibility));
});

test('Motorrad sport performance uses generic advertised power-to-weight, then global kW fallback', () => {
  const answers = { budget: [0, 30000], mileage: 10000, fuel: 'open', bodyStyles: ['sport'], primaryUse: 'fun', priorities: ['performance'], style: 5, licence: 'a' };
  const wanted = new Set(['bmw-motorrad:f-900-xr', 'bmw-motorrad:s-1000-xr', 'bmw-motorrad:s-1000-rr']);
  const allBikes = fixtures.map(rawFor).map((raw) => mapMotorradRawWithScoringMode(raw, 'catalogue'));
  const bikes = [...wanted].map((id) => allBikes.find((bike) => bike.canonicalDerivativeId === id));
  const leaders = rankCars(answers, bikes, brandTuning('motorrad'));
  assert.deepEqual(leaders.slice(0, 3).map((match) => match.car.canonicalDerivativeId), ['bmw-motorrad:s-1000-rr', 'bmw-motorrad:s-1000-xr', 'bmw-motorrad:f-900-xr']);
  const fallback = { ...bikes.find((bike) => bike.canonicalDerivativeId === 'bmw-motorrad:s-1000-xr'), kerbMassKg: undefined };
  const fallbackMatch = rankCars(answers, [fallback], brandTuning('motorrad'))[0];
  assert.ok(fallbackMatch.taste > 31, 'advertised kW must provide non-neutral performance when mass is unavailable');
  const noPower = { ...fallback, advertisedPowerKw: undefined, power: undefined };
  assert.equal(rankCars(answers, [noPower], brandTuning('motorrad'))[0].taste, 31, 'missing advertised kW remains neutral');
});

test('frozen Motorrad performance anchors are derived from the full captured distribution', () => {
  const audit = buildMotorradPerformanceCurveAudit(fixtures);
  assert.equal(audit.fixtureOffers, 955);
  assert.equal(audit.sourcedMassOffers, 856);
  assert.deepEqual(audit.frozenCurve.powerToWeightKwPerKg, { low: 0.28, high: 0.78 });
  assert.deepEqual(audit.frozenCurve.advertisedPowerKwFallback, { low: 66, high: 154 });
});

test('API output keeps provenance and scoring diagnostics server-side', () => {
  const mapped = mapMotorradRawWithScoringMode(rawFor(fixtures[0]), 'catalogue');
  const publicBike = publicCar(mapped);
  for (const key of ['canonicalDerivativeId', 'identityResolutionStatus', 'scoringProfileId', 'scoringProfileMode', 'scoringExplanationFields', 'provenance', 'evidence']) assert.ok(!(key in publicBike), key);
});
