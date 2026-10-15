// Guards the manifest CSS-collection bug: Vite attaches imported CSS to the shared chunk that
// imports it (e.g. the PageShell chunk), leaving the entry's own `css` array empty — so entryAssets
// must walk the entry's imports or the React pages ship with no stylesheet at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entryAssets, hasSurface } from '../dashboard/server/ui.mjs';

const manifest = {
  '_PageShell-abc.css': { file: 'assets/PageShell-abc.css' },
  '_PageShell-def.js': { file: 'assets/PageShell-def.js', css: ['assets/PageShell-abc.css'] },
  '_map-ghi.js': { file: 'assets/map-ghi.js' },
  'entries/dashboard.tsx': {
    file: 'assets/dashboard-xyz.js',
    css: [],
    imports: ['_PageShell-def.js', '_map-ghi.js'],
    isEntry: true,
  },
};

test('entryAssets collects CSS from the entry and its imported chunks', () => {
  const assets = entryAssets(manifest, 'dashboard');
  assert.ok(assets, 'entry should resolve');
  assert.deepEqual(assets.js, ['assets/dashboard-xyz.js']);
  assert.deepEqual(assets.css, ['assets/PageShell-abc.css']);
});

test('entryAssets walks transitively and de-duplicates', () => {
  const nested = {
    '_a.css': { file: 'assets/a.css' },
    '_a.js': { file: 'assets/a.js', css: ['assets/a.css'] },
    '_b.js': { file: 'assets/b.js', css: ['assets/a.css'], imports: ['_a.js'] },
    'entries/digest.tsx': { file: 'assets/digest.js', css: [], imports: ['_b.js'] },
  };
  const assets = entryAssets(nested, 'digest');
  assert.deepEqual(assets.css, ['assets/a.css']);
});

test('entryAssets returns null for a missing surface', () => {
  assert.equal(entryAssets(manifest, 'media'), null);
  assert.equal(hasSurface(manifest, 'media'), false);
  assert.equal(hasSurface(manifest, 'dashboard'), true);
});
