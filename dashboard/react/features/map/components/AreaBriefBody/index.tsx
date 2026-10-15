import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { AreaBriefState } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { renderCite } from '../../renders/renderCite';
import { STYLES } from '../../styles';
import { BriefStatus, WRITING_WIDTHS } from '../BriefStatus';

export interface AreaBriefBodyProps {
  state: AreaBriefState;
  onRetry?: () => void;
  onHoverCite: (index: number | null) => void;
}

export function AreaBriefBody({ state, onRetry, onHoverCite }: AreaBriefBodyProps) {
  const { brief, articles } = state;
  if (brief) {
    return (
      <>
        <Box className={CLASSES.briefHead} sx={STYLES.briefHead}>{brief.headline}</Box>
        {brief.summary && (
          <Box component="p" className={CLASSES.briefSummary} sx={STYLES.briefSummary}>{renderCite(brief.summary, articles, onHoverCite)}</Box>
        )}
        {!!brief.developments?.length && (
          <Box component="ul" className={CLASSES.briefDevelopments} sx={STYLES.briefDevelopments}>
            {brief.developments.map((development, index) => (
              <Box component="li" key={index} className={CLASSES.briefDevelopment}>{renderCite(development, articles, onHoverCite)}</Box>
            ))}
          </Box>
        )}
        {brief.watch && (
          <Box className={CLASSES.briefWatch} sx={STYLES.briefWatch}>
            <Box component="b" className={CLASSES.briefWatchLabel} sx={STYLES.briefWatchLabel}>Watch</Box>
            {renderCite(brief.watch, articles, onHoverCite)}
          </Box>
        )}
      </>
    );
  }
  if (state.isBriefLoading) return <BriefStatus text="Writing the brief…" widths={WRITING_WIDTHS} />;
  if (state.error) {
    return (
      <Box className={CLASSES.briefError} sx={STYLES.briefError}>
        {state.error}
        {onRetry && <Button className={CLASSES.briefRetry} sx={STYLES.briefRetry} onClick={onRetry}>Retry</Button>}
      </Box>
    );
  }
  return null;
}
