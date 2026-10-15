// Region tables and pure predicates for the map chrome, ported faithfully from jarvis.html:
// REGION_BOX (1081-1088), REGION_CENTROID (1089), REGION_LABEL (1090), REGION_KEYWORDS (1091-1097),
// inRegionBox/inActiveRegion/textInRegion/textMatchesRegion (1099-1109) and URL_REGIONS (2909).
//
// The legacy predicates read the interactive `currentRegion` global; here the region is an explicit
// argument so the components stay framework-agnostic. All tables keep the legacy values verbatim.

/** The six selectable regions, in the legacy order used by the region bar and URL state. */
export const URL_REGIONS = ['world', 'americas', 'europe', 'middleEast', 'asiaPacific', 'africa'] as const;

export type RegionKey = (typeof URL_REGIONS)[number];

/** Display / iteration order for the region controls (same six keys as URL_REGIONS). */
export const REGION_ORDER: readonly RegionKey[] = URL_REGIONS;

/** [[west, south], [east, north]] bounds; `world` (and unknown regions) filter nothing. */
export type RegionBox = [[number, number], [number, number]];

export const REGION_BOX: Record<RegionKey, RegionBox | null> = {
  world: null,
  americas: [[-168, -58], [-32, 72]],
  europe: [[-25, 33], [45, 72]],
  middleEast: [[24, 10], [65, 45]],
  asiaPacific: [[55, -15], [180, 60]],
  africa: [[-20, -36], [55, 38]],
};

/** Regional map centroids, legacy REGION_CENTROID (no `world` entry). */
export const REGION_CENTROID: Partial<Record<RegionKey, [number, number]>> = {
  americas: [12, -80],
  europe: [52, 14],
  middleEast: [29, 45],
  asiaPacific: [22, 110],
  africa: [2, 20],
};

/** Human labels, legacy REGION_LABEL (1090). */
export const REGION_LABEL: Record<RegionKey, string> = {
  world: 'World',
  americas: 'Americas',
  europe: 'Europe',
  middleEast: 'Middle East',
  asiaPacific: 'Asia Pacific',
  africa: 'Africa',
};

/** Keyword lists used by the text-in-region filter, legacy REGION_KEYWORDS (1091-1097). */
export const REGION_KEYWORDS: Partial<Record<RegionKey, string[]>> = {
  americas: ['america', 'latin america', 'south america', 'north america', 'brazil', 'mexico', 'canada', 'united states', 'u.s.', 'usa', 'argentina', 'chile', 'colombia', 'peru', 'venezuela', 'caribbean', 'uruguay', 'ecuador', 'bolivia', 'cuba', 'haiti', 'honduras', 'guatemala', 'panama', 'paraguay'],
  europe: ['europe', 'european', ' nato', 'uk', 'britain', 'british', 'england', 'london', 'france', 'french', 'paris', 'germany', 'german', 'berlin', 'spain', 'spanish', 'italy', 'italian', 'poland', 'polish', 'ukraine', 'ukrainian', 'russia', 'russian', 'moscow', 'kyiv', 'belarus', 'sweden', 'norway', 'finland', 'hungary', 'romania', 'serbia', 'balkans', 'turkey', 'turkish'],
  middleEast: ['middle east', 'israel', 'israeli', 'iran', 'iranian', 'iraq', 'iraqi', 'syria', 'syrian', 'saudi', 'yemen', 'yemeni', 'lebanon', 'lebanese', 'gaza', 'houthi', 'gulf', 'qatar', 'emirates', 'jordan', 'hezbollah', 'tehran', 'riyadh', 'kuwait', 'bahrain', 'oman'],
  asiaPacific: ['asia', 'asian', 'china', 'chinese', 'taiwan', 'taiwanese', 'japan', 'japanese', 'korea', 'korean', 'india', 'indian', 'pacific', 'australia', 'australian', 'indonesia', 'indonesian', 'philippines', 'philippine', 'vietnam', 'vietnamese', 'thailand', 'thai', 'singapore', 'malaysia', 'myanmar', 'pakistan', 'bangladesh'],
  africa: ['africa', 'african', 'nigeria', 'nigerian', 'kenya', 'kenyan', 'ethiopia', 'ethiopian', 'sudan', 'sudanese', 'mali', 'malian', 'congo', 'south africa', 'egypt', 'egyptian', 'libya', 'libyan', 'somalia', 'somali', 'sahel', 'ghana', 'uganda', 'tanzania', 'morocco', 'algeria', 'tunisia', 'zimbabwe', 'cameroon', 'senegal'],
};

/** True when `(lat, lng)` falls inside `region`'s box; `world`/unknown regions always pass. */
export function inRegionBox(lat: number, lng: number, region: RegionKey | string): boolean {
  const b = (REGION_BOX as Record<string, RegionBox | null | undefined>)[region];
  if (!b) return true;
  return lat >= b[0][1] && lat <= b[1][1] && lng >= b[0][0] && lng <= b[1][0];
}

/** True when `(lat, lng)` is inside the active region. */
export function inActiveRegion(lat: number, lng: number, region: RegionKey | string): boolean {
  return inRegionBox(lat, lng, region);
}

/** True when `text` names any keyword of `region`; the `world` region matches everything. */
export function textInRegion(text: unknown, region: RegionKey | string): boolean {
  return region === 'world' ? true : textMatchesRegion(text, region);
}

/** Case-insensitive keyword match of `text` against `region`'s keyword list. */
export function textMatchesRegion(text: unknown, region: RegionKey | string): boolean {
  const t = String(text ?? '').toLowerCase();
  return ((REGION_KEYWORDS as Record<string, string[] | undefined>)[region] || []).some((k) => t.includes(k));
}

/** Clamp a `?region=` value to a known region key, falling back to `world`. */
export function clampRegion(value: unknown): RegionKey {
  return (URL_REGIONS as readonly unknown[]).includes(value) ? (value as RegionKey) : 'world';
}
