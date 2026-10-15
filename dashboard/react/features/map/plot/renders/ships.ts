import { COLORS, RADIUS } from '../consts';
import { BIG_SHIP_CLASSES, NAV_LABEL, SHIP_COL, SHIP_LABEL } from '../shipConsts';
import type { PlotContext, ShipRow } from '../types';
import { dimSpan, esc, num, numOrNull, optStr, relTime, str } from '../utils';

function motionText(v: ShipRow): string {
  const nav = numOrNull(v.nav);
  const sog = numOrNull(v.sog);
  const cog = numOrNull(v.cog);
  const isStopped = nav === 1 || nav === 5 || (sog != null && sog < 0.5);
  const navText = nav != null && NAV_LABEL[nav] ? ` · ${NAV_LABEL[nav]}` : isStopped ? ' · stopped' : '';
  return `${sog != null ? `${sog.toFixed(1)} kn` : 'speed --'}${cog != null ? ` · course ${cog}°` : ''}${navText}`;
}

export function plotShips({ input, now, points }: PlotContext): void {
  const shipBoxes = input.ships?.boxes;
  (input.ships?.vessels || []).forEach((v) => {
    const vlat = numOrNull(v.lat);
    const vlon = numOrNull(v.lon);
    if (vlat == null || vlon == null) return;
    const cls = v.cls || 'unknown';
    const isBig = BIG_SHIP_CLASSES.has(cls);
    const boxLabel = v.box && shipBoxes && shipBoxes[v.box] ? str(shipBoxes[v.box]?.label) : '';
    const ts = optStr(v.ts);
    points.push({
      lat: vlat,
      lng: vlon,
      size: isBig ? 0.16 : 0.11,
      _r: isBig ? RADIUS.shipBig : RADIUS.shipSmall,
      color: SHIP_COL[cls] || SHIP_COL.unknown!,
      _stroke: COLORS.shipStroke,
      type: 'ships',
      priority: cls === 'military' || cls === 'law' ? 2 : 3,
      ts,
      popHead: v.name || 'MMSI ' + str(v.mmsi),
      popMeta: `${SHIP_LABEL[cls] || 'Vessel'}${boxLabel ? ' · ' + esc(boxLabel) : ''}${
        ts ? ' · ' + relTime(ts, now) : ''
      }`,
      popText: `${motionText(v)}${v.dest ? `<br>Bound for ${esc(v.dest)}` : ''}${
        v.len ? `<br>Length ${num(v.len)} m` : ''
      }<br>${dimSpan(`MMSI ${str(v.mmsi)} · AIS via aisstream.io`, '.65')}`,
    });
  });
}
