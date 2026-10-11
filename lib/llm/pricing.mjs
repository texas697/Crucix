// Per-model list prices (USD per 1M tokens) used to estimate what one LLM call cost.
// xAI returns the exact charge in `usage.cost_in_usd_ticks` (1 tick = 1e-10 USD); other providers are estimated
// from this table. Unknown models return null so the UI can say "cost unavailable" instead of guessing.
// Prices checked 2026-10-11 against each vendor's public pricing page.

const PRICES = {
  grok: {
    'grok-4.7': [2.0, 6.0], 'grok-4.6': [2.0, 6.0], 'grok-4.5': [2.0, 6.0],
    'grok-4.3': [1.25, 2.5],
    'grok-4.20-0309-reasoning': [1.25, 2.5], 'grok-4.20-0309-non-reasoning': [1.25, 2.5], 'grok-4.20-multi-agent-0309': [1.25, 2.5],
    'grok-build-0.1': [1.0, 2.0],
    'grok-4-latest': [3.0, 15.0], 'grok-4': [3.0, 15.0],
  },
  anthropic: {
    'claude-fable-5-1': [15.0, 75.0],
    'claude-opus-5-5': [5.0, 25.0], 'claude-sonnet-5-5': [3.0, 15.0], 'claude-haiku-5-5': [1.0, 5.0],
    'claude-sonnet-4-6': [3.0, 15.0], 'claude-opus-4-6': [5.0, 25.0], 'claude-haiku-4-5': [1.0, 5.0],
  },
  openai: {
    'gpt-5.4': [1.25, 10.0], 'gpt-5.4-mini': [0.25, 2.0], 'gpt-5.4-nano': [0.05, 0.4],
    'gpt-5': [1.25, 10.0], 'gpt-5-mini': [0.25, 2.0], 'gpt-5-nano': [0.05, 0.4],
    'gpt-4.1': [2.0, 8.0], 'gpt-4.1-mini': [0.4, 1.6], 'gpt-4o': [2.5, 10.0], 'gpt-4o-mini': [0.15, 0.6],
  },
  gemini: {
    'gemini-3.1-pro': [2.0, 12.0], 'gemini-3-pro': [2.0, 12.0], 'gemini-3-flash': [0.5, 3.0],
    'gemini-2.5-pro': [1.25, 10.0], 'gemini-2.5-flash': [0.3, 2.5],
  },
  mistral: { 'mistral-large-latest': [2.0, 6.0], 'mistral-medium-latest': [0.4, 2.0], 'mistral-small-latest': [0.1, 0.3] },
  minimax: { 'MiniMax-M2.5': [0.3, 1.2], 'MiniMax-M2': [0.3, 1.2] },
};

function lookup(provider, model) {
  const table = PRICES[String(provider || '').toLowerCase()];
  if (!table || !model) return null;
  if (table[model]) return table[model];
  // tolerate dated suffixes such as claude-sonnet-4-6-20260301 or gpt-5.4-2026-05-01
  const hit = Object.keys(table).filter(k => model.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return hit ? table[hit] : null;
}

/**
 * @param {string} provider  provider name (grok, anthropic, openai, ...)
 * @param {string} model     model id actually used
 * @param {{inputTokens:number, outputTokens:number, costUsd?:number}} usage
 * @returns {{usd:number|null, exact:boolean, inputPerM:number|null, outputPerM:number|null}}
 */
export function estimateCost(provider, model, usage = {}) {
  if (typeof usage.costUsd === 'number' && usage.costUsd >= 0) {
    const p = lookup(provider, model);
    return { usd: usage.costUsd, exact: true, inputPerM: p?.[0] ?? null, outputPerM: p?.[1] ?? null };
  }
  const p = lookup(provider, model);
  if (!p) return { usd: null, exact: false, inputPerM: null, outputPerM: null };
  const usd = ((usage.inputTokens || 0) * p[0] + (usage.outputTokens || 0) * p[1]) / 1e6;
  return { usd, exact: false, inputPerM: p[0], outputPerM: p[1] };
}

/** "$0.0021" style, never "0" for a real charge: tiny amounts render as "<$0.0001". */
export function formatUsd(usd) {
  if (usd == null) return null;
  if (usd === 0) return '$0.0000';
  if (usd < 0.0001) return '<$0.0001';
  return '$' + usd.toFixed(usd < 0.01 ? 4 : usd < 1 ? 3 : 2);
}
