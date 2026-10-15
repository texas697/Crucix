export type Rec = Record<string, unknown>;

export function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

export function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

export function asStrArr(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => (typeof x === 'string' ? x : String(x))) : [];
}

export function asNumArr(value: unknown): number[] {
  return Array.isArray(value) ? (value as unknown[]).map((v) => num(v)) : [];
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function isRec(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
