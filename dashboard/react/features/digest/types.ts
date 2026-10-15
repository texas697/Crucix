import type { Dispatch, SetStateAction } from 'react';

export type DigestFilter = 'all' | 'foryou' | 'thinktank' | 'news';

export interface DigestFilterOption {
  value: DigestFilter;
  label: string;
}

export interface DigestCardItem {
  id: string;
  source: string;
  kind?: string;
  title: string;
  description?: string;
  publishedAt?: string;
  hasWriteup?: boolean;
  topics?: string[];
  vote?: number;
}

export interface DigestTopicCount {
  topic: string;
  count: number;
}

export type TasteEntry = { topic: string } | string;

export interface DigestListResponse {
  items: DigestCardItem[];
  topics?: DigestTopicCount[];
  total?: number;
  storeSize?: number;
  mode?: string;
  votes?: number;
  minVotesForAffinity?: number;
  taste?: { likes?: TasteEntry[]; dislikes?: TasteEntry[] };
}

export interface DigestTaste {
  likes: string[];
  dislikes: string[];
}

export interface DigestAppProps {
  hasTavily: boolean;
  now?: () => number;
}

export interface DigestRoute {
  id: string;
  filter: DigestFilter;
  topic: string;
  q: string;
}

export interface DigestViewState {
  filter: DigestFilter;
  topic: string;
  q: string;
  openArticleId: string | null;
}

export type DigestLoader = (filter: DigestFilter, topic: string, q: string) => Promise<void>;

export interface DigestListState {
  items: DigestCardItem[];
  topics: DigestTopicCount[];
  taste: DigestTaste;
  status: string;
  setItems: Dispatch<SetStateAction<DigestCardItem[]>>;
  onLoad: DigestLoader;
}

export interface DigestViewActions {
  view: DigestViewState;
  searchValue: string;
  onChooseFilter: (filter: DigestFilter) => void;
  onSetTopic: (topic: string) => void;
  onToggleTopic: (topic: string) => void;
  onSearchChange: (value: string) => void;
  onOpenArticle: (id: string) => void;
  onCloseReader: () => void;
  onResolved: (id: string) => void;
}

export interface DigestVoteActions {
  onApplyVote: (id: string, rating: number) => void;
  onRateFromCard: (id: string, rating: number) => void;
}
