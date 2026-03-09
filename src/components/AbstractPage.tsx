'use client';

import { useMemo, Fragment, useState, useEffect } from 'react';
import { fmt, fmtCr } from '@/lib/utils';
import KpiCard from './KpiCard';
import PctBar from './PctBar';
import { useVendor } from '@/lib/VendorContext';
import { RABillData, loadAllRAs } from '@/lib/raStore';

interface Props { activeRA: RABillData | null; }

export default function AbstractPage({ activeRA }: Props) {
  const { allRAs, billingSummaryItems, billingSummaryTotals, currentRA, getRATotals, boqs: projectBOQs, id: projectId } = useVendor();

  const historyCols = useMemo(() => {
    const list: { raNum: number, label: string }[] = [];
    const sorted = [...allRAs].sort((a, b) => a.raNumber - b.raNumber);
    sorted.forEach(r => {
      if (r.raNumber > 0) {
        list.push({ raNum: r.raNumber, label: `RA-${r.raNumber}` });
      }
    });
    return list;
  }, [allRAs]);


  console.log('AbstractPage: historyCols:', historyCols.map(c => c.label));

  const raNum = activeRA?.raNumber ?? currentRA;
  const totals = getRATotals(raNum);
  const base = billingSummaryTotals;

  const latestRANum = useMemo(() => {
    if (allRAs.length === 0) return 0;
    return Math.max(...allRAs.map(r => r.raNumber));
  }, [allRAs]);

  const latestTotals = getRATotals(latestRANum);

  const dynamicRows = useMemo(() => {
    const list: any[] = [];

    projectBOQs.forEach((boq, idx) => {
      let bTotals;
      let label = boq.name;
      let color = '#7c3aed';

      if (boq.id === 'boq-bldg-legacy') {
        bTotals = totals.bldg;
        label = 'Block Work (Building Civil, Electrical, Fire, Plumbing)';
        color = '#1a56b0';
      } else if (boq.id === 'boq-infra-legacy') {
        bTotals = totals.infra;
        label = 'Infra Work, Ancillary Buildings & Design Charges';
        color = '#1a56b0';
      } else {
        bTotals = totals.boqs[boq.id] || { prev: 0, this: 0, cum: 0 };
      }

      // Rollup history
      const history: Record<number, number> = {};
      historyCols.forEach(col => {
        if (col.raNum === 0) {
          history[0] = 0;
        } else {
          const hTotals = getRATotals(col.raNum);
          let val = 0;
          if (boq.id === 'boq-bldg-legacy') val = hTotals.bldg.this;
          else if (boq.id === 'boq-infra-legacy') val = hTotals.infra.this;
          else val = hTotals.boqs[boq.id]?.this || 0;
          history[col.raNum] = val;
        }
      });

      list.push({
        sno: String.fromCharCode(65 + idx), // A, B, C...
        label,
        order: boq.items.reduce((s, i) => s + i.amount, 0),
        prev: bTotals.prev,
        this: bTotals.this,
        cum: bTotals.cum,
        totalCum: Object.values(history).reduce((s, v) => s + (v || 0), 0),
        color, cls: '',
        history,
      });
    });

    // 4. Grand Total
    const totalOrder = list.reduce((s: number, r: any) => s + r.order, 0);
    const histTotals: Record<number, number> = {};
    historyCols.forEach(col => {
      histTotals[col.raNum] = list.reduce((s, r) => s + (r.history[col.raNum] || 0), 0);
    });

    list.push({
      sno: 'T',
      label: 'GRAND TOTAL',
      order: totalOrder,
      cum: histTotals[raNum] || 0,
      totalCum: Object.values(histTotals).reduce((s, v) => s + (v || 0), 0),
      color: '#0f2044', cls: 'row-sub',
      history: histTotals,
    });

    return list;
  }, [projectBOQs, totals, historyCols, getRATotals, raNum]);

  const thisTotal = dynamicRows.find((r: any) => r.sno === 'T')?.this || 0;
  // Total progress is the cumulative of the latest RA
  const cumTotal = dynamicRows.find((r: any) => r.sno === 'T')?.totalCum || 0;

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
              Viewing RA-{activeRA.raNumber} — Saved {new Date(activeRA.savedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 1, display: 'flex', flexWrap: 'wrap', gap: '0 8px' }}>
              {dynamicRows.filter(r => r.sno !== 'T').map(r => (
                <span key={r.sno}>{r.label.split('(')[0].trim()}: ₹ {fmt(r.cum)} &nbsp;·</span>
              ))}
              <span style={{ fontWeight: 700 }}>Total: ₹ {fmt(cumTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flexShrink: 0 }}>
        <KpiCard label="Total Order Value" value={fmtCr(base.orderAmount)} sub={`₹ ${fmt(base.orderAmount)}`} color="navy" />
        <KpiCard label="Previous Bills" value={fmtCr(base.prevBillAmount)} sub={`₹ ${fmt(base.prevBillAmount)}`} color="navy" />
        <KpiCard label={`This Bill (${activeRA?.label || 'RA-' + raNum})`} value={fmtCr(thisTotal)} sub={`₹ ${fmt(thisTotal)}`} color="green" />
        <KpiCard label="Cumulative Billed (Project)" value={fmtCr(cumTotal)} sub={`₹ ${fmt(cumTotal)}`} color="blue" />
      </div>

      {/* Summary table */}
      <div style={{
        background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1d5db', background: '#f8fafc', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2044' }}>
            Project Bill Summary History
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Showing cumulative project billing history across all RAs
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: 600 + (historyCols.length * 120) }}>
            <thead>
              <tr>
                <th className="left" style={{ width: 44 }}>Ref</th>
                <th className="left" style={{ minWidth: 320 }}>Description</th>
                <th style={{ width: 140 }}>Order Amount (₹)</th>
                {historyCols.map(col => (
                  <th key={col.raNum} style={{
                    width: 120,
                    background: col.raNum === raNum ? '#eef4ff' : '#f8fafc',
                    color: col.raNum === raNum ? '#1a56b0' : '#64748b'
                  }}>
                    {col.label} (₹)
                  </th>
                ))}
                <th style={{ width: 110 }}>% Complete</th>
              </tr>
            </thead>
            <tbody>
              {dynamicRows.map((r: any, i: number) => (
                <tr key={i} className={r.cls}>
                  <td className="sno">{r.sno}</td>
                  <td className="left">{r.label}</td>
                  <td className="mono">{fmt(r.order)}</td>
                  {historyCols.map(col => {
                    const val = r.history[col.raNum] || 0;
                    return (
                      <td key={col.raNum} className="mono" style={{
                        background: col.raNum === raNum ? '#f0f7ff' : undefined,
                        color: val > 0 ? (col.raNum === raNum ? '#1a56b0' : '#0f2044') : '#cbd5e1',
                        fontWeight: val > 0 ? 600 : 400
                      }}>
                        {val ? fmt(val) : '–'}
                      </td>
                    );
                  })}
                  <td>{r.order > 0 ? <PctBar pct={(r.totalCum / r.order) * 100} color={r.color === '#fff' ? '#86efac' : r.color} /> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detailed Category Breakdown */}
        <div style={{ borderTop: '1px solid #d1d5db', flexShrink: 0 }}>
          <div style={{ padding: '8px 16px', background: '#f8fafc', fontWeight: 600, fontSize: 12, color: '#0f2044' }}>
            Detailed Category Breakdown (Project History)
          </div>
          <div style={{ overflow: 'auto', maxHeight: 350 }}>
            <table className="data-table" style={{ minWidth: 600 + (historyCols.length * 120) }}>
              <thead>
                <tr>
                  <th className="left" style={{ width: 44 }}>Ref</th>
                  <th className="left" style={{ minWidth: 280 }}>Description</th>
                  <th style={{ width: 140 }}>Order Amount (₹)</th>
                  {historyCols.map(col => (
                    <th key={col.raNum} style={{
                      width: 120,
                      background: col.raNum === raNum ? '#eef4ff' : '#f8fafc',
                      color: col.raNum === raNum ? '#1a56b0' : '#64748b'
                    }}>
                      {col.label} (₹)
                    </th>
                  ))}
                  <th style={{ width: 100 }}>% Billed</th>
                </tr>
              </thead>
              <tbody>
                {projectBOQs.map((boq, bidx) => {
                  const sections = Array.from(new Set(boq.items.map(it => it.section || 'General').filter(Boolean)));
                  const boqRef = String.fromCharCode(65 + bidx);

                  return (
                    <Fragment key={boq.id}>
                      <tr style={{ background: '#f1f5f9' }}>
                        <td style={{ fontWeight: 800 }}>{boqRef}</td>
                        <td className="left" style={{ fontWeight: 800 }}>{boq.name.toUpperCase()}</td>
                        <td colSpan={historyCols.length + 2}></td>
                      </tr>
                      {sections.map((sec, sidx) => {
                        const secItems = boq.items.filter(it => (it.section || 'General') === sec);
                        const secOrder = secItems.reduce((s, i) => s + i.amount, 0);

                        // Rollup history for this section
                        const secHistory: Record<number, number> = {};
                        historyCols.forEach(col => {
                          if (col.raNum === 0) {
                            secHistory[0] = 0;
                          } else {
                            const hRA = allRAs.find(r => r.raNumber === col.raNum);
                            let sum = 0;
                            secItems.forEach(it => {
                              const actualIdx = boq.items.indexOf(it);
                              const entry = hRA?.boqEntries?.[boq.id]?.[actualIdx];
                              sum += entry?.amt || 0;
                            });
                            secHistory[col.raNum] = sum;
                          }
                        });

                        const secCum = secHistory[raNum] || 0;

                        return (
                          <tr key={`${boq.id}-${sec}`} style={{ background: '#fff' }}>
                            <td className="sno" style={{ fontSize: 10, color: '#64748b' }}>{boqRef}.{sidx + 1}</td>
                            <td className="left" style={{ paddingLeft: 20, fontWeight: 600 }}>{sec}</td>
                            <td className="mono">{fmt(secOrder)}</td>
                            {historyCols.map(col => {
                              const val = secHistory[col.raNum] || 0;
                              return (
                                <td key={col.raNum} className="mono" style={{
                                  background: col.raNum === raNum ? '#f0f7ff' : undefined,
                                  color: val > 0 ? (col.raNum === raNum ? '#1a56b0' : '#0f2044') : '#cbd5e1',
                                  fontWeight: val > 0 ? 600 : 400
                                }}>
                                  {val ? fmt(val) : '–'}
                                </td>
                              );
                            })}
                            <td>{(() => {
                              if (secOrder <= 0) return '–';
                              const totalSecCum = Object.values(secHistory).reduce((s, v) => s + v, 0);
                              return <PctBar pct={(totalSecCum / secOrder) * 100} />;
                            })()}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          padding: '10px 16px', borderTop: '1px solid #d1d5db', background: '#f8fafc',
          display: 'flex', justifyContent: 'flex-end', gap: 24, alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            Previous: <strong style={{ fontFamily: 'monospace', color: '#0f2044' }}>₹ {fmt(base.prevBillAmount)}</strong>
          </span>
          <span style={{ fontSize: 12, color: '#475569' }}>
            This Bill: <strong style={{ fontFamily: 'monospace', color: '#1a56b0' }}>₹ {fmt(thisTotal)}</strong>
          </span>
          <span style={{ fontSize: 12, color: '#475569' }}>
            Cumulative: <strong style={{ fontFamily: 'monospace', color: '#0e6d41', fontSize: 15 }}>₹ {fmt(cumTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
