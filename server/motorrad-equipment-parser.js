/** Review-only parser for the BMW Motorrad public detail response. Nothing in
 * production mapping/scoring imports this module during Phase 7A. */

const DISPLAY_ELIGIBLE_IDS = new Set(['heated-grips', 'heated-seat', 'panniers', 'top-box', 'electronic-suspension', 'cruise-control', 'abs', 'traction-control', 'centre-stand', 'keyless-ride', 'alarm']);
export const MOTORRAD_FEATURE_VOCABULARY = Object.freeze([
  ['heated-grips', 'Heated grips', 'comfort', ['heated grips', 'heated handlebar grips'], [], 'phrase', 'high', false, false, 'observed'],
  ['heated-seat', 'Heated seat', 'comfort', ['heated seat', 'seat heating'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['panniers', 'Panniers', 'luggage', ['panniers', 'side cases', 'side case'], ['pannier preparation'], 'phrase', 'high', true, false, 'candidate-unobserved'],
  ['top-box', 'Top box', 'luggage', ['top box', 'topcase'], ['top box preparation'], 'phrase', 'high', true, false, 'observed'],
  ['luggage-rack', 'Luggage rack', 'luggage', ['luggage rack', 'carrier rack'], [], 'phrase', 'high', true, false, 'candidate-unobserved'],
  ['electronic-suspension', 'Electronic suspension / ESA', 'chassis', ['dynamic esa', 'esa', 'electronic suspension'], [], 'longest-phrase', 'high', false, false, 'observed'],
  ['cruise-control', 'Cruise control', 'rider-aid', ['cruise control'], ['adaptive cruise control'], 'phrase', 'high', false, false, 'observed'],
  ['adaptive-cruise-control', 'Adaptive cruise control', 'rider-aid', ['adaptive cruise control', 'acc'], [], 'longest-phrase', 'high', false, false, 'candidate-unobserved'],
  ['quickshifter', 'Gear Shift Assist Pro', 'drivetrain', ['gear shift assist pro', 'quickshifter', 'shift assist pro'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['riding-modes', 'Riding modes', 'rider-aid', ['riding modes', 'riding mode pro'], [], 'phrase', 'medium', false, false, 'candidate-unobserved'],
  ['abs-pro', 'ABS Pro', 'rider-aid', ['abs pro'], [], 'longest-phrase', 'high', false, false, 'candidate-unobserved'],
  ['abs', 'ABS', 'rider-aid', ['abs'], ['abs pro'], 'phrase', 'high', false, false, 'observed'],
  ['traction-control', 'Dynamic Traction Control', 'rider-aid', ['dtc', 'dynamic traction control', 'traction control'], [], 'phrase', 'high', false, false, 'observed'],
  ['tyre-pressure-monitoring', 'Tyre-pressure monitoring', 'rider-aid', ['rdc', 'tyre pressure monitoring', 'tire pressure monitoring'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['navigation-preparation', 'Navigation preparation', 'connectivity', ['navigation preparation', 'nav preparation', 'gps preparation'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['centre-stand', 'Centre stand', 'touring', ['centre stand', 'center stand', 'main stand'], [], 'phrase', 'high', false, false, 'observed'],
  ['keyless-ride', 'Keyless Ride', 'convenience', ['keyless ride', 'keyless'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['alarm', 'Alarm system', 'security', ['alarm system', 'alarm'], [], 'phrase', 'medium', false, false, 'candidate-unobserved'],
  ['led-lighting', 'LED lighting', 'lighting', ['adaptive led headlight', 'led headlight', 'led lighting'], [], 'longest-phrase', 'high', false, false, 'candidate-unobserved'],
  ['comfort-package', 'Comfort package', 'package', ['comfort package'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['touring-package', 'Touring package', 'package', ['touring package'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['dynamic-package', 'Dynamic package', 'package', ['dynamic package'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
  ['premium-package', 'Premium package', 'package', ['premium package'], [], 'phrase', 'high', false, false, 'candidate-unobserved'],
].map(([id, displayLabel, category, acceptedAliases, rejectedAliases, matchingMethod, confidenceRequired, negationMustBeDetected, packageCanImplyFeature, observationStatus]) => Object.freeze({ id, displayLabel, category, acceptedAliases, rejectedAliases, matchingMethod, confidenceRequired, negationMustBeDetected, packageCanImplyFeature, packageImplication: packageCanImplyFeature ? 'requires derivative/year-specific official proof' : 'never expands package label', observationStatus, displayEligible: DISPLAY_ELIGIBLE_IDS.has(id) })));

export function normaliseMotorradEquipment(value = '') {
  return String(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const negated = (text) => /\b(?:no|without|not|excluding|delete(?:d)?)\b/i.test(text);
const restricted = (text) => /\b(?:vin|fgst|chassis|registration|kennzeichen|telephone|phone|email|dealer)\b|@|\+?\d[\d ()-]{7,}\d/i.test(String(text));
const aliases = MOTORRAD_FEATURE_VOCABULARY.flatMap((feature) => feature.acceptedAliases.map((alias) => ({ feature, alias: normaliseMotorradEquipment(alias) }))).sort((a, b) => b.alias.length - a.alias.length || a.feature.id.localeCompare(b.feature.id));

function featureFor(normalised) {
  for (const { feature, alias } of aliases) {
    if (!(` ${normalised} `.includes(` ${alias} `))) continue;
    if (feature.rejectedAliases.some((rejected) => (` ${normalised} `).includes(` ${normaliseMotorradEquipment(rejected)} `))) continue;
    return feature;
  }
  return null;
}

function phrases(value) {
  return String(value || '').split(/[\n,;|]+/).map((text) => text.trim()).filter(Boolean);
}

function classifyPhrase(rawWording, sourceField) {
  if (restricted(rawWording)) return { rawWording: '[redacted restricted phrase]', normalisedWording: 'redacted restricted phrase', sourceField, proposedFeatureId: null, confidence: 'high', classification: 'noise', evidenceState: 'uncertain', individualAdvert: false, reviewNotes: 'Restricted identifier/contact wording is excluded from audit data.' };
  const normalisedWording = normaliseMotorradEquipment(rawWording);
  const feature = featureFor(normalisedWording);
  const isNegated = negated(rawWording);
  const packageLike = /\bpackage\b/i.test(rawWording);
  const state = sourceField === 'ausstattungsText' ? 'advertised' : sourceField === 'packagesText' ? 'package-mentioned' : sourceField === 'basisDaten' ? 'model-general' : 'uncertain';
  if (isNegated) return { rawWording, normalisedWording, sourceField, proposedFeatureId: null, confidence: 'high', classification: 'noise', evidenceState: 'uncertain', individualAdvert: false, reviewNotes: 'Negated wording is never emitted as a positive feature.' };
  if (feature) return { rawWording, normalisedWording, sourceField, proposedFeatureId: feature.id, confidence: sourceField === 'ausstattungsText' ? 'high' : sourceField === 'packagesText' ? 'medium' : 'low', classification: feature.category === 'package' ? 'package' : 'feature', evidenceState: state, individualAdvert: sourceField === 'ausstattungsText', reviewNotes: feature.category === 'package' ? 'Package label is retained only; it does not expand to component features.' : state === 'advertised' ? 'Structured individual advert equipment text.' : 'Unstructured/general wording; do not treat as independently fitted equipment.' };
  return { rawWording, normalisedWording, sourceField, proposedFeatureId: null, confidence: packageLike ? 'medium' : 'low', classification: packageLike ? 'package' : normalisedWording.length < 3 ? 'noise' : 'descriptive-text', evidenceState: sourceField === 'packagesText' ? 'package-mentioned' : state, individualAdvert: false, reviewNotes: packageLike ? 'Unmapped package; no feature implication.' : 'Not in the controlled feature vocabulary.' };
}

/** Return only sanitised phrases, never the complete dealer/free-text payload. */
export function parseMotorradEquipmentResponse(response = {}) {
  const extracted = [];
  for (const field of ['ausstattungsText', 'packagesText']) for (const phrase of phrases(response[field])) extracted.push(classifyPhrase(phrase, field));
  // merkmaleText is dealer-authored free text and can contain contact details.
  // Persist only a matched controlled alias, never a sentence or its unknown text.
  const narrative = normaliseMotorradEquipment(response.merkmaleText);
  const narrativeFeatures = new Set();
  for (const { feature, alias } of aliases) if (!narrativeFeatures.has(feature.id) && (` ${narrative} `).includes(` ${alias} `)) { extracted.push(classifyPhrase(alias, 'merkmaleText')); narrativeFeatures.add(feature.id); }
  const basis = response.basisDaten;
  if (basis && typeof basis === 'object' && !Array.isArray(basis)) for (const [label, value] of Object.entries(basis)) extracted.push(classifyPhrase(`${label}: ${value}`, 'basisDaten'));
  if (typeof basis === 'string') {
    const rows = [...basis.matchAll(/detailBasicData[^>]*>\s*([^<]+)(?:<[^>]*>\s*)*<label[^>]*>\s*([^<]+)/gi)];
    for (const [, label, value] of rows) extracted.push(classifyPhrase(`${label}: ${value}`, 'basisDaten'));
  }
  return extracted.sort((a, b) => a.sourceField.localeCompare(b.sourceField) || a.normalisedWording.localeCompare(b.normalisedWording));
}
