import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { num } from '../../coerce';
import { TONE_STYLES } from '../../styles';
import { EconRow } from '../EconRow';
import { spaceWeatherView } from './weather';

export interface SpaceWeatherRowsProps {
  spaceWeather: unknown;
}

function kpSx(kp: number) {
  return kp >= 5 ? TONE_STYLES.danger : kp >= 4 ? TONE_STYLES.warn : TONE_STYLES.mint;
}

export function SpaceWeatherRows({ spaceWeather }: SpaceWeatherRowsProps) {
  const w = spaceWeatherView(spaceWeather);
  if (!w) return null;
  const { g, r, s } = w.scales;
  const fc = w.forecast;
  const kpValue = (
    <>
      <Box component="span" className={CLASSES.spaceKp} sx={kpSx(w.kpNow)}>Kp {w.kpNow.toFixed(1)}</Box>
      {w.kpLabel ? <> <Box component="span" className={CLASSES.spaceKpLabel} sx={TONE_STYLES.softFaded}>{w.kpLabel}</Box></> : null}
      {(g || r || s)
        ? <> {'·'} <Box component="span" className={CLASSES.spaceScales} sx={TONE_STYLES.danger}>{g ? `G${g}` : ''}{r ? ` R${r}` : ''}{s ? ` S${s}` : ''}</Box></>
        : fc
          ? <> {'·'} <Box component="span" className={CLASSES.spaceForecast} sx={TONE_STYLES.warn}>{num(fc.G) ? `G${num(fc.G)}` : ''}{num(fc.R) ? ` R${num(fc.R)}` : ''} watch</Box></>
          : null}
    </>
  );
  const xrayValue = (
    <>
      {w.flareCurrent || '--'}
      {w.flareMax ? <> <Box component="span" className={CLASSES.spaceFlarePeak} sx={TONE_STYLES.faded}>peak {w.flareMax}</Box></> : null}
    </>
  );
  return (
    <>
      <EconRow label="Space weather" value={kpValue} title={w.kpTitle} />
      <EconRow label="Solar X-ray" value={xrayValue} title={w.xrayTitle} />
    </>
  );
}
