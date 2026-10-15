import { registerMapWorker } from '../features/map/mapWorker';

export interface WorkerScope {
  Worker: typeof Worker;
}

export interface InstallFileWorkerShimArgs {
  protocol?: string;
  scope?: WorkerScope;
}

const isBlobModule = (url: string | URL, options?: WorkerOptions): boolean =>
  options?.type === 'module' && String(url).startsWith('blob:');

export function installFileWorkerShim({ protocol = window.location.protocol, scope = window }: InstallFileWorkerShimArgs = {}): boolean {
  if (protocol !== 'file:') return false;
  const NativeWorker = scope.Worker;
  class FileWorker extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(isBlobModule(url, options) ? registerMapWorker() : url, options);
    }
  }
  scope.Worker = FileWorker;
  return true;
}
