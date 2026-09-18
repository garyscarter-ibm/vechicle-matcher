# Motorrad production resolver cutover

Review date: 2026-09-16.

## Outcome

The generated catalogue resolver is now the production identity layer for BMW Motorrad. `mapMotorradRaw()` resolves the listing title, first-registration evidence, advertised cc, and advertised kW against the server runtime catalogue before selecting a compatibility scoring profile. The legacy ordered title mapper remains available as `mapMotorradRawLegacy()` for comparison and rollback only.

The production server imports [the generated runtime catalogue](../server/data/motorrad-runtime-catalogue.js), not a file under `docs/`.

| Measure | Result |
|---|---:|
| Runtime catalogue records | 107 |
| Derivative records | 60 |
| Resolver-eligible exact derivatives | 59 |
| Compatibility profiles used | 47 |
| Fixture offers processed | 955 |
| Fixture offers resolved exact | 955 |
| Reviewed signatures reconciled | 381 / 381 |
| Reviewed identity agreement | 955 / 955 |
| Family-only / ambiguous / unknown fixture results | 0 / 0 / 0 |
| Material cc/kW conflicts | 0 |
| Non-blocking registration-year notes | 4 |

Every resolver-eligible derivative has an explicit, valid legacy compatibility profile. This retains the current category, acceleration, economy, luggage, pillion, size, character/tag, and licence-screen calibration. HP2 Megamoto and HP2 Sport explicitly retain the previous `R 1250 R` compatibility profile; this is a temporary scoring compatibility decision, not derivative-specific recalibration.

## Behaviour comparison

All 955 fixtures were run through both `mapMotorradRawLegacy()` and the production `mapMotorradRaw()`.

- Live title, price, mileage, registration, photo, cc, kW, and link: 0 differences.
- Compatibility profile and all scoring/comparison attributes: 0 differences.
- Intentional internal additions on the production path: canonical derivative ID, resolution status, reasons, candidates, and conflicts. The API's public-field whitelist excludes all of them.
- Five representative ranking scenarios (A1, A2, Full A performance, Full A touring/practicality, and Full A heritage/manageability): 0 ordering, score, reason, trade-off, or licence-result differences.

The updated [shadow report](motorrad-resolver-shadow-report.md) continues to list legacy profile versus canonical derivative identities. The largest identity-only differences are F 800 GS 895cc (19 offers), R 1250 RS carrying the old R 1250 R profile (18), and F 850 GS Adventure carrying F 850 GS compatibility (7).

## Runtime generation and validation

`npm run build:motorrad-runtime` regenerates the reviewed catalogue and runtime artefact from the single reviewed catalogue source. `npm run check:motorrad-runtime` detects committed-artifact drift. Validation checks unique canonical IDs, source-record integrity, resolver metadata, and valid compatibility profiles.

## Future/unseen listings

An exact unseen model title can use its explicit compatibility profile while retaining its live advertised cc/kW. A family-only, ambiguous, unknown, or materially conflicting listing is not given a derivative-specific profile and is excluded from profile-based recommendation scoring. Diagnostics retain status, reason codes, candidate IDs, and conflicts internally; logging intentionally excludes title, registration, VIN, dealer, and contact data.

## Rollback

`mapMotorradRawLegacy()` remains available for audit and rollback comparison. Reverting the production call to that function restores the former first-match identity behavior without changing the stored review artefacts or the existing scoring tables. No derivative-specific scoring recalibration was performed in this phase.

## Verification

`npm test` passes with 260 tests. The focused cutover suite also verifies runtime generation/drift detection, all review signatures and fixture offers, compatibility coverage, live advertised values, safe unresolved handling, compatibility parity, rankings, non-Motorrad behavior through the full suite, and API-safe output.
