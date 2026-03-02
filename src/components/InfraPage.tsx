'use client';

import { useMemo } from 'react';
import { useVendor } from '@/lib/VendorContext';
import { fmt } from '@/lib/utils';
import { RABillData } from '@/lib/raStore';

const CAT_COLORS: Record<string,string> = {
  'Infra Civil Works':                  '#1a56b0',
  'External Electrical Works':          '#6b21a8',
  'External Fire Works':                '#b91c1c',
  'Consultant Fees for Complete Park':  '#0e6d41',
  'Alteration Item':                    '#92400e',
};

interface Props { activeRA: RABillData | null; }

export default function InfraPage({ activeRA }: Props) {
  const { infraBillingMilestones, currentRA } = useVendor();
  const raNum = activeRA?.raNumber ?? currentRA;

  const getThis = (idx: number): number => {
    if (activeRA) return activeRA.infra[idx]?.amt ?? 0;
    return infraBillingMilestones[idx]?.thisAmt ?? 0;
  };
  const getThisPct = (idx: number): number => {
    if (activeRA) return activeRA.infra[idx]?.pct ?? 0;
    return (infraBillingMilestones[idx]?.thisPct ?? 0) * 100;
  };

  const grouped: Record<string,number[]> = useMemo(() => {
    const m: Record<string,number[]> = {};
    infraBillingMilestones.forEach((row,idx) => {
      const cat = row.category || 'Infra Civil Works';
      if (!m[cat]) m[cat] = [];
      m[cat].push(idx);
    });
    return m;
  }, []);

  const totals = useMemo(() => ({
    scope:   infraBillingMilestones.reduce((s,m) => s + m.scopeAmount, 0),
    prevAmt: infraBillingMilestones.reduce((s,m) => s + m.prevAmt, 0),
    thisAmt: infraBillingMilestones.reduce((s,_,idx) => s + getThis(idx), 0),
    cumAmt:  infraBillingMilestones.reduce((s,m,idx) => s + m.prevAmt + getThis(idx), 0),
  }), [activeRA]);

  return (
    <div style={{
      background:'#fff', border:'1px solid #d1d5db', borderRadius:8,
      height:'100%', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #d1d5db', background:'#f8fafc', flexShrink:0 }}>
        <div style={{ fontWeight:600 }}>Infra Milestones — RA-{raNum}</div>
        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
          {activeRA ? `Showing RA-${raNum} entered data` : `Showing RA-${currentRA} baseline`}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        <table className="data-table" style={{ minWidth:1000 }}>
          <thead>
            <tr>
              <th className="left" style={{ width:44 }}>#</th>
              <th className="left" style={{ minWidth:340 }}>Milestone</th>
              <th style={{ width:140 }}>Scope (₹)</th>
              <th style={{ width:80 }}>Prev %</th>
              <th style={{ width:140 }}>Prev Amt (₹)</th>
              <th style={{ width:80, background:'#eef4ff', color:'#1a56b0' }}>RA-{raNum} %</th>
              <th style={{ width:140, background:'#eef4ff', color:'#1a56b0' }}>RA-{raNum} Amt (₹)</th>
              <th style={{ width:80 }}>Cum %</th>
              <th style={{ width:140 }}>Cumulative (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, indices]) => {
              const col = CAT_COLORS[cat] || '#1a56b0';
              const catThisTotal = indices.reduce((s,idx) => s + getThis(idx), 0);
              return (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={9} style={{ background:col, color:'#fff', fontWeight:700, fontSize:11, padding:'7px 12px' }}>
                      {cat}
                    </td>
                  </tr>
                  {indices.map(idx => {
                    const m = infraBillingMilestones[idx];
                    const thisAmt = getThis(idx);
                    const thisPct = getThisPct(idx);
                    const cumAmt = m.prevAmt + thisAmt;
                    const cumPct = m.scopeAmount > 0 ? (cumAmt/m.scopeAmount)*100 : 0;
                    return (
                      <tr key={idx} style={{ background:thisAmt>0?'#f0fdf4':undefined }}>
                        <td className="sno">{m.sno}</td>
                        <td className="left" style={{ fontSize:11 }}>
                          <div>{m.description.slice(0,72)}{m.description.length>72?'…':''}</div>
                          <div style={{ height:3, background:'#e2e8f0', borderRadius:2, width:150, marginTop:3, overflow:'hidden' }}>
                            <div style={{ display:'flex', height:'100%' }}>
                              <div style={{ width:`${Math.min(m.prevPct*100,100)}%`, background:col+'60' }}/>
                              <div style={{ width:`${Math.min(thisPct,100)}%`, background:col }}/>
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize:11 }}>{m.scopeAmount?fmt(m.scopeAmount):'–'}</td>
                        <td style={{ fontSize:11, color:'#64748b' }}>{(m.prevPct*100).toFixed(1)}%</td>
                        <td className="mono" style={{ fontSize:11, color:'#94a3b8' }}>{m.prevAmt?fmt(m.prevAmt):'–'}</td>
                        <td style={{ fontSize:11, color:col, fontWeight:thisAmt>0?700:400, background:'#eef4ff' }}>
                          {thisPct>0 ? thisPct.toFixed(1)+'%' : '–'}
                        </td>
                        <td className="mono" style={{ fontSize:11, color:thisAmt>0?col:'#94a3b8', fontWeight:thisAmt>0?700:400, background:'#eef4ff' }}>
                          {thisAmt?fmt(thisAmt):'–'}
                        </td>
                        <td style={{ fontSize:11 }}>{cumPct.toFixed(1)}%</td>
                        <td className="mono" style={{ fontSize:11 }}>{cumAmt?fmt(cumAmt):'–'}</td>
                      </tr>
                    );
                  })}
                  <tr key={`sub-${cat}`} style={{ background:col+'12' }}>
                    <td colSpan={5} className="left" style={{ fontWeight:700, fontSize:11, paddingLeft:12, color:col }}>
                      Subtotal — {cat}
                    </td>
                    <td></td>
                    <td className="mono" style={{ fontWeight:700, color:col }}>{catThisTotal?fmt(catThisTotal):'–'}</td>
                    <td colSpan={2}></td>
                  </tr>
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#0f2044' }}>
              <td colSpan={4} className="left" style={{ color:'#fff', fontWeight:700, padding:'10px 12px' }}>
                TOTAL INFRA — RA-{raNum}
              </td>
              <td className="mono" style={{ color:'rgba(255,255,255,0.55)' }}>{fmt(totals.prevAmt)}</td>
              <td></td>
              <td className="mono" style={{ color:'#86efac', fontWeight:700, fontSize:13 }}>{fmt(totals.thisAmt)}</td>
              <td></td>
              <td className="mono" style={{ color:'rgba(255,255,255,0.8)' }}>{fmt(totals.cumAmt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{
        padding:'10px 16px', borderTop:'1px solid #d1d5db', background:'#f8fafc',
        display:'flex', gap:24, alignItems:'center', flexShrink:0,
      }}>
        <span style={{ fontSize:12, color:'#475569' }}>
          Prev: <strong style={{ fontFamily:'monospace', color:'#0f2044' }}>₹ {fmt(totals.prevAmt)}</strong>
        </span>
        <span style={{ fontSize:12, color:'#475569' }}>
          RA-{raNum}: <strong style={{ fontFamily:'monospace', color:'#1a56b0' }}>₹ {fmt(totals.thisAmt)}</strong>
        </span>
        <span style={{ fontSize:12, color:'#475569' }}>
          Cumulative: <strong style={{ fontFamily:'monospace', color:'#0e6d41', fontSize:14 }}>₹ {fmt(totals.cumAmt)}</strong>
        </span>
      </div>
    </div>
  );
}
