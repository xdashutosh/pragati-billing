'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { billingSummaryItems, billingSummaryTotals } from '@/data/projectData';
import { fmt } from '@/lib/utils';

const COLORS = [
    '#0f2044', // Navy
    '#1a56b0', // Royal
    '#0d9488', // Teal
    '#059669', // Emerald
    '#ca8a04', // Golden
    '#b91c1c', // Crimson
    '#7c3aed', // Violet
    '#475569', // Slate
];
const STATUS_COLORS = {
    scope: '#0f2044',
    previous: '#94a3b8',
    current: '#22c55e',
    cumulative: '#1a56b0'
};

export default function ChartsPage() {
    // 1. Data Transformation: Aggregate by Block/Infra
    const processData = () => {
        const categories: Record<string, { name: string; scope: number; previous: number; current: number; cumulative: number }> = {
            'Block-1': { name: 'Block-1', scope: 0, previous: 0, current: 0, cumulative: 0 },
            'Block-2': { name: 'Block-2', scope: 0, previous: 0, current: 0, cumulative: 0 },
            'Block-3': { name: 'Block-3', scope: 0, previous: 0, current: 0, cumulative: 0 },
            'Block-4': { name: 'Block-4', scope: 0, previous: 0, current: 0, cumulative: 0 },
            'Infra': { name: 'Infra', scope: 0, previous: 0, current: 0, cumulative: 0 },
            'Others': { name: 'Others', scope: 0, previous: 0, current: 0, cumulative: 0 },
        };

        billingSummaryItems.forEach(item => {
            if (item.subItems && item.subItems.length > 0) {
                item.subItems.forEach(sub => {
                    let target = 'Others';
                    if (sub.description.includes('Block-1')) target = 'Block-1';
                    else if (sub.description.includes('Block-2')) target = 'Block-2';
                    else if (sub.description.includes('Block-3')) target = 'Block-3';
                    else if (sub.description.includes('Block-4')) target = 'Block-4';
                    else if (sub.description.toLowerCase().includes('infra')) target = 'Infra';

                    categories[target].scope += sub.orderAmount;
                    categories[target].previous += sub.prevBillAmount;
                    categories[target].current += sub.thisBillAmount;
                    categories[target].cumulative += sub.cumulativeAmount;
                });
            } else {
                // Top level items without subitems
                let target = 'Others';
                if (item.description.includes('Block-1')) target = 'Block-1';
                else if (item.description.includes('Block-2')) target = 'Block-2';
                else if (item.description.includes('Block-3')) target = 'Block-3';
                else if (item.description.includes('Block-4')) target = 'Block-4';
                else if (item.description.toLowerCase().includes('infra')) target = 'Infra';

                categories[target].scope += item.orderAmount;
                categories[target].previous += item.prevBillAmount;
                categories[target].current += item.thisBillAmount;
                categories[target].cumulative += item.cumulativeAmount;
            }
        });

        return Object.values(categories).filter(c => c.scope > 0);
    };

    const chartData = processData();

    // 2. Data for Percentage chart
    const percentageData = chartData.map(d => ({
        name: d.name,
        done: parseFloat(((d.cumulative / d.scope) * 100).toFixed(2)),
        pending: parseFloat((100 - (d.cumulative / d.scope) * 100).toFixed(2))
    }));

    // 3. Trade Distribution (Pie Chart) - Sorted and Grouped
    const getTradeData = () => {
        const total = billingSummaryTotals.orderAmount;
        let data = billingSummaryItems
            .filter(i => i.orderAmount > 0 && i.sno !== '10') // Exclude totals
            .map(i => ({
                name: i.description,
                value: i.orderAmount,
                percent: (i.orderAmount / total) * 100
            }))
            .sort((a, b) => b.value - a.value);

        const threshold = 2; // 2% 
        const large = data.filter(d => d.percent >= threshold);
        const small = data.filter(d => d.percent < threshold);

        if (small.length > 0) {
            large.push({
                name: 'Minor Categories / Others',
                value: small.reduce((sum, s) => sum + s.value, 0),
                percent: small.reduce((sum, s) => sum + s.percent, 0)
            });
        }
        return large;
    };

    const tradeData = getTradeData();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontWeight: 700, marginBottom: '5px', color: '#0f2044' }}>{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color, fontSize: '12px', margin: '2px 0' }}>
                            {entry.name}: ₹ {(entry.value / 1e7).toFixed(2)} Cr
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '0 10px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>

                {/* Chart 1: Total Scope vs Billing Progress */}
                <ChartCard title="Total Scope vs Billing Progress (Cr)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 1e7).toFixed(0)}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Bar dataKey="scope" name="Total Scope" fill={STATUS_COLORS.scope} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="previous" name="Prev. Billed" fill={STATUS_COLORS.previous} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="current" name="This Bill" fill={STATUS_COLORS.current} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Chart 2: Work Completion Percentage */}
                <ChartCard title="Work Completion % by Component">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={percentageData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={60} />
                            <Tooltip
                                formatter={(value: number | undefined) => `${value || 0}%`}
                                labelStyle={{ color: '#0f2044', fontWeight: 700 }}
                                itemStyle={{ color: '#475569' }}
                            />
                            <Legend
                                verticalAlign="top"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                formatter={(value) => <span style={{ color: '#475569' }}>{value}</span>}
                            />
                            <Bar dataKey="done" name="Completed %" stackId="a" fill={STATUS_COLORS.cumulative} />
                            <Bar dataKey="pending" name="Remaining %" stackId="a" fill="#d1d5db" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Chart 3: Trade Distribution (Financial) */}
                <ChartCard title="Project Value Distribution by Trade">
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={tradeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }: { name?: string; percent?: number }) => {
                                    if (typeof percent !== 'number' || percent < 0.05) return null;
                                    const n = name || 'Other';
                                    const shortName = n.length > 20 ? n.substring(0, 17) + '...' : n;
                                    return `${shortName} (${(percent * 100).toFixed(0)}%)`;
                                }}
                                labelLine={true}
                            >
                                {tradeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number | undefined) => `₹ ${((value || 0) / 1e7).toFixed(2)} Cr`}
                                itemStyle={{ color: '#0f2044', fontSize: '11px', fontWeight: 600 }}
                            />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Chart 4: Cumulative Billing Trend (Simplified) */}
                <ChartCard title="Billing Progress Trend">
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1a56b0" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#1a56b0" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 1e7).toFixed(1)}Cr`} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="cumulative" name="Cumulative Billed" stroke="#1a56b0" fillOpacity={1} fill="url(#colorCum)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
            padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column'
        }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f2044', marginBottom: '20px', borderLeft: '4px solid #1a56b0', paddingLeft: '10px' }}>
                {title}
            </h3>
            <div style={{ flex: 1, minHeight: '300px' }}>
                {children}
            </div>
        </div>
    );
}
