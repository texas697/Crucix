import { CLASSES } from '../../classes';
import { num } from '../../coerce';
import { STYLES } from '../../styles';
import { EconRow } from '../EconRow';
import { spaceWeatherView } from './weather';

export interface SpaceWeatherRowsProps {
  spaceWeather: unknown;
}

function kpStyle(kp: number) {
  return kp >= 5 ? STYLES.danger : kp >= 4 ? STYLES.warn : STYLES.mint;
}

export function SpaceWeatherRows({ spaceWeather }: SpaceWeatherRowsProps) {
  const w = spaceWeatherView(spaceWeather);
  if (!w) return null;
  const { g, r, s } = w.scales;
  const fc = w.forecast;
  const kpValue = (
    <>
      <span className={CLASSES.spaceKp} style={kpStyle(w.kpNow)}>Kp {w.kpNow.toFixed(1)}</span>
      {w.kpLabel ? <> <span className={CLASSES.spaceKpLabel} style={STYLES.softFaded}>{w.kpLabel}</span></> : null}
      {(g || r || s)
        ? <> {'·'} <span className={CLASSES.spaceScales} style={STYLES.danger}>{g ? `G${g}` : ''}{r ? ` R${r}` : ''}{s ? ` S${s}` : ''}</span></>
        : fc
          ? <> {'·'} <span className={CLASSES.spaceForecast} style={STYLES.warn}>{num(fc.G) ? `G${num(fc.G)}` : ''}{num(fc.R) ? ` R${num(fc.R)}` : ''} watch</span></>
          : null}
    </>
  );
  const xrayValue = (
    <>
      {w.flareCurrent || '--'}
      {w.flareMax ? <> <span className={CLASSES.spaceFlarePeak} style={STYLES.faded}>peak {w.flareMax}</span></> : null}
    </>
  );
  return (
    <>
      <EconRow label="Space weather" value={kpValue} title={w.kpTitle} />
      <EconRow label="Solar X-ray" value={xrayValue} title={w.xrayTitle} />
    </>
  );
}
