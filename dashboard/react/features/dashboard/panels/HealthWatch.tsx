import type { ReactNode } from 'react';
import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';
import { relTime } from '../format';
import { Panel } from '../Panel';
import { safeExternalUrl } from '../../../shared/safeUrl';

// The `#pOsint` "Health watch" panel, ported from `buildOsintPanel()` in jarvis.html (2759-2787):
// WHO outbreak rows with WHO's own risk tag, CDC travel notices (level 2+) and, for the Americas,
// US outbreak investigations. The legacy region filter (`inReg`, `currentRegion`) is not ported
// because this React component receives no region; it renders the world view, which is what the
// legacy produces when `currentRegion === 'world'`. The panel keeps the legacy id and flex width so
// the ported CSS still applies, and writes the same `.hw-*` class names.
//
// As in the other ported panels, data fields stay loosely typed (`SweepData` mirrors the synthesized
// envelope deliberately loosely) and are coerced at the edges. React escapes all text, so there is no
// manual HTML escaping and every row is built from JSX nodes rather than injected markup.

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

export interface HealthWatchPanelProps {
  data: SweepData;
  t?: Translator;
}

/** WHO risk → map/legend colour, legacy `HEALTH_RISK_COL` (jarvis.html 2759). */
const HEALTH_RISK_COL: Record<string, string> = {
  'very high': 'rgba(255,107,116,0.85)',
  high: 'rgba(245,154,94,0.85)',
  moderate: 'rgba(242,200,121,0.85)',
  low: 'rgba(127,224,192,0.7)',
};

/** WHO risk → CSS colour for the assessment banner, legacy `HEALTH_RISK_CSS` (jarvis.html 2760). */
const HEALTH_RISK_CSS: Record<string, string> = {
  'very high': 'var(--danger)',
  high: '#f59a5e',
  moderate: '#f2c879',
  low: 'var(--mint)',
};

/** CDC travel-notice level → label, legacy `CDC_LEVEL_LABEL` (jarvis.html 2761). */
const CDC_LEVEL_LABEL: Record<string, string> = {
  1: 'Usual precautions',
  2: 'Enhanced precautions',
  3: 'Reconsider travel',
  4: 'Avoid travel',
};

/** Coerce a loose field to a record, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce a loose field to an array of strings. */
function asStrArr(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => (typeof x === 'string' ? x : String(x))) : [];
}

/** Coerce to a finite number, falling back to `d`. */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Only call `t.has` when the translator actually exposes it (mirrors the other panels). */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

/**
 * WHO risk is an object `{ max, national, regional, global }` in live runs but the fixtures sometimes
 * carry a bare string; normalise both to the displayed max so the tag stays sensible either way.
 */
function riskMax(risk: unknown): string {
  if (typeof risk === 'string') return risk;
  return str(asRec(risk).max);
}

/** Risk-tag tooltip: the per-level WHO assessments, legacy inline (jarvis.html 2771). */
function riskTitle(risk: unknown): string {
  const r = asRec(risk);
  const parts = ['national', 'regional', 'global']
    .filter((k) => r[k])
    .map((k) => `${k} ${str(r[k])}`);
  return parts.join(' \u00b7 ') || 'WHO assessment';
}

export function HealthWatchPanel({ data, t }: HealthWatchPanelProps) {
  // Legacy `t(key, fallback)`: locale value when present, else the English fallback then the key.
  const tr: Label = (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));

  const hw = asRec(data.healthWatch);

  // World view: the legacy filters by `currentRegion`, which this component has no counterpart for.
  const outbreaks = asArr(hw.outbreaks);
  const allTravel = asArr(hw.travel);
  const travel = allTravel.filter((n) => num(n.level) >= 2);
  const us = asArr(hw.cdcOutbreaks);
  const error = str(hw.error);

  const riskTag = (risk: unknown): ReactNode => {
    if (!risk) {
      return (
        <span
          className="hw-risk"
          style={{ color: 'var(--dim)' }}
          title="WHO has not published a risk level for this event"
        >
          unrated
        </span>
      );
    }
    const max = riskMax(risk);
    const color = HEALTH_RISK_COL[max.toLowerCase()] || 'var(--text-2)';
    return (
      <span className="hw-risk" style={{ color }} title={riskTitle(risk)}>
        {max}
      </span>
    );
  };

  const obRows = outbreaks.map((o, i) => {
    const href = safeExternalUrl(o.url) ?? undefined;
    const updates = num(o.updates, 1);
    const places = asStrArr(o.places).join(', ') || 'Multi-country';
    const last = str(o.last);
    return (
      <a
        key={`ob-${i}-${str(o.disease)}`}
        className="hw-row"
        href={href}
        target={href ? '_blank' : undefined}
        rel={href ? 'noopener' : undefined}
        title={str(o.summary)}
      >
        <span className="hw-main">
          <span className="hw-title">{str(o.disease)}</span>
          <span className="hw-sub">
            {places} {'\u00b7'} {updates} notice{updates === 1 ? '' : 's'} {'\u00b7'}{' '}
            {relTime(last) || last.slice(0, 10)}
          </span>
        </span>
        {riskTag(o.risk)}
      </a>
    );
  });

  const trRows = travel.slice(0, 8).map((n, i) => {
    const href = safeExternalUrl(n.url) ?? undefined;
    const level = num(n.level);
    const countries = asStrArr(n.countries);
    const title =
      `CDC Level ${level}: ${CDC_LEVEL_LABEL[String(level)] || ''}` +
      (countries.length
        ? ` \u00b7 ${countries.slice(0, 12).join(', ')}${countries.length > 12 ? ' \u2026' : ''}`
        : '');
    const destinations = num(n.n) > 1 ? `${num(n.n)} destinations` : countries[0] || '';
    return (
      <a
        key={`tr-${i}-${str(n.name)}`}
        className="hw-row"
        href={href}
        target={href ? '_blank' : undefined}
        rel={href ? 'noopener' : undefined}
        title={title}
      >
        <span className="hw-main">
          <span className="hw-title">{str(n.name)}</span>
          <span className="hw-sub">
            {destinations} {'\u00b7'} {relTime(str(n.date)) || ''}
          </span>
        </span>
        <span className={`hw-lvl l${level}`}>L{level}</span>
      </a>
    );
  });

  const usRows = us.slice(0, 3).map((n, i) => {
    const href = safeExternalUrl(n.url) ?? undefined;
    return (
      <a
        key={`us-${i}-${str(n.title)}`}
        className="hw-row"
        href={href}
        target={href ? '_blank' : undefined}
        rel={href ? 'noopener' : undefined}
      >
        <span className="hw-main">
          <span className="hw-title">{str(n.title)}</span>
          <span className="hw-sub">
            US multistate {'\u00b7'} {relTime(str(n.date)) || ''}
          </span>
        </span>
      </a>
    );
  });

  const section = (label: string, rows: ReactNode[]): ReactNode =>
    rows.length ? (
      <>
        <div className="hw-sec">{label}</div>
        {rows}
      </>
    ) : null;

  const worst = outbreaks.find((o) => {
    const m = riskMax(o.risk).toLowerCase();
    return m === 'very high' || m === 'high';
  });

  let banner: ReactNode = null;
  if (error) {
    banner = (
      <div className="nuke-ok anom">
        {'\u26a0'} {error}
      </div>
    );
  } else if (worst) {
    banner = (
      <div
        className="nuke-ok anom"
        style={{ color: HEALTH_RISK_CSS[riskMax(worst.risk).toLowerCase()] }}
      >
        {'\u26a0'} WHO risk {riskMax(worst.risk)} {'\u00b7'}{' '}
        {str(worst.disease).replace(/ disease caused by /i, ' \u00b7 ')}
      </div>
    );
  } else if (outbreaks.length) {
    banner = <div className="nuke-ok ok">{'\u25cf'} No high-risk WHO assessment</div>;
  }

  const empty = (
    <div style={{ padding: '16px 10px', color: 'var(--dim)', fontFamily: 'var(--sans)', fontSize: 12 }}>
      {tr('health.noNotices', 'No WHO or CDC health notices')} in the last {num(hw.activeDays) || 90} days.
    </div>
  );

  const hasRows = obRows.length > 0 || trRows.length > 0 || usRows.length > 0;
  const body = (
    <>
      {banner}
      {section(tr('health.whoOutbreaks', 'WHO outbreaks'), obRows)}
      {section(tr('health.cdcTravel', 'CDC travel notices'), trRows)}
      {section(tr('health.cdcInvestigations', 'CDC investigations'), usRows)}
    </>
  );

  // The legacy shows the empty state when there are no rows, but the error banner is part of the body
  // it then drops. Keep the banner when an error is present so a failed source is never silent.
  const content = hasRows || error ? body : empty;

  // Badge, legacy `head` (jarvis.html 2785): outbreak count, CDC level-3+ travel notices, and freshness.
  const l34 = allTravel.filter((n) => num(n.level) >= 3).length;
  const outbreakCount = outbreaks.length;
  const badge = (
    <>
      {outbreakCount} outbreak{outbreakCount === 1 ? '' : 's'}
      {l34 ? (
        <>
          {' '}
          {'\u00b7'} <span style={{ color: 'var(--warn)' }}>{l34} CDC L3+</span>
        </>
      ) : null}
      {hw.asOf ? (
        <>
          {' '}
          {'\u00b7'} {relTime(str(hw.asOf))}
        </>
      ) : null}
    </>
  );

  return (
    <Panel
      id="pOsint"
      title={tr('panels.osintStream', 'Health watch')}
      badge={badge}
      bodyClass="pad-sm"
      flex="1 1 300px"
    >
      <div className="hw-list">{content}</div>
    </Panel>
  );
}
