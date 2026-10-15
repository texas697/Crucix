import { COLORS, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { asRec, esc, num, recs, str } from '../utils';

export function plotWeather({ D, points }: PlotContext): void {
  recs(asRec(D.noaa).alerts).forEach((a) => {
    points.push({
      lat: num(a.lat),
      lng: num(a.lon),
      size: 0.22,
      _r: RADIUS.weather,
      color: COLORS.weather,
      _stroke: COLORS.weatherStroke,
      type: 'weather',
      priority: 2,
      popHead: str(a.event),
      popMeta: 'NOAA/NWS · ' + str(a.severity),
      popText: esc(a.headline || ''),
    });
  });
}
