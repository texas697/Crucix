import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';

// P8 standalone snapshot build. Emits one self-contained IIFE with the dashboard CSS inlined into a
// single stylesheet, so the exported HTML runs from `file:` with no ESM imports, no code-split chunks
// and no server-origin asset URLs:
//
//   dashboard/dist/standalone/crucix-standalone.js
//   dashboard/dist/standalone/crucix-standalone.css
//
// `base: './'` keeps the template's relative `<link>`/`<script src>` working from any directory. The
// MapLibre worker and all lazy imports are folded into the single chunk via `inlineDynamicImports`
// (the only IIFE-compatible option), so a `file:` open never issues a local chunk request. Sourcemaps
// are disabled because the artifact is shipped, not debugged. `dashboard/inject.mjs` turns the sibling
// `template.html` into `index.html` with the snapshot substituted in.
const repoRoot = process.cwd();
const reactRoot = join(repoRoot, 'dashboard', 'react');

export default defineConfig({
  root: reactRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: join(repoRoot, 'dashboard', 'dist', 'standalone'),
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
