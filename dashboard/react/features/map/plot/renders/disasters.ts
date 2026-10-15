import { COLORS, DISASTER_ICON, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { asArr, asRec, esc, fadeStroke, numOrNull, optStr, recs, str } from '../utils';

export function plotDisasters({ D, points }: PlotContext): void {
  recs(asRec(D.disasters).events).forEach((e) => {
    const elat = numOrNull(e.lat);
    const elon = numOrNull(e.lon);
    if (elat == null || elon == null) return;
    const isRed = str(e.level) === 'Red';
    const col = isRed ? COLORS.disasterRed : COLORS.disasterOrange;
    const countries = asArr(e.countries);
    const from = optStr(e.from);
    const to = optStr(e.to);
    points.push({
      lat: elat,
      lng: elon,
      size: isRed ? 0.35 : 0.25,
      _r: isRed ? RADIUS.disasterRed : RADIUS.disasterOrange,
      color: col,
      _stroke: fadeStroke(col),
      type: 'disaster',
      priority: 1,
      ts: to || from,
      url: optStr(e.url),
      popHead: `${DISASTER_ICON[str(e.type)] || ''} ${str(e.name)}`,
      popMeta: `GDACS ${str(e.level)} · ${str(e.typeLabel)}${e.current ? ' · ongoing' : ''}${
        countries.length > 1 ? ' · ' + countries.length + ' countries' : ''
      }`,
      popText: `${e.sev ? esc(e.sev) + '. ' : ''}${from ? 'From ' + esc(from.slice(0, 10)) : ''}${
        to ? ' to ' + esc(to.slice(0, 10)) : ''
      }.`,
    });
  });
}
