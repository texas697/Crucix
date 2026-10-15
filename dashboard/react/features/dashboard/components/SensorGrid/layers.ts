import type { SweepData } from '../../../../api/types';
import { asArr, asRec, num, str } from '../../coerce';
import { relTime } from '../../format';
import type { Label } from '../../label';

export interface SensorLayer {
  name: string;
  count: number | string;
  dot: string;
  sub: string;
}

function thermalSub(thermalMeta: Record<string, unknown>, totalThermal: number, totalNight: number, tr: Label): string {
  if (thermalMeta.error && !totalThermal) return tr('layers.thermalDown', 'feed unavailable');
  const window = thermalMeta.window ? ` · ${str(thermalMeta.window)}` : '';
  const sats = Array.isArray(thermalMeta.satellites) && thermalMeta.satellites.length ? ` · ${thermalMeta.satellites.length} sats` : '';
  return `${totalNight.toLocaleString()} ${tr('layers.nightDet', 'night det.')}${window}${sats}`;
}

function sdrSub(sdr: Record<string, unknown>, tr: Label): string {
  if (sdr.error) return tr('layers.sdrDown', 'directory unavailable');
  if (!num(sdr.probed)) return tr('layers.listed', 'listed receivers');
  return `${num(sdr.online)}/${num(sdr.probed)} ${tr('layers.onlineInZones', 'online in watched zones')} · ${num(sdr.users)} ${tr('layers.listeners', 'listeners')}`;
}

function maritimeSub(maritimeMeta: Record<string, unknown>, tr: Label): string {
  if (!maritimeMeta.summary) return tr('layers.chokepoints', 'chokepoints');
  const s = asRec(maritimeMeta.summary);
  const abnormal = num(s.reduced) + num(s.elevated) + num(s.watch);
  const lag = maritimeMeta.asOf ? ` · ${relTime(`${str(maritimeMeta.asOf)}T12:00:00Z`).replace(' ago', '')} lag` : '';
  return `${num(s.disrupted)} ${tr('layers.disrupted', 'disrupted')} · ${abnormal} ${tr('layers.abnormal', 'abnormal')}${lag}`;
}

export function sensorLayers(data: SweepData, tr: Label): SensorLayer[] {
  const airArr = asArr(data.air);
  const airMeta = asRec(data.airMeta);
  const thermalArr = asArr(data.thermal);
  const thermalMeta = asRec(data.thermalMeta);
  const sdr = asRec(data.sdr);
  const nukeArr = asArr(data.nuke);
  const gdelt = asRec(data.gdelt);
  const disasters = asRec(data.disasters);
  const outages = asRec(data.outages);
  const healthWatch = asRec(data.healthWatch);
  const space = asRec(data.space);
  const totalThermal = thermalArr.reduce((s, r) => s + num(r.det), 0);
  const totalNight = thermalArr.reduce((s, r) => s + num(r.night), 0);
  const conflictEvents = num(gdelt.conflictEvents);
  const military = num(airMeta.militaryTotal) ? ` · ${num(airMeta.militaryTotal)} military` : '';
  return [
    { name: tr('layers.airActivity', 'Air Activity'), count: airArr.reduce((s, a) => s + num(a.total), 0), dot: 'air', sub: `${airArr.length} ${tr('layers.theaters', 'theaters')}${military}` },
    { name: tr('layers.thermalSpikes', 'Thermal Spikes'), count: totalThermal.toLocaleString(), dot: 'thermal', sub: thermalSub(thermalMeta, totalThermal, totalNight, tr) },
    { name: tr('layers.sdrCoverage', 'SDR Coverage'), count: num(sdr.total), dot: 'sdr', sub: sdrSub(sdr, tr) },
    { name: tr('layers.maritimeWatch', 'Maritime Watch'), count: asArr(data.chokepoints).length, dot: 'maritime', sub: maritimeSub(asRec(data.maritimeMeta), tr) },
    { name: tr('layers.nuclearSites', 'Nuclear Sites'), count: nukeArr.reduce((a, s) => a + num(s.n), 0), dot: 'nuke', sub: `${nukeArr.filter((s) => s.coverage === 'live').length}/${nukeArr.length} ${tr('layers.sitesLive', 'sites live')}` },
    { name: tr('layers.conflictEvents', 'Conflict Events'), count: conflictEvents.toLocaleString(), dot: 'thermal', sub: conflictEvents ? `GDELT · last ${num(asRec(gdelt.window).hours) || 6}h` : 'GDELT · no events' },
    { name: 'Disasters', count: asArr(disasters.events).length, dot: 'disaster', sub: `${num(asRec(disasters.counts).red)} red · GDACS` },
    { name: 'Internet outages', count: asArr(outages.countries).filter((c) => c.national).length, dot: 'outage', sub: `${num(asRec(outages.counts).critical)} alerts · 24h` },
    { name: tr('layers.healthWatch', 'Health Watch'), count: asArr(healthWatch.outbreaks).length, dot: 'health', sub: `${tr('layers.whoOutbreaks', 'WHO outbreaks')} · ${asArr(healthWatch.travel).filter((n) => num(n.level) >= 2).length} CDC L2+` },
    { name: tr('layers.worldNews', 'World News'), count: asArr(data.news).length, dot: 'news', sub: tr('layers.rssGeolocated', 'RSS geolocated') },
    { name: tr('layers.spaceActivity', 'Satellites'), count: num(space.militarySats), dot: 'space', sub: `${num(space.totalNewObjects)} ${tr('space.newLast30d', 'new (30d)')}` },
  ];
}
