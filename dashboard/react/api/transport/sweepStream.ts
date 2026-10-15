import { isRecord } from '../isRecord';
import type { SweepData } from '../types';
import { EVENTS_PATH, STREAM_EVENT_TYPES } from './consts';
import type { SweepFrame, SweepStream } from './types';

export function shouldUseSse(hostname: string): boolean {
  if (!hostname) return false;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.run.app');
}

export function resolveEventSource(EventSourceImpl?: typeof EventSource): typeof EventSource | undefined {
  return EventSourceImpl ?? (typeof EventSource !== 'undefined' ? EventSource : undefined);
}

function parseJson(raw: unknown): unknown {
  try {
    return JSON.parse(String(raw)) as unknown;
  } catch {
    return undefined;
  }
}

export function readSweepFrame(eventType: string, event: Event): SweepFrame | null {
  const payload = parseJson((event as MessageEvent).data);
  const fields = isRecord(payload) ? payload : {};
  if (eventType !== 'message') return { type: eventType, data: fields.data, error: fields.error };
  if (typeof fields.type !== 'string') return null;
  return { type: fields.type, data: fields.data, error: fields.error };
}

export interface OpenSweepStreamArgs {
  EventSourceCtor: typeof EventSource;
  onUpdate: (data: SweepData) => void;
  onConnected: () => void;
  onSweepError: (error: unknown) => void;
}

export function openSweepStream({ EventSourceCtor, onUpdate, onConnected, onSweepError }: OpenSweepStreamArgs): SweepStream {
  const source = new EventSourceCtor(EVENTS_PATH);
  const listeners: Array<[string, EventListener]> = [];

  function dispatch(frame: SweepFrame, event: Event): void {
    if (frame.type === 'update' && frame.data !== undefined) onUpdate(frame.data as SweepData);
    else if (frame.type === 'connected') onConnected();
    else if (frame.type === 'sweep_error') onSweepError(typeof frame.error === 'string' ? new Error(frame.error) : event);
  }

  for (const type of STREAM_EVENT_TYPES) {
    const listener: EventListener = (event) => {
      const frame = readSweepFrame(type, event);
      if (frame) dispatch(frame, event);
    };
    source.addEventListener(type, listener);
    listeners.push([type, listener]);
  }

  return {
    close: () => {
      for (const [type, listener] of listeners) source.removeEventListener(type, listener);
      listeners.length = 0;
      source.close();
    },
  };
}
