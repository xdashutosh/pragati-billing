'use client';

import { useMemo } from 'react';
import { billingMilestones, blockTotals } from '@/data/projectData';
import { fmt } from '@/lib/utils';
import { RABillData, BKEYS } from '@/lib/raStore';

const B_COLORS = ['#1e40af','#166534','#9a3412','#6b21a8'];
const B_BG     = ['#eff6ff','#f0fdf4','#fff7ed','#faf5ff'];
const B_MED    = ['#dbeafe','#dcfce7','#ffedd5','#f3e8ff'];
type BK = 'block1'|'block2'|'block3'|'block4';

interface Props { activeRA: RABillData | null; }

export default function BuildingPage({ activeRA }: Props) {
  const raNum = activeRA?.raNumber ?? 16;

  // For each milestone+block: this bill amount comes from activeRA if set, else from JSON baseline
  const getThis = (idx: number, bk: BK): number => {
    if (activeRA) return activeRA.building[idx]?.[bk]?.amt ?? 0;
    return billingMilestones[idx]?.[bk]?.thisAmt ?? 0;
  };

  const grouped: Record<string, number[]> = useMemo(() => {
    const m: Record<string, number[]> = {};
    billingMilestones.forEach((row, idx) => {
      if (!m[row.category]) m[row.category] = [];
      m[row.category].push(idx);
    });
    return m;
  }, []);

  // Grand totals per block
  const grandTotals = useMemo(() => BKEYS.map((_,i) => ({
    prevAmt: billingMilestones.reduce((s,m) => s + m[BKEYS[i]].prevAmt, 0),
    thisAmt: billingMilestones.reduce((s,_m,idx) => s + getThis(idx, BKEYS[i]), 0),
    cumAmt:  billingMilestones.reduce((s,m,idx) => s + m[BKEYS[i]].prevAmt + getThis(idx, BKEYS[i]), 0),
  })), [activeRA]);

  const grandThisTotal = grandTotals.reduce((s,t) => s + t.thisAmt, 0);

  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d5db', borderRadius:8,
      height:'100%', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{
        padding:'12px 16px', borderBottom:'1px solid #d1d5db',
        background:'#f8fafc', flexShrink:0,
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <div>
          <div style={{ fontWeight:600 }}>Building Milestones — RA-{raNum}</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
            {activeRA ? `Showing RA-${raNum} entered data` : 'Showing RA-16 baseline from JSON'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {BKEYS.map((k,i) => (
            <span key={k} style={{
              background:B_COLORS[i]+'20', color:B_COLORS[i],
              padding:'2px 10px', borderRadius:3, fontSize:10, fontWeight:700,
            }}>Block-{i+1} · ₹{(blockTotals[k]/1e7).toFixed(2)} Cr</span>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        <table className="data-table" style={{ minWidth:1400 }}>
          <thead>
            <tr>
              <th className="left" style={{ minWidth:300, position:'sticky', left:0, background:'#f8fafc', zIndex:2 }}>
                Milestone
              </th>
              {BKEYS.map((k,i) => (
                <th key={k} colSpan={3} style={{ background:B_MED[i], color:B_COLORS[i] }}>Block-{i+1}</th>
              ))}
            </tr>
            <tr>
              <th style={{ position:'sticky', left:0, background:'#f8fafc', zIndex:2 }}></th>
              {BKEYS.map((k,i) => [
                <th key={`${k}-p`} style={{ background:B_BG[i], width:130 }}>Prev Amt (₹)</th>,
                <th key={`${k}-t`} style={{ background:B_MED[i], color:B_COLORS[i], width:130 }}>RA-{raNum} This (₹)</th>,
                <th key={`${k}-c`} style={{ background:B_BG[i], width:130 }}>Cumulative (₹)</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, indices]) => {
              const catCol = cat.includes('Fire') ? '#b91c1c' : cat.includes('Elec') ? '#6b21a8' : cat.includes('Plumb') ? '#0e6d41' : '#1a56b0';
              return (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={13} style={{ background:catCol, color:'#fff', fontWeight:700, fontSize:11, padding:'7px 12px' }}>
                      {cat}
                    </td>
                  </tr>
                  {indices.map(idx => {
                    const m = billingMilestones[idx];
                    const hasThis = BKEYS.some(bk => getThis(idx, bk) > 0);
                    return (
                      <tr key={idx} style={{ background:hasThis?'#f0fdf4':undefined }}>
                        <td className="left" style={{
                          fontSize:11, position:'sticky', left:0, zIndex:1,
                          background:hasThis?'#f0fdf4':'#fff',
                        }}>
                          {m.description.slice(0,80)}{m.description.length>80?'…':''}
                        </td>
                        {BKEYS.map((bk,i) => {
                          const prev = m[bk].prevAmt;
                          const thisAmt = getThis(idx, bk);
                          const cum = prev + thisAmt;
                          const scope = m[bk].scope;
                          const cumPct = scope > 0 ? (cum/scope)*100 : 0;
                          return [
                            <td key={`${bk}-p`} className="mono" style={{ fontSize:11, color:'#94a3b8', background:B_BG[i] }}>
                              {prev ? fmt(prev) : '–'}
                            </td>,
                            <td key={`${bk}-t`} className="mono" style={{
                              fontSize:11, background:B_MED[i],
                              color:thisAmt>0?B_COLORS[i]:'#94a3b8', fontWeight:thisAmt>0?700:400,
                            }}>
                              {thisAmt ? fmt(thisAmt) : '–'}
                            </td>,
                            <td key={`${bk}-c`} style={{ background:B_BG[i], padding:'4px 8px' }}>
                              <div style={{ fontFamily:'monospace', fontSize:11 }}>{cum?fmt(cum):'–'}</div>
                              {scope>0 && <div style={{ height:3, background:'#e2e8f0', borderRadius:2, marginTop:2 }}>
                                <div style={{ width:`${Math.min(cumPct,100)}%`, height:'100%', background:B_COLORS[i], borderRadius:2 }}/>
                              </div>}
                            </td>,
                          ];
                        })}
                      </tr>
                    );
                  })}
                  {/* Category subtotal */}
                  {(() => {
                    const catT = BKEYS.map((bk,i) => ({
                      prev: indices.reduce((s,idx) => s + billingMilestones[idx][bk].prevAmt, 0),
                      this: indices.reduce((s,idx) => s + getThis(idx, bk), 0),
                    }));
                    return (
                      <tr key={`sub-${cat}`} style={{ background:'#f1f5f9' }}>
                        <td className="left" style={{ fontWeight:700, fontSize:11, paddingLeft:12, color:catCol, position:'sticky', left:0, background:'#f1f5f9', zIndex:1 }}>
                          Subtotal — {cat}
                        </td>
                        {catT.map((ct,i) => [
                          <td key={`${i}-p`} className="mono" style={{ fontWeight:600, fontSize:11, color:'#64748b', background:B_BG[i] }}>{fmt(ct.prev)}</td>,
                          <td key={`${i}-t`} className="mono" style={{ fontWeight:700, fontSize:11, color:B_COLORS[i], background:B_MED[i] }}>{fmt(ct.this)}</td>,
                          <td key={`${i}-c`} className="mono" style={{ fontWeight:600, fontSize:11, background:B_BG[i] }}>{fmt(ct.prev+ct.this)}</td>,
                        ])}
                      </tr>
                    );
                  })()}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#0f2044' }}>
              <td className="left" style={{ color:'#fff', fontWeight:700, padding:'10px 12px', position:'sticky', left:0, background:'#0f2044', zIndex:2 }}>
                TOTAL BUILDING — RA-{raNum}
              </td>
              {grandTotals.map((gt,i) => [
                <td key={`${i}-p`} className="mono" style={{ color:'rgba(255,255,255,0.55)' }}>{fmt(gt.prevAmt)}</td>,
                <td key={`${i}-t`} className="mono" style={{ color:'#86efac', fontWeight:700, fontSize:13 }}>{fmt(gt.thisAmt)}</td>,
                <td key={`${i}-c`} className="mono" style={{ color:'rgba(255,255,255,0.8)' }}>{fmt(gt.cumAmt)}</td>,
              ])}
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{
        padding:'10px 16px', borderTop:'1px solid #d1d5db', background:'#f8fafc',
        display:'flex', gap:16, alignItems:'center', flexShrink:0, flexWrap:'wrap',
      }}>
        {BKEYS.map((k,i) => (
          <span key={k} style={{ fontSize:12, color:'#475569' }}>
            Block-{i+1}:&nbsp;
            <strong style={{ fontFamily:'monospace', color:B_COLORS[i] }}>
              ₹ {fmt(grandTotals[i].thisAmt)}
            </strong>
          </span>
        ))}
        <span style={{ marginLeft:'auto', fontSize:12 }}>
          Total RA-{raNum}:&nbsp;
          <strong style={{ fontFamily:'monospace', color:'#0e6d41', fontSize:14 }}>₹ {fmt(grandThisTotal)}</strong>
        </span>
      </div>
    </div>
  );
}
