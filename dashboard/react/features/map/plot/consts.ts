export const COLORS = {
  air: 'rgba(127,224,192,0.85)',
  airStroke: 'rgba(127,224,192,0.35)',
  militaryAir: 'rgba(143,167,255,0.95)',
  militaryAirStroke: 'rgba(143,167,255,0.35)',
  thermal: 'rgba(255,107,116,0.75)',
  thermalStroke: 'rgba(255,107,116,0.25)',
  chokepointStroke: 'rgba(180,140,255,0.3)',
  nukeAnomaly: 'rgba(255,107,116,0.95)',
  nukeLive: 'rgba(242,200,121,0.9)',
  nukeIdle: 'rgba(242,200,121,0.45)',
  nukeStroke: 'rgba(242,200,121,0.3)',
  sensorHot: 'rgba(255,107,116,0.9)',
  sensorNormal: 'rgba(242,200,121,0.6)',
  sensorStroke: 'rgba(242,200,121,0.2)',
  shipStroke: 'rgba(127,200,255,0.2)',
  sdrOnline: 'rgba(106,168,255,0.85)',
  sdrPrivate: 'rgba(106,168,255,0.45)',
  sdrDown: 'rgba(150,150,160,0.5)',
  sdrListed: 'rgba(106,168,255,0.6)',
  sdrStroke: 'rgba(106,168,255,0.2)',
  sdrDirectory: 'rgba(106,168,255,0.35)',
  sdrDirectoryStroke: 'rgba(106,168,255,0.12)',
  disasterRed: 'rgba(255,107,116,0.85)',
  disasterOrange: 'rgba(255,138,92,0.8)',
  outageOn: 'rgba(192,132,252,0.9)',
  outageMinor: 'rgba(192,132,252,0.45)',
  outageEnded: 'rgba(192,132,252,0.5)',
  healthDefault: 'rgba(127,224,192,0.7)',
  cdcLevel4: 'rgba(255,107,116,0.75)',
  cdcLevel3: 'rgba(245,154,94,0.75)',
  cdcLevel2: 'rgba(127,224,192,0.55)',
  news: 'rgba(143,184,216,0.75)',
  newsStroke: 'rgba(143,184,216,0.25)',
  weather: 'rgba(245,154,94,0.8)',
  weatherStroke: 'rgba(245,154,94,0.3)',
  radnet: 'rgba(242,200,121,0.7)',
  radnetStroke: 'rgba(242,200,121,0.25)',
  spacePrimary: 'rgba(255,255,255,0.95)',
  spaceSecondary: 'rgba(255,255,255,0.7)',
  spaceStroke: 'rgba(255,255,255,0.4)',
  trackMissile: 'rgba(255,107,116,0.95)',
  trackFpv: 'rgba(242,200,121,0.95)',
  trackOther: 'rgba(245,154,94,0.95)',
  trackStroke: 'rgba(0,0,0,0.4)',
  trail: 'rgba(255,158,107,0.7)',
  quakeStroke: 'rgba(0,0,0,0.35)',
  quake6: '#ff5f63',
  quake5: '#ff8a5c',
  quake4: '#ffa94d',
  quakeMinor: '#f2c879',
  defaultPoint: '#dce2ec',
  defaultStroke: 'rgba(0,0,0,0.4)',
} as const;

export const CHOKEPOINT_COLOR: Record<string, string> = {
  disrupted: 'rgba(255,107,116,0.95)',
  reduced: 'rgba(245,154,94,0.9)',
  watch: 'rgba(233,201,160,0.9)',
  elevated: 'rgba(127,224,192,0.9)',
  major: 'rgba(180,140,255,0.85)',
  minor: 'rgba(180,140,255,0.5)',
};

export const CHOKEPOINT_STATUS_LABEL: Record<string, string> = {
  disrupted: 'DISRUPTED',
  reduced: 'Reduced traffic',
  watch: 'Event open · traffic normal',
  elevated: 'Elevated traffic',
  normal: 'Normal traffic',
};

export const GDELT_RGB = { severe: '255,107,116', moderate: '245,154,94', low: '106,168,255' } as const;

export const RADIUS = {
  air: 4,
  militaryAir: 3.4,
  chokepointMajor: 5,
  chokepointMinor: 3.2,
  nukeSite: 4.5,
  nukeSensor: 2.4,
  shipBig: 2.6,
  shipSmall: 2,
  sdrOnline: 3.2,
  sdrListed: 2.5,
  sdrDirectory: 1.8,
  disasterRed: 5.4,
  disasterOrange: 4.2,
  outageMajor: 5,
  outageMinor: 3,
  outageEnded: 3.2,
  news: 3,
  weather: 4,
  radnet: 3,
  spacePrimary: 5,
  spaceSecondary: 3,
  track: 5,
  minPoint: 2.5,
  maxPoint: 16,
} as const;

export const AIR_COORDS = [
  { lat: 30, lon: 44 },
  { lat: 24, lon: 120 },
  { lat: 49, lon: 32 },
  { lat: 57, lon: 24 },
  { lat: 14, lon: 114 },
  { lat: 37, lon: 127 },
  { lat: 25, lon: -80 },
  { lat: 4, lon: 2 },
  { lat: -34, lon: 18 },
  { lat: 10, lon: 51 },
];

export const NUKE_FALLBACK: Record<string, { lat: number; lon: number }> = {
  zaporizhzhia: { lat: 47.51, lon: 34.58 },
  chernobyl: { lat: 51.39, lon: 30.1 },
  bushehr: { lat: 28.83, lon: 50.89 },
  yongbyon: { lat: 39.8, lon: 125.75 },
  fukushima: { lat: 37.42, lon: 141.03 },
  dimona: { lat: 31.0, lon: 35.15 },
};

export const GDELT_SEVERITY: Record<string, number> = {
  'Mass violence': 6,
  'Armed clash': 5,
  Assault: 4,
  Coercion: 3,
  'Force posture': 2,
  Protest: 1,
};

export const DISASTER_ICON: Record<string, string> = {
  EQ: '▲',
  TC: '🌀',
  FL: '≈',
  VO: '△',
  DR: '☀',
  WF: '🔥',
};

export const HEALTH_RISK_COL: Record<string, string> = {
  'very high': 'rgba(255,107,116,0.85)',
  high: 'rgba(245,154,94,0.85)',
  moderate: 'rgba(242,200,121,0.85)',
  low: 'rgba(127,224,192,0.7)',
};

export const CDC_LEVEL_LABEL: Record<number, string> = {
  1: 'Usual precautions',
  2: 'Enhanced precautions',
  3: 'Reconsider travel',
  4: 'Avoid travel',
};
