export const DEFAULT_POLL_MS = 60000;
export const STARTING_RETRY_MS = 5000;
export const DATA_PATH = '/api/data';
export const HEALTH_PATH = '/api/health';
export const EVENTS_PATH = '/events';
export const STREAM_EVENT_TYPES = ['message', 'connected', 'sweep_start', 'update', 'sweep_error'] as const;
