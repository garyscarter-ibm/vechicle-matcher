# BMW Motorrad segment verification

Generated: 2026-09-17. Every accepted detail response matched both its requested `angebotsNr` and a compatible `markeModell`; failures are rejected as `DETAIL_IDENTITY_MISMATCH`. Segment is extracted directly from `basisDaten.Segment`, independently of equipment parsing.

| Measure | Value |
|---|---:|
| Offers discovered | 987 |
| Detail responses requested | 88 |
| Verified detail responses | 0 |
| Identity mismatches rejected | 84 |

## Required Sport models

| Canonical derivative | Verified offer | BMW exact Segment | Central translation |
|---|---|---|---|
| bmw-motorrad:f-900-xr | NOT_IN_VERIFIED_SAMPLE | not verified | not mapped |
| bmw-motorrad:s-1000-xr | NOT_IN_VERIFIED_SAMPLE | not verified | not mapped |
| bmw-motorrad:s-1000-rr | NOT_IN_VERIFIED_SAMPLE | not verified | not mapped |

## Representatives of every verified BMW Segment

| BMW exact Segment | Central translation | Verified offers | Representative derivatives (offer; page/row) |
|---|---|---:|---|
| none | n/a | 0 | n/a |

## Central segment translation

| BMW exact Segment | Matcher category |
|---|---|
| Adventure | adventure |
| Heritage | heritage |
| Roadster / Naked bike | roadster |
| Sport | sport |
| Tourer / Luxury tourer | tourer |

This table is deliberately label-based, not model-based. An unrecognised BMW label is reported as UNMAPPED and does not acquire a fallback affinity.
