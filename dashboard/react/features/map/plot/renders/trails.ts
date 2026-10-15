import type * as GeoJSON from 'geojson';
import { COLORS } from '../consts';
import type { PlotContext } from '../types';
import { emptyFC } from '../utils';

export function trackTrails({ input }: PlotContext): GeoJSON.FeatureCollection {
  const rows = input.tracks?.tracks;
  if (!input.layerVisible.track || !Array.isArray(rows)) return emptyFC();
  const features: GeoJSON.Feature[] = [];
  rows.forEach((t) => {
    const trail = (t.trail || []).map((p) => [p.lat, p.lng] as [number, number]);
    if (trail.length > 1) {
      features.push({
        type: 'Feature',
        properties: { color: COLORS.trail },
        geometry: { type: 'LineString', coordinates: trail },
      });
    }
  });
  return features.length ? { type: 'FeatureCollection', features } : emptyFC();
}
