import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fixtureSample, liveSample } from './audit-motorrad-equipment.mjs';
import { BMW_MOTORRAD_SEGMENT_TRANSLATION, translateBmwMotorradSegment } from '../server/motorrad-segments.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = new Set(['bmw-motorrad:f-900-xr', 'bmw-motorrad:s-1000-xr', 'bmw-motorrad:s-1000-rr']);

export function buildMotorradSegmentAudit(sample) {
  const verified = sample.results.filter((result) => result.ok && result.identity?.ok && result.identity.segment);
  const bySegment = new Map();
  for (const result of verified) {
    const exactLabel = result.identity.segment;
    const bucket = bySegment.get(exactLabel) || { exactLabel, translatedCategory: translateBmwMotorradSegment(exactLabel), verifiedOffers: 0, representatives: [] };
    bucket.verifiedOffers += 1;
    if (!bucket.representatives.some((item) => item.canonicalDerivativeId === result.row.mapped.canonicalDerivativeId)) {
      bucket.representatives.push({ offerId: String(result.row.id), listingTitle: result.row.title, canonicalDerivativeId: result.row.mapped.canonicalDerivativeId, detailPage: result.row.motorradDetailPage, detailRowNumber: result.row.motorradDetailRowNumber });
    }
    bySegment.set(exactLabel, bucket);
  }
  const required = [...REQUIRED].map((canonicalDerivativeId) => {
    const result = verified.find((item) => item.row.mapped.canonicalDerivativeId === canonicalDerivativeId);
    return result ? { canonicalDerivativeId, offerId: String(result.row.id), listingTitle: result.row.title, exactSegment: result.identity.segment, translatedCategory: translateBmwMotorradSegment(result.identity.segment), detailPage: result.row.motorradDetailPage, detailRowNumber: result.row.motorradDetailRowNumber } : { canonicalDerivativeId, status: 'NOT_IN_VERIFIED_SAMPLE' };
  });
  return {
    generatedAt: '2026-09-17',
    mode: sample.mode,
    offersDiscovered: sample.liveOffersDiscovered,
    offersRequested: sample.results.length,
    verifiedDetails: verified.length,
    detailIdentityMismatches: sample.results.filter((result) => result.identity?.reasonCodes?.includes('DETAIL_IDENTITY_MISMATCH')).length,
    requiredModels: required,
    segments: [...bySegment.values()].map((segment) => ({ ...segment, representatives: segment.representatives.sort((a, b) => a.canonicalDerivativeId.localeCompare(b.canonicalDerivativeId)) })).sort((a, b) => a.exactLabel.localeCompare(b.exactLabel)),
    translation: BMW_MOTORRAD_SEGMENT_TRANSLATION,
  };
}

export function renderMotorradSegmentReport(audit) {
  const required = audit.requiredModels.map((item) => `| ${item.canonicalDerivativeId} | ${item.status || item.offerId} | ${item.exactSegment || 'not verified'} | ${item.translatedCategory || 'not mapped'} |`).join('\n');
  const segments = audit.segments.map((item) => `| ${item.exactLabel} | ${item.translatedCategory || 'UNMAPPED'} | ${item.verifiedOffers} | ${item.representatives.slice(0, 3).map((rep) => `${rep.canonicalDerivativeId} (${rep.offerId}; p${rep.detailPage}/r${rep.detailRowNumber})`).join('; ')} |`).join('\n');
  const translation = Object.entries(audit.translation).map(([label, category]) => `| ${label} | ${category} |`).join('\n');
  return `# BMW Motorrad segment verification\n\nGenerated: ${audit.generatedAt}. Every accepted detail response matched both its requested \`angebotsNr\` and a compatible \`markeModell\`; failures are rejected as \`DETAIL_IDENTITY_MISMATCH\`. Segment is extracted directly from \`basisDaten.Segment\`, independently of equipment parsing.\n\n| Measure | Value |\n|---|---:|\n| Offers discovered | ${audit.offersDiscovered ?? 'fixture mode'} |\n| Detail responses requested | ${audit.offersRequested} |\n| Verified detail responses | ${audit.verifiedDetails} |\n| Identity mismatches rejected | ${audit.detailIdentityMismatches} |\n\n## Required Sport models\n\n| Canonical derivative | Verified offer | BMW exact Segment | Central translation |\n|---|---|---|---|\n${required}\n\n## Representatives of every verified BMW Segment\n\n| BMW exact Segment | Central translation | Verified offers | Representative derivatives (offer; page/row) |\n|---|---|---:|---|\n${segments || '| none | n/a | 0 | n/a |'}\n\n## Central segment translation\n\n| BMW exact Segment | Matcher category |\n|---|---|\n${translation}\n\nThis table is deliberately label-based, not model-based. An unrecognised BMW label is reported as UNMAPPED and does not acquire a fallback affinity.\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sample = process.argv.includes('--fixtures') ? fixtureSample() : await liveSample();
  const audit = buildMotorradSegmentAudit(sample);
  writeFileSync(join(ROOT, 'docs/motorrad-segment-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(join(ROOT, 'docs/motorrad-segment-report.md'), renderMotorradSegmentReport(audit));
  console.log(renderMotorradSegmentReport(audit));
}
