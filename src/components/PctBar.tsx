'use client';

/** Inline progress bar with percentage label. */
export default function PctBar({
  pct,
  color = '#1a56b0',
  width = 60,
  height = 5,
}: {
  pct: number;
  color?: string;
  width?: number;
  height?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width, height, background: '#e2e8f0', borderRadius: 3 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}
