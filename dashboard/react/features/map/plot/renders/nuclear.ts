import { COLORS, NUKE_FALLBACK, RADIUS } from '../consts';
import type { LooseRecord, PlotContext } from '../types';
import { asRec, bool, dimSpan, esc, fmtUsvh, num, numOrNull, optStr, recs, relTime, str } from '../utils';

function liveSiteText(n: LooseRecord, now: number): string {
  const anom = bool(n.anom);
  const hot = num(n.hot);
  const nearest = n.nearest ? asRec(n.nearest) : null;
  const last = optStr(n.last);
  const status = anom ? 'ANOMALY' : hot ? 'Normal · ' + hot + ' hot sensor' + (hot > 1 ? 's' : '') : 'Normal';
  return `Status: <b>${status}</b><br>Median: ${Math.round(num(n.cpm))} CPM · ${fmtUsvh(n.usvh)}<br>Max: ${
    n.maxCpm != null ? Math.round(num(n.maxCpm)) + ' CPM · ' : ''
  }${fmtUsvh(n.maxUsvh)}<br>${num(n.n)} live sensors within ${num(n.radiusKm)} km${
    nearest ? `<br>Nearest: ${esc(nearest.name)} (${num(nearest.distanceKm)} km) ${Math.round(num(nearest.cpm))} CPM` : ''
  }${last ? `<br>Latest reading ${relTime(last, now)}` : ''}${n.note ? `<br>${dimSpan(esc(n.note), '0.7')}` : ''}`;
}

function siteText(n: LooseRecord, nukeMeta: LooseRecord, now: number): string {
  const coverage = str(n.coverage);
  if (coverage === 'live') return liveSiteText(n, now);
  const radiusKm = num(n.radiusKm);
  if (coverage === 'none') {
    return `No public radiation sensors within ${radiusKm} km.${n.note ? '<br>' + dimSpan(esc(n.note), '0.7') : ''}`;
  }
  const last = optStr(n.last);
  return `No live sensor readings within ${radiusKm} km in the last ${num(nukeMeta.windowDays) || 30} days${
    last ? `<br>Last known reading: ${new Date(last).toISOString().slice(0, 10)}` : ''
  }`;
}

function siteColor(n: LooseRecord): string {
  if (bool(n.anom)) return COLORS.nukeAnomaly;
  return str(n.coverage) === 'live' ? COLORS.nukeLive : COLORS.nukeIdle;
}

function plotSensors(n: LooseRecord, ctx: PlotContext): void {
  const alertUsvh = numOrNull(n.alertUsvh);
  const site = esc(str(n.site).replace(/ \(.*\)$/, ''));
  recs(n.sensors).forEach((r) => {
    const rlat = numOrNull(r.lat);
    const rlon = numOrNull(r.lon);
    if (rlat == null || rlon == null) return;
    const usvh = numOrNull(r.usvh);
    const isHot = alertUsvh != null && usvh != null && usvh > alertUsvh;
    const at = optStr(r.at);
    ctx.points.push({
      lat: rlat,
      lng: rlon,
      size: 0.14,
      _r: RADIUS.nukeSensor,
      color: isHot ? COLORS.sensorHot : COLORS.sensorNormal,
      _stroke: COLORS.sensorStroke,
      type: 'nuke',
      priority: 3,
      ts: at,
      popHead: esc(str(r.name) || 'Radiation sensor'),
      popMeta: `Safecast sensor · ${num(r.km)} km from ${site}`,
      popText: `${Math.round(num(r.cpm))} CPM · ${fmtUsvh(usvh)}${
        isHot ? ' · <b>above ' + alertUsvh + ' µSv/h</b>' : ''
      }<br>${esc(r.tube || '')}${at ? ` · ${relTime(at, ctx.now)}` : ''}`,
    });
  });
}

export function plotNuclear(ctx: PlotContext): void {
  const nukeMeta = asRec(ctx.D.nukeMeta);
  recs(ctx.D.nuke).forEach((n) => {
    const fb = NUKE_FALLBACK[str(n.key)];
    const lat = numOrNull(n.lat) ?? fb?.lat;
    const lon = numOrNull(n.lon) ?? fb?.lon;
    if (lat == null || lon == null) return;
    ctx.points.push({
      lat,
      lng: lon,
      size: 0.3,
      _r: RADIUS.nukeSite,
      color: siteColor(n),
      _stroke: COLORS.nukeStroke,
      type: 'nuke',
      priority: 2,
      ts: optStr(n.last),
      popHead: str(n.site),
      popMeta: 'Nuclear site · Safecast live sensors',
      popText: siteText(n, nukeMeta, ctx.now),
    });
    plotSensors(n, ctx);
  });
}
