'use client';

import React from 'react';
import { COPData, RABillData } from '@/lib/raStore';
import { fmt } from '@/lib/utils';

interface Props {
    allRAs: RABillData[];
    allCOPs: COPData[];
}

export default function AdjustmentsPage({ allRAs, allCOPs }: Props) {
    // Merge RAs and COPs to ensure all bills are visible
    const mergedData = allRAs.map(ra => {
        const cop = allCOPs.find(c => Number(c.raNumber) === Number(ra.raNumber));

        // Items to display
        let deductions = cop?.deductions || [];
        let additions = cop?.additions || [];
        let retentionPct = cop?.retentionPct || 5;
        let isDraft = !cop || cop.status === 'draft';

        // If no items found in current COP, carry forward structure from latest previous COP
        if (deductions.length === 0 && additions.length === 0) {
            const prevCops = allCOPs
                .filter(c => c.raNumber < ra.raNumber && c.status !== 'rejected')
                .sort((a, b) => b.raNumber - a.raNumber);

            if (prevCops.length > 0) {
                const latest = prevCops[0];
                deductions = latest.deductions?.map(d => ({ ...d, amount: 0 })) || [];
                additions = latest.additions?.map(a => ({ ...a, amount: 0 })) || [];
                retentionPct = latest.retentionPct ?? 5;
            }
        }

        return {
            raNumber: ra.raNumber,
            grossAmount: cop?.grossAmount || ra.grandTotal,
            savedAt: cop?.savedAt || ra.savedAt,
            status: cop?.status || 'draft',
            retentionPct,
            retentionAmt: cop?.retentionAmt || (ra.grandTotal * (retentionPct / 100)),
            deductions,
            additions,
            netPayable: cop?.netPayable || (ra.grandTotal * 1.18 * (1 - retentionPct / 100)), // Approx
            isDraft
        };
    });

    // Sort by RA number descending
    const sortedData = mergedData
        .filter(d => d.status !== 'rejected')
        .sort((a, b) => b.raNumber - a.raNumber);

    const resolveAmt = (item: any, gross: number) =>
        item.mode === 'pct' ? gross * (item.pct / 100) : item.amount;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f2044', margin: 0 }}>Deductions & Additions History</h1>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>RA-wise tracking of all dynamic adjustments</p>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {sortedData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                        <p>No RA Bills found. Create an RA Bill to see its history here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {sortedData.map(d => {
                            const gross = d.grossAmount ?? 0;
                            // For draft, we always show retention as an estimate
                            const hasItems = true;

                            return (
                                <div key={d.raNumber} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: d.isDraft ? 0.8 : 1 }}>
                                    <div style={{ background: d.isDraft ? '#f8fafc' : '#eff6ff', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ fontWeight: 800, color: '#0f2044' }}>RA Bill No. {d.raNumber}</div>
                                            {d.isDraft && <span style={{ background: '#cbd5e1', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>DRAFT / ESTIMATE</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>Gross: <span style={{ fontWeight: 700, color: '#0f2044' }}>₹{fmt(gross)}</span></div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={{ padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                                                <th style={{ padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Item Name</th>
                                                <th style={{ padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Rate / Mode</th>
                                                <th style={{ padding: '12px 20px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Retention */}
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 20px', color: '#b91c1c', fontWeight: 700 }}>RETENTION</td>
                                                <td style={{ padding: '12px 20px' }}>Security Deposit</td>
                                                <td style={{ padding: '12px 20px', color: '#64748b' }}>{d.retentionPct}% of Gross</td>
                                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(d.retentionAmt ?? 0)}</td>
                                            </tr>

                                            {/* Deductions */}
                                            {(d.deductions ?? []).map((item: any) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 20px', color: '#b91c1c', fontWeight: 700 }}>DEDUCTION</td>
                                                    <td style={{ padding: '12px 20px' }}>{item.name || 'Unnamed Deduction'}</td>
                                                    <td style={{ padding: '12px 20px', color: '#64748b' }}>
                                                        {item.mode === 'pct' ? `${item.pct}% of Gross` : 'Fixed Amount'}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {fmt(resolveAmt(item, gross))}
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Additions */}
                                            {(d.additions ?? []).map((item: any) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 20px', color: '#059669', fontWeight: 700 }}>ADDITION</td>
                                                    <td style={{ padding: '12px 20px' }}>{item.name || 'Unnamed Addition'}</td>
                                                    <td style={{ padding: '12px 20px', color: '#64748b' }}>
                                                        {item.mode === 'pct' ? `${item.pct}% of Gross` : 'Fixed Amount'}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {fmt(resolveAmt(item, gross))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: '#fefce8' }}>
                                                <td colSpan={3} style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'right', color: '#0f2044' }}>{d.isDraft ? 'Estimated Net Payable' : 'Net Payable This Bill'}</td>
                                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 900, color: '#166534', fontSize: 15, fontFamily: 'monospace' }}>
                                                    ₹{fmt(d.netPayable ?? 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
