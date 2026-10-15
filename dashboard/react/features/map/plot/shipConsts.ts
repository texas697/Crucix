export const SHIP_COL: Record<string, string> = {
  tanker: 'rgba(245,190,90,0.9)',
  cargo: 'rgba(127,200,255,0.85)',
  passenger: 'rgba(200,160,255,0.9)',
  military: 'rgba(255,107,116,0.95)',
  law: 'rgba(255,107,116,0.95)',
  fishing: 'rgba(127,224,192,0.75)',
  tug: 'rgba(180,180,190,0.7)',
  service: 'rgba(180,180,190,0.7)',
  pleasure: 'rgba(180,180,190,0.55)',
  highspeed: 'rgba(200,160,255,0.7)',
  other: 'rgba(160,170,190,0.6)',
  unknown: 'rgba(140,150,170,0.5)',
};

export const SHIP_LABEL: Record<string, string> = {
  tanker: 'Tanker',
  cargo: 'Cargo ship',
  passenger: 'Passenger ship',
  military: 'Military vessel',
  law: 'Law enforcement',
  fishing: 'Fishing vessel',
  tug: 'Tug / towing',
  service: 'Service vessel',
  pleasure: 'Pleasure craft',
  highspeed: 'High-speed craft',
  other: 'Vessel',
  unknown: 'Vessel (type unknown)',
};

export const NAV_LABEL: Record<number, string> = {
  0: 'under way',
  1: 'at anchor',
  2: 'not under command',
  3: 'restricted manoeuvrability',
  4: 'constrained by draught',
  5: 'moored',
  6: 'aground',
  7: 'fishing',
  8: 'sailing',
};

export const BIG_SHIP_CLASSES = new Set(['tanker', 'military', 'law', 'passenger']);
