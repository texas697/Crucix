export type SpaceStation = Record<string, unknown>;

export interface SatPosition {
  lat: number;
  lon: number;
  alt: number | null;
  vel: number | null;
  live: true;
}

export interface SpaceLiveTick {
  station: SpaceStation;
  pos: SatPosition;
}

export interface SpaceLiveOptions {
  getStations: () => SpaceStation[];
  onTick: (positions: SpaceLiveTick[]) => void;
  intervalMs?: number;
}

export interface SpaceLive {
  start(): void;
  stop(): void;
}

export type BasemapKey = 'dark' | 'muted' | 'light';
