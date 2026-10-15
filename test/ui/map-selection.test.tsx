import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeModeProvider } from '../../dashboard/react/app/AppProviders/components/ThemeModeProvider';
import { CLASSES } from '../../dashboard/react/features/map/classes';
import type { ApiClient } from '../../dashboard/react/api/client';
import type { MapPoint } from '../../dashboard/react/features/map/plot';
import type { Shape } from '../../dashboard/react/state/url';
import {
  circleFeature,
  featureToShape,
  geoCircle,
  haversineKm,
  insideShape,
  nearestMapPoint,
  pointInRing,
  polyFeature,
  rectFeature,
  runSelection,
} from '../../dashboard/react/features/map/selection';
import { MapPopup } from '../../dashboard/react/features/map/MapPopup';
import { SelectionPanel } from '../../dashboard/react/features/map/SelectionPanel';
import {
  AreaBrief,
  EMPTY_AREA_BRIEF,
  abFormatUsd,
  abLinkFor,
  loadAreaBrief,
  markersPayload,
  shapePayload,
  type AreaBriefState,
} from '../../dashboard/react/features/map/AreaBrief';

// The popup, panel and brief read theme.palette.crucix through sx, so they render inside the app
// theme like the SPA does. MapView itself (draw tools, canvas clicks, handle) is covered by
// mapview.test.tsx against the react-map-gl fake.
const renderThemed = (ui: ReactElement) => render(<ThemeModeProvider storage={null}>{ui}</ThemeModeProvider>);
const sel = (key: keyof typeof CLASSES) => `.${CLASSES[key]}`;

afterEach(cleanup);

// ─── Geometry + selection ────────────────────────────────────────────────────────────────────────

function mp(lat: number, lng: number, type = 'air'): MapPoint {
  return {
    lat,
    lng,
    size: 0.3,
    _r: 3,
    color: '#fff',
    _stroke: '#000',
    type,
    priority: 1,
    popHead: 'head',
    popMeta: 'meta',
    popText: 'text',
  };
}

describe('selection geometry', () => {
  it('haversineKm measures a degree of longitude at the equator', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it('geoCircle returns n+1 points starting due north of the centre', () => {
    const ring = geoCircle(10, 20, 100, 8);
    expect(ring).toHaveLength(9);
    // Bearing 0 is due north: same longitude, latitude above the centre.
    expect(ring[0]![0]).toBeCloseTo(10, 6);
    expect(ring[0]![1]).toBeGreaterThan(20);
    expect(ring[0]![1]).toBeCloseTo(20.899, 2);
  });

  it('pointInRing uses even-odd inclusion', () => {
    const ring = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
    expect(pointInRing(ring, 1, 1)).toBe(true);
    expect(pointInRing(ring, 3, 3)).toBe(false);
    expect(pointInRing(ring, -1, 1)).toBe(false);
  });

  it('insideShape handles circles and polygons', () => {
    const circle = circleFeature({ lng: 0, lat: 0 }, 100);
    expect(insideShape(circle, 0.5, 0.5)).toBe(true);
    expect(insideShape(circle, 10, 10)).toBe(false);

    const rect = rectFeature({ lng: 0, lat: 0 }, { lng: 2, lat: 2 });
    expect(insideShape(rect, 1, 1)).toBe(true);
    expect(insideShape(rect, 3, 3)).toBe(false);

    const poly = polyFeature([[0, 0], [2, 0], [2, 2], [0, 2]]);
    expect(insideShape(poly, 1, 1)).toBe(true);
    expect(insideShape(poly, 5, 5)).toBe(false);
  });

  it('featureToShape round-trips circles, rectangles and polygons', () => {
    const circle: Shape = featureToShape(circleFeature({ lng: 3, lat: 4 }, 50));
    expect(circle).toEqual({ kind: 'circle', center: { lng: 3, lat: 4 }, radiusKm: 50 });

    const rect: Shape = featureToShape(rectFeature({ lng: 5, lat: 1 }, { lng: 2, lat: 4 }));
    expect(rect).toEqual({ kind: 'rect', sw: { lat: 1, lng: 2 }, ne: { lat: 4, lng: 5 } });

    const poly: Shape = featureToShape(polyFeature([[0, 0], [2, 0], [2, 2]]));
    expect(poly.kind).toBe('poly');
    if (poly.kind === 'poly') expect(poly.ring).toEqual([{ lng: 0, lat: 0 }, { lng: 2, lat: 0 }, { lng: 2, lat: 2 }]);
  });

  it('nearestMapPoint finds the closest marker within ~25 km', () => {
    const points = [mp(0.1, 0.1), mp(5, 5)];
    expect(nearestMapPoint(0.05, 0.05, points)).toBe(points[0]);
    expect(nearestMapPoint(2, 2, points)).toBeNull();
  });

  it('runSelection returns only the markers inside the shape', () => {
    const inside = mp(0.5, 0.5, 'air');
    const outside = mp(9, 9, 'news');
    const circle = circleFeature({ lng: 0, lat: 0 }, 100);
    expect(runSelection(circle, [inside, outside])).toEqual([inside]);
  });
});

// ─── MapPopup ────────────────────────────────────────────────────────────────────────────────────

describe('MapPopup', () => {
  it('renders head, meta and trusted text markup', () => {
    renderThemed(
      <MapPopup
        head="Hello"
        text={'source <a class="ab-cite" href="https://e.com/">1</a>'}
        meta="Meta line"
        lng={10}
        lat={20}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Meta line')).toBeInTheDocument();
    expect(document.querySelector(`${sel('popupText')} .ab-cite`)).not.toBeNull();
  });

  it('drops unsafe source URLs and keeps safe ones', () => {
    const { rerender } = renderThemed(<MapPopup head="x" url="javascript:alert(1)" />);
    expect(document.querySelector(sel('popupLink'))).toBeNull();

    rerender(<ThemeModeProvider storage={null}><MapPopup head="x" url="https://example.com/a" /></ThemeModeProvider>);
    const link = document.querySelector(sel('popupLink')) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://example.com/a');
  });

  it('fires copy and close callbacks', () => {
    const onCopy = vi.fn();
    const onClose = vi.fn();
    renderThemed(<MapPopup head="x" lng={1} lat={2} onCopy={onCopy} onClose={onClose} />);
    fireEvent.click(document.querySelector(sel('popupCopy'))!);
    expect(onCopy).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector(sel('popupClose'))!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── SelectionPanel ──────────────────────────────────────────────────────────────────────────────

describe('SelectionPanel', () => {
  it('renders nothing with no markers and no brief', () => {
    const { container } = renderThemed(<SelectionPanel items={[]} onFocus={vi.fn()} onClear={vi.fn()} />);
    expect(container.querySelector('#selPanel')).toBeNull();
  });

  it('groups by type, sorts groups by count and reports the total', () => {
    const items = [mp(0, 0, 'air'), mp(1, 1, 'air'), mp(2, 2, 'news')];
    renderThemed(<SelectionPanel items={items} onFocus={vi.fn()} onClear={vi.fn()} />);
    expect(document.querySelector('#selCount')!.textContent).toBe('3');
    const groups = [...document.querySelectorAll(`${sel('panelGroup')} ${sel('panelGroupHead')}`)].map((g) => g.textContent);
    expect(groups[0]).toContain('Air');
    expect(groups[1]).toContain('News');
    expect(document.querySelector(sel('panelSummary'))!.textContent).toContain('3 markers across 2 layers');
  });

  it('calls onFocus with the item index and onClear from the button', () => {
    const onFocus = vi.fn();
    const onClear = vi.fn();
    renderThemed(<SelectionPanel items={[mp(0, 0, 'air'), mp(1, 1, 'air')]} onFocus={onFocus} onClear={onClear} />);
    fireEvent.click(document.querySelectorAll(sel('panelItem'))[1]!);
    expect(onFocus).toHaveBeenCalledWith(1);
    fireEvent.click(document.querySelector(sel('panelClear'))!);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('caps each group at 40 rows and shows the remainder', () => {
    const items = Array.from({ length: 45 }, (_, i) => mp(i, i, 'air'));
    renderThemed(<SelectionPanel items={items} onFocus={vi.fn()} onClear={vi.fn()} />);
    expect(document.querySelectorAll(sel('panelItem'))).toHaveLength(40);
    expect(document.querySelector(sel('panelMore'))!.textContent).toBe('+5 more');
  });

  it('stays open while a brief is present even with no markers', () => {
    renderThemed(<SelectionPanel items={[]} onFocus={vi.fn()} onClear={vi.fn()} hasBrief brief={<div>brief</div>} />);
    expect(document.querySelector('#selPanel')).not.toBeNull();
    expect(document.querySelector('#abMount')!.textContent).toBe('brief');
  });
});

// ─── AreaBrief payload + loader ──────────────────────────────────────────────────────────────────

function fakeApi(post: ReturnType<typeof vi.fn>): ApiClient {
  return { post, get: vi.fn(), put: vi.fn(), del: vi.fn(), request: vi.fn() } as unknown as ApiClient;
}

const circleShape: Shape = { kind: 'circle', center: { lat: 48.85, lng: 2.35 }, radiusKm: 50 };

describe('AreaBrief payload helpers', () => {
  it('shapePayload encodes circle and polygon payloads', () => {
    expect(shapePayload(circleShape)).toEqual({ kind: 'circle', center: { lat: 48.85, lng: 2.35 }, radiusKm: 50 });
    const payload = shapePayload({ kind: 'poly', ring: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }] }) as {
      kind: string;
      ring: number[][];
    };
    expect(payload.kind).toBe('polygon');
    expect(payload.ring).toEqual([[2, 1], [4, 3], [6, 5]]);
  });

  it('markersPayload counts by type and samples priority order', () => {
    const payload = markersPayload([mp(0, 0, 'air'), mp(1, 1, 'air'), mp(2, 2, 'news')]);
    expect(payload.counts).toEqual({ air: 2, news: 1 });
    expect(payload.samples[0]).toContain('Air: head');
  });

  it('abFormatUsd and abLinkFor match the legacy formatting', () => {
    expect(abFormatUsd(0)).toBe('$0.0000');
    expect(abFormatUsd(0.00005)).toBe('<$0.0001');
    expect(abFormatUsd(0.005)).toBe('$0.0050');
    expect(abFormatUsd(null)).toBeNull();
    expect(abLinkFor({ id: 'a b' })).toBe('/digest?open=a%20b');
    expect(abLinkFor({ url: 'https://e.com' })).toBe('https://e.com');
  });
});

describe('loadAreaBrief', () => {
  it('runs the articles stage then the brief stage, reporting each', async () => {
    const modes: string[] = [];
    const post = vi.fn((_path: string, body: { mode: string }) => {
      modes.push(body.mode);
      if (body.mode === 'articles') {
        return Promise.resolve({ places: [{ name: 'Paris' }], fallback: false, articles: [{ title: 'A' }], total: 1 });
      }
      return Promise.resolve({
        brief: { headline: 'H', summary: 'S [1]', developments: ['D'], watch: 'W', tone: 'calm' },
        llm: { keyOwner: 'user', provider: 'p', model: 'm', costUsd: 0.001, costExact: true },
      });
    });
    const updates: Partial<AreaBriefState>[] = [];
    await loadAreaBrief(fakeApi(post), {
      shape: circleShape,
      markers: { counts: { air: 1 }, samples: [] },
      onUpdate: (patch) => updates.push(patch),
    });

    expect(modes).toEqual(['articles', 'brief']);
    expect(updates[0]).toMatchObject({ status: 'loading', isBriefLoading: true });
    expect(updates.some((u) => u.status === 'ready' && u.places?.[0]?.name === 'Paris')).toBe(true);
    expect(updates.some((u) => u.brief?.headline === 'H')).toBe(true);
    expect(updates.at(-1)).toMatchObject({ isBriefLoading: false });
  });

  it('ignores an aborted prior request', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    let firstPending = true;
    const post = vi.fn((_path: string, body: { mode: string }) => {
      if (body.mode === 'articles') {
        if (firstPending) {
          firstPending = false;
          return new Promise<unknown>((resolve) => { resolveFirst = resolve; });
        }
        return Promise.resolve({ places: [{ name: 'B' }], articles: [], total: 0 });
      }
      return Promise.resolve({ brief: null, llm: null });
    });
    const api = fakeApi(post);
    const first: Partial<AreaBriefState>[] = [];
    const second: Partial<AreaBriefState>[] = [];

    const p1 = loadAreaBrief(api, {
      shape: circleShape,
      markers: { counts: {}, samples: [] },
      onUpdate: (patch) => first.push(patch),
    });
    const p2 = loadAreaBrief(api, {
      shape: circleShape,
      markers: { counts: {}, samples: [] },
      onUpdate: (patch) => second.push(patch),
    });

    resolveFirst({ places: [{ name: 'A' }], articles: [], total: 0 });
    await Promise.all([p1, p2]);

    expect(first.some((u) => u.places?.some((p) => p.name === 'A'))).toBe(false);
    expect(second.some((u) => u.places?.some((p) => p.name === 'B'))).toBe(true);
  });
});

describe('AreaBrief rendering', () => {
  it('renders the skeleton while loading', () => {
    renderThemed(<AreaBrief state={{ ...EMPTY_AREA_BRIEF, status: 'loading' }} />);
    expect(document.querySelectorAll(sel('briefSkeleton'))).toHaveLength(4);
    expect(document.querySelector(sel('briefStatus'))!.textContent).toContain('Finding places');
  });

  it('renders citations, headlines and the cost foot', () => {
    const state: AreaBriefState = {
      ...EMPTY_AREA_BRIEF,
      status: 'ready',
      places: [{ name: 'Paris' }],
      articles: [{ id: 'a1', title: 'Headline', source: 'Wire', url: 'https://e.com/1' }],
      total: 1,
      brief: { headline: 'Big', summary: 'See [1]', developments: ['Also [1]'], watch: 'Watch [1]', tone: 'calm' },
      llm: { keyOwner: 'user', provider: 'anthropic', model: 'claude', costUsd: 0.0042, costExact: true },
    };
    renderThemed(<AreaBrief state={state} />);
    const cite = document.querySelector(sel('briefCite')) as HTMLAnchorElement;
    expect(cite.textContent).toBe('1');
    expect(cite.getAttribute('href')).toBe('/digest?open=a1');
    expect(document.querySelector(sel('briefNewsHead'))!.textContent).toContain('Recent coverage');
    expect(document.querySelector(sel('briefItem'))!.getAttribute('id')).toBe('abn1');
    expect(document.querySelector(sel('briefFoot'))!.textContent).toContain('$0.0042');
  });
});
