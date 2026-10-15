import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { asArr, asText, num, type Rec } from '../../../coerce';
import { TONE_STYLES } from '../../../styles';
import { DeltaRow } from '../../DeltaRow';
import { STYLES } from '../styles';

function severitySx(severity: unknown): SxProps<Theme> | undefined {
  return severity === 'critical' ? STYLES.critical : severity === 'high' ? TONE_STYLES.high : undefined;
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
      <DeltaRow key={`new-${i}`} kind="new" label={asText(s.reason) || asText(s.label) || asText(s.key)} />
    )),
    ...escalated.map((s, i) => (
      <DeltaRow
        key={`esc-${i}`}
        kind="escalated"
        label={asText(s.label)}
        labelSx={severitySx(s.severity)}
        value={`${asText(s.from)}→${asText(s.to)} (${signedChange(s)})`}
      />
    )),
    ...deescalated.map((s, i) => (
      <DeltaRow
        key={`deesc-${i}`}
        kind="deescalated"
        label={asText(s.label) || asText(s.key)}
        value={`${asText(s.from)}→${asText(s.to)} (${plainChange(s)})`}
      />
    )),
  ];
}
