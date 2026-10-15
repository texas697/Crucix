export interface SharedLlmInfo {
  provider: string;
  model: string | null;
}

export interface LlmProvider {
  id: string;
  label: string;
  needsKey?: boolean;
  defaultModel?: string;
  needsBaseUrl?: boolean;
}

export interface PublicLlm {
  provider: string;
  model: string | null;
  baseUrl: string | null;
  hasKey: boolean;
  keyHint: string | null;
  autoIdeas: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string | null;
  ideas?: unknown;
  llm?: PublicLlm | null;
  providers: LlmProvider[];
  byokEnabled: boolean;
  sharedLlm: SharedLlmInfo | null;
}
