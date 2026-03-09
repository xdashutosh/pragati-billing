'use client';

import { useState, useEffect } from 'react';
import { loadAllCOPs, COPData, COPStatus, RABillData } from '@/lib/raStore';
import { fmt } from '@/lib/utils';

const STATUS_CFG: Record<COPStatus, { label: string; color: string; bg: string; border: string }> = {
    draft: { label: 'Draft', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
    prepared: { label: 'Prepared', color: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
    l1_approved: { label: 'L1 Checked', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc' },
    l2_approved: { label: 'L2 Verified', color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
    l3_approved: { label: 'L3 Certified', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
    approved: { label: 'Approved', color: '#166534', bg: '#f0fdf4', border: '#86efac' },
    rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

const APPROVAL_STAGES = [
    { level: 1, label: 'Checked By' },
    { level: 2, label: 'Verified By' },
    { level: 3, label: 'Certified By' },
    { level: 4, label: 'Approved By' },
];

const pendingLevel = (status: string): number | null =>
    ({ prepared: 1, l1_approved: 2, l2_approved: 3, l3_approved: 4 } as Record<string, number>)[status] ?? null;

interface Props {
    allRAs: RABillData[];
    allCOPs: COPData[];
    onUpdate: () => void;
    onViewCOP: (raNumber: number) => void;
    approvalsOnly?: boolean;
}

export default function COPStatusPage({ allRAs, allCOPs, onUpdate, onViewCOP, approvalsOnly = false }: Props) {
    // Merge RAs and COPs
    const mergedData = allRAs.map(ra => {
        // Use Number() to ensure type-safe comparison
        const cop = allCOPs.find(c => Number(c.raNumber) === Number(ra.raNumber));
        return {
            raNumber: ra.raNumber,
            copNumber: cop?.copNumber || `COP-${ra.raNumber}`,
            savedAt: cop?.savedAt || ra.savedAt,
            status: cop?.status || 'draft',
            netPayable: cop?.netPayable || ra.grandTotal * 1.18 * 0.95, // Approx: Add GST, subtract Retention
            approvals: cop?.approvals || [],
            isPlaceholder: !cop
        };
    });

    let filteredData = [...mergedData];
    if (approvalsOnly) {
        filteredData = filteredData.filter(d => !['approved', 'draft', 'rejected'].includes(d.status));
    }
    const sortedData = filteredData.sort((a, b) => b.raNumber - a.raNumber);

    const stats = {
        total: allRAs.length,
        approved: allCOPs.filter(c => c.status === 'approved').length,
        pending: allCOPs.filter(c => !['approved', 'draft', 'rejected'].includes(c.status)).length,
        // Draft count = RAs without COP + COPs in Draft status
        draft: (allRAs.length - allCOPs.filter(c => c.status !== 'rejected').length) + allCOPs.filter(c => c.status === 'draft').length,
        approvedValue: allCOPs.filter(c => c.status === 'approved').reduce((s, c) => s + (c.netPayable ?? 0), 0),
        pendingValue: allCOPs.filter(c => !['approved', 'draft', 'rejected'].includes(c.status)).reduce((s, c) => s + (c.netPayable ?? 0), 0),
    };

    return (
        <div style={{ padding: '24px', background: '#f8fafc', height: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f2044', margin: 0 }}>COP Status Tracker</h1>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Monitor the approval workflow of all Certificates of Payment.</p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Approved Value" value={`₹${fmt(stats.approvedValue)}`} color="#166534" sub={`${stats.approved} COPs`} />
                <StatCard label="Pending Value" value={`₹${fmt(stats.pendingValue)}`} color="#b45309" sub={`${stats.pending} COPs`} />
                <StatCard label="Total COPs" value={stats.total} color="#0f2044" />
                <StatCard label="In Draft" value={stats.draft} color="#475569" />
            </div>

            {/* COP List */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={thStyle}>COP Detail</th>
                            <th style={thStyle}>Amount (Net)</th>
                            <th style={thStyle}>Current Level</th>
                            <th style={thStyle}>Progress</th>
                            <th style={thStyle}>Status</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    {approvalsOnly ? 'No pending approvals found.' : 'No RA Bills found. Create your first RA bill to see it here.'}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map(d => {
                                const level = pendingLevel(d.status);
                                const stage = level ? APPROVAL_STAGES.find(s => s.level === level) : null;
                                return (
                                    <tr key={d.raNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 700, color: '#0f2044' }}>{d.copNumber}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>RA Bill - {d.raNumber}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>
                                                {new Date(d.savedAt).toLocaleDateString('en-IN')}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>
                                            ₹{fmt(d.netPayable)}
                                            {d.isPlaceholder && <span style={{ display: 'block', fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>(Estimated)</span>}
                                        </td>
                                        <td style={tdStyle}>
                                            {stage ? (
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a56b0' }}>L{level}: {stage.label}</div>
                                                    <div style={{ fontSize: '10px', color: '#64748b' }}>Awaiting...</div>
                                                </div>
                                            ) : d.status === 'approved' ? (
                                                <div style={{ color: '#166534', fontSize: '11px', fontWeight: 700 }}>✅ Certified</div>
                                            ) : d.status === 'draft' ? (
                                                <div style={{ color: '#64748b', fontSize: '11px' }}>Not Started</div>
                                            ) : (
                                                <div style={{ color: '#b91c1c', fontSize: '11px' }}>Rejected</div>
                                            )}
                                        </td>
                                        <td style={tdStyle}>
                                            <ApprovalProgress approvals={d.approvals || []} />
                                        </td>
                                        <td style={tdStyle}>
                                            <StatusPill status={d.status as any} />
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            <button onClick={() => onViewCOP(d.raNumber)} style={{ background: d.isPlaceholder ? '#1a56b0' : '#0f2044', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                {d.isPlaceholder ? '🚀 Certify' : level ? '✍️ Sign' : '👁 View'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
    return (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color, marginTop: '8px' }}>{value}</div>
            {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
        </div>
    );
}

function StatusPill({ status }: { status: COPStatus }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    return (
        <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
            textTransform: 'uppercase'
        }}>
            {cfg.label}
        </span>
    );
}

function ApprovalProgress({ approvals }: { approvals: any[] }) {
    const steps = approvals.length || 4;
    const completed = approvals.filter(a => a.status === 'signed').length;
    const pct = (completed / steps) * 100;

    return (
        <div style={{ width: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                <span>{completed}/{steps} Signatures</span>
                <span>{Math.round(pct)}%</span>
            </div>
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#166534' : '#1a56b0', transition: 'width 0.3s ease' }} />
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '13px',
    color: '#334155',
    verticalAlign: 'middle'
};
