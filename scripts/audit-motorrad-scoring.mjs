import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MOTORRAD_RUNTIME_CATALOGUE } from '../server/data/motorrad-runtime-catalogue.js';
import { MODEL_SPECS_MOTORRAD, mapMotorradRawWithScoringMode } from '../server/mapping.js';
import { brandTuning } from '../server/brands.js';
import { rankCars } from '../server/engine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_DATE = '2026-09-16';
const SCORING_FIELDS = ['livePrice', 'liveMileage', 'registrationYear', 'advertisedCc', 'advertisedPowerKw', 'licenceEligibility', 'category', 'fuel', 'sizeClass', 'tags', 'defaultCc', 'factoryKw', 'kerbMassKg', 'powerToWeightKwPerKg', 'zeroTo62', 'mpg', 'evRange', 'seats', 'boot', 'explanations'];
const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const sourceCatalogue = read('docs/motorrad-derivative-catalogue.json');
const fixtures = read('fixtures/motorrad-bikes.json');
const sourceById = new Map(sourceCatalogue.records.map((record) => [record.canonicalDerivativeId, record]));
const runtimeById = new Map(MOTORRAD_RUNTIME_CATALOGUE.records.map((record) => [record.canonicalDerivativeId, record]));

const source = (value, evidence, note) => ({ value, provenance: 'sourced', evidence, note });
const calculated = (value, formula, inputs, note) => ({ value, provenance: 'calculated', formula, inputs, note });
const editorial = (value, rationale, note) => ({ value, provenance: 'editorial', rationale, note });
const unavailable = (note) => ({ value: null, provenance: 'unavailable', note });
const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const rawFor = (bike) => ({ id: bike.id, title: bike.name, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, fuel: bike.fuel, mileage: bike.mileage, image: bike.photo, link: bike.link });
const familyTags = (category, fuel) => {
  const tags = [category];
  if (category === 'tourer' || category === 'adventure') tags.push('touring');
  if (category === 'adventure') tags.push('adventure');
  if (category === 'sport') tags.push('sporty');
  if (category === 'roadster' || category === 'naked') tags.push('commuter');
  if (category === 'heritage') tags.push('heritage');
  if (fuel === 'ev') tags.push('electric', 'commuter');
  return [...new Set(tags)];
};

function currentBasis(record, runtime) {
  if (!runtime?.compatibilityProfile) return 'unverified';
  return record.derivativeTrim && runtime.compatibilityProfile === record.derivativeTrim ? 'unverified' : 'inherited';
}

function officialField(record, field) {
  return record.technicalEvidence?.fields?.[field] || null;
}

function proposedFields(record, runtime) {
  const spec = MODEL_SPECS_MOTORRAD[runtime.compatibilityProfile];
  const label = record.derivativeTrim || record.modelFamily;
  const engine = officialField(record, 'engine');
  const mass = officialField(record, 'kerbMass');
  const consumption = officialField(record, 'fuelConsumption');
  const engineValue = engine?.status === 'sourced' ? engine.value : null;
  // The reviewed catalogue's kerbMass record is itself an existing BMW-sourced
  // mass record. Some older entries predate the field-level technical-evidence
  // shape, so retain that source rather than discarding approved mass data.
  const massValue = mass?.status === 'sourced' ? mass.value : record.kerbMass?.kg != null ? { kg: record.kerbMass.kg, definition: record.kerbMass.measurement } : null;
  const massEvidence = mass?.status === 'sourced'
    ? { sourceUrl: mass.sourceUrl, document: mass.document, applicableYears: mass.applicableYears, definition: massValue?.definition }
    : massValue ? { sourceUrl: record.sourceReferences[0], document: 'Reviewed BMW Motorrad mass record', applicableYears: record.registrationYearRange, definition: massValue.definition } : null;
  const litres = typeof consumption?.value === 'string' ? Number(consumption.value.match(/[\d.]+/)?.[0]) : null;
  const category = spec.category;
  const fuel = spec.cc === 0 ? 'ev' : 'petrol';
  const liveEvidence = { sourceUrl: 'https://approvedused.bmw-motorrad.co.uk/', document: 'BMW Motorrad Approved Used listing', applicableYears: 'per offer' };
  return {
    livePrice: source('per-offer', liveEvidence, 'Live listing price drives budget eligibility and score; no model default is proposed.'),
    liveMileage: source('per-offer', liveEvidence, 'Live listing mileage informs display/age context; no model default is proposed.'),
    registrationYear: source('per-offer', liveEvidence, 'Live first-registration evidence remains listing-specific and supports identity only.'),
    advertisedCc: source('per-offer', liveEvidence, 'Live advertised cc takes precedence over factory capacity and is used by the A1 screen.'),
    advertisedPowerKw: source('per-offer', liveEvidence, 'Live advertised kW takes precedence over factory kW and is used by A1/A2 and power-to-weight screening.'),
    licenceEligibility: calculated('per-offer', 'A1/A2 eligibility uses live advertised cc/kW; power-to-weight = advertisedPowerKw / sourced kerbMassKg when mass exists', { advertisedCc: 'live listing', advertisedPowerKw: 'live listing', kerbMassKg: massValue?.kg ?? null, massSourceUrl: mass?.sourceUrl ?? null }, 'This records the existing licence-screen inputs; it is not a legal entitlement decision.'),
    category: editorial(category, `${label}: editorial vehicle-class assignment based on its canonical BMW model designation; retained separately from the legacy ${runtime.compatibilityProfile} profile.`, 'Drives body/category matching and category explanation.'),
    fuel: editorial(fuel, `${label}: editorial powertrain classification for the scoring engine; live advertised cc/kW remain per-offer and are never replaced.`, 'Drives fuel and EV economy branches.'),
    sizeClass: editorial(spec.sizeClass, `${label}: editorial manageability band ${spec.sizeClass}, reviewed as a comparison judgement rather than a BMW technical measurement.`, 'Drives city/road-trip size scoring.'),
    tags: editorial(familyTags(category, fuel), `${label}: editorial rider-character tags derived from this derivative's proposed category and powertrain, not inherited invisibly from its parent profile.`, 'Drives character reasons and style/priority scoring.'),
    defaultCc: engineValue?.capacityCc != null ? source(engineValue.capacityCc, { sourceUrl: engine.sourceUrl, document: engine.document, applicableYears: engine.applicableYears }, 'Factory capacity fallback only; live advertised cc takes precedence.') : unavailable('No official derivative-safe factory capacity in the existing catalogue evidence.'),
    factoryKw: engineValue?.factoryKw != null ? source(engineValue.factoryKw, { sourceUrl: engine.sourceUrl, document: engine.document, applicableYears: engine.applicableYears }, 'Reference only; never replaces live advertised kW.') : unavailable('No official derivative-safe factory kW in the existing catalogue evidence.'),
    kerbMassKg: massValue?.kg != null ? source(massValue.kg, massEvidence, 'Used only for the existing advertised-power-to-mass licence check.') : unavailable('No existing sourced BMW kerb/mass-in-running-order value for this exact record.'),
    powerToWeightKwPerKg: massValue?.kg != null ? calculated(null, 'advertisedPowerKw / kerbMassKg', { advertisedPowerKw: 'live listing', kerbMassKg: massValue.kg, massSourceUrl: massEvidence.sourceUrl }, 'Per-offer calculated value; no factory kW substitution.') : unavailable('Cannot calculate without sourced derivative-specific mass.'),
    zeroTo62: unavailable('Existing official research does not establish a derivative-safe acceleration value.'),
    mpg: litres && litres > 0 ? calculated(Number((282.481 / litres).toFixed(2)), 'UK mpg = 282.481 / litresPer100km', { litresPer100km: litres, sourceValue: consumption.value, sourceUrl: consumption.sourceUrl }, 'Original official L/100km value is retained; UK mpg is only a scoring conversion.') : unavailable(fuel === 'ev' ? 'Electric derivatives are not represented as petrol mpg.' : 'No official derivative-safe fuel-consumption value in the existing catalogue evidence.'),
    evRange: unavailable(fuel === 'ev' ? 'No official derivative-safe electric range is represented in the current catalogue evidence.' : 'Not applicable to petrol derivatives.'),
    seats: unavailable('Existing official research leaves seating/pillion configuration unresolved; no 0/1/2 inference is made.'),
    boot: unavailable('Existing official research leaves standard luggage unresolved; optional luggage is not converted into standard capacity.'),
    explanations: editorial({ category, tags: familyTags(category, fuel) }, `${label}: rider-facing explanations may describe only the editorial category/tags. No acceleration, luggage, seating, or consumption claim is proposed without provenance.`, 'Controls only which category/tag explanations could be emitted.'),
  };
}

function currentFields(runtime) {
  const spec = runtime.compatibilityProfile ? MODEL_SPECS_MOTORRAD[runtime.compatibilityProfile] : null;
  const basis = currentBasis(sourceById.get(runtime.canonicalDerivativeId), runtime);
  const field = (value) => ({ value: value ?? null, provenance: basis, compatibilityProfile: runtime.compatibilityProfile || null });
  const live = (value = 'per-offer') => ({ value, provenance: 'sourced', compatibilityProfile: null, note: 'Live BMW Motorrad listing fact, not a compatibility-profile value.' });
  return {
    livePrice: live(), liveMileage: live(), registrationYear: live(), advertisedCc: live(), advertisedPowerKw: live(), licenceEligibility: field('per-offer'),
    category: field(spec?.category), fuel: field(spec?.cc === 0 ? 'ev' : 'petrol'), sizeClass: field(spec?.sizeClass), tags: field(spec ? familyTags(spec.category, spec.cc === 0 ? 'ev' : 'petrol') : null),
    defaultCc: field(spec?.cc), factoryKw: field(null), kerbMassKg: field(spec?.kerbMassKg), powerToWeightKwPerKg: field(null), zeroTo62: field(spec?.zeroTo62), mpg: field(spec?.mpg), evRange: field(spec?.evRange), seats: field(spec?.seats), boot: field(spec?.boot), explanations: field(null),
  };
}

function liveSummary(offers) {
  const values = (key) => [...new Set(offers.map((offer) => offer[key]).filter((value) => value != null))].sort((a, b) => Number(a) - Number(b));
  return { offerCount: offers.length, advertisedCc: values('cc'), advertisedPowerKw: values('power'), registrationYears: values('year'), priceRange: offers.length ? [Math.min(...offers.map((offer) => offer.priceMin)), Math.max(...offers.map((offer) => offer.priceMin))] : null };
}

function effectiveProposedMap(fixture, profileById, answers = {}) {
  const production = mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy');
  if (!production?.canonicalDerivativeId) throw new Error(`Fixture ${fixture.id} did not resolve exactly`);
  const profile = profileById.get(production.canonicalDerivativeId);
  if (!profile) throw new Error(`No proposed profile for ${production.canonicalDerivativeId}`);
  const value = (field) => profile.fields[field].value;
  const wantsPerformance = Number(answers.style) >= 4 || (answers.priorities || []).includes('performance');
  const space = (answers.people === 'family' ? 1 : answers.people === 'crew' ? 2 : 0) + (answers.primaryUse === 'roadtrips' || answers.primaryUse === 'family' ? 1 : 0);
  const neutralBootNeed = [0, 30, 80][Math.min(space, 2)];
  // These are scoring-neutral sentinels used only by this audit adapter, never
  // stored in proposed profiles or shown to a rider. They let the existing
  // engine evaluate an unavailable field without treating null as zero or
  // silently claiming the compatibility profile's derivative value.
  const neutralZeroTo62 = wantsPerformance ? 3.4 : 5.4;
  const neutralMpg = 42.5;
  const neutralSeats = 1;
  const neutralBoot = neutralBootNeed ? neutralBootNeed / 2 : undefined;
  return {
    ...production,
    body: value('category'), fuel: value('fuel'), sizeClass: value('sizeClass'), tags: value('tags'),
    // Per-offer values remain production values. Model fallback is available only
    // when sourced, but every captured fixture already has advertised cc/kW.
    cc: production.advertisedCc ?? value('defaultCc'),
    kerbMassKg: value('kerbMassKg') ?? undefined,
    powerToWeightKwPerKg: value('kerbMassKg') != null && production.advertisedPowerKw != null ? production.advertisedPowerKw / value('kerbMassKg') : undefined,
    zeroTo62: value('zeroTo62') ?? neutralZeroTo62,
    mpg: value('mpg') ?? (value('fuel') === 'ev' ? undefined : neutralMpg),
    // Range is not an engine score input. Preserve the live display fact for
    // this shadow-only adapter while its derivative-specific source status is
    // still unavailable; it is never recorded as a proposed profile value.
    evRange: value('evRange') ?? production.evRange,
    seats: value('seats') ?? neutralSeats,
    boot: value('boot') ?? neutralBoot,
  };
}

const SCENARIOS = [
  ['a1-commute-low', { budget: [0, 7000], mileage: 'high', fuel: 'open', bodyStyles: ['scooter'], primaryUse: 'city', priorities: ['economy'], style: 2, licence: 'a1' }],
  ['a2-adventure-medium', { budget: [0, 14000], mileage: 'mid', fuel: 'open', bodyStyles: ['adventure'], primaryUse: 'roadtrips', priorities: ['comfort'], style: 3, licence: 'a2' }],
  ['full-a-performance-high', { budget: [0, 30000], mileage: 'mid', fuel: 'open', bodyStyles: ['sport'], primaryUse: 'fun', priorities: ['performance'], style: 5, licence: 'a' }],
  ['full-a-economy-high-mileage', { budget: [0, 16000], mileage: 'high', fuel: 'open', bodyStyles: ['roadster'], primaryUse: 'commute', priorities: ['economy'], style: 3, licence: 'a' }],
  ['full-a-touring-practicality', { budget: [0, 30000], mileage: 'mid', fuel: 'open', bodyStyles: ['tourer'], primaryUse: 'roadtrips', priorities: ['comfort'], style: 2, licence: 'a' }],
  ['full-a-pillion', { budget: [0, 30000], mileage: 'low', fuel: 'open', bodyStyles: ['tourer'], people: 'family', primaryUse: 'roadtrips', priorities: ['comfort'], style: 2, licence: 'a' }],
  ['full-a-manageability', { budget: [0, 12000], mileage: 'low', fuel: 'open', bodyStyles: ['naked'], primaryUse: 'city', priorities: ['economy'], style: 2, licence: 'a' }],
  ['full-a-heritage-character', { budget: [0, 22000], mileage: 'low', fuel: 'open', bodyStyles: ['heritage'], primaryUse: 'fun', priorities: ['image'], style: 3, licence: 'a' }],
  ['category-adventure', { budget: [0, 20000], mileage: 'mid', fuel: 'open', bodyStyles: ['adventure'], primaryUse: 'roadtrips', priorities: [], style: 3, licence: 'a' }],
  ['category-roadster', { budget: [0, 20000], mileage: 'mid', fuel: 'open', bodyStyles: ['roadster'], primaryUse: 'fun', priorities: [], style: 3, licence: 'a' }],
  ['category-naked', { budget: [0, 20000], mileage: 'mid', fuel: 'open', bodyStyles: ['naked'], primaryUse: 'city', priorities: [], style: 3, licence: 'a' }],
  ['category-scooter', { budget: [0, 12000], mileage: 'high', fuel: 'open', bodyStyles: ['scooter'], primaryUse: 'city', priorities: ['economy'], style: 2, licence: 'a' }],
];

function movement(oldMatches, proposedMatches) {
  const oldById = new Map(oldMatches.map((match, index) => [match.car.id, { ...match, position: index + 1 }]));
  const proposedById = new Map(proposedMatches.map((match, index) => [match.car.id, { ...match, position: index + 1 }]));
  const ids = new Set([...oldById.keys(), ...proposedById.keys()]);
  const entries = [...ids].map((id) => {
    const current = oldById.get(id); const proposed = proposedById.get(id);
    const fieldChanges = current && proposed ? ['body', 'fuel', 'sizeClass', 'tags', 'kerbMassKg', 'zeroTo62', 'mpg', 'evRange', 'seats', 'boot'].filter((field) => JSON.stringify(current.car[field]) !== JSON.stringify(proposed.car[field])) : [];
    return { offerId: id, currentPosition: current?.position ?? null, proposedPosition: proposed?.position ?? null, currentScore: current?.score ?? null, proposedScore: proposed?.score ?? null, currentFit: current?.fit ?? null, proposedFit: proposed?.fit ?? null, currentTaste: current?.taste ?? null, proposedTaste: proposed?.taste ?? null, fieldChanges, missingDataAffected: fieldChanges.some((field) => ['zeroTo62', 'mpg', 'evRange', 'seats', 'boot'].includes(field)) };
  }).filter((entry) => entry.currentPosition !== entry.proposedPosition || entry.currentScore !== entry.proposedScore);
  return { topThreeCurrent: oldMatches.slice(0, 3).map((match) => match.car.id), topThreeProposed: proposedMatches.slice(0, 3).map((match) => match.car.id), topTenAdded: proposedMatches.slice(0, 10).map((match) => match.car.id).filter((id) => !oldMatches.slice(0, 10).some((match) => match.car.id === id)), topTenRemoved: oldMatches.slice(0, 10).map((match) => match.car.id).filter((id) => !proposedMatches.slice(0, 10).some((match) => match.car.id === id)), materialMovements: entries.filter((entry) => entry.currentPosition <= 10 || entry.proposedPosition <= 10).slice(0, 30) };
}

export function buildMotorradScoringAudit() {
  const offersByDerivative = new Map();
  for (const fixture of fixtures) {
    const mapped = mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy');
    const key = mapped?.canonicalDerivativeId;
    if (!key) throw new Error(`Fixture ${fixture.id} is not production-resolvable`);
    const bucket = offersByDerivative.get(key) || []; bucket.push(fixture); offersByDerivative.set(key, bucket);
  }
  const auditRecords = MOTORRAD_RUNTIME_CATALOGUE.records.map((runtime) => {
    const record = sourceById.get(runtime.sourceRecordId);
    if (!record) throw new Error(`Missing reviewed source record ${runtime.sourceRecordId}`);
    const proposed = proposedFields(record, runtime);
    return { canonicalDerivativeId: runtime.canonicalDerivativeId, recordType: runtime.recordType, modelFamily: runtime.modelFamily, derivativeTrim: runtime.derivativeTrim, compatibilityProfile: runtime.compatibilityProfile, liveListingSummary: liveSummary(offersByDerivative.get(runtime.canonicalDerivativeId) || []), officialEvidence: { engine: officialField(record, 'engine'), kerbMass: officialField(record, 'kerbMass'), fuelConsumption: officialField(record, 'fuelConsumption'), acceleration: officialField(record, 'acceleration'), seating: officialField(record, 'seating'), standardLuggage: officialField(record, 'standardLuggage') }, currentCompatibilityFields: currentFields(runtime), proposedFields: proposed, proposalDiffersFromCurrent: SCORING_FIELDS.filter((field) => JSON.stringify(currentFields(runtime)[field].value) !== JSON.stringify(proposed[field].value)), expectedScoringEffect: 'Shadow only: sourced/calculated fields can change licence, economy, performance and practicality ordering; unavailable fields are evaluated neutrally, never as zero.' };
  });
  const proposedProfiles = { generatedAt: REVIEW_DATE, purpose: 'Review-only proposed derivative-specific scoring profiles. Not consumed by production.', formulae: { ukMpgFromLitresPer100km: 'UK mpg = 282.481 / litresPer100km', powerToWeight: 'advertisedPowerKw / sourced kerbMassKg' }, profiles: auditRecords.map(({ canonicalDerivativeId, recordType, modelFamily, derivativeTrim, compatibilityProfile, proposedFields: fields }) => ({ canonicalDerivativeId, recordType, modelFamily, derivativeTrim, compatibilityProfile, fields })) };
  const audit = { generatedAt: REVIEW_DATE, purpose: 'Complete scoring-field audit; current compatibility values are not presented as derivative-specific evidence.', scoringFieldDimensions: SCORING_FIELDS, records: auditRecords };
  validateMotorradScoringAudit(audit, proposedProfiles);
  return { audit, proposedProfiles };
}

export function validateMotorradScoringAudit(audit, proposedProfiles) {
  if (audit.records.length !== MOTORRAD_RUNTIME_CATALOGUE.records.length || proposedProfiles.profiles.length !== MOTORRAD_RUNTIME_CATALOGUE.records.length) throw new Error('incomplete catalogue scoring audit');
  const sourceUrls = new Set(sourceCatalogue.records.flatMap((record) => record.sourceReferences));
  for (const profile of proposedProfiles.profiles) {
    if (Object.keys(profile.fields).length !== SCORING_FIELDS.length) throw new Error(`incomplete proposed fields: ${profile.canonicalDerivativeId}`);
    for (const [field, proposal] of Object.entries(profile.fields)) {
      if (!['sourced', 'calculated', 'editorial', 'unavailable'].includes(proposal.provenance)) throw new Error(`invalid provenance ${profile.canonicalDerivativeId}/${field}`);
      if (proposal.provenance === 'sourced' && (!proposal.evidence?.sourceUrl || !sourceUrls.has(proposal.evidence.sourceUrl))) throw new Error(`bad sourced evidence ${profile.canonicalDerivativeId}/${field}`);
      if (proposal.provenance === 'calculated' && (!proposal.formula || !proposal.inputs)) throw new Error(`unreproducible calculation ${profile.canonicalDerivativeId}/${field}`);
      if (proposal.provenance === 'editorial' && !proposal.rationale) throw new Error(`unexplained editorial proposal ${profile.canonicalDerivativeId}/${field}`);
      if (proposal.provenance === 'unavailable' && proposal.value !== null) throw new Error(`unavailable field has value ${profile.canonicalDerivativeId}/${field}`);
    }
  }
  return true;
}

export function runMotorradScoringShadow(proposedProfiles) {
  const profileById = new Map(proposedProfiles.profiles.map((profile) => [profile.canonicalDerivativeId, profile]));
  const currentCars = fixtures.map((fixture) => mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy')).filter(Boolean);
  const evaluabilityAnswers = { budget: [0, 1000000], mileage: 'mid', fuel: 'open', bodyStyles: ['any'], primaryUse: 'fun', priorities: [], style: 3, licence: 'a' };
  const evaluated = rankCars(evaluabilityAnswers, fixtures.map((fixture) => effectiveProposedMap(fixture, profileById, evaluabilityAnswers)), brandTuning('motorrad'));
  if (evaluated.length !== fixtures.length || evaluated.some((match) => !Number.isFinite(match.score))) throw new Error('proposed profiles cannot be evaluated safely for every fixture');
  const scenarios = SCENARIOS.map(([id, answers]) => {
    const current = rankCars(answers, currentCars, brandTuning('motorrad'));
    const proposed = rankCars(answers, fixtures.map((fixture) => effectiveProposedMap(fixture, profileById, answers)), brandTuning('motorrad'));
    return { id, answers, currentTopResults: current.slice(0, 10).map((match) => ({ offerId: match.car.id, title: match.car.name, score: match.score, fit: match.fit, taste: match.taste, reasons: match.reasons })), proposedTopResults: proposed.slice(0, 10).map((match) => ({ offerId: match.car.id, title: match.car.name, score: match.score, fit: match.fit, taste: match.taste, reasons: match.reasons })), ...movement(current, proposed) };
  });
  return { generatedAt: REVIEW_DATE, purpose: 'Shadow-only current compatibility versus proposed derivative profiles.', fixtureOffers: fixtures.length, evaluatedOffers: evaluated.length, scenarios };
}

export function scoringShadowReport(audit, proposedProfiles, shadow) {
  const counts = new Map(); const currentBasisCounts = new Map();
  for (const record of audit.records) for (const field of SCORING_FIELDS) { const proposal = record.proposedFields[field]; counts.set(`${field}:${proposal.provenance}`, (counts.get(`${field}:${proposal.provenance}`) || 0) + 1); currentBasisCounts.set(`${field}:${record.currentCompatibilityFields[field].provenance}`, (currentBasisCounts.get(`${field}:${record.currentCompatibilityFields[field].provenance}`) || 0) + 1); }
  const changed = audit.records.filter((record) => record.proposalDiffersFromCurrent.length).sort((a, b) => b.proposalDiffersFromCurrent.length - a.proposalDiffersFromCurrent.length).slice(0, 20);
  const material = shadow.scenarios.filter((scenario) => scenario.materialMovements.length);
  return `# Motorrad scoring shadow report\n\nReview date: ${REVIEW_DATE}. Proposed profiles are review-only and are not consumed by production scoring, filtering, stock collection, questionnaire, or browser output.\n\n## Coverage\n\n- Catalogue records audited: ${audit.records.length} / ${MOTORRAD_RUNTIME_CATALOGUE.records.length}\n- Fixture offers evaluated in both paths: ${fixtures.length}\n- Shadow scenarios: ${shadow.scenarios.length}\n- Scenarios with top-ten movement: ${material.length}\n\n## Field completeness by proposed provenance\n\n| Dimension | Sourced | Calculated | Editorial | Unavailable |\n|---|---:|---:|---:|---:|\n${SCORING_FIELDS.map((field) => `| ${field} | ${counts.get(`${field}:sourced`) || 0} | ${counts.get(`${field}:calculated`) || 0} | ${counts.get(`${field}:editorial`) || 0} | ${counts.get(`${field}:unavailable`) || 0} |`).join('\n')}\n\n## Current values requiring review\n\n${[...currentBasisCounts.entries()].filter(([key]) => /:(inherited|unverified)$/.test(key)).map(([key, count]) => `- ${key}: ${count}`).join('\n')}\n\n## Largest proposed profile changes\n\n| Derivative | Compatibility profile | Changed proposed fields | Live offers |\n|---|---|---|---:|\n${changed.map((record) => `| ${record.derivativeTrim || record.modelFamily} | ${record.compatibilityProfile || 'none'} | ${record.proposalDiffersFromCurrent.join(', ')} | ${record.liveListingSummary.offerCount} |`).join('\n')}\n\n## Scenario movements\n\n${material.map((scenario) => `### ${scenario.id}\n\n- Current top three: ${scenario.topThreeCurrent.join(', ') || 'none'}\n- Proposed top three: ${scenario.topThreeProposed.join(', ') || 'none'}\n- Top-ten additions: ${scenario.topTenAdded.join(', ') || 'none'}\n- Top-ten removals: ${scenario.topTenRemoved.join(', ') || 'none'}\n${scenario.materialMovements.slice(0, 10).map((move) => `- ${move.offerId}: ${move.currentPosition ?? 'new'} → ${move.proposedPosition ?? 'out'}, score ${move.currentScore ?? 'n/a'} → ${move.proposedScore ?? 'n/a'}; fields: ${move.fieldChanges.join(', ') || 'ranking tie-break'}${move.missingDataAffected ? ' (unavailable source data affected)' : ''}`).join('\n')}`).join('\n\n') || 'No ranking movement.'}\n\n## Editorial decisions still requiring review\n\n- Category, fuel classification, size band and character tags are explicit editorial comparisons for every record; they are not BMW technical claims.\n- Acceleration, seating and standard luggage remain unavailable for every record lacking existing official evidence.\n- Optional panniers/top boxes are excluded from proposed standard luggage.\n- Electric derivatives retain no petrol-mpg claim; their existing range requires separate official evidence before derivative-specific use.\n\n## Recommended staged cutover\n\n1. Review and approve the editorial category/size/tag taxonomy with product stakeholders; it is currently shadow-only.\n2. Enable only sourced mass and calculated power-to-weight changes, with A1/A2 regression checks.\n3. Review official consumption coverage and then enable calculated UK-mpg values for the small sourced subset.\n4. Keep performance, seating and luggage derivative claims disabled until source evidence or an explicit policy is approved.\n5. Re-run this shadow audit and compare live stock before each scoped production enablement.\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { audit, proposedProfiles } = buildMotorradScoringAudit();
  const shadow = runMotorradScoringShadow(proposedProfiles);
  writeFileSync(join(ROOT, 'docs', 'motorrad-scoring-field-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-proposed-scoring-profiles.json'), `${JSON.stringify(proposedProfiles, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-scoring-shadow-results.json'), `${JSON.stringify(shadow, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-scoring-shadow-report.md'), scoringShadowReport(audit, proposedProfiles, shadow));
  console.log(scoringShadowReport(audit, proposedProfiles, shadow));
}
