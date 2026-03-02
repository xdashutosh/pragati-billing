'use client';

import { useMemo } from 'react';
import { HoldItem } from '@/data/projectData';
import { fmt } from '@/lib/utils';

interface HoldsPageProps {
  holds: HoldItem[];
  onHoldsChange: (holds: HoldItem[]) => void;
}

export default function HoldsPage({ holds, onHoldsChange }: HoldsPageProps) {
  const toggle = (id: string) => {
    onHoldsChange(holds.map(h => h.id === id ? { ...h, active: !h.active } : h));
  };

  const releaseAll = () => {
    onHoldsChange(holds.map(h => ({ ...h, active: false })));
  };

  const totals = useMemo(() => ({
    active:   holds.filter(h => h.active).reduce((s, h) => s + h.amt, 0),
    released: holds.filter(h => !h.active).reduce((s, h) => s + h.amt, 0),
  }), [holds]);

  return (
    <div style={{
      background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #d1d5db', background: '#f8fafc',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f2044' }}>Hold & Release — RA-16</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Released holds auto-add to COP as Section (I). Active holds appear in Section (F) deductions.
          </div>
        </div>
        <button
          onClick={releaseAll}
          style={{
            background: '#0e6d41', color: '#fff',
            padding: '6px 14px', borderRadius: 6, border: 'none',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          Release All
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {holds.map(h => (
            <div
              key={h.id}
              style={{
                border: `1px solid ${h.active ? '#fdba74' : '#d1d5db'}`,
                borderRadius: 6, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: h.active ? '#ffedd5' : '#f8fafc',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={h.active}
                onChange={() => toggle(h.id)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#c2410c' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500,
                  textDecoration: h.active ? 'none' : 'line-through',
                  color: h.active ? '#1e293b' : '#94a3b8',
                }}>
                  {h.desc}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Ref: {h.id}</div>
              </div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 13, fontWeight: 700,
                color: h.active ? '#c2410c' : '#94a3b8',
                textDecoration: h.active ? 'none' : 'line-through',
                whiteSpace: 'nowrap',
              }}>
                ₹ {fmt(h.amt)}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: h.active ? '#c2410c' : '#0e6d41',
                color: '#fff', whiteSpace: 'nowrap',
              }}>
                {h.active ? 'ON HOLD' : 'RELEASED'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '12px 16px', borderTop: '1px solid #d1d5db', background: '#f8fafc',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#0e6d41' }}>
            Released → COP (I): <strong style={{ fontFamily: 'monospace' }}>₹ {fmt(totals.released)}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#c2410c' }}>
            Active Holds → COP (F): <strong style={{ fontFamily: 'monospace' }}>₹ {fmt(totals.active)}</strong>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>Auto-connected to Certificate of Payment</div>
      </div>
    </div>
  );
}
