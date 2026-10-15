import { useMemo } from 'react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';
import { NAV_SURFACES, SURFACE_PATHS, SURFACE_TITLES, type NavSurface } from '../../../surfaces';
import { isReactSurface, type UiFlags } from '../../../uiFlags';

export interface NavTabsProps {
  active: NavSurface | null;
  flags: UiFlags;
  onSelect: (surface: NavSurface) => void;
}

type SelectHandlers = Record<NavSurface, () => void>;

export function NavTabs({ active, flags, onSelect }: NavTabsProps) {
  const onSelectSurface = useMemo<SelectHandlers>(
    () => Object.fromEntries(NAV_SURFACES.map((surface) => [surface, () => onSelect(surface)])) as SelectHandlers,
    [onSelect],
  );

  return (
    <Tabs
      component="nav"
      aria-label="Primary"
      className={CLASSES.nav}
      sx={STYLES.nav}
      value={active ?? false}
      variant="scrollable"
      scrollButtons={false}
    >
      {NAV_SURFACES.map((surface) => (
        isReactSurface(flags, surface)
          ? (
            <Tab
              key={surface}
              value={surface}
              label={SURFACE_TITLES[surface]}
              component={Link}
              to={SURFACE_PATHS[surface]}
              className={CLASSES.navTab}
              aria-current={active === surface ? 'page' : undefined}
              onClick={onSelectSurface[surface]}
            />
          )
          : (
            <Tab
              key={surface}
              value={surface}
              label={SURFACE_TITLES[surface]}
              component="a"
              href={SURFACE_PATHS[surface]}
              className={clsx(CLASSES.navTab, `${CLASSES.navTab}--legacy`)}
            />
          )
      ))}
    </Tabs>
  );
}
