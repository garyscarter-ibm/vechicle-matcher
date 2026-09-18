import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { matchCard } = await import('../../blocks/vehicle-matcher/modes/result-card.js');

const match = (advertisedFeatures = undefined) => ({ car: { id: 'bike', name: 'BMW F 900 R', body: 'roadster', fuel: 'petrol', priceMin: 9000, priceMax: 9000, seats: undefined, boot: undefined, zeroTo62: undefined, mpg: undefined, photo: null, mileage: 1000, link: 'https://example.test', ...(advertisedFeatures ? { advertisedFeatures } : {}) }, score: 88, reasons: [], tradeOffs: [] });

test('Motorrad card renders accessible advertised-equipment badges only when present', () => {
  const card = matchCard(match([{ id: 'heated-grips', label: 'Heated grips', category: 'comfort' }]), { brand: 'motorrad' });
  const section = card.querySelector('.vm-advertised-equipment');
  assert.ok(section);
  assert.equal(section.getAttribute('aria-label'), 'Advertised equipment');
  assert.match(section.textContent, /Heated grips/);
  assert.match(section.textContent, /Confirm specification with the retailer/);
});

test('Motorrad card without detail enrichment remains normal and does not imply absence', () => {
  const card = matchCard(match(), { brand: 'motorrad' });
  assert.equal(card.querySelector('.vm-advertised-equipment'), null);
  assert.doesNotMatch(card.textContent, /no equipment|not fitted/i);
});
