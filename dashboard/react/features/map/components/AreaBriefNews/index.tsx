import Box from '@mui/material/Box';
import type { AreaBriefState } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { BriefArticle } from '../BriefArticle';

export interface AreaBriefNewsProps {
  state: AreaBriefState;
  hlIndex: number | null;
}

export function AreaBriefNews({ state, hlIndex }: AreaBriefNewsProps) {
  const { articles, total } = state;
  if (articles.length) {
    return (
      <>
        <Box className={CLASSES.briefNewsHead} sx={STYLES.briefNewsHead}>
          Recent coverage
          <Box component="span" className={CLASSES.briefNewsCount} sx={STYLES.briefNewsCount}>
            {total > articles.length ? `${articles.length} of ${total}` : articles.length}
          </Box>
        </Box>
        {articles.map((article, index) => (
          <BriefArticle key={index} article={article} index={index + 1} isHighlighted={hlIndex === index + 1} />
        ))}
      </>
    );
  }
  if (state.status === 'ready' && !state.isBriefLoading && !state.brief) {
    return <Box className={CLASSES.briefNone} sx={STYLES.panelSummary}>No recent headlines match this area.</Box>;
  }
  return null;
}
