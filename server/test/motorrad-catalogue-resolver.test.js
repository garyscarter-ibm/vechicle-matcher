import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapMotorradRaw } from '../mapping.js';
import { createMotorradCatalogueResolver, normaliseMotorradTitle } from '../motorrad-catalogue-resolver.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const catalogue = read('docs/motorrad-derivative-catalogue.json');
const classifications = read('docs/motorrad-signature-classification.json').classifications;
const inventory = read('docs/motorrad-title-inventory.json');
const fixtures = read('fixtures/motorrad-bikes.json');
const resolve = createMotorradCatalogueResolver(catalogue);
const exact = (listing, id) => {
  const result = resolve(listing);
  assert.equal(result.status, 'exact', JSON.stringify(result));
  assert.equal(result.canonicalDerivativeId, `bmw-motorrad:${id}`);
  return result;
};

test('catalogue resolver agrees with all 381 reviewed signatures without consulting them', () => {
  assert.equal(classifications.length, 381);
  for (const classification of classifications) {
    const { evidence } = classification;
    const result = resolve({ title: evidence.titleTerms, year: evidence.registrationYear, cc: evidence.advertisedCc, powerKw: evidence.advertisedPowerKw });
    assert.equal(result.status, 'exact', classification.stockSignatureId);
    assert.equal(result.canonicalDerivativeId, classification.canonicalDerivativeId, classification.stockSignatureId);
  }
});

test('all 955 fixture offers reconcile while the production mapper retains its audited profile', () => {
  const byId = new Map(inventory.offers.map((offer) => [String(offer.offerId), offer]));
  assert.equal(fixtures.length, 955);
  for (const fixture of fixtures) {
    const audit = byId.get(String(fixture.id));
    const mapped = mapMotorradRaw({ id: fixture.id, title: fixture.name, price: fixture.priceMin, cc: fixture.cc, powerKw: fixture.power, year: fixture.year, firstReg: fixture.firstReg, fuel: fixture.fuel });
    assert.equal(mapped.line, audit.selectedProfile, fixture.id);
    const result = resolve({ title: fixture.name, firstRegistration: fixture.firstReg, cc: fixture.cc, powerKw: fixture.power });
    const signature = `${audit.normalisedTitle}|${audit.registrationYear}|${audit.advertisedCc}|${audit.advertisedPowerKw}`;
    const expected = classifications.find((item) => item.stockSignatureId === signature);
    assert.equal(result.canonicalDerivativeId, expected.canonicalDerivativeId, fixture.id);
  }
});

test('resolves specific Motorrad derivative and generation boundaries', () => {
  exact({ title: 'BMW F450 GS', year: 2026, cc: 420, powerKw: 35 }, 'f-450-gs');
  exact({ title: 'BMW F900 R A2', year: 2024, cc: 895, powerKw: 70 }, 'f-900-r-a2-70-kw');
  exact({ title: 'BMW F 900 R', year: 2024, cc: 895, powerKw: 77 }, 'f-900-r');
  exact({ title: 'BMW F 800 GS Trophy', year: 2017, cc: 798, powerKw: 63 }, 'f-800-gs-798cc');
  exact({ title: 'BMW F800 GS', year: 2025, cc: 895, powerKw: 64 }, 'f-800-gs-895cc');
  exact({ title: 'BMW R 1250 R', year: 2021, cc: 1254, powerKw: 100 }, 'r-1250-r');
  exact({ title: 'BMW R1250 RS', year: 2023, cc: 1254, powerKw: 100 }, 'r-1250-rs');
  exact({ title: 'BMW R 1250 RT LE', year: 2022, cc: 1254, powerKw: 96 }, 'r-1250-rt');
  exact({ title: 'BMW R 1250 GS', year: 2021, cc: 1254, powerKw: 100 }, 'r-1250-gs');
  exact({ title: 'BMW R1250 GS Adventure TE', year: 2021, cc: 1254, powerKw: 100 }, 'r-1250-gs-adventure');
  exact({ title: 'BMW R nineT Pure', year: 2021, cc: 1170, powerKw: 81 }, 'r-ninet-pure');
  exact({ title: 'BMW R nineT Urban G/S', year: 2021, cc: 1170, powerKw: 81 }, 'r-ninet-urban-g-s');
  exact({ title: 'BMW HP2 Megamoto', year: 2008, cc: 1170, powerKw: 83 }, 'hp2-megamoto');
  exact({ title: 'BMW HP2 Sport', year: 2008, cc: 1170, powerKw: 98 }, 'hp2-sport');
});

test('normalisation preserves meaningful tokens and supports unseen complete model titles', () => {
  assert.equal(normaliseMotorradTitle(' BMW  R nineT Urban G / S  '), 'BMW R NINET URBAN G/S');
  assert.equal(normaliseMotorradTitle('BMW F900-R'), 'BMW F 900 R');
  const result = exact({ title: 'BMW F900 R New Colour', cc: 895, powerKw: 77 }, 'f-900-r');
  assert.match(result.reasonCodes.join(','), /MISSING_REGISTRATION_YEAR/);
});

test('conflicts, ambiguity and unknowns fail safe instead of using catalogue order', () => {
  const conflict = resolve({ title: 'BMW F 900 R', year: 2024, cc: 1254, powerKw: 100 });
  assert.equal(conflict.status, 'unknown');
  assert.ok(conflict.conflicts.some((item) => item.code === 'MATERIAL_CC_CONFLICT'));
  const ambiguous = resolve({ title: 'BMW R nineT Pure and BMW R nineT Sport', cc: 1170, powerKw: 81 });
  assert.equal(ambiguous.status, 'ambiguous');
  assert.deepEqual(ambiguous.candidateDerivativeIds, ['bmw-motorrad:r-ninet-pure', 'bmw-motorrad:r-ninet-sport']);
  const missingSpecs = resolve({ title: 'BMW F 800 GS' });
  assert.equal(missingSpecs.status, 'ambiguous');
  assert.equal(resolve({ title: 'BMW GS', cc: 1254, powerKw: 100 }).status, 'unknown');
  assert.equal(resolve({ cc: 895, powerKw: 77 }).status, 'unknown');
  const reversed = createMotorradCatalogueResolver({ ...catalogue, records: [...catalogue.records].reverse() });
  assert.deepEqual(reversed({ title: 'BMW R nineT Pure and BMW R nineT Sport', cc: 1170, powerKw: 81 }), ambiguous);
});
