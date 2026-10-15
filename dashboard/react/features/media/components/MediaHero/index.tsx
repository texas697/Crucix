import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface MediaHeroProps {
  channelCount: number;
}

export function MediaHero({ channelCount }: MediaHeroProps) {
  return (
    <Box component="header" className={CLASSES.hero} sx={STYLES.hero}>
      <Box className={CLASSES.heroText}>
        <Typography variant="h1" component="h1" className={CLASSES.heroTitle}>Live media</Typography>
        <Typography component="p" className={CLASSES.heroLead} sx={STYLES.heroLead}>
          Broadcaster feeds from across the world, on the map&apos;s sources. Switch channels, mute,
          go fullscreen or picture-in-picture, or open the grid to watch several at once. Streams
          are the broadcasters&apos; own public HLS feeds.
        </Typography>
      </Box>
      <Typography variant="caption" component="span" className={CLASSES.status} sx={STYLES.status}>
        {channelCount} channels
      </Typography>
    </Box>
  );
}
