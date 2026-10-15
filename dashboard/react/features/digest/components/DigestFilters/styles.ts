import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';

const GROUPED = '&.MuiToggleButtonGroup-grouped.MuiToggleButton-root';

export const STYLES = {
  filters: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', m: '10px 0' },
  filterGroup: {
    display: 'flex',
    gap: '2px',
    p: '3px',
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '6px',
  },
  pill: (theme) => ({
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 'normal',
    textTransform: 'none',
    color: theme.palette.crucix.dim,
    cursor: 'pointer',
    transition: 'none',
    [GROUPED]: { m: 0, p: '7px 14px', border: 0, borderRadius: '5px', bgcolor: 'transparent' },
    '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
    '&.Mui-selected, &.Mui-selected:hover': { color: 'text.primary', bgcolor: theme.palette.crucix.raised2 },
  }),
  search: {
    flex: 1,
    minWidth: 260,
    '& .MuiOutlinedInput-root': { height: 40, fontSize: 13.5 },
    '& .MuiOutlinedInput-input': { height: 40, p: '0 14px', boxSizing: 'border-box' },
  },
} satisfies Record<string, SxProps<Theme>>;
