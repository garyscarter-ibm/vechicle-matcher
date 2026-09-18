/*
 * Guard for BMW Motorrad detail responses used by offline/live audits.
 *
 * The detail endpoint is addressed by both an offer number and the row number
 * of a paged result table. A stale or incorrectly derived row number can still
 * return HTTP 200, but describe a different bike. Keep this validation outside
 * the equipment parser: segment and equipment are only meaningful after the
 * response has been tied back to the requested listing.
 */

export const DETAIL_IDENTITY_MISMATCH = 'DETAIL_IDENTITY_MISMATCH';

const normalise = (value) => String(value || '')
  .toUpperCase()
  .replace(/\bBMW\b/g, '')
  .replace(/[^A-Z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** A BMW model label may be shorter than the sales title, but must share its
 * stable model-line identity. */
export function compatibleMotorradModel(listing = {}, returnedModel) {
  const received = normalise(returnedModel);
  if (!received) return false;
  const expected = [listing?.mapped?.line, listing?.line, listing?.title]
    .map(normalise)
    .filter(Boolean);
  return expected.some((candidate) => candidate.includes(received) || received.includes(candidate));
}

/** Extract BMW's exact Segment value without passing it through equipment parsing. */
export function extractMotorradDetailSegment(payload = {}) {
  const basis = payload?.basisDaten;
  if (!basis || typeof basis !== 'object' || Array.isArray(basis)) return null;
  const entry = Object.entries(basis).find(([key]) => String(key).trim().toLowerCase() === 'segment');
  const value = entry?.[1];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * A response is usable only when its offer number and model both agree with
 * the requested listing. Deliberately return no raw detail fields on failure.
 */
export function verifyMotorradDetailIdentity(listing, payload = {}) {
  const requestedOfferId = String(listing?.id ?? '').trim();
  const returnedOfferId = String(payload?.angebotsNr ?? '').trim();
  const returnedModel = typeof payload?.markeModell === 'string' ? payload.markeModell.trim() : '';
  const offerMatches = Boolean(requestedOfferId) && requestedOfferId === returnedOfferId;
  const modelMatches = compatibleMotorradModel(listing, returnedModel);
  if (!offerMatches || !modelMatches) {
    return {
      ok: false,
      reasonCodes: [DETAIL_IDENTITY_MISMATCH],
      offerMatches,
      modelMatches,
    };
  }
  return {
    ok: true,
    reasonCodes: [],
    segment: extractMotorradDetailSegment(payload),
  };
}
