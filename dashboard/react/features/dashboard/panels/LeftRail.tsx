import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';
import { relTime } from '../format';
import { Panel } from '../Panel';

// Left rail, ported from renderLeftRail() in jarvis.html (1337-1390). The three cards each export as
// their own component because the legacy layout spreads them across two rows (`pSensor` in row-a,
// `pNuclear` and `pRisk` in row-b), so the dashboard layout can place them independently. `LeftRail`
// remains a convenience wrapper. Every visible label goes through the dashboard translator with the
// same dotted keys (and English fallbacks) the legacy used; data fields stay loosely typed and are
// coerced at the edges because SweepData mirrors the synthesized envelope deliberately loosely.

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

export interface LeftRailProps {
  data: SweepData;
  t?: Translator;
}

/** Coerce a loose record field to an object, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose record field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce to a finite number, falling back to `d` (legacy `||` behaviour for zero/absent). */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Only call `t.has` when the translator actually exposes it. */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

/** Build the legacy `t(key, fallback)` view: locale value when present, else fallback then key. */
function makeLabel(t: Translator | undefined): Label {
  return (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));
}

/** Sensor grid card (`pSensor`). */
export function SensorGrid({ data, t }: LeftRailProps) {
  const tr = makeLabel(t);

  const airArr = asArr(data.air);
  const airMeta = asRec(data.airMeta);
  const thermalArr = asArr(data.thermal);
  const thermalMeta = asRec(data.thermalMeta);
  const sdr = asRec(data.sdr);
  const chokeArr = asArr(data.chokepoints);
  const maritimeMeta = asRec(data.maritimeMeta);
  const maritimeSummary = asRec(maritimeMeta.summary);
  const nukeArr = asArr(data.nuke);
  const gdelt = asRec(data.gdelt);
  const gdeltWindow = asRec(gdelt.window);
  const disasters = asRec(data.disasters);
  const outages = asRec(data.outages);
  const healthWatch = asRec(data.healthWatch);
  const space = asRec(data.space);

  const totalAir = airArr.reduce((s, a) => s + num(a.total), 0);
  const totalThermal = thermalArr.reduce((s, r) => s + num(r.det), 0);
  const totalNight = thermalArr.reduce((s, r) => s + num(r.night), 0);
  const newsCount = asArr(data.news).length;
  const conflictEvents = num(gdelt.conflictEvents);
  const conflictSub = conflictEvents
    ? `GDELT \u00b7 last ${num(gdeltWindow.hours) || 6}h`
    : 'GDELT \u00b7 no events';

  const layers: { name: string; count: number | string; dot: string; sub: string }[] = [
    {
      name: tr('layers.airActivity', 'Air Activity'),
      count: totalAir,
      dot: 'air',
      sub: `${airArr.length} ${tr('layers.theaters', 'theaters')}${num(airMeta.militaryTotal) ? ` \u00b7 ${num(airMeta.militaryTotal)} military` : ''}`,
    },
    {
      name: tr('layers.thermalSpikes', 'Thermal Spikes'),
      count: totalThermal.toLocaleString(),
      dot: 'thermal',
      sub: thermalMeta.error && !totalThermal
        ? tr('layers.thermalDown', 'feed unavailable')
        : `${totalNight.toLocaleString()} ${tr('layers.nightDet', 'night det.')}${
            thermalMeta.window ? ` \u00b7 ${str(thermalMeta.window)}` : ''
          }${Array.isArray(thermalMeta.satellites) && thermalMeta.satellites.length ? ` \u00b7 ${thermalMeta.satellites.length} sats` : ''}`,
    },
    {
      name: tr('layers.sdrCoverage', 'SDR Coverage'),
      count: num(sdr.total),
      dot: 'sdr',
      sub: sdr.error
        ? tr('layers.sdrDown', 'directory unavailable')
        : num(sdr.probed)
          ? `${num(sdr.online)}/${num(sdr.probed)} ${tr('layers.onlineInZones', 'online in watched zones')} \u00b7 ${num(sdr.users)} ${tr('layers.listeners', 'listeners')}`
          : tr('layers.listed', 'listed receivers'),
    },
    {
      name: tr('layers.maritimeWatch', 'Maritime Watch'),
      count: chokeArr.length,
      dot: 'maritime',
      sub: maritimeMeta.summary
        ? `${num(maritimeSummary.disrupted)} ${tr('layers.disrupted', 'disrupted')} \u00b7 ${
            num(maritimeSummary.reduced) + num(maritimeSummary.elevated) + num(maritimeSummary.watch)
          } ${tr('layers.abnormal', 'abnormal')}${
            maritimeMeta.asOf ? ` \u00b7 ${relTime(`${str(maritimeMeta.asOf)}T12:00:00Z`).replace(' ago', '')} lag` : ''
          }`
        : tr('layers.chokepoints', 'chokepoints'),
    },
    {
      name: tr('layers.nuclearSites', 'Nuclear Sites'),
      count: nukeArr.reduce((a, s) => a + num(s.n), 0),
      dot: 'nuke',
      sub: `${nukeArr.filter((s) => s.coverage === 'live').length}/${nukeArr.length} ${tr('layers.sitesLive', 'sites live')}`,
    },
    {
      name: tr('layers.conflictEvents', 'Conflict Events'),
      count: conflictEvents.toLocaleString(),
      dot: 'thermal',
      sub: conflictSub,
    },
    {
      name: 'Disasters',
      count: asArr(disasters.events).length,
      dot: 'disaster',
      sub: `${num(asRec(disasters.counts).red)} red \u00b7 GDACS`,
    },
    {
      name: 'Internet outages',
      count: asArr(outages.countries).filter((c) => c.national).length,
      dot: 'outage',
      sub: `${num(asRec(outages.counts).critical)} alerts \u00b7 24h`,
    },
    {
      name: tr('layers.healthWatch', 'Health Watch'),
      count: asArr(healthWatch.outbreaks).length,
      dot: 'health',
      sub: `${tr('layers.whoOutbreaks', 'WHO outbreaks')} \u00b7 ${asArr(healthWatch.travel).filter((n) => num(n.level) >= 2).length} CDC L2+`,
    },
    {
      name: tr('layers.worldNews', 'World News'),
      count: newsCount,
      dot: 'news',
      sub: tr('layers.rssGeolocated', 'RSS geolocated'),
    },
    {
      name: tr('layers.spaceActivity', 'Satellites'),
      count: num(space.militarySats),
      dot: 'space',
      sub: `${num(space.totalNewObjects)} ${tr('space.newLast30d', 'new (30d)')}`,
    },
  ];

  return (
    <Panel
      id="pSensor"
      title={tr('panels.sensorGrid', 'Sensor grid')}
      badge={`${layers.length} feeds`}
      bodyClass="pad-sm"
      flex="1 1 260px"
    >
      {layers.map((l, i) => (
        <div className="layer-item" key={`${l.name}-${i}`}>
          <div className="layer-left">
            <div className={`ldot ${l.dot}`} />
            <div>
              <div className="layer-name">{l.name}</div>
              <div className="layer-sub">{l.sub}</div>
            </div>
          </div>
          <div className="layer-count">{l.count}</div>
        </div>
      ))}
    </Panel>
  );
}

/** Nuclear watch card (`pNuclear`). */
export function NuclearWatch({ data, t }: LeftRailProps) {
  const tr = makeLabel(t);

  const nukeArr = asArr(data.nuke);
  const nukeMeta = asRec(data.nukeMeta);
  const liveSites = nukeArr.filter((s) => s.coverage === 'live');
  const darkSites = nukeArr.filter((s) => s.coverage !== 'live');
  const allNormal = nukeArr.every((s) => !s.anom);
  const nukeSensorsN = liveSites.reduce((a, s) => a + num(s.n), 0);
  const nukeNewest = liveSites.map((s) => str(s.last)).filter(Boolean).sort().pop();

  const nukeStatus = nukeMeta.error
    ? `\u26a0 ${tr('nuclear.feedDown', 'Sensor feed unavailable')}`
    : liveSites.length === 0
      ? tr('nuclear.noLive', 'No live sensors')
      : allNormal
        ? `\u25cf ${tr('nuclear.allSitesNormal', 'All sites normal')}`
        : `\u26a0 ${tr('nuclear.anomalyDetected', 'Anomaly detected')}`;
  const nukeStatusClass = allNormal && liveSites.length && !nukeMeta.error ? 'ok' : 'anom';

  return (
    <Panel
      id="pNuclear"
      title={tr('panels.nuclearWatch', 'Nuclear watch')}
      badge={`${nukeSensorsN} sensors${nukeNewest ? ` \u00b7 ${relTime(nukeNewest)}` : ''}`}
      flex="1 1 240px"
    >
      <div className={`nuke-ok ${nukeStatusClass}`}>
        {nukeStatus}
        <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.75 }}>median · CPM</span>
      </div>
      {liveSites.map((s, i) => (
        <NukeSiteRow key={`${str(s.site)}-${i}`} site={s} />
      ))}
      {darkSites.length ? (
        <div className="site-row" style={{ color: 'var(--text-2)', fontSize: '11.5px' }}>
          <span>
            {tr('nuclear.noSensors', 'No public sensors')}:{' '}
            {darkSites.map((s) => str(s.site).replace(/ \(.*\)$/, '')).join(', ')}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

/** Risk gauges card (`pRisk`). */
export function RiskGauges({ data, t }: LeftRailProps) {
  const tr = makeLabel(t);

  const fred = asArr(data.fred);
  const fredById = (id: string) => fred.find((f) => f.id === id);
  const vix = fredById('VIXCLS');
  const hy = fredById('BAMLH0A0HYM2');
  const usd = fredById('DTWEXBGS');
  const m2 = fredById('M2SL');
  const mort = fredById('MORTGAGE30US');
  const claims = fredById('ICSA');
  const fredAsOf = [vix, hy, usd, claims, mort].map((f) => str(f?.date)).filter(Boolean).sort().pop();

  const vixVal = vix?.value;
  const vixText = vixVal != null && vixVal !== 0 ? String(vixVal) : '--';
  const hyVal = hy?.value;
  const hyText = hyVal != null ? `${Number(hyVal).toFixed(2)}%` : '--';
  const usdText = usd?.value != null ? Number(usd.value).toFixed(1) : '--';
  const claimsText = claims?.value != null ? Number(claims.value).toLocaleString() : '--';
  const mortText = `${mort?.value ? String(mort.value) : '--'}%`;
  const m2Raw = m2?.value != null ? Number(m2.value) : null;
  const m2Text = m2Raw != null && Number.isFinite(m2Raw) ? `$${(m2Raw / 1000).toFixed(1)}T` : '--';
  const debtRaw = asRec(data.treasury).totalDebt;
  const debtNum = Number.parseFloat(str(debtRaw));
  const debtText = Number.isFinite(debtNum) ? `$${(debtNum / 1e12).toFixed(2)}T` : '--';

  return (
    <Panel
      id="pRisk"
      title={tr('panels.riskGauges', 'Risk gauges')}
      badge={fredAsOf ? `FRED \u00b7 ${fredAsOf.slice(5).replace('-', '/')}` : 'Stress'}
      flex="1 1 240px"
    >
      <div className="econ-row" title={vix && str(vix.date) ? `CBOE VIX close ${str(vix.date)}` : undefined}>
        <span className="elabel">{tr('metrics.vix', 'VIX')}</span>
        <span className="eval" style={{ color: num(vixVal) > 20 ? 'var(--warn)' : 'var(--accent)' }}>
          {vixText}
        </span>
      </div>
      <div className="econ-row" title={hy && str(hy.date) ? `ICE BofA US High Yield option-adjusted spread ${str(hy.date)}` : undefined}>
        <span className="elabel">{tr('metrics.hySpread', 'HY spread')}</span>
        <span className="eval" style={{ color: num(hyVal) > 5 ? 'var(--warn)' : 'inherit' }}>
          {hyText}
        </span>
      </div>
      <div className="econ-row">
        <span className="elabel">{tr('metrics.usdIndex', 'USD index')}</span>
        <span className="eval">{usdText}</span>
      </div>
      <div className="econ-row">
        <span className="elabel">{tr('metrics.joblessClaims', 'Jobless claims')}</span>
        <span className="eval">{claimsText}</span>
      </div>
      <div className="econ-row">
        <span className="elabel">{tr('metrics.mortgage30y', '30Y mortgage')}</span>
        <span className="eval">{mortText}</span>
      </div>
      <div className="econ-row">
        <span className="elabel">{tr('metrics.m2Supply', 'M2 supply')}</span>
        <span className="eval">{m2Text}</span>
      </div>
      <div className="econ-row">
        <span className="elabel">{tr('metrics.natDebt', 'Nat. debt')}</span>
        <span className="eval">{debtText}</span>
      </div>
    </Panel>
  );
}

/** Convenience wrapper: the three left-rail cards in their legacy order. */
export function LeftRail({ data, t }: LeftRailProps) {
  return (
    <>
      <SensorGrid data={data} t={t} />
      <NuclearWatch data={data} t={t} />
      <RiskGauges data={data} t={t} />
    </>
  );
}

/** One live radiation site row, mirroring the legacy markup and tooltip (jarvis.html 1371). */
function NukeSiteRow({ site }: { site: Rec }) {
  const siteName = str(site.site);
  const n = num(site.n);
  const usvhRaw = site.usvh;
  const usvh = usvhRaw != null ? `${num(usvhRaw) < 0.01 ? '<0.01' : num(usvhRaw).toFixed(2)} µSv/h` : '';
  const cpm = site.cpm != null ? `${Math.round(num(site.cpm))} CPM` : '--';
  const hot = num(site.hot);
  const nearest = site.nearest ? asRec(site.nearest) : null;

  const title =
    `${siteName} · ${usvh} median · ${n} live sensor${n > 1 ? 's' : ''} within ${num(site.radiusKm)} km · nearest ` +
    `${nearest ? `${str(nearest.name)} (${num(nearest.distanceKm)} km)` : ''}` +
    `${site.last ? ` · latest ${relTime(str(site.last))}` : ''}` +
    `${site.note ? ` · ${str(site.note)}` : ''}`;

  const flag = site.anom
    ? <span style={{ color: 'var(--danger)' }}>▲</span>
    : hot
      ? (
        <span style={{ color: 'var(--warn)' }} title={`${hot} sensor${hot > 1 ? 's' : ''} above ${num(site.alertUsvh)} µSv/h`}>
          ▲
        </span>
      )
      : null;

  return (
    <div className="site-row" title={title}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {siteName.replace(/ \(.*\)$/, '').replace('Exclusion Zone', 'zone')}
        <span style={{ color: 'var(--text-2)', fontSize: '11px' }}> · {n}</span>
      </span>
      <span className="site-val" style={{ whiteSpace: 'nowrap' }}>
        {cpm}
        {flag ? <>{' '}{flag}</> : null}
      </span>
    </div>
  );
}
