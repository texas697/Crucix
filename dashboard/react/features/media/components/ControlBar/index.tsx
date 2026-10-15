import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { MediaControlsState } from '../../types';

export interface ControlBarProps {
  channelName: string;
  controls: MediaControlsState;
  isGridOn: boolean;
  openUrl: string | null;
  onToggleGrid: () => void;
}

const GRID_VALUE = 'grid';
const MUTE_VALUE = 'mute';

export function ControlBar({ channelName, controls, isGridOn, openUrl, onToggleGrid }: ControlBarProps) {
  return (
    <Box className={CLASSES.bar} sx={STYLES.bar}>
      <Typography component="span" className={CLASSES.nowPlaying} sx={STYLES.nowPlaying} id="nowName">{channelName}</Typography>
      <Box component="span" className={CLASSES.live} sx={STYLES.live} id="liveBadge">
        <Box component="span" className={CLASSES.liveDot} sx={STYLES.liveDot} />LIVE
      </Box>
      <Box component="span" className={CLASSES.barSpacer} sx={STYLES.barSpacer} />
      <ToggleButton
        disableRipple
        value={MUTE_VALUE}
        id="btnMute"
        className={clsx(CLASSES.control, controls.isMuted && CLASSES.controlOn)}
        sx={STYLES.control}
        title="Mute (m)"
        aria-label="Mute"
        selected={controls.isMuted}
        onChange={controls.onToggleMute}
      >
        {controls.isMuted ? '🔇' : '🔊'}
      </ToggleButton>
      <Box
        component="input"
        className={CLASSES.volume}
        sx={STYLES.volume}
        id="vol"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={controls.volume}
        title="Volume"
        aria-label="Volume"
        onChange={controls.onVolumeInput}
      />
      <IconButton className={CLASSES.control} sx={STYLES.control} id="btnPip" title="Picture in picture" onClick={controls.onTogglePip}>▣</IconButton>
      <IconButton className={CLASSES.control} sx={STYLES.control} id="btnFs" title="Fullscreen (f)" onClick={controls.onToggleFullscreen}>⛶</IconButton>
      <ToggleButtonGroup exclusive className={CLASSES.gridToggle} value={isGridOn ? GRID_VALUE : null} onChange={onToggleGrid}>
        <ToggleButton
          disableRipple
          value={GRID_VALUE}
          id="btnGrid"
          className={clsx(CLASSES.control, isGridOn && CLASSES.controlOn)}
          sx={STYLES.control}
          title="Multi-channel grid"
        >
          ⊞
        </ToggleButton>
      </ToggleButtonGroup>
      {openUrl && (
        <Button
          component="a"
          variant="outlined"
          className={CLASSES.button}
          sx={STYLES.button}
          id="btnOpen"
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open feed ↗
        </Button>
      )}
    </Box>
  );
}
