import { magColor, relTime } from '../format';
import { Panel } from '../Panel';
import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';

// Row B of the dashboard grid, ported from renderRight() in jarvis.html (2647-2702) plus the helpers
// quakeHtml (2597-2609), outagesHtml (2610-2628), disasterRows (2588-2596), fillIodaCC/magColor/IODA_CC
// (2584-2586). Four cards keep the legacy ids (pCore, pDelta, pQuakes, pOutages) and the shared inline
// flex width (1 1 240px) so the ported CSS keeps applying. Everything renders as React nodes; React
// escapes untrusted feed strings, so no innerHTML anywhere.
//
// The legacy row interleaves these cards with others
// (pCore, pNuclear, pRisk, pDelta, pQuakes, pOutages), so each card is exported as its own component
// (SignalCore, SweepDelta, DisastersPanel, OutagesPanel) and can be placed independently. RowB remains
// as a thin wrapper returning the four in order for callers that just want the whole group.
//
// Region: the legacy filtered every list by the interactive `currentRegion` global (map-driven). These
// panels have no map/region state, so they render the `world` view (no coordinate filtering); the
// region-aware branches collapse to their world case. Quakes arrive via a prop instead of the legacy
// ad-hoc module-level fetch/cache (ensureQuakes), so a missing prop means "still loading".

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

/** One USGS earthquake item, mirroring the shape ensureQuakes() builds (jarvis.html 2630-2640). */
export interface QuakeItem {
  id?: string;
  mag?: number;
  place?: string;
  lat?: number | null;
  lon?: number | null;
  depth?: number | null;
  ts?: string | null;
  url?: string | null;
  tsunami?: number | boolean | null;
  [key: string]: unknown;
}

/** Shared props for the individual row-b cards. */
export interface RowBPanelProps {
  data: SweepData;
  t?: Translator;
}

/** Props for the Disasters card, which additionally takes the USGS quake list. */
export interface DisastersPanelProps extends RowBPanelProps {
  /** USGS M2.5+ quakes; undefined means the feed has not loaded yet (legacy `QUAKES === null`). */
  quakes?: QuakeItem[];
}

/** Props for the full RowB group wrapper. */
export interface RowBProps extends DisastersPanelProps {}

/** GDACS type → glyph, legacy `DISASTER_ICON` (2587). */
const DISASTER_ICON: Record<string, string> = {
  EQ: '\u25B2',
  TC: '\uD83C\uDF00',
  FL: '\u2248',
  VO: '\u25B3',
  DR: '\u2600',
  WF: '\uD83D\uDD25',
};

/** Coerce a loose record field to an object, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose record field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce a loose field to an array of display strings. */
function asStrArr(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str) : [];
}

/** Coerce to a finite number, falling back to `d` (legacy `||` behaviour for zero/absent). */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Only call `t.has` when the translator actually exposes it. */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

/**
 * Build the legacy `t(key, fallback)` label lookup: returns the fallback (then the key) when the
 * locale lacks the key, and `(k, d) => d ?? k` when no translator was injected.
 */
function makeLabel(t: Translator | undefined): Label {
  return (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));
}

// === SIGNAL CORE =================================================================================
export function SignalCore({ data, t }: RowBPanelProps) {
  const tr = makeLabel(t);
  const coreRows: { l: string; v: number; p: number }[] = [
    // Live tracks came from the separate tracker feed (TRACKS), which this panel group has no source
    // for; it reports 0 until a tracks prop exists (legacy renderRight 2673).
    { l: 'Live tracks', v: 0, p: 70 },
    { l: 'Air theaters', v: asArr(data.air).length, p: 60 },
    { l: 'Thermal spikes', v: asArr(data.thermal).reduce((s, r) => s + num(r.hc), 0), p: 80 },
    { l: 'SDR nodes', v: num(asRec(data.sdr).total), p: 92 },
    { l: 'Chokepoints', v: asArr(data.chokepoints).length, p: 50 },
    { l: 'Outbreaks', v: asArr(asRec(data.healthWatch).outbreaks).length, p: 40 },
  ];

  return (
    <Panel
      id="pCore"
      title={tr('panels.signalCore', 'Signal core')}
      badge="Hot metrics"
      flex="1 1 240px"
    >
      {coreRows.map((c) => (
        <div className="sm" key={c.l}>
          <div className="sm-top">
            <span className="sml">{c.l}</span>
            <span className="smv">{c.v}</span>
          </div>
          <div className="smb">
            <span style={{ width: `${c.p}%` }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

// === SWEEP DELTA =================================================================================
export function SweepDelta({ data, t }: RowBPanelProps) {
  const tr = makeLabel(t);
  const delta = asRec(data.delta);
  const summary = asRec(delta.summary);
  const signals = asRec(delta.signals);
  const hasDelta = num(summary.totalChanges) > 0;
  const direction = str(summary.direction);
  const dirClass = ({ 'risk-off': 'up', 'risk-on': 'down', mixed: '' } as Record<string, string>)[direction] || '';
  const dirText = direction ? tr(`delta.${direction}`, direction.toUpperCase()) : tr('delta.baseline', 'Baseline');

  const newSigs = asArr(signals.new).slice(0, 4);
  const escalated = asArr(signals.escalated).slice(0, 6);
  const deescalated = asArr(signals.deescalated).slice(0, 4);

  const deltaRowNodes = [
    ...newSigs.map((s, i) => (
      <div className="delta-row" key={`new-${i}`}>
        <span className="ddot" style={{ background: 'var(--accent)' }} />
        <span className="delta-label">{str(s.reason) || str(s.label) || str(s.key)}</span>
      </div>
    )),
    ...escalated.map((s, i) => {
      const sev = s.severity === 'critical'
        ? { color: 'var(--warn)', fontWeight: 600 }
        : s.severity === 'high'
          ? { color: '#f59a5e' }
          : undefined;
      const val = s.pctChange !== undefined
        ? `${num(s.pctChange) > 0 ? '+' : ''}${num(s.pctChange)}%`
        : `${num(s.change) > 0 ? '+' : ''}${num(s.change)}`;
      return (
        <div className="delta-row" key={`esc-${i}`}>
          <span className="ddot" style={{ background: 'var(--mint)' }} />
          <span className="delta-label" style={sev}>{str(s.label)}</span>
          <span className="delta-val">{str(s.from)}→{str(s.to)} ({val})</span>
        </div>
      );
    }),
    ...deescalated.map((s, i) => {
      const val = s.pctChange !== undefined ? `${num(s.pctChange)}%` : `${num(s.change)}`;
      return (
        <div className="delta-row" key={`deesc-${i}`}>
          <span className="ddot" style={{ background: 'var(--danger)' }} />
          <span className="delta-label">{str(s.label) || str(s.key)}</span>
          <span className="delta-val">{str(s.from)}→{str(s.to)} ({val})</span>
        </div>
      );
    }),
  ];

  return (
    <Panel
      id="pDelta"
      title={tr('panels.sweepDelta', 'Sweep delta')}
      headExtra={<span className={`badge ${dirClass}`}>{dirText}</span>}
      flex="1 1 240px"
    >
      {hasDelta ? (
        <div className="delta-stats">
          <div className="delta-stat">
            <span className="k">{tr('delta.changes', 'Changes')}</span>
            <span className="v">{num(summary.totalChanges)}</span>
          </div>
          <div className="delta-stat">
            <span className="k">{tr('delta.critical', 'Critical')}</span>
            <span className="v">{num(summary.criticalChanges)}</span>
          </div>
          <div className="delta-stat">
            <span className="k">{tr('delta.new', 'New')}</span>
            <span className="v">{num(asRec(summary.signalBreakdown).new)}</span>
          </div>
        </div>
      ) : null}
      <div className="delta-list">
        {hasDelta ? deltaRowNodes : (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--dim)', fontFamily: 'var(--sans)', fontSize: 12 }}>
            {tr('delta.noChanges', 'No changes since last sweep')}
          </div>
        )}
      </div>
    </Panel>
  );
}

// === DISASTERS (GDACS + USGS) ====================================================================
export function DisastersPanel({ data, t, quakes }: DisastersPanelProps) {
  const tr = makeLabel(t);
  const disasters = asRec(data.disasters);
  const disasterEvents = asArr(disasters.events);
  const disasterCounts = asRec(disasters.counts);
  const hasGdacs = disasterEvents.length > 0;

  const gdacsRows = disasterEvents.slice(0, 6).map((e, i) => {
    const type = str(e.type);
    const icon = DISASTER_ICON[type] || type;
    const red = e.level === 'Red';
    const url = str(e.url);
    const countries = asStrArr(e.countries);
    const title = `${str(e.sev)}${countries.length > 1 ? ` · ${countries.join(', ')}` : ''}`;
    const meta = e.current
      ? <span style={{ color: '#ff8a5c' }}>live</span>
      : relTime(str(e.to) || str(e.from));
    return (
      <a
        className="quake-row"
        key={`gdacs-${i}`}
        href={url || undefined}
        target="_blank"
        rel="noopener"
        title={title}
      >
        <span
          className="quake-mag"
          style={{
            background: red ? 'rgba(255,107,116,0.14)' : 'rgba(255,138,92,0.14)',
            color: red ? 'var(--danger)' : '#ff8a5c',
            borderColor: red ? 'rgba(255,107,116,0.4)' : 'rgba(255,138,92,0.4)',
          }}
        >
          {icon}
        </span>
        <span className="quake-place">{str(e.name).replace(/^Tropical Cyclone /, 'TC ')}</span>
        <span className="quake-meta">{meta}</span>
      </a>
    );
  });

  const gdacsHead = hasGdacs ? (
    <>
      <div className="hw-sec" style={{ paddingTop: 2 }}>
        GDACS · {num(disasterCounts.red)} red · {num(disasterCounts.orange)} orange
      </div>
      {gdacsRows}
      <div className="hw-sec">Earthquakes · USGS</div>
    </>
  ) : null;

  const quakeList = (quakes ?? []).map((q) => q as unknown as Rec);
  let quakesBadge = `${disasterEvents.length} GDACS`;
  let quakesBody: React.ReactNode;
  if (quakes === undefined) {
    quakesBody = <>{gdacsHead}<div className="panel-src">Loading quakes…</div></>;
  } else if (!quakeList.length) {
    quakesBody = <>{gdacsHead}<div className="panel-src">No M2.5+ quakes in the last 24h.</div></>;
  } else {
    quakesBadge = `${disasterEvents.length} GDACS · ${quakeList.length} quakes`;
    quakesBody = (
      <>
        {gdacsHead}
        {quakeList.slice(0, hasGdacs ? 5 : 10).map((q, i) => {
          const mc = magColor(num(q.mag));
          const depth = q.depth;
          const tsunami = !!q.tsunami;
          return (
            <a className="quake-row" key={`usgs-${i}`} href={str(q.url) || '#'} target="_blank" rel="noopener">
              <span
                className="quake-mag"
                style={{ background: `${mc}22`, color: mc, borderColor: `${mc}66` }}
              >
                {num(q.mag).toFixed(1)}
              </span>
              <span className="quake-place">{str(q.place)}</span>
              <span className="quake-meta">
                {depth != null ? `${Math.round(num(depth))} km` : ''}
                {tsunami ? <span style={{ color: '#ff8a5c' }}> tsunami</span> : null}
              </span>
            </a>
          );
        })}
        <div className="panel-src">GDACS Orange/Red alerts · USGS M2.5+, past 24h</div>
      </>
    );
  }

  return (
    <Panel
      id="pQuakes"
      title={tr('panels.disasters', 'Disasters')}
      badge={quakesBadge}
      flex="1 1 240px"
    >
      {quakesBody}
    </Panel>
  );
}

// === INTERNET OUTAGES ============================================================================
export function OutagesPanel({ data, t }: RowBPanelProps) {
  const tr = makeLabel(t);
  const outages = asRec(data.outages);
  const countries = asArr(outages.countries);
  const nat = countries.filter((c) => !!c.national);
  const rest = countries
    .filter((c) => !c.national && (c.minor || num(c.regions) >= 2 || num(c.asns) >= 3))
    .sort(
      (a, b) =>
        (num(b.regions) * 3 + num(b.asns) + num(b.drop)) -
        (num(a.regions) * 3 + num(a.asns) + num(a.drop)),
    );

  const outageRow = (c: Rec, key: string) => {
    const national = !!c.national;
    const minor = !!c.minor;
    const cause = str(c.cause);
    const drop = c.drop;
    const regions = num(c.regions);
    const asns = num(c.asns);
    const since = str(c.since);
    const causeShort = cause ? `${cause.split(' (')[0]!.slice(0, 38)}${cause.length > 38 ? '…' : ''}` : '';
    const title =
      `${str(c.name)}: ${national ? `national-level alert on ${asStrArr(c.sources).join(', ')}` : minor ? 'minor country-level dip' : 'sub-national alerts'}` +
      `${regions ? ` · ${regions} regions` : ''}` +
      `${asns ? ` · ${asns} networks` : ''}` +
      `${cause ? ` · Cloudflare: ${cause}` : ''}`;
    return (
      <div className="site-row" title={title} key={key}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {national
            ? <><span style={{ color: '#c084fc' }}>●</span>{' '}</>
            : minor
              ? <><span style={{ color: '#c084fc', opacity: 0.5 }}>○</span>{' '}</>
              : <><span style={{ opacity: 0.4 }}>○</span>{' '}</>}
          {str(c.name)}
          {causeShort
            ? <span style={{ color: 'var(--dim-2)', fontSize: 11 }}> · {causeShort}</span>
            : null}
        </span>
        <span className="site-val" style={{ whiteSpace: 'nowrap' }}>
          {drop != null
            ? (
              <span style={{ color: num(drop) >= 50 ? 'var(--danger)' : num(drop) >= 25 ? 'var(--warn)' : 'var(--text-2)' }}>
                −{num(drop)}%
              </span>
            )
            : null}
          {!national && (regions || asns)
            ? (
              <span style={{ opacity: 0.6, marginLeft: drop != null ? 8 : 0 }}>
                {regions ? `${regions} reg` : ''}{regions && asns ? ' · ' : ''}{asns ? `${asns} net` : ''}
              </span>
            )
            : null}
          {since ? <span style={{ opacity: 0.6, marginLeft: 8 }}>{relTime(since)}</span> : null}
        </span>
      </div>
    );
  };

  const outageError = str(outages.error);
  let outagesBody: React.ReactNode;
  if (outageError) {
    outagesBody = <div className="panel-src">{outageError}</div>;
  } else if (nat.length || rest.length) {
    outagesBody = (
      <>
        {nat.map((c, i) => outageRow(c, `nat-${i}`))}
        {rest.slice(0, 8 - Math.min(nat.length, 8)).map((c, i) => outageRow(c, `rest-${i}`))}
      </>
    );
  } else {
    outagesBody = (
      <div className="panel-src">
        No internet disruptions detected in the last {num(outages.windowHours) || 24}h.
      </div>
    );
  }

  const natBanner = nat.length ? (
    <div className="nuke-ok anom" style={{ color: '#c084fc', background: 'rgba(192,132,252,0.08)' }}>
      ⚠ {str(nat[0]?.name)}{' '}
      {nat[0]?.drop != null ? `−${num(nat[0]?.drop)}% connectivity` : 'national alert'}
      {nat.length > 1 ? ` +${nat.length - 1} more` : ''}
    </div>
  ) : (
    <div className="nuke-ok ok">● No national-scale outages</div>
  );

  const radarRaw = asRec(outages.radar);
  let radar: React.ReactNode = null;
  if (radarRaw.enabled && !radarRaw.error) {
    // One row per place and cause: repeated exam-shutdown style annotations collapse into one row with
    // a count (legacy outagesHtml 2619-2623).
    const grouped: (Rec & { k: string; n: number })[] = [];
    asArr(radarRaw.annotations).forEach((a) => {
      const cc0 = asStrArr(a.cc)[0] ?? '';
      const asns0 = asStrArr(a.asns)[0] ?? '';
      const k = `${cc0 || asns0}|${str(a.cause) || str(a.kind)}`;
      const g = grouped.find((x) => x.k === k && !x.active && !a.active);
      if (g) {
        g.n += 1;
        return;
      }
      grouped.push({ ...a, k, n: 1 } as Rec & { k: string; n: number });
    });
    const ann = grouped.slice(0, 5);
    const where = (a: Rec) =>
      asStrArr(a.names)[0] || asStrArr(a.cc)[0] || asStrArr(a.asns)[0] || 'Unattributed';
    const annRows = ann.map((a, i) => {
      const names = asStrArr(a.names);
      const cause = str(a.cause);
      const causeText = cause
        ? cause.toLowerCase().replace(/_/g, ' ')
        : (str(a.kind) || str(a.type) || 'outage').toLowerCase().replace(/_/g, ' ');
      const label = `${where(a)}${names.length > 1 ? ` +${names.length - 1}` : ''}`;
      return (
        <a
          className="hw-row"
          key={`ann-${i}`}
          href={str(a.url) || undefined}
          target="_blank"
          rel="noopener"
          title={str(a.desc)}
        >
          <span className="hw-main">
            <span className="hw-title">
              {a.active ? <><span style={{ color: '#c084fc' }}>●</span>{' '}</> : null}
              {label} · {causeText}
              {num(a.n) > 1 ? <span style={{ opacity: 0.6 }}> ×{num(a.n)}</span> : null}
            </span>
            <span className="hw-sub">{str(a.desc)}</span>
          </span>
          <span className="hw-sub" style={{ whiteSpace: 'nowrap' }}>
            {a.active ? 'ongoing' : relTime(str(a.end) || str(a.start))}
          </span>
        </a>
      );
    });

    const attacks = asRec(radarRaw.attacks);
    const l7 = asArr(attacks.l7Targets);
    const atLine = l7.length ? (
      <div
        className="site-row"
        title={
          `Share of DDoS attack traffic Cloudflare mitigated in the last 24h, by target country. ` +
          `L7 (HTTP): ${l7.map((x) => `${str(x.name)} ${num(x.pct)}%`).join(', ')}. ` +
          `L3 targets: ${asArr(attacks.l3Targets).map((x) => `${str(x.name)} ${num(x.pct)}%`).join(', ')}. ` +
          `L3 origins: ${asArr(attacks.l3Origins).map((x) => `${str(x.name)} ${num(x.pct)}%`).join(', ')}`
        }
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ opacity: 0.6 }}>DDoS targets 24h</span>{' '}
          {l7.slice(0, 3).map((x, i) => (
            <span key={i}>
              {i > 0 ? ' · ' : ''}
              {str(x.name).replace('United States', 'US').replace('United Kingdom', 'UK')}
              <span style={{ opacity: 0.6 }}> {num(x.pct)}%</span>
            </span>
          ))}
        </span>
      </div>
    ) : null;

    const anomalies = asArr(radarRaw.anomalies);
    if (ann.length || atLine) {
      radar = (
        <>
          <div className="hw-sec">
            Cloudflare Radar
            {anomalies.length
              ? ` · ${anomalies.length} verified anomal${anomalies.length === 1 ? 'y' : 'ies'} 24h`
              : ''}
          </div>
          {annRows}
          {atLine}
        </>
      );
    }
  }

  return (
    <Panel
      id="pOutages"
      title={tr('panels.internetOutages', 'Internet outages')}
      badge={`${num(asRec(outages.counts).critical)} alerts · ${num(outages.windowHours) || 24}h`}
      flex="1 1 240px"
    >
      {natBanner}
      {outagesBody}
      {radar}
      <div className="panel-src">
        IODA · BGP, active probing, darknet · below each country's own baseline
        {radarRaw.enabled ? ' · Cloudflare Radar annotations and DDoS shares' : ''}
      </div>
    </Panel>
  );
}

// === GROUP WRAPPER ===============================================================================
/**
 * Thin wrapper returning the four row-b cards in legacy order. Callers that interleave them with the
 * other row-b cards (pNuclear, pRisk) should compose the named exports directly instead.
 */
export function RowB({ data, t, quakes }: RowBProps) {
  return (
    <>
      <SignalCore data={data} t={t} />
      <SweepDelta data={data} t={t} />
      <DisastersPanel data={data} t={t} quakes={quakes} />
      <OutagesPanel data={data} t={t} />
    </>
  );
}
