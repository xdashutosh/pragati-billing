// ─── Shared color constants ───────────────────────────────────────────────────

// Building blocks 1–4 (blue / green / orange / purple)
export const BLOCK_COLORS = ['#1e40af', '#166534', '#9a3412', '#6b21a8'];
export const BLOCK_BG     = ['#eff6ff', '#f0fdf4', '#fff7ed', '#faf5ff'];
export const BLOCK_MED    = ['#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff'];

// Brand / UI
export const NAVY  = '#0f2044';
export const BLUE  = '#1a56b0';
export const GREEN = '#0e6d41';

// Work-category colors (keyed by category name substring)
export const CAT_COLORS: Record<string, string> = {
  'Building Civil Works':                 '#1a56b0',
  'Internal Fire Works':                  '#b91c1c',
  'Internal Electrical Fighting Works':   '#6b21a8',
  'Internal Electrical Works':            '#6b21a8',
  'Internal Plumbing Works':              '#0e6d41',
  'Infra Civil Works':                    '#1a56b0',
  'External Electrical Works':            '#6b21a8',
  'External Fire Works':                  '#b91c1c',
  'Consultant Fees for Complete Park':    '#0e6d41',
  'Alteration Item':                      '#92400e',
  'Drainage & STP':                       '#0369a1',
};

/** Resolve a category row banner color by checking substrings. */
export function catColor(cat: string): string {
  if (cat.includes('Fire'))   return '#b91c1c';
  if (cat.includes('Elec'))   return '#6b21a8';
  if (cat.includes('Plumb'))  return '#0e6d41';
  return '#1a56b0';
}
