import { COLORS, RADIUS } from '../consts';
import type { LooseRecord, PlotContext } from '../types';
import { asArr, asRec, bool, esc, fadeStroke, num, numOrNull, optStr, recs, relTime, str } from '../utils';

function passesOutage(c: LooseRecord): boolean {
  return numOrNull(c.lat) != null && !!(bool(c.national) || bool(c.minor) || num(c.regions) >= 2 || num(c.asns) >= 3);
}

function plural(n: number, word: string): string {
  return n ? n + ' ' + word + (n === 1 ? '' : 's') + '. ' : '';
}

function plotIoda(countries: LooseRecord[], ctx: PlotContext): void {
  countries.forEach((c) => {
    const clat = numOrNull(c.lat);
    const clon = numOrNull(c.lon);
    if (clat == null || clon == null) return;
    if (!bool(c.national) && !bool(c.minor) && num(c.regions) < 2 && num(c.asns) < 3) return;
    const isNational = bool(c.national);
    const col = isNational ? COLORS.outageOn : COLORS.outageMinor;
    const drop = numOrNull(c.drop);
    const sources = asArr(c.sources);
    const since = optStr(c.since);
    ctx.points.push({
      lat: clat,
      lng: clon,
      size: isNational ? 0.3 : 0.15,
      _r: isNational ? RADIUS.outageMajor : RADIUS.outageMinor,
      color: col,
      _stroke: fadeStroke(col),
      type: 'outage',
      priority: isNational ? 1 : 3,
      ts: since,
      popHead: `${str(c.name)} internet`,
      popMeta: `IODA · ${isNational ? 'national disruption' : bool(c.minor) ? 'minor dip' : 'sub-national alerts'}${
        drop != null ? ' · ' + drop + '% below baseline' : ''
      }`,
      popText: `${c.cause ? '<b>Cloudflare:</b> ' + esc(c.cause) + '<br>' : ''}${
        sources.length ? 'Signals: ' + esc(sources.join(', ')) + '. ' : ''
      }${plural(num(c.regions), 'region alert')}${plural(num(c.asns), 'network alert')}${
        since ? 'Since ' + relTime(since, ctx.now) + '.' : ''
      }`,
    });
  });
}

function plotRadar(outages: LooseRecord, pinned: Set<string>, ctx: PlotContext): void {
  recs(asRec(outages.radar).annotations).forEach((a) => {
    const alat = numOrNull(a.lat);
    const cc0 = str(asArr(a.cc)[0]);
    if (alat == null || !cc0 || pinned.has(cc0)) return;
    pinned.add(cc0);
    const isActive = bool(a.active);
    const col = isActive ? COLORS.outageOn : COLORS.outageEnded;
    const names = asArr(a.names);
    const cause = str(a.cause);
    const end = optStr(a.end);
    const start = optStr(a.start);
    ctx.points.push({
      lat: alat,
      lng: num(a.lon),
      size: isActive ? 0.3 : 0.15,
      _r: isActive ? RADIUS.outageMajor : RADIUS.outageEnded,
      color: col,
      _stroke: fadeStroke(col),
      type: 'outage',
      priority: isActive ? 1 : 3,
      ts: end || start,
      url: optStr(a.url),
      popHead: `${str(names[0]) || cc0} internet`,
      popMeta: `Cloudflare Radar · ${cause ? cause.toLowerCase().replace(/_/g, ' ') : 'outage'}${
        isActive ? ' · ongoing' : ' · ended ' + relTime(end || start, ctx.now)
      }`,
      popText: esc(a.desc),
    });
  });
}

export function plotOutages(ctx: PlotContext): void {
  const outages = asRec(ctx.D.outages);
  const countries = recs(outages.countries);
  plotIoda(countries, ctx);
  const pinned = new Set(countries.filter(passesOutage).map((c) => str(c.cc)));
  plotRadar(outages, pinned, ctx);
}
