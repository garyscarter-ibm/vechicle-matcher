# Motorrad profile coverage audit

Processed **955** offers. The fixture retains the captured display title, not an immutable upstream raw title.

| Measure | Count |
|---|---:|
| Distinct captured titles | 236 |
| Distinct stock signatures | 381 |
| Explicit-rule offers | 953 |
| Family fallback offers | 0 |
| Generic fallback offers | 2 |
| Unmatched/fallback offers | 2 |
| Parent-prefix rule overlaps | 380 |
| Profiles with multiple cc/kW clusters | 11 |

An overlap means a title satisfied more than one ordered probe; it is review evidence, not automatically an error.

## Highest-volume findings

- **S 1000 XR** (53) — MULTIPLE_SPEC_CLUSTERS: 999|118, 999|121, 999|125
- **F 900 R** (46) — MULTIPLE_SPEC_CLUSTERS: 895|70, 895|77
- **S 1000 R** (45) — MULTIPLE_SPEC_CLUSTERS: 999|118, 999|121, 999|125
- **R 1250 RT** (35) — MULTIPLE_SPEC_CLUSTERS: 1254|100, 1254|96
- **R 1250 R** (30) — MULTIPLE_SPEC_CLUSTERS: 1170|83, 1170|98, 1254|100
- **S 1000 RR** (29) — MULTIPLE_SPEC_CLUSTERS: 999|152, 999|154
- **F 800 GS** (20) — MULTIPLE_SPEC_CLUSTERS: 798|63, 895|64
- **R 1250 R** (1) — FALLBACK_RULE: BMW HP2 Megamoto
- **R 1250 R** (1) — FALLBACK_RULE: BMW HP2 Sport

The machine-readable offer, signature and finding evidence is in motorrad-title-inventory.json.
