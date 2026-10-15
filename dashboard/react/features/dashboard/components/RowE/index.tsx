import type { PanelDataProps } from '../../types';
import { MarketsPanel } from '../MarketsPanel';

export function RowE({ data, t }: PanelDataProps) {
  return <MarketsPanel data={data} t={t} />;
}
