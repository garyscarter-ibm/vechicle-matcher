import assert from 'node:assert/strict'; import { test } from 'node:test';
import { createMotorradStockResilience, MOTORRAD_STOCK_SCHEMA, validateMotorradSnapshot, validateMotorradCandidate } from '../motorrad-stock-resilience.js';
const cars = [{ id: '1', name: 'BMW F 900 R', priceMin: 9000, link: 'https://example.test' }];
test('fresh, stale, persistence and failure fallback are deterministic', async () => { let time=0,calls=0; let saved; const s=createMotorradStockResilience({now:()=>time,store:{load:()=>saved,save:x=>{saved=x}},refresh:async()=>{calls++;return cars},config:{enabled:true,freshTtlMs:10,maxStaleMs:100,failureThreshold:2,cooldownMs:20}}); assert.deepEqual(await s.get(),cars); assert.equal(saved.schemaVersion,MOTORRAD_STOCK_SCHEMA); assert.equal(s.snapshot().state,'fresh'); time=11; assert.deepEqual(await s.get(),cars); await Promise.resolve(); assert.ok(calls>=2); });
test('corrupt snapshots reject safely and no cache plus failure propagates', async()=>{assert.throws(()=>validateMotorradSnapshot({schemaVersion:1,cars:[]}));const s=createMotorradStockResilience({refresh:async()=>{throw new Error('down')},store:{load:()=>({bad:true}),save:()=>{}}});await assert.rejects(s.get());assert.equal(s.snapshot().state,'unavailable');});
test('partial, quarantine, persistence failure and circuit behaviour are safe',async()=>{let t=0,seq=[cars,{cars:cars.slice(0,0),diagnostics:{complete:false,pagesExpected:2,pagesCompleted:1}},{cars:[...cars,{...cars[0],id:'2'}],diagnostics:{pagesExpected:1,pagesCompleted:1}},{cars:[...cars,{...cars[0],id:'3'}],diagnostics:{pagesExpected:1,pagesCompleted:1}}],i=0;const s=createMotorradStockResilience({now:()=>t,refresh:async()=>seq[i++],store:{load(){throw Error('read')},save(){throw Error('write')}},config:{enabled:true,freshTtlMs:1,maxStaleMs:100,failureThreshold:2,cooldownMs:10,minimumCountRatio:.9}});await s.get();t=2;await s.refresh().catch(()=>{});assert.equal(s.cache().offerCount,1);assert.ok(s.snapshot().persistentLoadFailures&&s.snapshot().persistentWriteFailures);await s.refresh();assert.equal(s.cache().offerCount,2);});
test('candidate validation covers zero invalid duplicate pagination and count-drop',()=>{for(const [c,p,d,code] of [[[],null,{},'ZERO_RESULT'],[[{...cars[0],id:null}],null,{},'INVALID_OFFER_ID'],[[...Array.from({length:20},()=>cars[0])],null,{},'DUPLICATE_RATE'],[cars,null,{pagesExpected:2,pagesCompleted:1},'PAGINATION_INCONSISTENT'],[cars,{offerCount:3},{minimumCountRatio:.5},'COUNT_DROP']])assert.throws(()=>validateMotorradCandidate(c,p,d),new RegExp(code));});

test('persisted complete stock survives restart and reports only its allowlisted source', async () => {
  let refreshes = 0;
  const persisted = { schemaVersion: 1, capturedAt: 900, writtenAt: 900, offerCount: 1, pageCount: 1, refreshStatus: 'complete', cars };
  const service = createMotorradStockResilience({
    now: () => 1_000, store: { load: () => persisted, save() {} }, refresh: async () => { refreshes += 1; return cars; },
    config: { enabled: true, freshTtlMs: 200, maxStaleMs: 1_000, failureThreshold: 2, cooldownMs: 20 },
  });
  assert.deepEqual(await service.get(), cars);
  assert.equal(refreshes, 0);
  assert.deepEqual(
    (({ state, source, ageMs }) => ({ state, source, ageMs }))(service.snapshot()),
    { state: 'fresh', source: 'persisted', ageMs: 100 },
  );
});

test('stale refresh is single-flight, keeps last-known-good on failure, and circuit cooldown is deterministic', async () => {
  let time = 0; let calls = 0; let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const service = createMotorradStockResilience({
    now: () => time, store: { load: () => undefined, save() {} },
    refresh: async () => { calls += 1; if (calls === 1) return cars; if (calls === 2) return pending; throw Error('upstream down'); },
    config: { enabled: true, freshTtlMs: 1, maxStaleMs: 100, failureThreshold: 2, cooldownMs: 20 },
  });
  await service.get();
  time = 2;
  assert.deepEqual(await service.get(), cars, 'stale stock returns before its refresh settles');
  const joined = service.refresh();
  assert.equal(calls, 2, 'only one stale refresh began');
  release(cars);
  await joined;
  time = 4;
  await assert.rejects(service.refresh(), /upstream down/);
  await assert.rejects(service.refresh(), /upstream down/);
  assert.equal(service.snapshot().circuitOpen, true);
  assert.equal(calls, 4);
  await assert.rejects(service.refresh(), /CIRCUIT_OPEN/);
  assert.equal(calls, 4, 'open circuit did not call upstream');
  time = 25;
  await assert.rejects(service.refresh(), /upstream down/);
  assert.equal(calls, 5, 'cooldown expiry permits exactly one new attempt');
});

test('partial and expired snapshots never become current complete stock', async () => {
  let saved = 0;
  const partial = createMotorradStockResilience({
    now: () => 50, store: { load: () => undefined, save() { saved += 1; } },
    refresh: async () => ({ cars, diagnostics: { complete: false, pagesExpected: 2, pagesCompleted: 1 } }),
    config: { enabled: true, freshTtlMs: 10, maxStaleMs: 100, failureThreshold: 2, cooldownMs: 20 },
  });
  assert.deepEqual(await partial.get(), cars);
  assert.equal(partial.snapshot().state, 'partial');
  assert.equal(partial.snapshot().source, 'partial');
  assert.equal(saved, 0, 'partial capture was not persisted');

  const expired = createMotorradStockResilience({
    now: () => 500, store: { load: () => ({ schemaVersion: 1, capturedAt: 0, writtenAt: 0, offerCount: 1, pageCount: 1, refreshStatus: 'complete', cars }), save() {} },
    refresh: async () => { throw Error('upstream down'); },
    config: { enabled: true, freshTtlMs: 10, maxStaleMs: 100, failureThreshold: 2, cooldownMs: 20 },
  });
  await assert.rejects(expired.get(), /upstream down/);
  assert.equal(expired.snapshot().state, 'expired');
});

test('resilience rollback bypasses persisted/stale behaviour', async () => {
  let loads = 0; let refreshes = 0;
  const service = createMotorradStockResilience({
    store: { load: () => { loads += 1; return undefined; }, save() {} }, refresh: async () => { refreshes += 1; return cars; },
    config: { enabled: false, freshTtlMs: 10, maxStaleMs: 100, failureThreshold: 2, cooldownMs: 20 },
  });
  await service.get(); await service.get();
  assert.equal(refreshes, 2);
  assert.equal(loads, 1, 'rollback does not serve a persisted snapshot');
});
