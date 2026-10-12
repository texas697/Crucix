// Maritime watch — chokepoint traffic from the IMF PortWatch open data (no key) plus the AIS stream hint.
//
// PortWatch (portwatch.imf.org, IMF + Oxford) derives daily vessel transit counts for 28 maritime chokepoints
// from satellite AIS, published as public ArcGIS feature services. Each sweep pulls:
//   - the chokepoint registry (positions, yearly vessel totals)
//   - the last 28 days of daily transits per chokepoint
//   - a one-year baseline (average transits per day) per chokepoint
//   - the disruption event list (ongoing conflicts, cyclones, earthquakes affecting ports / chokepoints)
// and turns them into a per-chokepoint status: 7-day transits per day vs the yearly baseline, trend vs the prior
// week, tanker share, and any active disruption event naming the chokepoint.
//
// With AISSTREAM_API_KEY set, lib/ais/stream.mjs keeps a WebSocket to aisstream.io open and live vessel counts
// (last hour) are joined onto each chokepoint here.

import { aisSnapshotAsync, aisEnabled } from '../../lib/ais/stream.mjs';

const PORTWATCH = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services';
const UA = 'Crucix/2.0 (MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)';
const TIMEOUT_MS = parseInt(process.env.PORTWATCH_TIMEOUT_MS) || 15000;
const RECENT_DAYS = 28;
const BASELINE_DAYS = 365;

// Editorial notes for the chokepoints the dashboard labels on the map. Everything else PortWatch tracks is plotted
// without a label.
const NOTES = {
  chokepoint6: 'Strait of Hormuz — Gulf oil and LNG exit; roughly a fifth of world oil',
  chokepoint1: 'Suez Canal — Europe–Asia shortcut, about 12% of world trade',
  chokepoint4: 'Bab el-Mandeb — Red Sea gateway to Suez',
  chokepoint5: 'Malacca Strait — Indian Ocean to South China Sea, about a quarter of traded goods',
  chokepoint11: 'Taiwan Strait — East Asian container traffic',
  chokepoint3: 'Bosporus — Black Sea access for Ukrainian and Russian grain and oil',
  chokepoint2: 'Panama Canal — Atlantic–Pacific shortcut, drought-sensitive',
  chokepoint7: 'Cape of Good Hope — the Suez alternative when the Red Sea is unsafe',
  chokepoint8: 'Gibraltar Strait — Mediterranean entrance',
  chokepoint9: 'Dover Strait — busiest shipping lane in the world',
  chokepoint12: 'Korea Strait — Japan–Korea–China traffic',
  chokepoint28: 'Kerch Strait — Sea of Azov access, Russian-controlled',
  chokepoint14: 'Luzon Strait — Pacific entry to the South China Sea',
  chokepoint10: 'Oresund — Baltic Sea entrance',
};
const MAJOR = new Set(Object.keys(NOTES));

const iso = d => new Date(d).toISOString().slice(0, 10);
const round1 = v => (v == null || !Number.isFinite(v)) ? null : Math.round(v * 10) / 10;

async function arcgis(service, params) {
  const sp = new URLSearchParams({ f: 'json', ...params });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PORTWATCH}/${service}/FeatureServer/0/query?${sp}`, { signal: controller.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data.error) return { error: data.error.message || 'ArcGIS error' };
    return { features: (data.features || []).map(f => f.attributes), exceeded: !!data.exceededTransferLimit };
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === 'AbortError' ? `timeout after ${TIMEOUT_MS} ms` : e.message };
  }
}

function fetchRegistry() {
  return arcgis('PortWatch_chokepoints_database', { where: '1=1', outFields: 'portid,portname,lat,lon,vessel_count_total,vessel_count_tanker,industry_top1', resultRecordCount: 100 });
}
function fetchRecent(sinceDate) {
  return arcgis('Daily_Chokepoints_Data', {
    where: `date>=DATE '${sinceDate}'`, outFields: 'date,portid,portname,n_total,n_tanker,n_container,n_dry_bulk,capacity',
    orderByFields: 'date DESC', resultRecordCount: 1000,
  });
}
function fetchBaseline(fromDate, toDate) {
  const stats = [
    { statisticType: 'avg', onStatisticField: 'n_total', outStatisticFieldName: 'avg_total' },
    { statisticType: 'avg', onStatisticField: 'n_tanker', outStatisticFieldName: 'avg_tanker' },
    { statisticType: 'avg', onStatisticField: 'capacity', outStatisticFieldName: 'avg_capacity' },
    { statisticType: 'count', onStatisticField: 'n_total', outStatisticFieldName: 'days' },
  ];
  return arcgis('Daily_Chokepoints_Data', { where: `date>=DATE '${fromDate}' AND date<DATE '${toDate}'`, groupByFieldsForStatistics: 'portid', outStatistics: JSON.stringify(stats) });
}
function fetchDisruptions(sinceDate) {
  return arcgis('portwatch_disruptions_database', {
    where: `todate IS NULL OR todate>=DATE '${sinceDate}'`,
    outFields: 'eventid,eventtype,htmlname,htmldescription,alertlevel,country,fromdate,todate,severitytext,lat,long,affectedports,n_affectedports',
    orderByFields: 'fromdate DESC', resultRecordCount: 200,
  });
}

const EVENT_TYPES = { OT: 'Trade disruption', TC: 'Tropical cyclone', EQ: 'Earthquake', FL: 'Flood', WF: 'Wildfire', VO: 'Volcano', DR: 'Drought', TS: 'Tsunami' };

export function analyze({ registry, recent, baseline, disruptions }, now = new Date()) {
  const byId = new Map();
  for (const r of registry) byId.set(r.portid, {
    id: r.portid, label: r.portname, lat: r.lat, lon: r.lon, major: MAJOR.has(r.portid), note: NOTES[r.portid] || null,
    yearlyVessels: r.vessel_count_total || null, topIndustry: r.industry_top1 || null,
  });
  const base = new Map(baseline.map(b => [b.portid, b]));
  const rows = new Map();
  for (const r of recent) { if (!rows.has(r.portid)) rows.set(r.portid, []); rows.get(r.portid).push(r); }
  const latestDate = recent.map(r => r.date).sort().pop() || null;

  const active = disruptions.map(d => ({
    id: d.eventid, type: EVENT_TYPES[d.eventtype] || d.eventtype, name: d.htmlname, text: d.htmldescription, level: d.alertlevel,
    country: d.country || null, from: d.fromdate ? iso(d.fromdate) : null, to: d.todate ? iso(d.todate) : null, ongoing: !d.todate,
    severity: d.severitytext || null, lat: d.lat, lon: d.long,
    affected: String(d.affectedports || '').split(';').map(s => s.trim()).filter(Boolean),
  }));

  const chokepoints = {};
  for (const [id, cp] of byId) {
    const list = (rows.get(id) || []).sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
    const last7 = list.slice(0, 7), prior7 = list.slice(7, 14), last28 = list.slice(0, 28);
    const avg = (arr, k) => arr.length ? arr.reduce((s, r) => s + (r[k] || 0), 0) / arr.length : null;
    const b = base.get(id);
    const perDay7 = avg(last7, 'n_total'), perDayPrior = avg(prior7, 'n_total'), perDay28 = avg(last28, 'n_total');
    const baseline365 = b?.avg_total ?? null;
    const pctVsBaseline = perDay7 != null && baseline365 ? Math.round((perDay7 / baseline365 - 1) * 100) : null;
    const trend7 = perDay7 != null && perDayPrior ? Math.round((perDay7 / perDayPrior - 1) * 100) : null;
    const tanker7 = avg(last7, 'n_tanker');
    const events = active.filter(e => e.affected.includes(id));
    // disrupted: traffic well below the yearly average (an open event with normal traffic is only a watch);
    // reduced / elevated: moderate departures; watch: PortWatch has an open event but ships are still moving.
    const openEvent = events.some(e => e.ongoing);
    let status = 'normal';
    if (pctVsBaseline != null && pctVsBaseline <= -40) status = 'disrupted';
    else if (pctVsBaseline != null && pctVsBaseline <= -20) status = 'reduced';
    else if (openEvent && pctVsBaseline != null && pctVsBaseline <= -10) status = 'reduced';
    else if (openEvent) status = 'watch';
    else if (pctVsBaseline != null && pctVsBaseline >= 30) status = 'elevated';
    chokepoints[id] = {
      ...cp,
      status,
      transits: {
        latestDate: list[0]?.date || null,
        latest: list[0]?.n_total ?? null,
        perDay7: round1(perDay7), perDayPrior7: round1(perDayPrior), perDay28: round1(perDay28),
        baseline365: round1(baseline365), baselineDays: b?.days || 0,
        pctVsBaseline, trend7Pct: trend7,
        tankerPerDay7: round1(tanker7), tankerShare7: perDay7 ? Math.round(100 * (tanker7 || 0) / perDay7) : null,
        capacityPerDay7: last7.length ? Math.round(avg(last7, 'capacity')) : null,
        daily: last28.map(r => ({ d: r.date, n: r.n_total, t: r.n_tanker })).reverse(),
      },
      events: events.map(e => ({ name: e.name, type: e.type, level: e.level, from: e.from, to: e.to, ongoing: e.ongoing })),
    };
  }

  const list = Object.values(chokepoints);
  const disrupted = list.filter(c => c.status === 'disrupted').sort((a, b) => (a.transits.pctVsBaseline ?? 0) - (b.transits.pctVsBaseline ?? 0));
  const reduced = list.filter(c => c.status === 'reduced');
  const elevated = list.filter(c => c.status === 'elevated');
  const watch = list.filter(c => c.status === 'watch');
  const signals = [];
  for (const c of disrupted) {
    const ev = c.events.find(e => e.ongoing);
    signals.push(`CHOKEPOINT DISRUPTED: ${c.label} at ${c.transits.perDay7 ?? '?'} transits/day, ${c.transits.pctVsBaseline != null ? (c.transits.pctVsBaseline > 0 ? '+' : '') + c.transits.pctVsBaseline + '% vs 1-yr average' : 'no baseline'}${ev ? ` — ${ev.name} since ${ev.from}` : ''}`);
  }
  for (const c of reduced) signals.push(`${c.label}: transits ${c.transits.pctVsBaseline}% below the 1-yr average (${c.transits.perDay7}/day)`);
  for (const c of elevated) signals.push(`${c.label}: transits ${c.transits.pctVsBaseline}% above the 1-yr average (${c.transits.perDay7}/day)`);
  for (const c of watch) { const ev = c.events.find(e => e.ongoing); signals.push(`${c.label}: ${ev?.name || 'disruption event'} open since ${ev?.from || '?'}, traffic near normal (${c.transits.perDay7}/day, ${c.transits.pctVsBaseline > 0 ? '+' : ''}${c.transits.pctVsBaseline}%)`); }
  const natural = active.filter(e => e.ongoing && e.type !== 'Trade disruption' && e.affected.length);
  for (const e of natural.slice(0, 3)) signals.push(`${e.type}: ${e.name} affecting ${e.affected.length} port${e.affected.length > 1 ? 's' : ''}`);

  return {
    chokepoints, latestDate, disruptions: active,
    summary: { tracked: list.length, disrupted: disrupted.length, reduced: reduced.length, elevated: elevated.length, watch: watch.length, normal: list.length - disrupted.length - reduced.length - elevated.length - watch.length },
    signals,
    lagDays: latestDate ? Math.round((now - new Date(latestDate)) / 86400000) : null,
  };
}

export async function briefing() {
  const started = Date.now();
  const now = new Date();
  const since = iso(now.getTime() - RECENT_DAYS * 86400000);
  const baseTo = iso(now.getTime() - 7 * 86400000);
  const baseFrom = iso(now.getTime() - (BASELINE_DAYS + 7) * 86400000);
  const eventsSince = iso(now.getTime() - 60 * 86400000);
  const [registry, recent, baseline, disruptions] = await Promise.all([
    fetchRegistry(), fetchRecent(since), fetchBaseline(baseFrom, baseTo), fetchDisruptions(eventsSince),
  ]);
  const hasKey = !!process.env.AISSTREAM_API_KEY;
  const errors = Object.entries({ registry, recent, baseline, disruptions }).filter(([, r]) => r.error).map(([k, r]) => `${k}: ${r.error}`);

  if (registry.error || recent.error) {
    return {
      source: 'Maritime/PortWatch', timestamp: now.toISOString(), status: 'error', access: 'portwatch',
      error: errors.join('; '), chokepoints: {}, signals: [`PortWatch chokepoint data unavailable: ${errors.join('; ')}`],
      ais: { enabled: hasKey },
    };
  }
  const result = analyze({ registry: registry.features, recent: recent.features, baseline: baseline.features || [], disruptions: disruptions.features || [] }, now);
  // Live AIS (last hour) joined onto each chokepoint when the stream is running in this process.
  let ais = { enabled: false, hint: 'Set AISSTREAM_API_KEY (or AIS_RELAY_URL) for live per-vessel tracking (free at aisstream.io)' };
  if (aisEnabled()) {
    const snap = await aisSnapshotAsync({ maxVessels: 0 });
    ais = { enabled: true, connected: !!snap.connected, since: snap.since || null, lastMessageAt: snap.lastMessageAt || null, tracked: snap.tracked || 0, liveVessels: snap.liveVessels || 0, windowMinutes: snap.windowMinutes || 60, lastError: snap.lastError || null, reconnects: snap.reconnects || 0, relay: snap.relayUrl ? 'droplet' : null, stale: !!snap.stale };
    for (const [id, cp] of Object.entries(result.chokepoints)) {
      const b = (snap.boxes || {})[id];
      if (b) cp.live = { vessels: b.vessels, moving: b.moving, anchored: b.anchored, tanker: b.tanker, cargo: b.cargo, passenger: b.passenger, military: b.military, other: b.other };
    }
    // Holding pattern: most of the identified merchant traffic (tankers + cargo) in the strait is stopped.
    const hormuz = result.chokepoints.chokepoint6;
    const hb = (snap.boxes || {}).chokepoint6;
    if (hormuz?.live && hb && hb.merchantStopped != null && hb.merchant >= 15 && hb.merchantStopped / hb.merchant >= 0.6) {
      result.signals.push(`HORMUZ HOLDING PATTERN: ${hb.merchantStopped} of ${hb.merchant} tankers and cargo ships in the strait are stopped or at anchor (AIS, last hour)`);
    }
  }
  return {
    source: 'Maritime/PortWatch',
    timestamp: now.toISOString(),
    status: 'active',
    access: 'portwatch',
    provider: 'IMF PortWatch (satellite AIS-derived daily transit counts)',
    window: { recentDays: RECENT_DAYS, baselineDays: BASELINE_DAYS },
    ...result,
    ...(errors.length ? { warnings: errors } : {}),
    ais,
    durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('ships.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
