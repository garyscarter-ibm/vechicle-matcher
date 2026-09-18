import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createMotorradEquipmentEnricher } from '../server/motorrad-equipment-service.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(readFileSync(join(ROOT, 'server/test/fixtures/motorrad-equipment-responses.json'), 'utf8'));
const ids = fixtures.map((_, index) => `sanitised-${index + 1}`);
const response = new Map(ids.map((id, index) => [id, fixtures[index]]));
const service = createMotorradEquipmentEnricher({ transport: async (offer) => response.get(String(offer.id)), now: () => 1000 });
const offers = ids.map((id) => ({ id, motorradDetailPage: 1, motorradDetailRowNumber: 1 }));
const first = await service.enrich(offers);
await service.enrich(offers); // exercise the positive cache without retaining payloads
const result = { generatedAt: '2026-09-16', scope: 'Sanitised fixture simulation, not a live smoke audit.', requestedOffers: offers.length, returnedCardsWithAdvertisedFeatures: [...first.values()].filter((item) => item.advertisedFeatures.length).length, returnedCardsWithoutAdvertisedFeatures: [...first.values()].filter((item) => !item.advertisedFeatures.length).length, featureIds: [...new Set([...first.values()].flatMap((item) => item.advertisedFeatures.map((feature) => feature.id)))].sort(), cache: service.stats, config: { maxOffers: service.config.maxOffers, concurrency: service.config.concurrency, requestTimeoutMs: service.config.requestTimeoutMs, totalTimeoutMs: service.config.totalTimeoutMs } };
writeFileSync(join(ROOT, 'docs/motorrad-equipment-enrichment-behaviour.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
