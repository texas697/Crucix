import type { SweepData } from '../../api/types';
import type { Translator } from '../../shared/locale';

export interface DashboardAppProps {
  now?: () => number;
}

export type RowName = 'a' | 'b' | 'c' | 'd' | 'e';

export interface PanelDataProps {
  data: SweepData;
  t?: Translator;
}

export interface TickerItem {
  headline?: string;
  source?: string;
  timestamp?: string;
  region?: string;
  urgent?: boolean;
  url?: string;
}

export interface QuakeItem {
  id?: string;
  mag?: number;
  place?: string;
  lat?: number | null;
  lon?: number | null;
  depth?: number | null;
  ts?: string | null;
  url?: string | null;
  tsunami?: number | boolean | null;
  [key: string]: unknown;
}

export interface AlertItem {
  time?: string;
  cities?: string[];
  drill?: boolean;
}

export interface TrackItem {
  type?: string;
  locality?: string;
  region?: string;
  confidence?: number;
  sourceCount?: number;
  updatedAt?: string;
}

export interface MarketItem {
  title?: string;
  yes?: number;
  vol?: number;
  slug?: string;
}

export interface LiveFeedIntervals {
  tracks?: number;
  alerts?: number;
  quakes?: number;
  markets?: number;
}

export interface LiveFeeds {
  tracks: TrackItem[] | null;
  alerts: AlertItem[] | null;
  quakes: QuakeItem[] | null;
  markets: MarketItem[] | null;
}

export interface IdeasPayload {
  ideas?: unknown[];
  provider?: string;
  generatedAt?: string;
}

export interface PopupInfo {
  head?: string;
  text?: string;
  meta?: string;
  url?: string;
  isNew?: boolean;
  lng: number;
  lat: number;
  left: number;
  top: number;
}

export interface SignalGuideItem {
  term: string;
  category: string;
  meaning: string;
  matters: string;
  notMeaning: string;
  example: string;
}
