import { CDC_LEVEL_LABEL, COLORS, HEALTH_RISK_COL } from '../consts';
import type { LooseRecord, PlotContext } from '../types';
import { asArr, asRec, esc, fadeStroke, num, numOrNull, optStr, recs, relTime, riskMax, str } from '../utils';

function riskText(o: LooseRecord, max: string): string {
  if (!o.risk) return 'WHO has not published a risk level';
  const riskObj = o.risk && typeof o.risk === 'object' ? asRec(o.risk) : {};
  return `WHO risk ${max}${riskObj.national ? ` · national ${riskObj.national}` : ''}${
    riskObj.regional ? ` · regional ${riskObj.regional}` : ''
  }${riskObj.global ? ` · global ${riskObj.global}` : ''}`;
}

function cdcColor(level: number): string {
  return level >= 4 ? COLORS.cdcLevel4 : level === 3 ? COLORS.cdcLevel3 : COLORS.cdcLevel2;
}

function plotOutbreaks(hw: LooseRecord, seen: Set<string>, ctx: PlotContext): void {
  recs(hw.outbreaks).forEach((o) => {
    const max = riskMax(o.risk);
    const maxLower = max.toLowerCase();
    const col = HEALTH_RISK_COL[maxLower] || COLORS.healthDefault;
    const url = optStr(o.url);
    const last = optStr(o.last);
    const first = str(o.first);
    asArr(o.pins).forEach((pin) => {
      const p = asArr(pin);
      const plat = numOrNull(p[0]);
      const plon = numOrNull(p[1]);
      if (plat == null || plon == null) return;
      seen.add(`${plat},${plon}`);
      ctx.points.push({
        lat: plat,
        lng: plon,
        size: 0.3,
        _r: maxLower === 'very high' ? 5.2 : maxLower === 'high' ? 4.6 : 3.8,
        color: col,
        _stroke: fadeStroke(col),
        type: 'health',
        priority: 2,
        ts: last,
        url,
        popHead: `${str(o.disease)} · ${str(p[2])}`,
        popMeta: `WHO outbreak · ${num(o.updates)} notice${num(o.updates) === 1 ? '' : 's'} since ${first.slice(
          0,
          10,
        )} · latest ${relTime(last, ctx.now)}`,
        popText: `${esc(riskText(o, max))}.${o.summary ? ' ' + esc(o.summary) : ''}`,
      });
    });
  });
}

function plotTravelNotices(hw: LooseRecord, seen: Set<string>, ctx: PlotContext): void {
  recs(hw.travel)
    .filter((n) => num(n.level) >= 2)
    .forEach((n) => {
      const url = optStr(n.url);
      const date = optStr(n.date);
      const level = num(n.level);
      const col = cdcColor(level);
      asArr(n.pins).forEach((pin) => {
        const p = asArr(pin);
        const plat = numOrNull(p[0]);
        const plon = numOrNull(p[1]);
        if (plat == null || plon == null) return;
        const k = `${plat},${plon}`;
        if (seen.has(k)) return;
        seen.add(k);
        ctx.points.push({
          lat: plat,
          lng: plon,
          size: 0.15,
          _r: level >= 3 ? 3.6 : 2.6,
          color: col,
          _stroke: fadeStroke(col, '0.2'),
          type: 'health',
          priority: 3,
          ts: date,
          url,
          popHead: `${str(n.name)} · ${str(p[2])}`,
          popMeta: `CDC travel notice · Level ${level} · ${CDC_LEVEL_LABEL[level] || ''}`,
          popText: num(n.n) > 1 ? `${num(n.n)} destinations under this notice.` : '',
        });
      });
    });
}

export function plotHealth(ctx: PlotContext): void {
  const hw = asRec(ctx.D.healthWatch);
  const seen = new Set<string>();
  plotOutbreaks(hw, seen, ctx);
  plotTravelNotices(hw, seen, ctx);
}
