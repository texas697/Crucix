import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import Hls from 'hls.js';
import type { HistoryAdapter } from '../../state/history';
import { parseUrl } from '../../state/url';
import { safeExternalUrl } from '../../shared/safeUrl';

// React port of dashboard/public/media.html (the `/media[/:id]?grid=1` surface). It keeps the
// legacy channel list and routing semantics, but makes every player ephemeral React state: the Hls
// instance, video listeners and the YouTube iframe are created by effects and destroyed by their
// cleanup, so channel/grid changes and unmount can never accumulate players. Unlike the legacy
// page (which prefers Hls.js whenever supported) this honours native HLS first — the task's rule —
// so Safari plays without MSE, and Hls.js is only constructed when the browser cannot play HLS
// itself. It performs no same-origin fetches.

export interface MediaChannel {
  id: string;
  name: string;
  region: string;
  color: string;
  hls: string;
  page?: string;
  yt?: string;
}

export const CHANNELS: readonly MediaChannel[] = [
  {
    id: 'aljazeera', name: 'Al Jazeera English', region: 'Qatar', color: '#f5c542',
    hls: 'https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8',
    yt: 'https://www.youtube.com/watch?v=gCNeDWCI0vo',
    page: 'https://www.aljazeera.com/live',
  },
  {
    id: 'rt', name: 'RT', region: 'Russia', color: '#7fe0c0',
    hls: 'https://rt-glb.rttv.com/dvr/rtnews/playlist.m3u8',
    page: 'https://www.rt.com/on-air/',
  },
  {
    id: 'presstv', name: 'Press TV', region: 'Iran (English)', color: '#6aa8ff',
    hls: 'https://live.presstv.co.uk/hls/presstv.m3u8',
    page: 'https://www.presstv.ir/',
  },
  {
    id: 'iranintl', name: 'Iran International', region: 'Iran (English)', color: '#b48cff',
    hls: 'https://live.livetvstream.co.uk/LS-63503-4/index.m3u8',
    yt: 'https://www.youtube.com/watch?v=5JDxjsAVaGk',
    page: 'https://www.iranintl.com/live',
  },
  {
    id: 'dw', name: 'DW English', region: 'Germany', color: '#8fb8d8',
    hls: 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8',
    page: 'https://www.dw.com/en/live-tv/channel-english',
  },
  {
    id: 'france24', name: 'France 24 English', region: 'France', color: '#8fb8d8',
    hls: 'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
    page: 'https://www.france24.com/en/live',
  },
];

const DEFAULT_CHANNEL = CHANNELS[0] as MediaChannel;
const eventCount = CHANNELS.length;

function channelAt(index: number): MediaChannel {
  return CHANNELS[index] ?? DEFAULT_CHANNEL;
}

/** Legacy `youTubeEmbed`: `/watch?v=ID` → embed URL, `youtu.be/ID` → embed URL, else swap /watch. */
export function youTubeEmbed(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]{6,})/) || url.match(/youtu\.be\/([\w-]{6,})/);
  const id = m?.[1];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url.replace('/watch', '/embed');
}

export interface MediaLocation { href: string; pathname: string; search: string }

export interface MediaAppProps {
  history: HistoryAdapter;
  location: MediaLocation;
}

type Phase = 'loading' | 'ready' | 'error' | 'youtube';

/** Best-effort `play()`: jsdom and some browsers reject or throw; autoplay is never guaranteed. */
function safePlay(video: HTMLMediaElement): void {
  try {
    const result = video.play();
    if (result && typeof result.catch === 'function') void result.catch(() => { /* autoplay blocked */ });
  } catch { /* ignore */ }
}

function safeLoad(video: HTMLMediaElement): void {
  try { video.load(); } catch { /* jsdom throws "not implemented" in some setups */ }
}

/** True when the browser can play an HLS playlist without Media Source Extensions (Safari/iOS). */
function canPlayHlsNatively(video: HTMLMediaElement): boolean {
  try {
    return typeof video.canPlayType === 'function'
      && video.canPlayType('application/vnd.apple.mpegurl') !== '';
  } catch {
    return false;
  }
}

function seedChannel(href: string): number {
  try {
    const { path } = parseUrl(href);
    const idx = CHANNELS.findIndex((c) => c.id === path[1]);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}

function seedGrid(href: string): boolean {
  try {
    return parseUrl(href).q.grid === '1';
  } catch {
    return false;
  }
}

// ─── Grid cell ───────────────────────────────────────────────────────────────
// One lazy grid `<video>`. It reads its source from `data-src` (the legacy lazy-loading contract)
// and owns its own Hls instance; unmounting the cell (which happens the moment grid mode exits)
// destroys it, so leaving the grid never leaves a stream behind.
function GridCell({ channel }: { channel: MediaChannel }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const src = video.dataset.src || channel.hls;
    let hls: Hls | null = null;

    if (canPlayHlsNatively(video)) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    safePlay(video);

    return () => {
      if (hls) hls.destroy();
      video.removeAttribute('src');
      safeLoad(video);
    };
  }, [channel.hls]);

  return (
    <div className="cell" style={S.cell}>
      <video ref={ref} data-src={channel.hls} muted playsInline style={S.video} />
      <span className="cap" style={S.cap}>{channel.name}</span>
    </div>
  );
}

// ─── Surface ─────────────────────────────────────────────────────────────────
export function MediaApp({ history, location }: MediaAppProps) {
  const [channelIndex, setChannelIndex] = useState<number>(() => seedChannel(location.href));
  const [gridOn, setGridOn] = useState<boolean>(() => seedGrid(location.href));
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [youTubeSrc, setYouTubeSrc] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const applyingRoute = useRef(false);
  const bootRef = useRef(false);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);

  // Current channel/grid, readable from stable callbacks without re-subscribing on every change.
  const stateRef = useRef({ channelIndex, gridOn });
  useEffect(() => {
    stateRef.current = { channelIndex, gridOn };
    mutedRef.current = muted;
    volumeRef.current = volume;
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      video.volume = volume;
    }
  }, [channelIndex, gridOn, muted, volume]);

  const channel = channelAt(channelIndex);
  const openUrl = safeExternalUrl(channel.page ?? channel.hls);
  const youTube = useMemo(() => safeExternalUrl(youTubeEmbed(channel.yt)), [channel.yt]);

  // ── URL routing ────────────────────────────────────────────────────────────
  const syncUrl = useCallback((push: boolean, index: number, grid: boolean) => {
    if (applyingRoute.current) return;
    history.set(
      ['media', channelAt(index).id],
      { grid: grid ? 1 : '' },
      { push, state: { k: 'channel' } },
    );
  }, [history]);

  const applyRoute = useCallback((href: string, initial: boolean) => {
    let parsed: { path: string[]; q: Record<string, string> };
    try {
      parsed = parseUrl(href);
    } catch {
      return;
    }
    const idx = CHANNELS.findIndex((c) => c.id === parsed.path[1]);
    const wantGrid = parsed.q.grid === '1';
    const current = stateRef.current;
    const nextIndex = idx >= 0 ? idx : current.channelIndex;
    applyingRoute.current = true;
    try {
      stateRef.current = { channelIndex: nextIndex, gridOn: wantGrid };
      setChannelIndex(nextIndex);
      setGridOn(wantGrid);
    } finally {
      applyingRoute.current = false;
    }
    if (initial) syncUrl(false, nextIndex, wantGrid);
  }, [syncUrl]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    applyRoute(location.href, true);
  }, [applyRoute, location.href]);

  useEffect(() => {
    const onPop = () => applyRoute(window.location.href, false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applyRoute]);

  const selectChannel = useCallback((index: number) => {
    stateRef.current = { channelIndex: index, gridOn: stateRef.current.gridOn };
    setChannelIndex(index);
    syncUrl(true, index, stateRef.current.gridOn);
  }, [syncUrl]);

  const stepChannel = useCallback((delta: number) => {
    const next = (stateRef.current.channelIndex + delta + eventCount) % eventCount;
    selectChannel(next);
  }, [selectChannel]);

  const toggleGrid = useCallback(() => {
    const next = !stateRef.current.gridOn;
    stateRef.current = { channelIndex: stateRef.current.channelIndex, gridOn: next };
    setGridOn(next);
    syncUrl(false, stateRef.current.channelIndex, next);
  }, [syncUrl]);

  // ── Main player lifecycle ─────────────────────────────────────────────────
  // Runs on channel change, retry and YouTube toggle. Its cleanup is the single place that tears the
  // previous player down: it removes the native listeners, destroys the Hls instance, clears the
  // source and reloads the (empty) element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const fail = (msg: string) => {
      setErrorMsg(msg);
      setPhase('error');
    };
    const onLoaded = () => {
      setPhase('ready');
      video.muted = mutedRef.current;
      video.volume = volumeRef.current;
      safePlay(video);
    };
    const onVideoError = () => fail('The broadcaster feed did not load.');

    if (!youTubeSrc) {
      const c = channelAt(channelIndex);
      setPhase('loading');
      video.removeAttribute('src');
      safeLoad(video);

      if (canPlayHlsNatively(video)) {
        video.src = c.hls;
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('error', onVideoError, { once: true });
      } else if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 20 });
        hls.loadSource(c.hls);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, onLoaded);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data || !data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
          else fail('The broadcaster feed did not load (it may be geo-restricted or offline).');
        });
      } else {
        fail('This browser cannot play HLS streams.');
      }
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onVideoError);
      if (hls) hls.destroy();
      video.removeAttribute('src');
      safeLoad(video);
    };
  }, [channelIndex, reloadToken, youTubeSrc]);

  // Leaving YouTube (or switching channel while in it) drops the fallback iframe.
  useEffect(() => { setYouTubeSrc(null); }, [channelIndex]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const onVolumeInput = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setVolume(next);
    setMuted(next === 0);
  };

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === 'function') void document.exitFullscreen().catch(() => {});
      } else if (stage) {
        if (typeof stage.requestFullscreen === 'function') void stage.requestFullscreen().catch(() => {});
        else if (typeof stage.webkitRequestFullscreen === 'function') stage.webkitRequestFullscreen();
      }
    } catch { /* fullscreen unavailable */ }
  }, []);

  const togglePip = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        if (typeof document.exitPictureInPicture === 'function') await document.exitPictureInPicture();
      } else {
        const video = videoRef.current;
        if (video && typeof video.requestPictureInPicture === 'function') await video.requestPictureInPicture();
      }
    } catch { /* picture-in-picture unavailable */ }
  }, []);

  const playYouTube = useCallback(() => {
    if (!youTube) return;
    setYouTubeSrc(youTube);
    setPhase('youtube');
  }, [youTube]);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  // Keyboard shortcuts (arrows change channel, m mute, f fullscreen). Ignored while an input has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') stepChannel(1);
      else if (e.key === 'ArrowLeft') stepChannel(-1);
      else if (e.key === 'm') setMuted((m) => !m);
      else if (e.key === 'f') toggleFullscreen();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stepChannel, toggleFullscreen]);

  const showOverlay = youTubeSrc === null && phase !== 'ready';

  return (
    <div className="media-app" style={S.page}>
      <header className="hero" style={S.hero}>
        <div>
          <h1 style={S.h1}>Live media</h1>
          <p style={S.heroP}>
            Broadcaster feeds from across the world, on the map&apos;s sources. Switch channels, mute,
            go fullscreen or picture-in-picture, or open the grid to watch several at once. Streams
            are the broadcasters&apos; own public HLS feeds.
          </p>
        </div>
        <span className="status" style={S.status}>{eventCount} channels</span>
      </header>

      <div className="layout" style={S.layout}>
        <div className="channels" id="channels" style={S.channels} role="list">
          {CHANNELS.map((c, i) => {
            const active = i === channelIndex;
            return (
              <button
                key={c.id}
                type="button"
                role="listitem"
                className={`chan${active ? ' active' : ''}`}
                style={active ? { ...S.chan, ...S.chanActive } : S.chan}
                aria-pressed={active}
                onClick={() => selectChannel(i)}
              >
                <span className="dot" style={{ ...S.dot, background: c.color }} />
                <span>
                  <span className="cname" style={S.cname}>{c.name}</span>
                  <br />
                  <span className="cregion" style={S.cregion}>{c.region}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <div className="stage" id="stage" ref={stageRef} style={S.stage}>
            <video
              id="player"
              ref={videoRef}
              playsInline
              style={{ ...S.video, display: youTubeSrc ? 'none' : 'block' }}
            />
            {youTubeSrc && (
              <iframe
                className="vframe"
                title={channel.name}
                src={youTubeSrc}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                style={S.iframe}
              />
            )}
            {showOverlay && (
              <div className="overlay show" id="overlay" role={phase === 'error' ? 'alert' : 'status'} style={S.overlay}>
                {phase === 'loading' && (
                  <>
                    <div className="spin" style={S.spin} />
                    <div className="t" style={S.ovTitle}>Loading stream</div>
                    <div className="s" style={S.ovText}>Connecting to {channel.name}…</div>
                  </>
                )}
                {phase === 'error' && (
                  <>
                    <div className="t" style={S.ovTitle}>Feed unavailable</div>
                    <div className="s" style={S.ovText}>{errorMsg}</div>
                    <div className="ov-actions" style={S.ovActions}>
                      {youTube && (
                        <button type="button" className="btn primary" style={{ ...S.btn, ...S.btnPrimary }} onClick={playYouTube}>
                          Play via YouTube
                        </button>
                      )}
                      {openUrl && (
                        <a className="btn" style={S.btn} href={openUrl} target="_blank" rel="noopener noreferrer">
                          Open broadcaster page ↗
                        </a>
                      )}
                      <button type="button" className="btn" style={S.btn} onClick={retry}>Retry</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bar" style={S.bar}>
            <span className="now" id="nowName" style={S.now}>{channel.name}</span>
            <span className="live" id="liveBadge" style={S.live}>
              <span className="d" style={S.liveDot} />LIVE
            </span>
            <span className="sp" style={S.sp} />
            <button
              type="button"
              className={`ctrl${muted ? ' on' : ''}`}
              id="btnMute"
              title="Mute (m)"
              aria-label="Mute"
              aria-pressed={muted}
              style={muted ? { ...S.ctrl, ...S.ctrlOn } : S.ctrl}
              onClick={toggleMute}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              className="vol"
              id="vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              title="Volume"
              aria-label="Volume"
              style={S.vol}
              onChange={onVolumeInput}
            />
            <button type="button" className="ctrl" id="btnPip" title="Picture in picture" style={S.ctrl} onClick={() => { void togglePip(); }}>▣</button>
            <button type="button" className="ctrl" id="btnFs" title="Fullscreen (f)" style={S.ctrl} onClick={toggleFullscreen}>⛶</button>
            <button
              type="button"
              className={`ctrl${gridOn ? ' on' : ''}`}
              id="btnGrid"
              title="Multi-channel grid"
              aria-pressed={gridOn}
              style={gridOn ? { ...S.ctrl, ...S.ctrlOn } : S.ctrl}
              onClick={toggleGrid}
            >
              ⊞
            </button>
            {openUrl && (
              <a className="btn" id="btnOpen" style={S.btn} href={openUrl} target="_blank" rel="noopener noreferrer">
                Open feed ↗
              </a>
            )}
          </div>

          <div className="foot" style={S.foot}>
            Live streams are provided by the broadcasters and may be geo-restricted or intermittent.
            If a feed does not play, use “Open feed” or pick another channel. Keyboard: ←/→ change
            channel, m mute, f fullscreen.
          </div>

          {gridOn && (
            <div className="gridmode" id="grid" style={S.gridmode}>
              {CHANNELS.slice(0, 4).map((c) => <GridCell key={c.id} channel={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The legacy page ships its layout in an inline <style>; styling here is inline for the same reason
// (only PageShell's shared stylesheets are available to this surface). Token values match tokens.css.
const S: Record<string, CSSProperties> = {
  page: { padding: '20px 24px 40px' },
  hero: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', margin: '22px 0 16px' },
  h1: { fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' },
  heroP: { fontSize: 14.5, color: 'var(--sub)', maxWidth: 680, lineHeight: 1.55, marginTop: 8 },
  status: { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim-2)' },
  layout: { display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 16, alignItems: 'start' },
  channels: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
  chan: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 6, cursor: 'pointer', background: 'transparent', border: '1px solid transparent', textAlign: 'left', width: '100%', color: 'var(--text)', fontFamily: 'var(--sans)' },
  chanActive: { background: 'var(--raised-2)', borderColor: 'var(--border-bright)' },
  dot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  cname: { fontSize: 13.5, fontWeight: 500 },
  cregion: { fontSize: 11.5, color: 'var(--dim-2)' },
  stage: { background: '#000', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative', aspectRatio: '16 / 9', width: '100%' },
  video: { width: '100%', height: '100%', background: '#000', display: 'block', objectFit: 'contain' },
  iframe: { width: '100%', height: '100%', border: 0, background: '#000' },
  overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(5,7,11,0.86)', textAlign: 'center', padding: 20 },
  spin: { width: 30, height: 30, border: '2px solid rgba(220,226,236,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%' },
  ovTitle: { fontSize: 15, fontWeight: 600 },
  ovText: { fontSize: 13, color: 'var(--sub)', maxWidth: 420 },
  ovActions: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  bar: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  now: { fontSize: 13.5, fontWeight: 500 },
  live: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--danger)', padding: '4px 9px', border: '1px solid rgba(240,90,80,0.3)', borderRadius: 5, background: 'rgba(240,90,80,0.08)' },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' },
  sp: { flex: 1 },
  ctrl: { width: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--raised)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15 },
  ctrlOn: { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--on-accent)' },
  vol: { width: 110 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500, padding: '8px 13px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--raised)', color: 'var(--text)', textDecoration: 'none' },
  btnPrimary: { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--on-accent)' },
  gridmode: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 12 },
  cell: { position: 'relative', background: '#000', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', aspectRatio: '16 / 9' },
  cap: { position: 'absolute', left: 6, bottom: 6, fontSize: 11, color: '#fff', textShadow: '0 1px 3px #000' },
};
