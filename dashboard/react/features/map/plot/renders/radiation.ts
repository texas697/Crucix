import { COLORS, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { asRec, esc, num, recs, str } from '../utils';

export function plotRadiation({ D, points }: PlotContext): void {
  recs(asRec(D.epa).stations).forEach((s) => {
    points.push({
      lat: num(s.lat),
      lng: num(s.lon),
      size: 0.18,
      _r: RADIUS.radnet,
      color: COLORS.radnet,
      _stroke: COLORS.radnetStroke,
      type: 'radiation',
      priority: 3,
      popHead: 'RadNet: ' + str(s.location),
      popMeta: 'EPA Radiation Monitor',
      popText: `${esc(s.analyte || '--')}: ${esc(s.result || '--')} ${esc(s.unit || '')}<br>State: ${esc(s.state)}`,
    });
  });
}
