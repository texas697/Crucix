import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { CLASSES } from '../../classes';
import { LAYER_DEFS, type LayerInfo } from '../../layerDefs';
import type { SxProps, Theme } from '@mui/material/styles';
import { STYLES } from '../../styles';
import { infoLabelSx } from '../../stylesInfo';

export interface LayerInfoOverlayProps {
  layerKey: string | null;
  info: LayerInfo | null;
  onClose?: () => void;
}

interface InfoLineProps {
  label: string;
  labelSx?: SxProps<Theme>;
  children: ReactNode;
}

function InfoLine({ label, labelSx = STYLES.infoLabel, children }: InfoLineProps) {
  return (
    <Box className={CLASSES.infoLine} sx={STYLES.infoLine}>
      <Box component="span" className={CLASSES.infoLabel} sx={labelSx}>{label}</Box>
      {children}
    </Box>
  );
}

export function LayerInfoOverlay({ layerKey, info, onClose }: LayerInfoOverlayProps) {
  const def = useMemo(() => LAYER_DEFS.find((layer) => layer.key === layerKey), [layerKey]);
  const labelSx = useMemo(() => infoLabelSx(def?.color), [def]);
  const isOpen = !!layerKey && !!info;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className={CLASSES.info}
      id="layerOverlay"
      data-surface="layer-info"
      aria-labelledby="layerTitle"
      PaperProps={{ className: CLASSES.infoPanel, sx: STYLES.infoPanel }}
      slotProps={{ backdrop: { sx: STYLES.infoBackdrop } }}
    >
      <Box className={CLASSES.infoHead} sx={STYLES.infoHead}>
        <Box className={CLASSES.infoHeadText}>
          <Box className={CLASSES.infoKicker} sx={STYLES.infoKicker}>Map layer</Box>
          <Box className={CLASSES.infoTitle} sx={STYLES.infoTitle} id="layerTitle">{def?.label || layerKey}</Box>
          <Box className={CLASSES.infoSub} sx={STYLES.infoSub} id="layerSub">
            What this layer shows, where it comes from, and what it does not prove.
          </Box>
        </Box>
        <IconButton className={CLASSES.infoClose} sx={STYLES.infoClose} onClick={onClose} aria-label="Close layer info">&times;</IconButton>
      </Box>
      <Box className={CLASSES.infoBody} sx={STYLES.infoBody} id="layerBody">
        <Box className={CLASSES.infoCard} sx={STYLES.infoCard}>
          <InfoLine label="Purpose" labelSx={labelSx}>{info?.purpose}</InfoLine>
          <InfoLine label="Source">{info?.source}</InfoLine>
          <InfoLine label="Freshness">{info?.freshness}</InfoLine>
          <InfoLine label="Confidence">{info?.confidence}</InfoLine>
          <InfoLine label="Limitations">{info?.limitations.join(' · ')}</InfoLine>
        </Box>
      </Box>
      <Box className={CLASSES.infoFoot} sx={STYLES.infoFoot}>
        Layer metadata describes the source and its limits. Treat a single layer as one lens, not a conclusion.
      </Box>
    </Dialog>
  );
}
