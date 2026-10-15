import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import type { Theme } from '../../../../shared/theme';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';

export interface BrandLinkProps {
  mode: Theme;
  isRouterLink: boolean;
}

const LOGOS: Record<Theme, string> = {
  dark: '/brand/mfb-intelligence-navbar-dark-transparent.png',
  light: '/brand/mfb-intelligence-navbar-light-transparent.png',
};

export function BrandLink({ mode, isRouterLink }: BrandLinkProps) {
  const logo = (
    <Box
      component="img"
      className={CLASSES.brandLogo}
      sx={STYLES.brandLogo}
      src={LOGOS[mode]}
      alt="MFB Services Intelligence"
      width={1124}
      height={160}
    />
  );
  if (isRouterLink) {
    return (
      <Box component={Link} to="/" className={CLASSES.brand} sx={STYLES.brand} aria-label="Dashboard">
        {logo}
      </Box>
    );
  }
  return (
    <Box component="a" href="/" className={CLASSES.brand} sx={STYLES.brand} aria-label="Dashboard">
      {logo}
    </Box>
  );
}
