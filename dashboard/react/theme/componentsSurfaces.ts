import type { Components, Theme } from '@mui/material/styles';
import type { CrucixTokens } from './tokens';

export function createSurfaceComponents(t: CrucixTokens): Components<Theme> {
  return {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: t.panel,
          backgroundImage: 'none',
          border: `1px solid ${t.border}`,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: t.panel, border: `1px solid ${t.border}`, borderRadius: 8 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent', position: 'static' },
      styleOverrides: {
        root: {
          backgroundColor: t.glass,
          backgroundImage: 'none',
          color: t.text,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
          transition: 'border-color .3s',
        },
      },
    },
    MuiToolbar: {
      defaultProps: { disableGutters: true },
      styleOverrides: {
        root: { minHeight: 0, padding: '10px 12px 10px 14px', gap: 20, flexWrap: 'wrap' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: t.raised2,
          color: t.text,
          border: `1px solid ${t.borderBright}`,
          fontSize: 12,
          borderRadius: 6,
        },
        arrow: { color: t.raised2 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: t.panel, border: `1px solid ${t.borderBright}`, borderRadius: 12 },
      },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(2,6,10,0.72)', backdropFilter: 'blur(4px)' } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: t.border } },
    },
  };
}
