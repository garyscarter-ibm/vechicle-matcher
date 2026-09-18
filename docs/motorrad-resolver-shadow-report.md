# Motorrad resolver shadow report

Review date: 2026-09-16. This report compares the retained legacy first-match mapper with the production catalogue resolver. The catalogue resolver is now the Motorrad production identity layer; scoring remains on the explicit legacy compatibility profile.

## Reconciliation

| Measure | Offers | Signatures |
|---|---:|---:|
| Captured / processed | 955 | 381 |
| Resolver exact | 955 | 381 |
| Resolver family-only | 0 | 0 |
| Resolver ambiguous | 0 | 0 |
| Resolver unknown | 0 | 0 |
| Agreement with reviewed identity | 955 | 381 |

Unexplained disagreements: 0. Missing listing facts (year, cc, or kW): 0. Material title/spec conflicts: 0. Non-blocking registration-year notes: 4.

## Production profile to canonical derivative

The following are identity granularity changes, not production changes. Each representative is a real captured listing.

| Legacy profile | Canonical derivative | Offers | Representative listing |
|---|---|---:|---|
| F 800 GS | bmw-motorrad:f-800-gs-895cc | 19 | BMW F 800 GS (577259) |
| R 1250 R | bmw-motorrad:r-1250-rs | 18 | BMW R 1250 RS SE (576919) |
| F 850 GS | bmw-motorrad:f-850-gs-adventure | 7 | BMW F 850 GS Adventure TE (575471) |
| R 1200 R | bmw-motorrad:r-1200-rs | 5 | BMW R 1200 RS Sport SE (576474) |
| R nineT | bmw-motorrad:r-ninet-pure | 4 | BMW R nineT Pure (576945) |
| R nineT | bmw-motorrad:r-ninet-urban-g-s | 3 | BMW R nineT Urban G/S Option 719 Gold (577260) |
| F 900 R | bmw-motorrad:f-900-r-a2-70-kw | 2 | BMW F 900 R A2 (572924) |
| R nineT | bmw-motorrad:r-ninet-sport | 2 | BMW R nineT Sport (577238) |
| F 800 GS | bmw-motorrad:f-800-gs-798cc | 1 | BMW F 800 GS Trophy (573862) |
| R 1200 GS | bmw-motorrad:r-1200-gs-adventure | 1 | BMW R 1200 GS Adventure TE (574357) |
| R 1200 R | bmw-motorrad:r-1200-rt | 1 | BMW R 1200 RT LE (575272) |
| R 1250 R | bmw-motorrad:hp2-megamoto | 1 | BMW HP2 Megamoto (568808) |
| R 1250 R | bmw-motorrad:hp2-sport | 1 | BMW HP2 Sport (572069) |

## Highest-volume identity corrections

- F 800 GS → bmw-motorrad:f-800-gs-895cc: 19 offers — BMW F 800 GS (577259)
- R 1250 R → bmw-motorrad:r-1250-rs: 18 offers — BMW R 1250 RS SE (576919)
- F 850 GS → bmw-motorrad:f-850-gs-adventure: 7 offers — BMW F 850 GS Adventure TE (575471)
- R 1200 R → bmw-motorrad:r-1200-rs: 5 offers — BMW R 1200 RS Sport SE (576474)
- R nineT → bmw-motorrad:r-ninet-pure: 4 offers — BMW R nineT Pure (576945)
- R nineT → bmw-motorrad:r-ninet-urban-g-s: 3 offers — BMW R nineT Urban G/S Option 719 Gold (577260)
- F 900 R → bmw-motorrad:f-900-r-a2-70-kw: 2 offers — BMW F 900 R A2 (572924)
- R nineT → bmw-motorrad:r-ninet-sport: 2 offers — BMW R nineT Sport (577238)
- F 800 GS → bmw-motorrad:f-800-gs-798cc: 1 offers — BMW F 800 GS Trophy (573862)
- R 1200 GS → bmw-motorrad:r-1200-gs-adventure: 1 offers — BMW R 1200 GS Adventure TE (574357)

## Listing data quality

No captured listing is missing year, advertised cc, or advertised kW.


No captured listing has a material title/cc/kW conflict.


Registration-year notes (first registration is supporting evidence, so these do not force a generation rejection):

- 576758: BMW R 1250 GS TE — 2018 outside 2019–2024
- 576219: BMW R nineT Urban G/S — 2024 outside 2017–2023
- 575183: BMW R 1250 RT LE — 2018 outside 2019–2024
- 569077: BMW R 1250 RT LE — 2018 outside 2019–2024

## Unexplained disagreements

None.
