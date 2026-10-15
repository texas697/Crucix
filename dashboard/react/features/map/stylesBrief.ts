import { FONT_MONO, FONT_SANS } from '../../theme';
import { CLASSES } from './classes';
import { LOW_PERF, briefPulse, briefShimmer, isLight, type SxMap } from './stylesShared';

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export const BRIEF_STYLES = {
  brief: (theme) => ({
    m: '-2px -4px 12px',
    p: '10px 10px 8px',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '7px',
    background: isLight(theme)
      ? 'linear-gradient(180deg,rgba(30,41,59,0.07),rgba(30,41,59,0.015))'
      : 'linear-gradient(180deg,rgba(220,226,236,0.07),rgba(220,226,236,0.015))',
    [`&.${CLASSES.briefToneElevated}`]: {
      borderColor: 'rgba(233,170,90,0.35)',
      background: 'linear-gradient(180deg,rgba(233,170,90,0.09),rgba(233,170,90,0.015))',
      [`& .${CLASSES.briefKicker}`]: { color: theme.palette.crucix.warn },
    },
    [`&.${CLASSES.briefToneCritical}`]: {
      borderColor: 'rgba(255,120,120,0.4)',
      background: 'linear-gradient(180deg,rgba(255,110,110,0.10),rgba(255,110,110,0.015))',
      [`& .${CLASSES.briefKicker}`]: { color: theme.palette.crucix.danger },
    },
  }),
  briefTop: { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', mb: '7px' },
  briefKicker: { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main' },
  briefPlaces: (theme) => ({
    fontFamily: FONT_SANS, fontSize: 11.5, color: theme.palette.crucix.text2, maxWidth: '100%', ...ELLIPSIS,
    [`&.${CLASSES.briefPlacesFallback}`]: { color: theme.palette.crucix.dim, fontStyle: 'italic' },
  }),
  briefHead: { fontFamily: FONT_SANS, fontSize: 14, fontWeight: 650, lineHeight: 1.3, color: 'text.primary', m: '2px 0 6px', letterSpacing: '-0.01em' },
  briefSummary: (theme) => ({ fontFamily: FONT_SANS, fontSize: 12, lineHeight: 1.5, color: theme.palette.crucix.text2, m: '0 0 7px' }),
  briefDevelopments: (theme) => ({
    m: '0 0 7px', p: '0 0 0 14px', fontFamily: FONT_SANS, fontSize: 11.8, lineHeight: 1.45, color: theme.palette.crucix.text2,
    '& li': { mb: '3px' }, '& li::marker': { color: 'primary.main' },
  }),
  briefCite: (theme) => ({
    display: 'inline-block', fontFamily: FONT_MONO, fontSize: 9.5, color: 'primary.main', bgcolor: theme.palette.crucix.accentSoft,
    borderRadius: '3px', p: '0 4px', ml: '2px', cursor: 'pointer', textDecoration: 'none', verticalAlign: '1px',
    '&:hover': { filter: 'brightness(1.2)' },
  }),
  briefWatch: (theme) => ({
    fontFamily: FONT_SANS, fontSize: 11.5, lineHeight: 1.45, color: theme.palette.crucix.text2, p: '6px 8px',
    borderLeft: '2px solid', borderLeftColor: 'primary.main',
    bgcolor: isLight(theme) ? 'rgba(30,41,59,0.06)' : 'rgba(220,226,236,0.06)', borderRadius: '0 4px 4px 0', mb: '8px',
  }),
  briefWatchLabel: { fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'primary.main', mr: '6px', fontWeight: 600 },
  briefNewsHead: (theme) => ({ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.palette.crucix.dim, m: '6px 0 4px' }),
  briefNewsCount: (theme) => ({ ml: 'auto', color: theme.palette.crucix.dim2 }),
  briefItem: (theme) => ({
    display: 'flex', flexDirection: 'column', gap: '1px', p: '5px 7px', borderRadius: '5px', textDecoration: 'none', color: 'inherit',
    cursor: 'pointer', border: '1px solid transparent',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
    [`&.${CLASSES.briefItemHl}`]: { borderColor: 'primary.main', bgcolor: theme.palette.crucix.accentSoft },
  }),
  briefItemTitle: { fontFamily: FONT_SANS, fontSize: 11.8, lineHeight: 1.35, color: 'text.primary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  briefItemIndex: { fontFamily: FONT_MONO, fontSize: 10, color: 'primary.main', mr: '6px', verticalAlign: '1px' },
  briefItemMeta: (theme) => ({ fontFamily: FONT_MONO, fontSize: 10, color: theme.palette.crucix.dim, ...ELLIPSIS }),
  briefItemLive: (theme) => ({ color: theme.palette.crucix.mint }),
  briefFoot: (theme) => ({
    display: 'flex', alignItems: 'flex-start', gap: '7px', mt: '8px', pt: '7px', borderTop: '1px dashed', borderTopColor: theme.palette.crucix.borderBright,
    fontFamily: FONT_SANS, fontSize: 10.8, lineHeight: 1.4, color: theme.palette.crucix.dim,
  }),
  briefFootIcon: { flex: 'none', fontSize: 11, lineHeight: 1.3 },
  briefFootWho: (theme) => ({ color: theme.palette.crucix.text2, fontWeight: 600 }),
  briefFootCost: (theme) => ({ fontFamily: FONT_MONO, color: theme.palette.crucix.text2 }),
  briefError: (theme) => ({
    fontFamily: FONT_SANS, fontSize: 11.8, lineHeight: 1.45, color: theme.palette.crucix.warn, p: '7px 9px',
    border: '1px solid rgba(233,170,90,0.3)', borderRadius: '5px', bgcolor: 'rgba(233,170,90,0.07)', mb: '8px',
  }),
  briefRetry: { ml: '6px', p: '0 4px', minWidth: 0, fontSize: 11, lineHeight: 'normal', color: 'primary.main', textDecoration: 'underline', bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } },
  briefStatus: (theme) => ({ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.06em', color: theme.palette.crucix.dim, mb: '6px' }),
  briefPulse: { width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: `${briefPulse} 1.1s ease-in-out infinite`, [LOW_PERF]: { animation: 'none' } },
  briefSkeleton: (theme) => ({
    height: 9,
    borderRadius: '4px',
    background: `linear-gradient(90deg,${theme.palette.crucix.raised} 20%,${theme.palette.crucix.raised2} 50%,${theme.palette.crucix.raised} 80%)`,
    backgroundSize: '200% 100%',
    animation: `${briefShimmer} 1.3s linear infinite`,
    m: '0 0 7px',
    [LOW_PERF]: { animation: 'none' },
    [`&.${CLASSES.briefSkeletonW1}`]: { width: '72%', height: 13 },
    [`&.${CLASSES.briefSkeletonW2}`]: { width: '100%' },
    [`&.${CLASSES.briefSkeletonW3}`]: { width: '94%' },
    [`&.${CLASSES.briefSkeletonW4}`]: { width: '60%' },
  }),
} satisfies SxMap;
