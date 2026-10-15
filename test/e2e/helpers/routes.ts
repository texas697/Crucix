import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Routes every third-party request the legacy pages make to a pinned local copy under
// test/fixtures/vendor. Any third-party request that is not vendored is aborted and recorded, so a
// test that accidentally hits the network fails instead of silently depending on the internet.
//
// Layout matches test/fixtures/vendor/MANIFEST.md. Requests to the fixture server itself
// (127.0.0.1/localhost) are passed through untouched.
const VENDOR = join(process.cwd(), 'test/fixtures/vendor');

const MIME: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.pbf': 'application/x-protobuf',
  '.mvt': 'application/x-protobuf',
  '.woff2': 'font/woff2',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
};

// Cross-origin subresources (fonts, HLS manifests/segments) are fetched by the browser with CORS
// enforced, so fulfilled responses must carry an allow-origin header.
const CORS = { 'access-control-allow-origin': '*' };

function resolveVendor(url: URL): string | null {
  const host = url.hostname;
  const path = url.pathname;

  if (host.endsWith('unpkg.com')) {
    if (/\/maplibre-gl@4\.7\.1\/dist\/maplibre-gl\.js$/.test(path)) return 'maplibre-gl-4.7.1/maplibre-gl.js';
    if (/\/maplibre-gl@4\.7\.1\/dist\/maplibre-gl\.css$/.test(path)) return 'maplibre-gl-4.7.1/maplibre-gl.css';
  }
  if (host.endsWith('cdnjs.cloudflare.com')) {
    if (path.includes('/gsap/3.12.5/gsap.min.js')) return 'gsap-3.12.5/gsap.min.js';
    if (path.includes('/satellite.js/6.0.1/satellite.min.js')) return 'satellite-6.0.1/satellite.min.js';
  }
  if (host.endsWith('jsdelivr.net') && path.includes('/hls.js@1.5.17/dist/hls.min.js')) {
    return 'hls-1.5.17/hls.min.js';
  }
  if (host === 'fonts.googleapis.com') {
    if (path.startsWith('/css2')) return 'fonts/geist.css';
    const woff = path.match(/^\/files\/(.+\.woff2)$/);
    if (woff) return `fonts/files/${woff[1]}`;
  }
  if (host.endsWith('cartocdn.com')) {
    const style = path.match(/\/gl\/(dark-matter|dark-matter-nolabels|positron)-gl-style\/style\.json$/);
    if (style) return `basemap/styles/${style[1]}.json`;
    if (path.includes('/sprite/')) return `basemap/sprite/${path.split('/sprite/')[1]}`;
    if (path.includes('/glyphs/')) return `basemap/glyphs/${path.split('/glyphs/')[1]}`;
    if (path.includes('/tiles/')) return `basemap/tiles/${path.split('/tiles/')[1]}`;
  }
  if (host === 'earthquake.usgs.gov') return 'data/usgs-2.5-day.geojson';
  if (host.endsWith('polymarket.com')) return 'data/polymarket-events.json';
  // Broadcaster HLS: any manifest or MPEG-TS segment resolves to the local deterministic stream.
  if (path.endsWith('.m3u8')) return 'hls-fixture/index.m3u8';
  if (path.endsWith('.ts')) return 'hls-fixture/seg0.ts';
  return null;
}

export interface VendorRoutes {
  /** Third-party requests that were neither localhost nor vendored. Must stay empty. */
  unrouted: string[];
  assertAllRouted(): void;
}

export async function installVendorRoutes(page: Page): Promise<VendorRoutes> {
  const unrouted: string[] = [];

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const host = url.hostname;

    // blob:/data: are in-page buffers (hls.js/MSE), not network requests — pass them through and
    // never flag them as unrouted third-party.
    if (url.protocol === 'blob:' || url.protocol === 'data:') {
      return route.continue();
    }

    if (host === '127.0.0.1' || host === 'localhost' || host === '[::1]') {
      return route.continue();
    }

    const rel = resolveVendor(url);
    if (rel) {
      const abs = join(VENDOR, rel);
      if (existsSync(abs)) {
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({
            status: 204,
            headers: {
              ...CORS,
              'access-control-allow-methods': 'GET, OPTIONS',
              'access-control-allow-headers': '*',
            },
          });
        }
        const ext = rel.slice(rel.lastIndexOf('.'));
        return route.fulfill({
          status: 200,
          body: readFileSync(abs),
          headers: CORS,
          contentType: MIME[ext] || 'application/octet-stream',
        });
      }
    }

    unrouted.push(url.href);
    return route.abort('blockedbyclient');
  });

  return {
    unrouted,
    assertAllRouted() {
      if (unrouted.length) {
        throw new Error(`Unrouted third-party request(s):\n  ${unrouted.join('\n  ')}`);
      }
    },
  };
}
