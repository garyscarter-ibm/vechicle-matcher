import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { brandTuning } from '../server/brands.js';
import { mapMotorradRawWithScoringMode } from '../server/mapping.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawFor = (bike) => ({ id: bike.id, title: bike.name, price: bike.priceMin, cc: bike.cc, powerKw: bike.power, year: bike.year, firstReg: bike.firstReg, fuel: bike.fuel, mileage: bike.mileage });
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round((sorted.length - 1) * p)];
};

export function buildMotorradPerformanceCurveAudit(bikes) {
  const cars = bikes.map(rawFor).map((raw) => mapMotorradRawWithScoringMode(raw, 'catalogue')).filter(Boolean);
  const ratios = cars.filter((car) => Number.isFinite(car.advertisedPowerKw) && Number.isFinite(car.kerbMassKg) && car.kerbMassKg > 0).map((car) => car.advertisedPowerKw / car.kerbMassKg);
  const powers = cars.filter((car) => Number.isFinite(car.advertisedPowerKw)).map((car) => car.advertisedPowerKw);
  const curve = brandTuning('motorrad').performance;
  return {
    generatedAt: '2026-09-17', fixtureOffers: cars.length,
    sourcedMassOffers: ratios.length,
    advertisedPowerOnlyOffers: powers.length - ratios.length,
    missingAdvertisedPowerOffers: cars.length - powers.length,
    distribution: {
      powerToWeightKwPerKg: { p10: percentile(ratios, 0.10), p50: percentile(ratios, 0.50), p95: percentile(ratios, 0.95) },
      advertisedPowerKw: { p10: percentile(powers, 0.10), p50: percentile(powers, 0.50), p95: percentile(powers, 0.95) },
    },
    frozenCurve: {
      strategy: curve.strategy,
      powerToWeightKwPerKg: curve.powerToWeight,
      advertisedPowerKwFallback: curve.advertisedPowerKw,
      shape: 'linear, increasing, clamped to 0..1',
    },
  };
}

export function renderMotorradPerformanceCurveReport(audit) {
  const r = audit.distribution.powerToWeightKwPerKg; const p = audit.distribution.advertisedPowerKw;
  return `# Motorrad performance curve\n\nCaptured-offer distribution, frozen 2026-09-17. This is a brand-level curve, not a model affinity table.\n\n| Measure | Value |\n|---|---:|\n| Captured offers | ${audit.fixtureOffers} |\n| Offers with advertised kW and sourced canonical mass | ${audit.sourcedMassOffers} |\n| Advertised-kW fallback offers | ${audit.advertisedPowerOnlyOffers} |\n| Offers with neither | ${audit.missingAdvertisedPowerOffers} |\n\n| Signal | P10 | P50 | P95 | Frozen linear anchors |\n|---|---:|---:|---:|---|\n| kW/kg | ${r.p10.toFixed(3)} | ${r.p50.toFixed(3)} | ${r.p95.toFixed(3)} | ${audit.frozenCurve.powerToWeightKwPerKg.low} → ${audit.frozenCurve.powerToWeightKwPerKg.high} |\n| Advertised kW | ${p.p10} | ${p.p50} | ${p.p95} | ${audit.frozenCurve.advertisedPowerKwFallback.low} → ${audit.frozenCurve.advertisedPowerKwFallback.high} |\n\nThe primary score is \`clamp((advertised kW / sourced kerb kg - low) / (high - low))\`. If sourced mass is unavailable, the same clamped linear form uses advertised kW and the fallback anchors. If advertised kW is unavailable, the scorer returns neutral 0.5. Catalogue factory kW is never used as a substitute.\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bikes = JSON.parse(readFileSync(join(ROOT, 'fixtures/motorrad-bikes.json'), 'utf8'));
  const audit = buildMotorradPerformanceCurveAudit(bikes);
  writeFileSync(join(ROOT, 'docs/motorrad-performance-curve.json'), `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs/motorrad-performance-curve.md'), renderMotorradPerformanceCurveReport(audit));
  console.log(renderMotorradPerformanceCurveReport(audit));
}
