'use client';

import { useMemo } from 'react';
import { billingMilestones, blockTotals } from '@/data/projectData';
import { fmt } from '@/lib/utils';
import { RABillData, BKEYS } from '@/lib/raStore';

const B_COLORS = ['#1e40af','#166534','#9a3412','#6b21a8'];
const B_BG     = ['#eff6ff','#f0fdf4','#fff7ed','#faf5ff'];
const B_MED    = ['#dbeafe','#dcfce7','#ffedd5','#f3e8ff'];

interface Props { allRAs: RABillData[]; }

export default function RABuildingHistoryPage({ allRAs }: Props) {
  const grouped: Record<string,number[]> = useMemo(() => {
    const m: Record<string,number[]> = {};
    billingMilestones.forEach((row,idx) => {
      if (!m[row.category]) m[row.category] = [];
      m[row.category].push(idx);
    });
    return m;
  }, []);

  const grandTotals = useMemo(() => BKEYS.map((_,bi) => ({
    prevAmt: billingMilestones.reduce((s,m) => s + m[BKEYS[bi]].prevAmt, 0),
    ra16:    billingMilestones.reduce((s,m) => s + m[BKEYS[bi]].thisAmt, 0),
    ...Object.fromEntries(allRAs.map(ra => [
      `ra${ra.raNumber}`,
      billingMilestones.reduce((s,_,idx) => s + (ra.building[idx]?.[BKEYS[bi]]?.amt ?? 0), 0)
    ])),
  })), [allRAs]);

  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d5db', borderRadius:8,
      height:'100%', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #d1d5db', background:'#f8fafc', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#0f2044' }}>
              Building RA History
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
              Cumulative (all prev RAs) + RA-16 + {allRAs.length>0 ? allRAs.map(r=>`RA-${r.raNumber}`).join(', ') : 'no saved RAs yet'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {BKEYS.map((k,i) => (
              <div key={k} style={{
                background:B_BG[i], border:`1px solid ${B_COLORS[i]}30`,
                borderRadius:6, padding:'5px 10px', textAlign:'center',
              }}>
                <div style={{ fontSize:9, color:'#475569' }}>Block-{i+1} Scope</div>
                <div style={{ fontFamily:'monospace', fontWeight:700, color:B_COLORS[i], fontSize:11 }}>
                  ₹ {(blockTotals[k]/1e7).toFixed(2)} Cr
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block progress bars */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:10 }}>
          {BKEYS.map((k,i) => {
            const gt = grandTotals[i];
            const ra16 = gt.ra16 as number;
            const prevAmt = gt.prevAmt as number;
            const savedTotal = allRAs.reduce((s,ra) => s + ((gt as any)[`ra${ra.raNumber}`] as number || 0), 0);
            const cumAmt = prevAmt + ra16 + savedTotal;
            const scope = blockTotals[k];
            const cumPct = scope ? (cumAmt/scope)*100 : 0;
            return (
              <div key={k} style={{ background:B_BG[i], border:`1px solid ${B_COLORS[i]}20`, borderRadius:6, padding:'8px 10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:B_COLORS[i] }}>Block-{i+1}</span>
                  <span style={{ fontSize:10, color:'#475569' }}>{cumPct.toFixed(1)}% cum</span>
                </div>
                <div style={{ height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ display:'flex', height:'100%' }}>
                    <div style={{ width:`${Math.min((prevAmt/scope)*100,100)}%`, background:B_COLORS[i]+'50' }}/>
                    <div style={{ width:`${Math.min((ra16/scope)*100,100)}%`, background:B_COLORS[i]+'90' }}/>
                    {allRAs.map(ra => {
                      const amt = (gt as any)[`ra${ra.raNumber}`] as number || 0;
                      return <div key={ra.raNumber} style={{ width:`${Math.min((amt/scope)*100,100)}%`, background:B_COLORS[i] }}/>;
                    })}
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, flexWrap:'wrap', gap:2 }}>
                  <span style={{ fontSize:9, color:'#94a3b8' }}>Prev: ₹{(prevAmt/1e7).toFixed(2)}Cr</span>
                  <span style={{ fontSize:9, color:B_COLORS[i], fontWeight:700 }}>RA-16: ₹{(ra16/1e7).toFixed(2)}Cr</span>
                  {allRAs.map(ra => {
                    const amt = (gt as any)[`ra${ra.raNumber}`] as number || 0;
                    return amt > 0 ? <span key={ra.raNumber} style={{ fontSize:9, color:'#7c3aed', fontWeight:700 }}>RA-{ra.raNumber}: ₹{(amt/1e7).toFixed(2)}Cr</span> : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        <table className="data-table" style={{ minWidth:1200 + allRAs.length*400 }}>
          <thead>
            <tr>
              <th className="left" style={{ minWidth:300, position:'sticky', left:0, background:'#f8fafc', zIndex:2 }}>
                Milestone
              </th>
              {BKEYS.map((k,i) => (
                <th key={k} colSpan={2 + allRAs.length} style={{ background:B_MED[i], color:B_COLORS[i] }}>
                  Block-{i+1}
                </th>
              ))}
            </tr>
            <tr>
              <th style={{ position:'sticky', left:0, background:'#f8fafc', zIndex:2 }}></th>
              {BKEYS.map((k,i) => [
                <th key={`${k}-prev`} style={{ background:B_BG[i], width:130 }}>Prev Cum (₹)</th>,
                <th key={`${k}-16`}   style={{ background:B_MED[i], color:B_COLORS[i], width:130 }}>RA-16 (₹)</th>,
                ...allRAs.map(ra => (
                  <th key={`${k}-${ra.raNumber}`} style={{ background:'#ede9fe', color:'#7c3aed', width:130 }}>
                    RA-{ra.raNumber} ✓
                  </th>
                )),
              ])}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, indices]) => {
              const catCol = cat.includes('Fire')?'#b91c1c':cat.includes('Elec')?'#6b21a8':cat.includes('Plumb')?'#0e6d41':'#1a56b0';
              return (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={1 + BKEYS.length*(2+allRAs.length)} style={{ background:catCol, color:'#fff', fontWeight:700, fontSize:11, padding:'7px 12px' }}>
                      {cat}
                    </td>
                  </tr>
                  {indices.map(idx => {
                    const m = billingMilestones[idx];
                    const hasNewRA = allRAs.some(ra => BKEYS.some(bk => (ra.building[idx]?.[bk]?.amt ?? 0) > 0));
                    return (
                      <tr key={idx} style={{ background:hasNewRA?'#faf5ff':undefined }}>
                        <td className="left" style={{
                          fontSize:11, position:'sticky', left:0, zIndex:1,
                          background:hasNewRA?'#faf5ff':'#fff',
                        }}>
                          {m.description.slice(0,75)}{m.description.length>75?'…':''}
                        </td>
                        {BKEYS.map((bk,i) => {
                          const prev  = m[bk].prevAmt;
                          const ra16  = m[bk].thisAmt;
                          const scope = m[bk].scope;
                          return [
                            <td key={`${bk}-prev`} className="mono" style={{ fontSize:11, color:'#94a3b8', background:B_BG[i] }}>
                              {prev?fmt(prev):'–'}
                            </td>,
                            <td key={`${bk}-16`} className="mono" style={{
                              fontSize:11, background:B_MED[i],
                              color:ra16>0?B_COLORS[i]:'#94a3b8', fontWeight:ra16>0?700:400,
                            }}>
                              {ra16?fmt(ra16):'–'}
                            </td>,
                            ...allRAs.map(ra => {
                              const amt = ra.building[idx]?.[bk]?.amt ?? 0;
                              return (
                                <td key={`${bk}-${ra.raNumber}`} className="mono" style={{
                                  fontSize:11, background:'#ede9fe',
                                  color:amt>0?'#7c3aed':'#d4d4d4', fontWeight:amt>0?700:400,
                                }}>
                                  {amt?fmt(amt):'–'}
                                </td>
                              );
                            }),
                          ];
                        })}
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#0f2044' }}>
              <td className="left" style={{ color:'#fff', fontWeight:700, padding:'10px 12px', position:'sticky', left:0, background:'#0f2044', zIndex:2 }}>
                TOTAL ALL BUILDING
              </td>
              {grandTotals.map((gt,i) => [
                <td key={`${i}-prev`} className="mono" style={{ color:'rgba(255,255,255,0.5)' }}>{fmt(gt.prevAmt as number)}</td>,
                <td key={`${i}-16`}   className="mono" style={{ color:'#86efac', fontWeight:700 }}>{fmt(gt.ra16 as number)}</td>,
                ...allRAs.map(ra => (
                  <td key={`${i}-${ra.raNumber}`} className="mono" style={{ color:'#c4b5fd', fontWeight:700 }}>
                    {fmt((gt as any)[`ra${ra.raNumber}`] as number || 0)}
                  </td>
                )),
              ])}
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{
        padding:'10px 16px', borderTop:'1px solid #d1d5db', background:'#f8fafc',
        display:'flex', gap:16, alignItems:'center', flexShrink:0, flexWrap:'wrap',
      }}>
        {allRAs.length === 0 && (
          <span style={{ fontSize:12, color:'#94a3b8' }}>
            No saved RA bills yet — go to New RA Entry to add RA-17+
          </span>
        )}
        {allRAs.map(ra => (
          <span key={ra.raNumber} style={{ fontSize:12, color:'#7c3aed' }}>
            RA-{ra.raNumber}: <strong style={{ fontFamily:'monospace' }}>₹ {fmt(ra.buildingTotal)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
