import { asArr, asStrArr, asText, num, type Rec } from '../../coerce';

export interface RadarAnnotation extends Rec {
  k: string;
  n: number;
}

export function nationalOutages(countries: Rec[]): Rec[] {
  return countries.filter((c) => !!c.national);
}

export function regionalOutages(countries: Rec[]): Rec[] {
  const score = (c: Rec) => num(c.regions) * 3 + num(c.asns) + num(c.drop);
  return countries
    .filter((c) => !c.national && (c.minor || num(c.regions) >= 2 || num(c.asns) >= 3))
    .sort((a, b) => score(b) - score(a));
}

export function groupAnnotations(annotations: unknown): RadarAnnotation[] {
  const grouped: RadarAnnotation[] = [];
  asArr(annotations).forEach((a) => {
    const cc0 = asStrArr(a.cc)[0] ?? '';
    const asns0 = asStrArr(a.asns)[0] ?? '';
    const k = `${cc0 || asns0}|${asText(a.cause) || asText(a.kind)}`;
    const g = grouped.find((x) => x.k === k && !x.active && !a.active);
    if (g) {
      g.n += 1;
      return;
    }
    grouped.push({ ...a, k, n: 1 });
  });
  return grouped;
}

export function annotationWhere(a: Rec): string {
  return asStrArr(a.names)[0] || asStrArr(a.cc)[0] || asStrArr(a.asns)[0] || 'Unattributed';
}

export function annotationCause(a: Rec): string {
  const cause = asText(a.cause);
  return (cause || asText(a.kind) || asText(a.type) || 'outage').toLowerCase().replace(/_/g, ' ');
}

export function outageTitle(c: Rec): string {
  const national = !!c.national;
  const minor = !!c.minor;
  const cause = asText(c.cause);
  const regions = num(c.regions);
  const asns = num(c.asns);
  const kind = national ? `national-level alert on ${asStrArr(c.sources).join(', ')}` : minor ? 'minor country-level dip' : 'sub-national alerts';
  return `${asText(c.name)}: ${kind}`
    + `${regions ? ` · ${regions} regions` : ''}`
    + `${asns ? ` · ${asns} networks` : ''}`
    + `${cause ? ` · Cloudflare: ${cause}` : ''}`;
}

export function shortCause(c: Rec): string {
  const cause = asText(c.cause);
  return cause ? `${cause.split(' (')[0]!.slice(0, 38)}${cause.length > 38 ? '…' : ''}` : '';
}

function pctList(list: unknown): string {
  return asArr(list).map((x) => `${asText(x.name)} ${num(x.pct)}%`).join(', ');
}

export function ddosTitle(attacks: Rec): string {
  return 'Share of DDoS attack traffic Cloudflare mitigated in the last 24h, by target country. '
    + `L7 (HTTP): ${pctList(attacks.l7Targets)}. `
    + `L3 targets: ${pctList(attacks.l3Targets)}. `
    + `L3 origins: ${pctList(attacks.l3Origins)}`;
}
