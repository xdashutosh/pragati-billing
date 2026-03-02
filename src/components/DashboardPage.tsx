'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
    billingSummaryItems, billingSummaryTotals,
    billingMilestones, infraRAMilestones,
    MATERIAL_DATA, HOLD_DATA, PROJECT_INFO,
} from '@/data/projectData';
import { loadAllRAs, loadAllCOPs, RABillData, COPData } from '@/lib/raStore';
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

const BLOCK_COLORS = [C.navy, C.blue, C.teal, C.violet];

function cr(n: number) { return `₹${(n / 1e7).toFixed(2)} Cr`; }
function pct(n: number) { return `${n.toFixed(1)}%`; }

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
    const [allRAs, setAllRAs] = useState<RABillData[]>([]);
    const [allCOPs, setAllCOPs] = useState<COPData[]>([]);
    const [drill, setDrill] = useState<DrillState>(DRILL_CLOSED);
    const closeDrill = useCallback(() => setDrill(DRILL_CLOSED), []);

    useEffect(() => {
        setAllRAs(loadAllRAs());
        setAllCOPs(loadAllCOPs());
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
                order: cr(s.orderAmount),
                prev: cr(s.prevBillAmount),
                thisBill: s.thisBillAmount > 0 ? cr(s.thisBillAmount) : '—',
                cum: cr(s.cumulativeAmount),
                pct: s.orderAmount > 0 ? pct((s.cumulativeAmount / s.orderAmount) * 100) : '—',
            })),
        });
    }, [onNavigate]);

    // helper: open drill-down for an infraRAMilestone
    const openInfraDrill = useCallback((m: typeof infraRAMilestones[0]) => {
        setDrill({
            open: true,
            title: m.description,
            subtitle: `${m.category} — Sno ${m.sno}`,
            cols: [
                { key: 'label', label: 'Field', align: 'left' },
                { key: 'value', label: 'Value', mono: true },
            ],
            rows: [
                { label: 'Scope Amount', value: cr(m.scopeAmount) },
                { label: '% of Total Infra', value: pct(m.pctOfTotal * 100) },
                { label: 'Prev Billed %', value: pct(m.prevPct * 100) },
                { label: 'Prev Billed Amt', value: cr(m.prevAmt) },
                { label: 'This Bill %', value: m.thisPct > 0 ? pct(m.thisPct * 100) : '—' },
                { label: 'This Bill Amt', value: m.thisAmt > 0 ? cr(m.thisAmt) : '—' },
                { label: 'Cumulative %', value: pct(m.cumPct * 100) },
                { label: 'Cumulative Amt', value: cr(m.cumAmt) },
                { label: 'Balance', value: cr(m.scopeAmount - m.cumAmt) },
            ],
        });
    }, []);

    // ── Derived financials ──────────────────────────────────────────────────────
    const orderAmt = billingSummaryTotals.orderAmount;
    const prevAmt = billingSummaryTotals.prevBillAmount;
    const thisAmt = billingSummaryTotals.thisBillAmount;
    const cumAmt = billingSummaryTotals.cumulativeAmount;
    const remaining = orderAmt - cumAmt;
    const progressPct = orderAmt > 0 ? (cumAmt / orderAmt) * 100 : 0;

    const activeHolds = HOLD_DATA.filter(h => h.active).reduce((s, h) => s + h.amt, 0);
    const materialTotal = MATERIAL_DATA.reduce((s, m) => s + m.total, 0);

    // ── Building scope sub-totals from abstract ─────────────────────────────────
    const buildingScope = billingSummaryItems
        .filter(i => ['1', '2', '3', '4'].includes(i.sno))
        .reduce((s, i) => s + i.orderAmount, 0);
    const buildingCum = billingSummaryItems
        .filter(i => ['1', '2', '3', '4'].includes(i.sno))
        .reduce((s, i) => s + i.cumulativeAmount, 0);
    const buildingThis = billingSummaryItems
        .filter(i => ['1', '2', '3', '4'].includes(i.sno))
        .reduce((s, i) => s + i.thisBillAmount, 0);

    const infraScope = billingSummaryItems
        .filter(i => ['5', '6', '7', '8', '9'].includes(i.sno))
        .reduce((s, i) => s + i.orderAmount, 0);
    const infraCum = billingSummaryItems
        .filter(i => ['5', '6', '7', '8', '9'].includes(i.sno))
        .reduce((s, i) => s + i.cumulativeAmount, 0);
    const infraThis = billingSummaryItems
        .filter(i => ['5', '6', '7', '8', '9'].includes(i.sno))
        .reduce((s, i) => s + i.thisBillAmount, 0);

    // ── Block-wise scope and billing ────────────────────────────────────────────
    type BlockKey = 'block1' | 'block2' | 'block3' | 'block4';
    const blockKeys: BlockKey[] = ['block1', 'block2', 'block3', 'block4'];
    const blockLabels = ['Block-1', 'Block-2', 'Block-3', 'Block-4'];
    const blockData = blockLabels.map((name, i) => {
        const bk = blockKeys[i];
        // Pull from billing milestones for accurate per-block data
        const blockScope = billingMilestones.reduce((s, m) => s + (m[bk]?.scope ?? 0), 0);
        const blockCum = billingMilestones.reduce((s, m) => s + (m[bk]?.cumAmt ?? 0), 0);
        const blockThis = billingMilestones.reduce((s, m) => s + (m[bk]?.thisAmt ?? 0), 0);
        return { name, scope: blockScope, cumulative: blockCum, thisBill: blockThis };
    });

    // ── RA Bills accumulated total ───────────────────────────────────────────────
    const raTotalBilled = allRAs.reduce((s, r) => s + r.grandTotal, 0);

    // ── Milestone stats ──────────────────────────────────────────────────────────
    // Building milestones: a block is "complete" for a category when cumPct = 1
    const totalBuildingEntries = billingMilestones.length * 4; // 4 blocks each
    const completedBuilding = billingMilestones.reduce((s, m) =>
        s + blockKeys.filter(bk => m[bk]?.cumPct >= 1 && m[bk]?.scope > 0).length, 0);
    const partialBuilding = billingMilestones.reduce((s, m) =>
        s + blockKeys.filter(bk => {
            const d = m[bk]; return d?.cumPct > 0 && d.cumPct < 1 && d.scope > 0;
        }).length, 0);

    const totalInfra = infraRAMilestones.length;
    const completedInfra = infraRAMilestones.filter(m => m.cumPct >= 1).length;
    const partialInfra = infraRAMilestones.filter(m => m.cumPct > 0 && m.cumPct < 1).length;

    // ── Trade Pie data ──────────────────────────────────────────────────────────
    const tradeData = billingSummaryItems
        .filter(i => i.orderAmount > 0 && i.sno !== '10')
        .map(i => ({
            name: i.description.length > 28 ? i.description.slice(0, 25) + '…' : i.description,
            fullName: i.description,
            value: i.orderAmount,
            pct: (i.orderAmount / orderAmt) * 100,
        }))
        .sort((a, b) => b.value - a.value);

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
                        {e.name}: {cr(e.value)}
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
                <p style={{ color: C.blue }}>{cr(d.value)}</p>
                <p style={{ color: C.gray400 }}>{pct(d.payload.pct)} of contract</p>
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
                        {PROJECT_INFO.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                        {PROJECT_INFO.contractor} · WO: {PROJECT_INFO.woNumber} · WO Date: {PROJECT_INFO.woDate}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <BannerStat label="PMC" value="JLL" />
                    <BannerStat label="Client" value="LPW Warehousing Pvt. Ltd." />
                    <BannerStat label="Current RA" value={`RA-${PROJECT_INFO.currentRA}`} accent="#86efac" />
                    <BannerStat label="WO Date" value={PROJECT_INFO.woDate} />
                </div>
            </div>

            {/* ── KPI Row ───────────────────────────────────────────────────────────── */}
            <Section title="Project Financial Overview" action={<GoToBtn label="Bill Summary" page="abstract" onNavigate={onNavigate} />}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 12 }}>
                    <KpiStat
                        label="Contract Value"
                        value={cr(orderAmt)}
                        sub={`₹${(orderAmt / 1e7).toFixed(0)} Cr total scope`}
                        accent={C.navy}
                        icon={<ContractIcon />}
                        onClick={() => onNavigate('po-abstract')}
                    />
                    <KpiStat
                        label="Cumulative Billed"
                        value={cr(cumAmt)}
                        sub={`${pct(progressPct)} of contract`}
                        accent={C.blue}
                        icon={<BilledIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label="This Bill (RA-16)"
                        value={cr(thisAmt)}
                        sub={`Previous: ${cr(prevAmt)}`}
                        accent={C.teal}
                        icon={<ThisBillIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label="Balance to Bill"
                        value={cr(remaining)}
                        sub={`${pct(100 - progressPct)} remaining`}
                        accent={C.orange}
                        icon={<BalanceIcon />}
                        onClick={() => onNavigate('abstract')}
                    />
                    <KpiStat
                        label="Active Holds"
                        value={cr(activeHolds)}
                        sub={`${HOLD_DATA.filter(h => h.active).length} hold item(s)`}
                        accent={C.red}
                        icon={<HoldIcon />}
                        onClick={() => onNavigate('holds')}
                    />
                    <KpiStat
                        label="Material Deductions"
                        value={cr(materialTotal)}
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
                            {pct(progressPct)}
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
                        <span>Billed: {cr(cumAmt)}</span>
                        <span>Contract: {cr(orderAmt)}</span>
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
                                {billingSummaryItems
                                    .filter(i => i.orderAmount > 0 && i.sno !== '10')
                                    .map((item, idx) => {
                                        const cumPct = item.orderAmount > 0 ? (item.cumulativeAmount / item.orderAmount) * 100 : 0;
                                        const isEven = idx % 2 === 0;
                                        return (
                                            <tr key={item.sno}
                                                onClick={() => openCategoryDrill(item)}
                                                title={item.subItems.length > 0 ? 'Click to view sub-items' : 'Click to view Bill Summary'}
                                                style={{ background: isEven ? '#fff' : C.gray50, cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                                onMouseLeave={e => (e.currentTarget.style.background = isEven ? '#fff' : C.gray50)}
                                            >
                                                <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray400, textAlign: 'center', width: 28 }}>
                                                    {item.sno}
                                                </td>
                                                <td style={{ padding: '8px 10px', fontSize: 11, color: C.gray800, maxWidth: 180 }}>
                                                    <div style={{ fontWeight: 600 }}>{item.description}</div>
                                                    <ProgressBar value={item.cumulativeAmount} max={item.orderAmount} showPct={false} />
                                                </td>
                                                <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600, whiteSpace: 'nowrap' }}>
                                                    {cr(item.orderAmount)}
                                                </td>
                                                <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.blue, whiteSpace: 'nowrap' }}>
                                                    {cr(item.cumulativeAmount)}
                                                </td>
                                                <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.teal, whiteSpace: 'nowrap' }}>
                                                    {item.thisBillAmount > 0 ? cr(item.thisBillAmount) : <span style={{ color: C.gray400 }}>—</span>}
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', width: 60 }}>
                                                    <span style={{
                                                        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700,
                                                        color: cumPct >= 100 ? C.green : cumPct >= 50 ? C.blue : C.orange,
                                                    }}>
                                                        {pct(cumPct)}
                                                    </span>
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
                                        {cr(orderAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#86efac' }}>
                                        {cr(cumAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#67e8f9' }}>
                                        {cr(thisAmt)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#fde68a' }}>
                                        {pct(progressPct)}
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
                                    label={({ name, percent }) => percent !== undefined && percent * 100 > 5 ? `${(percent * 100).toFixed(0)}%` : ''}
                                    labelLine={false}
                                    onClick={() => onNavigate('po-abstract')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {tradeData.map((_, idx) => (
                                        <Cell key={idx} fill={TRADE_COLORS[idx % TRADE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px 4px' }}>
                            {tradeData.map((d, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                                        background: TRADE_COLORS[idx % TRADE_COLORS.length],
                                    }} />
                                    <span style={{ fontSize: 10, color: C.gray600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {d.name}
                                    </span>
                                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: C.gray400, flexShrink: 0 }}>
                                        {cr(d.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Section>
            </div>

            {/* ── Building vs Infra Split ──────────────────────────────────────────── */}
            <Section title="Building vs Infra Financial Split" action={<GoToBtn label="Bill Summary" page="abstract" onNavigate={onNavigate} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <SegmentCard
                        label="Warehouse Building (Civil, Electrical, Fire, Plumbing)"
                        color={C.blue}
                        scope={buildingScope}
                        cumulative={buildingCum}
                        thisBill={buildingThis}
                        onClick={() => onNavigate('building')}
                    />
                    <SegmentCard
                        label="Infrastructure (Civil, Services, Ancillary, Design)"
                        color={C.teal}
                        scope={infraScope}
                        cumulative={infraCum}
                        thisBill={infraThis}
                        onClick={() => onNavigate('infra')}
                    />
                </div>
            </Section>

            {/* ── Block-wise Progress Chart ─────────────────────────────────────────── */}
            <Section title="Block-wise Milestone Progress (Building)" action={<GoToBtn label="Building Milestones" page="building" onNavigate={onNavigate} />}>
                <Card style={{ padding: '16px' }}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={blockData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }} barGap={4}
                            onClick={() => onNavigate('building')} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.gray200} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray600 }}
                                tickFormatter={v => `₹${(v / 1e7).toFixed(0)}Cr`} width={68} />
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
                                    onClick={() => onNavigate('building')}
                                    title="Click to view Building Milestones"
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
                                        {pct(p)}
                                    </div>
                                    <div style={{ fontSize: 9, color: C.gray400, marginTop: 2 }}>
                                        {cr(b.cumulative)} / {cr(b.scope)}
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
                    <GoToBtn label="Building" page="building" onNavigate={onNavigate} />
                    <GoToBtn label="Infra" page="infra" onNavigate={onNavigate} />
                </div>
            }>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <MilestoneCard
                        title="Building Milestones (All Blocks)"
                        total={totalBuildingEntries}
                        completed={completedBuilding}
                        partial={partialBuilding}
                        color={C.blue}
                        onClick={() => onNavigate('building')}
                    />
                    <MilestoneCard
                        title="Infra Milestones"
                        total={totalInfra}
                        completed={completedInfra}
                        partial={partialInfra}
                        color={C.teal}
                        onClick={() => onNavigate('infra')}
                    />
                </div>

                {/* Infra milestones mini table (top 10 by value) */}
                <Card>
                    <div style={{
                        padding: '10px 14px', background: C.navy, borderTopLeftRadius: 9, borderTopRightRadius: 9,
                        fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>Infra Milestone Details (Top by Scope)</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: C.gray50 }}>
                                    {['Sno', 'Category', 'Description', 'Scope', 'Prev %', 'This %', 'Cum %', 'Status'].map(h => (
                                        <th key={h} style={{
                                            padding: '7px 10px', fontSize: 10, fontWeight: 700, color: C.gray600,
                                            textAlign: h === 'Description' || h === 'Category' ? 'left' : 'right',
                                            borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {infraRAMilestones
                                    .sort((a, b) => b.scopeAmount - a.scopeAmount)
                                    .slice(0, 12)
                                    .map((m, idx) => {
                                        const cumPct = m.cumPct * 100;
                                        const statusColor = cumPct >= 100 ? C.green : cumPct >= 50 ? C.blue : cumPct > 0 ? C.orange : C.gray400;
                                        const statusText = cumPct >= 100 ? 'Complete' : cumPct > 0 ? 'In Progress' : 'Not Started';
                                        const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                        return (
                                            <tr key={m.sno}
                                                onClick={() => openInfraDrill(m)}
                                                title="Click to view details"
                                                style={{ background: rowBg, cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                            >
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray400, textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray600, whiteSpace: 'nowrap' }}>{m.category}</td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, color: C.gray800, maxWidth: 220 }}>
                                                    <span title={m.description}>
                                                        {m.description.length > 60 ? m.description.slice(0, 57) + '…' : m.description}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600, whiteSpace: 'nowrap' }}>
                                                    {cr(m.scopeAmount)}
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray400 }}>
                                                    {pct(m.prevPct * 100)}
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.teal }}>
                                                    {m.thisPct > 0 ? pct(m.thisPct * 100) : '—'}
                                                </td>
                                                <td style={{ padding: '7px 10px', fontSize: 10, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: statusColor }}>
                                                    {pct(cumPct)}
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
                                    {['RA #', 'Label', 'Building Total', 'Infra Total', 'Grand Total', 'COP Status', 'Net Payable', 'Saved At'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#fff',
                                            textAlign: h === 'Label' || h === 'COP Status' || h === 'RA #' ? 'left' : 'right',
                                            whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allRAs.map((ra, idx) => {
                                    const cop = allCOPs.find(c => c.raNumber === ra.raNumber);
                                    const ss = cop ? (STATUS_STYLES[cop.status] ?? STATUS_STYLES.draft) : null;
                                    const rowBg = idx % 2 === 0 ? '#fff' : C.gray50;
                                    return (
                                        <tr key={ra.raNumber}
                                            onClick={() => onNavigate('cop')}
                                            title="Click to view COP"
                                            style={{ background: rowBg, cursor: 'pointer' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = C.bluePale)}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                        >
                                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: C.navy }}>RA-{ra.raNumber}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, color: C.gray600 }}>{ra.label}</td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600 }}>
                                                {cr(ra.buildingTotal)}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600 }}>
                                                {cr(ra.infraTotal)}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.blue }}>
                                                {cr(ra.grandTotal)}
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
                                                {cop ? cr(cop.netPayable) : <span style={{ color: C.gray400 }}>—</span>}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 10, textAlign: 'right', color: C.gray400 }}>
                                                {new Date(ra.savedAt).toLocaleDateString('en-IN')}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Summary row */}
                                <tr style={{ background: C.blueLight }}>
                                    <td colSpan={4} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: C.navy }}>
                                        Total — All Additional RAs
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: C.blue }}>
                                        {cr(raTotalBilled)}
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
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.red }}>{cr(m.total)}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.gray600 }}>{cr(m.prev)}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: C.red }}>{cr(m.thisV)}</td>
                                    </tr>);
                                })}
                                <tr style={{ background: C.redLight }}>
                                    <td colSpan={2} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: C.red }}>Total</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: C.red }}>
                                        {cr(materialTotal)}
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
                                            {cr(h.amt)}
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
                                        {cr(activeHolds)}
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
                    <div style={{ fontSize: 16, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.navy }}>{cr(scope)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color }}>{pct(p)}</div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>complete</div>
                </div>
            </div>
            <ProgressBar value={cumulative} max={scope} color={color} showPct={false} />
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>Cumulative Billed</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color }}>{cr(cumulative)}</div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>This Bill</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: thisBill > 0 ? color : C.gray400 }}>
                        {thisBill > 0 ? cr(thisBill) : '—'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: C.gray400 }}>Balance</div>
                    <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: C.orange }}>{cr(scope - cumulative)}</div>
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
                {total > 0 ? pct((completed / total) * 100) : '0.0%'} milestones fully completed
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
