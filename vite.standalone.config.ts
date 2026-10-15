import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// P8 standalone snapshot build. Emits one self-contained IIFE (styles are injected at runtime by the
// MUI theme and the legacy GlobalStyles), so the exported HTML runs from `file:` with no ESM imports,
// no code-split chunks and no server-origin asset URLs:
//
//   dashboard/dist/standalone/crucix-standalone.js
//
// `base: './'` keeps the template's relative `<link>`/`<script src>` working from any directory. The
// MapLibre worker and all lazy imports are folded into the single chunk via `inlineDynamicImports`
// (the only IIFE-compatible option), so a `file:` open never issues a local chunk request. Sourcemaps
// are disabled because the artifact is shipped, not debugged. `dashboard/inject.mjs` turns the sibling
// `template.html` into `index.html` with the snapshot substituted in.
const repoRoot = process.cwd();
const reactRoot = join(repoRoot, 'dashboard', 'react');
const outDir = join(repoRoot, 'dashboard', 'dist', 'standalone');
// SnapshotTopBar references the navbar logos by the relative `./brand/` path the server also serves,
// so the export copies them next to the bundle; without this a `file:` open shows the alt text.
const BRAND_LOGOS = ['mfb-intelligence-navbar-dark-transparent.png', 'mfb-intelligence-navbar-light-transparent.png'];
function copyBrandLogos(): Plugin {
  return {
    name: 'crucix-copy-brand-logos',
    closeBundle() {
      const dir = join(outDir, 'brand');
      mkdirSync(dir, { recursive: true });
      for (const file of BRAND_LOGOS) copyFileSync(join(repoRoot, 'dashboard', 'public', 'brand', file), join(dir, file));
    },
  };
}

export default defineConfig({
  root: reactRoot,
  base: './',
  plugins: [react(), copyBrandLogos()],
  resolve: {
    // Same per-icon ESM alias as vite.config.ts (rolldown's CJS interop breaks the icon default export).
    alias: [{ find: /^@mui\/icons-material\/(?!esm\/)([A-Za-z0-9]+)$/, replacement: '@mui/icons-material/esm/$1' }],
  },
  // Library builds leave `process.env.NODE_ENV` for the consumer; a `file:` page has no consumer.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: 'es2020',
    lib: {
      entry: join(reactRoot, 'standalone', 'entry.tsx'),
      name: 'CrucixStandalone',
      formats: ['iife'],
      fileName: () => 'crucix-standalone.js',
    },
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'CrucixStandalone',
        inlineDynamicImports: true,
        entryFileNames: 'crucix-standalone.js',
        assetFileNames: 'crucix-standalone.[ext]',
      },
    },
  },
});
