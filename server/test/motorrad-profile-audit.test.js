import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory, traceTitle } from '../../scripts/audit-motorrad-profiles.mjs';

const bikes = [
  { id: '2', name: 'BMW R 1300 RS SE ASA', priceMin: 10000, cc: 1300, power: 107, year: 2026 },
  { id: '1', name: 'BMW R 1300 RS SE ASA', priceMin: 10000, cc: 1300, power: 107, year: 2026 },
  { id: '3', name: 'BMW F450 GS LATEST MODEL', priceMin: 7000, cc: 420, power: 35, year: 2026 },
];

test('Motorrad title audit groups deterministically and reconciles every offer', () => {
  const first = buildInventory(bikes);
  const second = buildInventory([...bikes].reverse());
  assert.equal(first.metrics.totalOffers, 3);
  assert.equal(first.signatures.length, 2);
  assert.deepEqual(first, second);
});

test('Motorrad title audit records the production-equivalent selected rule', () => {
  const rs = traceTitle('BMW R 1300 RS SE ASA');
  const f450 = traceTitle('BMW F450 GS LATEST MODEL');
  assert.deepEqual({ profile: rs.profile, rule: rs.rule }, { profile: 'R 1300 RS', rule: 'contains:R 1300 RS' });
  assert.deepEqual({ profile: f450.profile, rule: f450.rule }, { profile: 'F 450 GS', rule: 'contains:F450 GS' });
});

test('Motorrad title audit preserves generic fallback evidence', () => {
  const inventory = buildInventory([{ id: 'hp2', name: 'BMW HP2 Megamoto', priceMin: 8000, cc: 1170, power: 83, year: 2008 }]);
  assert.deepEqual(inventory.findings.find((f) => f.reasonCode === 'FALLBACK_RULE')?.evidence, ['BMW HP2 Megamoto']);
});
