import { GDELT_RGB } from '../consts';
import type { PlotContext } from '../types';
import { asRec, dimSpan, esc, gdeltSeverity, num, optStr, recs, relTime, str } from '../utils';

function severityRgb(sev: number): string {
  return sev >= 5 ? GDELT_RGB.severe : sev >= 3 ? GDELT_RGB.moderate : GDELT_RGB.low;
}

export function plotGdelt({ D, now, points }: PlotContext): void {
  recs(asRec(D.gdelt).geoPoints).forEach((g) => {
    const sev = gdeltSeverity(g.worst);
    const col = severityRgb(sev);
    const worst = str(g.worst);
    const type = str(g.type);
    const latest = optStr(g.latest);
    const count = num(g.count);
    points.push({
      lat: num(g.lat),
      lng: num(g.lon),
      size: 0.15 + Math.min(count / 60, 0.25),
      _r: 2.5 + Math.min(count, 40) / 12,
      color: `rgba(${col},0.75)`,
      _stroke: `rgba(${col},0.25)`,
      type: 'gdelt',
      priority: sev >= 5 ? 2 : 3,
      ts: latest,
      url: optStr(g.url),
      popHead: worst && worst !== type ? `${type} · incl. ${worst}` : type || 'GDELT event',
      popMeta: `GDELT · ${count} sources · ${num(g.events)} events${latest ? ' · ' + relTime(latest, now) : ''}`,
      popText: `${esc(g.name) || 'Global event'}${g.actors ? '<br>' + esc(g.actors) : ''}<br>${dimSpan(
        `Goldstein ${g.goldstein ?? '--'} · tone ${g.tone ?? '--'}`,
      )}`,
    });
  });
}
