import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';

// Frontend build for dashboard/react. Vite's root is the React source tree (NOT the repository
// root), the build emits to dashboard/dist with a manifest Express reads, and the dev server's
// file-system access is limited to the React tree plus node_modules.
const repoRoot = process.cwd();
const reactRoot = join(repoRoot, 'dashboard', 'react');

export default defineConfig({
  root: reactRoot,
  plugins: [react()],
  build: {
    outDir: join(repoRoot, 'dashboard', 'dist'),
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        dashboard: join(reactRoot, 'entries', 'dashboard.tsx'),
        digest: join(reactRoot, 'entries', 'digest.tsx'),
        media: join(reactRoot, 'entries', 'media.tsx'),
        login: join(reactRoot, 'entries', 'login.tsx'),
      },
      output: {
        // Keep MapLibre (and satellite.js) in their own chunk so the dashboard shell and the other
        // surfaces never pay for the map bundle.
        manualChunks(id: string) {
          if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/satellite.js')) return 'map';
          return undefined;
        },
      },
    },
  },
  server: {
    // The dev adapter is mounted inside Express (middleware mode); it must never expose repository
    // files. Keep file-system access strict and limited to the React tree and installed deps.
    fs: {
      strict: true,
      allow: [reactRoot, join(repoRoot, 'node_modules')],
      deny: ['.env', '.env.*', 'deploy/**', 'runs/**', '**/*.mjs'],
    },
  },
});
