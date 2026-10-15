import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { Article, ReaderAccess, ReaderActions, ReaderStatus } from '../../types';
import { ReaderResearch } from '../ReaderResearch';
import { ReaderWriteup } from '../ReaderWriteup';

export interface ReaderBodyProps {
  article: Article | null;
  status: ReaderStatus;
  error: string;
  isById: boolean;
  originalHref?: string;
  access: ReaderAccess;
  nowMs: number;
  actions: ReaderActions;
  onTopic?: (topic: string) => void;
  onOpenSettings: () => void;
}

export function ReaderBody({
  article, status, error, isById, originalHref, access, nowMs, actions, onTopic, onOpenSettings,
}: ReaderBodyProps) {
  return (
    <Box className={CLASSES.body} sx={STYLES.body}>
      {status === 'loading' && (
        <Box className={CLASSES.loading} sx={STYLES.loading}>{isById ? 'LOADING…' : 'FETCHING ARTICLE…'}</Box>
      )}
      {status === 'error' && (
        <Box className={clsx(CLASSES.note, CLASSES.noteError)} sx={[STYLES.note, STYLES.noteError]}>
          {error}
          {originalHref && (
            <Box className={CLASSES.errorLink}>
              <Button className={CLASSES.errorOriginal} sx={STYLES.button} href={originalHref} target="_blank" rel="noopener noreferrer">
                Open original ↗
              </Button>
            </Box>
          )}
        </Box>
      )}
      {status === 'idle' && article && (
        <>
          <ReaderWriteup
            article={article}
            access={access}
            onTopic={onTopic}
            onSummarize={actions.onSummarize}
            onOpenSettings={onOpenSettings}
          />
          <ReaderResearch
            research={article.research}
            access={access}
            nowMs={nowMs}
            onResearch={actions.onResearch}
            onOpenSettings={onOpenSettings}
          />
        </>
      )}
    </Box>
  );
}
