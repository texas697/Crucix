import { COLORS } from '../consts';
import type { PlotContext } from '../types';
import { esc, getAge, magColor, num, numOrNull, optStr } from '../utils';

export function plotQuakes({ input, now, points }: PlotContext): void {
  if (!Array.isArray(input.quakes)) return;
  input.quakes.forEach((q) => {
    const mag = num(q.mag);
    const depth = numOrNull(q.depth);
    points.push({
      lat: num(q.lat),
      lng: num(q.lon),
      size: 0.18 + Math.min(mag / 10, 0.5),
      _r: 2.5 + Math.min(mag, 7) * 0.8,
      color: magColor(mag),
      _stroke: COLORS.quakeStroke,
      type: 'quake',
      priority: 1,
      ts: optStr(q.ts),
      url: optStr(q.url),
      popHead: `M${mag.toFixed(1)} earthquake`,
      popMeta: 'USGS · ' + getAge(q.ts, now),
      popText: `${esc(q.place || '')}<br>Depth: ${depth != null ? Math.round(depth) + ' km' : '?'}${
        q.tsunami ? '<br><span style="color:#ff8a5c">Tsunami flag</span>' : ''
      }`,
    });
  });
}
