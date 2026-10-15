import type { CSSProperties, ReactNode } from 'react';
import { asArr, asText, num, type Rec } from '../../coerce';
import { DeltaRow } from '../DeltaRow';

const CRITICAL: CSSProperties = { color: 'var(--warn)', fontWeight: 600 };
const HIGH: CSSProperties = { color: '#f59a5e' };

function severityStyle(severity: unknown): CSSProperties | undefined {
  return severity === 'critical' ? CRITICAL : severity === 'high' ? HIGH : undefined;
}

function signedChange(s: Rec): string {
  return s.pctChange !== undefined
    ? `${num(s.pctChange) > 0 ? '+' : ''}${num(s.pctChange)}%`
    : `${num(s.change) > 0 ? '+' : ''}${num(s.change)}`;
}

function plainChange(s: Rec): string {
  return s.pctChange !== undefined ? `${num(s.pctChange)}%` : `${num(s.change)}`;
}

export function renderDeltaRows(signals: Rec): ReactNode[] {
  const newSigs = asArr(signals.new).slice(0, 4);
  const escalated = asArr(signals.escalated).slice(0, 6);
  const deescalated = asArr(signals.deescalated).slice(0, 4);
  return [
    ...newSigs.map((s, i) => (
      <DeltaRow key={`new-${i}`} dotColor="var(--accent)" label={asText(s.reason) || asText(s.label) || asText(s.key)} />
    )),
    ...escalated.map((s, i) => (
      <DeltaRow
        key={`esc-${i}`}
        dotColor="var(--mint)"
        label={asText(s.label)}
        labelStyle={severityStyle(s.severity)}
        value={`${asText(s.from)}→${asText(s.to)} (${signedChange(s)})`}
      />
    )),
    ...deescalated.map((s, i) => (
      <DeltaRow
        key={`deesc-${i}`}
        dotColor="var(--danger)"
        label={asText(s.label) || asText(s.key)}
        value={`${asText(s.from)}→${asText(s.to)} (${plainChange(s)})`}
      />
    )),
  ];
}
