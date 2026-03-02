'use client';

import { useState, useEffect, useCallback } from 'react';
import { billingMilestones, infraBillingMilestones } from '@/data/projectData';
import { fmt } from '@/lib/utils';
import {
  RABillData, BuildingMilestoneEntry, InfraMilestoneEntry,
  BK, BKEYS, loadRA, saveRA, deleteRA, getSavedRANumbers,
} from '@/lib/raStore';

type TabType = 'building' | 'infra';

const B_COLORS = ['#1e40af', '#166534', '#9a3412', '#6b21a8'];
const B_BG = ['#eff6ff', '#f0fdf4', '#fff7ed', '#faf5ff'];
const B_MED = ['#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff'];

const CAT_COLORS: Record<string, string> = {
  'Building Civil Works': '#1a56b0',
  'Internal Fire Works': '#b91c1c',
  'Internal Electrical Fighting Works': '#6b21a8',
  'Internal Plumbing Works': '#0e6d41',
  'Infra Civil Works': '#1a56b0',
  'External Electrical Works': '#6b21a8',
  'External Fire Works': '#b91c1c',
  'Consultant Fees for Complete Park': '#0e6d41',
  'Alteration Item': '#92400e',
};

function pctFromAmt(amt: number, scope: number) {
  return scope > 0 ? (amt / scope) * 100 : 0;
}
function amtFromPct(pct: number, scope: number) {
  return (pct / 100) * scope;
}
function emptyBlock(): BuildingMilestoneEntry {
  return { block1: { pct: 0, amt: 0 }, block2: { pct: 0, amt: 0 }, block3: { pct: 0, amt: 0 }, block4: { pct: 0, amt: 0 } };
}

// ── Cap helper: clamps value and returns warning ──────────────────────────────
function capAmt(amt: number, maxAmt: number): { amt: number; capped: boolean } {
  if (amt > maxAmt) return { amt: maxAmt, capped: true };
  return { amt, capped: false };
}

interface Props { onSave: () => void; }

export default function NewRAEntryPage({ onSave }: Props) {
  const [raNumber, setRaNumber] = useState(17);
  const [tab, setTab] = useState<TabType>('building');
  const [bldg, setBldg] = useState<Record<number, BuildingMilestoneEntry>>({});
  const [infra, setInfra] = useState<Record<number, InfraMilestoneEntry>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [savedNums, setSavedNums] = useState<number[]>([]);
  // Track which cells were capped so we can show a warning
  const [cappedCells, setCappedCells] = useState<Set<string>>(new Set());

  useEffect(() => { setSavedNums(getSavedRANumbers()); }, []);

  useEffect(() => {
    const data = loadRA(raNumber);
    if (data) {
      setBldg(data.building || {});
      setInfra(data.infra || {});
      setSavedAt(data.savedAt);
    } else {
      setBldg({}); setInfra({}); setSavedAt(null);
    }
    setUnsaved(false);
    setCappedCells(new Set());
  }, [raNumber]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const bldgTotal = Object.entries(bldg).reduce((s, [, b]) => s + BKEYS.reduce((ss, k) => ss + (b[k]?.amt || 0), 0), 0);
  const infraTotal = Object.values(infra).reduce((s, v) => s + (v?.amt || 0), 0);
  const grandTotal = bldgTotal + infraTotal;

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const data: RABillData = {
      raNumber, savedAt: new Date().toISOString(), label: `RA-${raNumber}`,
      building: bldg, infra,
      buildingTotal: bldgTotal, infraTotal, grandTotal,
    };
    saveRA(data);
    setSavedAt(data.savedAt);
    setUnsaved(false);
    setSavedNums(getSavedRANumbers());
    onSave();
  }, [raNumber, bldg, infra, bldgTotal, infraTotal, grandTotal, onSave]);

  const handleDelete = (ra: number) => {
    if (!confirm(`Delete RA-${ra} permanently?`)) return;
    deleteRA(ra);
    setSavedNums(getSavedRANumbers());
    if (ra === raNumber) { setBldg({}); setInfra({}); setSavedAt(null); setUnsaved(false); }
    onSave();
  };

  // ── Building setters with capping ─────────────────────────────────────────
  const setBldgAmt = (idx: number, bk: BK, rawAmt: number) => {
    const scope = billingMilestones[idx]?.[bk]?.scope || 0;
    const cumAmt = billingMilestones[idx]?.[bk]?.cumAmt || 0; // already billed
    const maxAmt = Math.max(0, scope - cumAmt);
    const { amt, capped } = capAmt(rawAmt, maxAmt);
    const cellKey = `b-${idx}-${bk}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (capped) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBldg(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || emptyBlock()), [bk]: { pct: pctFromAmt(amt, scope), amt } },
    }));
    setUnsaved(true);
  };

  const setBldgPct = (idx: number, bk: BK, rawPct: number) => {
    const scope = billingMilestones[idx]?.[bk]?.scope || 0;
    const cumPct = (billingMilestones[idx]?.[bk]?.cumPct || 0) * 100;
    const maxPct = Math.max(0, 100 - cumPct);
    const pct = Math.min(rawPct, maxPct);
    const amt = amtFromPct(pct, scope);
    const cellKey = `b-${idx}-${bk}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (rawPct > maxPct) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBldg(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || emptyBlock()), [bk]: { pct, amt } },
    }));
    setUnsaved(true);
  };

  // ── Infra setters with capping ────────────────────────────────────────────
  const setInfraAmt = (idx: number, rawAmt: number) => {
    const m = infraBillingMilestones[idx];
    const maxAmt = Math.max(0, m.scopeAmount - m.cumAmt);
    const { amt, capped } = capAmt(rawAmt, maxAmt);
    const cellKey = `i-${idx}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (capped) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setInfra(prev => ({ ...prev, [idx]: { pct: pctFromAmt(amt, m.scopeAmount), amt } }));
    setUnsaved(true);
  };

  const setInfraPct = (idx: number, rawPct: number) => {
    const m = infraBillingMilestones[idx];
    const cumPct = m.cumPct * 100;
    const maxPct = Math.max(0, 100 - cumPct);
    const pct = Math.min(rawPct, maxPct);
    const amt = amtFromPct(pct, m.scopeAmount);
    const cellKey = `i-${idx}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (rawPct > maxPct) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setInfra(prev => ({ ...prev, [idx]: { pct, amt } }));
    setUnsaved(true);
  };

  // ── Group milestones ──────────────────────────────────────────────────────
  const bldgGrouped: Record<string, number[]> = {};
  billingMilestones.forEach((m, idx) => {
    if (!bldgGrouped[m.category]) bldgGrouped[m.category] = [];
    bldgGrouped[m.category].push(idx);
  });
  const infraGrouped: Record<string, number[]> = {};
  infraBillingMilestones.forEach((m, idx) => {
    const cat = m.category || 'Infra Civil Works';
    if (!infraGrouped[cat]) infraGrouped[cat] = [];
    infraGrouped[cat].push(idx);
  });

  const highestSaved = Math.max(...[...savedNums, 16]);
  const nextRAAvailable = highestSaved + 1;
  const isCurrentlyAvailableNew = !savedNums.includes(raNumber) && raNumber !== 16;

  // ── Shared input style ────────────────────────────────────────────────────
  const inp = (color: string, capped?: boolean): React.CSSProperties => ({
    width: '100%', padding: '5px 7px',
    border: `1.5px solid ${capped ? '#ef4444' : color + '50'}`,
    borderRadius: 4, fontFamily: 'monospace', fontSize: 11,
    outline: 'none', background: capped ? '#fef2f2' : '#fff',
    color: capped ? '#ef4444' : color, textAlign: 'right' as const,
    transition: 'border-color 0.15s, background 0.15s',
  });

  return (
    <div style={{
      background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #d1d5db',
        background: '#f8fafc', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>

          {/* RA selector */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2044', marginBottom: 6 }}>
              New RA Bill Entry
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Select RA:</span>
              <button onClick={() => setRaNumber(16)} style={{
                padding: '3px 10px', borderRadius: 4,
                border: `1.5px solid ${raNumber === 16 ? '#0f2044' : '#d1d5db'}`,
                background: raNumber === 16 ? '#0f2044' : '#f8fafc',
                color: raNumber === 16 ? '#fff' : '#475569',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>RA-16 <span style={{ fontSize: 9, opacity: 0.5 }}>(read-only)</span></button>

              {savedNums.map(ra => (
                <div key={ra} style={{ display: 'flex' }}>
                  <button onClick={() => setRaNumber(ra)} style={{
                    padding: '3px 10px', borderRadius: '4px 0 0 4px',
                    border: `1.5px solid ${raNumber === ra ? '#1a56b0' : '#bfdbfe'}`,
                    background: raNumber === ra ? '#1a56b0' : '#eff6ff',
                    color: raNumber === ra ? '#fff' : '#1a56b0',
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>RA-{ra} ✓</button>
                  <button onClick={() => handleDelete(ra)} style={{
                    padding: '3px 7px', borderRadius: '0 4px 4px 0',
                    border: '1.5px solid #fecaca', borderLeft: 'none',
                    background: '#fff5f5', color: '#b91c1c',
                    fontFamily: 'inherit', fontSize: 10, cursor: 'pointer',
                  }}>×</button>
                </div>
              ))}

              {/* Current/Unsaved RA (if not already listed) */}
              {isCurrentlyAvailableNew && (
                <button onClick={() => setRaNumber(raNumber)} style={{
                  padding: '3px 10px', borderRadius: 4,
                  border: `1.5px solid #f59e0b`,
                  background: '#fffbeb',
                  color: '#b45309',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>RA-{raNumber} <span style={{ fontSize: 9, opacity: 0.6 }}>(current)</span></button>
              )}

              {/* Next RA Button */}
              {!savedNums.includes(nextRAAvailable) && raNumber !== nextRAAvailable && (
                <button onClick={() => setRaNumber(nextRAAvailable)} style={{
                  padding: '3px 10px', borderRadius: 4,
                  border: '1.5px dashed #1a56b0', background: 'transparent',
                  color: '#1a56b0', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
                }}>+ RA-{nextRAAvailable}</button>
              )}
            </div>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button onClick={handleSave} disabled={raNumber === 16} style={{
              padding: '8px 24px', borderRadius: 6, border: 'none',
              cursor: raNumber === 16 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: raNumber === 16 ? '#e2e8f0' : unsaved ? '#1a56b0' : '#dcfce7',
              color: raNumber === 16 ? '#94a3b8' : unsaved ? '#fff' : '#166534',
              boxShadow: unsaved && raNumber !== 16 ? '0 2px 10px #1a56b040' : 'none',
            }}>
              {raNumber === 16 ? 'Read-only' : unsaved ? `💾 Save RA-${raNumber}` : '✓ Saved'}
            </button>
            {savedAt && raNumber !== 16 && (
              <span style={{
                fontSize: 10, background: '#dcfce7', color: '#166534',
                padding: '2px 8px', borderRadius: 20, fontWeight: 700,
              }}>
                Saved {new Date(savedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {unsaved && <span style={{ fontSize: 10, color: '#f59e0b' }}>● Unsaved changes</span>}
          </div>
        </div>

        {/* Totals strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
          {[
            { label: `RA-${raNumber} Building`, val: bldgTotal, col: '#1e40af' },
            { label: `RA-${raNumber} Infra`, val: infraTotal, col: '#166534' },
            { label: `RA-${raNumber} TOTAL`, val: grandTotal, col: '#0f2044' },
          ].map(({ label, val, col }) => (
            <div key={label} style={{
              background: col + '08', border: `1px solid ${col}20`, borderRadius: 6,
              padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: col, fontSize: 13 }}>
                ₹ {fmt(val)}
              </span>
            </div>
          ))}
        </div>

        {/* Capping warning */}
        {cappedCells.size > 0 && (
          <div style={{
            marginTop: 8, padding: '7px 12px', borderRadius: 6,
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>
              {cappedCells.size} value{cappedCells.size > 1 ? 's were' : ' was'} automatically capped — you cannot bill more than the remaining scope. Highlighted cells show the maximum allowed amount.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 10, borderBottom: '1px solid #e2e8f0' }}>
          {(['building', 'infra'] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 18px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              borderRadius: '4px 4px 0 0',
              borderBottom: tab === t ? '2px solid #1a56b0' : '2px solid transparent',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#1a56b0' : '#64748b',
            }}>
              {t === 'building' ? `🏗 Building (${billingMilestones.length})` : `🛣 Infra (${infraBillingMilestones.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── BUILDING ── */}
        {tab === 'building' && (
          <table className="data-table" style={{ minWidth: 1300 }}>
            <thead>
              <tr>
                <th className="left" style={{ minWidth: 260, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>
                  Milestone
                </th>
                {BKEYS.map((bk, i) => (
                  <th key={bk} colSpan={4} style={{ background: B_MED[i], color: B_COLORS[i] }}>
                    Block-{i + 1}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, fontSize: 10, color: '#94a3b8' }}>
                  description
                </th>
                {BKEYS.map((bk, i) => [
                  <th key={`${bk}-sc`} style={{ background: B_BG[i], width: 110, fontSize: 10 }}>Scope (₹)</th>,
                  <th key={`${bk}-pc`} style={{ background: B_BG[i], width: 110, fontSize: 10 }}>Prev Cum (₹)</th>,
                  <th key={`${bk}-tp`} style={{ background: B_MED[i], color: B_COLORS[i], width: 80 }}>This %</th>,
                  <th key={`${bk}-ta`} style={{ background: B_MED[i], color: B_COLORS[i], width: 120 }}>This ₹</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {Object.entries(bldgGrouped).map(([cat, indices]) => {
                const col = CAT_COLORS[cat] || '#1a56b0';
                return (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={1 + BKEYS.length * 4} style={{
                        background: col, color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px',
                      }}>{cat}</td>
                    </tr>

                    {indices.map(idx => {
                      const m = billingMilestones[idx];
                      const ent = bldg[idx];
                      const hasAny = BKEYS.some(bk => (ent?.[bk]?.amt || 0) > 0);
                      return (
                        <tr key={idx} style={{ background: hasAny ? '#f8fff8' : undefined }}>
                          {/* Description */}
                          <td className="left" style={{
                            fontSize: 11, position: 'sticky', left: 0, zIndex: 1,
                            background: hasAny ? '#f8fff8' : '#fff',
                          }}>
                            {m.description.slice(0, 72)}{m.description.length > 72 ? '…' : ''}
                          </td>

                          {BKEYS.map((bk, i) => {
                            const scope = m[bk].scope;
                            const cumAmt = m[bk].cumAmt;           // total billed so far (prev RAs)
                            const cumPct = m[bk].cumPct * 100;
                            const maxAmt = Math.max(0, scope - cumAmt);
                            const maxPct = Math.max(0, 100 - cumPct);
                            const remPct = maxPct;
                            const thisPct = ent?.[bk]?.pct || 0;
                            const thisAmt = ent?.[bk]?.amt || 0;
                            const cellKey = `b-${idx}-${bk}`;
                            const isCapped = cappedCells.has(cellKey);
                            const isComplete = cumPct >= 99.9;

                            if (!scope) return [
                              <td key={`${bk}-sc`} style={{ background: B_BG[i], color: '#cbd5e1', fontSize: 10 }}>N/A</td>,
                              <td key={`${bk}-pc`} style={{ background: B_BG[i], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                              <td key={`${bk}-tp`} style={{ background: B_BG[i], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                              <td key={`${bk}-ta`} style={{ background: B_BG[i], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                            ];

                            return [
                              // Scope
                              <td key={`${bk}-sc`} style={{ background: B_BG[i], padding: '5px 8px' }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569' }}>{fmt(scope)}</div>
                                {/* Scope bar */}
                                <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 3 }}>
                                  <div style={{ width: `${Math.min(cumPct, 100)}%`, height: '100%', background: B_COLORS[i] + '70', borderRadius: 2 }} />
                                </div>
                              </td>,

                              // Prev cumulative
                              <td key={`${bk}-pc`} style={{ background: B_BG[i], padding: '5px 8px' }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#0f2044', fontWeight: 600 }}>
                                  {fmt(cumAmt)}
                                </div>
                                <div style={{ fontSize: 9, marginTop: 2 }}>
                                  {isComplete
                                    ? <span style={{ color: '#0e6d41', fontWeight: 700 }}>✓ 100% done</span>
                                    : <span style={{ color: B_COLORS[i] }}>{cumPct.toFixed(0)}% · rem {remPct.toFixed(0)}%</span>
                                  }
                                </div>
                              </td>,

                              // This % input
                              <td key={`${bk}-tp`} style={{ background: B_BG[i], padding: 4 }}>
                                {isComplete
                                  ? <div style={{ textAlign: 'center', fontSize: 10, color: '#0e6d41' }}>✓</div>
                                  : <input
                                    type="number" min="0" max={maxPct.toFixed(1)} step="0.1"
                                    placeholder={`max ${maxPct.toFixed(0)}%`}
                                    value={thisPct > 0 ? parseFloat(thisPct.toFixed(2)) : ''}
                                    style={inp(B_COLORS[i], isCapped)}
                                    title={`Maximum: ${maxPct.toFixed(2)}%`}
                                    onChange={e => setBldgPct(idx, bk, parseFloat(e.target.value) || 0)}
                                  />
                                }
                              </td>,

                              // This ₹ input
                              <td key={`${bk}-ta`} style={{ background: B_BG[i], padding: 4 }}>
                                {isComplete
                                  ? <div style={{ textAlign: 'center', fontSize: 10, color: '#0e6d41' }}>✓</div>
                                  : <input
                                    type="number" min="0" max={Math.round(maxAmt)} step="1000"
                                    placeholder={`max ₹${fmt(maxAmt)}`}
                                    value={thisAmt > 0 ? Math.round(thisAmt) : ''}
                                    style={inp(B_COLORS[i], isCapped)}
                                    title={`Maximum: ₹ ${fmt(maxAmt)}`}
                                    onChange={e => setBldgAmt(idx, bk, parseFloat(e.target.value) || 0)}
                                  />
                                }
                              </td>,
                            ];
                          })}
                        </tr>
                      );
                    })}

                    {/* Category subtotal */}
                    {(() => {
                      const subs = BKEYS.map((bk, i) => ({
                        scope: indices.reduce((s, idx) => s + billingMilestones[idx][bk].scope, 0),
                        cumAmt: indices.reduce((s, idx) => s + billingMilestones[idx][bk].cumAmt, 0),
                        thisAmt: indices.reduce((s, idx) => s + (bldg[idx]?.[bk]?.amt || 0), 0),
                      }));
                      return (
                        <tr key={`sub-${cat}`} style={{ background: '#f1f5f9' }}>
                          <td className="left" style={{ fontWeight: 700, fontSize: 11, paddingLeft: 12, color: col, position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 1 }}>
                            Subtotal — {cat}
                          </td>
                          {subs.map((s, i) => [
                            <td key={`${i}-sc`} className="mono" style={{ fontSize: 11, color: '#475569', fontWeight: 600, background: B_BG[i] }}>{fmt(s.scope)}</td>,
                            <td key={`${i}-pc`} className="mono" style={{ fontSize: 11, color: '#0f2044', fontWeight: 600, background: B_BG[i] }}>{fmt(s.cumAmt)}</td>,
                            <td key={`${i}-tp`} style={{ background: B_BG[i] }}></td>,
                            <td key={`${i}-ta`} className="mono" style={{ fontSize: 11, fontWeight: 700, color: B_COLORS[i], background: B_MED[i] }}>{s.thisAmt ? fmt(s.thisAmt) : '–'}</td>,
                          ])}
                        </tr>
                      );
                    })()}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f2044' }}>
                <td className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px', position: 'sticky', left: 0, background: '#0f2044', zIndex: 2 }}>
                  TOTAL BUILDING — RA-{raNumber}
                </td>
                {BKEYS.map((bk, i) => {
                  const scope = billingMilestones.reduce((s, m) => s + m[bk].scope, 0);
                  const cumAmt = billingMilestones.reduce((s, m) => s + m[bk].cumAmt, 0);
                  const thisAmt = Object.values(bldg).reduce((s, b) => s + (b[bk]?.amt || 0), 0);
                  return [
                    <td key={`${bk}-sc`} className="mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{fmt(scope)}</td>,
                    <td key={`${bk}-pc`} className="mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(cumAmt)}</td>,
                    <td key={`${bk}-tp`}></td>,
                    <td key={`${bk}-ta`} className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>{fmt(thisAmt)}</td>,
                  ];
                })}
              </tr>
            </tfoot>
          </table>
        )}

        {/* ── INFRA ── */}
        {tab === 'infra' && (
          <table className="data-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="left" style={{ width: 44 }}>#</th>
                <th className="left" style={{ minWidth: 320 }}>Milestone</th>
                <th style={{ width: 140 }}>Scope (₹)</th>
                <th style={{ width: 150 }}>Prev Cumulative (₹)</th>
                <th style={{ width: 130 }}>Remaining (₹)</th>
                <th style={{ width: 90, background: '#eef4ff', color: '#1a56b0' }}>This Bill %</th>
                <th style={{ width: 150, background: '#eef4ff', color: '#1a56b0' }}>This Bill ₹</th>
                <th style={{ width: 90 }}>New Cum %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(infraGrouped).map(([cat, indices]) => {
                const col = CAT_COLORS[cat] || '#1a56b0';
                const catThisTotal = indices.reduce((s, idx) => s + (infra[idx]?.amt || 0), 0);
                return (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={8} style={{ background: col, color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px' }}>
                        {cat}
                      </td>
                    </tr>

                    {indices.map(idx => {
                      const m = infraBillingMilestones[idx];
                      const scope = m.scopeAmount;
                      const cumAmt = m.cumAmt;
                      const cumPct = m.cumPct * 100;
                      const maxAmt = Math.max(0, scope - cumAmt);
                      const maxPct = Math.max(0, 100 - cumPct);
                      const thisPct = infra[idx]?.pct || 0;
                      const thisAmt = infra[idx]?.amt || 0;
                      const newCum = Math.min(cumPct + thisPct, 100);
                      const cellKey = `i-${idx}`;
                      const isCapped = cappedCells.has(cellKey);
                      const isComplete = cumPct >= 99.9;

                      return (
                        <tr key={idx} style={{ background: thisAmt > 0 ? '#f0fdf4' : undefined }}>
                          <td className="sno">{m.sno}</td>
                          <td className="left" style={{ fontSize: 11 }}>
                            <div>{m.description.slice(0, 70)}{m.description.length > 70 ? '…' : ''}</div>
                            {/* Progress bar */}
                            <div style={{ marginTop: 4, height: 4, background: '#e2e8f0', borderRadius: 2, width: 160, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ width: `${Math.min(cumPct, 100)}%`, background: col + '70' }} />
                                <div style={{ width: `${Math.min(thisPct, 100)}%`, background: col }} />
                              </div>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="mono" style={{ fontSize: 11, color: '#475569' }}>
                            {scope ? fmt(scope) : '–'}
                          </td>

                          {/* Prev cumulative */}
                          <td style={{ padding: '5px 8px' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#0f2044' }}>
                              {fmt(cumAmt)}
                            </div>
                            <div style={{ fontSize: 9, color: col, marginTop: 1 }}>
                              {isComplete
                                ? <span style={{ color: '#0e6d41', fontWeight: 700 }}>✓ 100% complete</span>
                                : `${cumPct.toFixed(1)}% billed`
                              }
                            </div>
                          </td>

                          {/* Remaining */}
                          <td style={{ padding: '5px 8px' }}>
                            {isComplete
                              ? <span style={{ fontSize: 10, color: '#0e6d41' }}>—</span>
                              : <>
                                <div style={{ fontFamily: 'monospace', fontSize: 11, color: maxAmt < scope * 0.1 ? '#b91c1c' : '#b45309', fontWeight: 600 }}>
                                  {fmt(maxAmt)}
                                </div>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{maxPct.toFixed(1)}% left</div>
                              </>
                            }
                          </td>

                          {/* This % */}
                          <td style={{ padding: 4, background: '#eef4ff' }}>
                            {isComplete
                              ? <div style={{ textAlign: 'center', fontSize: 11, color: '#0e6d41' }}>✓ done</div>
                              : <input
                                type="number" min="0" max={maxPct.toFixed(1)} step="0.1"
                                placeholder={`max ${maxPct.toFixed(0)}%`}
                                value={thisPct > 0 ? parseFloat(thisPct.toFixed(2)) : ''}
                                style={inp('#1a56b0', isCapped)}
                                title={`Maximum billable: ${maxPct.toFixed(2)}%`}
                                onChange={e => setInfraPct(idx, parseFloat(e.target.value) || 0)}
                              />
                            }
                          </td>

                          {/* This ₹ */}
                          <td style={{ padding: 4, background: '#eef4ff' }}>
                            {isComplete
                              ? <div style={{ textAlign: 'center', fontSize: 11, color: '#0e6d41' }}>✓ done</div>
                              : <input
                                type="number" min="0" max={Math.round(maxAmt)} step="1000"
                                placeholder={`max ₹${fmt(maxAmt)}`}
                                value={thisAmt > 0 ? Math.round(thisAmt) : ''}
                                style={inp('#1a56b0', isCapped)}
                                title={`Maximum billable: ₹ ${fmt(maxAmt)}`}
                                onChange={e => setInfraAmt(idx, parseFloat(e.target.value) || 0)}
                              />
                            }
                          </td>

                          {/* New cumulative */}
                          <td style={{ fontSize: 11 }}>
                            {thisAmt > 0
                              ? <span style={{
                                fontFamily: 'monospace', fontWeight: 700,
                                color: newCum >= 99.9 ? '#0e6d41' : '#1a56b0',
                              }}>
                                {newCum.toFixed(1)}%
                                {newCum >= 99.9 && ' ✓'}
                              </span>
                              : <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{cumPct.toFixed(1)}%</span>
                            }
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category subtotal */}
                    <tr key={`sub-${cat}`} style={{ background: col + '10' }}>
                      <td colSpan={2} className="left" style={{ fontWeight: 700, fontSize: 11, paddingLeft: 16, color: col }}>
                        Subtotal — {cat}
                      </td>
                      <td className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                        {fmt(indices.reduce((s, idx) => s + infraBillingMilestones[idx].scopeAmount, 0))}
                      </td>
                      <td className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                        {fmt(indices.reduce((s, idx) => s + infraBillingMilestones[idx].cumAmt, 0))}
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: '#b45309' }}>
                        {fmt(indices.reduce((s, idx) => s + Math.max(0, infraBillingMilestones[idx].scopeAmount - infraBillingMilestones[idx].cumAmt), 0))}
                      </td>
                      <td></td>
                      <td className="mono" style={{ fontWeight: 700, color: col }}>
                        {catThisTotal ? fmt(catThisTotal) : '–'}
                      </td>
                      <td></td>
                    </tr>
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f2044' }}>
                <td colSpan={2} className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>
                  TOTAL INFRA — RA-{raNumber}
                </td>
                <td className="mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
                  {fmt(infraBillingMilestones.reduce((s, m) => s + m.scopeAmount, 0))}
                </td>
                <td className="mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {fmt(infraBillingMilestones.reduce((s, m) => s + m.cumAmt, 0))}
                </td>
                <td className="mono" style={{ color: '#fde68a' }}>
                  {fmt(infraBillingMilestones.reduce((s, m) => s + Math.max(0, m.scopeAmount - m.cumAmt), 0))}
                </td>
                <td></td>
                <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>
                  {fmt(infraTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #d1d5db',
        background: '#f8fafc', display: 'flex', gap: 16,
        alignItems: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#475569' }}>
          RA-{raNumber} Total:&nbsp;
          <strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>Bldg ₹{fmt(bldgTotal)}</strong>
          &nbsp;+&nbsp;
          <strong style={{ fontFamily: 'monospace', color: '#166534' }}>Infra ₹{fmt(infraTotal)}</strong>
          &nbsp;=&nbsp;
          <strong style={{ fontFamily: 'monospace', color: '#0e6d41', fontSize: 14 }}>₹{fmt(grandTotal)}</strong>
        </span>
        <button onClick={handleSave} disabled={raNumber === 16} style={{
          marginLeft: 'auto', padding: '7px 20px', borderRadius: 6,
          border: 'none', cursor: raNumber === 16 ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          background: raNumber === 16 ? '#e2e8f0' : unsaved ? '#1a56b0' : '#dcfce7',
          color: raNumber === 16 ? '#94a3b8' : unsaved ? '#fff' : '#166534',
        }}>
          {raNumber === 16 ? 'Read-only' : unsaved ? `💾 Save RA-${raNumber}` : '✓ Saved'}
        </button>
      </div>
    </div>
  );
}
