// ─── Number to Words (Indian currency) ───────────────────────
export function toWords(n: number): string {
  if (!n || isNaN(n) || !isFinite(n) || n <= 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function w(num: number): string {
    if (!num || num <= 0) return '';
    if (num < 20) return a[num] + ' ';
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '') + ' ';
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred ' + w(num % 100);
    if (num < 100000) return w(Math.floor(num / 1000)) + 'Thousand ' + w(num % 1000);
    if (num < 10000000) return w(Math.floor(num / 100000)) + 'Lakh ' + w(num % 100000);
    return w(Math.floor(num / 10000000)) + 'Crore ' + w(num % 10000000);
  }
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let out = w(rupees).trim() + ' Rupees';
  if (paise > 0) out += ' and ' + w(paise).trim() + ' Paise';
  return out + ' Only';
}

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
