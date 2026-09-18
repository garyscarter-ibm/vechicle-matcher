/**
 * Catalogue-only BMW Motorrad identity resolver.
 *
 * This module has no dependency on the production title mapper or the reviewed
 * signature classifications. Callers supply a generated derivative catalogue;
 * classifications are deliberately a validation-only input in the shadow tool.
 */

const meaningfulPhrase = (value) => normaliseTitle(value).replace(/\b\d+CC\b/g, '').replace(/\s+/g, ' ').trim();

export function normaliseMotorradTitle(value = '') {
  return normaliseTitle(value);
}

function normaliseTitle(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/\b([A-Z]{1,2})\s*(\d{2,4})\b/g, '$1 $2') // F900, R1250, CE04, C400
    .replace(/\bR\s+NINE\s*T\b|\bR\s*NINET\b/g, 'R NINET')
    .replace(/\bG\s*\/\s*S\b|\bG\s+S\b/g, 'G/S')
    .replace(/[^A-Z0-9/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function number(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function registrationYear(listing) {
  const direct = number(listing.registrationYear ?? listing.year);
  if (direct && direct > 1900 && direct < 2200) return direct;
  const match = String(listing.firstRegistration ?? listing.firstReg ?? listing.firstRegistrationDate ?? '').match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function tokenPhraseIn(title, phrase) {
  if (!phrase) return false;
  return ` ${title} `.includes(` ${phrase} `);
}

function titleMatch(title, record) {
  const metadata = record.resolver || {};
  const aliases = [...(metadata.derivativeAliases || []), record.derivativeTrim].filter(Boolean);
  const matches = aliases
    .map(meaningfulPhrase)
    .filter((phrase) => phrase && tokenPhraseIn(title, phrase));
  for (const source of metadata.requiredTerms || record.requiredTerms || []) {
    if (!new RegExp(source, 'i').test(title)) return null;
  }
  for (const source of metadata.excludedTerms || record.excludedTerms || []) {
    if (new RegExp(source, 'i').test(title)) return null;
  }
  if (!matches.length) return null;
  return { phrases: [...new Set(matches)], specificity: Math.max(...matches.map((phrase) => phrase.split(' ').filter((token) => token !== 'BMW').length)) };
}

function sourceValues(record, field) {
  const metadata = record.resolver || {};
  const values = metadata[field] || (field === 'advertisedCc' ? record.observedCc : record.observedAdvertisedKw) || [];
  return [...new Set(values.map(number).filter((value) => value != null))];
}

function materialConflict(actual, expected, tolerance) {
  return actual != null && expected.length && !expected.some((value) => Math.abs(value - actual) <= tolerance);
}

function yearSupport(year, range) {
  if (!year || !range) return { state: 'missing-or-not-published' };
  const years = String(range).match(/(?:19|20)\d{2}/g)?.map(Number) || [];
  if (!years.length) return { state: 'not-machine-readable' };
  const [start, end] = years;
  if (year < start || (end && year > end)) return { state: 'outside-documented-range', range: String(range) };
  return { state: 'within-documented-range', range: String(range) };
}

function confidenceFor(candidate, facts) {
  const supports = Number(facts.cc != null && candidate.ccValues.length) + Number(facts.kw != null && candidate.kwValues.length);
  if (supports === 2 && candidate.year.state === 'within-documented-range') return 'high';
  if (supports >= 1 || candidate.title.specificity >= 3) return 'medium';
  return 'low';
}

export function createMotorradCatalogueResolver(catalogue) {
  if (!catalogue?.records || !Array.isArray(catalogue.records)) throw new TypeError('A generated Motorrad derivative catalogue is required');
  const derivatives = catalogue.records.filter((record) => record.recordType === 'derivative' && !record.resolver?.identityAnchor);
  const families = catalogue.records.filter((record) => record.recordType === 'family');

  return function resolveMotorradListing(listing = {}) {
    const title = normaliseTitle(listing.title ?? listing.name);
    const facts = {
      title,
      registrationYear: registrationYear(listing),
      cc: number(listing.advertisedCc ?? listing.cc),
      kw: number(listing.advertisedPowerKw ?? listing.powerKw ?? listing.power),
    };
    if (!title) return { status: 'unknown', canonicalDerivativeId: null, familyId: null, candidateDerivativeIds: [], confidence: 'none', evidence: facts, reasonCodes: ['MISSING_TITLE'], conflicts: [] };

    const matched = derivatives.map((record) => {
      const titleEvidence = titleMatch(title, record);
      if (!titleEvidence) return null;
      const ccValues = sourceValues(record, 'advertisedCc');
      const kwValues = sourceValues(record, 'advertisedPowerKw');
      const ccTolerance = record.resolver?.materialCcTolerance ?? 10;
      const powerTolerance = record.resolver?.materialPowerKwTolerance ?? 5;
      const conflicts = [];
      if (materialConflict(facts.cc, ccValues, ccTolerance)) conflicts.push({ code: 'MATERIAL_CC_CONFLICT', advertisedCc: facts.cc, catalogueCc: ccValues, tolerance: ccTolerance });
      if (materialConflict(facts.kw, kwValues, powerTolerance)) conflicts.push({ code: 'MATERIAL_POWER_CONFLICT', advertisedPowerKw: facts.kw, cataloguePowerKw: kwValues, tolerance: powerTolerance });
      const year = yearSupport(facts.registrationYear, record.resolver?.generationConstraints?.firstRegistrationRange);
      if (year.state === 'outside-documented-range') conflicts.push({ code: 'REGISTRATION_YEAR_OUTSIDE_DOCUMENTED_RANGE', registrationYear: facts.registrationYear, documentedRange: year.range, nonBlocking: true });
      return { record, title: titleEvidence, ccValues, kwValues, conflicts, year };
    }).filter(Boolean);

    // A complete, more-specific sibling title is a derivative-term conflict
    // for its parent candidate (GS Adventure vs GS, Pure vs the base nineT).
    // Equal title phrases such as the two F 800 GS platforms stay available for
    // cc/kW evidence to disambiguate; catalogue order never decides them.
    for (const candidate of matched) for (const sibling of matched) {
      if (candidate === sibling || sibling.title.specificity <= candidate.title.specificity) continue;
      const parentPhrase = candidate.title.phrases.find((phrase) => sibling.title.phrases.some((other) => other.startsWith(`${phrase} `)));
      if (parentPhrase) candidate.conflicts.push({ code: 'DERIVATIVE_TERM_CONFLICT', matchedTerm: parentPhrase, moreSpecificCandidateId: sibling.record.canonicalDerivativeId });
    }
    const blockingConflict = (candidate) => candidate.conflicts.some((conflict) => /^(MATERIAL_|DERIVATIVE_TERM_CONFLICT$)/.test(conflict.code));
    const rejected = matched.filter(blockingConflict);
    const viable = matched.filter((candidate) => !blockingConflict(candidate));
    if (!viable.length) {
      const familyMatches = families.filter((record) => tokenPhraseIn(title, meaningfulPhrase(record.modelFamily)));
      return {
        status: familyMatches.length === 1 && !matched.length ? 'family-only' : 'unknown',
        canonicalDerivativeId: null,
        familyId: familyMatches.length === 1 && !matched.length ? familyMatches[0].canonicalDerivativeId : null,
        candidateDerivativeIds: [], confidence: 'none', evidence: { ...facts, rejectedCandidateIds: rejected.map((candidate) => candidate.record.canonicalDerivativeId) },
        reasonCodes: matched.length ? ['ALL_DERIVATIVE_CANDIDATES_CONFLICT'] : ['NO_SAFE_CATALOGUE_FAMILY'],
        conflicts: rejected.flatMap((candidate) => candidate.conflicts.map((conflict) => ({ candidateDerivativeId: candidate.record.canonicalDerivativeId, ...conflict }))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      };
    }

    const rank = (candidate) => [candidate.title.specificity, Number(facts.cc != null && candidate.ccValues.some((value) => Math.abs(value - facts.cc) <= (candidate.record.resolver?.materialCcTolerance ?? 10))), Number(facts.kw != null && candidate.kwValues.some((value) => Math.abs(value - facts.kw) <= (candidate.record.resolver?.materialPowerKwTolerance ?? 5)))];
    const compareRank = (a, b) => {
      for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
      return 0;
    };
    const highest = viable.reduce((best, candidate) => compareRank(rank(candidate), rank(best)) > 0 ? candidate : best);
    const winningRank = rank(highest).join('|');
    const winners = viable.filter((candidate) => rank(candidate).join('|') === winningRank);
    const sharedEvidence = {
      ...facts,
      titlePhrases: [...new Set(winners.flatMap((candidate) => candidate.title.phrases))].sort(),
      catalogueCc: [...new Set(winners.flatMap((candidate) => candidate.ccValues))].sort((a, b) => a - b),
      cataloguePowerKw: [...new Set(winners.flatMap((candidate) => candidate.kwValues))].sort((a, b) => a - b),
      registrationYearEvidence: winners.map((candidate) => candidate.year).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    };
    if (winners.length > 1) return { status: 'ambiguous', canonicalDerivativeId: null, familyId: null, candidateDerivativeIds: winners.map((candidate) => candidate.record.canonicalDerivativeId).sort(), confidence: 'low', evidence: sharedEvidence, reasonCodes: ['MULTIPLE_EQUIVALENT_DERIVATIVE_CANDIDATES'], conflicts: winners.flatMap((candidate) => candidate.conflicts.map((conflict) => ({ candidateDerivativeId: candidate.record.canonicalDerivativeId, ...conflict }))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };

    const winner = winners[0];
    return {
      status: 'exact', canonicalDerivativeId: winner.record.canonicalDerivativeId, familyId: null, candidateDerivativeIds: [], confidence: confidenceFor(winner, facts), evidence: sharedEvidence,
      reasonCodes: ['COMPLETE_MODEL_TOKEN_MATCH', ...(facts.cc != null ? ['ADVERTISED_CC_SUPPORT'] : ['MISSING_ADVERTISED_CC']), ...(facts.kw != null ? ['ADVERTISED_POWER_SUPPORT'] : ['MISSING_ADVERTISED_POWER']), ...(facts.registrationYear != null ? ['REGISTRATION_YEAR_SUPPORTING_EVIDENCE'] : ['MISSING_REGISTRATION_YEAR'])],
      conflicts: winner.conflicts,
    };
  };
}
