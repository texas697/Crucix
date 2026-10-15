import type { HealthResponse, SweepMeta, UserProfile } from '../../api/types';

// Top bar, ported from renderTopbar() in jarvis.html (lines 1298-1334). Brand, cross-page nav,
// live/source status, theme toggle, the BYOK affordance and the user chip.
export interface TopBarProps {
  me: UserProfile | null;
  health: HealthResponse | null;
  meta: SweepMeta | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  now?: () => number;
}

function sweepAge(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return '—';
  const min = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000));
  return min < 1 ? 'now' : `${min}m ago`;
}

export function TopBar({ me, health, meta, theme, onToggleTheme, onOpenSettings, onLogout, now = Date.now }: TopBarProps) {
  const nowMs = now();
  const sourcesOk = meta?.sourcesOk ?? health?.sourcesOk ?? 0;
  const sourcesQueried = meta?.sourcesQueried ?? 0;
  const modelLabel = me?.llm?.provider?.toUpperCase() || 'Grok';

  return (
    <header className="topbar" id="topbar">
      <div className="top-left">
        <a className="brand" href="/" aria-label="Dashboard">
          <img className="brand-logo brand-logo-dark" src="/brand/mfb-intelligence-navbar-dark-transparent.png" alt="MFB Services Intelligence" width="1124" height="160" />
          <img className="brand-logo brand-logo-light" src="/brand/mfb-intelligence-navbar-light-transparent.png" alt="" aria-hidden="true" width="1124" height="160" />
        </a>

        <nav className="mainnav" aria-label="Primary">
          <a className="nav-tab active" href="/" aria-current="page">Dashboard</a>
          <a className="nav-tab" href="/digest">Readers Digest</a>
          <a className="nav-tab" href="/media">Live media</a>
        </nav>
      </div>

      <div className="top-spacer" />

      <div className="top-right">
        <div className="tb-status">
          <span className="tb-seg tb-live"><span className="tb-dot" aria-hidden="true" />Live</span>
          <span className="tb-seg"><b>{sourcesOk}</b><span className="tb-slash">/</span>{sourcesQueried}</span>
          <span className="tb-seg tb-model">{modelLabel}</span>
          <span className="tb-seg tb-time" title={meta?.timestamp || undefined}>{sweepAge(meta?.timestamp, nowMs)}</span>
        </div>

        <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          <span className="tt-ico" aria-hidden="true">{theme === 'light' ? '☽' : '☀'}</span>
        </button>

        {me && (me.llm
          ? <button type="button" className="meta-pill btn" onClick={onOpenSettings}>AI key <span className="v on">{me.llm.provider.toUpperCase()}</span></button>
          : <button type="button" className="byok-cta" onClick={onOpenSettings}>⚡ Add your AI key</button>)}

        {me && (
          <button type="button" className="user-chip" onClick={onLogout}>
            {(me.email || '').split('@')[0]?.toUpperCase()} <span className="v">EXIT</span>
          </button>
        )}
      </div>
    </header>
  );
}
