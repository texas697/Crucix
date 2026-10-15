import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { CLASSES } from '../../classes';
import { useGuideDialog } from '../../hooks/useGuideDialog';
import { SignalGuideCard } from '../SignalGuideCard';
import { SIGNAL_GUIDE_ITEMS } from './items';
import { STYLES } from './styles';

export interface SignalGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITLE_ID = 'glossaryTitle';

export function SignalGuide({ isOpen, onClose }: SignalGuideProps) {
  const { panelRef } = useGuideDialog({ isOpen, onClose });
  if (!isOpen) return null;
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className={CLASSES.guideOverlay}
      id="glossaryOverlay"
      data-surface="signal-guide"
      aria-labelledby={TITLE_ID}
      disableEscapeKeyDown
      disableAutoFocus
      disableRestoreFocus
      BackdropProps={{ className: CLASSES.guideBackdrop, sx: STYLES.backdrop }}
      PaperProps={{ className: CLASSES.guidePanel, sx: STYLES.panel, ref: panelRef, tabIndex: -1 }}
    >
      <Box className={CLASSES.guideHead} sx={STYLES.head}>
        <Box className={CLASSES.guideHeadText}>
          <Box className={CLASSES.guideKicker} sx={STYLES.kicker}>Signal Guide</Box>
          <Typography component="h2" className={CLASSES.guideTitle} sx={STYLES.title} id={TITLE_ID}>What the signals actually mean</Typography>
          <Typography className={CLASSES.guideSub} sx={STYLES.sub}>Plain-English interpretation, why it matters, and what you should not infer from it.</Typography>
        </Box>
        <IconButton className={CLASSES.guideClose} sx={STYLES.close} onClick={onClose} aria-label="Close signal guide">
          <CloseIcon className={CLASSES.guideCloseIcon} fontSize="inherit" />
        </IconButton>
      </Box>
      <Box className={CLASSES.guideBody} sx={STYLES.body} id="glossaryBody">
        {SIGNAL_GUIDE_ITEMS.map((item) => <SignalGuideCard key={item.term} item={item} />)}
      </Box>
      <Box className={CLASSES.guideFoot} sx={STYLES.foot}>
        Treat these as interpretation guides, not conclusions. Stronger judgments should come from corroboration across multiple layers, not from a single signal viewed in isolation.
      </Box>
    </Dialog>
  );
}

export { SIGNAL_GUIDE_ITEMS as signalGuideItems } from './items';
