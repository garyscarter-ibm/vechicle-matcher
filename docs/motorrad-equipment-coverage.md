# Motorrad equipment-data coverage

Derivative-stratified live sample from 10 requested result pages; percentages are sample percentages, not complete-pool percentages.

| Measure | Value |
|---|---:|
| Live offers discovered | 200 |
| Offers sampled/audited | 50 |
| Successful detail requests | 50 |
| Failed detail requests | 0 |
| Non-empty equipment extracts | 50 |
| Available canonical derivatives | 44 |
| Distinct raw equipment phrases | 52 |
| Confident advertised mappings | 11 |
| Package-only phrases | 0 |
| Uncertain/unmapped phrases | 41 |

## Source-field availability

- ausstattungsText: 50
- merkmaleText: 44
- basisDaten: 50

## Feature occurrences

- abs: 29
- alarm: 25
- centre-stand: 35
- comfort-package: 12
- cruise-control: 42
- dynamic-package: 4
- electronic-suspension: 31
- heated-grips: 38
- heated-seat: 36
- keyless-ride: 41
- panniers: 8
- riding-modes: 3
- top-box: 13
- traction-control: 16
- tyre-pressure-monitoring: 1

## Product-use assessment

- Display/refinement candidates (structured advertised observations): abs, alarm, centre-stand, cruise-control, electronic-suspension, heated-grips, heated-seat, keyless-ride, panniers, top-box, traction-control.
- Soft scoring: none pending broader live-pool coverage, phrase stability review and explicit product approval.
- Neither: package-only, narrative-only, uncertain and candidate-unobserved vocabulary entries.

## Derivative/year sample coverage

| Canonical derivative | Sampled | Successful | Non-empty | Registration years |
|---|---:|---:|---:|---|
| bmw-motorrad:c-400-gt | 1 | 1 | 1 | 2026 |
| bmw-motorrad:c-400-x | 1 | 1 | 1 | 2026 |
| bmw-motorrad:ce-04 | 1 | 1 | 1 | 2023 |
| bmw-motorrad:f-450-gs | 1 | 1 | 1 | 2026 |
| bmw-motorrad:f-800-gs-895cc | 1 | 1 | 1 | 2025 |
| bmw-motorrad:f-850-gs | 1 | 1 | 1 | 2019 |
| bmw-motorrad:f-900-gs | 1 | 1 | 1 | 2024 |
| bmw-motorrad:f-900-gs-adventure | 1 | 1 | 1 | 2026 |
| bmw-motorrad:f-900-r | 1 | 1 | 1 | 2022 |
| bmw-motorrad:f-900-r-a2-70-kw | 1 | 1 | 1 | 2021 |
| bmw-motorrad:f-900-xr | 1 | 1 | 1 | 2023 |
| bmw-motorrad:g-310-gs | 1 | 1 | 1 | 2021 |
| bmw-motorrad:g-310-r | 1 | 1 | 1 | 2024 |
| bmw-motorrad:k-1600-b | 1 | 1 | 1 | 2019 |
| bmw-motorrad:k-1600-grand-america | 1 | 1 | 1 | 2019 |
| bmw-motorrad:k-1600-gt | 1 | 1 | 1 | 2017 |
| bmw-motorrad:m-1000-r | 1 | 1 | 1 | 2023 |
| bmw-motorrad:m-1000-rr | 1 | 1 | 1 | 2022 |
| bmw-motorrad:m-1000-xr | 1 | 1 | 1 | 2024 |
| bmw-motorrad:r-12 | 1 | 1 | 1 | 2026 |
| bmw-motorrad:r-12-ninet | 1 | 1 | 1 | 2024 |
| bmw-motorrad:r-1200-gs | 1 | 1 | 1 | 2018 |
| bmw-motorrad:r-1200-gs-adventure | 1 | 1 | 1 | 2017 |
| bmw-motorrad:r-1200-r | 1 | 1 | 1 | 2018 |
| bmw-motorrad:r-1200-rs | 1 | 1 | 1 | 2018 |
| bmw-motorrad:r-1200-rt | 1 | 1 | 1 | 2018 |
| bmw-motorrad:r-1250-gs | 2 | 2 | 2 | 2019, 2022 |
| bmw-motorrad:r-1250-gs-adventure | 2 | 2 | 2 | 2019, 2024 |
| bmw-motorrad:r-1250-r | 1 | 1 | 1 | 2021 |
| bmw-motorrad:r-1250-rs | 1 | 1 | 1 | 2023 |
| bmw-motorrad:r-1250-rt | 1 | 1 | 1 | 2019 |
| bmw-motorrad:r-1300-gs | 2 | 2 | 2 | 2023, 2026 |
| bmw-motorrad:r-1300-gs-adventure | 2 | 2 | 2 | 2024, 2026 |
| bmw-motorrad:r-1300-r | 1 | 1 | 1 | 2025 |
| bmw-motorrad:r-1300-rs | 1 | 1 | 1 | 2025 |
| bmw-motorrad:r-1300-rt | 1 | 1 | 1 | 2025 |
| bmw-motorrad:r-18-b | 1 | 1 | 1 | 2023 |
| bmw-motorrad:r-18-transcontinental | 1 | 1 | 1 | 2025 |
| bmw-motorrad:r-ninet | 1 | 1 | 1 | 2023 |
| bmw-motorrad:r-ninet-pure | 1 | 1 | 1 | 2022 |
| bmw-motorrad:r-ninet-urban-g-s | 1 | 1 | 1 | 2022 |
| bmw-motorrad:s-1000-r | 2 | 2 | 2 | 2019, 2026 |
| bmw-motorrad:s-1000-rr | 1 | 1 | 1 | 2021 |
| bmw-motorrad:s-1000-xr | 2 | 2 | 2 | 2018, 2025 |

## Operational recommendation

Public detail enrichment is suitable for a bounded, cached post-ranking display/refinement trial only when the live audit's detail success rate and phrase stability remain high. It is not suitable for first-stage hard filtering: absence means `absent-from-data`, not absent from the bike. Only structured `ausstattungsText` phrases mapped with high confidence are candidates for later display/refinement. Package labels remain `package-mentioned` and do not expand into features.
