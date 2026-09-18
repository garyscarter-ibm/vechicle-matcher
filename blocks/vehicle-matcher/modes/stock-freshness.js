/* Controlled browser copy for the deliberately small Motorrad freshness API. */

import { el } from '../ui.js';

const STATES = new Set(['fresh', 'stale', 'partial', 'expired', 'unavailable']);

export function stockFreshnessNotice(freshness) {
  const state = STATES.has(freshness?.state) ? freshness.state : 'unavailable';
  if (state === 'fresh') return null;
  if (state === 'stale') {
    const age = Number.isFinite(freshness?.ageMs) && freshness.ageMs >= 0 ? freshness.ageMs : null;
    const minutes = age === null ? null : Math.floor(age / 60_000);
    const ageText = age === null || minutes < 1 ? 'just now'
      : minutes < 60 ? `${minutes} minute${minutes === 1 ? '' : 's'} ago`
        : `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? '' : 's'} ago`;
    return { state, text: `Stock last refreshed ${ageText}. Availability may have changed.` };
  }
  if (state === 'partial') return { state, text: 'Available stock comes from an incomplete refresh. Please confirm availability with the retailer.' };
  if (state === 'expired') return { state, text: 'This stock listing may be out of date. Please confirm availability with the retailer.' };
  return { state: 'unavailable', text: 'Stock availability is temporarily unavailable. Please try again shortly.' };
}

export function renderStockFreshnessNotice(freshness) {
  const notice = stockFreshnessNotice(freshness);
  if (!notice) return null;
  const element = el('p', `vm-stock-notice vm-stock-notice--${notice.state}`, notice.text);
  element.setAttribute('role', 'status');
  return element;
}
