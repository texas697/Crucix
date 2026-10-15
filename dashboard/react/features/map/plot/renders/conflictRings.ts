import type * as GeoJSON from 'geojson';
import { inActiveRegion } from '../../regions';
import type { PlotContext } from '../types';
import { asRec, emptyFC, esc, num, optStr, relTime, severeGdelt, str } from '../utils';

export function conflictRings({ D, input, now }: PlotContext): GeoJSON.FeatureCollection {
  if (!input.layerVisible.conflict) return emptyFC();
  const features: GeoJSON.Feature[] = severeGdelt(asRec(D.gdelt))
    .filter((g) => inActiveRegion(num(g.lat), num(g.lon), input.region))
    .map((g) => {
      const maxR = Math.max(2, Math.min(6, 1 + Math.log2(Math.max(num(g.count), 1))));
      const latest = optStr(g.latest);
      return {
        type: 'Feature',
        properties: {
          r: Math.max(3, Math.min(14, maxR * 2)),
          head: str(g.worst),
          text: `${esc(g.name)}${g.actors ? '<br>' + esc(g.actors) : ''}`,
          meta: `GDELT · ${num(g.count)} sources${latest ? ' · ' + relTime(latest, now) : ''}`,
        },
        geometry: { type: 'Point', coordinates: [num(g.lon), num(g.lat)] },
      };
    });
  return features.length ? { type: 'FeatureCollection', features } : emptyFC();
}
