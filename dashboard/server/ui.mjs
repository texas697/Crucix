// Manifest-driven rendering for the React surfaces.
//
// Express selects a surface and asks this module for the HTML: it resolves the entry script and its
// stylesheet from the Vite manifest emitted into dashboard/dist, and never assumes a bundle name.
// Public site pages (P7) get their own server-rendered entry here later.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_LOCATIONS = [
  join('dashboard', 'dist', '.vite', 'manifest.json'),
  join('dashboard', 'dist', 'manifest.json'),
];

/** Load the Vite manifest, or null when no frontend build is present (legacy-only boot). */
export function loadManifest(root) {
  for (const rel of MANIFEST_LOCATIONS) {
    const p = join(root, rel);
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8'));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Resolve the script and stylesheet URLs for an entry (entries/<entry>.tsx).
 * Returns null when the manifest has no such entry.
 *
 * CSS is NOT always on the entry's own `css` array: Vite attaches imported CSS to the shared chunk
 * that imports it (e.g. the PageShell chunk), leaving the entry's `css` empty. So walk the entry's
 * `imports` graph and collect every referenced chunk's CSS, or the pages ship unstyled.
 */
export function entryForSurface(surface) {
  return surface === 'login' ? 'login' : 'app';
}

export function entryAssets(manifest, entryName) {
  if (!manifest) return null;
  const key = Object.keys(manifest).find((k) => k.replace(/\\/g, '/').endsWith(`entries/${entryName}.tsx`));
  if (!key) return null;
  const entry = manifest[key];
  if (!entry?.file) return null;
  const css = new Set();
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const chunk = manifest[name];
    if (!chunk) return;
    for (const file of chunk.css || []) css.add(file);
    // Vite's runtime loads the entry's imports itself, so only the entry JS is emitted here; the
    // imports are walked solely to pick up their CSS.
    for (const dep of chunk.imports || []) visit(dep);
  };
  visit(key);
  return { js: [entry.file], css: [...css] };
}

/** True when the surface can be served from the React build. */
export function hasSurface(manifest, surface) {
  return entryAssets(manifest, entryForSurface(surface)) !== null;
}

export function escapeInlineJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function uiFlagsScript(flags) {
  return `<script>window.__CRUCIX_UI__=${escapeInlineJson(flags)};</script>`;
}

const LOGIN_FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">';
const HEAD_LINKS = `<link rel="icon" href="/brand/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16.png">
  <link rel="apple-touch-icon" href="/brand/apple-touch-icon-180.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">`;

/**
 * Build the full HTML document for a React surface.
 * @param {object} opts
 * @param {string} opts.surface
 * @param {string} opts.title
 * @param {{js: string[], css: string[]}} opts.assets
 * @param {string} [opts.head] extra markup for <head> (locale/config boot scripts)
 * @param {string} [opts.body] markup rendered inside <body> before the script
 */
export function renderSurfaceDocument({ surface, title, assets, head = '', body = '' }) {
  const css = assets.css.map((f) => `  <link rel="stylesheet" href="/${f}">`).join('\n');
  const js = assets.js.map((f) => `  <script type="module" src="/${f}"></script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${HEAD_LINKS}${surface === 'login' ? `\n  ${LOGIN_FONT_LINK}` : ''}
${css ? css + '\n' : ''}${head ? '  ' + head + '\n' : ''}</head>
<body data-surface="${escapeHtml(surface)}">
  <div id="root">${body}</div>
${js}
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
