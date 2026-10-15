import { COLORS, RADIUS } from '../consts';
import type { LooseRecord, PlotContext } from '../types';
import { asArr, asRec, dimSpan, esc, num, numOrNull, recs, str } from '../utils';

interface ReceiverState {
  color: string;
  state: string;
  isOnline: boolean;
}

function receiverState(liveState: string): ReceiverState {
  if (liveState === 'online') return { color: COLORS.sdrOnline, state: 'Online', isOnline: true };
  if (liveState === 'private') return { color: COLORS.sdrPrivate, state: 'Private', isOnline: false };
  if (liveState === 'unreachable' || liveState === 'offline') {
    return { color: COLORS.sdrDown, state: 'Unreachable', isOnline: false };
  }
  return { color: COLORS.sdrListed, state: 'Listed', isOnline: false };
}

function receiverName(name: unknown): string {
  return (str(name) || 'KiwiSDR receiver').replace(/\s*\|\s*/g, ' · ');
}

function plotWatchedReceivers(sdr: LooseRecord, ctx: PlotContext, liveUrls: Set<string>): void {
  recs(sdr.zones).forEach((z) => {
    recs(z.receivers).forEach((r) => {
      const rlat = numOrNull(r.lat);
      const rlon = numOrNull(r.lon);
      if (rlat == null && rlon == null) return;
      const url = str(r.url);
      if (url) liveUrls.add(url);
      const { color, state, isOnline } = receiverState(str(r.live));
      const maxUsers = numOrNull(r.max);
      const load = maxUsers ? `${num(r.users)}/${maxUsers} channels in use` : '';
      ctx.points.push({
        lat: num(rlat),
        lng: num(rlon),
        size: isOnline ? 0.2 : 0.15,
        _r: isOnline ? RADIUS.sdrOnline : RADIUS.sdrListed,
        color,
        _stroke: COLORS.sdrStroke,
        type: 'sdr',
        priority: isOnline ? 2 : 3,
        url: url || undefined,
        popHead: receiverName(r.name),
        popMeta: `KiwiSDR · ${state}${r.country ? ' · ' + esc(r.country) : ''}`,
        popText: `${esc(z.region)}${load ? '<br>' + load : ''}${
          r.snr != null ? `<br>HF signal-to-noise ${num(r.snr)} dB` : ''
        }${r.ant ? `<br>Antenna: ${esc(r.ant)}` : ''}${
          r.hw ? `<br>${dimSpan(`${esc(r.hw)}${r.gps ? ' · GPS-timed (TDoA capable)' : ''}`)}` : ''
        }`,
      });
    });
  });
}

function plotDirectory(sdr: LooseRecord, ctx: PlotContext, liveUrls: Set<string>): void {
  asArr(sdr.all).forEach((a) => {
    const tup = asArr(a);
    const lat = numOrNull(tup[1]);
    const lon = numOrNull(tup[2]);
    const country = tup[3];
    const url = str(tup[4]);
    if (lat == null || lon == null || (url && liveUrls.has(url))) return;
    ctx.points.push({
      lat,
      lng: lon,
      size: 0.1,
      _r: RADIUS.sdrDirectory,
      color: COLORS.sdrDirectory,
      _stroke: COLORS.sdrDirectoryStroke,
      type: 'sdr',
      priority: 3,
      url: url || undefined,
      popHead: receiverName(tup[0]),
      popMeta: `KiwiSDR · listed${country ? ' · ' + esc(country) : ''}`,
      popText: 'Public HF receiver, 0–30 MHz. Live status is only probed inside the watched regions.',
    });
  });
}

export function plotSdr(ctx: PlotContext): void {
  const sdr = asRec(ctx.D.sdr);
  const liveUrls = new Set<string>();
  plotWatchedReceivers(sdr, ctx, liveUrls);
  plotDirectory(sdr, ctx, liveUrls);
}
