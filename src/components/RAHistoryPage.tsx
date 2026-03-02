'use client';

import { useState, useMemo } from 'react';
import { useVendor } from '@/lib/VendorContext';
import { fmt } from '@/lib/utils';
import { RABillData } from '@/lib/raStore';

const CAT_COLORS: Record<string,string> = {
  'Infra Civil Works': '#1a56b0', 'External Electrical Works': '#6b21a8',
  'External Fire Works': '#b91c1c', 'Consultant Fees for Complete Park': '#0e6d41', 'Alteration Item': '#92400e',
};

interface Props { allRAs: RABillData[]; }
type ViewMode = 'amounts' | 'pct';

export default function RAHistoryPage({ allRAs }: Props) {
  const { infraRAMilestones, currentRA } = useVendor();
  const [viewMode, setViewMode] = useState<ViewMode>('amounts');
  const [selectedCat, setSelectedCat] = useState('all');
  const [highlightCol, setHighlightCol] = useState(`RA Bill - ${currentRA}`);

  // Collect ALL unique raHistory keys across every milestone (some RAs may only appear on certain rows)
  const JSON_RA_COLS = useMemo(() => {
    const all = new Set<string>();
    infraRAMilestones.forEach(m => { if (m.raHistory) Object.keys(m.raHistory).forEach(k => all.add(k)); });
    return Array.from(all).sort();
  }, [infraRAMilestones]);

  const categories = ['all', ...Array.from(new Set(infraRAMilestones.map(m => m.category).filter(Boolean)))];

  // Sort indices within each category by sno (numeric) for sequential display
  const filtered = useMemo(() => {
    const indices = selectedCat === 'all'
      ? infraRAMilestones.map((_,idx) => idx)
      : infraRAMilestones.map((_,idx) => idx).filter(idx => infraRAMilestones[idx].category === selectedCat);
    return indices.sort((a, b) => parseInt(infraRAMilestones[a].sno) - parseInt(infraRAMilestones[b].sno));
  }, [selectedCat, infraRAMilestones]);

  // All columns: JSON history + currentRA baseline + any saved RAs
  const allCols = [
    ...JSON_RA_COLS.map(k => ({ key: k, label: k.replace('RA Bill - ','RA-'), isSaved: false, raNum: 0 })),
    { key: `RA Bill - ${currentRA}`, label: `RA-${currentRA}`, isSaved: false, raNum: currentRA },
    ...allRAs.map(ra => ({ key: `saved-${ra.raNumber}`, label: `RA-${ra.raNumber}`, isSaved: true, raNum: ra.raNumber })),
  ];

  const getVal = (col: typeof allCols[0], idx: number): { amt: number; pct: number } => {
    if (col.isSaved) {
      const ra = allRAs.find(r => r.raNumber === col.raNum);
      const entry = ra?.infra[idx];
      return { amt: entry?.amt ?? 0, pct: entry?.pct ?? 0 };
    }
    if (col.raNum === currentRA) {
      const m = infraRAMilestones[idx];
      return { amt: m.thisAmt, pct: m.thisPct * 100 };
    }
    // JSON history
    const m = infraRAMilestones[idx];
    const hist = m.raHistory?.[col.key];
    return { amt: hist?.amt ?? 0, pct: (hist?.pct ?? 0) * 100 };
  };

  // Column totals
  const colTotals = useMemo(() => {
    const t: Record<string,number> = {};
    allCols.forEach(col => {
      t[col.key] = infraRAMilestones.reduce((_s,_,idx) => _s + getVal(col,idx).amt, 0);
    });
    return t;
  }, [allRAs, infraRAMilestones]);

  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d5db', borderRadius:8,
      height:'100%', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #d1d5db', background:'#f8fafc', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#0f2044' }}>
              Infra RA History — up to RA-{allRAs.length ? Math.max(currentRA,...allRAs.map(r=>r.raNumber)) : currentRA}
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
              {allRAs.length > 0
                ? `Includes ${allRAs.length} saved RA${allRAs.length>1?'s':''}: ${allRAs.map(r=>`RA-${r.raNumber}`).join(', ')}`
                : `No additional RAs saved yet — use New RA Entry to add RA-${currentRA + 1}+`}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ display:'flex', border:'1px solid #d1d5db', borderRadius:6, overflow:'hidden' }}>
              {(['amounts','pct'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  padding:'5px 12px', border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:11, fontWeight:600,
                  background:viewMode===v?'#1a56b0':'#fff',
                  color:viewMode===v?'#fff':'#475569',
                }}>
                  {v==='amounts'?'₹ Amounts':'% Complete'}
                </button>
              ))}
            </div>
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{
              padding:'5px 10px', border:'1px solid #d1d5db', borderRadius:6,
              fontFamily:'inherit', fontSize:11, background:'#fff', cursor:'pointer',
            }}>
              {categories.map(c => <option key={c} value={c}>{c==='all'?'All Categories':c}</option>)}
            </select>
          </div>
        </div>
        {/* Highlight selector */}
        <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:10, color:'#94a3b8' }}>Highlight:</span>
          {allCols.map(col => (
            <button key={col.key} onClick={() => setHighlightCol(col.key)} style={{
              padding:'2px 8px', borderRadius:4, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:10, fontWeight:700,
              background: highlightCol===col.key ? (col.isSaved?'#7c3aed':col.raNum===currentRA?'#1a56b0':'#0f2044') : '#f1f5f9',
              color: highlightCol===col.key ? '#fff' : '#475569',
            }}>{col.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        <table className="data-table" style={{ minWidth:200 + allCols.length*110 }}>
          <thead>
            <tr>
              <th className="left" style={{ width:44, position:'sticky', left:0, background:'#f8fafc', zIndex:2 }}>#</th>
              <th className="left" style={{ minWidth:280, position:'sticky', left:44, background:'#f8fafc', zIndex:2 }}>Description</th>
              <th style={{ width:120 }}>Scope (₹)</th>
              {allCols.map(col => {
                const isHL    = col.key === highlightCol;
                const isCurRA = col.raNum === currentRA && !col.isSaved;
                const isSaved = col.isSaved;
                return (
                  <th key={col.key} style={{
                    width:110, cursor:'pointer',
                    background: isSaved ? '#7c3aed' : isCurRA ? '#1a56b0' : isHL ? '#0f2044' : undefined,
                    color: (isSaved||isCurRA||isHL) ? '#fff' : undefined,
                  }} onClick={() => setHighlightCol(col.key)}>
                    {col.label}{isSaved ? ' ✓' : ''}
                  </th>
                );
              })}
              <th style={{ width:90 }}>Cum %</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastCat = '';
              return filtered.map(idx => {
                const m = infraRAMilestones[idx];
                const showCat = m.category && m.category !== lastCat;
                if (m.category) lastCat = m.category;
                const col = CAT_COLORS[m.category] || '#1a56b0';
                const newRATotal = allRAs.reduce((s,ra) => s + (ra.infra[idx]?.amt ?? 0), 0);
                const cumPct = m.scopeAmount ? ((m.cumAmt + newRATotal)/m.scopeAmount)*100 : 0;
                return (
                  <>
                    {showCat && (
                      <tr key={`cat-${m.category}-${idx}`}>
                        <td style={{ position:'sticky', left:0, background:'#fff', zIndex:1, borderTop:'2px solid #e2e8f0', padding:0 }} />
                        <td style={{
                          position:'sticky', left:44, background:'#fff', zIndex:1,
                          color: col, fontWeight:700, fontSize:10,
                          padding:'6px 12px 3px',
                          borderLeft:`3px solid ${col}`,
                          borderTop:'2px solid #e2e8f0',
                          textTransform:'uppercase', letterSpacing:0.4,
                        }}>
                          {m.category}
                        </td>
                        <td colSpan={allCols.length+2} style={{ borderTop:'2px solid #e2e8f0' }} />
                      </tr>
                    )}
                    <tr key={idx}>
                      <td className="sno" style={{ position:'sticky', left:0, background:'#fff', zIndex:1 }}>{m.sno}</td>
                      <td className="left" style={{ fontSize:11, position:'sticky', left:44, background:'#fff', zIndex:1 }}>
                        {m.description.slice(0,65)}{m.description.length>65?'…':''}
                      </td>
                      <td className="mono" style={{ fontSize:11 }}>{m.scopeAmount?fmt(m.scopeAmount):'–'}</td>
                      {allCols.map(col => {
                        const { amt, pct } = getVal(col, idx);
                        const isHL    = col.key === highlightCol;
                        const isCurRA = col.raNum === currentRA && !col.isSaved;
                        const isSaved = col.isSaved;
                        const hasVal  = viewMode==='amounts' ? amt>0 : pct>0;
                        const display = viewMode==='amounts' ? (amt?fmt(amt):'–') : (pct?pct.toFixed(1)+'%':'–');
                        const textColor = !hasVal ? '#d1d5db'
                          : isSaved  ? '#7c3aed'
                          : isCurRA  ? '#1a56b0'
                          : isHL     ? '#0e6d41'
                          : '#374151';
                        return (
                          <td key={col.key} className="mono" style={{
                            fontSize: isCurRA && hasVal ? 12 : 11,
                            color: textColor,
                            fontWeight: (isSaved || isCurRA || isHL) && hasVal ? 700 : 400,
                          }}>{display}</td>
                        );
                      })}
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <div style={{ width:40, height:4, background:'#e2e8f0', borderRadius:2 }}>
                            <div style={{ width:`${Math.min(cumPct,100)}%`, height:'100%', background:col, borderRadius:2 }}/>
                          </div>
                          <span style={{ fontSize:9, color:'#475569' }}>{cumPct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  </>
                );
              });
            })()}
          </tbody>
          <tfoot>
            <tr style={{ background:'#0f2044' }}>
              <td colSpan={2} className="left" style={{ color:'#fff', fontWeight:700, padding:'10px 12px', position:'sticky', left:0, background:'#0f2044', zIndex:2 }}>
                TOTAL INFRA
              </td>
              <td className="mono" style={{ color:'rgba(255,255,255,0.5)' }}>scope</td>
              {allCols.map(col => {
                const total   = colTotals[col.key] ?? 0;
                const isHL    = col.key === highlightCol;
                const isCurRA = col.raNum === currentRA && !col.isSaved;
                return (
                  <td key={col.key} className="mono" style={{
                    color: col.isSaved ? '#c4b5fd' : isCurRA ? '#93c5fd' : isHL ? '#86efac' : 'rgba(255,255,255,0.5)',
                    fontWeight: (col.isSaved||isCurRA||isHL) ? 700 : 400,
                    fontSize: (col.isSaved||isCurRA) ? 13 : 11,
                  }}>
                    {viewMode==='amounts' ? (total?fmt(total):'–') : '–'}
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{
        padding:'10px 16px', borderTop:'1px solid #d1d5db', background:'#f8fafc',
        display:'flex', gap:16, alignItems:'center', flexShrink:0, flexWrap:'wrap',
      }}>
        {allRAs.length > 0 && allRAs.map(ra => (
          <span key={ra.raNumber} style={{ fontSize:12, color:'#7c3aed' }}>
            RA-{ra.raNumber}: <strong style={{ fontFamily:'monospace' }}>₹ {fmt(ra.infraTotal)}</strong>
          </span>
        ))}
        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>
          Click column header to highlight · Toggle ₹/% above
        </span>
      </div>
    </div>
  );
}
