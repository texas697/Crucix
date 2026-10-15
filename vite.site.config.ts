import { defineConfig } from 'vite';
import { join } from 'node:path';

// Separate SSR build for the public-site pages (rendered once at process start). React and React DOM
// stay external so the runtime image's production dependencies are used; the .tsx page components are
// bundled into dashboard/dist/site/server.js.
const repoRoot = process.cwd();

export default defineConfig({
  build: {
    ssr: join(repoRoot, 'dashboard', 'react', 'site', 'entry.server.ts'),
    outDir: join(repoRoot, 'dashboard', 'dist', 'site'),
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'server.js', format: 'es' },
    },
  },
});
