/**
 * Rolls-Royce MTK Connect feed adapter.
 *
 * Projects one entry from the /public/v1/vehicles/rolls-royce/global
 * `contents[]` array into the flat shape mapRRMCRaw consumes.
 */

export const RRMC_FEED_URL = 'https://api.mtkconnect.io/public/v1/vehicles/rolls-royce/global';
export const RRMC_FEED_ORIGIN = 'https://pre-owned.rolls-roycemotorcars.com';
const RRMC_LISTING_BASE = `${RRMC_FEED_ORIGIN}/en_gb/listing`;

export const RRMC_PAGE_SIZE = 50;

/** Build the POST body for one page of the global feed. */
export function rrmcFeedBody(page) {
  return {
    languageCode: 'en_gb',
    limit: RRMC_PAGE_SIZE,
    page,
    sortDirection: 'asc',
    sortBy: 'price',
    listingTypes: ['Used', 'Certified', 'Demo'],
    resultsFilters: { modelYear: {}, price: {}, odometer: {}, registrationYear: {} },
  };
}

/** Extract total item count and listings from a parsed response object. */
export function parseRRMCPage(body) {
  let data;
  try { data = JSON.parse(body); } catch { return { total: 0, contents: [] }; }
  return {
    total: data?.total ?? 0,
    contents: Array.isArray(data?.contents) ? data.contents : [],
  };
}

/**
 * Project one MTK Connect listing into the flat shape mapRRMCRaw consumes.
 * Colour is already available in appearanceOptions, so no separate PDP needed.
 */
export function projectRRMCListing(v) {
  const model = v?.vehicle?.model;
  const name = model?.name || model?.groupName || '';
  const fuelType = (v?.vehicle?.engine?.fuelType || '').toLowerCase();
  const fuel = (fuelType === 'electric' || fuelType === 'ev') ? 'ev' : undefined;
  const cover = (v?.vehicleMedia || [])
    .filter((m) => m.scope === 'vehicle-listing' && m.mediaType === 'IMAGE')
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];

  const steeringRaw = (
    v?.vehicle?.steeringPosition
    || v?.vehicle?.steering_position
    || v?.vehicle?.handDrive
    || v?.vehicle?.hand_drive
    || v?.vehicle?.drivingSide
    || v?.vehicle?.driving_side
    || ''
  ).toLowerCase();
  const handDrive = steeringRaw.includes('left') ? 'lhd'
    : steeringRaw.includes('right') ? 'rhd'
    : steeringRaw === 'lhd' || steeringRaw === 'rhd' ? steeringRaw
    : undefined;

  return {
    id: String(v.id || ''),
    name,
    price: v?.price?.retail || 0,
    poa: !v?.price?.retail,
    mileage: v?.odometer?.value || 0,
    year: v?.vehicle?.registrationYear || v?.vehicle?.modelYear || 0,
    photo: cover?.url || undefined,
    cc: v?.vehicle?.engine?.capacity || 0,
    fuel,
    colour: v?.vehicle?.appearanceOptions?.exteriorColour || '',
    dealerName: v?.dealer?.name || 'Rolls-Royce Approved',
    link: v.id ? `${RRMC_LISTING_BASE}/${v.id}` : RRMC_FEED_ORIGIN,
    handDrive,
  };
}
