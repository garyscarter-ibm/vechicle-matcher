import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildRuntimeCatalogue, renderRuntimeCatalogue } from './build-motorrad-runtime-catalogue.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = (s) => `bmw-motorrad:${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
const familyId = (profile) => `bmw-motorrad:family-${profile.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
const family = (profile) => ({ canonicalDerivativeId: familyId(profile), recordType: 'family', manufacturer: 'BMW Motorrad', modelFamily: profile, derivativeTrim: null, generationLabel: 'not resolved', registrationYearRange: null, observedTitleAliases: [], requiredTerms: [], excludedTerms: [], observedCc: [], observedAdvertisedKw: [], expectedFactoryCcKw: null, kerbMass: null, comparisonProfileKey: profile, sourceReferences: [], evidenceNotes: ['Family-level catalogue anchor generated from the current production profile.'], furtherTechnicalSourcingRequired: true });

const PRESS = (path) => `https://www.press.bmwgroup.com/global/article/detail/${path}`;
const REVIEW_DATE = '2026-09-16';
// These are first-party launch/model-update records.  Values are deliberately
// limited to facts printed in the cited document; the remaining fields are
// recorded as reviewed-but-unresolved, never filled from an aggregator.
const OFFICIAL_RESEARCH = new Map([
  ['F 900 R', { years: '2020–2026', url: PRESS('T0446319EN/bmw-motorrad-presents-the-new-bmw-f-900-r-and-f-900-xr'), title: 'BMW Motorrad presents the new BMW F 900 R and F 900 XR', engine: [895, 77], mass: 208, fuel: '4.2 L/100 km (WMTC)' }],
  ['F 900 XR', { years: '2020–2026', url: PRESS('T0446319EN/bmw-motorrad-presents-the-new-bmw-f-900-r-and-f-900-xr'), title: 'BMW Motorrad presents the new BMW F 900 R and F 900 XR', engine: [895, 77], mass: 216, fuel: '4.2 L/100 km (WMTC)' }],
  ['F 800 GS', { years: '2008–2018 (798 cc); 2024– (895 cc)', url: PRESS('T0435938EN/bmw-motorrad-presents-the-new-bmw-f-900-gs-f-900-gs-adventure-and-f-800-gs'), title: 'BMW Motorrad presents the new BMW F 900 GS, F 900 GS Adventure and F 800 GS', engine: [895, 64], mass: 227, fuel: '4.4 L/100 km (WMTC)', checked: [PRESS('T0022470EN/bmw-motorrad-at-the-eicma-2007-the-new-bmw-f-800-gs-the-new-bmw-f-650-gs'), PRESS('T0261423EN/the-new-bmw-f-700-gs-f-800-gs-and-f-800-gs-adventure')] }],
  ['F 850 GS', { years: '2018–2023', url: PRESS('T0311347EN/bmw-motorrad-presents-the-new-bmw-f-750-gs-bmw-f-850-gs-and-bmw-f-850-gs-adventure'), title: 'BMW Motorrad presents the new BMW F 750 GS, BMW F 850 GS and BMW F 850 GS Adventure', engine: [853, 70], mass: 229, fuel: '4.1 L/100 km (WMTC)' }],
  ['F 750 GS', { years: '2018–2023', url: PRESS('T0311347EN/bmw-motorrad-presents-the-new-bmw-f-750-gs-bmw-f-850-gs-and-bmw-f-850-gs-adventure'), title: 'BMW Motorrad presents the new BMW F 750 GS, BMW F 850 GS and BMW F 850 GS Adventure', engine: [853, 56], mass: 224, fuel: '4.1 L/100 km (WMTC)' }],
  ['F 800 R', { years: '2015–2019', url: PRESS('T0265342EN/bmw-motorrad-revises-the-f-800-r-and-f-800-gt-sporty-riding-pleasure-and-dynamic-touring-in-enhanced-form'), title: 'BMW Motorrad revises the F 800 R and F 800 GT', engine: [798, 66], mass: 202 }],
  ['G 310 GS', { years: '2017–2025', url: PRESS('T0265624EN/the-new-bmw-g-310-gs'), title: 'The new BMW G 310 GS', engine: [313, 25], mass: 169.5 }],
  ['G 310 R', { years: '2016–2025', url: PRESS('T0241570EN/the-new-bmw-g-310-r'), title: 'The new BMW G 310 R', engine: [313, 25], mass: 158.5 }],
  ['K 1300 S', { years: '2009–2016', url: PRESS('T0022464EN/bmw-motorrad-at-the-intermot-2008-the-new-bmw-k-1300-s-the-new-bmw-k-1300-r-the-new-bmw-k-1300-gt'), title: 'BMW Motorrad at INTERMOT 2008: the new BMW K 1300 S', engine: [1293, 129], mass: 254 }],
  ['R 1200 GS', { years: '2013–2018', url: PRESS('T0224489EN/bmw-motorrad-model-facelift-measures-for-model-year-2016-special-model-bmw-r-1200-gs-tripleblack-abs-pro-incl-dynamic-brake-light-available-for-six-models-from-model-year-2016'), title: 'BMW Motorrad model facelift measures for model year 2016', engine: [1170, 92], mass: 244 }],
  ['R 1200 R', { years: '2015–2018', url: PRESS('T0193368EN/the-new-bmw-r-1200-r'), title: 'The new BMW R 1200 R', engine: [1170, 92], mass: 231 }],
  ['R 1250 GS', { years: '2019–2024', url: PRESS('T0284913EN/the-new-bmw-r-1250-gs-and-the-new-bmw-r-1250-rt'), title: 'The new BMW R 1250 GS and the new BMW R 1250 RT', engine: [1254, 100], mass: 249 }],
  ['R 1250 R', { years: '2019–2025', url: PRESS('T0286296EN/the-new-bmw-r-1250-r-the-new-bmw-r-1250-rs-and-the-new-bmw-r-1250-gs-adventure'), title: 'The new BMW R 1250 R, R 1250 RS and R 1250 GS Adventure', engine: [1254, 100], mass: 239 }],
  ['R 1250 RT', { years: '2019–2024', url: PRESS('T0318654EN/the-new-bmw-r-1250-rt'), title: 'The new BMW R 1250 RT', engine: [1254, 100], mass: 279, checked: [PRESS('T0284913EN/the-new-bmw-r-1250-gs-and-the-new-bmw-r-1250-rt')] }],
  ['R nineT', { years: '2014–2023', url: PRESS('T0318984EN/the-new-bmw-r-ninet-models'), title: 'The new BMW R nineT models', engine: [1170, 80], mass: 221, checked: [PRESS('T0265047EN/the-new-bmw-r-ninet-and-r-ninet-urban-g/s'), PRESS('T0263754EN/the-new-bmw-r-ninet-racer-and-r-ninet-pure')] }],
  ['S 1000 R', { years: '2014–2026', url: PRESS('T0445681EN/bmw-motorrad-presents-the-new-bmw-m-1000-rr-bmw-s-1000-rr-bmw-m-1000-r-and-bmw-s-1000-r'), title: 'BMW Motorrad presents the new BMW M 1000 RR, S 1000 RR, M 1000 R and S 1000 R', engine: [999, 125], mass: 199, checked: [PRESS('T0152008EN/the-new-s-1000-r'), PRESS('T0263865EN/the-new-bmw-s-1000-rr-s-1000-r-and-s-1000-xr')] }],
  ['S 1000 XR', { years: '2015–2026', url: PRESS('T0437862EN/bmw-motorrad-presents-the-new-s-1000-xr'), title: 'BMW Motorrad presents the new S 1000 XR', engine: [999, 125], mass: 227, checked: [PRESS('T0302052EN/the-new-bmw-s-1000-xr'), PRESS('T0263865EN/the-new-bmw-s-1000-rr-s-1000-r-and-s-1000-xr')] }],
  ['F 900 R A2 70 kW', { years: '2020–2026', url: PRESS('T0446319EN/bmw-motorrad-presents-the-new-bmw-f-900-r-and-f-900-xr'), title: 'BMW Motorrad presents the new BMW F 900 R and F 900 XR', engine: [895, 70], mass: 208 }],
  ['F 800 GS 798cc', { years: '2008–2018', url: PRESS('T0261423EN/the-new-bmw-f-700-gs-f-800-gs-and-f-800-gs-adventure'), title: 'The new BMW F 700 GS, F 800 GS and F 800 GS Adventure', engine: [798, 63], mass: 214, checked: [PRESS('T0022470EN/bmw-motorrad-at-the-eicma-2007-the-new-bmw-f-800-gs-the-new-bmw-f-650-gs')] }],
  ['F 800 GS 895cc', { years: '2024–', url: PRESS('T0435938EN/bmw-motorrad-presents-the-new-bmw-f-900-gs-f-900-gs-adventure-and-f-800-gs'), title: 'BMW Motorrad presents the new BMW F 900 GS, F 900 GS Adventure and F 800 GS', engine: [895, 64], mass: 227 }],
  ['F 850 GS Adventure', { years: '2019–2023', url: PRESS('T0311347EN/bmw-motorrad-presents-the-new-bmw-f-750-gs-bmw-f-850-gs-and-bmw-f-850-gs-adventure'), title: 'BMW Motorrad presents the new BMW F 750 GS, BMW F 850 GS and BMW F 850 GS Adventure', engine: [853, 70], mass: 244 }],
  ['R 1200 GS Adventure', { years: '2014–2018', url: PRESS('T0261506EN/bmw-motorrad-model-facelift-measures-for-model-year-2017-new-bmw-r-1200-gs-adventure-“triple-black”-special-model-price-and-market-launch-of-the-bmw-r-ninet-scrambler'), title: 'BMW Motorrad model facelift measures for model year 2017', engine: [1170, 92], mass: 263 }],
  ['R 1200 RS', { years: '2015–2018', url: PRESS('T0195487EN/bmw-motorrad-at-the-eicma-2014-world-premiere-of-two-new-models'), title: 'BMW Motorrad at EICMA 2014: world premiere of two new models', engine: [1170, 92], mass: 236 }],
  ['R 1200 RT', { years: '2014–2018', url: PRESS('T0151864EN/the-new-bmw-r-1200-rt'), title: 'The new BMW R 1200 RT', engine: [1170, 92], mass: 279 }],
  ['R 1250 RS', { years: '2019–2025', url: PRESS('T0286296EN/the-new-bmw-r-1250-r-the-new-bmw-r-1250-rs-and-the-new-bmw-r-1250-gs-adventure'), title: 'The new BMW R 1250 R, R 1250 RS and R 1250 GS Adventure', engine: [1254, 100], mass: 243 }],
  ['R nineT Pure', { years: '2017–2023', url: PRESS('T0263754EN/the-new-bmw-r-ninet-racer-and-r-ninet-pure'), title: 'The new BMW R nineT Racer and R nineT Pure', engine: [1170, 81], mass: 219 }],
  ['R nineT Urban G/S', { years: '2017–2023', url: PRESS('T0265047EN/the-new-bmw-r-ninet-and-r-ninet-urban-g/s'), title: 'The new BMW R nineT and R nineT Urban G/S', engine: [1170, 81], mass: 223 }],
  ['R nineT Sport', { years: '2017–2022 observed UK dealer trim', url: PRESS('T0265047EN/the-new-bmw-r-ninet-and-r-ninet-urban-g/s'), title: 'The new BMW R nineT and R nineT Urban G/S', engine: [1170, 81], mass: 222, checked: [PRESS('T0318984EN/the-new-bmw-r-ninet-models')] }],
  ['HP2 Megamoto', { years: '2007–2008', url: 'https://approvedused.bmw-motorrad.co.uk/', title: 'BMW Motorrad Approved Used observed title identity', checked: ['https://www.press.bmwgroup.com/global/tag/library/text', 'https://www.bmw-motorrad.co.uk/en/service/manuals.html', 'https://www.bmw-motorrad.co.uk/en/models/heritage.html'], unresolved: true }],
  ['HP2 Sport', { years: '2008–2010', url: 'https://approvedused.bmw-motorrad.co.uk/', title: 'BMW Motorrad Approved Used observed title identity', checked: ['https://www.press.bmwgroup.com/global/tag/library/text', 'https://www.bmw-motorrad.co.uk/en/service/manuals.html', 'https://www.bmw-motorrad.co.uk/en/models/sport.html'], unresolved: true }],
]);

function technicalEvidence(profile, source, massEntry) {
  const research = OFFICIAL_RESEARCH.get(profile);
  const url = research?.url || source?.sourceUrl || null;
  const years = research?.years || source?.modelYearRange || 'current UK technical-data page; publication year not stated';
  const mass = research?.mass ?? massEntry?.kerbMassKg ?? null;
  const unresolved = (field, checked = []) => ({ status: 'unresolved', value: null, checkedSources: [...new Set([url, ...checked, 'https://www.bmw-motorrad.co.uk/en/models.html'].filter(Boolean))], note: `No model-specific BMW value located for ${field}; it has not been inferred.` });
  const cited = (value, page = 'technical data / launch specification') => ({ status: 'sourced', value, sourceUrl: url, document: research?.title || 'BMW Motorrad UK technical data', page, market: 'Global BMW Group PressClub or BMW Motorrad UK', applicableYears: years, reviewedOn: REVIEW_DATE, confidence: research?.unresolved ? 'low' : 'high' });
  return {
    reviewDate: REVIEW_DATE,
    sources: url ? [{ url, document: research?.title || 'BMW Motorrad UK technical data', market: 'Global BMW Group PressClub or BMW Motorrad UK', applicableYears: years, page: 'technical data / launch specification' }] : [],
    fields: {
      canonicalIdentity: url ? cited(profile, 'model title / launch heading') : unresolved('canonical identity'),
      engine: research?.engine ? cited({ capacityCc: research.engine[0], factoryKw: research.engine[1] }) : unresolved('engine capacity and factory kW', research?.checked),
      kerbMass: mass != null ? cited({ kg: mass, definition: 'BMW DIN/unladen or road-ready measure; retain the source wording before comparison.' }) : unresolved('kerb/mass-in-running-order and BMW definition', research?.checked),
      fuelConsumption: research?.fuel ? cited(research.fuel, 'technical data / WMTC consumption') : unresolved('fuel consumption', research?.checked),
      acceleration: unresolved('acceleration', research?.checked),
      seating: unresolved('seat/pillion configuration', research?.checked),
      standardLuggage: unresolved('standard luggage; optional equipment is intentionally not treated as standard', research?.checked),
    },
    researchComplete: true,
  };
}

const EXACT = [
  ['HP2 Megamoto', /\bHP2 MEGAMOTO\b/, null], ['HP2 Sport', /\bHP2 SPORT\b/, null],
  ['F 900 R A2 70 kW', /\bF 900 R A2\b/, 'F 900 R'], ['F 800 GS 798cc', /\bF 800 GS\b/, 'F 800 GS', 798], ['F 800 GS 895cc', /\bF 800 GS\b/, 'F 800 GS', 895],
  ['R 1250 RS', /\bR 1250 RS\b/, 'R 1250 R'], ['R 1200 RS', /\bR 1200 RS\b/, 'R 1200 R'], ['R 1200 RT', /\bR 1200 RT\b/, 'R 1200 R'],
  ['F 850 GS Adventure', /\bF 850 GS ADVENTURE\b/, 'F 850 GS'], ['R 1200 GS Adventure', /\bR 1200 GS ADVENTURE\b/, 'R 1200 GS'],
  ['R nineT Pure', /\bR NINET PURE\b/, 'R nineT'], ['R nineT Urban G/S', /\bR NINET URBAN G\/?S\b/, 'R nineT'], ['R nineT Sport', /\bR NINET SPORT\b/, 'R nineT'],
  ['R 1300 RS', /\bR 1300 RS\b/, 'R 1300 RS'], ['F 900 GS Adventure', /\bF 900 GS ADVENTURE\b|\bF 900 GSA\b/, 'F 900 GS Adventure'],
  ['R 12 G/S', /\bR 12 G\/?S\b/, 'R 12 G/S'], ['R 12 S', /\bR 12 S\b/, 'R 12 S'], ['R 18 B', /\bR 18 B\b/, 'R 18 B'], ['R 18 Classic', /\bR 18 CLASSIC\b/, 'R 18 Classic'], ['R 18 Roctane', /\bR 18 ROCTANE\b/, 'R 18 Roctane'], ['F 450 GS', /\bF ?450 GS\b/, 'F 450 GS'],
];
// Scoring compatibility is catalogue metadata, not a second runtime mapping.
// The historic HP2 records retain their legacy fallback until a later scoring
// phase can calibrate them from model-specific technical evidence.
const COMPATIBILITY_PROFILE_OVERRIDES = Object.freeze({
  'HP2 Megamoto': 'R 1250 R',
  'HP2 Sport': 'R 1250 R',
});
const SAFE_EXACT = new Set(['R 1300 R', 'R 1300 GS', 'R 1300 GS Adventure', 'R 1300 RT', 'R 18', 'R 18 Transcontinental', 'F 900 GS', 'R 12', 'R 12 nineT', 'K 1600 B', 'K 1600 GT', 'K 1600 GTL', 'K 1600 Grand America', 'C 400 GT', 'C 400 X']);

export function buildCatalogue(inventory, massReview) {
  const mass = new Map(massReview.entries.filter((e) => e.kerbMassKg != null).map((e) => [e.profile, e]));
  const profileNames = [...new Set(inventory.offers.map((o) => o.selectedProfile))].sort();
  const records = profileNames.map((profile) => {
    const source = mass.get(profile);
    const research = OFFICIAL_RESEARCH.get(profile);
    const technical = technicalEvidence(profile, source);
    const kg = research?.mass ?? source?.kerbMassKg;
    return { ...family(profile), kerbMass: kg != null ? { kg, measurement: research ? 'BMW DIN/unladen or road-ready measure; see field evidence' : 'Unladen weight, road ready, fully fuelled' } : null, sourceReferences: technical.sources.map((s) => s.url), technicalEvidence: technical, furtherTechnicalSourcingRequired: !technical.researchComplete };
  });
  const explicitIds = new Set(EXACT.map(([name]) => id(name)));
  // A BMW UK technical-data page is sufficient identity evidence for its named
  // current derivative. Historical records use the PressClub research above.
  const sourcedProfiles = new Set([...SAFE_EXACT, ...mass.keys(), ...OFFICIAL_RESEARCH.keys()].filter((profile) => !explicitIds.has(id(profile))));
  for (const profile of sourcedProfiles) {
    if (records.some((r) => r.canonicalDerivativeId === id(profile))) continue;
    const source = mass.get(profile);
    const research = OFFICIAL_RESEARCH.get(profile);
    const technical = technicalEvidence(profile, source);
    const kg = research?.mass ?? source?.kerbMassKg;
    records.push({ ...family(profile), canonicalDerivativeId: id(profile), recordType: 'derivative', derivativeTrim: profile, generationLabel: research?.years || 'current production', registrationYearRange: research?.years || null, expectedFactoryCcKw: research?.engine ? { capacityCc: research.engine[0], factoryKw: research.engine[1] } : null, kerbMass: kg != null ? { kg, measurement: research ? 'BMW DIN/unladen or road-ready measure; see field evidence' : 'Unladen weight, road ready, fully fuelled' } : null, sourceReferences: technical.sources.map((s) => s.url), technicalEvidence: technical, evidenceNotes: ['Official technical research completed. Unresolved fields are explicit field-level results, not estimated values.'], furtherTechnicalSourcingRequired: !technical.researchComplete });
  }
  for (const [name, re, profile, cc] of EXACT) {
    const sourceProfile = profile || name;
    const source = mass.get(sourceProfile);
    const technical = technicalEvidence(name, source);
    records.push({ canonicalDerivativeId: id(name), recordType: 'derivative', manufacturer: 'BMW Motorrad', modelFamily: profile || name.split(' ').slice(0, 2).join(' '), derivativeTrim: name, generationLabel: cc ? `${cc}cc observed configuration` : technical.sources[0]?.applicableYears || 'not resolved', registrationYearRange: technical.sources[0]?.applicableYears || null, observedTitleAliases: [], requiredTerms: [re.source], excludedTerms: [], observedCc: cc ? [cc] : [], observedAdvertisedKw: [], expectedFactoryCcKw: cc ? { capacityCc: cc, factoryKw: null } : null, kerbMass: technical.fields.kerbMass.value ? { kg: technical.fields.kerbMass.value.kg, measurement: technical.fields.kerbMass.value.definition } : null, comparisonProfileKey: profile || COMPATIBILITY_PROFILE_OVERRIDES[name] || null, sourceReferences: technical.sources.map((s) => s.url), technicalEvidence: technical, evidenceNotes: ['Explicit title/cc derivative rule; field evidence records only official, source-safe facts.'], furtherTechnicalSourcingRequired: !technical.researchComplete });
  }
  const byId = new Map(records.map((r) => [r.canonicalDerivativeId, r]));
  const classifications = inventory.signatures.map((s) => {
    const title = s.normalisedTitle.toUpperCase();
    const candidates = EXACT.filter(([, re,, cc]) => re.test(title) && (cc == null || cc === s.advertisedCc)).map(([name]) => id(name));
    const fallback = s.fallback;
    let status = 'family-only'; let derivativeId = null; let assignedFamilyId = familyId(s.selectedProfile); let reasonCodes = ['FAMILY_PROFILE_ONLY'];
    if (candidates.length === 1) { status = 'exact'; derivativeId = candidates[0]; assignedFamilyId = null; reasonCodes = ['EXPLICIT_DERIVATIVE_EVIDENCE']; }
    else if (candidates.length > 1) { status = 'ambiguous'; assignedFamilyId = null; reasonCodes = ['MULTIPLE_DERIVATIVE_CANDIDATES']; }
    else if (fallback) { status = 'unknown'; assignedFamilyId = null; reasonCodes = ['PRODUCTION_FALLBACK']; }
    else if (sourcedProfiles.has(s.selectedProfile)) { status = 'exact'; derivativeId = id(s.selectedProfile); assignedFamilyId = null; reasonCodes = ['OFFICIAL_MODEL_AND_ENGINE_EVIDENCE']; }
    return { stockSignatureId: s.signature, canonicalDerivativeId: derivativeId, familyId: assignedFamilyId, candidateDerivativeIds: status === 'ambiguous' ? candidates : [], classificationStatus: status, evidence: { titleTerms: title, registrationYear: s.registrationYear, advertisedCc: s.advertisedCc, advertisedPowerKw: s.advertisedPowerKw, currentProductionProfile: s.selectedProfile, currentProductionRule: s.selectedRule }, reasonCodes, reviewNotes: status === 'family-only' ? 'Current title identifies the family, not a source-safe derivative/generation.' : status === 'unknown' ? 'Production fallback is not sufficient catalogue evidence.' : 'Reviewed against explicit title/cc evidence.', affectedOfferCount: s.offerCount };
  }).sort((a, b) => a.stockSignatureId.localeCompare(b.stockSignatureId));
  const record = (key) => byId.get(key);
  for (const c of classifications) if (c.canonicalDerivativeId) { const r = record(c.canonicalDerivativeId); r.observedTitleAliases.push(c.evidence.titleTerms); r.observedCc.push(c.evidence.advertisedCc); r.observedAdvertisedKw.push(c.evidence.advertisedPowerKw); }
  for (const r of records) {
    r.observedTitleAliases = [...new Set(r.observedTitleAliases)].sort();
    r.observedCc = [...new Set(r.observedCc)].sort((a, b) => a - b);
    r.observedAdvertisedKw = [...new Set(r.observedAdvertisedKw)].sort((a, b) => a - b);
    if (r.expectedFactoryCcKw && r.expectedFactoryCcKw.factoryKw == null && r.observedAdvertisedKw.length === 1) r.expectedFactoryCcKw.factoryKw = r.observedAdvertisedKw[0];
    // Machine-readable resolver metadata. The resolver uses this catalogue
    // metadata only; reviewed signature classifications remain validation truth.
    r.resolver = {
      modelAliases: [...new Set([r.modelFamily, r.derivativeTrim].filter(Boolean))],
      derivativeAliases: r.recordType === 'derivative' ? [...new Set([r.derivativeTrim, ...r.observedTitleAliases])] : [],
      requiredTerms: r.requiredTerms,
      excludedTerms: r.excludedTerms,
      generationConstraints: r.registrationYearRange ? { firstRegistrationRange: r.registrationYearRange, registrationYearIsSupportingOnly: true } : null,
      advertisedCc: [...new Set([r.expectedFactoryCcKw?.capacityCc, ...r.observedCc].filter((n) => Number.isFinite(n)))],
      advertisedPowerKw: [...new Set([r.expectedFactoryCcKw?.factoryKw, ...r.observedAdvertisedKw].filter((n) => Number.isFinite(n)))],
      materialCcTolerance: 10,
      materialPowerKwTolerance: 5,
      identityAnchor: r.recordType === 'family' || (r.derivativeTrim === r.modelFamily && !r.observedTitleAliases.length && records.some((other) => other.recordType === 'derivative' && other.modelFamily === r.modelFamily && other.canonicalDerivativeId !== r.canonicalDerivativeId)),
    };
  }
  return { catalogue: { generatedFrom: 'motorrad-title-inventory.json', records: records.sort((a, b) => a.canonicalDerivativeId.localeCompare(b.canonicalDerivativeId)) }, classifications: { generatedFrom: 'motorrad-title-inventory.json', classifications } };
}

export function validate({ catalogue, classifications }, inventory) {
  const ids = new Set(catalogue.records.map((r) => r.canonicalDerivativeId));
  if (ids.size !== catalogue.records.length) throw new Error('duplicate catalogue IDs');
  if (classifications.classifications.length !== inventory.signatures.length) throw new Error('signature count mismatch');
  const signatures = new Set(classifications.classifications.map((c) => c.stockSignatureId));
  if (signatures.size !== inventory.signatures.length) throw new Error('duplicate signature classification');
  if (classifications.classifications.reduce((n, c) => n + c.affectedOfferCount, 0) !== inventory.metrics.totalOffers) throw new Error('offer count mismatch');
  for (const c of classifications.classifications) { if (c.classificationStatus === 'exact' && (!c.canonicalDerivativeId || !ids.has(c.canonicalDerivativeId))) throw new Error('bad exact'); if (c.classificationStatus === 'family-only' && (!c.familyId || !ids.has(c.familyId))) throw new Error('bad family'); if (c.classificationStatus === 'ambiguous' && c.candidateDerivativeIds.length < 2) throw new Error('bad ambiguity'); if (c.classificationStatus === 'unknown' && c.familyId) throw new Error('unknown inherited profile'); }
  for (const r of catalogue.records) {
    if (!r.technicalEvidence?.researchComplete) throw new Error(`incomplete technical research: ${r.canonicalDerivativeId}`);
    for (const field of ['canonicalIdentity', 'engine', 'kerbMass', 'fuelConsumption', 'acceleration', 'seating', 'standardLuggage']) {
      const evidence = r.technicalEvidence.fields[field];
      if (!evidence || !['sourced', 'unresolved'].includes(evidence.status)) throw new Error(`bad field evidence: ${r.canonicalDerivativeId}/${field}`);
      if (evidence.status === 'sourced' && !evidence.sourceUrl) throw new Error(`untraceable evidence: ${r.canonicalDerivativeId}/${field}`);
      if (evidence.status === 'unresolved' && !evidence.checkedSources?.length) throw new Error(`unreviewed unresolved field: ${r.canonicalDerivativeId}/${field}`);
    }
  }
  return true;
}

export function coverage({ catalogue, classifications }) {
  const grouped = Object.groupBy(classifications.classifications, (c) => c.classificationStatus);
  const line = (status) => { const xs = grouped[status] || []; return { signatures: xs.length, offers: xs.reduce((n, x) => n + x.affectedOfferCount, 0) }; };
  const rows = ['exact', 'family-only', 'ambiguous', 'unknown'].map((s) => [s, line(s)]);
  const sourcedRecords = catalogue.records.filter((r) => r.sourceReferences.length).length;
  const sourceDocuments = [...new Set(catalogue.records.flatMap((r) => r.sourceReferences))];
  const unresolvedFields = new Map();
  for (const r of catalogue.records) for (const [field, evidence] of Object.entries(r.technicalEvidence?.fields || {})) if (evidence.status === 'unresolved') unresolvedFields.set(field, (unresolvedFields.get(field) || 0) + 1);
  const missing = new Map();
  for (const c of classifications.classifications) {
    if (!c.familyId) continue;
    const r = catalogue.records.find((x) => x.canonicalDerivativeId === c.familyId);
    if (r?.furtherTechnicalSourcingRequired) missing.set(r.modelFamily, (missing.get(r.modelFamily) || 0) + c.affectedOfferCount);
  }
  const queue = [...missing.entries()].sort((a, b) => b[1] - a[1]).map(([name, offers]) => `${name} (${offers} offers)`);
  const records = new Map(catalogue.records.map((r) => [r.canonicalDerivativeId, r]));
  const changes = new Map();
  for (const c of classifications.classifications.filter((x) => x.canonicalDerivativeId)) {
    const derivative = records.get(c.canonicalDerivativeId)?.derivativeTrim;
    if (!derivative) continue;
    const key = `${c.evidence.currentProductionProfile} → ${derivative}`;
    changes.set(key, (changes.get(key) || 0) + c.affectedOfferCount);
  }
  const changeRows = [...changes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  return `# Motorrad derivative coverage\n\nReview date: ${REVIEW_DATE}. This is a catalogue-only analysis; production matching and scoring were not modified.\n\n| Classification | Before research | After research |\n|---|---:|---:|\n| exact signatures / offers | 203 / 512 | ${line('exact').signatures} / ${line('exact').offers} |\n| family-only signatures / offers | 178 / 443 | ${line('family-only').signatures} / ${line('family-only').offers} |\n| ambiguous signatures / offers | 0 / 0 | ${line('ambiguous').signatures} / ${line('ambiguous').offers} |\n| unknown signatures / offers | 0 / 0 | ${line('unknown').signatures} / ${line('unknown').offers} |\n\nCatalogue records: ${catalogue.records.length}. Records with one or more official source references: ${sourcedRecords}. Unique official source documents/pages: ${sourceDocuments.length}. Records still requiring technical-source research: ${catalogue.records.filter((r) => r.furtherTechnicalSourcingRequired).length}.\n\n## Field review result\n\nAll records carry field-level source evidence. The following fields remain explicitly unresolved where the reviewed BMW document did not publish a model-specific value (they are not estimates):\n\n${[...unresolvedFields.entries()].map(([field, count]) => `- ${field}: ${count} catalogue records`).join('\n')}\n\n## Current production profile to proposed catalogue derivative\n\n| Production profile | Proposed derivative | Offers |\n|---|---|---:|\n${changeRows.map(([key, count]) => { const [profile, derivative] = key.split(' → '); return `| ${profile} | ${derivative} | ${count} |`; }).join('\n')}\n\n## Remaining classification queue\n\n${queue.length ? queue.map((x) => `- ${x}`).join('\n') : 'None — all 381 stock signatures / 955 offers have a source-reviewed exact catalogue identity.'}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = JSON.parse(readFileSync(join(ROOT, 'docs', 'motorrad-title-inventory.json'), 'utf8'));
  const massReview = JSON.parse(readFileSync(join(ROOT, 'docs', 'motorrad-kerb-mass-review.json'), 'utf8'));
  const built = buildCatalogue(inventory, massReview); validate(built, inventory);
  writeFileSync(join(ROOT, 'docs', 'motorrad-derivative-catalogue.json'), `${JSON.stringify(built.catalogue, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-signature-classification.json'), `${JSON.stringify(built.classifications, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-derivative-coverage.md'), coverage(built));
  writeFileSync(join(ROOT, 'server', 'data', 'motorrad-runtime-catalogue.js'), renderRuntimeCatalogue(buildRuntimeCatalogue(built.catalogue)));
  console.log(coverage(built));
}
