import type { Components, Theme } from '@mui/material/styles';
import { FONT_SANS, type CrucixTokens } from './tokens';

export function createControlComponents(t: CrucixTokens): Components<Theme> {
  return {
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 0,
          padding: 3,
          gap: 2,
          backgroundColor: t.segBg,
          border: `1px solid ${t.border}`,
          borderRadius: 6,
        },
        flexContainer: { gap: 2 },
        indicator: { display: 'none' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 0,
          minWidth: 0,
          padding: '7px 14px',
          borderRadius: 5,
          font: `500 13px ${FONT_SANS}`,
          color: t.dim,
          textTransform: 'none',
          transition: 'all .15s',
          '&:hover': { color: t.text },
          '&.Mui-selected': { backgroundColor: t.tabSelectedBg, color: t.text, boxShadow: t.tabSelectedShadow },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          font: `500 12.5px ${FONT_SANS}`,
          textTransform: 'none',
          letterSpacing: 0,
          padding: '6px 12px',
          borderRadius: 5,
          minWidth: 0,
        },
        contained: {
          backgroundColor: t.accent,
          color: t.onAccent,
          border: `1px solid ${t.accent}`,
          '&:hover': { backgroundColor: '#eef1f6', color: '#0a0f1f' },
        },
        outlined: {
          color: t.dim,
          borderColor: t.border,
          backgroundColor: t.panel,
          '&:hover': { borderColor: t.borderBright, color: t.text, backgroundColor: t.panel },
        },
        text: {
          color: t.text2,
          '&:hover': { backgroundColor: t.raised },
        },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          width: 36,
          height: 36,
          padding: 0,
          color: t.text2,
          border: `1px solid ${t.border}`,
          borderRadius: 9,
          backgroundColor: t.panel,
          boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          transition: 'all .15s',
          '&:hover': { borderColor: t.borderBright, color: t.text, backgroundColor: t.raised },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 'auto',
          font: `400 12.5px ${FONT_SANS}`,
          color: t.dim,
          padding: '6px 12px',
          border: `1px solid ${t.border}`,
          borderRadius: 9,
          backgroundColor: t.panel,
          '&:hover': { borderColor: t.borderBright, color: t.text },
        },
        label: { padding: 0 },
        clickable: { '&:hover': { backgroundColor: t.panel } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: t.panel,
          borderRadius: 6,
          font: `400 13.5px ${FONT_SANS}`,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.borderBright },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(220,226,236,0.4)', borderWidth: 1 },
        },
        input: { padding: '10px 14px' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: t.dim, fontSize: 12.5 } },
    },
  };
}
