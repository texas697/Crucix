import { CHOKEPOINT_COLOR, CHOKEPOINT_STATUS_LABEL, COLORS, RADIUS } from '../consts';
import type { LooseRecord, PlotContext, ShipBox } from '../types';
import { asRec, bool, dimSpan, esc, num, numOrNull, recs, str } from '../utils';

function chokepointColor(cp: LooseRecord, status: string): string {
  return CHOKEPOINT_COLOR[status] || (cp.major ? CHOKEPOINT_COLOR.major! : CHOKEPOINT_COLOR.minor!);
}

function liveText(lb: LooseRecord | ShipBox | null): string {
  if (!lb || !num(lb.vessels)) return '';
  const military = num(lb.military)
    ? ` · <span style="color:var(--danger)">${num(lb.military)} military/law</span>`
    : '';
  return `<br><span style="color:var(--sky)">Live now: ${num(lb.vessels)} ships</span> · ${num(
    lb.tanker,
  )} tankers · ${num(lb.anchored)} stopped/at anchor${military}`;
}

function transitText(cp: LooseRecord, perDay: number | null, lb: LooseRecord | ShipBox | null): string {
  if (perDay == null) return esc(cp.note || 'No transit data');
  const pctN = numOrNull(cp.pct);
  const pct = pctN != null ? `${pctN > 0 ? '+' : ''}${pctN}% vs 1-yr avg` : '';
  const trendN = numOrNull(cp.trend);
  const trend = trendN != null ? ` · week ${trendN > 0 ? '+' : ''}${trendN}%` : '';
  const tankerN = numOrNull(cp.tanker);
  const ev = recs(cp.events).find((e) => bool(e.ongoing));
  return `<b>${perDay} ships/day</b> (7-day) · 1-yr avg ${cp.base ?? '--'}${pct ? '<br>' + pct : ''}${trend}${
    tankerN != null ? `<br>Tankers ${tankerN}% of transits` : ''
  }${liveText(lb)}${
    ev ? `<br><span style="color:var(--danger)">&#9888; ${esc(ev.name)} since ${esc(ev.from || '')}</span>` : ''
  }${cp.note ? `<br>${dimSpan(esc(cp.note))}` : ''}${
    cp.asOf ? `<br>${dimSpan(`Data to ${esc(cp.asOf)} · IMF PortWatch`, '.6')}` : ''
  }`;
}

export function plotChokepoints({ D, input, points, labels }: PlotContext): void {
  const shipBoxes = input.ships?.boxes;
  recs(D.chokepoints).forEach((cp) => {
    const status = str(cp.status);
    const perDay = numOrNull(cp.perDay);
    const id = str(cp.id);
    const lb = (shipBoxes && id ? shipBoxes[id] : undefined) || (cp.live ? asRec(cp.live) : null);
    points.push({
      lat: num(cp.lat),
      lng: num(cp.lon),
      size: cp.major ? 0.35 : 0.22,
      _r: cp.major ? RADIUS.chokepointMajor : RADIUS.chokepointMinor,
      color: chokepointColor(cp, status),
      _stroke: COLORS.chokepointStroke,
      type: 'maritime',
      priority: status === 'disrupted' ? 1 : cp.major ? 1 : 3,
      ts: cp.asOf ? str(cp.asOf) + 'T12:00:00Z' : undefined,
      popHead: str(cp.label),
      popMeta: `Maritime chokepoint · ${CHOKEPOINT_STATUS_LABEL[status] || 'Chokepoint'}`,
      popText: transitText(cp, perDay, lb),
    });
    if (cp.major || status === 'disrupted') {
      labels.push({
        lat: num(cp.lat),
        lng: num(cp.lon),
        text:
          str(cp.label).replace(' Strait', '').replace('Strait of ', '') +
          (perDay != null ? ' ' + Math.round(perDay) : ''),
        type: 'maritime',
      });
    }
  });
}
