# Motorrad stock resilience

The Motorrad live path now keeps a memory-backed, optionally file-persisted last-known-good snapshot. A complete validated live capture is written atomically to `.cache/motorrad-last-known-good.json`; an unwritable volume leaves memory resilience active and never crashes matching. The snapshot contains mapped stock only, never BMW sessions, HTML, VINs, registrations, contact data or equipment detail payloads.

States are `fresh` (under 5 minutes), `stale` (served immediately while one refresh runs), `expired` (not represented as live), `partial` (diagnostic-only; never promoted), and `unavailable`. Default maximum stale age is 24 hours; no valid cache plus a live failure retains the existing controlled stock error.

`MOTORRAD_STOCK_RESILIENCE=off` restores the former memory-only collector. Defaults are conservative: fresh 5m, maximum stale 24h, repeated-failure circuit threshold 3, cooldown 60s. Invalid numeric values fall back to bounded defaults. The internal health snapshot carries state, age, source, counts, failures and circuit status; `/api/match` exposes only safe `stockFreshness { state, ageMs, source }` for Motorrad. `source` is rebuilt from the state-specific allowlist (`memory`, `persisted`, `partial`, or `unavailable`), never copied from health data.

Candidate snapshots require non-empty mapped offers with IDs, names, prices and links. Failed/corrupt persistence and failed refreshes retain a valid last-known-good snapshot. BMW session/HTTP/parser failures are classified by the existing collector and are not logged with session values or response bodies.

The existing bounded equipment enrichment remains post-ranking and non-blocking. Identical stock produces unchanged matching, scoring, licence filtering and equipment behavior.

Rollback: set `MOTORRAD_STOCK_RESILIENCE=off`; this removes durable/stale behavior but does not change resolver, scoring or equipment settings.

## Acceptance matrix

| # | Requirement | Implementation evidence | Deterministic test evidence | Status |
|---:|---|---|---|---|
| 1 | Sanitised BMW response contracts | `stock.js` contract parser; sanitised fixture | `motorrad-response-contract.test.js` | PASS |
| 2 | Complete capture becomes LKG | `createMotorradStockResilience().promote()` | `fresh, stale, persistence and failure fallback are deterministic` | PASS |
| 3 | Atomic persistence and restart recovery | `fileStore()` write-then-rename; validated `load()` | `persisted complete stock survives restart…` | PASS |
| 4 | Fresh state serves without refresh or warning | TTL state calculation; UI returns no notice | resilience restart test; `Motorrad freshness copy…` | PASS |
| 5 | Stale state serves LKG and says “Stock last refreshed…” | stale-while-revalidate; `stock-freshness.js` | single-flight test; freshness-copy test | PASS |
| 6 | Partial state is explained as incomplete | non-promoted partial snapshot; controlled UI copy | partial/expired test; freshness-copy test | PASS |
| 7 | Expired state is not called current or live | expired cannot fall back as LKG; out-of-date UI copy | partial/expired test; freshness-copy test asserts neither term | PASS |
| 8 | Unavailable state is controlled and non-technical | Motorrad 502 freshness projection; controlled UI copy | API unavailable test; freshness-copy test | PASS |
| 9 | Single-flight refresh | shared `inflight` promise | stale/single-flight/circuit test | PASS |
| 10 | Failed refresh retains valid LKG | refresh failure leaves `current` untouched | fresh/stale failure tests | PASS |
| 11 | Circuit threshold and cooldown | counters plus `openedAt` cooldown | stale/single-flight/circuit test | PASS |
| 12 | Candidate validation | IDs, duplicate rate, required fields and pagination checks | candidate-validation test | PASS |
| 13 | Count-drop quarantine and confirmation | `quarantine` confirmation before promotion | partial/quarantine test | PASS |
| 14 | Partial capture protection | `PARTIAL_CAPTURE` never promotes or persists | partial/expired test | PASS |
| 15 | Persistence failures are non-fatal | guarded load/save metrics | partial/quarantine/persistence-failure test | PASS |
| 16 | API freshness is strictly allowlisted | `publicMotorradStockFreshness()` | API allowlist and invalid-value tests | PASS |
| 17 | No internal/session/raw/VIN/registration/contact/cache data reaches browser output | explicit `publicCar`/feature allowlists; Motorrad registration omission | API privacy-boundary test; equipment-service sanitisation test | PASS |
| 18 | Optional equipment failure is non-blocking | post-ranking guarded enrichment | API equipment-failure ranking-equivalence test | PASS |
| 19 | Matching output remains unchanged | resilience is outside ranking and enrichment is post-ranking | `legacy rollback mode retains the Phase 5 representative ranking baseline` | PASS |
| 20 | Scoring results remain unchanged | no resilience input reaches `rankCars` | `production modes reproduce all twelve reviewed shadow scenarios` | PASS |
| 21 | Licence eligibility remains unchanged | no resilience input reaches licence filters | `licence eligibility uses live cc/kW…` | PASS |
| 22 | Non-Motorrad behaviour remains unchanged | freshness branch is Motorrad-only | API non-Motorrad regression test; full render matrix | PASS |
| 23 | Rollback retains memory-only collector | resilience feature flag | rollback-bypasses-persistence test | PASS |
| 24 | Focused and complete regression suites pass | package test command | commands recorded below | PASS |

Focused verification uses injected stock, stores and clocks only; it makes no BMW request and introduces no real delay. Final release check: `npm test` — **301 passing, 0 failing**.

Partial captures are not persisted or promoted. Count reductions below 50% of the prior complete count are quarantined once and promoted only after one subsequent consistent capture. The deployment needs a writable `.cache` volume for restart recovery; read-only/serverless deployments retain memory-only resilience.

## BMW response-contract fixtures

`server/test/fixtures/motorrad-response-contracts.json` is sanitised: it uses a placeholder session, synthetic offer IDs, and contains no VIN, registration, dealer or contact data. Contract tests cover valid landing/session extraction, missing session, first/later HTML-result envelopes, valid empty results, malformed JSON, missing/renamed containers, invalid rows, optional-field absence, duplicate IDs, pagination inconsistency, later-page transport failure and truncated capture metadata.

Failure classes are explicit: landing transport, `SESSION_EXTRACTION`, `JSON_ENVELOPE_INVALID`, `RESULTS_CONTAINER_MISSING`/`RESULTS_CONTAINER_INVALID`, and `LISTING_ROW_INVALID`. A missing required result container now throws a contract error rather than becoming an apparently valid zero-stock response. Empty *present* result tables remain valid.
