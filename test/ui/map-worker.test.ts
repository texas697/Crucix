import { describe, expect, it, vi } from 'vitest';
import { getWorkerUrl } from 'maplibre-gl';
import { registerMapWorker } from '../../dashboard/react/features/map/mapWorker';
import { installFileWorkerShim } from '../../dashboard/react/standalone/fileWorkerShim';

// maplibre 6 ships its worker as a separate ES module and resolves it next to its own bundle, which
// does not exist in the Vite output; the map registers the emitted asset URL once instead.
describe('registerMapWorker', () => {
  it('points maplibre at the bundled worker asset and registers only once', () => {
    const url = registerMapWorker();
    expect(url).toMatch(/maplibre-gl-worker/);
    expect(getWorkerUrl()).toBe(url);
    expect(registerMapWorker('data:text/javascript,ignored')).toBe(url);
    expect(getWorkerUrl()).toBe(url);
  });
});

// On a file:// page maplibre treats its data: worker URL as cross-origin and wraps it in a blob
// `import`, which Chromium refuses for module workers; the standalone swaps that blob back for the
// registered URL and leaves every other worker (hls.js, classic blobs) untouched.
describe('installFileWorkerShim', () => {
  it('is a no-op away from file://', () => {
    const scope = { Worker: vi.fn() as unknown as typeof Worker };
    expect(installFileWorkerShim({ protocol: 'http:', scope })).toBe(false);
    expect(scope.Worker).toBe(scope.Worker);
  });

  it('replaces blob module workers with the registered map worker on file://', () => {
    const calls: Array<[string | URL, WorkerOptions | undefined]> = [];
    class FakeWorker {
      constructor(url: string | URL, options?: WorkerOptions) { calls.push([url, options]); }
    }
    const scope = { Worker: FakeWorker as unknown as typeof Worker };
    expect(installFileWorkerShim({ protocol: 'file:', scope })).toBe(true);
    expect(scope.Worker).not.toBe(FakeWorker);
    new scope.Worker('blob:null/abc', { type: 'module' });
    new scope.Worker('blob:null/hls');
    new scope.Worker('https://e.com/w.js', { type: 'module' });
    expect(calls[0]![0]).toBe(registerMapWorker());
    expect(calls[1]![0]).toBe('blob:null/hls');
    expect(calls[2]![0]).toBe('https://e.com/w.js');
  });
});
