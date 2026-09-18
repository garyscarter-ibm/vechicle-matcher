import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { stockFreshnessNotice, renderStockFreshnessNotice } = await import('../../blocks/vehicle-matcher/modes/stock-freshness.js');

test('Motorrad freshness copy is controlled for every state and fresh has no warning', () => {
  assert.equal(stockFreshnessNotice({ state: 'fresh', ageMs: 0 }), null);
  assert.equal(stockFreshnessNotice({ state: 'stale', ageMs: 2 * 60_000 }).text, 'Stock last refreshed 2 minutes ago. Availability may have changed.');
  assert.match(stockFreshnessNotice({ state: 'partial' }).text, /Available stock comes from an incomplete refresh/);
  const expired = stockFreshnessNotice({ state: 'expired' }).text;
  assert.match(expired, /out of date/i);
  assert.doesNotMatch(expired, /current|live/i);
  assert.equal(stockFreshnessNotice({ state: 'unavailable' }).text, 'Stock availability is temporarily unavailable. Please try again shortly.');
});

test('Motorrad freshness copy never interpolates untrusted diagnostics', () => {
  const secret = 'GMB-SID raw-response VIN registration dealer@example.test /cache/path';
  const notice = stockFreshnessNotice({ state: 'not-allowlisted', message: secret, source: secret, error: secret });
  assert.equal(notice.state, 'unavailable');
  assert.ok(!notice.text.includes(secret));
});

test('Motorrad freshness notice renders only controlled browser text', () => {
  const stale = renderStockFreshnessNotice({ state: 'stale', ageMs: 60_000, session: 'GMB-SID secret' });
  assert.equal(stale.tagName, 'P');
  assert.equal(stale.getAttribute('role'), 'status');
  assert.match(stale.className, /vm-stock-notice--stale/);
  assert.doesNotMatch(stale.textContent, /GMB-SID/);
  assert.equal(renderStockFreshnessNotice({ state: 'fresh', ageMs: 0 }), null);
});
