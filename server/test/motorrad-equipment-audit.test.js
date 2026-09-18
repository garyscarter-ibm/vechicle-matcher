import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MOTORRAD_FEATURE_VOCABULARY, parseMotorradEquipmentResponse } from '../motorrad-equipment-parser.js';
import { DETAIL_IDENTITY_MISMATCH, extractMotorradDetailSegment, verifyMotorradDetailIdentity } from '../motorrad-detail-identity.js';

const fixturePath = fileURLToPath(new URL('./fixtures/motorrad-equipment-responses.json', import.meta.url));
const fixtureText = readFileSync(fixturePath, 'utf8');
const samples = JSON.parse(fixtureText);

test('Motorrad equipment vocabulary has unique IDs and no silently conflicting aliases', () => {
  const ids = new Set(); const aliases = new Map();
  for (const feature of MOTORRAD_FEATURE_VOCABULARY) {
    assert.ok(!ids.has(feature.id), feature.id); ids.add(feature.id);
    for (const alias of feature.acceptedAliases) {
      const key = alias.toLowerCase();
      assert.ok(!aliases.has(key), `${alias}: ${aliases.get(key)} / ${feature.id}`);
      aliases.set(key, feature.id);
    }
    assert.equal(feature.packageCanImplyFeature, false, `${feature.id} must not silently expand a package`);
  }
});

test('structured equipment parsing is deterministic and retains evidence state', () => {
  const parsed = parseMotorradEquipmentResponse(samples[0]);
  assert.deepEqual(parsed, parseMotorradEquipmentResponse(samples[0]));
  const advertised = parsed.filter((item) => item.sourceField === 'ausstattungsText');
  assert.deepEqual(advertised.map((item) => item.proposedFeatureId).filter(Boolean).sort(), ['abs', 'centre-stand', 'cruise-control', 'electronic-suspension', 'heated-grips', 'traction-control']);
  assert.equal(parsed.find((item) => item.proposedFeatureId === 'top-box').evidenceState, 'uncertain');
});

test('negations and package labels never become fitted component features', () => {
  const parsed = parseMotorradEquipmentResponse(samples[1]);
  assert.equal(parsed.some((item) => item.rawWording.toLowerCase().includes('no top box') && item.proposedFeatureId), false);
  const packageRows = parsed.filter((item) => item.classification === 'package');
  assert.ok(packageRows.length >= 1);
  assert.ok(packageRows.every((item) => item.evidenceState === 'package-mentioned' || item.evidenceState === 'uncertain'));
  assert.equal(parsed.some((item) => item.proposedFeatureId === 'panniers'), false);
  const absPro = parseMotorradEquipmentResponse({ ausstattungsText: 'ABS Pro' });
  assert.deepEqual(absPro.map((item) => item.proposedFeatureId), ['abs-pro']);
});

test('sanitised fixture and audit artefacts contain no restricted identifiers or contacts', () => {
  const restricted = /\b(?:vin|fgstno|kennzeichen)\b|@[a-z0-9.-]+\.[a-z]{2,}/i;
  assert.doesNotMatch(fixtureText, restricted);
  const auditText = readFileSync(fileURLToPath(new URL('../../docs/motorrad-equipment-audit.json', import.meta.url)), 'utf8');
  assert.doesNotMatch(auditText, restricted);
  const vocabulary = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/motorrad-equipment-vocabulary.json', import.meta.url)), 'utf8'));
  assert.equal(vocabulary.features.length, MOTORRAD_FEATURE_VOCABULARY.length);
  assert.ok(vocabulary.features.some((feature) => feature.recommendedUse === 'display-or-refinement-candidate'));
});

test('detail audit accepts only the requested offer and a compatible BMW model', () => {
  const listing = { id: '572222', title: 'BMW S 1000 XR Sport SE', mapped: { line: 'S 1000 XR' } };
  const payload = { angebotsNr: '572222', markeModell: 'BMW S 1000 XR', basisDaten: { Segment: 'Sport' } };
  assert.deepEqual(verifyMotorradDetailIdentity(listing, payload), { ok: true, reasonCodes: [], segment: 'Sport' });
  assert.equal(extractMotorradDetailSegment(payload), 'Sport');
  for (const changed of [{ ...payload, angebotsNr: 'other' }, { ...payload, markeModell: 'BMW R 1250 GS' }, { ...payload, markeModell: '' }]) {
    const result = verifyMotorradDetailIdentity(listing, changed);
    assert.equal(result.ok, false);
    assert.deepEqual(result.reasonCodes, [DETAIL_IDENTITY_MISMATCH]);
  }
});
