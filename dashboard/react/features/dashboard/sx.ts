import type { SxProps, Theme } from '@mui/material/styles';

type SxEntry = Exclude<SxProps<Theme>, ReadonlyArray<unknown>>;

export function withSx(base: SxProps<Theme>, extra?: SxProps<Theme>): SxProps<Theme> {
  const head = Array.isArray(base) ? base : [base as SxEntry];
  if (!extra) return head;
  return [...head, ...(Array.isArray(extra) ? extra : [extra as SxEntry])];
}
