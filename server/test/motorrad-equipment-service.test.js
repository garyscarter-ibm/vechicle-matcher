import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMotorradEquipmentEnricher, motorradEquipmentConfig } from '../motorrad-equipment-service.js';

const offer = (id) => ({ id, motorradDetailPage: 1, motorradDetailRowNumber: 1 });
const structured = (text) => ({ ausstattungsText: text, merkmaleText: 'Dealer email hidden@example.test and VIN hidden', basisDaten: '<div>ignored</div>', packagesText: 'Premium package' });

test('equipment service returns only approved structured advertised features and no raw payload', async () => {
  const service = createMotorradEquipmentEnricher({ transport: async () => structured('Heated grips, ABS, Premium package, No top box, Mystery feature'), now: () => 100, config: { ...motorradEquipmentConfig({}), maxOffers: 3 } });
  const result = (await service.enrich([offer('one')])).get('one');
  assert.deepEqual(result.advertisedFeatures, [{ id: 'abs', label: 'ABS', category: 'rider-aid' }, { id: 'heated-grips', label: 'Heated grips', category: 'comfort' }]);
  assert.equal(result.status, 'advertised-features');
  assert.doesNotMatch(JSON.stringify([...service.cache.values()]), /VIN|Dealer|example\.test|Premium package|Mystery feature/i);
});

test('positive/negative cache, expiry and in-flight deduplication are bounded', async () => {
  let now = 0; let calls = 0; let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const service = createMotorradEquipmentEnricher({ transport: async () => { calls += 1; await pending; return structured('Heated grips'); }, now: () => now, config: { ...motorradEquipmentConfig({}), positiveTtlMs: 1000, negativeTtlMs: 100 } });
  const a = service.enrich([offer('one')]); const b = service.enrich([offer('one')]); release();
  await Promise.all([a, b]); assert.equal(calls, 1);
  await service.enrich([offer('one')]); assert.equal(calls, 1);
  now = 1001; await service.enrich([offer('one')]); assert.equal(calls, 2);
  const failed = createMotorradEquipmentEnricher({ transport: async () => { calls += 1; throw new Error('down'); }, now: () => now, config: { ...motorradEquipmentConfig({}), negativeTtlMs: 100 } });
  await failed.enrich([offer('bad')]); await failed.enrich([offer('bad')]); assert.equal(failed.stats.cacheHit, 1);
});

test('limit, concurrency, request timeout, total timeout and disabled mode degrade safely', async () => {
  const invalid = motorradEquipmentConfig({ MOTORRAD_EQUIPMENT_ENRICHMENT: 'invalid', MOTORRAD_EQUIPMENT_CONCURRENCY: '999', MOTORRAD_EQUIPMENT_MAX_OFFERS: '-4' });
  assert.equal(invalid.enabled, true); assert.equal(invalid.concurrency, 2); assert.equal(invalid.maxOffers, 3);
  let active = 0; let peak = 0; let calls = 0;
  const service = createMotorradEquipmentEnricher({ transport: async () => { calls += 1; active += 1; peak = Math.max(peak, active); await new Promise((resolve) => setTimeout(resolve, 20)); active -= 1; return structured('ABS'); }, config: { ...motorradEquipmentConfig({}), maxOffers: 3, concurrency: 2, requestTimeoutMs: 500, totalTimeoutMs: 1000 } });
  const values = await service.enrich([offer('1'), offer('2'), offer('3'), offer('4')]);
  assert.equal(values.size, 3); assert.equal(calls, 3); assert.ok(peak <= 2);
  const slow = createMotorradEquipmentEnricher({ transport: () => new Promise(() => {}), config: { ...motorradEquipmentConfig({}), requestTimeoutMs: 250, totalTimeoutMs: 500 } });
  assert.equal((await slow.enrich([offer('slow')])).get('slow').status, 'detail-unavailable');
  const disabled = createMotorradEquipmentEnricher({ transport: async () => { throw new Error('should not run'); }, config: { ...motorradEquipmentConfig({}), enabled: false } });
  assert.equal((await disabled.enrich([offer('off')])).size, 0);
});

test('partial and complete BMW detail failure leave feature output safely absent', async () => {
  const partial = createMotorradEquipmentEnricher({ transport: async (item) => item.id === 'bad' ? Promise.reject(new Error('down')) : structured('Heated grips') });
  const result = await partial.enrich([offer('good'), offer('bad')]);
  assert.equal(result.get('good').advertisedFeatures[0].id, 'heated-grips');
  assert.equal(result.get('bad').status, 'detail-unavailable');
  const allDown = createMotorradEquipmentEnricher({ transport: async () => { throw new Error('down'); } });
  const failed = await allDown.enrich([offer('one'), offer('two')]);
  assert.ok([...failed.values()].every((item) => item.status === 'detail-unavailable' && item.advertisedFeatures.length === 0));
});
