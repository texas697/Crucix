import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { RATE_LABEL_ID } from '../../consts';
import { STYLES } from '../../styles';

export interface ReaderActionsProps {
  vote: number;
  originalHref?: string;
  onVote: (rating: number) => void;
  onClose: () => void;
}

export function ReaderActions({ vote, originalHref, onVote, onClose }: ReaderActionsProps) {
  const isUp = vote > 0;
  const isDown = vote < 0;
  return (
    <Box className={CLASSES.actions} sx={STYLES.actions}>
      <Box component="span" className={CLASSES.rateLabel} sx={STYLES.rateLabel} id={RATE_LABEL_ID}>Rate</Box>
      <Box className={CLASSES.thumbs} sx={STYLES.thumbs} role="group" aria-labelledby={RATE_LABEL_ID}>
        <Button
          className={clsx(CLASSES.thumb, CLASSES.thumbUp, isUp && `${CLASSES.thumb}--on`)}
          sx={[STYLES.thumb, isUp && STYLES.thumbUpOn]}
          aria-pressed={isUp}
          aria-label="More like this"
          onClick={() => onVote(1)}
        >
          👍
        </Button>
        <Button
          className={clsx(CLASSES.thumb, CLASSES.thumbDown, isDown && `${CLASSES.thumb}--on`)}
          sx={[STYLES.thumb, isDown && STYLES.thumbDownOn]}
          aria-pressed={isDown}
          aria-label="Less like this"
          onClick={() => onVote(-1)}
        >
          👎
        </Button>
      </Box>
      {originalHref && (
        <Button className={CLASSES.original} sx={STYLES.button} href={originalHref} target="_blank" rel="noopener noreferrer">
          Original ↗
        </Button>
      )}
      <Button className={CLASSES.close} sx={[STYLES.button, STYLES.close]} aria-label="Close" onClick={onClose} autoFocus>
        ×
      </Button>
    </Box>
  );
}
