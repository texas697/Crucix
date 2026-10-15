export const MAP_INIT_VIEW = { longitude: 20, latitude: 25, zoom: 1.35 } as const;
export const WORLD_CENTER: [number, number] = [20, 25];
export const WORLD_ZOOM = 1.35;
export const MAP_MIN_ZOOM = 0.5;
export const MAP_MAX_ZOOM = 12;
export const ZOOMED_IN_AT = 2;
export const POINT_FLY_ZOOM = 5;
export const MIN_CIRCLE_KM = 3;
export const MIN_RECT_DEG = 0.2;
export const NEAREST_POINT_DEG = 0.25;
export const MILITARY_AIR_KEY = 'militaryAir';
export const MILITARY_AIR_COLOR = '#8fa7ff';
export const PLANE_ICON_ID = 'crucix-plane';
export const PLANE_ICON_SIZE = 48;
export const PLANE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>';
export const CLICK_LAYERS = ['lyr-points', 'lyr-military', 'lyr-conflict', 'lyr-rings', 'lyr-corridors'];
export const REGION_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  world: [[-180, -60], [180, 80]],
  americas: [[-130, 5], [-55, 55]],
  europe: [[-12, 34], [45, 72]],
  middleEast: [[24, 10], [65, 45]],
  asiaPacific: [[60, -12], [180, 55]],
  africa: [[-20, -36], [55, 38]],
};
export const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
