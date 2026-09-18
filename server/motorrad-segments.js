/* BMW Motorrad's exact detail-response Segment labels translated to the
 * matcher’s broad category vocabulary. This is an audit policy table, not a
 * per-model affinity system: every identical BMW label takes the same path. */
export const BMW_MOTORRAD_SEGMENT_TRANSLATION = Object.freeze({
  Adventure: 'adventure',
  Heritage: 'heritage',
  'Roadster / Naked bike': 'roadster',
  Sport: 'sport',
  'Tourer / Luxury tourer': 'tourer',
});

export function translateBmwMotorradSegment(exactLabel) {
  return BMW_MOTORRAD_SEGMENT_TRANSLATION[exactLabel] || null;
}
