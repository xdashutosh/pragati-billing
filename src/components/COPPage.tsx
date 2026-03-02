'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RABillData, COPData, COPStatus, COPAdjustmentLine,
  loadCOP, saveCOP, loadAllCOPs,
} from '@/lib/raStore';
import { useVendor } from '@/lib/VendorContext';
import { fmt, toWords } from '@/lib/utils';
import SignatureCanvas from './SignatureCanvas';

interface ApprovalEntry {
  level: number;
  label: string;
  role: string;
  status: 'pending' | 'signed' | 'rejected';
  signedBy?: string;
  designation?: string;
  signedAt?: string;
  signature?: string;
  note?: string;
}

function uid() { return Math.random().toString(36).slice(2, 8); }


const GST = 0.09;

const APPROVAL_STAGES = [
  { level: 1, label: 'Checked By', role: 'Site Engineer / QS', nextStatus: 'l1_approved' as COPStatus },
  { level: 2, label: 'Verified By', role: 'Project Manager', nextStatus: 'l2_approved' as COPStatus },
  { level: 3, label: 'Certified By', role: 'PMC / Client Representative', nextStatus: 'l3_approved' as COPStatus },
  { level: 4, label: 'Approved By', role: 'Client Authorized Signatory', nextStatus: 'approved' as COPStatus },
];

type StatusCfg = { label: string; color: string; bg: string; border: string; step: number };
const STATUS_MAP: Record<string, StatusCfg> = {
  draft: { label: 'Draft', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', step: 0 },
  prepared: { label: 'Prepared', color: '#1e40af', bg: '#eff6ff', border: '#93c5fd', step: 1 },
  l1_approved: { label: 'L1 Checked', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc', step: 2 },
  l2_approved: { label: 'L2 Verified', color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', step: 3 },
  l3_approved: { label: 'L3 Certified', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', step: 4 },
  approved: { label: 'Fully Approved', color: '#166534', bg: '#f0fdf4', border: '#86efac', step: 5 },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', step: -1 },
};
const scfg = (s?: string): StatusCfg => STATUS_MAP[s ?? 'draft'] ?? STATUS_MAP.draft;

// Which approval level is awaiting signature?
const pendingLevel = (status: string): number | null =>
  ({ prepared: 1, l1_approved: 2, l2_approved: 3, l3_approved: 4 } as Record<string, number>)[status] ?? null;

const defaultApprovals = (): ApprovalEntry[] =>
  APPROVAL_STAGES.map(s => ({ level: s.level, label: s.label, role: s.role, status: 'pending' }));

interface Props {
  allRAs: RABillData[];
  onCOPSave: () => void;
  materialDeductionThis: number;
  activeHoldsTotal: number;
  releasedHoldsTotal: number;
  vendorId?: string;
  showApprovalsOnly?: boolean;
}

export default function COPPage({ allRAs, onCOPSave, materialDeductionThis, activeHoldsTotal, releasedHoldsTotal, vendorId = 'lpw' }: Props) {
  const vendor = useVendor();
  const { billingSummaryTotals, defaultMaterialRows: MATERIAL_DATA, defaultHoldItems: HOLD_DATA } = vendor;
  const [raNumber, setRaNumber] = useState<number | null>(null);
  const [cop, setCOP] = useState<any | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [allCOPs, setAllCOPs] = useState<any[]>([]);
  const [retentionPct, setRetentionPct] = useState(5);
  const [mobAdvance, setMobAdvance] = useState(0);
  const [advRecovery, setAdvRecovery] = useState(0);
  const [paymentReceived, setPaymentReceived] = useState(0);
  const [hLines, setHLines] = useState<COPAdjustmentLine[]>([]);
  const [adhocPct, setAdhocPct] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'approve'>('details');
  const [sigName, setSigName] = useState('');
  const [sigDesig, setSigDesig] = useState('');
  const [sigNote, setSigNote] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => { setAllCOPs(loadAllCOPs(vendorId)); }, [vendorId]);

  useEffect(() => {
    if (raNumber === null) { setCOP(null); return; }
    const saved = loadCOP(raNumber, vendorId);
    if (saved) {
      setRetentionPct((saved as any).retentionPct ?? 5);
      setMobAdvance((saved as any).mobAdvance ?? 0);
      setAdvRecovery((saved as any).advanceRecovery ?? 0);
      setPaymentReceived((saved as any).paymentReceived ?? 0);
      setHLines((saved as any).hLines ?? []);
      setAdhocPct((saved as any).adhocPct ?? 0);
      setCOP(saved);
    } else {
      setRetentionPct(5); setMobAdvance(0); setAdvRecovery(0);
      setPaymentReceived(0); setHLines([]); setAdhocPct(0);
      setCOP(null);
    }
    setUnsaved(false);
    setSigName(''); setSigDesig(''); setSigNote(''); setRejectMode(false);
  }, [raNumber]);

  // ── Calculations ─────────────────────────────────────────────────────────
  const base = billingSummaryTotals;
  const ra = allRAs.find(r => r.raNumber === raNumber) ?? null;
  const A_this = ra?.grandTotal ?? 0, A_prev = base.prevBillAmount, A_total = A_prev + A_this;
  const B_total = mobAdvance, B_prev = mobAdvance, B_this = 0;
  const cgst_this = A_this * GST, cgst_prev = A_prev * GST, cgst_total = A_total * GST;
  const sgst_this = A_this * GST, sgst_prev = A_prev * GST, sgst_total = A_total * GST;
  const C_this = cgst_this + sgst_this, C_prev = cgst_prev + sgst_prev, C_total = cgst_total + sgst_total;
  const D_this = A_this + B_this + C_this, D_prev = A_prev + B_prev + C_prev, D_total = A_total + B_total + C_total;
  const E_this = advRecovery, E_prev = 0, E_total = advRecovery;
  const ret_this = D_this * (retentionPct / 100), ret_prev = D_prev * (retentionPct / 100), ret_total = D_total * (retentionPct / 100);
  const mat_prev = MATERIAL_DATA.reduce((s, r) => s + r.prev, 0);
  const mat_this = materialDeductionThis, mat_total = mat_prev + mat_this;
  const hold_total = activeHoldsTotal, hold_prev = activeHoldsTotal, hold_this = 0;
  const F_this = ret_this + mat_this + hold_this, F_prev = ret_prev + mat_prev + hold_prev, F_total = ret_total + mat_total + hold_total;
  const G_this = D_this - E_this - F_this, G_prev = D_prev - E_prev - F_prev, G_total = D_total - E_total - F_total;
  const adhoc_this = G_this * (adhocPct / 100), adhoc_prev = G_prev * (adhocPct / 100), adhoc_total = G_total * (adhocPct / 100);
  const custom_this = hLines.reduce((s, l) => s + l.amount, 0);
  const H_this = adhoc_this + custom_this, H_prev = adhoc_prev, H_total = adhoc_total + custom_this;
  const I_this = releasedHoldsTotal, I_prev = 0, I_total = releasedHoldsTotal;
  const J_this = G_this - H_this + I_this, J_prev = G_prev - H_prev + I_prev, J_total = G_total - H_total + I_total;
  const paymentDue = J_this - paymentReceived;
  const contractBasic = base.orderAmount, contractWithTax = contractBasic * (1 + GST * 2);
  const billedPct = contractBasic > 0 ? (A_total / contractBasic) * 100 : 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getApprovals = (): ApprovalEntry[] => cop?.approvals ?? defaultApprovals();
  const isEditable = !cop || cop.status === 'draft';

  const buildData = (overrides: Record<string, unknown> = {}) => {
    const ra2 = allRAs.find(r => r.raNumber === raNumber);
    return {
      raNumber, copNumber: `COP-${raNumber}`,
      savedAt: new Date().toISOString(),
      status: cop?.status ?? 'draft',
      statusNote: cop?.statusNote ?? '',
      statusUpdatedAt: cop?.statusUpdatedAt ?? new Date().toISOString(),
      raBuildingTotal: ra2?.buildingTotal ?? 0, raInfraTotal: ra2?.infraTotal ?? 0, raGrandTotal: ra2?.grandTotal ?? A_this,
      materialDeduction: mat_this, retentionPct, retentionAmt: ret_this,
      advanceRecovery: advRecovery, holdRelease: I_this, customLines: hLines,
      grossAmount: D_this, totalDeductions: F_this, totalAdditions: I_this, netPayable: J_this,
      mobAdvance, adhocPct, hLines, paymentReceived, approvals: getApprovals(),
      ...overrides,
    };
  };

  const persist = (data: any) => {
    saveCOP(data, vendorId); setCOP(data); setUnsaved(false); setAllCOPs(loadAllCOPs(vendorId)); onCOPSave();
  };

  const handleSave = () => { if (!raNumber) return; persist(buildData()); };
  const handlePrepare = () => {
    if (!raNumber) return;
    persist(buildData({ status: 'prepared', approvals: defaultApprovals(), statusUpdatedAt: new Date().toISOString() }));
    setActiveTab('approve');
  };
  const handleResetDraft = () => {
    persist(buildData({ status: 'draft', approvals: defaultApprovals(), statusUpdatedAt: new Date().toISOString() }));
    setActiveTab('details'); setRejectMode(false);
  };

  // Called by SignatureCanvas "Save Signature"
  const handleSign = (dataUrl: string) => {
    if (!cop) return;
    const level = pendingLevel(cop.status);
    if (!level) return;
    const stage = APPROVAL_STAGES.find(s => s.level === level)!;
    const approvals = getApprovals().map(a =>
      a.level === level
        ? { ...a, status: 'signed' as const, signedBy: sigName || 'Authorized', designation: sigDesig, note: sigNote, signedAt: new Date().toISOString(), signature: dataUrl }
        : a
    );
    persist(buildData({ approvals, status: stage.nextStatus, statusUpdatedAt: new Date().toISOString() }));
    setSigName(''); setSigDesig(''); setSigNote('');
  };

  const handleReject = () => {
    if (!cop) return;
    const level = pendingLevel(cop.status);
    const approvals = getApprovals().map(a =>
      a.level === level ? { ...a, status: 'rejected' as const, note: rejectNote, signedBy: sigName || 'Reviewer', signedAt: new Date().toISOString() } : a
    );
    persist(buildData({ approvals, status: 'rejected', statusNote: rejectNote, statusUpdatedAt: new Date().toISOString() }));
    setRejectMode(false); setRejectNote('');
  };

  const cfg = scfg(cop?.status);
  const approvals = getApprovals();
  const currentLevel = cop ? pendingLevel(cop.status) : null;
  const currentStage = currentLevel ? APPROVAL_STAGES.find(s => s.level === currentLevel) : null;
  const isInApproval = !!(cop && currentLevel);
  const isFullyApproved = cop?.status === 'approved';
  const isRejected = cop?.status === 'rejected';

  // ── Certificate row components ────────────────────────────────────────────
  type CV = number | null | undefined;
  const fc = (v: CV) => v === undefined ? '' : v === null ? <span style={{ color: '#d1d5db' }}>–</span> : fmt(v);

  const DR = ({ rl = '', desc, td, pv, tv, in: ind = 0, bold = false }: { rl?: string; desc: string; td?: CV; pv?: CV; tv?: CV; in?: number; bold?: boolean }) => (
    <tr style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '5px 8px', width: 36, fontSize: 10, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{rl}</td>
      <td style={{ padding: `5px 8px 5px ${8 + ind * 14}px`, fontSize: 11, color: bold ? '#0f2044' : '#374151', fontWeight: bold ? 700 : 400 }}>{desc}</td>
      <td style={mc(bold)}>{fc(td)}</td>
      <td style={mc(bold)}>{fc(pv)}</td>
      <td style={{ ...mc(bold), color: bold ? '#0f2044' : '#1e40af', fontWeight: bold ? 800 : 600 }}>{fc(tv)}</td>
    </tr>
  );

  const SH = ({ rl = '', label, colored = false }: { rl?: string; label: string; colored?: boolean }) => (
    <tr style={{ background: colored ? '#fef9f0' : '#f1f5f9', borderTop: '2px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '6px 8px', fontSize: 10, color: '#64748b', fontWeight: 700 }}>{rl}</td>
      <td colSpan={4} style={{ padding: '6px 8px', fontSize: 11, color: '#0f2044', fontWeight: 800, letterSpacing: '0.03em' }}>{label}</td>
    </tr>
  );

  const ST = ({ desc, td, pv, tv }: { desc: string; td: number; pv: number; tv: number }) => (
    <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
      <td style={{ padding: '6px 8px', fontSize: 10 }} />
      <td style={{ padding: '6px 8px', fontSize: 11, color: '#0f2044', fontWeight: 700 }}>{desc}</td>
      <td style={{ ...mc(true), borderLeft: '2px solid #e2e8f0' }}>{fmt(td)}</td>
      <td style={{ ...mc(true), borderLeft: '2px solid #e2e8f0' }}>{fmt(pv)}</td>
      <td style={{ ...mc(true), borderLeft: '2px solid #e2e8f0', color: '#0f2044' }}>{fmt(tv)}</td>
    </tr>
  );

  const HT = ({ rl = '', desc, td, pv, tv, color }: { rl?: string; desc: string; td: number; pv: number; tv: number; color: string }) => (
    <tr style={{ background: '#fff', borderTop: `3px solid ${color}`, borderBottom: `1px solid ${color}20` }}>
      <td style={{ padding: '8px', fontSize: 11, color, fontWeight: 900, borderLeft: `4px solid ${color}` }}>{rl}</td>
      <td style={{ padding: '8px', fontSize: 11, color, fontWeight: 900 }}>{desc}</td>
      <td style={{ ...mc(true), color }}>{fmt(td)}</td>
      <td style={{ ...mc(true), color }}>{fmt(pv)}</td>
      <td style={{ ...mc(true), color, fontWeight: 900, fontSize: 13 }}>{fmt(tv)}</td>
    </tr>
  );

  const SP = () => <tr><td colSpan={5} style={{ height: 5, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }} /></tr>;

  return (
    <div style={{ background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #d1d5db', background: '#fff', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2044' }}>Certificate of Payment</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Auto-wired · Materials &amp; Holds pull live</div>
          </div>
          {cop && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`Mat: ₹${fmt(materialDeductionThis)}`} bg="#fef2f2" color="#b91c1c" />
          <Chip label={`Holds: ₹${fmt(activeHoldsTotal)}`} bg="#fff7ed" color="#b45309" />
          <Chip label={`Released: ₹${fmt(releasedHoldsTotal)}`} bg="#f0fdf4" color="#166534" />
          {raNumber && <button onClick={() => window.print()} style={bs('#475569', '#fff', '#d1d5db')}>🖨 Print</button>}
          {raNumber && isEditable && (
            <button onClick={handleSave} style={{ padding: '5px 16px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: unsaved ? '#1a56b0' : '#dcfce7', color: unsaved ? '#fff' : '#166534' }}>
              {unsaved ? '💾 Save COP' : '✓ Saved'}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ═══ LEFT PANEL ══════════════════════════════════════════════════════ */}
        <div style={{ width: 292, flexShrink: 0, borderRight: '1px solid #d1d5db', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* RA selector */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 }}>Select RA Bill</div>
            {allRAs.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>No saved RA bills yet.</p>}
            {allRAs.map(ra2 => {
              const active = raNumber === ra2.raNumber;
              const cs = allCOPs.find((c: any) => c.raNumber === ra2.raNumber)?.status;
              const cc = scfg(cs);
              return (
                <button key={ra2.raNumber} onClick={() => { setRaNumber(ra2.raNumber); setUnsaved(true); }} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  marginBottom: 4, textAlign: 'left' as const, fontFamily: 'inherit',
                  border: `1.5px solid ${active ? '#1a56b0' : '#d1d5db'}`,
                  background: active ? '#1a56b0' : '#fff', color: active ? '#fff' : '#0f2044',
                }}>
                  <span>RA-{ra2.raNumber}</span>
                  {cs ? <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: active ? 'rgba(255,255,255,0.2)' : cc.bg, color: active ? '#fff' : cc.color }}>{cc.label}</span>
                    : <span style={{ opacity: 0.6, fontSize: 10 }}>+ New</span>}
                </button>
              );
            })}
          </div>

          {raNumber && (
            <>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
                {(['details', 'approve'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'transparent',
                    color: activeTab === tab ? '#1a56b0' : '#64748b',
                    borderBottom: `2px solid ${activeTab === tab ? '#1a56b0' : 'transparent'}`,
                  }}>
                    {tab === 'details' ? '📝 COP Details' : '✅ Approvals'}
                  </button>
                ))}
              </div>

              {/* ─── DETAILS TAB ─── */}
              {activeTab === 'details' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!isEditable && (
                    <div style={{ padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 10, color: '#b45309' }}>
                      ⚠️ Locked in <strong>{cfg.label}</strong>.{' '}
                      <button onClick={handleResetDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontWeight: 700, fontSize: 10, padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>Reset to Draft</button>
                    </div>
                  )}

                  <PS title="(B) Mobilisation Advance" color="#1e40af">
                    <LI label="Amount disbursed (₹)" value={mobAdvance} disabled={!isEditable} onChange={v => { setMobAdvance(v); setUnsaved(true); }} />
                  </PS>
                  <PS title="(E) Advance Recovery" color="#b45309">
                    <LI label="Recovery this bill (₹)" value={advRecovery} disabled={!isEditable} onChange={v => { setAdvRecovery(v); setUnsaved(true); }} />
                  </PS>

                  <PS title="(F) Retention %" color="#b91c1c">
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Retention %</div>
                    <input type="number" min={0} max={20} step={0.5} value={retentionPct} disabled={!isEditable}
                      onChange={e => { setRetentionPct(parseFloat(e.target.value) || 0); setUnsaved(true); }}
                      style={is('#fca5a5', '#b91c1c', !isEditable)} />
                    <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4 }}>= ₹{fmt(ret_this)} this bill</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                      Material dedn (auto): <strong style={{ color: '#b91c1c' }}>₹{fmt(mat_this)}</strong><br />
                      Active holds (auto): <strong style={{ color: '#b45309' }}>₹{fmt(activeHoldsTotal)}</strong>
                    </div>
                  </PS>

                  <PS title="(H) Recoveries / Penalties" color="#6b21a8">
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Adhoc % (of net G)</div>
                    <input type="number" min={0} max={100} step={5} value={adhocPct} disabled={!isEditable}
                      onChange={e => { setAdhocPct(parseFloat(e.target.value) || 0); setUnsaved(true); }}
                      style={is('#ddd6fe', '#6b21a8', !isEditable)} />
                    {adhocPct > 0 && <div style={{ fontSize: 10, color: '#6b21a8', marginTop: 4 }}>= ₹{fmt(adhoc_this)}</div>}
                    <div style={{ fontSize: 10, color: '#64748b', margin: '8px 0 4px' }}>Custom penalty lines</div>
                    {hLines.map((line, i) => (
                      <div key={line.id} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input type="text" value={line.label} placeholder="Description" disabled={!isEditable}
                          onChange={e => { const n = [...hLines]; n[i] = { ...n[i], label: e.target.value }; setHLines(n); setUnsaved(true); }}
                          style={{ flex: 2, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 10, outline: 'none' }} />
                        <input type="number" value={line.amount || ''} placeholder="₹" disabled={!isEditable}
                          onChange={e => { const n = [...hLines]; n[i] = { ...n[i], amount: parseFloat(e.target.value) || 0 }; setHLines(n); setUnsaved(true); }}
                          style={{ flex: 1, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', outline: 'none' }} />
                        {isEditable && <button onClick={() => { setHLines(hLines.filter((_, j) => j !== i)); setUnsaved(true); }}
                          style={{ padding: '2px 7px', border: '1px solid #fecaca', borderRadius: 4, background: '#fff5f5', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>×</button>}
                      </div>
                    ))}
                    {isEditable && <button onClick={() => { setHLines([...hLines, { id: uid(), label: '', type: 'deduction', amount: 0 }]); setUnsaved(true); }}
                      style={{ width: '100%', padding: '4px', border: '1px dashed #a78bfa', borderRadius: 4, background: 'transparent', color: '#6b21a8', fontSize: 10, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>+ Add line</button>}
                  </PS>

                  <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 2 }}>(I) Hold Releases — auto-wired</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#166534' }}>₹{fmt(releasedHoldsTotal)}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Toggle in Hold &amp; Release page</div>
                  </div>

                  <PS title="Payment Received" color="#0e6d41">
                    <LI label="Amount received (₹)" value={paymentReceived} disabled={!isEditable} onChange={v => { setPaymentReceived(v); setUnsaved(true); }} />
                    <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 5, background: paymentDue > 0 ? '#fef2f2' : '#f0fdf4' }}>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Net payment due</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: paymentDue > 0 ? '#b91c1c' : '#0e6d41' }}>₹{fmt(Math.abs(paymentDue))}</div>
                    </div>
                  </PS>

                  {isEditable && (
                    <button onClick={handlePrepare} style={{ padding: 11, borderRadius: 7, border: 'none', background: '#0f2044', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      ✅ Prepare &amp; Send for Approval →
                    </button>
                  )}
                </div>
              )}

              {/* ─── APPROVALS TAB ─── */}
              {activeTab === 'approve' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                  {/* Progress stepper */}
                  <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 12 }}>Approval Progress</div>

                    {/* Step 0 — Prepared */}
                    <SR label="Prepared by Contractor" sub="COP locked &amp; submitted" done={cfg.step >= 1} active={cfg.step === 0 && cop?.status !== 'draft'} idx={0} />

                    {/* Steps 1–4 */}
                    {APPROVAL_STAGES.map((stage, i) => {
                      const entry = approvals[i];
                      const done = entry?.status === 'signed';
                      const active = currentLevel === stage.level && !isRejected;
                      return (
                        <SR key={stage.level}
                          label={stage.label}
                          sub={done ? `${entry.signedBy}${entry.designation ? ` · ${entry.designation}` : ''}` : stage.role}
                          done={done} active={active} rejected={entry?.status === 'rejected'} idx={i + 1} />
                      );
                    })}

                    {isRejected && (
                      <div style={{ marginTop: 8, padding: '7px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 10, color: '#b91c1c' }}>
                        ❌ {cop?.statusNote || 'Rejected'}<br />
                        <button onClick={handleResetDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700, fontSize: 10, padding: '4px 0 0', textDecoration: 'underline', fontFamily: 'inherit' }}>↩ Reset &amp; Edit</button>
                      </div>
                    )}
                  </div>

                  {/* Active signing area */}
                  <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

                    {(!cop || cop.status === 'draft') && (
                      <div style={{ padding: 16, background: '#f8fafc', border: '1px dashed #d1d5db', borderRadius: 8, textAlign: 'center' as const }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 6 }}>COP not prepared yet</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>Go to <strong>COP Details</strong> → fill fields → click <strong>"Prepare &amp; Send for Approval"</strong></div>
                      </div>
                    )}

                    {/* Current level awaiting signature */}
                    {isInApproval && currentStage && !rejectMode && (
                      <>
                        <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>✍️ Level {currentLevel} of 4 — {currentStage.label}</div>
                          <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2 }}>{currentStage.role}</div>
                        </div>

                        {/* Name / designation / note fields */}
                        <FLD label="Full Name *" value={sigName} onChange={setSigName} placeholder="e.g. Rajiv Kumar" />
                        <FLD label="Designation" value={sigDesig} onChange={setSigDesig} placeholder="e.g. Project Manager" />
                        <FLD label="Note (optional)" value={sigNote} onChange={setSigNote} placeholder="Any remarks..." />

                        {/* Signature canvas */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            Draw Signature
                            <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6, fontSize: 9 }}>mouse or touch</span>
                          </div>
                          <div style={{ border: '2px solid #93c5fd', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                            <SignatureCanvas onSave={handleSign} onClear={() => { }} />
                          </div>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 5, textAlign: 'center' as const }}>
                            Draw above → click <strong>Save Signature</strong> to approve &amp; advance
                          </div>
                        </div>

                        <button onClick={() => setRejectMode(true)} style={{ padding: '7px', borderRadius: 5, border: '1px solid #fecaca', background: '#fff5f5', color: '#b91c1c', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          ❌ Reject this COP
                        </button>
                      </>
                    )}

                    {/* Reject form */}
                    {isInApproval && rejectMode && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>❌ Reject Certificate of Payment</div>
                          <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 2 }}>Contractor will need to revise and re-submit.</div>
                        </div>
                        <FLD label="Your Name" value={sigName} onChange={setSigName} placeholder="Reviewer name" />
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Reason for rejection *</div>
                          <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                            placeholder="e.g. Retention calc incorrect, material deduction missing..."
                            rows={3}
                            style={{ width: '100%', padding: '7px 9px', borderRadius: 5, border: '1px solid #fca5a5', fontSize: 11, outline: 'none', boxSizing: 'border-box' as const, resize: 'none' as const, fontFamily: 'inherit' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setRejectMode(false)} style={{ flex: 1, padding: '8px', borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Cancel</button>
                          <button onClick={handleReject} style={{ flex: 1, padding: '8px', borderRadius: 5, border: 'none', background: '#b91c1c', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>Confirm Reject</button>
                        </div>
                      </div>
                    )}

                    {/* Fully approved */}
                    {isFullyApproved && (
                      <div style={{ padding: 20, background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, textAlign: 'center' as const }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>COP Fully Approved</div>
                        <div style={{ fontSize: 11, color: '#0e6d41', marginTop: 4, marginBottom: 12 }}>All 4 levels signed. Ready for payment.</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#0e6d41' }}>₹{fmt(J_this)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Net Payable This Bill</div>
                      </div>
                    )}

                    {/* Completed signatures log */}
                    {approvals.some(a => a.status === 'signed') && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 }}>Signed</div>
                        {approvals.filter(a => a.status === 'signed').map(a => (
                          <div key={a.level} style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534' }}>✓ L{a.level} {a.label}</div>
                              <div style={{ fontSize: 11, color: '#0f2044', marginTop: 1 }}>{a.signedBy}</div>
                              {a.designation && <div style={{ fontSize: 10, color: '#64748b' }}>{a.designation}</div>}
                              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{a.signedAt ? new Date(a.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
                            </div>
                            {a.signature && <img src={a.signature} alt="sig" style={{ height: 38, maxWidth: 80, objectFit: 'contain', borderRadius: 4, border: '1px solid #d1fae5' }} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!raNumber && <div style={{ textAlign: 'center' as const, color: '#94a3b8', fontSize: 11, padding: 24, lineHeight: 1.7 }}>Select an RA bill above to generate its Certificate of Payment</div>}
        </div>

        {/* ═══ RIGHT — Certificate ═════════════════════════════════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: 20 }}>
          {!raNumber ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' as const, color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Select an RA bill to generate its Certificate of Payment</div>
              </div>
            </div>
          ) : (
            <div id="cop-print-area" style={{ maxWidth: 920, margin: '0 auto', background: '#fff', border: '1px solid #d1d5db', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

              {/* HEADER */}
              <div style={{ padding: '16px 20px', borderBottom: '3px solid #0f2044', background: '#fff' }}>
                <div style={{ textAlign: 'center' as const, fontSize: 16, fontWeight: 900, color: '#0f2044', letterSpacing: 2, marginBottom: 14 }}>PAYMENT CERTIFICATE</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, border: '1px solid #d1d5db', fontSize: 10 }}>
                  <tbody>
                    {([
                      ['Project', vendor.projectName, 'Trade', 'EPC Turnkey — Civil, MEP & Infra Works'],
                      ['Invoice to', vendor.client, 'PO No.', vendor.woNumber],
                      ['GSTIN (Client)', '–', 'PO Date', vendor.woDate],
                      ['Vendor', vendor.contractor, 'Tax Invoice No & Date', `${cop?.copNumber ?? `COP-${raNumber}`} / ${new Date().toLocaleDateString('en-IN')}`],
                      ['Address', vendor.projectName, 'Payment Certificate No.', cop?.copNumber ?? `COP-${raNumber}`],
                      ['GST No.', '–', 'This Bill No.', `RA Bill - ${raNumber}`],
                    ] as [string, string, string, string][]).map(([l1, v1, l2, v2], i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 8px', color: '#64748b', width: '10%', whiteSpace: 'nowrap' as const }}>{l1}</td>
                        <td style={{ padding: '4px 8px', color: '#0f2044', fontWeight: 600, width: '38%', borderRight: '1px solid #d1d5db' }}>: {v1}</td>
                        <td style={{ padding: '4px 8px', color: '#64748b', width: '12%', whiteSpace: 'nowrap' as const }}>{l2}</td>
                        <td style={{ padding: '4px 8px', color: '#0f2044', fontWeight: 600, width: '40%' }}>: {v2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, border: '1px solid #d1d5db', borderTop: 'none', fontSize: 10 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '5px 8px', width: '25%', borderRight: '1px solid #d1d5db', background: '#f8fafc' }}><span style={{ color: '#64748b' }}>ALL AMOUNTS ARE IN</span> <strong style={{ color: '#0f2044' }}>INR</strong></td>
                      <td style={{ padding: '5px 8px', width: '25%', borderRight: '1px solid #d1d5db', background: '#f8fafc' }}><span style={{ color: '#64748b' }}>ALL AMOUNTS ARE IN</span> <strong style={{ color: '#0f2044' }}>INR</strong></td>
                      <td style={{ padding: '5px 8px', width: '25%', borderRight: '1px solid #d1d5db', background: '#f8fafc' }}><span style={{ color: '#64748b' }}>BILLED UPTO THIS BILL</span><strong style={{ fontFamily: 'monospace', color: '#1a56b0', marginLeft: 6 }}>₹{fmt(A_total)}</strong></td>
                      <td style={{ padding: '5px 8px', width: '25%', background: '#f8fafc' }}><span style={{ color: '#64748b' }}>BILLED AMOUNT %</span><strong style={{ fontFamily: 'monospace', color: '#0e6d41', marginLeft: 6 }}>{billedPct.toFixed(2)}%</strong></td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '5px 8px', borderRight: '1px solid #d1d5db' }}><span style={{ color: '#64748b' }}>CONTRACT SUM (Basic)</span><strong style={{ fontFamily: 'monospace', color: '#0f2044', marginLeft: 6 }}>₹{fmt(contractBasic)}</strong></td>
                      <td colSpan={3} style={{ padding: '5px 8px' }}><span style={{ color: '#64748b' }}>CONTRACT SUM (Inc. Tax)</span><strong style={{ fontFamily: 'monospace', color: '#0f2044', marginLeft: 6 }}>₹{fmt(contractWithTax)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MAIN TABLE */}
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#0f2044' }}>
                    <th style={{ padding: '8px', color: '#fff', fontSize: 10, textAlign: 'left' as const, width: 36 }}>Ref</th>
                    <th style={{ padding: '8px', color: '#fff', fontSize: 10, textAlign: 'left' as const }}>DETAILS</th>
                    <th style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 10, textAlign: 'right' as const, width: 148, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>VALUE TO DATE</th>
                    <th style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 10, textAlign: 'right' as const, width: 148, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>PREVIOUS PAYMENT</th>
                    <th style={{ padding: '8px 12px', color: '#86efac', fontSize: 10, textAlign: 'right' as const, width: 148, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>THIS PAYMENT</th>
                  </tr>
                </thead>
                <tbody>
                  <SH rl="(A)" label="VALUE OF WORK DONE" />
                  <DR rl="A1" desc="Value of Scheduled Items work" td={A_total} pv={A_prev} tv={A_this} in={1} />
                  <DR rl="A2" desc="Value of non-scheduled items" td={null} pv={null} tv={null} in={1} />
                  <DR rl="A3" desc="Payable amount due to difference in basic rate" td={null} pv={null} tv={null} in={1} />
                  <DR rl="A4" desc="Less: Electricity consumption @ 0% Bill Value (N.A.)" td={null} pv={null} tv={null} in={1} />
                  <ST desc="TOTAL A" td={A_total} pv={A_prev} tv={A_this} />
                  <SP />
                  <SH rl="(B)" label="ADD : Advances" />
                  <DR desc="Mobilization Advance against ABG" td={B_total} pv={B_prev} tv={B_this} in={1} />
                  <ST desc="TOTAL B" td={B_total} pv={B_prev} tv={B_this} />
                  <SP />
                  <SH rl="(C)" label="ADD : TAXES, C = 18% of A" />
                  <DR desc="CGST @ 09%" td={cgst_total} pv={cgst_prev} tv={cgst_this} in={1} />
                  <DR desc="SGST @ 09%" td={sgst_total} pv={sgst_prev} tv={sgst_this} in={1} />
                  <ST desc="TOTAL C" td={C_total} pv={C_prev} tv={C_this} />
                  <SP />
                  <HT rl="(D)" desc="GROSS AMOUNT WITH TAX (D = A + B + C)" td={D_total} pv={D_prev} tv={D_this} color="#0f2044" />
                  <SP />
                  <SH rl="(E)" label="LESS — Advance" />
                  <DR desc="Mobilization Advance — Recovery on Pro-rata Basis" td={E_total} pv={E_prev} tv={E_this} in={1} />
                  <ST desc="TOTAL E" td={E_total} pv={E_prev} tv={E_this} />
                  <SP />
                  <SH rl="(F)" label="DEDUCTIONS" colored />
                  <DR desc={`Retention @ ${retentionPct}%`} td={ret_total} pv={ret_prev} tv={ret_this} in={1} />
                  <DR desc="Material Deduction (Free Issue — Client Supplied)" td={mat_total} pv={mat_prev} tv={mat_this} in={1} />
                  {HOLD_DATA.filter(h => h.active && h.amt > 0).map(h => (
                    <DR key={h.id} desc={`Hold : ${h.desc.replace('Hold — ', '')}`} td={h.amt} pv={h.amt} tv={0} in={1} />
                  ))}
                  <ST desc="TOTAL F" td={F_total} pv={F_prev} tv={F_this} />
                  <SP />
                  <HT rl="(G)" desc="NET AMOUNT (G = D − E − F)" td={G_total} pv={G_prev} tv={G_this} color="#0e6d41" />
                  <SP />
                  <SH rl="(H)" label="Recoveries / Penalties" />
                  {hLines.map(line => <DR key={line.id} desc={line.label || 'Penalty'} td={line.amount} pv={0} tv={line.amount} in={1} />)}
                  {adhocPct > 0 && <DR desc={`Adhoc Payment @ ${adhocPct}%`} td={adhoc_total} pv={adhoc_prev} tv={adhoc_this} in={1} />}
                  <ST desc="TOTAL H" td={H_total} pv={H_prev} tv={H_this} />
                  <SP />
                  <DR rl="(I)" desc="RELEASE OF HOLD AMOUNT" td={I_total} pv={I_prev} tv={I_this} bold />
                  <SP />
                  <HT rl="(J)" desc="NET PAYABLE AMOUNT (J = G − H + I)" td={J_total} pv={J_prev} tv={J_this} color="#166534" />
                  <SP />
                  <DR desc="PAYMENT RECEIVED" td={paymentReceived} pv={paymentReceived} tv={null} />
                  <tr style={{ background: paymentDue > 0 ? '#fef2f2' : '#f0fdf4', borderTop: `2px solid ${paymentDue > 0 ? '#fca5a5' : '#86efac'}` }}>
                    <td colSpan={2} style={{ padding: '8px', fontWeight: 900, fontSize: 11, color: paymentDue > 0 ? '#b91c1c' : '#0e6d41' }}>NET PAYMENT DUE (IN NUMBERS)</td>
                    <td colSpan={2} style={{ borderLeft: '1px solid #e2e8f0' }} />
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 900, fontSize: 14, textAlign: 'right' as const, color: paymentDue > 0 ? '#b91c1c' : '#0e6d41', borderLeft: '1px solid #e2e8f0' }}>{fmt(Math.abs(paymentDue))}</td>
                  </tr>
                  <tr style={{ background: paymentDue > 0 ? '#fff5f5' : '#f0fdf4', borderBottom: '1px solid #e2e8f0' }}>
                    <td colSpan={2} style={{ padding: '8px', fontWeight: 700, fontSize: 11, color: '#475569' }}>NET PAYMENT DUE (IN WORDS)</td>
                    <td colSpan={3} style={{ padding: '8px 12px', fontSize: 11, fontStyle: 'italic', color: paymentDue > 0 ? '#b91c1c' : '#0e6d41', borderLeft: '1px solid #e2e8f0' }}>{toWords(Math.abs(paymentDue))}</td>
                  </tr>
                </tbody>
              </table>

              {/* SIGNATURE GRID */}
              <div style={{ padding: '28px 24px 24px', borderTop: '2px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {APPROVAL_STAGES.map((stage, i) => {
                    const entry = approvals[i];
                    const signed = entry?.status === 'signed';
                    const isPending = currentLevel === stage.level && isInApproval;
                    return (
                      <div key={stage.level} style={{
                        background: '#fff', borderRadius: 9, padding: '18px 14px 14px', textAlign: 'center' as const, position: 'relative' as const,
                        border: `1.5px solid ${signed ? '#86efac' : isPending ? '#93c5fd' : '#e2e8f0'}`,
                      }}>
                        <div style={{ position: 'absolute' as const, top: -10, left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: 10, fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' as const, background: signed ? '#166534' : isPending ? '#1e40af' : '#94a3b8', color: '#fff' }}>
                          L{stage.level} · {stage.label}
                        </div>
                        <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
                          {signed && entry.signature
                            ? <img src={entry.signature} alt="sig" style={{ maxHeight: 60, maxWidth: '90%', objectFit: 'contain' }} />
                            : <div style={{ width: '75%', borderBottom: `1px dashed ${isPending ? '#93c5fd' : '#94a3b8'}` }} />
                          }
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 11, color: '#0f2044', minHeight: 16 }}>{signed ? entry.signedBy : isPending ? '⏳ Awaiting…' : '—'}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{signed ? (entry.designation || stage.role) : stage.role}</div>
                        {signed && entry.signedAt && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{new Date(entry.signedAt).toLocaleDateString('en-IN')}</div>}
                        {signed && entry.note && <div style={{ fontSize: 9, color: '#059669', marginTop: 3, fontStyle: 'italic' }}>"{entry.note}"</div>}
                        {!signed && !isPending && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>Pending</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status footer */}
              <div style={{ padding: '8px 20px', background: cfg.bg, borderTop: `1px solid ${cfg.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label.toUpperCase()}{cop ? ' · ' + new Date(cop.statusUpdatedAt).toLocaleDateString('en-IN') : ''}</span>
                {cop?.statusNote && <span style={{ fontSize: 10, color: cfg.color, fontStyle: 'italic' }}>"{cop.statusNote}"</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body > * { display: none !important; }
          #cop-print-area { display: block !important; position: static !important; border: none !important; max-width: 100% !important; box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mc(bold = false): React.CSSProperties {
  return { padding: '5px 12px', fontFamily: 'monospace', fontSize: 11, textAlign: 'right', borderLeft: '1px solid #f1f5f9', fontWeight: bold ? 700 : 500, color: '#374151', whiteSpace: 'nowrap' };
}

function SR({ label, sub, done, active, rejected = false, idx }: { label: string; sub: string; done: boolean; active: boolean; rejected?: boolean; idx: number }) {
  const col = rejected ? '#b91c1c' : done ? '#166534' : active ? '#1e40af' : '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: idx < 4 ? 0 : 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: done ? '#166534' : active ? '#1a56b0' : rejected ? '#fef2f2' : '#f1f5f9', color: done || active ? '#fff' : rejected ? '#b91c1c' : '#94a3b8', border: `2px solid ${done ? '#166534' : active ? '#1a56b0' : rejected ? '#fca5a5' : '#d1d5db'}` }}>
          {done ? '✓' : rejected ? '✕' : idx + 1}
        </div>
        {idx < 4 && <div style={{ width: 2, height: 14, background: done ? '#86efac' : '#e2e8f0', margin: '2px 0' }} />}
      </div>
      <div style={{ paddingBottom: idx < 4 ? 0 : 4, paddingTop: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: col }}>{label}</div>
        <div style={{ fontSize: 10, color: '#94a3b8' }} dangerouslySetInnerHTML={{ __html: sub }} />
      </div>
    </div>
  );
}

function FLD({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{label}</div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 9px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    </div>
  );
}

function PS({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '6px 10px', background: color, color: '#fff', fontSize: 10, fontWeight: 700 }}>{title}</div>
      <div style={{ padding: '10px', background: '#fff' }}>{children}</div>
    </div>
  );
}

function LI({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{label}</div>
      <input type="number" min={0} step={1000} value={value || ''} placeholder="0" disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#0f2044' }} />
    </div>
  );
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: bg, color, border: `1px solid ${color}30` }}>{label}</span>;
}

function is(bc: string, tc: string, disabled = false): React.CSSProperties {
  return { width: '100%', padding: '6px 8px', borderRadius: 5, border: `1px solid ${disabled ? '#e2e8f0' : bc}`, fontSize: 12, color: disabled ? '#94a3b8' : tc, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', background: disabled ? '#f8fafc' : '#fff' };
}

function bs(color: string, bg: string, border: string): React.CSSProperties {
  return { padding: '5px 12px', borderRadius: 5, border: `1px solid ${border}`, background: bg, color, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer' };
}