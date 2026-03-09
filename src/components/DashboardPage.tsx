'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useVendor } from '@/lib/VendorContext';
import { loadAllRAs, loadAllCOPs, RABillData, COPData } from '@/lib/raStore';
import { fmtCr, fmtPct } from '@/lib/utils';
import { NavPage } from '@/app/page';

// ─── Color palette (matches globals.css) ──────────────────────────────────────
const C = {
    navy: '#0f2044',
    blue: '#1a56b0',
    blueLight: '#d0e3ff',
    bluePale: '#eef4ff',
    green: '#0e6d41',
    greenLight: '#d1f0e0',
    red: '#b91c1c',
    redLight: '#fee2e2',
    orange: '#c2410c',
    orangeLight: '#ffedd5',
    amber: '#92400e',
    amberLight: '#fef3c7',
    gray50: '#f8fafc',
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray400: '#94a3b8',
    gray600: '#475569',
    gray800: '#1e293b',
    border: '#d1d5db',
    teal: '#0d9488',
    violet: '#7c3aed',
    gold: '#ca8a04',
};

const BLOCK_COLORS = ['#1e40af', '#166534', '#9a3412', '#6b21a8', '#0e7490', '#b45309', '#dc2626', '#4338ca'];


// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children, action }: {
    title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 4, height: 18, background: C.blue, borderRadius: 2 }} />
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: 0.2 }}>{title}</h2>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function Card({ children, style, onClick, hoverHighlight }: {
    children: React.ReactNode; style?: React.CSSProperties;
    onClick?: () => void; hoverHighlight?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                ...style
            }}
            onMouseEnter={hoverHighlight ? e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(26,86,176,0.12)';
                (e.currentTarget as HTMLElement).style.borderColor = C.blueLight;
            } : undefined}
            onMouseLeave={hoverHighlight ? e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = C.border;
            } : undefined}
        >
            {children}
        </div>
    );
}

function KpiStat({ label, value, sub, accent, icon, onClick }: {
    label: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <Card
            style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, cursor: onClick ? 'pointer' : 'default' }}
            onClick={onClick}
            hoverHighlight={!!onClick}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                    fontSize: 9, fontWeight: 700, color: C.gray400,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                }}>{label}</div>
                <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: accent + '18', color: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{icon}</div>
            </div>
            <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 19, fontWeight: 700, color: accent, lineHeight: 1,
            }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: C.gray400 }}>{sub}</div>}
        </Card>
    );
}

function ProgressBar({ value, max, color = C.blue, showPct = true }: {
    value: number; max: number; color?: string; showPct?: boolean;
}) {
    const ratio = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                flex: 1, height: 6, background: C.gray200, borderRadius: 99, overflow: 'hidden',
            }}>
                <div style={{
                    width: `${(ratio * 100).toFixed(1)}%`, height: '100%',
                    background: color, borderRadius: 99,
                    transition: 'width 0.4s ease',
                }} />
            </div>
            {showPct && (
                <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: C.gray600, minWidth: 36, textAlign: 'right' }}>
                    {(ratio * 100).toFixed(1)}%
                </span>
            )}
        </div>
    );
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#f1f5f9', color: '#94a3b8' },
    submitted: { bg: '#fffbeb', color: '#b45309' },
    approved: { bg: '#dcfce7', color: '#166534' },
    rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

const TRADE_COLORS = [C.blue, C.teal, C.green, C.gold, C.violet, C.orange, C.navy, C.red, C.gray600];

// ─── Main Component ───────────────────────────────────────────────────────────



function GoToBtn({ label, page, onNavigate }: { label: string; page: NavPage; onNavigate: (p: NavPage) => void }) {
    return (
        <button
            onClick={() => onNavigate(page)}
            title={`Go to ${label}`}
            style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                fontSize: 10, fontWeight: 600, color: C.blue, fontFamily: 'inherit',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.bluePale; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
            {label}
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

// ─── Drill-Down Panel ─────────────────────────────────────────────────────────
type DrillRow = Record<string, string | number>;
interface DrillState { open: boolean; title: string; subtitle?: string; rows: DrillRow[]; cols: { key: string; label: string; align?: 'left' | 'right'; mono?: boolean }[]; }
const DRILL_CLOSED: DrillState = { open: false, title: '', rows: [], cols: [] };

function DrillDownPanel({ state, onClose }: { state: DrillState; onClose: () => void }) {
    if (!state.open) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,32,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                width: 'min(900px, 94vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                <div style={{
                    background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{state.title}</div>
                        {state.subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{state.subtitle}</div>}
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6,
                        color: '#fff', cursor: 'pointer', padding: '5px 10px', fontSize: 14, fontWeight: 700,
                    }}>✕</button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: C.gray50, position: 'sticky', top: 0, zIndex: 1 }}>
                                {state.cols.map(c => (
                                    <th key={c.key} style={{
                                        padding: '9px 12px', fontSize: 10, fontWeight: 700, color: C.gray600,
                                        textAlign: c.align ?? 'right', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                                    }}>{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {state.rows.map((row, idx) => (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : C.gray50 }}>
                                    {state.cols.map(c => (
                                        <td key={c.key} style={{
                                            padding: '8px 12px', fontSize: 11,
                                            textAlign: c.align ?? 'right',
                                            fontFamily: c.mono ? 'IBM Plex Mono, monospace' : 'inherit',
                                            color: C.gray800,
                                        }}>{row[c.key]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.gray50, fontSize: 10, color: C.gray400, textAlign: 'right' }}>
                    {state.rows.length} row{state.rows.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Click outside to close
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage({ onNavigate }: { onNavigate: (page: NavPage) => void }) {
    const vendor = useVendor();
    const {
        billingSummaryItems, billingSummaryTotals,
        defaultMaterialRows: MATERIAL_DATA, defaultHoldItems: HOLD_DATA,
        currentRA, tabs, getRATotals, getCombinedBoqState, approvedRANumbers
    } = vendor;

    // Use a very high RA number to aggregate ALL approved RAs into cumulative totals
    const DASH_RA_SENTINEL = 1000000;
    const totals = getRATotals(DASH_RA_SENTINEL);
    const combinedState = getCombinedBoqState(DASH_RA_SENTINEL);

    const allRAs = vendor.allRAs;
    const allCOPs = vendor.allCOPs;
    const [drill, setDrill] = useState<DrillState>(DRILL_CLOSED);
    const closeDrill = useCallback(() => setDrill(DRILL_CLOSED), []);

    // Refresh context data when dashboard mounts (picks up new approvals, etc.)
    useEffect(() => {
        vendor.refreshRAs();
    }, []);

    // helper: open drill-down for a billingSummaryItem
    const openCategoryDrill = useCallback((item: typeof billingSummaryItems[0]) => {
        if (item.subItems.length === 0) { onNavigate('abstract'); return; }
        setDrill({
            open: true,
            title: item.description,
            subtitle: `S.No ${item.sno} — Sub-item Breakdown`,
            cols: [
                { key: 'desc', label: 'Description', align: 'left' },
                { key: 'order', label: 'Order Value (₹)', mono: true },
                { key: 'prev', label: 'Prev Bill (₹)', mono: true },
                { key: 'thisBill', label: 'This Bill (₹)', mono: true },
                { key: 'cum', label: 'Cumulative (₹)', mono: true },
                { key: 'pct', label: '% Billed', mono: true },
            ],
            rows: item.subItems.map(s => ({
                desc: s.description,
                order: fmtCr(s.orderAmount),
                prev: fmtCr(s.prevBillAmount),
                thisBill: s.thisBillAmount > 0 ? fmtCr(s.thisBillAmount) : '—',
                cum: fmtCr(s.cumulativeAmount),
                pct: s.orderAmount > 0 ? fmtPct((s.cumulativeAmount / s.orderAmount) * 100) : '—',
            })),
        });
    }, [onNavigate]);

    // ── Derived financials ──────────────────────────────────────────────────────
    // Use abstractSummary items as the source of truth for scope breakdown
    const abstractItems = vendor.abstractSummary?.items || [];
    const totalBasicCost = vendor.abstractSummary?.totalBasicCost || 0;

    // Compute dynamic scope from BOQs (total of all BOQ item amounts)
    const boqList = vendor.tabs || [];
    const dynamicScope = boqList.reduce((sum, boq) => {
        return sum + (boq.items || []).reduce((s: number, item: any) => s + (item.amount || 0), 0);
    }, 0);

    // Order amount: prefer abstractSummary, then billing baseline, then dynamic BOQ scope
    const orderAmt = totalBasicCost > 0 ? totalBasicCost
        : billingSummaryTotals.orderAmount > 0 ? billingSummaryTotals.orderAmount
            : dynamicScope;

    // Cumulative billed: sum of all BOQ cumulative amounts from getRATotals (approved only)
    const cumFromTotals = totals.bldg.cum + totals.infra.cum
        + Object.values(totals.boqs).reduce((s, b) => s + b.cum, 0);
    // Use the RA-derived cumulative if any RAs exist, else fall back to baseline
    const cumAmt = cumFromTotals > 0 ? cumFromTotals : billingSummaryTotals.cumulativeAmount;
    const prevAmt = totals.bldg.prev + totals.infra.prev
        + Object.values(totals.boqs).reduce((s, b) => s + b.prev, 0);
    const thisAmt = totals.bldg.this + totals.infra.this
        + Object.values(totals.boqs).reduce((s, b) => s + b.this, 0);

    const remaining = orderAmt - cumAmt;
    const progressPct = orderAmt > 0 ? (cumAmt / orderAmt) * 100 : 0;

    const activeHolds = HOLD_DATA.filter(h => h.active).reduce((s, h) => s + h.amt, 0);
    const materialTotal = MATERIAL_DATA.reduce((s, m) => s + m.total, 0);

    // ── Dynamic Sub-section & Category Progress from combinedState ─────────────────
    // Instead of forcing Building/Infra splits, we can group all items dynamically
    const categoryDataMap: Record<string, { scope: number; cumulative: number; thisBill: number }> = {};
    const boqDataMap: Record<string, { scope: number; cumulative: number; thisBill: number }> = {};

    let totalMilestones = 0;
    let completedMilestones = 0;
    let partialMilestones = 0;

    // Aggregate from combinedState
    Object.entries(combinedState).forEach(([boqId, stateList]) => {
        let boqScope = 0;
        let boqCum = 0;
        let boqThis = 0;

        (stateList as any[]).forEach(item => {
            const scopeVal = item.scopeAmount ?? item.amount ?? item.orderAmount ?? 0;
            const cumVal = item.cumAmt ?? item.cumulativeAmount ?? 0;
            const thisVal = item.thisAmt ?? item.thisBillAmount ?? 0;

            boqScope += scopeVal;
            boqCum += cumVal;
            boqThis += thisVal;

            totalMilestones++;
            if (scopeVal > 0 && cumVal >= scopeVal) completedMilestones++;
            else if (cumVal > 0) partialMilestones++;

            // Group by category for the bar chart
            const cat = item.category || item.section || 'Uncategorized';
            if (!categoryDataMap[cat]) categoryDataMap[cat] = { scope: 0, cumulative: 0, thisBill: 0 };
            categoryDataMap[cat].scope += scopeVal;
            categoryDataMap[cat].cumulative += cumVal;
            categoryDataMap[cat].thisBill += thisVal;
        });

        boqDataMap[boqId] = { scope: boqScope, cumulative: boqCum, thisBill: boqThis };
    });

    const blockData = Object.entries(categoryDataMap).map(([name, data]) => ({
        name,
        ...data
    })).sort((a, b) => b.scope - a.scope);

    // ── RA Bills accumulated total (only approved RAs) ───────────────────────────
    const raTotalBilled = allRAs
        .filter((r: any) => approvedRANumbers.has(r.raNumber))
        .reduce((s: number, r: any) => s + r.grandTotal, 0);

    // ── Trade Pie data — from dynamic blockData (categories) ────────────────────
    const tradeData = blockData.map(b => ({
        name: b.name.length > 28 ? b.name.slice(0, 25) + '…' : b.name,
        fullName: b.name,
        value: b.scope,
        pct: orderAmt > 0 ? (b.scope / orderAmt) * 100 : 0,
    })).sort((a, b) => b.value - a.value);


    // ── Category completion tooltip ──────────────────────────────────────────────
    const CustomBarTip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6,
                padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11,
            }}>
                <p style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{label}</p>
                {payload.map((e: any, i: number) => (
                    <p key={i} style={{ color: e.color, margin: '1px 0' }}>
                        {e.name}: {fmtCr(e.value)}
                    </p>
                ))}
            </div>
        );
    };

    const CustomPieTip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0];
        return (
            <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6,
                padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11, maxWidth: 220,
            }}>
                <p style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{d.payload.fullName}</p>
                <p style={{ color: C.blue }}>{fmtCr(d.value)}</p>
                <p style={{ color: C.gray400 }}>{fmtPct(d.payload.pct)} of contract</p>
            </div>
        );
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '4px 4px 40px', position: 'relative' }}>
            <DrillDownPanel state={drill} onClose={closeDrill} />

            {/* ── Project Banner ─────────────────────────────────────────────────── */}
            <div style={{
                background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
                borderRadius: 10, padding: '18px 22px', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
            }}>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>
                        {vendor.projectName}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                        {vendor.contractor} · WO: {vendor.woNumber} · WO Date: {vendor.woDate}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <BannerStat label="PMC" value={vendor.pmc} />
                    <BannerStat label="Client" value={vendor.client} />
                    <BannerStat label="Current RA" value={`RA-${currentRA}`} accent="#86efac" />
                    <BannerStat label="WO Date" value={vendor.woDate} />
                </div>
            </div>

            {/* ── KPI Row ───────────────────────────────────────────────────────────── */}
            <Section title="Project Financial Overview" action={<GoToBtn label="Bill Summary" page="abstract" onNavigate={onNavigate} />}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 12 }}>
                    <KpiStat
                        label="Contract Value"
                        value={fmtCr(orderAmt)}
                        sub={`₹${(orderAmt / 1e7).toFixed(0)} Cr total scope`}
                        accent={C.navy}
                        icon={<ContractIcon />}
                        onClick={() => onNavigate('po-abstract')}
                    />
                    <KpiStat
                        label="Cumulative Billed"
                        value={fmtCr(cumAmt)}
                        sub={`${fmtPct(progressPct)} of contract`}
                        accent={C.blue}
                        icon={<BilledIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label={`This Bill (RA-${currentRA})`}
                        value={fmtCr(thisAmt)}
                        sub={`Previous: ${fmtCr(prevAmt)}`}
                        accent={C.teal}
                        icon={<ThisBillIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label="Balance to Bill"
                        value={fmtCr(remaining)}
                        sub={`${fmtPct(100 - progressPct)} remaining`}
                        accent={C.orange}
                        icon={<BalanceIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label="Active Holds"
                        value={fmtCr(activeHolds)}
                        sub={`${HOLD_DATA.filter(h => h.active).length} hold item(s)`}
                        accent={C.red}
                        icon={<HoldIcon />}
                        onClick={() => onNavigate('holds')}
                    />
                    <KpiStat
                        label="Material Deductions"
                        value={fmtCr(materialTotal)}
                        sub={`${MATERIAL_DATA.length} material(s)`}
                        accent={C.amber}
                        icon={<MaterialIcon />}
                        onClick={() => onNavigate('materials')}
                    />
                </div>

                {/* Overall progress bar */}
                <Card style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.navy }}>Overall Project Completion</span>
                        <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.blue }}>
                            {fmtPct(progressPct)}
                        </span>
                    </div>
                    <div style={{ height: 10, background: C.gray200, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${progressPct.toFixed(1)}%`,
                            background: `linear-gradient(90deg, ${C.blue}, ${C.teal})`,
                            borderRadius: 99,
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.gray400 }}>
                        <span>₹ 0</span>
                        <span>Billed: {fmtCr(cumAmt)}</span>
                        <span>Contract: {fmtCr(orderAmt)}</span>
                    </div>
                </Card>
            </Section>

            {/* ── Two-column: Work Category Table + Trade Distribution Pie ─────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>

                {/* Category Table */}
                <Section title="Work Category Summary" action={<GoToBtn label="Bill Summary" page="abstract" onNavigate={onNavigate} />}>
                    <Card>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.navy }}>
                                    {['#', 'Category', 'Order Value', 'Billed', 'This Bill', 'Progress'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 10px', textAlign: h === 'Category' || h === '#' ? 'left' : 'right',
                                            fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {blockData.map((data, idx) => {
                                    const cumPct = data.scope > 0 ? (data.cumulative / data.scope) * 100 : 0;
                                    const isEven = idx % 2 === 0;
                                    return (
                                        <tr key={data.name}
                                            onClick={() => onNavigate('po-abstract')}
                                            title="Click to view PO Abstract"
                                            style={{ background: isEven ? '#fff' : C.gray50, cursor: 'pointer' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                            onMouseLeave={e => (e.currentTarget.style.background = isEven ? '#fff' : C.gray50)}
                                        >
                                            <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray400, textAlign: 'center', width: 28 }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray800, maxWidth: 180 }}>
                                                <div style={{ fontWeight: 600 }}>{data.name}</div>
                                                <ProgressBar value={data.cumulative} max={data.scope} color={BLOCK_COLORS[idx % BLOCK_COLORS.length]} showPct={false} />
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600, whiteSpace: 'nowrap' }}>
                                                {fmtCr(data.scope)}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.blue, whiteSpace: 'nowrap' }}>
                                                {data.cumulative > 0 ? fmtCr(data.cumulative) : <span style={{ color: C.gray400 }}>—</span>}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.teal, whiteSpace: 'nowrap' }}>
                                                {data.thisBill > 0 ? fmtCr(data.thisBill) : <span style={{ color: C.gray400 }}>—</span>}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', width: 60 }}>
                                                <div style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: cumPct > 0 ? C.blue : C.gray400 }}>
                                                    {cumPct > 0 ? `${cumPct.toFixed(1)}%` : '—'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Totals row */}
                                <tr style={{ background: C.navy }}>
                                    <td colSpan={2} style={{ padding: '9px 10px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                                        GRAND TOTAL
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                                        {fmtCr(orderAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#86efac' }}>
                                        {fmtCr(cumAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#67e8f9' }}>
                                        {fmtCr(thisAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#fde68a' }}>
                                        {fmtPct(progressPct)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </Section>

                {/* Trade Pie */}
                <Section title="Contract Value Distribution" action={<GoToBtn label="PO Abstract" page="po-abstract" onNavigate={onNavigate} />}>
                    <Card style={{ padding: '14px 10px 10px' }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={tradeData}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={3} dataKey="value"
                                    label={({ percent }) => percent !== undefined && percent * 100 > 5 ? `${(percent * 100).toFixed(0)}%` : ''}
                                    labelLine={false}
                                    onClick={() => onNavigate('po-abstract')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {tradeData.map((_: any, idx: number) => (
                                        <Cell key={idx} fill={TRADE_COLORS[idx % TRADE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px 4px' }}>
                            {tradeData.map((d: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                                        background: TRADE_COLORS[idx % TRADE_COLORS.length],
                                    }} />
                                    <span style={{ fontSize: 10, color: C.gray600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {d.name}
                                    </span>
                                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: C.gray400, flexShrink: 0 }}>
                                        {fmtCr(d.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Section>
            </div>

            {/* ── Dynamic BOQ Financial Split ──────────────────────────────────────────── */}
            <Section title="BOQ Financial Split" action={<GoToBtn label="Bill Summary" page="abstract" onNavigate={onNavigate} />}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    {tabs.map((t, idx) => {
                        const d = boqDataMap[t.id] || { scope: 0, cumulative: 0, thisBill: 0 };
                        return (
                            <SegmentCard
                                key={t.id}
                                label={t.name}
                                color={TRADE_COLORS[idx % TRADE_COLORS.length]}
                                scope={d.scope}
                                cumulative={d.cumulative}
                                thisBill={d.thisBill}
                                onClick={() => {
                                    onNavigate('ra-details');
                                }}
                            />
                        );
                    })}
                </div>
            </Section>

            <Section title="Category-wise Scope Breakdown" action={<GoToBtn label="PO Abstract" page="po-abstract" onNavigate={onNavigate} />}>
                <Card style={{ padding: '16px' }}>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={blockData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }} barGap={4}
                            style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.gray200} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray600 }}
                                tickFormatter={v => `₹${(v / 1e5).toFixed(0)}L`} width={68} />
                            <Tooltip content={<CustomBarTip />} />
                            <Bar dataKey="scope" name="Contract Scope" fill={C.navy} radius={[3, 3, 0, 0]}>
                                {blockData.map((_, i) => <Cell key={i} fill={BLOCK_COLORS[i]} opacity={0.25} />)}
                            </Bar>
                            <Bar dataKey="cumulative" name="Cumulative Billed" radius={[3, 3, 0, 0]}>
                                {blockData.map((_, i) => <Cell key={i} fill={BLOCK_COLORS[i]} />)}
                            </Bar>
                            <Bar dataKey="thisBill" name="This Bill" fill={C.teal} radius={[3, 3, 0, 0]} opacity={0.85}>
                                {blockData.map((_, i) => <Cell key={i} fill={BLOCK_COLORS[i]} opacity={0.5} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    {/* Block summary chips */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        {blockData.map((b, i) => {
                            const p = b.scope > 0 ? (b.cumulative / b.scope) * 100 : 0;
                            return (
                                <div key={b.name}
                                    style={{
                                        flex: 1, minWidth: 100, background: BLOCK_COLORS[i] + '12',
                                        border: `1px solid ${BLOCK_COLORS[i]}30`, borderRadius: 8, padding: '10px 12px',
                                        cursor: 'pointer', transition: 'box-shadow 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 12px ${BLOCK_COLORS[i]}30`)}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                                >
                                    <div style={{ fontSize: 10, fontWeight: 700, color: BLOCK_COLORS[i], marginBottom: 4 }}>{b.name}</div>
                                    <div style={{ fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: BLOCK_COLORS[i] }}>
                                        {fmtPct(p)}
                                    </div>
                                    <div style={{ fontSize: 9, color: C.gray400, marginTop: 2 }}>
                                        {fmtCr(b.cumulative)} / {fmtCr(b.scope)}
                                    </div>
                                    <ProgressBar value={b.cumulative} max={b.scope} color={BLOCK_COLORS[i]} showPct={false} />
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </Section>

            {/* ── Milestone Completion Status ──────────────────────────────────────── */}
            <Section title="Milestone Completion Status" action={
                <div style={{ display: 'flex', gap: 6 }}>
                    <GoToBtn label="PO Abstract" page="po-abstract" onNavigate={onNavigate} />
                </div>
            }>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr)', gap: 12, marginBottom: 12 }}>
                    <MilestoneCard
                        title="All Project Milestones"
                        total={totalMilestones}
                        completed={completedMilestones}
                        partial={partialMilestones}
                        color={C.blue}
                    />
                </div>

                {/* Milestones mini table (top 10 by value) */}
                <Card>
                    <div style={{
                        padding: '10px 14px', background: C.navy, borderTopLeftRadius: 9, borderTopRightRadius: 9,
                        fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>Top Milestones (by Scope)</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.gray50 }}>
                                    {['BOQ', 'Category', 'Description', 'Scope', 'Cum %', 'Status'].map(h => (
                                        <th key={h} style={{
                                            padding: '7px 10px', fontSize: 10, fontWeight: 700, color: C.gray600,
                                            textAlign: h === 'Description' || h === 'Category' ? 'left' : 'right',
                                            borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(combinedState)
                                    .flatMap(([bId, items]) => (items as any[]).map(i => ({ ...i, bId })))
                                    .sort((a, b) => (b.scopeAmount ?? b.amount ?? b.orderAmount ?? 0) - (a.scopeAmount ?? a.amount ?? a.orderAmount ?? 0))
                                    .slice(0, 10)
                                    .map((m, idx) => {
                                        const scope = m.scopeAmount ?? m.amount ?? m.orderAmount ?? 0;
                                        const cum = m.cumAmt ?? m.cumulativeAmount ?? 0;
                                        const cumPct = scope > 0 ? (cum / scope) * 100 : 0;
                                        const statusColor = cumPct >= 100 ? C.green : cumPct >= 50 ? C.blue : cumPct > 0 ? C.orange : C.gray400;
                                        const statusText = cumPct >= 100 ? 'Complete' : cumPct > 0 ? 'In Progress' : 'Not Started';
                                        const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                        const boqTabName = tabs.find(t => t.id === m.bId)?.name || 'Unknown BOQ';
                                        return (
                                            <tr key={`${m.bId}-${m.sno}-${idx}`}
                                                style={{ background: rowBg }}
                                                onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                            >
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray600, textAlign: 'center' }}>{boqTabName}</td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray600, whiteSpace: 'nowrap' }}>{m.category || m.section || '—'}</td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray800, maxWidth: 300 }}>
                                                    <span title={m.description}>
                                                        {m.description.length > 70 ? m.description.slice(0, 67) + '…' : m.description}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600, whiteSpace: 'nowrap' }}>
                                                    {fmtCr(scope)}
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: statusColor }}>
                                                    {fmtPct(cumPct)}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                                                    <span style={{
                                                        fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                                                        background: statusColor + '18', color: statusColor,
                                                    }}>{statusText}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </Section>

            {/* ── RA Bills & COP Status ─────────────────────────────────────────────── */}
            <Section title="RA Bills & COP Status" action={
                <div style={{ display: 'flex', gap: 6 }}>
                    <GoToBtn label="COP" page="cop" onNavigate={onNavigate} />
                    <GoToBtn label="Approvals" page="approvals" onNavigate={onNavigate} />
                </div>
            }>
                {allRAs.length === 0 ? (
                    <Card style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: C.gray400 }}>No additional RA bills saved yet.</div>
                        <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>
                            Create a new RA bill using the <strong>New RA Entry</strong> section in the sidebar.
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.navy }}>
                                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap' }}>RA #</th>
                                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap' }}>Label</th>
                                    {tabs.map(t => (
                                        <th key={t.id} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {t.name}
                                        </th>
                                    ))}
                                    {['Grand Total', 'COP Status', 'Net Payable', 'Saved At'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#fff',
                                            textAlign: h === 'COP Status' ? 'left' : 'right',
                                            whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allRAs.map((ra, idx) => {
                                    const cop = allCOPs.find(c => c.raNumber === ra.raNumber);
                                    const ss = cop ? (STATUS_STYLES[cop.status] ?? STATUS_STYLES.draft) : null;
                                    const isApproved = approvedRANumbers.has(ra.raNumber);
                                    const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                    return (
                                        <tr key={ra.raNumber}
                                            onClick={() => onNavigate('cop')}
                                            title="Click to view COP"
                                            style={{ background: rowBg, cursor: 'pointer', opacity: isApproved ? 1 : 0.55 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                        >
                                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: C.navy }}>RA-{ra.raNumber}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, color: C.gray600 }}>{ra.label}</td>
                                            {tabs.map(t => {
                                                let boqTotal = 0;
                                                if (t.id === 'boq-bldg-legacy') boqTotal = ra.buildingTotal || 0;
                                                else if (t.id === 'boq-infra-legacy') boqTotal = ra.infraTotal || 0;
                                                else boqTotal = Object.values(ra.boqEntries?.[t.id] || {}).reduce((s: number, e: any) => s + (e.amt || 0), 0);

                                                return (
                                                    <td key={t.id} style={{ padding: '8px 12px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600 }}>
                                                        {fmtCr(boqTotal)}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: isApproved ? C.blue : C.gray400 }}>
                                                {fmtCr(ra.grandTotal)}
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>
                                                {cop ? (
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                                                        background: ss?.bg, color: ss?.color,
                                                    }}>{cop.status.toUpperCase()}</span>
                                                ) : <span style={{ fontSize: 10, color: C.gray400 }}>No COP</span>}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.green }}>
                                                {cop ? fmtCr(cop.netPayable) : <span style={{ color: C.gray400 }}>—</span>}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 10, textAlign: 'right', color: C.gray400 }}>
                                                {new Date(ra.savedAt).toLocaleDateString('en-IN')}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Summary row */}
                                <tr style={{ background: C.blueLight }}>
                                    <td colSpan={2 + tabs.length} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: C.navy }}>
                                        Total Billed (Approved RAs Only)
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: C.blue }}>
                                        {fmtCr(raTotalBilled)}
                                    </td>
                                    <td colSpan={3} />
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                )}
            </Section>

            {/* ── Material Deductions & Holds ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Section title="Material Deductions" action={<GoToBtn label="View Details" page="materials" onNavigate={onNavigate} />}>
                    <Card>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.border}` }}>
                                    {['#', 'Material', 'Total Deduction', 'Prev', 'This Bill'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 10px', fontSize: 10, fontWeight: 700, color: C.gray600,
                                            textAlign: h === 'Material' || h === '#' ? 'left' : 'right',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MATERIAL_DATA.map((m, idx) => {
                                    const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                    return (<tr key={m.sno}
                                        onClick={() => onNavigate('materials')}
                                        title="Click to view Material Deductions"
                                        style={{ background: rowBg, cursor: 'pointer' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.amberLight)}
                                        onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                    >
                                        <td style={{ padding: '8px 10px', fontSize: 10, color: C.gray400, textAlign: 'center' }}>{m.sno}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray800 }}>{m.desc}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.red }}>{fmtCr(m.total)}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600 }}>{fmtCr(m.prev)}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.red }}>{fmtCr(m.thisV)}</td>
                                    </tr>);
                                })}
                                <tr style={{ background: C.redLight }}>
                                    <td colSpan={2} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: C.red }}>Total</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: C.red }}>
                                        {fmtCr(materialTotal)}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </Section>

                <Section title="Holds & Releases" action={<GoToBtn label="View Details" page="holds" onNavigate={onNavigate} />}>
                    <Card>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.border}` }}>
                                    {['ID', 'Description', 'Amount', 'Status'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 10px', fontSize: 10, fontWeight: 700, color: C.gray600,
                                            textAlign: h === 'Description' || h === 'ID' ? 'left' : 'right',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {HOLD_DATA.map((h, idx) => {
                                    const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                    return (<tr key={h.id}
                                        onClick={() => onNavigate('holds')}
                                        title="Click to view Holds & Releases"
                                        style={{ background: rowBg, cursor: 'pointer' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.orangeLight)}
                                        onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                    >
                                        <td style={{ padding: '8px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: C.gray400 }}>{h.id}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray800 }}>{h.desc}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: h.active ? C.orange : C.green }}>
                                            {fmtCr(h.amt)}
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                                                background: h.active ? C.orangeLight : C.greenLight,
                                                color: h.active ? C.orange : C.green,
                                            }}>{h.active ? 'ACTIVE' : 'RELEASED'}</span>
                                        </td>
                                    </tr>);
                                })}
                                <tr style={{ background: C.amberLight }}>
                                    <td colSpan={2} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: C.amber }}>Total Holds</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: C.amber }}>
                                        {fmtCr(activeHolds)}
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </Section>
            </div>

        </div>
    );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function BannerStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: accent || '#fff', marginTop: 2 }}>{value}</div>
        </div>
    );
}

function SegmentCard({ label, color, scope, cumulative, thisBill, onClick }: {
    label: string; color: string; scope: number; cumulative: number; thisBill: number; onClick?: () => void;
}) {
    const p = scope > 0 ? (cumulative / scope) * 100 : 0;
    return (
        <Card style={{ padding: '16px 18px', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick} hoverHighlight={!!onClick}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400, marginBottom: 2 }}>Contract Scope</div>
                    <div style={{ fontSize: 16, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.navy }}>{fmtCr(scope)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color }}>{fmtPct(p)}</div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>complete</div>
                </div>
            </div>
            <ProgressBar value={cumulative} max={scope} color={color} showPct={false} />
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>Cumulative Billed</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color }}>{fmtCr(cumulative)}</div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>This Bill</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: thisBill > 0 ? color : C.gray400 }}>
                        {thisBill > 0 ? fmtCr(thisBill) : '—'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>Balance</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.orange }}>{fmtCr(scope - cumulative)}</div>
                </div>
            </div>
        </Card>
    );
}

function MilestoneCard({ title, total, completed, partial, color, onClick }: {
    title: string; total: number; completed: number; partial: number; color: string; onClick?: () => void;
}) {
    const notStarted = total - completed - partial;
    return (
        <Card style={{ padding: '16px 18px', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick} hoverHighlight={!!onClick}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{title}</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <StatPill value={completed} label="Complete" color={C.green} bg={C.greenLight} />
                <StatPill value={partial} label="In Progress" color={C.blue} bg={C.bluePale} />
                <StatPill value={notStarted} label="Not Started" color={C.gray400} bg={C.gray100} />
                <StatPill value={total} label="Total" color={C.navy} bg={C.gray200} />
            </div>
            <ProgressBar value={completed + partial * 0.5} max={total} color={color} />
            <div style={{ fontSize: 10, color: C.gray400, marginTop: 6 }}>
                {total > 0 ? fmtPct((completed / total) * 100) : '0.0%'} milestones fully completed
            </div>
        </Card>
    );
}

function StatPill({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
    return (
        <div style={{
            flex: 1, background: bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center',
        }}>
            <div style={{ fontSize: 18, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 9, color: C.gray400, marginTop: 2 }}>{label}</div>
        </div>
    );
}

// ─── Icons (16×16 SVG) ────────────────────────────────────────────────────────
const svgIcon = (d: string) => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

function ContractIcon() { return svgIcon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"); }
function BilledIcon() { return svgIcon("M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"); }
function ThisBillIcon() { return svgIcon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"); }
function BalanceIcon() { return svgIcon("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"); }
function HoldIcon() { return svgIcon("M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"); }
function MaterialIcon() { return svgIcon("M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"); }
