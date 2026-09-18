# Motorrad scoring production cutover

Review date: 2026-09-16. Catalogue scoring is production-default; legacy compatibility scoring remains a server-side rollback mode.

| Check | Result |
|---|---:|
| Runtime canonical profiles | 107 |
| Fixture offers evaluated | 955 |
| Exact canonical identities | 955 |
| Reviewed scenarios | 12 |
| Legacy mode matches saved legacy shadow | yes |
| Catalogue mode matches saved proposed shadow | yes |
| Scenario mismatches | 0 |

## Licence comparison

- A1: 0 legacy / 0 catalogue; identical eligibility: true; power-to-weight status changes: 282
- A2: 69 legacy / 69 catalogue; identical eligibility: true; power-to-weight status changes: 282
- A: 955 legacy / 955 catalogue; identical eligibility: true; power-to-weight status changes: 0

## Scenario review

### a1-commute-low

- Legacy top three: none
- Catalogue top three: none
- Top-ten additions/removals: none / none
- Saved shadow agreement: legacy yes, catalogue yes


### a2-adventure-medium

- Legacy top three: BMW G 310 GS with Centre Stand (71); BMW G 310 GS (71); BMW G 310 GS (71)
- Catalogue top three: BMW G 310 GS with Centre Stand (65); BMW G 310 GS (65); BMW G 310 GS (65)
- Top-ten additions/removals: none / none
- Saved shadow agreement: legacy yes, catalogue yes
- 575124: 1 → 1; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 574558: 2 → 2; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 575997: 3 → 3; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 575188: 4 → 4; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 576785: 5 → 5; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 577013: 6 → 6; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 575062: 7 → 7; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 574091: 8 → 8; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 576990: 9 → 9; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot
- 564181: 10 → 10; score 71 → 65, fit 89 → 81, taste 0 → 0; fields: tags, kerbMassKg, zeroTo62, mpg, seats, boot

### full-a-performance-high

- Legacy top three: BMW S 1000 RR Sport (84); BMW S 1000 RR Sport (84); BMW S 1000 RR Sport (84)
- Catalogue top three: BMW M 1000 RR (84); BMW M 1000 RR COMPETITION PACK (84); BMW M 1000 RR (84)
- Top-ten additions/removals: 575595, 576855, 575470, 573831, 576236, 574356 / 576118, 575643, 573855, 574944, 575699, 573244
- Saved shadow agreement: legacy yes, catalogue yes
- 575595: 27 → 1; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 576855: 28 → 2; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 575470: 29 → 3; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 573831: 30 → 4; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 576236: 31 → 5; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 574356: 32 → 6; score 83 → 84, fit 88 → 89, taste 63 → 63; fields: zeroTo62, mpg, seats, boot
- 576433: 1 → 7; score 84 → 84, fit 89 → 89, taste 62 → 62; fields: zeroTo62, mpg, seats, boot
- 575855: 2 → 8; score 84 → 84, fit 89 → 89, taste 62 → 62; fields: zeroTo62, mpg, seats, boot
- 574182: 3 → 9; score 84 → 84, fit 89 → 89, taste 62 → 62; fields: zeroTo62, mpg, seats, boot
- 571608: 4 → 10; score 84 → 84, fit 89 → 89, taste 62 → 62; fields: zeroTo62, mpg, seats, boot

### full-a-economy-high-mileage

- Legacy top three: BMW R 1250 R Sport Cruise & Heated Grips (79); BMW R 1250 R Sport (79); BMW R 1250 R (79)
- Catalogue top three: BMW F 900 R SE (77); BMW F 900 R LOW CHASSIS (77); BMW F 900 R SE (77)
- Top-ten additions/removals: 573426, 573293, 576914, 575806, 576979, 575511, 575925, 571218, 575766, 573605 / 552441, 557304, 576318, 577032, 557696, 571004, 576034, 576122, 576684, 576919
- Saved shadow agreement: legacy yes, catalogue yes
- 573426: 77 → 1; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 573293: 78 → 2; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 576914: 79 → 3; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575806: 80 → 4; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 576979: 81 → 5; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575511: 82 → 6; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575925: 83 → 7; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 571218: 84 → 8; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575766: 85 → 9; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 573605: 86 → 10; score 77 → 77, fit 95 → 95, taste 9 → 9; fields: zeroTo62, mpg, seats, boot

### full-a-touring-practicality

- Legacy top three: BMW R 1250 RT LE (80); BMW R 1250 RT LE (80); BMW R 1250 RT LE (80)
- Catalogue top three: BMW R 1300 RT LE ASA (70); BMW R 1300 RT LE (70); BMW R 1300 RT LE (70)
- Top-ten additions/removals: 574560, 576550, 568709, 576083, 572960, 576043, 569605, 575389, 575050, 577100 / 577231, 575183, 576041, 574740, 567185, 574065, 569077, 575290, 576186, 577045
- Saved shadow agreement: legacy yes, catalogue yes
- 574560: 36 → 1; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576550: 37 → 2; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 568709: 38 → 3; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576083: 39 → 4; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 572960: 40 → 5; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576043: 41 → 6; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 569605: 42 → 7; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 575389: 43 → 8; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 575050: 44 → 9; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 577100: 45 → 10; score 79 → 70, fit 98 → 86, taste 7 → 7; fields: zeroTo62, mpg, seats, boot

### full-a-pillion

- Legacy top three: BMW R 1250 RT LE (80); BMW R 1250 RT LE (80); BMW R 1250 RT LE (80)
- Catalogue top three: BMW R 1300 RT LE ASA (71); BMW R 1300 RT LE (71); BMW R 1300 RT LE (71)
- Top-ten additions/removals: 574560, 576550, 568709, 576083, 572960, 576043, 569605, 575389, 575050, 577100 / 577231, 575183, 576041, 574740, 567185, 574065, 569077, 575290, 576186, 577045
- Saved shadow agreement: legacy yes, catalogue yes
- 574560: 36 → 1; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576550: 37 → 2; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 568709: 38 → 3; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576083: 39 → 4; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 572960: 40 → 5; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 576043: 41 → 6; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 569605: 42 → 7; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 575389: 43 → 8; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 575050: 44 → 9; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot
- 577100: 45 → 10; score 79 → 71, fit 97 → 87, taste 7 → 7; fields: zeroTo62, mpg, seats, boot

### full-a-manageability

- Legacy top three: BMW G 310 R (78); BMW G 310 R (78); BMW G 310 R (78)
- Catalogue top three: BMW S 1000 R Sport (75); BMW S 1000 R Sport (75); BMW S 1000 R Sport (75)
- Top-ten additions/removals: 576028, 575546, 577005, 573856 / 574097, 573757, 574092, 576997
- Saved shadow agreement: legacy yes, catalogue yes
- 576206: 5 → 1; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 575859: 6 → 2; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 575185: 7 → 3; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 568858: 8 → 4; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 576205: 9 → 5; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 574936: 10 → 6; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 576028: 11 → 7; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 575546: 12 → 8; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 577005: 13 → 9; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot
- 573856: 14 → 10; score 76 → 75, fit 88 → 87, taste 27 → 27; fields: zeroTo62, mpg, seats, boot

### full-a-heritage-character

- Legacy top three: BMW R nineT Pure Sport (75); BMW R nineT (75); BMW R nineT 1 Year Warranty Included (75)
- Catalogue top three: BMW R nineT Pure Sport (74); BMW R nineT (74); BMW R nineT 1 Year Warranty Included (74)
- Top-ten additions/removals: none / none
- Saved shadow agreement: legacy yes, catalogue yes
- 574194: 1 → 1; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 569513: 2 → 2; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 574779: 3 → 3; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 574614: 4 → 4; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 576945: 5 → 5; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 571713: 6 → 6; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 576641: 7 → 7; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 576400: 8 → 8; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 577260: 9 → 9; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot
- 572415: 10 → 10; score 75 → 74, fit 93 → 90, taste 7 → 7; fields: kerbMassKg, zeroTo62, mpg, seats, boot

### category-adventure

- Legacy top three: BMW R 1250 GS TE (82); BMW R 1250 GS TE (82); BMW R 1250 GS TE (82)
- Catalogue top three: BMW R 1300 GS TE (72); BMW R 1300 GS (72); BMW R 1300 GS TE (72)
- Top-ten additions/removals: 574202, 576331, 576207, 571223, 574602, 576966, 577031, 576428, 574631, 573807 / 576053, 571192, 576758, 573145, 576031, 575195, 571751, 559851, 576420, 576467
- Saved shadow agreement: legacy yes, catalogue yes
- 574202: 36 → 1; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 576331: 37 → 2; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 576207: 38 → 3; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 571223: 39 → 4; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 574602: 40 → 5; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 576966: 41 → 6; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 577031: 42 → 7; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 576428: 43 → 8; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 574631: 44 → 9; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot
- 573807: 45 → 10; score 81 → 72, fit 98 → 86, taste 16 → 16; fields: zeroTo62, mpg, seats, boot

### category-roadster

- Legacy top three: BMW R 1250 R Sport Cruise & Heated Grips (79); BMW R 1250 R Sport (79); BMW R 1250 R (79)
- Catalogue top three: BMW F 900 R SE (77); BMW F 900 R LOW CHASSIS (77); BMW F 900 R SE (77)
- Top-ten additions/removals: 573426, 573293, 576914, 575806, 576979, 575511, 575925, 571218, 575766, 573605 / 552441, 557304, 576318, 577032, 557696, 571004, 576034, 576122, 576684, 576919
- Saved shadow agreement: legacy yes, catalogue yes
- 573426: 93 → 1; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 573293: 94 → 2; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 576914: 95 → 3; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575806: 96 → 4; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 576979: 97 → 5; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575511: 98 → 6; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575925: 99 → 7; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 571218: 100 → 8; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 575766: 101 → 9; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot
- 573605: 102 → 10; score 77 → 77, fit 94 → 94, taste 9 → 9; fields: zeroTo62, mpg, seats, boot

### category-naked

- Legacy top three: BMW G 310 R (78); BMW G 310 R (78); BMW G 310 R (78)
- Catalogue top three: BMW M 1000 R (77); BMW M 1000 R (77); BMW M 1000 R Carbon & Billet Pack (77)
- Top-ten additions/removals: 576985, 576694, 573816, 576357 / 574097, 573757, 574092, 576997
- Saved shadow agreement: legacy yes, catalogue yes
- 574358: 5 → 1; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576808: 6 → 2; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 575527: 7 → 3; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576996: 8 → 4; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 574327: 9 → 5; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576218: 10 → 6; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576985: 11 → 7; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576694: 12 → 8; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 573816: 13 → 9; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot
- 576357: 14 → 10; score 77 → 77, fit 85 → 84, taste 47 → 47; fields: zeroTo62, mpg, seats, boot

### category-scooter

- Legacy top three: BMW C 400 X (77); BMW C 400 X (77); BMW C 400 GT 2yr BMW Warranty + Full History (77)
- Catalogue top three: BMW CE 02 AM (72); BMW CE 02 AM Pre Registered Special (72); BMW CE 02 AM Urban mobility (72)
- Top-ten additions/removals: 540397, 576862, 566738, 575888, 573307, 559312, 564126, 574894, 563992, 575152 / 572411, 549900, 566943, 576392, 571325, 572357, 573440, 576263, 574609, 573799
- Saved shadow agreement: legacy yes, catalogue yes
- 540397: 26 → 1; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 576862: 27 → 2; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 566738: 28 → 3; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 575888: 29 → 4; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 573307: 30 → 5; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 559312: 31 → 6; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 564126: 32 → 7; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 574894: 33 → 8; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 563992: 34 → 9; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot
- 575152: 35 → 10; score 72 → 72, fit 90 → 90, taste 0 → 0; fields: tags, zeroTo62, evRange, seats, boot

## Missing-data treatment

Unavailable acceleration, standard luggage, seating, economy and EV range remain absent from the catalogue-mode mapped object. The engine treats unavailable performance/practicality inputs neutrally and emits no related reason; optional equipment is not converted into a luggage claim. Live price, mileage, registration, advertised cc and advertised kW remain untouched.

## Rollback

Set server environment variable `MOTORRAD_SCORING_MODE=legacy` to retain catalogue identity resolution but use the pre-cutover compatibility scoring profile. `catalogue` is the default. Invalid values log a server-side warning and safely use `catalogue`; the setting is not included in API output.
