import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

let registeredUrl: string | null = null;

export function registerMapWorker(url: string = workerUrl): string {
  if (registeredUrl) return registeredUrl;
  registeredUrl = url;
  setWorkerUrl(url);
  return url;
}
