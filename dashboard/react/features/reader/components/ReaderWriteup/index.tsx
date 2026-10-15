import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { renderMarkdown } from '../../../../shared/markdown';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { Article, ReaderAccess } from '../../types';
import { ReaderKeyCta } from '../ReaderKeyCta';

export interface ReaderWriteupProps {
  article: Article;
  access: ReaderAccess;
  onTopic?: (topic: string) => void;
  onSummarize: () => void;
  onOpenSettings: () => void;
}

export function ReaderWriteup({ article, access, onTopic, onSummarize, onOpenSettings }: ReaderWriteupProps) {
  const { isAuthed, hasKey } = access;
  return (
    <>
      <Box className={CLASSES.topics} sx={STYLES.topics}>
        {(article.topics ?? []).map((topic) => (
          <Button key={topic} className={CLASSES.topic} sx={STYLES.topic} onClick={() => onTopic?.(topic)}>{topic}</Button>
        ))}
      </Box>
      <Box className={CLASSES.writeup}>
        {article.summarizedBy
          ? (
            <>
              {renderMarkdown(article.summaryMd)}
              <Box className={CLASSES.note} sx={STYLES.note}>
                Write-up by {article.summaryModel || 'AI'} · {article.summarizedBy === 'operator' ? 'site model' : 'your key'}
              </Box>
            </>
          )
          : (
            <>
              {renderMarkdown(article.summaryMd || article.description || '')}
              {!article.extracted && (
                <Box className={CLASSES.note} sx={STYLES.note}>
                  Only a short excerpt could be read from this publisher (paywall or bot wall). Use <Box component="b" className={CLASSES.noteStrong}>Original</Box> for the full piece.
                </Box>
              )}
              {isAuthed && hasKey && (
                <Button className={CLASSES.summarize} sx={[STYLES.button, STYLES.buttonPrimary]} onClick={onSummarize}>
                  ⚡ Write this up with my AI
                </Button>
              )}
              {isAuthed && !hasKey && <ReaderKeyCta what="The AI write-up" onOpenSettings={onOpenSettings} />}
            </>
          )}
      </Box>
    </>
  );
}
