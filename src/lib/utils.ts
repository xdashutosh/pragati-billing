// ─── Number Formatting ───────────────────────────────────────
export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

export function fmtC(n: number | null | undefined): string {
  return '₹ ' + fmt(n);
}

export function fmtCr(n: number): string {
  return '₹' + (n / 10000000).toFixed(2) + ' Cr';
}

export function fmtPct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + '%';
}
