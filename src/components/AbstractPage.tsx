'use client';

import { fmt, fmtCr } from '@/lib/utils';
import KpiCard from './KpiCard';
import { billingSummaryItems, billingSummaryTotals, billingMilestones, infraBillingMilestones } from '@/data/projectData';
import { RABillData, BKEYS } from '@/lib/raStore';

interface Props { activeRA: RABillData | null; }

function PctBar({ pct, color = '#1a56b0' }: { pct: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 3 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function AbstractPage({ activeRA }: Props) {
  const base = billingSummaryTotals;
  const raNum = activeRA?.raNumber ?? 16;

  // If viewing a saved RA, compute this-bill from its entries
  const getRABldgTotal = () => {
    if (!activeRA) return base.thisBillAmount;
    return Object.entries(activeRA.building).reduce((sum, [idxStr, blocks]) =>
      sum + BKEYS.reduce((s,k) => s + (blocks[k]?.amt||0), 0), 0);
  };
  const getRAInfraTotal = () => {
    if (!activeRA) return 0; // infra already included in thisBillAmount for RA-16
    return Object.values(activeRA.infra).reduce((s,v) => s + (v?.amt||0), 0);
  };

  const thisBldg  = getRABldgTotal();
  const thisInfra = getRAInfraTotal();
  const thisTotal = activeRA ? activeRA.grandTotal : base.thisBillAmount;
  const cumTotal  = activeRA
    ? base.cumulativeAmount + activeRA.grandTotal
    : base.cumulativeAmount;

  const rows = [
    {
      sno:'A', label:'Block Work (Building Civil, Electrical, Fire, Plumbing)',
      order: base.orderAmount * 0.597, // approx block proportion
      prev:  base.prevBillAmount * 0.55,
      this:  thisBldg,
      cum:   base.cumulativeAmount * 0.55 + (activeRA ? thisBldg : 0),
      color:'#1a56b0', cls:'',
    },
    {
      sno:'B', label:'Infra Work, Ancillary Buildings & Design Charges',
      order: base.orderAmount * 0.403,
      prev:  base.prevBillAmount * 0.45,
      this:  thisInfra || (activeRA ? 0 : base.thisBillAmount - thisBldg),
      cum:   base.cumulativeAmount * 0.45 + (activeRA ? thisInfra : 0),
      color:'#1a56b0', cls:'',
    },
    {
      sno:'I', label:'SUB TOTAL (A+B)',
      order: base.orderAmount,
      prev:  base.prevBillAmount,
      this:  thisTotal,
      cum:   cumTotal,
      color:'#0f2044', cls:'row-sub',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>

      {/* RA notice banner */}
      {activeRA && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>
              Viewing RA-{activeRA.raNumber} — Saved {new Date(activeRA.savedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1 }}>
              Building: ₹ {fmt(activeRA.buildingTotal)} &nbsp;·&nbsp;
              Infra: ₹ {fmt(activeRA.infraTotal)} &nbsp;·&nbsp;
              Total: ₹ {fmt(activeRA.grandTotal)}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flexShrink: 0 }}>
        <KpiCard label="Total Order Value"   value={fmtCr(base.orderAmount)}  sub={`₹ ${fmt(base.orderAmount)}`}  color="navy" />
        <KpiCard label="Previous Bills"      value={fmtCr(base.prevBillAmount)} sub={`₹ ${fmt(base.prevBillAmount)}`} color="navy" />
        <KpiCard label={`This Bill (RA-${raNum})`} value={fmtCr(thisTotal)} sub={`₹ ${fmt(thisTotal)}`} color="green" />
        <KpiCard label="Cumulative Billed"   value={fmtCr(cumTotal)} sub={`₹ ${fmt(cumTotal)}`} color="blue" />
      </div>

      {/* Summary table */}
      <div style={{
        background:'#fff', border:'1px solid #d1d5db', borderRadius:8,
        flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #d1d5db', background:'#f8fafc', flexShrink:0 }}>
          <div style={{ fontWeight:600 }}>Bill Summary — RA-{raNum}</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
            {activeRA ? `RA-${activeRA.raNumber} entered manually — amounts from saved entry` : 'Figures from billing_lpw.json (RA-16 baseline)'}
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="left" style={{ width:44 }}>Ref</th>
                <th className="left" style={{ minWidth:320 }}>Description</th>
                <th style={{ width:150 }}>Order Amount (₹)</th>
                <th style={{ width:150 }}>Previous Bills (₹)</th>
                <th style={{ width:150, background:'#eef4ff', color:'#1a56b0' }}>This Bill RA-{raNum} (₹)</th>
                <th style={{ width:150 }}>Cumulative (₹)</th>
                <th style={{ width:110 }}>% Complete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} className={r.cls}>
                  <td className="sno">{r.sno}</td>
                  <td className="left">{r.label}</td>
                  <td className="mono">{fmt(r.order)}</td>
                  <td className="mono">{fmt(r.prev)}</td>
                  <td className="mono" style={{ color:'#1a56b0', fontWeight:600 }}>{fmt(r.this)}</td>
                  <td className="mono" style={{ fontWeight:600 }}>{fmt(r.cum)}</td>
                  <td>{r.order>0 ? <PctBar pct={(r.cum/r.order)*100} color={r.color==='#fff'?'#86efac':r.color} /> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Line item breakdown — always shows RA-16 baseline */}
        <div style={{ borderTop:'1px solid #d1d5db', flexShrink:0 }}>
          <div style={{ padding:'8px 16px', background:'#f8fafc', fontWeight:600, fontSize:12, color:'#0f2044' }}>
            Line-item Breakdown (RA-16 Baseline)
          </div>
          <div style={{ overflow:'auto', maxHeight:260 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="left" style={{ width:44 }}>S.No</th>
                  <th className="left" style={{ minWidth:280 }}>Description</th>
                  <th style={{ width:150 }}>Order Amount (₹)</th>
                  <th style={{ width:150 }}>Previous Bills (₹)</th>
                  <th style={{ width:150, background:'#eef4ff', color:'#1a56b0' }}>This Bill (₹)</th>
                  <th style={{ width:150 }}>Cumulative (₹)</th>
                  <th style={{ width:100 }}>% Billed</th>
                </tr>
              </thead>
              <tbody>
                {billingSummaryItems.map(item => (
                  <>
                    <tr key={item.sno} style={{ background:'#f8fafc' }}>
                      <td className="sno" style={{ fontWeight:700, color:'#0f2044' }}>{item.sno}</td>
                      <td className="left" style={{ fontWeight:600 }}>{item.description}</td>
                      <td className="mono" style={{ fontWeight:600 }}>{fmt(item.orderAmount)}</td>
                      <td className="mono" style={{ color:'#64748b' }}>{fmt(item.prevBillAmount)}</td>
                      <td className="mono" style={{ color:'#1a56b0', fontWeight:600 }}>{fmt(item.thisBillAmount)}</td>
                      <td className="mono">{fmt(item.cumulativeAmount)}</td>
                      <td>{item.orderAmount>0 ? <PctBar pct={(item.cumulativeAmount/item.orderAmount)*100}/> : '–'}</td>
                    </tr>
                    {item.subItems.map((sub,si) => (
                      <tr key={`${item.sno}-${si}`} style={{ background:'#f1f5f9' }}>
                        <td className="sno" style={{ color:'#94a3b8', fontSize:10 }}>↳</td>
                        <td className="left" style={{ paddingLeft:24, fontSize:11, color:'#475569' }}>{sub.description}</td>
                        <td className="mono" style={{ fontSize:11 }}>{fmt(sub.orderAmount)}</td>
                        <td className="mono" style={{ fontSize:11, color:'#94a3b8' }}>{fmt(sub.prevBillAmount)}</td>
                        <td className="mono" style={{ fontSize:11, color:'#1a56b0' }}>{fmt(sub.thisBillAmount)}</td>
                        <td className="mono" style={{ fontSize:11 }}>{fmt(sub.cumulativeAmount)}</td>
                        <td>{sub.orderAmount>0 ? <PctBar pct={(sub.cumulativeAmount/sub.orderAmount)*100}/> : '–'}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          padding:'10px 16px', borderTop:'1px solid #d1d5db', background:'#f8fafc',
          display:'flex', justifyContent:'flex-end', gap:24, alignItems:'center', flexShrink:0,
        }}>
          <span style={{ fontSize:12, color:'#475569' }}>
            Previous: <strong style={{ fontFamily:'monospace', color:'#0f2044' }}>₹ {fmt(base.prevBillAmount)}</strong>
          </span>
          <span style={{ fontSize:12, color:'#475569' }}>
            This Bill: <strong style={{ fontFamily:'monospace', color:'#1a56b0' }}>₹ {fmt(thisTotal)}</strong>
          </span>
          <span style={{ fontSize:12, color:'#475569' }}>
            Cumulative: <strong style={{ fontFamily:'monospace', color:'#0e6d41', fontSize:15 }}>₹ {fmt(cumTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
