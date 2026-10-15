export type LooseRecord = Record<string, unknown>;

export interface SweepMeta {
  version: string;
  timestamp: string | null;
  sourcesQueried: number;
  sourcesOk: number;
  sourcesFailed: number;
  totalDurationMs: number;
}

export interface SweepData {
  meta: SweepMeta;
  air?: LooseRecord[];
  milAir?: LooseRecord[];
  thermal?: LooseRecord[];
  thermalMeta?: LooseRecord;
  tSignals?: string[];
  airMeta?: LooseRecord;
  chokepoints?: LooseRecord[];
  maritimeMeta?: LooseRecord;
  shipsMeta?: LooseRecord;
  nuke?: LooseRecord[];
  nukeSignals?: string[];
  nukeMeta?: LooseRecord;
  sdr?: LooseRecord;
  who?: LooseRecord[];
  healthWatch?: LooseRecord;
  disasters?: LooseRecord;
  outages?: LooseRecord;
  spaceWeather?: LooseRecord;
  fred?: LooseRecord[];
  energy?: LooseRecord;
  metals?: LooseRecord;
  bls?: LooseRecord[];
  treasury?: LooseRecord;
  gscpi?: LooseRecord | null;
  defense?: LooseRecord[];
  noaa?: LooseRecord;
  epa?: LooseRecord;
  gdelt?: LooseRecord;
  space?: LooseRecord;
  health?: LooseRecord[];
  news?: LooseRecord[];
  newsFeed?: LooseRecord[];
  markets?: LooseRecord;
  ideas?: unknown[];
  ideasSource?: string;
  delta?: unknown;
  [key: string]: unknown;
}
