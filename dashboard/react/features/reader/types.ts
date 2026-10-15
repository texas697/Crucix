import type { ApiClient } from '../../api/client';
import type { UserProfile } from '../../api/types';

export type ResearchStateKind = 'none' | 'running' | 'done' | 'error';

export interface ResearchState {
  state: ResearchStateKind;
  stage?: string;
  progress?: number;
  markdown?: string;
  model?: string;
  completedAt?: string;
  error?: string;
}

export interface Article {
  id: string | null;
  url?: string | null;
  title?: string;
  source?: string;
  vote?: number;
  kind?: string;
  author?: string;
  publishedAt?: string;
  description?: string;
  summaryMd?: string;
  summarizedBy?: string;
  summaryModel?: string;
  extracted?: boolean;
  topics?: string[];
  research?: ResearchState;
}

export interface ReaderTarget { id?: string; url?: string }

export type ReaderStatus = 'idle' | 'loading' | 'error';

export interface ReaderProps {
  target: ReaderTarget | null;
  api: ApiClient;
  me: UserProfile | null;
  hasTavily: boolean;
  onClose: () => void;
  onResolved?: (id: string, url?: string | null) => void;
  onVote?: (id: string, rating: number) => void;
  onTopic?: (topic: string) => void;
  onOpenSettings: () => void;
  pollMs?: number;
  now?: () => number;
}

export interface ReaderLoadState {
  article: Article | null;
  status: ReaderStatus;
  error: string;
  setArticle: React.Dispatch<React.SetStateAction<Article | null>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export interface ReaderActions {
  onVote: (rating: number) => Promise<void>;
  onSummarize: () => Promise<void>;
  onResearch: () => Promise<void>;
}

export interface ReaderAccess {
  isAuthed: boolean;
  hasKey: boolean;
  hasTavily: boolean;
}

export interface ReaderDialogState {
  isFullScreen: boolean;
  onDialogClose: () => void;
}
