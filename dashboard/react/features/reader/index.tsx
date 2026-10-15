import { useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import { safeExternalUrl } from '../../shared/safeUrl';
import { CLASSES } from './classes';
import { ReaderBody } from './components/ReaderBody';
import { ReaderHeader } from './components/ReaderHeader';
import { useReaderActions } from './hooks/useReaderActions';
import { useReaderDialog } from './hooks/useReaderDialog';
import { useReaderLoad } from './hooks/useReaderLoad';
import { useResearchPoll } from './hooks/useResearchPoll';
import { STYLES } from './styles';
import type { ReaderAccess, ReaderProps } from './types';

export function Reader({
  target, api, me, hasTavily, onClose, onResolved, onVote, onTopic, onOpenSettings,
  pollMs = 2500, now = Date.now,
}: ReaderProps) {
  const id = target?.id ?? null;
  const url = target?.url ?? null;
  const isOpen = target !== null;

  const load = useReaderLoad({ api, id, url, isOpen, onResolved });
  useResearchPoll({ api, article: load.article, isOpen, pollMs, setArticle: load.setArticle });
  const actions = useReaderActions({ api, load, onVote });
  const dialog = useReaderDialog({ onClose });
  const access = useMemo<ReaderAccess>(() => ({ isAuthed: !!me, hasKey: !!me?.llm, hasTavily }), [me, hasTavily]);

  const nowMs = now();
  const originalHref = safeExternalUrl(load.article?.url) ?? undefined;

  return (
    <Dialog
      open={isOpen}
      onClose={dialog.onDialogClose}
      fullScreen={dialog.isFullScreen}
      maxWidth={false}
      className={CLASSES.dialog}
      slotProps={{ backdrop: { className: CLASSES.backdrop, sx: STYLES.backdrop } }}
      PaperProps={{ className: CLASSES.modal, sx: STYLES.modal, 'aria-label': load.article?.title || 'Article' }}
    >
      <ReaderHeader article={load.article} nowMs={nowMs} originalHref={originalHref} onVote={actions.onVote} onClose={onClose} />
      <ReaderBody
        article={load.article}
        status={load.status}
        error={load.error}
        isById={id !== null}
        originalHref={originalHref}
        access={access}
        nowMs={nowMs}
        actions={actions}
        onTopic={onTopic}
        onOpenSettings={onOpenSettings}
      />
    </Dialog>
  );
}

export type { Article, ReaderProps, ReaderTarget, ResearchState } from './types';
