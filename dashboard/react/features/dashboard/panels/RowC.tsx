import type { ReactNode } from 'react';
import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';
import { getAge, relTime } from '../format';
import { Panel } from '../Panel';

// Row C, ported from renderLower() in jarvis.html (2368-2449): the leverageable ideas list, the
// maritime chokepoint watch and the orbital space watch. The three cards keep the legacy ids
// (pIdeas, pMaritime, pSpace) and legacy inline flex widths so the ported CSS keeps applying, and
// reuse the shared Panel primitive (card-head + card-body). Every label goes through the dashboard
// translator using the same dotted keys and English fallbacks as the legacy; the data fields stay
// loosely typed and are coerced at the edges because SweepData mirrors the synthesized envelope
// deliberately loosely.

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

export interface RowCProps {
  data: SweepData;
  t?: Translator;
  me?: { llm?: unknown } | null;
  onGenerateIdeas?: () => void;
}

/** Coerce a loose record field to an object, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose record field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce to a finite number, falling back to `d`. */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Only call `t.has` when the translator actually exposes it (mirrors LeftRail). */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

export function RowC({ data, t, me, onGenerateIdeas }: RowCProps) {
  // Legacy `t(key, fallback)` returns the fallback (then the key) when the locale lacks the key.
  const tr: Label = (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));

  const meRec = me ?? null;
  const meLlm = meRec ? meRec.llm : null;
  const hasLlm = !!meLlm && typeof meLlm === 'object';

  return (
    <>
      <IdeasPanel
        data={data}
        tr={tr}
        mePresent={!!meRec}
        hasLlm={hasLlm}
        llmProvider={hasLlm ? str(asRec(meLlm).provider) : ''}
        onGenerateIdeas={onGenerateIdeas}
      />
      <MaritimePanel data={data} tr={tr} />
      <SpacePanel data={data} tr={tr} />
    </>
  );
}

// --- Leverageable ideas (jarvis.html 2368-2393, 2420-2421) ------------------------------------------

function IdeasPanel({
  data, tr, mePresent, hasLlm, llmProvider, onGenerateIdeas,
}: {
  data: SweepData;
  tr: Label;
  mePresent: boolean;
  hasLlm: boolean;
  llmProvider: string;
  onGenerateIdeas?: () => void;
}) {
  const ideas = asArr(data.ideas);
  const ideasMeta = asRec(data.ideasMeta);
  const ideasSource = str(data.ideasSource);
  const hasIdeas = ideas.length > 0;

  const ideasBadge = ideasSource === 'mine'
    ? <span className="ideas-src mine">MY {(str(ideasMeta.provider) || 'LLM').toUpperCase()}</span>
    : ideasSource === 'llm'
      ? <span className="ideas-src llm">{tr('ideas.aiEnhanced', 'AI ENHANCED')}</span>
      : ideasSource === 'rules'
        ? <span className="ideas-src static">{tr('ideas.signalBased', 'SIGNAL BASED')}</span>
        : <span className="ideas-src static">{tr('ideas.pending', 'PENDING')}</span>;

  // The legacy header-right action cluster: "Add AI key" without BYOK, else the generate/regenerate
  // button (plus the last-generation age when showing the signed-in user's own ideas).
  let ideasActions: ReactNode = null;
  if (mePresent && !hasLlm) {
    ideasActions = (
      <button type="button" className="ideas-gen" title="Enter your LLM API key for AI-generated ideas">
        {'\u26a1'} Add AI key
      </button>
    );
  } else if (hasLlm) {
    ideasActions = (
      <span className="ideas-actions">
        {ideasSource === 'mine' && ideasMeta.generatedAt
          ? <span className="ideas-meta">{getAge(str(ideasMeta.generatedAt))}</span>
          : null}
        <button type="button" className="ideas-gen" id="ideasGenBtn" onClick={onGenerateIdeas}>
          {hasIdeas ? 'Regenerate' : 'Generate'}
        </button>
      </span>
    );
  }
  const ideasHeadExtra = ideasActions
    ? <span className="ideas-actions" style={{ marginLeft: 'auto' }}>{ideasActions}</span>
    : undefined;

  const body = hasIdeas
    ? (
      <div className="ideas-list">
        {ideas.map((idea, i) => {
          const type = str(idea.type);
          return (
            <article className="idea-card" key={`${type}-${i}`}>
              <div className="idea-meta">
                <span className={`idea-type ${type.toLowerCase()}`}>{type.toUpperCase()}</span>
                {idea.ticker ? <span className="idea-ticker">{str(idea.ticker)}</span> : null}
                {idea.horizon ? <span>{str(idea.horizon)}</span> : null}
                <span>{str(idea.confidence)} confidence</span>
              </div>
              <div className="idea-title">{str(idea.title)}</div>
              <div className="idea-text">{str(idea.text) || str(idea.rationale)}</div>
              {idea.risk ? <div className="idea-risk">Risk {'\u00b7'} {str(idea.risk)}</div> : null}
            </article>
          );
        })}
      </div>
    )
    : (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontFamily: 'var(--sans)', fontSize: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>{'\u26a0'}</div>
        {mePresent
          ? (hasLlm
              ? (
                <>
                  <div>No AI ideas yet</div>
                  <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>Your {llmProvider} key is saved.</div>
                  <div style={{ marginTop: 12 }}>
                    <button type="button" className="ideas-gen" onClick={onGenerateIdeas}>Generate ideas now</button>
                  </div>
                </>
              )
              : (
                <div className="byok-empty">
                  <div className="big">{'\u26a1'} Unlock AI trade ideas</div>
                  <div className="why">The ideas below are rule-based. Enter your own LLM API key and Crucix will have your model read every sweep and write ideas just for you.</div>
                  <button type="button" className="ideas-gen">Enter my API key</button>
                  <div className="providers">ANTHROPIC {'\u00b7'} OPENAI {'\u00b7'} GEMINI {'\u00b7'} OPENROUTER {'\u00b7'} GROK {'\u00b7'} MISTRAL {'\u00b7'} ANY OPENAI-COMPATIBLE</div>
                </div>
              ))
          : (
            <>
              <div>LLM not configured</div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>Set LLM_PROVIDER + credentials in .env to enable AI-powered trade ideas</div>
            </>
          )}
      </div>
    );

  return (
    <Panel
      id="pIdeas"
      title={<>{tr('panels.tradeIdeas', 'Leverageable ideas')}{ideasBadge}</>}
      headExtra={ideasHeadExtra}
      flex="2 1 440px"
    >
      {body}
      <div className="disclosure">For informational purposes only. Not financial advice or a solicitation to buy or sell any security. Observations derive from publicly available OSINT data. Consult a licensed financial advisor before investing.</div>
    </Panel>
  );
}

// --- Maritime watch (jarvis.html 2423-2435) ---------------------------------------------------------

const ORD: Record<string, number> = { disrupted: 0, reduced: 1, watch: 2, elevated: 3, normal: 4 };

function MaritimePanel({ data, tr }: { data: SweepData; tr: Label }) {
  const chokepoints = asArr(data.chokepoints);
  const maritimeMeta = asRec(data.maritimeMeta);
  const shipsMeta = asRec(data.shipsMeta);
  const hasSummary = !!maritimeMeta.summary;
  const summary = asRec(maritimeMeta.summary);

  const rows = chokepoints
    .filter((c) => c.major || c.status === 'disrupted')
    .sort((a, b) => {
      const da = ORD[str(a.status)] ?? 5;
      const db = ORD[str(b.status)] ?? 5;
      return da - db || num(a.pct) - num(b.pct);
    });

  const liveN = num(shipsMeta.liveVessels);
  const badge = hasSummary
    ? (
      <>
        {num(summary.disrupted)} disrupted
        {liveN ? <> {'\u00b7'} <span style={{ color: 'var(--sky)' }}>{liveN} ships live</span></> : null}
        {maritimeMeta.asOf ? <> {'\u00b7'} to {str(maritimeMeta.asOf).slice(5).replace('-', '/')}</> : null}
      </>
    )
    : undefined;

  const disrupted = hasSummary ? num(summary.disrupted) : 0;
  const signals = Array.isArray(maritimeMeta.signals) ? (maritimeMeta.signals as unknown[]).map(str) : [];
  const ongoingSignal = signals.find((x) => /DISRUPTED/.test(x));
  const disruptedText = ongoingSignal
    ? ongoingSignal.replace(/^CHOKEPOINT DISRUPTED: /, '').split(' \u2014 ')[0]
    : '';

  const statusBar = (
    <div className={`nuke-ok ${hasSummary && disrupted ? 'anom' : 'ok'}`} style={{ marginBottom: 6 }}>
      {hasSummary
        ? (disrupted
            ? <>{'\u26a0'} {disruptedText}</>
            : <>{'\u25cf'} All chokepoints near normal</>)
        : 'IMF PortWatch'}
      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.75 }}>ships/day {'\u00b7'} vs 1-yr</span>
    </div>
  );

  const body = rows.length
    ? rows.map((c, i) => <ChokepointRow key={`${str(c.id)}-${i}`} c={c} />)
    : <div className="panel-src">{str(maritimeMeta.error) || 'No chokepoint data'}</div>;

  return (
    <Panel
      id="pMaritime"
      title={tr('panels.maritimeWatch', 'Maritime watch')}
      badge={badge}
      flex="1 1 280px"
    >
      {statusBar}
      {body}
    </Panel>
  );
}

/** One chokepoint row, mirroring the legacy markup and tooltip (jarvis.html 2430). */
function ChokepointRow({ c }: { c: Rec }) {
  const status = str(c.status);
  const statusDot = status === 'disrupted'
    ? <span style={{ color: 'var(--danger)' }}>{'\u25cf'}</span>
    : status === 'reduced'
      ? <span style={{ color: 'var(--warn)' }}>{'\u25cf'}</span>
      : status === 'watch'
        ? <span style={{ color: 'var(--warn)', opacity: 0.7 }}>{'\u25cb'}</span>
        : null;

  const events = asArr(c.events);
  const ongoing = events.find((e) => e.ongoing);
  const title =
    `${str(c.label)}: ${c.perDay ?? '--'} ships/day over the last 7 days vs ${c.base ?? '--'} one-year average` +
    `${c.trend != null ? ` \u00b7 week ${num(c.trend) > 0 ? '+' : ''}${num(c.trend)}%` : ''}` +
    `${c.tanker != null ? ` \u00b7 tankers ${num(c.tanker)}%` : ''}` +
    `${ongoing ? ` \u00b7 ${str(ongoing.name)}` : ''}`;

  const lb = asRec(c.live);
  const vessels = num(lb.vessels);
  const liveBadge = vessels
    ? (
      <span
        style={{ color: 'var(--sky)', fontSize: 11, marginRight: 10 }}
        title={`${vessels} ships on AIS in the last hour`}
      >
        {'\u25cf'} {vessels} <span style={{ opacity: 0.6 }}>now</span>
      </span>
    )
    : null;

  return (
    <div className="site-row" title={title}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {statusDot ? <>{statusDot}{' '}</> : null}
        {str(c.label).replace(' Strait', '').replace('Strait of ', '').replace(' Canal', '')}
      </span>
      <span className="site-val" style={{ whiteSpace: 'nowrap' }}>
        {liveBadge}
        {dailySpark(c.daily)}
        {c.perDay != null ? Math.round(num(c.perDay)) : '--'}
        <span style={{ opacity: 0.6 }}>/d</span> {pctNode(c.pct)}
      </span>
    </div>
  );
}

/** Percentage chip, legacy `fmtPct` (jarvis.html 2428). */
function pctNode(v: unknown): ReactNode {
  if (v == null) return null;
  const n = num(v);
  const color = n <= -40 ? 'var(--danger)' : n <= -20 ? 'var(--warn)' : n >= 30 ? 'var(--mint)' : 'var(--text-2)';
  return <span style={{ color }}>{n > 0 ? '+' : ''}{n}%</span>;
}

/**
 * Inline daily-transit sparkline, legacy maritime `spark` (jarvis.html 2429). Ports mkSparkSvg's
 * normalise-into-the-viewBox point math (2256-2269) but keeps the maritime card's 56x14 frame.
 */
function dailySpark(arr: unknown): ReactNode {
  const values = Array.isArray(arr) ? arr.map((v) => num(v)) : [];
  if (values.length < 2) return null;
  const w = 56, h = 14;
  const mx = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - (v / mx) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ verticalAlign: 'middle', marginRight: 8, opacity: 0.8 }}
    >
      <polyline fill="none" stroke="currentColor" strokeWidth={1.2} points={pts} />
    </svg>
  );
}

// --- Space watch (jarvis.html 2436-2449) ------------------------------------------------------------

function SpacePanel({ data, tr }: { data: SweepData; tr: Label }) {
  const spRaw = data.space;
  const hasSpace = !!spRaw && typeof spRaw === 'object' && !Array.isArray(spRaw);
  const sp = asRec(spRaw);
  const constellations = asRec(sp.constellations);
  const stations = asArr(sp.stations);
  const signals = Array.isArray(sp.signals) ? (sp.signals as unknown[]).map(str) : [];

  const iss = sp.iss && typeof sp.iss === 'object' && !Array.isArray(sp.iss) ? asRec(sp.iss) : null;
  const tiangong = stations.find((s) => num(s.noradId) === 48274);

  const body = hasSpace
    ? (
      <>
        <div className="econ-row">
          <span className="elabel">New objects (30d)</span>
          <span className="eval" style={{ color: 'var(--accent2)' }}>{num(sp.totalNewObjects)}</span>
        </div>
        <div className="econ-row">
          <span className="elabel">Military sats</span>
          <span className="eval">{num(sp.militarySats)}</span>
        </div>
        <div className="econ-row">
          <span className="elabel">Starlink</span>
          <span className="eval">{num(constellations.starlink)}</span>
        </div>
        <div className="econ-row">
          <span className="elabel">OneWeb</span>
          <span className="eval">{num(constellations.oneweb)}</span>
        </div>
        {iss ? <IssRow iss={iss} /> : null}
        {tiangong ? <TiangongRow c={tiangong} /> : null}
        {spaceWeatherNode(data.spaceWeather)}
        {signals.length ? <p className="panel-note">{signals.slice(0, 2).join(' ')}</p> : null}
      </>
    )
    : <div className="panel-src">No space data.</div>;

  return (
    <Panel id="pSpace" title={tr('panels.spaceWatch', 'Space watch')} badge="Orbital" flex="1 1 280px">
      {body}
    </Panel>
  );
}

/** ISS orbital row, legacy inline (jarvis.html 2443). */
function IssRow({ iss }: { iss: Rec }) {
  const title =
    'ISS (ZARYA) \u00b7 ' +
    (iss.period ? `${num(iss.period).toFixed(1)} min orbit \u00b7 ` : '') +
    (iss.inclination != null ? `${num(iss.inclination).toFixed(1)}\u00b0 inclination` : '') +
    (iss.epoch ? ` \u00b7 elements ${relTime(str(iss.epoch))}` : '');
  return (
    <div className="econ-row" title={title}>
      <span className="elabel">ISS</span>
      <span className="eval" id="issLive" style={{ color: 'var(--accent)' }}>
        {iss.altitude != null ? `${num(iss.altitude)} km` : '--'}
        {iss.lat != null ? ` \u00b7 ${num(iss.lat).toFixed(1)}\u00b0, ${num(iss.lon).toFixed(1)}\u00b0` : ''}
      </span>
    </div>
  );
}

/** Tiangong row when the CSS station (NORAD 48274) is tracked, legacy inline (jarvis.html 2444). */
function TiangongRow({ c }: { c: Rec }) {
  const title = 'CSS (TIANHE) \u00b7 Tiangong' + (c.period ? ` \u00b7 ${num(c.period).toFixed(1)} min orbit` : '');
  return (
    <div className="econ-row" title={title}>
      <span className="elabel">Tiangong</span>
      <span className="eval" id="cssLive">
        {c.alt != null ? `${num(c.alt)} km` : '--'}
        {c.lat != null ? ` \u00b7 ${num(c.lat).toFixed(1)}\u00b0, ${num(c.lon).toFixed(1)}\u00b0` : ''}
      </span>
    </div>
  );
}

/**
 * Space-weather + solar X-ray rows, legacy inline (jarvis.html 2445-2447). Returns nothing when the
 * SWPC feed errored or carried no Kp. Handles both the live shape (`kp.now/label/max24/max72`,
 * `scales.now.G/R/S`, `flare.current/max`) and the synthesized fixture shape (`kp` scalar,
 * `scales.g/r/s`, `flare.class`).
 */
function spaceWeatherNode(raw: unknown): ReactNode {
  const w = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Rec) : null;
  if (!w || w.error || !w.kp) return null;

  const kpObj = asRec(w.kp);
  const kpNow = typeof w.kp === 'number' ? w.kp : num(kpObj.now);
  const kpLabel = str(kpObj.label);
  const max24 = num(kpObj.max24, kpNow);
  const max72 = num(kpObj.max72, kpNow);

  const scales = asRec(w.scales);
  const nowScales = asRec(scales.now);
  const g = num(nowScales.G) || num(scales.g);
  const r = num(nowScales.R) || num(scales.r);
  const s = num(nowScales.S) || num(scales.s);
  const kc = kpNow >= 5 ? 'var(--danger)' : kpNow >= 4 ? 'var(--warn)' : 'var(--mint)';

  const forecast = Array.isArray(scales.forecast) ? (scales.forecast as unknown[]).map(asRec) : [];
  const fc = forecast.find((d) => num(d.G) >= 1 || num(d.R) >= 1);

  const flare = asRec(w.flare);
  const flareCurrent = str(flare.current) || str(flare.class);
  const flareMax = str(flare.max);
  const flareMaxTime = str(flare.maxTime);

  const alerts = asArr(w.alerts);
  const firstAlert = alerts.length ? alerts[0]! : null;
  const alertTitle = firstAlert ? (str(firstAlert.title) || str(firstAlert.message)) : '';

  const kpTitle =
    `NOAA planetary Kp, 3-hourly \u00b7 24h max ${max24.toFixed(1)} \u00b7 72h max ${max72.toFixed(1)}` +
    (alertTitle ? ` \u00b7 ${alertTitle}` : '');
  const xrayTitle =
    `GOES X-ray flux \u00b7 latest flare peak ${flareMax || 'n/a'}` +
    (flareMaxTime ? ` at ${flareMaxTime.slice(11, 16)}Z` : '');

  return (
    <>
      <div className="econ-row" title={kpTitle}>
        <span className="elabel">Space weather</span>
        <span className="eval">
          <span style={{ color: kc }}>Kp {kpNow.toFixed(1)}</span>
          {kpLabel ? <> <span style={{ opacity: 0.7 }}>{kpLabel}</span></> : null}
          {(g || r || s)
            ? <> {'\u00b7'} <span style={{ color: 'var(--danger)' }}>{g ? `G${g}` : ''}{r ? ` R${r}` : ''}{s ? ` S${s}` : ''}</span></>
            : fc
              ? <> {'\u00b7'} <span style={{ color: 'var(--warn)' }}>{num(fc.G) ? `G${num(fc.G)}` : ''}{num(fc.R) ? ` R${num(fc.R)}` : ''} watch</span></>
              : null}
        </span>
      </div>
      <div className="econ-row" title={xrayTitle}>
        <span className="elabel">Solar X-ray</span>
        <span className="eval">
          {flareCurrent || '--'}
          {flareMax ? <> <span style={{ opacity: 0.6 }}>peak {flareMax}</span></> : null}
        </span>
      </div>
    </>
  );
}
