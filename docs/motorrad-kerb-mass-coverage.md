# BMW Motorrad kerb-mass coverage review

This is a review artifact only. It is not read by the matcher. The detailed, source-per-profile
records are in `motorrad-kerb-mass-review.json`; every cited BMW page was accessed on 2026-09-15.

## Stock inventory

`fixtures/motorrad-bikes.json` contains 955 captured offers across 47 current `motorradLine()`
recognition rules. The years below are registration years in the capture, not verified model years.

- **768 offers / 34 rules** — a named BMW model has a current official technical-data page with a
  road-ready mass. These are model-level sources, not an assertion that every historic registration
  or option variant has the same mass.
- **73 offers / 5 rules** — the current rule still combines BMW models with different
  official masses. No mass is safe to apply until the rule is split.
- **114 offers / 8 rules** — no safe exact source was located in the current BMW UK technical-page
  archive. These remain `unknown`; no related-model mass is used.

All sourced values use BMW's exact measurement label: **“Unladen weight, road ready, fully fuelled.”**
The accompanying factory power is BMW's **“Rated output”** on the same page.

## Hybrid licence-screen coverage

Replaying the capture through the corrected mapper and the live advertised-spec screen gives the
following coverage. Power-to-weight is calculated from the unrounded advertised kW / sourced kg.

| Licence screen | Pass advertised cc/kW | `checked-pass` ratio | `checked-fail` ratio | `not-available` ratio |
|---|---:|---:|---:|---:|
| A1 | 0 | 0 | 0 | 0 |
| A2 | 69 | 53 | 0 | 16 |

The 16 A2 power-only fallbacks are 12 G 310 GS and four G 310 R offers. Across the full capture,
768 offers resolve to a sourced mass and 187 do not. Full A does not run either licence screen.

## Named-model source coverage

| Current rule | Offers | Registration years | BMW model source | Factory kW | kg | Confidence |
|---|---:|---|---|---:|---:|---|
| C 400 GT | 7 | 2024–26 | [C 400 GT](https://www.bmw-motorrad.co.uk/en/models/urban_mobility/c400gt/technicaldata.html) | 25 | 219 | Medium |
| C 400 X | 18 | 2024–26 | [C 400 X](https://www.bmw-motorrad.co.uk/en/models/urban_mobility/c400x/technicaldata.html) | 25 | 206 | Medium |
| CE 02 | 14 | 2024–26 | [CE 02](https://www.bmw-motorrad.co.uk/en/models/urban_mobility/ce02/technicaldata.html) | 6 rated, 11 max | 132 | Medium |
| CE 04 | 10 | 2022–26 | [CE 04](https://www.bmw-motorrad.co.uk/en/models/urban_mobility/ce04/technicaldata.html) | 15 | 231 | Medium |
| F 450 GS | 4 | 2026 | [F 450 GS](https://www.bmw-motorrad.co.uk/en/models/adventure/f450gs/technicaldata.html) | 35 | 178 | Medium; sourced cc/output/mass/economy, conservative performance/luggage estimates |
| F 900 GS | 25 | 2024–26 | [F 900 GS](https://www.bmw-motorrad.co.uk/en/models/adventure/f900gs/technicaldata.html) | 77 | 219 | Medium |
| F 900 GS Adventure | 16 | 2024–26 | [F 900 GS Adventure](https://www.bmw-motorrad.co.uk/en/models/adventure/f900gs-adventure/technicaldata.html) | 77 | 246 | Medium |
| F 900 R | 46 | 2022–26 | [F 900 R](https://www.bmw-motorrad.co.uk/en/models/roadster/f900r/technicaldata.html) | 77; A2 70 | 208 | Medium; the page distinguishes output variants |
| F 900 XR | 35 | 2022–26 | [F 900 XR](https://www.bmw-motorrad.co.uk/en/models/sport/f900xr/technicaldata.html) | 77; A2 70 | 216 | Medium |
| K 1600 B | 9 | 2018–26 | [K 1600 B](https://www.bmw-motorrad.co.uk/en/models/tour/k1600b/technicaldata.html) | 118 | 344 | Medium |
| K 1600 Grand America | 2 | 2019–25 | [Grand America](https://www.bmw-motorrad.co.uk/en/models/tour/k1600-grand-america/technicaldata.html) | 118 | 367 | Medium |
| K 1600 GT | 34 | 2017–26 | [K 1600 GT](https://www.bmw-motorrad.co.uk/en/models/tour/k1600gt/technicaldata.html) | 118 | 343 | Medium |
| K 1600 GTL | 13 | 2020–26 | [K 1600 GTL](https://www.bmw-motorrad.co.uk/en/models/tour/k1600gtl/technicaldata.html) | 118 | 358 | Medium |
| M 1000 R | 21 | 2023–26 | [M 1000 R](https://www.bmw-motorrad.co.uk/en/models/m/m1000r/technicaldata.html) | 154 | 199 | Medium |
| M 1000 RR | 6 | 2022–24 | [M 1000 RR](https://www.bmw-motorrad.co.uk/en/models/m/m1000rr/technicaldata.html) | 160 | 194 | Medium; captured listings show earlier 156 kW variants |
| M 1000 XR | 13 | 2024–26 | [M 1000 XR](https://www.bmw-motorrad.co.uk/en/models/m/m1000xr/technicaldata.html) | 148 | 223 | Medium |
| R 12 | 16 | 2024–26 | [R 12](https://www.bmw-motorrad.co.uk/en/models/heritage/r12/technicaldata.html) | 70 | 227 | Medium |
| R 12 nineT | 13 | 2024–26 | [R 12 nineT](https://www.bmw-motorrad.co.uk/en/models/heritage/r12-ninet/technicaldata.html) | 80; A2 70 | 220 | Medium |
| R 12 G/S | 23 | 2024–26 | [R 12 G/S](https://www.bmw-motorrad.co.uk/en/models/heritage/r12gs/technicaldata.html) | 80 | 229 | Medium |
| R 12 S | 2 | 2025–26 | [R 12 S](https://www.bmw-motorrad.co.uk/en/models/heritage/r12-s/technicaldata.html) | 80; A2 70 | 220 | Medium |
| R 1250 GS Adventure | 49 | 2019–24 | [R 1250 GS Adventure](https://www.bmw-motorrad.co.uk/en/models/adventure/r1250gsadventure/technicaldata.html) | 100 | 268 | Medium |
| R 1300 GS | 84 | 2023–26 | [R 1300 GS](https://www.bmw-motorrad.co.uk/en/models/adventure/r1300gs/technicaldata.html) | 107 | 237 | Medium |
| R 1300 GS Adventure | 76 | 2024–26 | [R 1300 GS Adventure](https://www.bmw-motorrad.co.uk/en/models/adventure/r1300gs-adventure/technicaldata.html) | 107 | 269 | Medium |
| R 1300 R | 22 | 2025–26 | [R 1300 R](https://www.bmw-motorrad.co.uk/en/models/roadster/r1300r/technicaldata.html) | 107 | 239 | Medium |
| R 1300 RS | 34 | 2025–26 | [R 1300 RS](https://www.bmw-motorrad.co.uk/en/models/sport/r1300rs/technicaldata.html) | 107 | 245 | Medium |
| R 1300 RT | 24 | 2025–26 | [R 1300 RT](https://www.bmw-motorrad.co.uk/en/models/tour/r1300rt/technicaldata.html) | 107 | 281 | Medium |
| R 18 | 3 | 2022–26 | [R 18](https://www.bmw-motorrad.co.uk/en/models/heritage/r18/technicaldata.html) | 67 | 345 | Medium |
| R 18 B | 10 | 2022–26 | [R 18 B](https://www.bmw-motorrad.co.uk/en/models/heritage/r18-b/technicaldata.html) | 67 | 398 | Medium |
| R 18 Classic | 4 | 2023–26 | [R 18 Classic](https://www.bmw-motorrad.co.uk/en/models/heritage/r18-classic/technicaldata.html) | 67 | 369 | Medium |
| R 18 Roctane | 4 | 2024–26 | [R 18 Roctane](https://www.bmw-motorrad.co.uk/en/models/heritage/r18-roctane/technicaldata.html) | 67 | 374 | Medium |
| R 18 Transcontinental | 4 | 2025–26 | [R 18 Transcontinental](https://www.bmw-motorrad.co.uk/en/models/heritage/r18-transcontinental/technicaldata.html) | 67 | 433 | Medium |
| S 1000 R | 45 | 2016–26 | [S 1000 R](https://www.bmw-motorrad.co.uk/en/models/roadster/s1000r/technicaldata.html) | 125 | 199 | Medium; stock spans earlier outputs |
| S 1000 RR | 29 | 2020–26 | [S 1000 RR](https://www.bmw-motorrad.co.uk/en/models/sport/s1000rr/technicaldata.html) | 154 | 198 | Medium |
| S 1000 XR | 53 | 2018–26 | [S 1000 XR](https://www.bmw-motorrad.co.uk/en/models/sport/s1000xr/technicaldata.html) | 125 | 227 | Medium; stock spans earlier outputs |

## Resolved high-volume recognition groups

| Former rule | Corrected derivatives | Offer coverage | Official mass range | Status |
|---|---:|---|---|---|
| R 1300 R | R 1300 R; R 1300 RS | 22 + 34 | 239 kg; 245 kg | Resolved |
| F 900 GS | F 900 GS; F 900 GS Adventure | 25 + 16 | 219 kg; 246 kg | Resolved |
| R 12 | R 12; R 12 G/S; R 12 S | 16 + 23 + 2 | 227 kg; 229 kg; 220 kg | Resolved |
| R 18 | R 18; R 18 B; R 18 Classic; R 18 Roctane | 3 + 10 + 4 + 4 | 345 kg; 398 kg; 369 kg; 374 kg | Resolved |
| R 1250 GS | R 1250 GS; F 450 GS | 35 + 4 | R 1250 GS unknown; F 450 GS 178 kg | Resolved identity |

## Remaining unresolved coverage

| Current rule | Offers | Status | Main ambiguity / reason |
|---|---:|---|---|
| R 1250 GS | 35 | No source | F 450 GS is now resolved separately; no official R 1250 GS mass page located. |
| R 1250 RT | 35 | No source | Historical 2018–24 stock; no matching current UK technical page found. |
| R 1250 R | 30 | Broad | Rule also catches R 1250 RS (18) and HP2 (2) titles. |
| F 800 GS | 20 | No source | Existing profile is 798cc; current UK F 800 GS page is a different 895cc generation. |
| R nineT | 19 | Broad | Rule combines R nineT, Pure, Sport and Urban G/S variants. |
| G 310 GS | 12 | No source | Historic model; no matching current UK technical-data page found. |
| F 850 GS | 11 | Broad | Rule combines base (4) and Adventure (7) variants; no safe official historic source in this review. |
| R 1200 R | 7 | Broad | Rule catches R 1200 R, RS and RT titles. |
| F 750 GS | 6 | No source | Historic model; no matching current UK technical-data page found. |
| R 1200 GS | 6 | Broad | Includes one Adventure title; no safe official historic source in this review. |
| G 310 R | 4 | No source | Historic model; public route redirects to model overview. |
| F 800 R | 1 | No source | Historic model; no matching current UK technical-data page found. |
| K 1300 S | 1 | No source | Historic model; no matching current UK technical-data page found. |

## Acceptance checks

The advertised-spec licence filter now has an explicit test that an A1 listing with missing
advertised capacity is excluded. The focused brand suite passes with 85 tests; the full suite
passes with 243 tests after the hybrid power-to-weight screen was added.
