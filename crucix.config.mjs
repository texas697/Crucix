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

  // Public pages for the MFB Think Tank mobile app, linked from its App Store / Google Play listings:
  // /mfb-think-tank (marketing), /support, /privacy, /terms. Templates live in dashboard/site/.
  site: {
    appName: process.env.SITE_APP_NAME || 'MFB Think Tank',
    operator: process.env.SITE_OPERATOR || 'MFB Services, Inc.',
    contactEmail: process.env.SITE_CONTACT_EMAIL || 'rsanchezdev697@gmail.com',
    postalAddress: process.env.SITE_POSTAL_ADDRESS || null,
    jurisdiction: process.env.SITE_JURISDICTION || 'the State of Texas',
    legalEffectiveDate: 'October 13, 2026', // bump when privacy.html or terms.html changes
    appStoreUrl: process.env.SITE_APP_STORE_URL || null, // download buttons on /mfb-think-tank appear once these are set
    playStoreUrl: process.env.SITE_PLAY_STORE_URL || null,
  },

  llm: {
    provider: process.env.LLM_PROVIDER || null, // anthropic | openai | openai-compatible | gemini | codex | openrouter | minimax | mistral | ollama | grok
    apiKey: process.env.LLM_API_KEY || null,
    model: process.env.LLM_MODEL || null,
    baseUrl: process.env.LLM_BASE_URL || process.env.OLLAMA_BASE_URL || null, // openai-compatible / ollama endpoint
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
