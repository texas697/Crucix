import type { SxProps, Theme } from '@mui/material/styles';
import { SHELL_CLASSES } from '../../classesShell';
import { TABLET } from '../../styleConsts';
import type { RowName } from '../../types';

const ROW_HEIGHTS: Record<RowName, number> = { a: 520, b: 400, c: 480, d: 460, e: 420 };

function cardsOfHeight(height: number): SxProps<Theme> {
  return {
    [`& > .${SHELL_CLASSES.card}`]: {
      height,
      [TABLET]: { height: 'auto', maxHeight: '70vh', flex: '1 1 100% !important' },
    },
  };
}

export const ROW_CARD_STYLES: Record<RowName, SxProps<Theme>> = {
  a: cardsOfHeight(ROW_HEIGHTS.a),
  b: cardsOfHeight(ROW_HEIGHTS.b),
  c: cardsOfHeight(ROW_HEIGHTS.c),
  d: cardsOfHeight(ROW_HEIGHTS.d),
  e: cardsOfHeight(ROW_HEIGHTS.e),
};

export const STYLES = {
  row: { display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' },
} satisfies Record<string, SxProps<Theme>>;
