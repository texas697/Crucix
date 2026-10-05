// Crucix Configuration — all settings with env var overrides

import "./apis/utils/env.mjs"; // Load .env first

export default {
  port: parseInt(process.env.PORT) || 3117,
  publicUrl: process.env.PUBLIC_URL || null,
  refreshIntervalMinutes: parseInt(process.env.REFRESH_INTERVAL_MINUTES) || 15,
  runsDir: process.env.RUNS_DIR || null, // persistent state dir (e.g. a mounted volume in the cloud)

  // Login gate. 'firebase' (default) requires FIREBASE_WEB_CONFIG; 'off' makes the dashboard public (local use only).
  auth: {
    mode: (process.env.AUTH_MODE || 'firebase').toLowerCase(),
  },

  // 'internal' = in-process timer; 'external' = a scheduler POSTs /api/internal/sweep with SWEEP_TRIGGER_TOKEN
  sweep: {
    mode: (process.env.SWEEP_MODE || 'internal').toLowerCase(),
    triggerToken: (process.env.SWEEP_TRIGGER_TOKEN || '').trim() || null, // trimmed: secret managers often append a newline
  },

  llm: {
    provider: process.env.LLM_PROVIDER || null, // anthropic | openai | openai-compatible | gemini | codex | openrouter | minimax | mistral | ollama | grok
    apiKey: process.env.LLM_API_KEY || null,
    model: process.env.LLM_MODEL || null,
    baseUrl: process.env.LLM_BASE_URL || process.env.OLLAMA_BASE_URL || null, // openai-compatible / ollama endpoint
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || null,
    chatId: process.env.TELEGRAM_CHAT_ID || null,
    botPollingInterval: parseInt(process.env.TELEGRAM_POLL_INTERVAL) || 5000,
    channels: process.env.TELEGRAM_CHANNELS || null, // Comma-separated extra channel IDs
  },

  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || null,
    channelId: process.env.DISCORD_CHANNEL_ID || null,
    guildId: process.env.DISCORD_GUILD_ID || null, // Server ID (for instant slash command registration)
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || null, // Fallback: webhook-only alerts (no bot needed)
  },

  // Delta engine thresholds — override defaults from lib/delta/engine.mjs
  // Set to null to use built-in defaults
  delta: {
    thresholds: {
      numeric: {
        // Example overrides (uncomment to customize):
        // vix: 3,       // more sensitive to VIX moves
        // wti: 5,       // less sensitive to oil moves
      },
      count: {
        // urgent_posts: 3,     // need ±3 urgent posts to flag
        // thermal_total: 1000, // need ±1000 thermal detections
      },
    },
  },
};
