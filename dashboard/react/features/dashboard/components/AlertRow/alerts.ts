export function alertMs(time: string | undefined): number | null {
  if (!time) return null;
  const s = time.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s) * 1000;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}
