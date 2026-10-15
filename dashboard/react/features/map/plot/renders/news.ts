import { COLORS, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { cleanText, getAge, num, optStr, recs, str } from '../utils';

export function plotNews({ D, now, points }: PlotContext): void {
  recs(D.news).forEach((n) => {
    points.push({
      lat: num(n.lat),
      lng: num(n.lon),
      size: 0.2,
      _r: RADIUS.news,
      color: COLORS.news,
      _stroke: COLORS.newsStroke,
      type: 'news',
      priority: 3,
      ts: optStr(n.date),
      url: optStr(n.url),
      popHead: str(n.source) + ' NEWS',
      popMeta: 'keyword: ' + str(n.region) + ' · ' + getAge(n.date, now),
      popText: cleanText(n.title),
    });
  });
}
