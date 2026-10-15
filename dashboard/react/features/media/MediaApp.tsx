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
    <div className="cell">
      <video ref={ref} data-src={channel.hls} muted playsInline />
      <span className="cap">{channel.name}</span>
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
    <div className="media-app">
      <div className="topbar">
        <a className="brand" href="/" title="Back to the dashboard">
          <img className="brand-logo brand-logo-dark" src="/brand/mfb-intelligence-navbar-dark-transparent.png" alt="MFB Services Intelligence" width={1124} height={160} />
          <img className="brand-logo brand-logo-light" src="/brand/mfb-intelligence-navbar-light-transparent.png" alt="" aria-hidden="true" width={1124} height={160} />
        </a>
        <nav className="mainnav">
          <a className="nav-tab" href="/">Dashboard</a>
          <a className="nav-tab" href="/digest">Readers Digest</a>
          <a className="nav-tab active" href="/media">Live media</a>
        </nav>
      </div>

      <header className="hero">
        <div>
          <h1>Live media</h1>
          <p>
            Broadcaster feeds from across the world, on the map&apos;s sources. Switch channels, mute,
            go fullscreen or picture-in-picture, or open the grid to watch several at once. Streams
            are the broadcasters&apos; own public HLS feeds.
          </p>
        </div>
        <span className="status">{eventCount} channels</span>
      </header>

      <div className="layout">
        <div className="channels" id="channels" role="list">
          {CHANNELS.map((c, i) => {
            const active = i === channelIndex;
            return (
              <button
                key={c.id}
                type="button"
                role="listitem"
                className={`chan${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => selectChannel(i)}
              >
                <span className="dot" style={{ background: c.color }} />
                <span>
                  <span className="cname">{c.name}</span>
                  <br />
                  <span className="cregion">{c.region}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <div className="stage" id="stage" ref={stageRef}>
            <video
              id="player"
              ref={videoRef}
              playsInline
              style={{ display: youTubeSrc ? 'none' : 'block' }}
            />
            {youTubeSrc && (
              <iframe
                className="vframe"
                title={channel.name}
                src={youTubeSrc}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
            {showOverlay && (
              <div className="overlay show" id="overlay" role={phase === 'error' ? 'alert' : 'status'}>
                {phase === 'loading' && (
                  <>
                    <div className="spin" />
                    <div className="t">Loading stream</div>
                    <div className="s">Connecting to {channel.name}…</div>
                  </>
                )}
                {phase === 'error' && (
                  <>
                    <div className="t">Feed unavailable</div>
                    <div className="s">{errorMsg}</div>
                    <div className="ov-actions" style={S.ovActions}>
                      {youTube && (
                        <button type="button" className="btn primary" onClick={playYouTube}>
                          Play via YouTube
                        </button>
                      )}
                      {openUrl && (
                        <a className="btn" href={openUrl} target="_blank" rel="noopener noreferrer">
                          Open broadcaster page ↗
                        </a>
                      )}
                      <button type="button" className="btn" onClick={retry}>Retry</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bar">
            <span className="now" id="nowName">{channel.name}</span>
            <span className="live" id="liveBadge">
              <span className="d" />LIVE
            </span>
            <span className="sp" />
            <button
              type="button"
              className={`ctrl${muted ? ' on' : ''}`}
              id="btnMute"
              title="Mute (m)"
              aria-label="Mute"
              aria-pressed={muted}
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
              onChange={onVolumeInput}
            />
            <button type="button" className="ctrl" id="btnPip" title="Picture in picture" onClick={() => { void togglePip(); }}>▣</button>
            <button type="button" className="ctrl" id="btnFs" title="Fullscreen (f)" onClick={toggleFullscreen}>⛶</button>
            <button
              type="button"
              className={`ctrl${gridOn ? ' on' : ''}`}
              id="btnGrid"
              title="Multi-channel grid"
              aria-pressed={gridOn}
              onClick={toggleGrid}
            >
              ⊞
            </button>
            {openUrl && (
              <a className="btn" id="btnOpen" href={openUrl} target="_blank" rel="noopener noreferrer">
                Open feed ↗
              </a>
            )}
          </div>

          <div className="foot">
            Live streams are provided by the broadcasters and may be geo-restricted or intermittent.
            If a feed does not play, use “Open feed” or pick another channel. Keyboard: ←/→ change
            channel, m mute, f fullscreen.
          </div>

          {gridOn && (
            <div className="gridmode" id="grid">
              {CHANNELS.slice(0, 4).map((c) => <GridCell key={c.id} channel={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The legacy page ships its layout in a <style> block; that CSS now lives in styles/media.css
// (imported by PageShell) and the matching class names carry it. The one inline style kept is the
// overlay action row, whose layout the legacy also injected as an inline style (there was no CSS
// rule for #ovActions). The per-channel dot colour stays inline as data.
const S: Record<string, CSSProperties> = {
  ovActions: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
};
