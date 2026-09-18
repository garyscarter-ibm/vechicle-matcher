import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMotorradScoringAudit, runMotorradScoringShadow, validateMotorradScoringAudit } from '../../scripts/audit-motorrad-scoring.mjs';
import { MOTORRAD_RUNTIME_CATALOGUE } from '../data/motorrad-runtime-catalogue.js';
import { mapMotorradRawWithScoringMode } from '../mapping.js';

test('scoring audit covers every runtime record with explicit per-field provenance', () => {
  const { audit, proposedProfiles } = buildMotorradScoringAudit();
  assert.equal(audit.records.length, 107);
  assert.equal(audit.records.length, MOTORRAD_RUNTIME_CATALOGUE.records.length);
  assert.equal(validateMotorradScoringAudit(audit, proposedProfiles), true);
  for (const record of audit.records) {
    assert.equal(Object.keys(record.proposedFields).length, 20, record.canonicalDerivativeId);
    for (const [field, proposal] of Object.entries(record.proposedFields)) {
      assert.ok(['sourced', 'calculated', 'editorial', 'unavailable'].includes(proposal.provenance), `${record.canonicalDerivativeId}/${field}`);
      if (proposal.provenance === 'unavailable') assert.equal(proposal.value, null, `${record.canonicalDerivativeId}/${field}`);
    }
  }
});

test('sourced values have BMW evidence and calculated fuel conversions are reproducible', () => {
  const { proposedProfiles } = buildMotorradScoringAudit();
  const calculations = proposedProfiles.profiles.flatMap((profile) => Object.entries(profile.fields).map(([field, proposal]) => ({ profile, field, proposal }))).filter(({ proposal }) => proposal.provenance === 'calculated');
  assert.ok(calculations.length > 0);
  for (const { profile, field, proposal } of calculations) {
    assert.ok(proposal.formula);
    assert.ok(proposal.inputs);
    if (field === 'mpg') assert.equal(proposal.value, Number((282.481 / proposal.inputs.litresPer100km).toFixed(2)), profile.canonicalDerivativeId);
  }
  for (const profile of proposedProfiles.profiles) for (const proposal of Object.values(profile.fields)) if (proposal.provenance === 'sourced') assert.match(proposal.evidence.sourceUrl, /^https:\/\/(?:www\.)?(?:press\.bmwgroup\.com|bmw-motorrad\.co\.uk|approvedused\.bmw-motorrad\.co\.uk)/);
});

test('shadow scoring evaluates every offer and exposes unavailable fields without broken cards', () => {
  const { proposedProfiles } = buildMotorradScoringAudit();
  const shadow = runMotorradScoringShadow(proposedProfiles);
  assert.equal(shadow.fixtureOffers, 955);
  assert.equal(shadow.evaluatedOffers, 955);
  assert.ok(shadow.scenarios.length >= 12);
  for (const scenario of shadow.scenarios) {
    for (const result of [...scenario.currentTopResults, ...scenario.proposedTopResults]) {
      assert.ok(Number.isFinite(result.score), `${scenario.id}/${result.offerId}`);
    }
  }
});

test('legacy mode remains available as the Phase 6A compatibility baseline', () => {
  const f900 = mapMotorradRawWithScoringMode({ id: 'phase6-production', title: 'BMW F 900 R', price: 9000, cc: 895, powerKw: 77, year: 2025 }, 'legacy');
  assert.equal(f900.line, 'F 900 R');
  assert.equal(f900.zeroTo62, 3.7);
  assert.equal(f900.boot, 0);
  assert.equal(f900.seats, 2);
  assert.equal(f900.mpg, 62);
  assert.equal(f900.canonicalDerivativeId, 'bmw-motorrad:f-900-r');
});
