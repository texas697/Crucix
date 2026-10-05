// OpenAI Provider — raw fetch, no SDK

import { LLMProvider } from './provider.mjs';

export class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'openai';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-5.4';
    this.baseUrl = config.baseUrl || null; // OpenAI-compatible endpoint (e.g. Groq, Together, LM Studio)
  }

  get isConfigured() { return !!this.apiKey || !!this.baseUrl; }

  async complete(systemPrompt, userMessage, opts = {}) {
    const base = (this.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: opts.maxTokens || 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeout || 60000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`OpenAI API ${res.status}: ${err.substring(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      model: data.model || this.model,
    };
  }
}
