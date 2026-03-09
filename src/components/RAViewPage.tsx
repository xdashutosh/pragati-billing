'use client';

import { Fragment, useState, useMemo } from 'react';
import { useVendor } from '@/lib/VendorContext';
import { RABillData } from '@/lib/raStore';
import { fmt } from '@/lib/utils';

interface Props {
    activeRA: RABillData | null;
    allRAs: RABillData[];
}

export default function RAViewPage({ activeRA, allRAs }: Props) {
    const { boqs, currentRA, getBOQMilestonesByRA } = useVendor();
    const [activeTabId, setActiveTabId] = useState<string>(boqs[0]?.id || 'building');
    const raNum = activeRA?.raNumber ?? currentRA;

    // Columns for combined view
    const historyCols = useMemo(() => {
        const savedCols = allRAs
            .filter(ra => ra.raNumber > 0)
            .map(ra => ({ label: `RA-${ra.raNumber}`, raNum: ra.raNumber, isSaved: true }));
        return savedCols;
    }, [allRAs, currentRA]);

    const renderBOQTable = (boqId: string) => {
        const milestones = getBOQMilestonesByRA(raNum, boqId);

        // Group by Category or Section
        const grouped: Record<string, number[]> = {};
        milestones.forEach((m: any, idx: number) => {
            const cat = m.category || m.section || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(idx);
        });

        const CAT_COLORS = ['#1a56b0', '#6b21a8', '#b91c1c', '#0e6d41', '#92400e', '#0f766e', '#4338ca'];

        return (
            <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
                <table className="data-table" style={{ minWidth: 1000 + allRAs.length * 120 }}>
                    <thead>
                        <tr>
                            <th style={{ width: 44 }}>S.No</th>
                            <th className="left" style={{ minWidth: 260 }}>Description</th>
                            <th style={{ width: 100 }}>Scope (₹)</th>

                            {historyCols.map(col => (
                                <th key={col.label} style={{
                                    width: 120,
                                    background: col.raNum === raNum ? '#1a56b0' : '#f1f5f9',
                                    color: col.raNum === raNum ? '#fff' : '#475569'
                                }}>
                                    {col.label}
                                </th>
                            ))}
                            <th style={{ width: 120 }}>Cumulative (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(grouped).map(([cat, indices], cIdx) => {
                            const col = CAT_COLORS[cIdx % CAT_COLORS.length] || '#1a56b0';
                            return (
                                <Fragment key={cat}>
                                    <tr>
                                        <td colSpan={historyCols.length + 4} style={{ background: col, color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 12px' }}>
                                            {cat}
                                        </td>
                                    </tr>
                                    {indices.map(idx => {
                                        const m = milestones[idx];
                                        const historyAmts = historyCols.map(col => {
                                            const ra = allRAs.find(r => r.raNumber === col.raNum);
                                            return ra?.boqEntries?.[boqId]?.[idx]?.amt ?? 0;
                                        });

                                        const cumAmt = historyAmts.reduce((s, a) => s + a, 0);

                                        return (
                                            <tr key={idx}>
                                                <td className="sno">{m.sno}</td>
                                                <td className="left">
                                                    <div>{m.description}</div>
                                                    {(m.qty !== undefined) && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{m.uom} | {m.qty} @ {m.rate} (Wt: {m.weightage ?? 100}%)</div>}
                                                </td>
                                                <td className="mono" style={{ color: '#475569' }}>{fmt(m.amount)}</td>

                                                {historyCols.map((col, hIdx) => {
                                                    const amt = historyAmts[hIdx];
                                                    return (
                                                        <td key={col.label} className="mono" style={{
                                                            color: amt > 0 ? '#1a56b0' : '#94a3b8',
                                                            fontWeight: amt > 0 ? 600 : 400,
                                                            background: col.raNum === raNum ? '#eff6ff' : undefined
                                                        }}>
                                                            {amt ? fmt(amt) : '–'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="mono" style={{ fontWeight: 600, color: '#1a56b0' }}>{cumAmt ? fmt(cumAmt) : '–'}</td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2044' }}>
                    Project BOQ History (Combined View)
                </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0, background: '#fff' }}>
                {boqs.map(boq => (
                    <button
                        key={boq.id}
                        onClick={() => setActiveTabId(boq.id)}
                        style={tabStyle(activeTabId === boq.id, boq.id.includes('legacy') ? '#1a56b0' : '#7c3aed')}
                    >
                        {boq.id === 'boq-bldg-legacy' ? '🏗 Building' : boq.id === 'boq-infra-legacy' ? '🛣 Infra' : `📄 ${boq.name}`}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderBOQTable(activeTabId)}
            </div>
        </div>
    );
}

function tabStyle(active: boolean, color: string): React.CSSProperties {
    return {
        padding: '8px 20px', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        borderRadius: '6px 6px 0 0', whiteSpace: 'nowrap',
        borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
        background: active ? '#fff' : 'transparent',
        color: active ? color : '#64748b',
        transition: 'all 0.2s',
    };
}
