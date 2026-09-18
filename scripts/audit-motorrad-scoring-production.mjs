import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { brandTuning } from '../server/brands.js';
import { licenceRatioCheck, rankCars } from '../server/engine.js';
import { mapMotorradRawWithScoringMode } from '../server/mapping.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const fixtures = read('fixtures/motorrad-bikes.json');
const proposed = read('docs/motorrad-proposed-scoring-profiles.json');
const reviewedShadow = read('docs/motorrad-scoring-shadow-results.json');
const rawFor = (bike) => ({ id: bike.id, title: bike.name, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, fuel: bike.fuel, mileage: bike.mileage, image: bike.photo, link: bike.link });
const tuning = brandTuning('motorrad');
const project = (match) => ({ offerId: match.car.id, title: match.car.name, score: match.score, fit: match.fit, taste: match.taste, reasons: match.reasons, licenceRatioCheck: match.licenceRatioCheck });
const comparable = (rows) => rows.map(({ offerId, score, fit, taste }) => ({ offerId, score, fit, taste }));
const cars = (mode) => fixtures.map((bike) => mapMotorradRawWithScoringMode(rawFor(bike), mode)).filter(Boolean);
const legacyCars = cars('legacy');
const catalogueCars = cars('catalogue');

function compareScenario(expected, legacy, catalogue) {
  const expectedCurrent = comparable(expected.currentTopResults);
  const expectedCatalogue = comparable(expected.proposedTopResults);
  const actualLegacy = legacy.slice(0, 10).map(project);
  const actualCatalogue = catalogue.slice(0, 10).map(project);
  const changes = new Map();
  const legacyById = new Map(legacy.map((match, index) => [match.car.id, { match, position: index + 1 }]));
  for (const [index, match] of catalogue.entries()) {
    const before = legacyById.get(match.car.id);
    if (before && (before.position !== index + 1 || before.match.score !== match.score)) {
      const fields = ['body', 'fuel', 'sizeClass', 'tags', 'kerbMassKg', 'zeroTo62', 'mpg', 'evRange', 'seats', 'boot'].filter((field) => JSON.stringify(before.match.car[field]) !== JSON.stringify(match.car[field]));
      changes.set(match.car.id, { offerId: match.car.id, from: before.position, to: index + 1, oldScore: before.match.score, newScore: match.score, oldFit: before.match.fit, newFit: match.fit, oldTaste: before.match.taste, newTaste: match.taste, fields });
    }
  }
  return { id: expected.id, answers: expected.answers, legacyTopResults: actualLegacy, catalogueTopResults: actualCatalogue, matchesLegacyShadow: JSON.stringify(comparable(actualLegacy)) === JSON.stringify(expectedCurrent), matchesCatalogueShadow: JSON.stringify(comparable(actualCatalogue)) === JSON.stringify(expectedCatalogue), topThreeChanged: actualLegacy.slice(0, 3).map((x) => x.offerId).join('|') !== actualCatalogue.slice(0, 3).map((x) => x.offerId).join('|'), topTenAdded: actualCatalogue.map((x) => x.offerId).filter((id) => !actualLegacy.some((x) => x.offerId === id)), topTenRemoved: actualLegacy.map((x) => x.offerId).filter((id) => !actualCatalogue.some((x) => x.offerId === id)), movements: [...changes.values()].filter((item) => item.from <= 10 || item.to <= 10).slice(0, 30) };
}

function licenceComparison() {
  const answers = (licence) => ({ budget: [0, 1000000], mileage: 'mid', fuel: 'open', bodyStyles: ['any'], primaryUse: 'fun', priorities: [], style: 3, licence });
  return ['a1', 'a2', 'a'].map((licence) => {
    const a = answers(licence);
    const legacy = rankCars(a, legacyCars, tuning).map((match) => match.car.id);
    const catalogue = rankCars(a, catalogueCars, tuning).map((match) => match.car.id);
    const ratioChanges = fixtures.filter((fixture) => {
      const legacy = mapMotorradRawWithScoringMode(rawFor(fixture), 'legacy');
      const catalogue = mapMotorradRawWithScoringMode(rawFor(fixture), 'catalogue');
      return licenceRatioCheck(legacy, a, tuning) !== licenceRatioCheck(catalogue, a, tuning);
    }).map((fixture) => fixture.id);
    return { licence, legacyEligibleOfferIds: legacy, catalogueEligibleOfferIds: catalogue, sameEligibility: JSON.stringify([...legacy].sort()) === JSON.stringify([...catalogue].sort()), ratioChanges };
  });
}

export function runMotorradProductionScoringAudit() {
  if (legacyCars.length !== fixtures.length || catalogueCars.length !== fixtures.length) throw new Error('not every fixture maps in both scoring modes');
  const scenarios = reviewedShadow.scenarios.map((expected) => compareScenario(expected, rankCars(expected.answers, legacyCars, tuning), rankCars(expected.answers, catalogueCars, tuning)));
  return {
    generatedAt: '2026-09-16',
    purpose: 'Production catalogue scoring audit. Does not change runtime configuration.',
    runtimeProfiles: proposed.profiles.length,
    offers: fixtures.length,
    canonicalExact: catalogueCars.filter((car) => car.identityResolutionStatus === 'exact').length,
    scenarios,
    licence: licenceComparison(),
    allLegacyShadowMatches: scenarios.every((scenario) => scenario.matchesLegacyShadow),
    allCatalogueShadowMatches: scenarios.every((scenario) => scenario.matchesCatalogueShadow),
  };
}

export function productionScoringReport(result) {
  const moved = result.scenarios.filter((scenario) => scenario.movements.length);
  const mismatch = result.scenarios.filter((scenario) => !scenario.matchesLegacyShadow || !scenario.matchesCatalogueShadow);
  return `# Motorrad scoring production cutover\n\nReview date: 2026-09-16. Catalogue scoring is production-default; legacy compatibility scoring remains a server-side rollback mode.\n\n| Check | Result |\n|---|---:|\n| Runtime canonical profiles | ${result.runtimeProfiles} |\n| Fixture offers evaluated | ${result.offers} |\n| Exact canonical identities | ${result.canonicalExact} |\n| Reviewed scenarios | ${result.scenarios.length} |\n| Legacy mode matches saved legacy shadow | ${result.allLegacyShadowMatches ? 'yes' : 'no'} |\n| Catalogue mode matches saved proposed shadow | ${result.allCatalogueShadowMatches ? 'yes' : 'no'} |\n| Scenario mismatches | ${mismatch.length} |\n\n## Licence comparison\n\n${result.licence.map((row) => `- ${row.licence.toUpperCase()}: ${row.legacyEligibleOfferIds.length} legacy / ${row.catalogueEligibleOfferIds.length} catalogue; identical eligibility: ${row.sameEligibility}; power-to-weight status changes: ${row.ratioChanges.length}`).join('\n')}\n\n## Scenario review\n\n${result.scenarios.map((scenario) => `### ${scenario.id}\n\n- Legacy top three: ${scenario.legacyTopResults.slice(0, 3).map((item) => `${item.title} (${item.score})`).join('; ') || 'none'}\n- Catalogue top three: ${scenario.catalogueTopResults.slice(0, 3).map((item) => `${item.title} (${item.score})`).join('; ') || 'none'}\n- Top-ten additions/removals: ${scenario.topTenAdded.join(', ') || 'none'} / ${scenario.topTenRemoved.join(', ') || 'none'}\n- Saved shadow agreement: legacy ${scenario.matchesLegacyShadow ? 'yes' : 'NO'}, catalogue ${scenario.matchesCatalogueShadow ? 'yes' : 'NO'}\n${scenario.movements.slice(0, 10).map((move) => `- ${move.offerId}: ${move.from} → ${move.to}; score ${move.oldScore} → ${move.newScore}, fit ${move.oldFit} → ${move.newFit}, taste ${move.oldTaste} → ${move.newTaste}; fields: ${move.fields.join(', ') || 'tie-break'}`).join('\n')}`).join('\n\n')}\n\n## Missing-data treatment\n\nUnavailable acceleration, standard luggage, seating, economy and EV range remain absent from the catalogue-mode mapped object. The engine treats unavailable performance/practicality inputs neutrally and emits no related reason; optional equipment is not converted into a luggage claim. Live price, mileage, registration, advertised cc and advertised kW remain untouched.\n\n## Rollback\n\nSet server environment variable \`MOTORRAD_SCORING_MODE=legacy\` to retain catalogue identity resolution but use the pre-cutover compatibility scoring profile. \`catalogue\` is the default. Invalid values log a server-side warning and safely use \`catalogue\`; the setting is not included in API output.\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runMotorradProductionScoringAudit();
  writeFileSync(join(ROOT, 'docs', 'motorrad-scoring-production-shadow-results.json'), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs', 'motorrad-scoring-production-cutover.md'), productionScoringReport(result));
  console.log(productionScoringReport(result));
}
