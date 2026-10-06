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

/* Retailer country (ISO 3166 alpha-2) → the regions question's values. A country
   not listed has no region, so the regions filter never drops its cars. */
const REGION_CODES = {
  europe: 'GB IE FR DE IT ES PT NL BE LU CH AT MC LI AD SM VA MT DK NO SE FI IS PL CZ SK HU '
    + 'SI HR RS BA ME MK AL GR CY BG RO MD UA BY LT LV EE RU TR GI JE GG IM',
  mea: 'AE SA QA KW BH OM JO LB IL EG MA DZ TN LY IQ YE ZA NG KE GH ET TZ UG RW SN CI CM '
    + 'AO MZ ZM ZW BW NA MU SC MG',
  apac: 'CN HK MO TW JP KR SG MY TH ID PH VN KH IN PK BD LK NP MV AU NZ FJ PG BN MN KZ UZ',
  americas: 'US CA MX BR AR CL CO PE UY PY BO EC VE PA CR GT HN SV NI DO PR JM BS BB TT KY '
    + 'BM AW CW',
};
const CODE_REGION = Object.fromEntries(Object.entries(REGION_CODES)
  .flatMap(([region, codes]) => codes.split(' ').map((c) => [c, region])));
const COUNTRY_ALIASES = {
  uk: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
  usa: 'US', 'united states of america': 'US', uae: 'AE', 'hong kong': 'HK', macau: 'MO', macao: 'MO',
  korea: 'KR', 'republic of korea': 'KR', 'czech republic': 'CZ', turkey: 'TR', 'russian federation': 'RU',
};
// Full English names ("United Kingdom", "Czechia") resolve through ICU's own table.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const NAME_CODE = Object.fromEntries(Object.keys(CODE_REGION)
  .map((c) => [regionNames.of(c).toLowerCase(), c]));

/** The listing's retailer region, or undefined when the feed names no known country. */
export function rrmcRegion(v) {
  const d = v?.dealer || {};
  let raw = d.address?.countryCode || d.countryCode || d.address?.country || d.country
    || v?.location?.countryCode || v?.location?.country || '';
  if (raw && typeof raw === 'object') raw = raw.code || raw.isoCode || raw.name || '';
  const s = String(raw).trim();
  const key = s.toLowerCase();
  const code = COUNTRY_ALIASES[key] || NAME_CODE[key] || s.toUpperCase();
  return CODE_REGION[code];
}

/** The retailer's own homepage, or undefined. The feed sends `dealer.website`; the rest are fallbacks. */
export function rrmcDealerUrl(v) {
  const d = v?.dealer || {};
  const raw = d.website || d.websiteUrl || d.websiteURL || d.webSite || d.url || d.homepage
    || d.homepageUrl || d.webUrl || d.links?.website || d.contact?.website || d.contactDetails?.website || '';
  const s = String(typeof raw === 'object' ? raw.url || raw.href || '' : raw).trim();
  if (!s) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /^https?:$/.test(u.protocol) ? u.href : undefined;
  } catch { return undefined; }
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
    dealerUrl: rrmcDealerUrl(v),
    link: v.id ? `${RRMC_LISTING_BASE}/${v.id}` : RRMC_FEED_ORIGIN,
    handDrive,
    region: rrmcRegion(v),
  };
}
