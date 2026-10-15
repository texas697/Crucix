export const ROW_CLASSES = {
  a: 'crucix-dashboard-row--a row-a',
  b: 'crucix-dashboard-row--b row-b',
  c: 'crucix-dashboard-row--c row-c',
  d: 'crucix-dashboard-row--d row-d',
  e: 'crucix-dashboard-row--e row-e',
} as const;

export const LAYER_DOT_CLASSES: Record<string, string> = {
  air: 'crucix-dashboard-layer-dot--air air',
  thermal: 'crucix-dashboard-layer-dot--thermal thermal',
  sdr: 'crucix-dashboard-layer-dot--sdr sdr',
  maritime: 'crucix-dashboard-layer-dot--maritime maritime',
  nuke: 'crucix-dashboard-layer-dot--nuke nuke',
  disaster: 'crucix-dashboard-layer-dot--disaster disaster',
  outage: 'crucix-dashboard-layer-dot--outage outage',
  health: 'crucix-dashboard-layer-dot--health health',
  news: 'crucix-dashboard-layer-dot--news news',
  space: 'crucix-dashboard-layer-dot--space space',
};

export const IDEA_TYPE_CLASSES: Record<string, string> = {
  long: 'crucix-dashboard-idea-type--long long',
  short: 'crucix-dashboard-idea-type--short short',
  hedge: 'crucix-dashboard-idea-type--hedge hedge',
  watch: 'crucix-dashboard-idea-type--watch watch',
  avoid: 'crucix-dashboard-idea-type--avoid avoid',
};

export const HW_LEVEL_CLASSES: Record<string, string> = {
  1: 'crucix-dashboard-hw-level--1 l1',
  2: 'crucix-dashboard-hw-level--2 l2',
  3: 'crucix-dashboard-hw-level--3 l3',
  4: 'crucix-dashboard-hw-level--4 l4',
};
