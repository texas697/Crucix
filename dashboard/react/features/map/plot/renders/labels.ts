import { inActiveRegion, inRegionBox, REGION_CENTROID, REGION_LABEL, type RegionKey } from '../../regions';
import type { PlotContext, PlotLabel } from '../types';
import { bool } from '../utils';

function aggregateLabels({ points }: PlotContext): PlotLabel[] {
  const out: PlotLabel[] = [];
  (Object.keys(REGION_CENTROID) as RegionKey[]).forEach((r) => {
    const centroid = REGION_CENTROID[r];
    if (!centroid) return;
    const n = points.filter((p) => inRegionBox(p.lat, p.lng, r)).length;
    if (n > 0) {
      out.push({ lat: centroid[0], lng: centroid[1], text: `${REGION_LABEL[r]} · ${n}`, aggregate: true, region: r });
    }
  });
  return out;
}

export function plotLabels(ctx: PlotContext): PlotLabel[] {
  const { input, labels } = ctx;
  const out: PlotLabel[] = labels
    .filter((l) => bool(input.layerVisible[l.type]) && inActiveRegion(l.lat, l.lng, input.region))
    .map((l) => ({ text: l.text, lng: l.lng, lat: l.lat }));
  if (input.region === 'world' && input.showAggregates) out.push(...aggregateLabels(ctx));
  return out;
}
