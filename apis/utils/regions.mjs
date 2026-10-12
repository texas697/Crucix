// Dashboard theaters as [[lonMin, latMin], [lonMax, latMax]] boxes, in priority order: the Middle East box overlaps
// the Africa, Europe and Asia boxes, so a point is assigned to the first box that contains it.
export const THEATERS = [
  ['middleEast', [[24, 10], [65, 45]]],
  ['europe', [[-25, 33], [45, 72]]],
  ['africa', [[-20, -36], [55, 38]]],
  ['asiaPacific', [[55, -15], [180, 60]]],
  ['americas', [[-168, -58], [-32, 72]]],
];
export function theaterOf(lat, lon) {
  for (const [key, b] of THEATERS) if (lat >= b[0][1] && lat <= b[1][1] && lon >= b[0][0] && lon <= b[1][0]) return key;
  return null;
}
