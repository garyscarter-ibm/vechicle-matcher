# Motorrad performance curve

Captured-offer distribution, frozen 2026-09-17. This is a brand-level curve, not a model affinity table.

| Measure | Value |
|---|---:|
| Captured offers | 955 |
| Offers with advertised kW and sourced canonical mass | 856 |
| Advertised-kW fallback offers | 99 |
| Offers with neither | 0 |

| Signal | P10 | P50 | P95 | Frozen linear anchors |
|---|---:|---:|---:|---|
| kW/kg | 0.282 | 0.381 | 0.774 | 0.28 → 0.78 |
| Advertised kW | 66 | 100 | 154 | 66 → 154 |

The primary score is `clamp((advertised kW / sourced kerb kg - low) / (high - low))`. If sourced mass is unavailable, the same clamped linear form uses advertised kW and the fallback anchors. If advertised kW is unavailable, the scorer returns neutral 0.5. Catalogue factory kW is never used as a substitute.
