# Motorrad advertised-equipment enrichment

## Architecture

`/api/match` keeps its existing order: fetch stock, apply answers, rank, then select the returned Motorrad match cards. Only those selected cards are offered to the equipment service. The service uses the public approved-used landing/session and `Detail/GetDetailDataByRowNumber` journey, parses the response immediately, and retains only sanitised advertised feature badges.

Equipment is never supplied to the scoring engine, licence screen, hard filters, stock collector, or questionnaire.

## Defaults and rollback

| Setting | Default | Bounds |
|---|---:|---:|
| `MOTORRAD_EQUIPMENT_ENRICHMENT` | enabled | `0/false/off/no` disables |
| `MOTORRAD_EQUIPMENT_MAX_OFFERS` | 3 | 1–6 |
| `MOTORRAD_EQUIPMENT_CONCURRENCY` | 2 | 1–3 |
| `MOTORRAD_EQUIPMENT_REQUEST_TIMEOUT_MS` | 2,500ms | 250–10,000ms |
| `MOTORRAD_EQUIPMENT_TOTAL_TIMEOUT_MS` | 5,000ms | 500–15,000ms |
| positive cache TTL | 10 minutes | 1s–1h |
| negative cache TTL | 1 minute | 1s–5m |

Set `MOTORRAD_EQUIPMENT_ENRICHMENT=off` to roll back to normal cards. Invalid numeric values use bounded defaults. Failed, timed-out, disabled, or context-less detail lookups return the ranked cards unchanged.

## API and privacy

Only successful approved claims can add this public field:

```json
{"advertisedFeatures":[{"id":"heated-grips","label":"Heated grips","category":"comfort"}]}
```

The cache contains only offer ID, sanitised feature IDs/labels/categories, safe status, timestamp, and non-sensitive reason codes. It never stores raw responses, equipment prose, BMW sessions, VINs, registrations, dealer/contact data, or detail URLs. Internal enrichment status and diagnostics are not sent to the browser.

## Display rules

The Motorrad card shows an accessible **Advertised equipment** badge group only when a high-confidence, structured `ausstattungsText` phrase maps to a display-eligible controlled-vocabulary feature. It adds “Confirm specification with the retailer”. No result is shown for no data, failure, package-only, negated, general-model, or uncertain wording; that silence is not a claim of absence.

Enabled display IDs: `abs`, `alarm`, `centre-stand`, `cruise-control`, `electronic-suspension`, `heated-grips`, `heated-seat`, `keyless-ride`, `panniers`, `top-box`, `traction-control`.

Package labels never expand to component features. Optional panniers/top boxes remain individual advert claims and are not model-standard luggage data.

## Evidence and operational result

The bounded live audit sampled 50 successful public detail responses across 44 canonical derivatives from 200 discovered offers. See [equipment coverage](motorrad-equipment-coverage.md) for the explicit sample scope and phrase counts. The service is suitable for bounded post-ranking display/refinement experimentation, but not scoring or hard filtering: absence remains `absent-from-data`.

Focused tests cover selection bounds, concurrency, cache hits/misses, negative caching, in-flight deduplication, TTL expiry, request/total timeout handling, disabled rollback, partial failure, sanitisation, package/negation handling, API-safe data, and accessible cards. The full suite passes with 281 tests.

## Next stage

Before any refinement control, repeat the live audit over a broader current pool, measure phrase stability by derivative/model year, and verify card-level cache latency. Do not introduce feature-based score boosts or absence-based filters without that separate review.
