import type { SweepData } from '../../../../api/types';
import { asArr, asRec, num, str, type Rec } from '../../coerce';

const THEATER_ORDER = ['middleEast', 'europe', 'africa', 'asiaPacific', 'americas'];
const REGION_BOX: Record<string, [[number, number], [number, number]] | null> = {
  world: null,
  americas: [[-168, -58], [-32, 72]],
  europe: [[-25, 33], [45, 72]],
  middleEast: [[24, 10], [65, 45]],
  asiaPacific: [[55, -15], [180, 60]],
  africa: [[-20, -36], [55, 38]],
};
const REGION_LABEL: Record<string, string> = {
  world: 'World', americas: 'Americas', europe: 'Europe', middleEast: 'Middle East', asiaPacific: 'Asia Pacific', africa: 'Africa',
};
const THREAT_REGIONS = ['middleEast', 'europe', 'asiaPacific', 'americas', 'africa'];

function inRegionBox(lat: number, lon: number, region: string): boolean {
  const b = REGION_BOX[region];
  if (!b) return true;
  return lat >= b[0][1] && lat <= b[1][1] && lon >= b[0][0] && lon <= b[1][0];
}

function theaterOf(lat: number, lon: number): string | null {
  for (const r of THEATER_ORDER) if (inRegionBox(lat, lon, r)) return r;
  return null;
}

interface RegionGdelt { events: number; types: Rec; count: number }

function regionGdelt(by: Rec, r: string): RegionGdelt {
  const direct = by[r];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const rec = direct as Rec;
    return { events: num(rec.events), types: asRec(rec.types), count: 0 };
  }
  const label = REGION_LABEL[r];
  const alt = label != null ? by[label] : undefined;
  const count = typeof alt === 'number' ? alt : typeof direct === 'number' ? direct : 0;
  return { events: 0, types: {}, count };
}

function outbreakRisk(o: Rec): string {
  const risk = o.risk;
  if (typeof risk === 'string') return risk.toLowerCase();
  return str(asRec(risk).max).toLowerCase();
}

export interface ThreatPart { k: string; n: number; pts: number; txt: string }

export interface ThreatRegion {
  r: string;
  label: string;
  score: number;
  level: string;
  color: string;
  events: number;
  severe: number;
  tip: string;
  parts: ThreatPart[];
}

function levelFor(score: number): readonly [string, string] {
  return score >= 60 ? ['Critical', '#ff6b74'] : score >= 40 ? ['High', '#f59a5e'] : score >= 20 ? ['Elevated', '#f2c879'] : ['Guarded', '#7fe0c0'];
}

function disruptionParts(data: SweepData, r: string): ThreatPart[] {
  const parts: ThreatPart[] = [];
  const inTheater = (x: Rec) => theaterOf(num(x.lat), num(x.lon)) === r;
  const cps = asArr(data.chokepoints).filter((c) => c.status === 'disrupted' && inTheater(c));
  if (cps.length) parts.push({ k: 'chokepoints', n: cps.length, pts: Math.min(20, 12 * cps.length), txt: cps.map((c) => str(c.label)).join(', ') });
  const outs = asArr(asRec(data.outages).countries).filter((c) => c.national && c.lat != null && inTheater(c));
  if (outs.length) parts.push({ k: 'internet outages', n: outs.length, pts: Math.min(16, 8 * outs.length), txt: outs.map((c) => str(c.name)).join(', ') });
  const reds = asArr(asRec(data.disasters).events).filter((e) => e.level === 'Red' && inTheater(e));
  if (reds.length) parts.push({ k: 'GDACS red', n: reds.length, pts: Math.min(12, 6 * reds.length), txt: reds.map((e) => str(e.name)).join(', ') });
  const nukes = asArr(data.nuke).filter((n) => n.anom && inTheater(n));
  if (nukes.length) parts.push({ k: 'radiation', n: nukes.length, pts: 15, txt: nukes.map((n) => str(n.site)).join(', ') });
  const who = asArr(asRec(data.healthWatch).outbreaks).filter((o) => outbreakRisk(o) === 'very high'
    && (Array.isArray(o.pins) ? (o.pins as unknown[]) : []).some((p) => Array.isArray(p) && theaterOf(num(p[0]), num(p[1])) === r));
  if (who.length) parts.push({ k: 'WHO very high', n: who.length, pts: 8, txt: who.map((o) => str(o.disease)).join(', ') });
  return parts;
}

export function gdeltHours(data: SweepData): number {
  return num(asRec(asRec(data.gdelt).window).hours, 6) || 6;
}

export function threatByRegion(data: SweepData): ThreatRegion[] {
  const by = asRec(asRec(data.gdelt).byRegion);
  const hours = gdeltHours(data);
  return THREAT_REGIONS.map((r) => {
    const g = regionGdelt(by, r);
    const types = g.types;
    const severe = num(types['Armed clash']) + num(types['Mass violence']) + num(types['Assault']);
    let sev = num(types['Armed clash']) + 3 * num(types['Mass violence']) + 0.5 * num(types['Assault']);
    if (severe === 0 && g.count > 0) sev = g.count;
    const conflict = Math.min(60, Math.round(20 * Math.log10(1 + sev / 10)));
    const parts = disruptionParts(data, r);
    const disruption = Math.min(40, parts.reduce((s, p) => s + p.pts, 0));
    const score = Math.min(100, conflict + disruption);
    const lvl = levelFor(score);
    const label = REGION_LABEL[r] ?? r;
    const events = g.events || g.count;
    const severeCount = severe || g.count;
    const tip = `${label} ${'·'} score ${score}: conflict ${conflict} (${severeCount} armed clash / mass violence / assault events of ${events} conflict events in the last ${hours}h)`
      + (parts.length ? `; ${parts.map((p) => `${p.k} +${p.pts} (${p.txt})`).join('; ')}` : '; no disruption signals');
    return { r, label, score, level: lvl[0], color: lvl[1], events, severe: severeCount, tip, parts };
  }).sort((a, b) => b.score - a.score);
}
