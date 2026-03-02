'use client';

import { useState, useEffect, useMemo } from 'react';
import { MaterialRow, MATERIAL_DATA } from '@/data/projectData';
import { fmt } from '@/lib/utils';

interface MaterialsPageProps {
  onTotalChange?: (amount: number) => void;
}

export default function MaterialsPage({ onTotalChange }: MaterialsPageProps) {
  const [rows, setRows] = useState<MaterialRow[]>(MATERIAL_DATA);
  const totals = useMemo(() => ({
    total: rows.reduce((s, r) => s + r.total, 0),
    prev: rows.reduce((s, r) => s + r.prev, 0),
    thisV: rows.reduce((s, r) => s + r.thisV, 0),
    cum: rows.reduce((s, r) => s + r.prev + r.thisV, 0),
    bal: rows.reduce((s, r) => s + (r.total - r.prev - r.thisV), 0),
  }), [rows]);

  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(totals.thisV);
    }
  }, [totals.thisV, onTotalChange]);

  const updateRow = (idx: number, val: number) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, thisV: val } : r));
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1d5db', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, color: '#0f2044' }}>Free Issue Material Deductions (Client Supplied)</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          Enter deduction amount for this bill — auto-connected to COP calculation
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="left" style={{ width: 44 }}>S.No</th>
              <th className="left" style={{ minWidth: 300 }}>Item Description</th>
              <th style={{ width: 150 }}>Total PO Value (₹)</th>
              <th style={{ width: 150 }}>Previous Deduction (₹)</th>
              <th style={{ width: 160, background: '#fee2e2', color: '#b91c1c' }}>This Bill Deduction (₹) ▼</th>
              <th style={{ width: 150 }}>Cumulative Deducted (₹)</th>
              <th style={{ width: 130 }}>Balance Pending (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const cum = r.prev + r.thisV;
              const bal = r.total - cum;
              return (
                <tr key={idx} className={r.thisV > 0 ? 'row-deduct' : ''}>
                  <td className="sno">{r.sno}</td>
                  <td className="left">{r.desc}</td>
                  <td className="mono">{r.total ? fmt(r.total) : '–'}</td>
                  <td className="mono num-neg">{r.prev ? `(${fmt(r.prev)})` : '–'}</td>
                  <td style={{ background: '#fee2e2', padding: 3 }}>
                    <input
                      className="bill-input"
                      type="number"
                      value={r.thisV || ''}
                      placeholder="0"
                      style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                      onChange={e => updateRow(idx, parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="mono num-neg">{cum ? `(${fmt(cum)})` : '–'}</td>
                  <td className="mono" style={{ color: bal > 0 ? '#92400e' : '#0e6d41' }}>
                    {fmt(bal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="row-sub">
              <td colSpan={2} className="left"><strong>TOTAL MATERIAL DEDUCTIONS</strong></td>
              <td className="mono">{fmt(totals.total)}</td>
              <td className="mono num-neg">({fmt(totals.prev)})</td>
              <td className="mono num-neg"><strong>({fmt(totals.thisV)})</strong></td>
              <td className="mono num-neg">({fmt(totals.cum)})</td>
              <td className="mono" style={{ color: '#92400e' }}>{fmt(totals.bal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{
        padding: '10px 16px', borderTop: '1px solid #d1d5db', background: '#fff5f5',
        display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Auto-connected to Certificate of Payment
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#b91c1c' }}>Total Deduction This Bill:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c', fontSize: 14 }}>
            ₹ {fmt(totals.thisV)}
          </span>
        </div>
      </div>
    </div>
  );
}
