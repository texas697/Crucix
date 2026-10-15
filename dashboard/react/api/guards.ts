import { isRecord } from './isRecord';
import type { HealthResponse, SweepData } from './types';

export function isSweepData(x: unknown): x is SweepData {
  if (!isRecord(x)) return false;
  const meta = x.meta;
  if (!isRecord(meta)) return false;
  if (!('timestamp' in meta)) return false;
  const timestamp = meta.timestamp;
  return typeof timestamp === 'string' || timestamp === null;
}

export function assertSweepData(x: unknown): asserts x is SweepData {
  if (!isSweepData(x)) {
    throw new Error(
      '[crucix] invalid /api/data envelope: expected a non-null object with a meta.timestamp string or null',
    );
  }
}

export function isHealth(x: unknown): x is HealthResponse {
  return isRecord(x) && typeof x.status === 'string';
}

export function parseSweep(json: unknown): SweepData {
  assertSweepData(json);
  return json;
}
