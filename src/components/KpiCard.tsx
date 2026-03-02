interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'navy' | 'orange';
}

const colorMap = {
  blue: '#1a56b0',
  green: '#0e6d41',
  red: '#b91c1c',
  navy: '#0f2044',
  orange: '#c2410c',
};

export default function KpiCard({ label, value, sub, color = 'blue' }: KpiCardProps) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 8,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 18, fontWeight: 600,
        color: colorMap[color],
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
