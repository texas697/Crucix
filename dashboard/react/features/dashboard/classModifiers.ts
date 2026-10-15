export const ROW_CLASSES = {
  a: 'crucix-dashboard-row--a',
  b: 'crucix-dashboard-row--b',
  c: 'crucix-dashboard-row--c',
  d: 'crucix-dashboard-row--d',
  e: 'crucix-dashboard-row--e',
} as const;

export const LAYER_DOT_CLASSES: Record<string, string> = {
  air: 'crucix-dashboard-layer-dot--air',
  thermal: 'crucix-dashboard-layer-dot--thermal',
  sdr: 'crucix-dashboard-layer-dot--sdr',
  maritime: 'crucix-dashboard-layer-dot--maritime',
  nuke: 'crucix-dashboard-layer-dot--nuke',
  disaster: 'crucix-dashboard-layer-dot--disaster',
  outage: 'crucix-dashboard-layer-dot--outage',
  health: 'crucix-dashboard-layer-dot--health',
  news: 'crucix-dashboard-layer-dot--news',
  space: 'crucix-dashboard-layer-dot--space',
};

export const IDEA_TYPE_CLASSES: Record<string, string> = {
  long: 'crucix-dashboard-idea-type--long',
  short: 'crucix-dashboard-idea-type--short',
  hedge: 'crucix-dashboard-idea-type--hedge',
  watch: 'crucix-dashboard-idea-type--watch',
  avoid: 'crucix-dashboard-idea-type--avoid',
};

export const HW_LEVEL_CLASSES: Record<string, string> = {
  1: 'crucix-dashboard-hw-level--1',
  2: 'crucix-dashboard-hw-level--2',
  3: 'crucix-dashboard-hw-level--3',
  4: 'crucix-dashboard-hw-level--4',
};
