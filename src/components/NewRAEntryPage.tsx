'use client';

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useVendor } from '@/lib/VendorContext';
import { fmt } from '@/lib/utils';
import {
  RABillData, BuildingMilestoneEntry, InfraMilestoneEntry, BOQEntry,
  loadRA, saveRA, deleteRA, getSavedRANumbers, loadAllCOPs,
} from '@/lib/raStore';
import { BOQSheet } from '@/data/projectData';
import { BLOCK_COLORS, BLOCK_BG, BLOCK_MED } from '@/lib/colors';

type TabType = 'building' | 'infra';

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
  return {};
}

// ── Cap helper: clamps value and returns warning ──────────────────────────────
function capAmt(amt: number, maxAmt: number): { amt: number; capped: boolean } {
  if (amt > maxAmt) return { amt: maxAmt, capped: true };
  return { amt, capped: false };
}

interface Props { onSave: () => void; }

export default function NewRAEntryPage({ onSave }: Props) {
  const { billingMilestones, infraBillingMilestones, boqs, currentRA, id: projectId, refreshRAs, getBOQMilestonesByRA } = useVendor();
  const [raNumber, setRaNumber] = useState(currentRA + 1);
  const [activeTabId, setActiveTabId] = useState<string>(boqs[0]?.id || 'building');
  const [bldg, setBldg] = useState<Record<number, BuildingMilestoneEntry>>({});
  const [infra, setInfra] = useState<Record<number, InfraMilestoneEntry>>({});
  const [boqEntries, setBoqEntries] = useState<Record<string, Record<number, BOQEntry>>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [savedNums, setSavedNums] = useState<number[]>([]);
  // Track which cells were capped so we can show a warning
  const [cappedCells, setCappedCells] = useState<Set<string>>(new Set());
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [approvedRAs, setApprovedRAs] = useState<Set<number>>(new Set());

  // Load COP statuses to know which RAs are locked
  useEffect(() => {
    const fetchCOPs = async () => {
      if (!projectId) return;
      const cops = await loadAllCOPs(projectId);
      const approved = new Set<number>();
      cops.forEach(c => { if (c.status === 'approved') approved.add(c.raNumber); });
      setApprovedRAs(approved);
    };
    fetchCOPs();
  }, [projectId]);

  const isLocked = approvedRAs.has(raNumber);

  useEffect(() => {
    const fetchNums = async () => {
      if (!projectId) return;
      const nums = await getSavedRANumbers(projectId);
      setSavedNums(nums);
      const highestSaved = nums.length > 0 ? Math.max(...nums) : 0;
      setRaNumber(Math.max(currentRA + 1, highestSaved + 1));
    };
    fetchNums();
  }, [projectId, currentRA]);

  useEffect(() => {
    const fetchRA = async () => {
      if (!projectId) return;
      setIsDataLoading(true);
      const data = await loadRA(raNumber, projectId);
      if (data) {
        setBldg(data.building || {});
        setInfra(data.infra || {});
        setBoqEntries(data.boqEntries || {});
        setSavedAt(data.savedAt);
      } else {
        setBldg({}); setInfra({}); setBoqEntries({}); setSavedAt(null);
      }
      setUnsaved(false);
      setCappedCells(new Set());
      setIsDataLoading(false);
    };
    fetchRA();
  }, [raNumber, projectId]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const bldgTotal = Object.values(bldg).reduce((sum, entry) =>
    sum + Object.values(entry).reduce((ss: number, val: any) => ss + (val?.amt || 0), 0), 0);
  const infraTotal = Object.values(infra).reduce((s, v) => s + (v?.amt || 0), 0);
  const boqTotal = Object.values(boqEntries).reduce((sum, entries) =>
    sum + Object.values(entries).reduce((ss, v) => ss + (v?.amt || 0), 0), 0);
  const grandTotal = bldgTotal + infraTotal + boqTotal;

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!projectId) return;
    const data: RABillData = {
      raNumber, savedAt: new Date().toISOString(), label: `RA-${raNumber}`,
      building: bldg, infra, boqEntries,
      buildingTotal: bldgTotal, infraTotal, boqTotal, grandTotal,
    };
    await saveRA(data, projectId);
    setSavedAt(data.savedAt);
    setUnsaved(false);
    const nums = await getSavedRANumbers(projectId);
    setSavedNums(nums);
    await refreshRAs(); // Re-derive milestones with updated history
    onSave();
  }, [raNumber, bldg, infra, bldgTotal, infraTotal, grandTotal, onSave, projectId, refreshRAs]);

  const handleDelete = async (ra: number) => {
    if (!projectId) return;
    if (!confirm(`Delete RA-${ra} permanently?`)) return;
    await deleteRA(ra, projectId);
    const nums = await getSavedRANumbers(projectId);
    setSavedNums(nums);
    if (ra === raNumber) { setBldg({}); setInfra({}); setSavedAt(null); setUnsaved(false); }
    await refreshRAs(); // Re-derive milestones after deletion
    onSave();
  };

  // ── Building setters with capping ─────────────────────────────────────────
  const setBldgAmt = (idx: number, blockKey: string, rawAmt: number) => {
    const m = billingMilestones[idx];
    const bData = m?.[blockKey] || { scope: 0, cumAmt: 0 };
    const scope = bData.scope || 0;
    const cumAmt = bData.cumAmt || 0;
    const maxAmt = Math.max(0, scope - cumAmt);
    const { amt, capped } = capAmt(rawAmt, maxAmt);
    const cellKey = `b-${idx}-${blockKey}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (capped) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBldg(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [blockKey]: { pct: pctFromAmt(amt, scope), amt } },
    }));
    setUnsaved(true);
  };

  const setBldgPct = (idx: number, blockKey: string, rawPct: number) => {
    const m = billingMilestones[idx];
    const bData = m?.[blockKey] || { scope: 0, cumAmt: 0 };
    const scope = bData.scope || 0;
    const cumPct = (bData.cumPct || 0) * 100;
    const maxPct = Math.max(0, 100 - cumPct);
    const pct = Math.min(rawPct, maxPct);
    const amt = amtFromPct(pct, scope);
    const cellKey = `b-${idx}-${blockKey}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (rawPct > maxPct) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBldg(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [blockKey]: { pct, amt } },
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

  // ── Dynamic BOQ setters ───────────────────────────────────────────────────
  const setBoqAmt = (boqId: string, idx: number, rawAmt: number) => {
    const boqItems = getBOQMilestonesByRA(raNumber, boqId);
    const m = boqItems[idx];
    if (!m) return;
    const maxAmt = Math.max(0, m.amount - m.cumAmt);
    const { amt, capped } = capAmt(rawAmt, maxAmt);
    const cellKey = `q-${boqId}-${idx}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (capped) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBoqEntries(prev => {
      const boqPrev = prev[boqId] || {};
      return {
        ...prev,
        [boqId]: { ...boqPrev, [idx]: { pct: (amt / (m.amount || 1)) * 100, amt } }
      };
    });
    setUnsaved(true);
  };

  const setBoqPct = (boqId: string, idx: number, rawPct: number) => {
    const boqItems = getBOQMilestonesByRA(raNumber, boqId);
    const m = boqItems[idx];
    if (!m) return;
    const maxPct = Math.max(0, 100 - (m.cumPct * 100));
    const pct = Math.min(rawPct, maxPct);
    const amt = (pct / 100) * m.amount;
    const cellKey = `q-${boqId}-${idx}`;
    setCappedCells(prev => {
      const next = new Set(prev);
      if (rawPct > maxPct) next.add(cellKey); else next.delete(cellKey);
      return next;
    });
    setBoqEntries(prev => {
      const boqPrev = prev[boqId] || {};
      return {
        ...prev,
        [boqId]: { ...boqPrev, [idx]: { pct, amt } }
      };
    });
    setUnsaved(true);
  };

  // ── Group milestones ──────────────────────────────────────────────────────
  const bldgBlocks = Array.from(new Set(billingMilestones.map((m: any) => m.category))).filter(Boolean) as string[];
  const bldgGrouped: Record<string, number[]> = {};
  billingMilestones.forEach((m: any, idx) => {
    const sec = m.section || 'Building Works';
    if (!bldgGrouped[sec]) bldgGrouped[sec] = [];
    bldgGrouped[sec].push(idx);
  });
  const infraGrouped: Record<string, number[]> = {};
  infraBillingMilestones.forEach((m: any, idx) => {
    const cat = m.category || 'Infra Civil Works';
    if (!infraGrouped[cat]) infraGrouped[cat] = [];
    infraGrouped[cat].push(idx);
  });

  const highestSaved = Math.max(...[...savedNums, currentRA]);
  const nextRAAvailable = highestSaved + 1;
  const isCurrentlyAvailableNew = !savedNums.includes(raNumber) && raNumber !== currentRA;

  // ── Shared input style ────────────────────────────────────────────────────
  const inp = (color: string, capped?: boolean): React.CSSProperties => ({
    width: '100%', padding: '5px 7px',
    border: `1.5px solid ${isLocked ? '#e2e8f0' : capped ? '#ef4444' : color + '50'}`,
    borderRadius: 4, fontFamily: 'monospace', fontSize: 11,
    outline: 'none', background: isLocked ? '#f1f5f9' : capped ? '#fef2f2' : '#fff',
    color: isLocked ? '#94a3b8' : capped ? '#ef4444' : color, textAlign: 'right' as const,
    transition: 'border-color 0.15s, background 0.15s',
    cursor: isLocked ? 'not-allowed' : 'text',
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

              {savedNums.map(ra => (
                <div key={ra} style={{ display: 'flex' }}>
                  <button onClick={() => setRaNumber(ra)} style={{
                    padding: '3px 10px', borderRadius: approvedRAs.has(ra) ? 4 : '4px 0 0 4px',
                    border: `1.5px solid ${raNumber === ra ? '#1a56b0' : approvedRAs.has(ra) ? '#86efac' : '#bfdbfe'}`,
                    background: raNumber === ra ? '#1a56b0' : approvedRAs.has(ra) ? '#f0fdf4' : '#eff6ff',
                    color: raNumber === ra ? '#fff' : approvedRAs.has(ra) ? '#166534' : '#1a56b0',
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>RA-{ra} {approvedRAs.has(ra) ? '🔒' : '✓'}</button>
                  {!approvedRAs.has(ra) && (
                    <button onClick={() => handleDelete(ra)} style={{
                      padding: '3px 7px', borderRadius: '0 4px 4px 0',
                      border: '1.5px solid #fecaca', borderLeft: 'none',
                      background: '#fff5f5', color: '#b91c1c',
                      fontFamily: 'inherit', fontSize: 10, cursor: 'pointer',
                    }}>×</button>
                  )}
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
                }}>{raNumber === 0 ? 'Baseline' : `RA-${raNumber}`} <span style={{ fontSize: 9, opacity: 0.6 }}>(current)</span></button>
              )}

              {/* Next RA Button */}
              {!savedNums.includes(nextRAAvailable) && raNumber !== nextRAAvailable && (
                <button onClick={() => setRaNumber(nextRAAvailable)} style={{
                  padding: '3px 10px', borderRadius: 4,
                  border: '1.5 dashed #1a56b0', background: 'transparent',
                  color: '#1a56b0', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
                }}>+ RA-{nextRAAvailable}</button>
              )}

              {/* Manual Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Custom:</span>
                <input
                  type="number"
                  value={raNumber}
                  onChange={(e) => setRaNumber(parseInt(e.target.value) || 1)}
                  style={{
                    width: 50, padding: '2px 6px', fontSize: 11, borderRadius: 4,
                    border: '1px solid #d1d5db', outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {isLocked ? (
              <div style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: '#f0fdf4', color: '#166534', border: '1px solid #86efac',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🔒 COP Approved — Read Only
              </div>
            ) : (
              <>
                <button onClick={handleSave} disabled={raNumber === currentRA} style={{
                  padding: '8px 24px', borderRadius: 6, border: 'none',
                  cursor: raNumber === currentRA ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                  background: raNumber === currentRA ? '#e2e8f0' : unsaved ? '#1a56b0' : '#dcfce7',
                  color: raNumber === currentRA ? '#94a3b8' : unsaved ? '#fff' : '#166534',
                  boxShadow: unsaved && raNumber !== currentRA ? '0 2px 10px #1a56b040' : 'none',
                }}>
                  {raNumber === currentRA ? 'Read-only' : unsaved ? `💾 Save RA-${raNumber}` : '✓ Saved'}
                </button>
                {savedAt && raNumber !== currentRA && (
                  <span style={{
                    fontSize: 10, background: '#dcfce7', color: '#166534',
                    padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                  }}>
                    Saved {new Date(savedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {unsaved && <span style={{ fontSize: 10, color: '#f59e0b' }}>● Unsaved changes</span>}
              </>
            )}
          </div>
        </div>

        {/* Totals strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginTop: 10 }}>
          {boqs.map(boq => {
            let val = 0;
            let col = '#7c3aed';
            let label = boq.name;

            if (boq.id === 'boq-bldg-legacy') {
              val = bldgTotal; col = '#1e40af'; label = 'Building';
            } else if (boq.id === 'boq-infra-legacy') {
              val = infraTotal; col = '#166534'; label = 'Infra';
            } else {
              val = Object.values(boqEntries[boq.id] || {}).reduce((s, v) => s + (v?.amt || 0), 0);
            }

            if (val === 0 && !boq.id.includes('legacy')) return null;

            return (
              <div key={boq.id} style={{
                background: col + '08', border: `1px solid ${col}20`, borderRadius: 6,
                padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: '#475569' }}>RA-{raNumber} {label}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: col, fontSize: 13 }}>
                  ₹ {fmt(val)}
                </span>
              </div>
            );
          })}
          <div style={{
            background: '#0f204408', border: '1px solid #0f204420', borderRadius: 6,
            padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#475569' }}>RA-{raNumber} GRAND TOTAL</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f2044', fontSize: 13 }}>
              ₹ {fmt(grandTotal)}
            </span>
          </div>
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
        <div style={{ display: 'flex', gap: 2, marginTop: 10, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
          {boqs.map(boq => (
            <button
              key={boq.id}
              onClick={() => setActiveTabId(boq.id)}
              style={{
                padding: '6px 18px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                borderRadius: '4px 4px 0 0', whiteSpace: 'nowrap',
                borderBottom: activeTabId === boq.id ? `2px solid ${boq.id.includes('legacy') ? '#1a56b0' : '#7c3aed'}` : '2px solid transparent',
                background: activeTabId === boq.id ? '#fff' : 'transparent',
                color: activeTabId === boq.id ? (boq.id.includes('legacy') ? '#1a56b0' : '#7c3aed') : '#64748b',
              }}
            >
              {boq.id === 'boq-bldg-legacy' ? '🏗 Building' : boq.id === 'boq-infra-legacy' ? '🛣 Infra' : `📄 ${boq.name}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── BUILDING ── */}
        {activeTabId === 'building' && (
          <table className="data-table" style={{ minWidth: 400 + bldgBlocks.length * 400 }}>
            <thead>
              <tr>
                <th className="left" style={{ minWidth: 260, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10 }}>
                  Milestone (Trade Breakdown)
                </th>
                {bldgBlocks.map((blockName: string, i) => (
                  <th key={blockName} colSpan={4} style={{ background: BLOCK_MED[i % BLOCK_MED.length], color: BLOCK_COLORS[i % BLOCK_COLORS.length] }}>
                    {blockName}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, fontSize: 10, color: '#94a3b8' }}>
                  description
                </th>
                {bldgBlocks.map((blockName: string, i) => [
                  <th key={`${blockName}-sc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], width: 110, fontSize: 10 }}>Scope (₹)</th>,
                  <th key={`${blockName}-pc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], width: 110, fontSize: 10 }}>Prev Cum (₹)</th>,
                  <th key={`${blockName}-tp`} style={{ background: BLOCK_MED[i % BLOCK_MED.length], color: BLOCK_COLORS[i % BLOCK_COLORS.length], width: 80 }}>This %</th>,
                  <th key={`${blockName}-ta`} style={{ background: BLOCK_MED[i % BLOCK_MED.length], color: BLOCK_COLORS[i % BLOCK_COLORS.length], width: 120 }}>This ₹</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {Object.entries(bldgGrouped).map(([cat, indices]) => {
                const col = CAT_COLORS[cat] || '#1a56b0';
                return (
                  <Fragment key={`cat-frag-${cat}`}>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={1 + bldgBlocks.length * 4} style={{
                        background: col, color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px',
                      }}>{cat}</td>
                    </tr>

                    {indices.map(idx => {
                      const m = billingMilestones[idx] as any;
                      const ent = bldg[idx];
                      const hasAnyVal = ent && Object.values(ent).some((v: any) => v.amt > 0);

                      return (
                        <tr key={idx} style={{ background: hasAnyVal ? '#f8fff8' : undefined }}>
                          {/* Description */}
                          <td className="left" style={{
                            fontSize: 11, position: 'sticky', left: 0, zIndex: 5,
                            background: hasAnyVal ? '#f8fff8' : '#fff',
                            borderRight: '2px solid #e2e8f0'
                          }}>
                            <div style={{ fontWeight: 600 }}>{m.description}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.uom} | {m.qty} @ {m.rate}</div>
                          </td>

                          {bldgBlocks.map((blockName: string, i) => {
                            const bData = m[blockName]; // Derived in VendorContext
                            if (!bData) return [
                              <td key={`${blockName}-sc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                              <td key={`${blockName}-pc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                              <td key={`${blockName}-tp`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                              <td key={`${blockName}-ta`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], color: '#cbd5e1', fontSize: 10 }}>—</td>,
                            ];

                            const scope = bData.scope || 0;
                            const cumAmt = bData.cumAmt || 0;
                            const cumPct = (bData.cumPct || 0) * 100;
                            const maxAmt = Math.max(0, scope - cumAmt);
                            const maxPct = Math.max(0, 100 - cumPct);
                            const remPct = maxPct;
                            const thisPct = ent?.[blockName]?.pct || 0;
                            const thisAmt = ent?.[blockName]?.amt || 0;
                            const cellKey = `b-${idx}-${blockName}`;
                            const isCapped = cappedCells.has(cellKey);
                            const isComplete = cumPct >= 99.9;

                            return [
                              // Scope
                              <td key={`${blockName}-sc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], padding: '5px 8px' }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569' }}>{fmt(scope)}</div>
                                <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, marginTop: 3 }}>
                                  <div style={{ width: `${Math.min(cumPct, 100)}%`, height: '100%', background: BLOCK_COLORS[i % BLOCK_COLORS.length] + '70', borderRadius: 2 }} />
                                </div>
                              </td>,

                              // Prev cumulative
                              <td key={`${blockName}-pc`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], padding: '5px 8px' }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#0f2044', fontWeight: 600 }}>
                                  {fmt(cumAmt)}
                                </div>
                                <div style={{ fontSize: 9, marginTop: 2 }}>
                                  {isComplete
                                    ? <span style={{ color: '#0e6d41', fontWeight: 700 }}>✓ 100% done</span>
                                    : <span style={{ color: BLOCK_COLORS[i % BLOCK_COLORS.length] }}>{cumPct.toFixed(0)}% · rem {remPct.toFixed(0)}%</span>
                                  }
                                </div>
                              </td>,

                              // This % input
                              <td key={`${blockName}-tp`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], padding: 4 }}>
                                {isComplete
                                  ? <div style={{ textAlign: 'center', fontSize: 10, color: '#0e6d41' }}>✓</div>
                                  : <input
                                    type="number" min="0" max={maxPct.toFixed(1)} step="0.1"
                                    placeholder={`max ${maxPct.toFixed(0)}%`}
                                    disabled={isLocked}
                                    value={thisPct > 0 ? parseFloat(thisPct.toFixed(2)) : ''}
                                    style={inp(BLOCK_COLORS[i % BLOCK_COLORS.length], isCapped)}
                                    title={`Maximum: ${maxPct.toFixed(2)}%`}
                                    onChange={e => setBldgPct(idx, blockName as string, parseFloat(e.target.value) || 0)}
                                  />
                                }
                              </td>,

                              // This ₹ input
                              <td key={`${blockName}-ta`} style={{ background: BLOCK_BG[i % BLOCK_BG.length], padding: 4 }}>
                                {isComplete
                                  ? <div style={{ textAlign: 'center', fontSize: 10, color: '#0e6d41' }}>✓</div>
                                  : <input
                                    type="number" min="0" max={Math.round(maxAmt)} step="1000"
                                    placeholder={`max ₹${fmt(maxAmt)}`}
                                    disabled={isLocked}
                                    value={thisAmt > 0 ? Math.round(thisAmt) : ''}
                                    style={inp(BLOCK_COLORS[i % BLOCK_COLORS.length], isCapped)}
                                    title={`Maximum: ₹ ${fmt(maxAmt)}`}
                                    onChange={e => setBldgAmt(idx, blockName as string, parseFloat(e.target.value) || 0)}
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
                      const subs = bldgBlocks.map((blockName: string, i) => {
                        const scope = indices.reduce((s, idx) => s + (billingMilestones[idx][blockName]?.scope || 0), 0);
                        const cumAmt = indices.reduce((s, idx) => s + (billingMilestones[idx][blockName]?.cumAmt || 0), 0);
                        const thisAmt = indices.reduce((s, idx) => s + (bldg[idx]?.[blockName]?.amt || 0), 0);
                        return { scope, cumAmt, thisAmt };
                      });
                      return (
                        <tr key={`sub-${cat}`} style={{ background: '#f1f5f9' }}>
                          <td className="left" style={{ fontWeight: 700, fontSize: 11, paddingLeft: 12, color: col, position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 5 }}>
                            Subtotal — {cat}
                          </td>
                          {subs.map((s, i) => [
                            <td key={`${i}-sc`} className="mono" style={{ fontSize: 11, color: '#475569', fontWeight: 600, background: BLOCK_BG[i % BLOCK_BG.length] }}>{fmt(s.scope)}</td>,
                            <td key={`${i}-pc`} className="mono" style={{ fontSize: 11, color: '#0f2044', fontWeight: 600, background: BLOCK_BG[i % BLOCK_BG.length] }}>{fmt(s.cumAmt)}</td>,
                            <td key={`${i}-tp`} style={{ background: BLOCK_BG[i % BLOCK_BG.length] }}></td>,
                            <td key={`${i}-ta`} className="mono" style={{ fontSize: 11, fontWeight: 700, color: BLOCK_COLORS[i % BLOCK_COLORS.length], background: BLOCK_MED[i % BLOCK_MED.length] }}>{s.thisAmt ? fmt(s.thisAmt) : '–'}</td>,
                          ])}
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f2044' }}>
                <td className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px', position: 'sticky', left: 0, background: '#0f2044', zIndex: 10 }}>
                  TOTAL BUILDING — RA-{raNumber}
                </td>
                {bldgBlocks.map((blockName: string, i) => {
                  const scope = billingMilestones.reduce((s, m: any) => s + (m[blockName]?.scope || 0), 0);
                  const cumAmt = billingMilestones.reduce((s, m: any) => s + (m[blockName]?.cumAmt || 0), 0);
                  const thisAmt = Object.values(bldg).reduce((s, b: any) => s + (b[blockName]?.amt || 0), 0);
                  return [
                    <td key={`${blockName}-sc`} className="mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{fmt(scope)}</td>,
                    <td key={`${blockName}-pc`} className="mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(cumAmt)}</td>,
                    <td key={`${blockName}-tp`}></td>,
                    <td key={`${blockName}-ta`} className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>{fmt(thisAmt)}</td>,
                  ];
                })}
              </tr>
            </tfoot>
          </table>
        )}

        {/* ── INFRA ── */}
        {activeTabId === 'infra' && (() => {
          const infraGrouped: Record<string, number[]> = {};
          infraBillingMilestones.forEach((m: any, idx: number) => {
            const sec = m.category || 'General';
            if (!infraGrouped[sec]) infraGrouped[sec] = [];
            infraGrouped[sec].push(idx);
          });

          return (
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="left" style={{ width: 44 }}>#</th>
                  <th className="left" style={{ minWidth: 320 }}>Milestone</th>
                  <th style={{ width: 140 }}>Scope (₹)</th>
                  <th style={{ width: 150 }}>Prev Cum (₹)</th>
                  <th style={{ width: 130 }}>Remaining (₹)</th>
                  <th style={{ width: 90, background: '#eef4ff', color: '#1146a8' }}>This %</th>
                  <th style={{ width: 150, background: '#eef4ff', color: '#1146a8' }}>This ₹</th>
                  <th style={{ width: 90 }}>New Cum %</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(infraGrouped).map(([cat, indices]) => {
                  const col = CAT_COLORS[cat] || '#1a56b0';
                  return (
                    <Fragment key={cat}>
                      <tr>
                        <td colSpan={8} style={{ background: col, color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px' }}>
                          {cat}
                        </td>
                      </tr>
                      {indices.map(idx => {
                        const m = infraBillingMilestones[idx];
                        const ent = infra[idx];
                        const scope = m.scopeAmount;
                        const cumAmt = m.cumAmt;
                        const cumPct = m.cumPct * 100;
                        const maxAmt = Math.max(0, scope - cumAmt);
                        const maxPct = Math.max(0, 100 - cumPct);
                        const thisPct = ent?.pct || 0;
                        const thisAmt = ent?.amt || 0;
                        const newCum = Math.min(cumPct + thisPct, 100);
                        const cellKey = `i-${idx}`;
                        const isCapped = cappedCells.has(cellKey);
                        const isComplete = cumPct >= 99.9;

                        return (
                          <tr key={idx} style={{ background: thisAmt > 0 ? '#eef4ff30' : undefined }}>
                            <td className="sno">{m.sno}</td>
                            <td className="left" style={{ fontSize: 11 }}>
                              <div style={{ fontWeight: 600 }}>{m.description.slice(0, 100)}{m.description.length > 100 ? '…' : ''}</div>
                              <div style={{ marginTop: 4, height: 4, background: '#e2e8f0', borderRadius: 2, width: 160, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                  <div style={{ width: `${Math.min(cumPct, 100)}%`, background: col + '50' }} />
                                  <div style={{ width: `${Math.min(thisPct, 100)}%`, background: col }} />
                                </div>
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: 11, color: '#475569' }}>{fmt(scope)}</td>
                            <td>
                              <div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{fmt(cumAmt)}</div>
                              <div style={{ fontSize: 9, color: col }}>{cumPct.toFixed(1)}%</div>
                            </td>
                            <td className="mono">
                              {isComplete ? <span style={{ color: '#0e6d41', fontSize: 10 }}>completed</span> : (
                                <>
                                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: maxAmt < scope * 0.1 ? '#b91c1c' : '#b45309', fontWeight: 600 }}>{fmt(maxAmt)}</div>
                                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{maxPct.toFixed(1)}% left</div>
                                </>
                              )}
                            </td>
                            <td style={{ padding: 4, background: '#eef4ff' }}>
                              {!isComplete && <input type="number" min="0" max={maxPct.toFixed(1)} step="0.1" value={thisPct > 0 ? thisPct.toFixed(2) : ''} disabled={isLocked} style={inp(col, isCapped)} onChange={e => setInfraPct(idx, parseFloat(e.target.value) || 0)} />}
                            </td>
                            <td style={{ padding: 4, background: '#eef4ff' }}>
                              {!isComplete && <input type="number" min="0" max={Math.round(maxAmt)} step="1000" value={thisAmt > 0 ? Math.round(thisAmt) : ''} disabled={isLocked} style={inp(col, isCapped)} onChange={e => setInfraAmt(idx, parseFloat(e.target.value) || 0)} />}
                            </td>
                            <td className="mono" style={{ fontSize: 11, fontWeight: 700, color: newCum >= 99.9 ? '#0e6d41' : col }}>{newCum.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#0f2044' }}>
                  <td colSpan={2} className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>TOTAL INFRA — RA-{raNumber}</td>
                  <td className="mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{fmt(infraBillingMilestones.reduce((s, m) => s + m.scopeAmount, 0))}</td>
                  <td className="mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(infraBillingMilestones.reduce((s, m) => s + m.cumAmt, 0))}</td>
                  <td className="mono" style={{ color: '#fde68a' }}>{fmt(infraBillingMilestones.reduce((s, m) => s + Math.max(0, m.scopeAmount - m.cumAmt), 0))}</td>
                  <td></td>
                  <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>{fmt(infraTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          );
        })()}

        {/* ── DYNAMIC BOQS ── */}
        {(() => {
          const boq = boqs.find(b => b.id === activeTabId);
          if (!boq) return null;
          const items = getBOQMilestonesByRA(raNumber, boq.id);
          const entries = boqEntries[boq.id] || {};
          const grouped: Record<string, number[]> = {};
          items.forEach((m: any, idx: number) => {
            const sec = m.section || 'General';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(idx);
          });
          const totalThis = Object.values(entries).reduce((s, v) => s + (v?.amt || 0), 0);
          return (
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="left" style={{ width: 44 }}>#</th>
                  <th className="left" style={{ minWidth: 320 }}>Item Details</th>
                  <th style={{ width: 140 }}>Scope (₹)</th>
                  <th style={{ width: 150 }}>Prev Cum (₹)</th>
                  <th style={{ width: 130 }}>Remaining (₹)</th>
                  <th style={{ width: 90, background: '#f5f3ff', color: '#7c3aed' }}>This %</th>
                  <th style={{ width: 150, background: '#f5f3ff', color: '#7c3aed' }}>This ₹</th>
                  <th style={{ width: 90 }}>New Cum %</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([sec, indices]) => (
                  <Fragment key={sec}>
                    <tr>
                      <td colSpan={8} style={{ background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px' }}>{sec}</td>
                    </tr>
                    {indices.map(idx => {
                      const m = items[idx];
                      const ent = entries[idx];
                      const scope = m.amount;
                      const cumAmt = m.cumAmt;
                      const cumPct = m.cumPct * 100;
                      const maxAmt = Math.max(0, scope - cumAmt);
                      const maxPct = Math.max(0, 100 - cumPct);
                      const thisPct = ent?.pct || 0;
                      const thisAmt = ent?.amt || 0;
                      const newCum = Math.min(cumPct + thisPct, 100);
                      const cellKey = `q-${boq.id}-${idx}`;
                      const isCapped = cappedCells.has(cellKey);
                      return (
                        <tr key={idx} style={{ background: thisAmt > 0 ? '#f5f3ff30' : undefined }}>
                          <td className="sno">{m.sno}</td>
                          <td className="left" style={{ fontSize: 11 }}>
                            <div style={{ fontWeight: 600 }}>{m.description}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.uom} | {m.qty} @ {m.rate} (Wt: {m.weightage ?? 100}%)</div>
                          </td>
                          <td className="mono" style={{ fontSize: 11, color: '#475569' }}>{fmt(scope)}</td>
                          <td>
                            <div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{fmt(cumAmt)}</div>
                            <div style={{ fontSize: 9, color: '#7c3aed' }}>{cumPct.toFixed(1)}%</div>
                          </td>
                          <td className="mono" style={{ fontSize: 11 }}>{fmt(maxAmt)}</td>
                          <td style={{ padding: 4, background: '#f5f3ff' }}>
                            <input type="number" min="0" max={maxPct.toFixed(1)} step="0.1" value={thisPct > 0 ? thisPct.toFixed(2) : ''} disabled={isLocked} style={inp('#7c3aed', isCapped)} onChange={e => setBoqPct(boq.id, idx, parseFloat(e.target.value) || 0)} />
                          </td>
                          <td style={{ padding: 4, background: '#f5f3ff' }}>
                            <input type="number" min="0" max={Math.round(maxAmt)} step="1000" value={thisAmt > 0 ? Math.round(thisAmt) : ''} disabled={isLocked} style={inp('#7c3aed', isCapped)} onChange={e => setBoqAmt(boq.id, idx, parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="mono" style={{ fontSize: 11, fontWeight: 700, color: newCum >= 99.9 ? '#0e6d41' : '#7c3aed' }}>{newCum.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#0f2044' }}>
                  <td colSpan={2} className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>TOTAL {boq.name.toUpperCase()} — RA-{raNumber}</td>
                  <td className="mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{fmt(items.reduce((s, m) => s + m.amount, 0))}</td>
                  <td className="mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(items.reduce((s, m) => s + m.cumAmt, 0))}</td>
                  <td className="mono" style={{ color: '#fde68a' }}>{fmt(items.reduce((s, m) => s + Math.max(0, m.amount - m.cumAmt), 0))}</td>
                  <td></td>
                  <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>{fmt(totalThis)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          );
        })()}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #d1d5db',
        background: '#f8fafc', display: 'flex', gap: 16,
        alignItems: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          RA-{raNumber} Total:&nbsp;
          {boqs.map((boq, idx) => {
            let val = 0;
            let col = '#7c3aed';
            let label = boq.name;
            if (boq.id === 'boq-bldg-legacy') { val = bldgTotal; col = '#1e40af'; label = 'Bldg'; }
            else if (boq.id === 'boq-infra-legacy') { val = infraTotal; col = '#166534'; label = 'Infra'; }
            else { val = Object.values(boqEntries[boq.id] || {}).reduce((s, v) => s + (v?.amt || 0), 0); }

            if (val === 0) return null;
            return <strong key={boq.id} style={{ fontFamily: 'monospace', color: col }}>{label} ₹{fmt(val)}&nbsp;+&nbsp;</strong>;
          })}
          <strong style={{ fontFamily: 'monospace', color: '#0e6d41', fontSize: 14 }}>₹{fmt(grandTotal)}</strong>
        </span>
        <button onClick={handleSave} disabled={raNumber === currentRA || isLocked} style={{
          marginLeft: 'auto', padding: '7px 20px', borderRadius: 6,
          border: 'none', cursor: (raNumber === currentRA || isLocked) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          background: (raNumber === currentRA || isLocked) ? '#e2e8f0' : unsaved ? '#1a56b0' : '#dcfce7',
          color: (raNumber === currentRA || isLocked) ? '#94a3b8' : unsaved ? '#fff' : '#166534',
        }}>
          {isLocked ? '🔒 Approved (ReadOnly)' : raNumber === currentRA ? 'Read-only' : unsaved ? `💾 Save RA-${raNumber}` : '✓ Saved'}
        </button>
      </div>
    </div>
  );
}
