import { asArr, asRec, num, str, type Rec } from '../../coerce';

export interface SpaceWeatherView {
  kpNow: number;
  kpLabel: string;
  scales: { g: number; r: number; s: number };
  forecast: Rec | undefined;
  flareCurrent: string;
  flareMax: string;
  kpTitle: string;
  xrayTitle: string;
}

export function spaceWeatherView(raw: unknown): SpaceWeatherView | null {
  const w = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Rec) : null;
  if (!w || w.error || !w.kp) return null;
  const kpObj = asRec(w.kp);
  const kpNow = typeof w.kp === 'number' ? w.kp : num(kpObj.now);
  const max24 = num(kpObj.max24, kpNow);
  const max72 = num(kpObj.max72, kpNow);
  const scales = asRec(w.scales);
  const nowScales = asRec(scales.now);
  const forecastList = Array.isArray(scales.forecast) ? (scales.forecast as unknown[]).map(asRec) : [];
  const flare = asRec(w.flare);
  const flareMax = str(flare.max);
  const flareMaxTime = str(flare.maxTime);
  const firstAlert = asArr(w.alerts)[0];
  const alertTitle = firstAlert ? (str(firstAlert.title) || str(firstAlert.message)) : '';
  return {
    kpNow,
    kpLabel: str(kpObj.label),
    scales: { g: num(nowScales.G) || num(scales.g), r: num(nowScales.R) || num(scales.r), s: num(nowScales.S) || num(scales.s) },
    forecast: forecastList.find((d) => num(d.G) >= 1 || num(d.R) >= 1),
    flareCurrent: str(flare.current) || str(flare.class),
    flareMax,
    kpTitle: `NOAA planetary Kp, 3-hourly · 24h max ${max24.toFixed(1)} · 72h max ${max72.toFixed(1)}` + (alertTitle ? ` · ${alertTitle}` : ''),
    xrayTitle: `GOES X-ray flux · latest flare peak ${flareMax || 'n/a'}` + (flareMaxTime ? ` at ${flareMaxTime.slice(11, 16)}Z` : ''),
  };
}
