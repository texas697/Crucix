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
 * Resolve the script and stylesheet URLs for a surface entry (entries/<surface>.tsx).
 * Returns null when the manifest has no such entry.
 */
export function entryAssets(manifest, surface) {
  if (!manifest) return null;
  const key = Object.keys(manifest).find((k) => k.replace(/\\/g, '/').endsWith(`entries/${surface}.tsx`));
  if (!key) return null;
  const entry = manifest[key];
  if (!entry?.file) return null;
  // Vite's runtime loads the entry's imports itself, so only the entry file and its CSS are needed.
  const css = Array.isArray(entry.css) ? entry.css : [];
  return { js: [entry.file], css };
}

/** True when the surface can be served from the React build. */
export function hasSurface(manifest, surface) {
  return entryAssets(manifest, surface) !== null;
}

const SPECULATION_RULES = `<script type="speculationrules">{"prerender":[{"source":"list","urls":["/","/digest","/media"],"eagerness":"moderate"}]}</script>`;

/**
 * Build the full HTML document for a React surface.
 * @param {object} opts
 * @param {string} opts.surface
 * @param {string} opts.title
 * @param {{js: string[], css: string[]}} opts.assets
 * @param {string} [opts.head] extra markup for <head> (locale/config boot scripts)
 * @param {string} [opts.body] markup rendered inside <body> before the script
 * @param {boolean} [opts.navigation] include speculation rules + view-transition opt-in
 */
export function renderSurfaceDocument({ surface, title, assets, head = '', body = '', navigation = false }) {
  const css = assets.css.map((f) => `  <link rel="stylesheet" href="/${f}">`).join('\n');
  const js = assets.js.map((f) => `  <script type="module" src="/${f}"></script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
${css ? css + '\n' : ''}  <style>@view-transition { navigation: auto; }</style>
  ${navigation ? SPECULATION_RULES : ''}
${head ? '  ' + head + '\n' : ''}</head>
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
