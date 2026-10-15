import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BASEMAP_LABELS,
  BASEMAP_ORDER,
  basemapLabel,
  createSpaceLive,
  groundTrack,
  nextBasemap,
  satPosition,
  satrecFor,
  type SpaceLiveTick,
  type SpaceStation,
} from '../../dashboard/react/features/map/spaceLive';

// A real ISS TLE (epoch 2024 day 001) so `twoline2satrec` builds a valid SGP4 record with no
// network. Both lines carry valid checksums.
const TLE: [string, string] = [
  '1 25544U 98067A   24001.50000000  .00016717  00000+0  10270-3 0  9993',
  '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
];
const WHEN = new Date('2024-01-01T12:00:00.000Z');
const station: SpaceStation = { noradId: 25544, epoch: '2024-01-01T12:00:00.000Z', tle: TLE };

describe('satrecFor / satPosition', () => {
  it('builds a satrec from the TLE and propagates a finite position', () => {
    expect(satrecFor(station)).toBeTruthy();

    const pos = satPosition(station, WHEN);
    expect(pos).not.toBeNull();
    expect(Number.isFinite(pos!.lat)).toBe(true);
    expect(Number.isFinite(pos!.lon)).toBe(true);
    expect(Number.isFinite(pos!.alt)).toBe(true);
    expect(pos!.lat).toBeGreaterThanOrEqual(-90);
    expect(pos!.lat).toBeLessThanOrEqual(90);
    expect(pos!.lon).toBeGreaterThanOrEqual(-180);
    expect(pos!.lon).toBeLessThanOrEqual(180);
    expect(pos!.alt).toBeGreaterThan(0);
    expect(pos!.vel).toBeGreaterThan(0);
    expect(pos!.live).toBe(true);
  });

  it('returns null for a station with no usable element set', () => {
    expect(satrecFor({ noradId: 1 })).toBeNull();
    expect(satPosition({ noradId: 1 }, WHEN)).toBeNull();
    expect(satPosition(null, WHEN)).toBeNull();
  });
});

describe('groundTrack', () => {
  it('samples ±46 minutes into finite coordinate segments', () => {
    const segs = groundTrack(station, WHEN);
    expect(segs.length).toBeGreaterThan(0);
    const total = segs.reduce((n, s) => n + s.length, 0);
    // 46 min each way at a 60 s step => 93 samples (minus any single-point boundary segments).
    expect(total).toBeGreaterThanOrEqual(90);
    for (const seg of segs) {
      for (const [lon, lat] of seg) {
        expect(Number.isFinite(lon)).toBe(true);
        expect(Number.isFinite(lat)).toBe(true);
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('createSpaceLive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(WHEN);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks immediately, then per interval; stop clears and restart resets', () => {
    const onTick = vi.fn<(positions: SpaceLiveTick[]) => void>();
    const live = createSpaceLive({ getStations: () => [station], onTick, intervalMs: 5000 });

    live.start();
    expect(onTick).toHaveBeenCalledTimes(1);
    const first = onTick.mock.calls[0]![0];
    expect(first).toHaveLength(1);
    expect(first[0]!.station).toBe(station);
    expect(Number.isFinite(first[0]!.pos.lat)).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(onTick).toHaveBeenCalledTimes(2);

    live.stop();
    vi.advanceTimersByTime(20000);
    expect(onTick).toHaveBeenCalledTimes(2);

    // Restarting after stop re-arms cleanly and ticks once immediately again.
    live.start();
    expect(onTick).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(5000);
    expect(onTick).toHaveBeenCalledTimes(4);
    live.stop();
  });

  it('is idempotent: a second start does not double the interval', () => {
    const onTick = vi.fn<(positions: SpaceLiveTick[]) => void>();
    const live = createSpaceLive({ getStations: () => [station], onTick, intervalMs: 1000 });

    live.start();
    live.start();
    expect(onTick).toHaveBeenCalledTimes(2); // two immediate ticks

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(3); // one armed timer, not two
    live.stop();
  });

  it('skips stations that cannot be propagated', () => {
    const onTick = vi.fn<(positions: SpaceLiveTick[]) => void>();
    const live = createSpaceLive({ getStations: () => [{ noradId: 1 }, station], onTick, intervalMs: 5000 });
    live.start();
    expect(onTick.mock.calls[0]![0]).toHaveLength(1);
    live.stop();
  });
});

describe('basemap toggle helpers', () => {
  it('cycles dark -> muted -> light -> dark', () => {
    expect(nextBasemap('dark')).toBe('muted');
    expect(nextBasemap('muted')).toBe('light');
    expect(nextBasemap('light')).toBe('dark');
  });

  it('labels each basemap and keeps the legacy order', () => {
    expect(BASEMAP_ORDER).toEqual(['dark', 'muted', 'light']);
    expect(basemapLabel('dark')).toBe('Dark');
    expect(basemapLabel('muted')).toBe('Muted');
    expect(basemapLabel('light')).toBe('Light');
    expect(BASEMAP_LABELS.dark).toBe('Dark');
  });
});
