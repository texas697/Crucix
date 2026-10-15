import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { popupAt } from '../../stylesPopup';

export interface MapPopupProps {
  head?: string;
  text?: string;
  meta?: string;
  lng?: number | null;
  lat?: number | null;
  url?: string | null;
  isNew?: boolean;
  left?: number;
  top?: number;
  onCopy?: () => void;
  onClose?: () => void;
}

export function MapPopup({ head, text, meta, lng, lat, url, isNew, left = 50, top = 50, onCopy, onClose }: MapPopupProps) {
  const coords = lat != null && lng != null ? `${lat.toFixed(2)}, ${lng.toFixed(2)}` : null;
  const safeUrl = safeExternalUrl(url);
  const positionSx = useMemo(() => popupAt(left, top), [left, top]);
  const html = useMemo(() => ({ __html: text || '' }), [text]);
  const hasFoot = !!coords || !!safeUrl || !!isNew;

  return (
    <Paper className={CLASSES.popup} id="mapPopup" sx={positionSx} elevation={0}>
      <IconButton className={CLASSES.popupClose} sx={STYLES.popupClose} onClick={onClose} aria-label="Close popup">&times;</IconButton>
      <Box className={CLASSES.popupHead} sx={STYLES.popupHead}>{head || ''}</Box>
      <Box className={CLASSES.popupText} sx={STYLES.popupText} dangerouslySetInnerHTML={html} />
      <Box className={CLASSES.popupMeta} sx={STYLES.popupMeta}>{meta || ''}</Box>
      {hasFoot && (
        <Box className={CLASSES.popupFoot} sx={STYLES.popupFoot}>
          {coords && (
            <Button className={CLASSES.popupCopy} sx={STYLES.popupCopy} title="Copy coordinates" onClick={onCopy}>{coords}</Button>
          )}
          {safeUrl && (
            <Link className={CLASSES.popupLink} sx={STYLES.popupLink} href={safeUrl} target="_blank" rel="noopener noreferrer">
              Open source &#8599;
            </Link>
          )}
          {isNew && <Box component="span" className={CLASSES.popupNew} sx={STYLES.popupNew}>&#9679; new</Box>}
        </Box>
      )}
    </Paper>
  );
}
