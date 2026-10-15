import type { Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';

const NARROW = '@media (max-width:900px)';
const HERO_GLOW = 'radial-gradient(1200px 600px at 50% -200px,rgba(220,226,236,0.06),transparent 70%)';

function isLight(theme: Theme): boolean {
  return theme.palette.mode === 'light';
}

export const STYLES = {
  root: (theme: Theme) => ({ p: '20px 24px 40px', backgroundImage: isLight(theme) ? 'none' : HERO_GLOW }),
  hero: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', m: '22px 0 16px' },
  heroLead: { fontSize: 14.5, color: 'text.secondary', maxWidth: 680, lineHeight: 1.55, mt: '8px' },
  statusNotice: (theme: Theme) => ({
    mb: '20px', p: '14px 18px', borderRadius: '8px', border: '1px solid',
    borderColor: isLight(theme) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    bgcolor: (t: Theme) => t.palette.crucix.raised,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
  }),
  statusNoticeText: { fontSize: 13.5, color: 'text.secondary' },
  statusNoticeCode: { fontFamily: FONT_MONO, bgcolor: 'background.default', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 },
  layout: {
    display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: '16px', alignItems: 'start',
    [NARROW]: { gridTemplateColumns: '1fr' },
  },
  sidebar: {
    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: '10px',
    display: 'flex', flexDirection: 'column', gap: '8px', height: 'calc(100vh - 220px)', minHeight: 480,
    [NARROW]: { height: 'auto', minHeight: 'none' },
  },
  searchField: { width: '100%' },
  dialogList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
  dialogItem: (theme: Theme) => ({
    display: 'flex', alignItems: 'flex-start', gap: '10px', p: '10px', borderRadius: '6px',
    border: '1px solid transparent', textAlign: 'left', width: '100%', color: 'text.primary',
    fontFamily: FONT_SANS, cursor: 'pointer', transition: 'background-color 0.15s ease',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: theme.palette.crucix.raised2, borderColor: theme.palette.crucix.borderBright },
  }),
  dialogAvatar: { width: 36, height: 36, fontSize: 14, fontWeight: 600, flex: 'none', bgcolor: (theme: Theme) => theme.palette.crucix.raised },
  dialogInfo: { flex: 1, minWidth: 0 },
  dialogTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  dialogTitle: { fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dialogMeta: { fontSize: 11, color: 'text.secondary', flex: 'none', fontFamily: FONT_MONO },
  dialogSnippet: { fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: '2px' },
  stream: {
    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '8px',
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 480, overflow: 'hidden',
    [NARROW]: { height: 'auto', minHeight: 400 },
  },
  streamHeader: {
    p: '14px 18px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
  },
  streamHeaderTitle: { fontSize: 16, fontWeight: 600 },
  streamMessages: { flex: 1, overflowY: 'auto', p: '18px', display: 'flex', flexDirection: 'column', gap: '12px' },
  messageBubble: (theme: Theme) => ({
    maxWidth: '75%', p: '10px 14px', borderRadius: '12px', position: 'relative', wordBreak: 'break-word',
    fontSize: 13.5, lineHeight: 1.5,
    '&.in': { bgcolor: theme.palette.crucix.raised, alignSelf: 'flex-start', borderBottomLeftRadius: '2px' },
    '&.out': { bgcolor: isLight(theme) ? 'primary.light' : 'primary.dark', alignSelf: 'flex-end', borderBottomRightRadius: '2px' },
  }),
  messageTime: { fontSize: 10.5, color: 'text.secondary', textAlign: 'right', mt: '4px', fontFamily: FONT_MONO },
  messageMedia: { fontSize: 11, fontWeight: 600, color: 'primary.main', mb: '4px', textTransform: 'uppercase' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, color: 'text.secondary' },
} as const;
