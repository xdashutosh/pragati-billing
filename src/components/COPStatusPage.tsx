'use client';

import { useState, useEffect } from 'react';
import { loadAllCOPs, COPData, COPStatus } from '@/lib/raStore';
import { fmt } from '@/lib/utils';

const STATUS_CFG: Record<COPStatus, { label: string; color: string; bg: string; border: string }> = {
    draft: { label: 'Draft', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
    submitted: { label: 'Submitted', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
    approved: { label: 'Approved', color: '#166534', bg: '#f0fdf4', border: '#86efac' },
    rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

interface Props {
    onViewCOP: (raNumber: number) => void;
}

export default function COPStatusPage({ onViewCOP }: Props) {
    const [allCOPs, setAllCOPs] = useState<COPData[]>([]);

    useEffect(() => {
        setAllCOPs(loadAllCOPs().sort((a, b) => b.raNumber - a.raNumber));
    }, []);

    const stats = {
        total: allCOPs.length,
        approved: allCOPs.filter(c => c.status === 'approved').length,
        pending: allCOPs.filter(c => c.status === 'submitted').length,
        draft: allCOPs.filter(c => c.status === 'draft').length,
    };

    return (
        <div style={{ padding: '24px', background: '#f8fafc', height: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f2044', margin: 0 }}>COP Status Tracker</h1>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Monitor the approval workflow of all Certificates of Payment.</p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Total COPs" value={stats.total} color="#0f2044" />
                <StatCard label="Approved" value={stats.approved} color="#166534" />
                <StatCard label="Pending Approval" value={stats.pending} color="#b45309" />
                <StatCard label="In Draft" value={stats.draft} color="#475569" />
            </div>

            {/* COP List */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={thStyle}>COP Detail</th>
                            <th style={thStyle}>Amount (Net)</th>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Approval Progress</th>
                            <th style={thStyle}>Status</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allCOPs.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    No COPs found. Create one from the RA Bill view.
                                </td>
                            </tr>
                        ) : (
                            allCOPs.map(cop => (
                                <tr key={cop.raNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 700, color: '#0f2044' }}>{cop.copNumber}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>RA Bill - {cop.raNumber}</div>
                                    </td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>
                                        ₹{fmt(cop.netPayable)}
                                    </td>
                                    <td style={tdStyle}>
                                        {new Date(cop.savedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={tdStyle}>
                                        <ApprovalProgress approvals={cop.approvals || []} />
                                    </td>
                                    <td style={tdStyle}>
                                        <StatusPill status={cop.status} />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <button
                                            onClick={() => onViewCOP(cop.raNumber)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0',
                                                background: '#fff',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                color: '#1a56b0'
                                            }}
                                        >
                                            View Certificate
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color, marginTop: '8px' }}>{value}</div>
        </div>
    );
}

function StatusPill({ status }: { status: COPStatus }) {
    const cfg = STATUS_CFG[status];
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
