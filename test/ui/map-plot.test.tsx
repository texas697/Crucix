// Deterministic tests for the pure map plot selector (`plotData`). No network, no MapLibre, no DOM.
// The fixtures are the same synthesized envelope the panels use (minimal = every source present,
// partial = most sources empty). `now` is pinned to the fixtures' sweep timestamp so every
// relative-time / time-window assertion is stable.

import { describe, expect, it } from 'vitest';
import type * as GeoJSON from 'geojson';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import type { SweepData } from '../../dashboard/react/api/types';
import { LAYER_DEFS } from '../../dashboard/react/features/map/layerDefs';
import { plotData, type PlotInput, type TrackRow } from '../../dashboard/react/features/map/plot';

const NOW = Date.parse('2026-10-14T11:00:00.000Z');

const MIN = minimal as unknown as SweepData;
const PARTIAL = partial as unknown as SweepData;

function allVisible(): Record<string, boolean> {
  return Object.fromEntries(LAYER_DEFS.map((l) => [l.key, true]));
}

function base(data: SweepData, over: Partial<PlotInput> = {}): PlotInput {
  return {
    data,
    layerVisible: allVisible(),
    region: 'world',
    timeWindow: 'all',
    now: NOW,
    seenMarkers: null,
    showAggregates: true,
    tracks: null,
    ships: null,
    quakes: null,
    ...over,
  };
}

function pointTypes(result: ReturnType<typeof plotData>): Set<string> {
  return new Set(result.mapPoints.map((p) => p.type));
}

describe('plotData', () => {
  it('plots every minimal domain with the legacy point type keys and counts', () => {
    const r = plotData(base(MIN));

    expect(r.mapPoints).toHaveLength(20);
    expect(r.points.type).toBe('FeatureCollection');
    expect(r.points.features).toHaveLength(20);

    const types = pointTypes(r);
    for (const key of [
      'air',
      'thermal',
      'maritime',
      'nuke',
      'sdr',
      'disaster',
      'outage',
      'health',
      'news',
      'weather',
      'radiation',
      'space',
      'gdelt',
    ]) {
      expect(types.has(key)).toBe(true);
    }

    // layerCounts counts available points by type, independent of visibility/region/time.
    expect(r.layerCounts).toEqual({
      air: 2, // 1 air hotspot + 1 military aircraft
      thermal: 2,
      maritime: 2,
      nuke: 2, // site + one Safecast sensor
      sdr: 2, // 1 watched-zone receiver + 1 directory-only entry
      disaster: 1,
      outage: 1,
      health: 2,
      news: 2,
      weather: 1,
      radiation: 1,
      space: 1,
      gdelt: 1,
      conflict: 1,
    });

    // ptFeat carries the popup/marker fields (the raw type lives on mapPoints, not the feature).
    const first = r.points.features[0]!;
    expect(first.properties!).toMatchObject({ head: expect.any(String), isNew: '0', color: expect.any(String) });
    expect(typeof first.properties!.r).toBe('number');
    expect(first.geometry.type).toBe('Point');
  });

  it('handles the mostly-empty partial fixture, conflict override at zero', () => {
    const r = plotData(base(PARTIAL));
    expect(r.mapPoints).toHaveLength(1);
    expect(r.mapPoints[0]!.type).toBe('air');
    expect(r.layerCounts).toEqual({ air: 1, conflict: 0 });
    expect(r.rings.features).toHaveLength(0);
    expect(r.trails.features).toHaveLength(0);
  });

  it('honours layerVisible while still counting hidden layers', () => {
    const r = plotData(base(MIN, { layerVisible: { ...allVisible(), thermal: false } }));
    expect(r.mapPoints).toHaveLength(18);
    expect(pointTypes(r).has('thermal')).toBe(false);
    expect(r.layerCounts.thermal).toBe(2);
  });

  it('filters to the active region', () => {
    const r = plotData(base(MIN, { region: 'europe' }));
    // Military aircraft (Kyiv), the watched SDR receiver and the GDELT cluster all sit in the box.
    expect(r.mapPoints).toHaveLength(3);
    expect(r.mapPoints.map((p) => p.type).sort()).toEqual(['air', 'gdelt', 'sdr']);
  });

  it('drops stale points for the 1h time window (with exact-1h boundary survivors)', () => {
    const r = plotData(base(MIN, { timeWindow: '1h' }));
    expect(r.mapPoints).toHaveLength(10);
    const types = pointTypes(r);
    for (const gone of ['thermal', 'maritime', 'disaster', 'outage', 'health', 'news']) {
      expect(types.has(gone)).toBe(false);
    }
    // The GDELT cluster and the Safecast sensor are exactly one hour old -> kept.
    expect(types.has('gdelt')).toBe(true);
    expect(types.has('nuke')).toBe(true);
    // Counts remain the full availability, not the time-filtered slice.
    expect(r.layerCounts.thermal).toBe(2);
  });

  it('marks _new only after the first plot, and only for genuinely new markers', () => {
    const first = plotData(base(MIN));
    expect(first.mapPoints.every((p) => p._new === false)).toBe(true);

    const second = plotData(base(MIN, { seenMarkers: first.nextSeen }));
    expect(second.mapPoints.every((p) => p._new === false)).toBe(true);

    const news = (MIN as unknown as { news: unknown[] }).news;
    const augmented = {
      ...(MIN as unknown as Record<string, unknown>),
      news: [
        ...news,
        { source: 'ZZZ', title: 'Brand new report', lat: 12.5, lon: 34.5, date: '2026-10-14T10:30:00.000Z' },
      ],
    } as unknown as SweepData;

    const third = plotData(base(augmented, { seenMarkers: first.nextSeen }));
    const fresh = third.mapPoints.filter((p) => p._new);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.popHead).toBe('ZZZ NEWS');
  });

  it('shows aggregate labels only for world + showAggregates', () => {
    const world = plotData(base(MIN));
    const aggregates = world.labels.filter((l) => l.aggregate);
    expect(aggregates.length).toBeGreaterThan(0);
    expect(aggregates.every((l) => !!l.region)).toBe(true);
    const byRegion = Object.fromEntries(aggregates.map((l) => [l.region, l.text]));
    expect(byRegion.europe).toBe('Europe · 3');
    expect(byRegion.americas).toBe('Americas · 6');
    expect(byRegion.middleEast).toBe('Middle East · 3');
    expect(byRegion.asiaPacific).toBe('Asia Pacific · 7');

    // Non-aggregate labels (air count, chokepoints, ISS) are still emitted.
    const plain = world.labels.filter((l) => !l.aggregate);
    expect(plain.length).toBe(4);

    expect(plotData(base(MIN, { showAggregates: false })).labels.some((l) => l.aggregate)).toBe(false);
    expect(plotData(base(MIN, { region: 'europe' })).labels.some((l) => l.aggregate)).toBe(false);
  });

  it('builds conflict rings from severe GDELT only', () => {
    const r = plotData(base(MIN));
    expect(r.rings.features).toHaveLength(1);
    const ring = r.rings.features[0]!;
    expect(ring.geometry.type).toBe('Point');
    expect(ring.properties!).toMatchObject({ head: 'Armed clash' });
    // maxR = 1 + log2(12) ~= 4.585, rendered radius = maxR * 2 (clamped 3..14).
    expect(ring.properties!.r as number).toBeCloseTo(9.17, 1);

    const hidden = plotData(base(MIN, { layerVisible: { ...allVisible(), conflict: false } }));
    expect(hidden.rings.features).toHaveLength(0);

    expect(plotData(base(PARTIAL)).rings.features).toHaveLength(0);
  });

  it('builds trails from multi-point track rows', () => {
    const tracks: TrackRow[] = [
      {
        lat: 50.4,
        lon: 30.5,
        type: 'shahed',
        title: 'Shahed',
        trail: [
          { lat: 50.0, lng: 30.0 },
          { lat: 50.2, lng: 30.2 },
          { lat: 50.4, lng: 30.5 },
        ],
      },
      { lat: 49.0, lon: 31.0, type: 'uav', title: 'Single', trail: [{ lat: 49, lng: 31 }] },
    ];

    const r = plotData(base(MIN, { tracks: { tracks } }));
    expect(r.layerCounts.track).toBe(2);
    expect(r.mapPoints.filter((p) => p.type === 'track')).toHaveLength(2);
    // Only the trail with more than one point becomes a line.
    expect(r.trails.features).toHaveLength(1);
    const geom = r.trails.features[0]!.geometry as GeoJSON.LineString;
    expect(geom.type).toBe('LineString');
    expect(geom.coordinates).toHaveLength(3);

    const hidden = plotData(base(MIN, { tracks: { tracks }, layerVisible: { ...allVisible(), track: false } }));
    expect(hidden.trails.features).toHaveLength(0);
  });

  it('plots live ships and quakes from the separate live feeds', () => {
    const ships = {
      vessels: [
        {
          lat: 26.6,
          lon: 56.3,
          mmsi: 123456789,
          name: 'MV Test',
          cls: 'tanker',
          sog: 12.3,
          cog: 90,
          nav: 0,
          dest: 'Dubai',
          len: 300,
          box: 'hormuz',
          ts: '2026-10-14T10:30:00.000Z',
        },
      ],
    };
    const quakes = [
      { lat: 35.6, lon: 139.7, mag: 6.2, place: 'Japan', depth: 30, ts: '2026-10-14T10:00:00.000Z', url: 'https://usgs/q', tsunami: 1 },
    ];

    const r = plotData(base(MIN, { ships, quakes }));
    expect(r.layerCounts.ships).toBe(1);
    expect(r.layerCounts.quake).toBe(1);

    const ship = r.mapPoints.find((p) => p.type === 'ships');
    expect(ship?.popMeta).toContain('Tanker');
    expect(ship?.popText).toContain('12.3 kn');

    const quake = r.mapPoints.find((p) => p.type === 'quake');
    expect(quake?.popHead).toBe('M6.2 earthquake');
    expect(quake?.color).toBe('#ff5f63');
    expect(quake?.popText).toContain('Tsunami flag');
  });
});
