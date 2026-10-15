import { asRec, asText } from '../../coerce';

export const HEALTH_RISK_COL: Record<string, string> = {
  'very high': 'rgba(255,107,116,0.85)',
  high: 'rgba(245,154,94,0.85)',
  moderate: 'rgba(242,200,121,0.85)',
  low: 'rgba(127,224,192,0.7)',
};

export const CDC_LEVEL_LABEL: Record<string, string> = {
  1: 'Usual precautions',
  2: 'Enhanced precautions',
  3: 'Reconsider travel',
  4: 'Avoid travel',
};

export function riskMax(risk: unknown): string {
  if (typeof risk === 'string') return risk;
  return asText(asRec(risk).max);
}

export function riskTitle(risk: unknown): string {
  const r = asRec(risk);
  const parts = ['national', 'regional', 'global'].filter((k) => r[k]).map((k) => `${k} ${asText(r[k])}`);
  return parts.join(' · ') || 'WHO assessment';
}
