export interface AbPlace {
  name: string;
  lat?: number;
  lon?: number;
  [key: string]: unknown;
}

export interface AbArticle {
  id?: string;
  url?: string;
  title?: string;
  source?: string;
  publishedAt?: string;
  via?: string;
  [key: string]: unknown;
}

export interface AbBrief {
  headline?: string;
  summary?: string;
  developments?: string[];
  watch?: string;
  tone?: string;
  [key: string]: unknown;
}

export interface AbLlm {
  keyOwner?: string;
  provider?: string;
  model?: string;
  costUsd?: number | null;
  costLabel?: string;
  costExact?: boolean;
  inputPerM?: number;
  outputPerM?: number;
  inputTokens?: number;
  outputTokens?: number;
  [key: string]: unknown;
}

export interface AreaBriefMarkers {
  counts: Record<string, number>;
  samples: string[];
}

export interface AreaBriefState {
  status: 'idle' | 'loading' | 'ready';
  places: AbPlace[];
  isFallback: boolean;
  articles: AbArticle[];
  total: number;
  brief: AbBrief | null;
  llm: AbLlm | null;
  error: string | null;
  errorKind: string | null;
  isBriefLoading: boolean;
}

export const EMPTY_AREA_BRIEF: AreaBriefState = {
  status: 'idle',
  places: [],
  isFallback: false,
  articles: [],
  total: 0,
  brief: null,
  llm: null,
  error: null,
  errorKind: null,
  isBriefLoading: false,
};

export interface AbResponse extends Partial<AreaBriefState> {
  fallback?: boolean;
  error?: string;
  budget?: string;
}
