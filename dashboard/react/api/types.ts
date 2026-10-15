// Types for the synthesized `/api/data` envelope and the small auth/health payloads the React
// surfaces consume. The authoritative shape is the fixture pair under
// `test/fixtures/synthesized/` (minimal.json and partial.json); these types mirror that structure
// deliberately loosely.
//
// Two rules drive the design:
//   1. Only `meta` is guaranteed. Every other top-level source is optional because a sweep can fail
//      or be disabled, and older runs predate newer sources.
//   2. Individual records are shaped loosely (arrays of records with optional fields, `unknown` for
//      complex sub-trees). The point is structure, not exhaustiveness: adding a new source or a new
//      field to an existing one must never require a type change here.

/** A JSON object with unknown fields. Used for the loosely-typed source records. */
export type LooseRecord = Record<string, unknown>;

/**
 * Crucix run metadata (`synthesize()` copies this from the run's `crucix` block). It is the only
 * required part of the envelope; the guards only insist on a present `timestamp`.
 */
export interface SweepMeta {
  /** Engine version that produced the run. */
  version: string;
  /** ISO timestamp of the sweep, or null while unavailable. */
  timestamp: string | null;
  /** How many sources the sweep attempted. */
  sourcesQueried: number;
  /** How many sources returned usable data. */
  sourcesOk: number;
  /** How many sources failed. */
  sourcesFailed: number;
  /** Wall-clock duration of the sweep in milliseconds. */
  totalDurationMs: number;
}

/**
 * The synthesized `/api/data` envelope. `meta` is always present; every source below is optional so
 * additions and missing/disabling of optional sources are tolerated without changing this type.
 */
export interface SweepData {
  meta: SweepMeta;

  /** Aircraft observations, one record per region. */
  air?: LooseRecord[];
  /** Individual military aircraft tracks. */
  milAir?: LooseRecord[];
  /** Thermal/fire detections, one record per region. */
  thermal?: LooseRecord[];
  /** Thermal source metadata (access, window, satellites...). */
  thermalMeta?: LooseRecord;
  /** Thermal signal strings (named `tSignals` by `synthesize()`). */
  tSignals?: string[];
  /** Air-source metadata. */
  airMeta?: LooseRecord;
  /** Maritime chokepoint flow records. */
  chokepoints?: LooseRecord[];
  /** Maritime source metadata. */
  maritimeMeta?: LooseRecord;
  /** AIS ship-stream metadata. */
  shipsMeta?: LooseRecord;
  /** Radiation monitoring sites. */
  nuke?: LooseRecord[];
  /** Radiation signal strings. */
  nukeSignals?: string[];
  /** Radiation source metadata. */
  nukeMeta?: LooseRecord;
  /** KiwiSDR directory summary and zones. */
  sdr?: LooseRecord;
  /** WHO outbreak notices. */
  who?: LooseRecord[];
  /** Health-watch summary (WHO/CDC/travel notices). */
  healthWatch?: LooseRecord;
  /** Disaster alerts (GDACS). */
  disasters?: LooseRecord;
  /** Internet outage summary (IODA + Cloudflare Radar). */
  outages?: LooseRecord;
  /** Space-weather summary (SWPC). */
  spaceWeather?: LooseRecord;
  /** FRED macro series. */
  fred?: LooseRecord[];
  /** Energy prices summary (EIA/Yahoo). */
  energy?: LooseRecord;
  /** Precious-metals summary. */
  metals?: LooseRecord;
  /** BLS economic series. */
  bls?: LooseRecord[];
  /** US Treasury summary. */
  treasury?: LooseRecord;
  /** NY Fed Global Supply Chain Pressure Index, or null when unavailable. */
  gscpi?: LooseRecord | null;
  /** Defense contract awards (USAspending). */
  defense?: LooseRecord[];
  /** NOAA weather alerts. */
  noaa?: LooseRecord;
  /** EPA radiological readings. */
  epa?: LooseRecord;
  /** GDELT event/article summary. */
  gdelt?: LooseRecord;
  /** Space/launch summary (CelesTrak). */
  space?: LooseRecord;
  /** Per-source health rows (`{ n, err, stale }`). */
  health?: LooseRecord[];
  /** RSS news items merged into the ticker. */
  news?: LooseRecord[];
  /** Merged RSS + GDELT feed items. */
  newsFeed?: LooseRecord[];
  /** Live market data (Yahoo Finance). */
  markets?: LooseRecord;
  /** Generated ideas (LLM- or rules-based; shape depends on generation mode). */
  ideas?: unknown[];
  /** Where the ideas came from (`llm`, `rules`, `disabled`, ...). */
  ideasSource?: string;
  /** Delta versus the previous run (shape owned by the delta engine). */
  delta?: unknown;

  /** Any additional top-level sources must be tolerated without a type change. */
  [key: string]: unknown;
}

/** Shared LLM advertised to authenticated users (the operator's configured provider, if any). */
export interface SharedLlmInfo {
  provider: string;
  model: string | null;
}

/** A BYOK provider the UI can offer (mirrors lib/auth/users.mjs SUPPORTED_PROVIDERS). */
export interface LlmProvider {
  id: string;
  label: string;
  needsKey?: boolean;
  defaultModel?: string;
  needsBaseUrl?: boolean;
}

/** The public (non-secret) fields of a user's saved BYOK settings. */
export interface PublicLlm {
  provider: string;
  model: string | null;
  baseUrl: string | null;
  hasKey: boolean;
  keyHint: string | null;
  autoIdeas: boolean;
}

/** Response shape of the gated `/api/me` endpoint. */
export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string | null;
  /** The user's saved ideas payload, if any. */
  ideas?: unknown;
  /** The user's per-account BYOK LLM settings (public fields only), if configured. */
  llm?: PublicLlm | null;
  /** Providers the UI can offer for BYOK. */
  providers: LlmProvider[];
  /** Whether BYOK is available on this deployment. */
  byokEnabled: boolean;
  /** The shared/operator LLM, or null when none is configured. */
  sharedLlm: SharedLlmInfo | null;
}

/** Response shape of the gated `/api/health` endpoint. */
export interface HealthResponse {
  status: string;
  uptime: number;
  lastSweep: string | null;
  nextSweep: string | null;
  sweepInProgress: boolean;
  sweepStartedAt: string | null;
  sourcesOk: number;
  sourcesFailed: number;
  llmEnabled: boolean;
  llmProvider: string | null;
  authEnabled: boolean;
  byokEnabled: boolean;
  sweepMode: string;
  refreshIntervalMinutes: number;
  language: string;
}
