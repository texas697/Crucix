// Runtime guards for the synthesized `/api/data` envelope and the gated health payload.
//
// Design constraints:
//   - Tolerate missing optional sources (the envelope has exactly one required field, `meta`).
//   - Reject a wrong envelope rather than crashing, even on hostile input (arrays, strings, null,
//     prototypes, etc.). Guards must never throw.
//   - Keep the check small: `meta` must be a non-null object with a present `timestamp` that is
//     either a string or null. Everything else is left to the consumers.

import type { HealthResponse, SweepData } from './types';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * True iff `x` looks like a synthesized `/api/data` envelope: a non-null, non-array object whose
 * `meta` is a non-null, non-array object with the `timestamp` key present as a string or null.
 *
 * Optional sources are not inspected, so a `partial` sweep (some sources disabled/failed) passes.
 */
export function isSweepData(x: unknown): x is SweepData {
  if (!isRecord(x)) return false;
  const meta = x.meta;
  if (!isRecord(meta)) return false;
  if (!('timestamp' in meta)) return false;
  const timestamp = meta.timestamp;
  return typeof timestamp === 'string' || timestamp === null;
}

/** Throws a clear, actionable Error when `x` is not a synthesized envelope. */
export function assertSweepData(x: unknown): asserts x is SweepData {
  if (!isSweepData(x)) {
    throw new Error(
      '[crucix] invalid /api/data envelope: expected a non-null object with a meta.timestamp string or null',
    );
  }
}

/** True iff `x` looks like the gated `/api/health` payload: an object with a string `status`. */
export function isHealth(x: unknown): x is HealthResponse {
  return isRecord(x) && typeof x.status === 'string';
}

/** Assert + narrow: returns the envelope typed as {@link SweepData}. */
export function parseSweep(json: unknown): SweepData {
  assertSweepData(json);
  return json;
}
