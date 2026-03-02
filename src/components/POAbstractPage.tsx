'use client';

import { useState } from 'react';
import {
  abstractSummary,
  buildingBlocks,
  infraSections,
  infraMilestones,
  infraMilestoneTotal,
  buildingMilestones,
  blockTotals,
} from '@/data/projectData';
import { fmt } from '@/lib/utils';

// ─── Sub-tab config ────────────────────────────────────────────────────────
type SubTab = 'summary' | 'building' | 'infra' | 'milestoneInfra' | 'milestoneBldg';

const TABS: { id: SubTab; label: string }[] = [
  { id: 'summary',       label: 'Abstract Summary'   },
  { id: 'building',      label: 'Building Cost Sheet' },
  { id: 'infra',         label: 'Infra Cost Sheet'    },
  { id: 'milestoneInfra',label: 'Milestone — Infra'   },
  { id: 'milestoneBldg', label: 'Milestone — Building'},
];

// ─── Shared pill ──────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 700,
      background: color + '20', color,
    }}>{label}</span>
  );
}

// ─── Section header row ────────────────────────────────────────────────────
function SectionRow({ label, cols }: { label: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{
        background: '#0f2044', color: '#fff',
        fontWeight: 700, fontSize: 11, padding: '7px 12px',
      }}>{label}</td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — ABSTRACT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
function AbstractSummaryTab() {
  const grandTotal = abstractSummary.totalBasicCost;

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table className="data-table" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th className="left" style={{ width: 50 }}>S.No</th>
            <th className="left" style={{ minWidth: 380 }}>Description</th>
            <th style={{ width: 180 }}>Amount (₹)</th>
            <th style={{ width: 130 }}>Rate / Sqft (₹)</th>
            <th style={{ width: 100 }}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {abstractSummary.items.map((item) => (
            <>
              <tr key={item.sno} style={{ background: item.subItems.length ? '#f8fafc' : '#fff' }}>
                <td className="sno" style={{ fontWeight: 700, color: '#0f2044' }}>{item.sno}</td>
                <td className="left" style={{ fontWeight: 600 }}>{item.description}</td>
                <td className="mono" style={{ fontWeight: 700, color: '#0f2044' }}>{fmt(item.amount)}</td>
                <td className="mono" style={{ fontSize: 11, color: '#475569' }}>
                  {item.ratePerSqft ? fmt(item.ratePerSqft) : '—'}
                </td>
                <td style={{ fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 48, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                      <div style={{
                        width: `${Math.min((item.amount / grandTotal) * 100, 100)}%`,
                        height: '100%', background: '#1a56b0', borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ color: '#475569' }}>{((item.amount / grandTotal) * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
              {item.subItems.map((sub, si) => (
                <tr key={`${item.sno}-${si}`} style={{ background: '#f1f5f9' }}>
                  <td className="sno" style={{ color: '#94a3b8', fontSize: 10 }}>↳</td>
                  <td className="left" style={{ paddingLeft: 28, fontSize: 11, color: '#475569' }}>{sub.description}</td>
                  <td className="mono" style={{ fontSize: 11, color: '#1a56b0' }}>{fmt(sub.amount)}</td>
                  <td></td>
                  <td style={{ fontSize: 11, color: '#94a3b8' }}>
                    {((sub.amount / item.amount) * 100).toFixed(1)}% of item
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td colSpan={2} className="left" style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 12px' }}>
              TOTAL BASIC COST (GST Excluding)
            </td>
            <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 14 }}>
              {fmt(grandTotal)}
            </td>
            <td className="mono" style={{ color: '#86efac', fontWeight: 700 }}>
              {fmt(abstractSummary.costPerSqft)}
            </td>
            <td style={{ color: '#86efac', fontWeight: 700 }}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — BUILDING COST SHEET
// ═══════════════════════════════════════════════════════════════════════════
function BuildingCostTab() {
  const [activeBlock, setActiveBlock] = useState(0);
  const block = buildingBlocks[activeBlock];

  const blockColors = ['#1e40af', '#166534', '#9a3412', '#6b21a8'];
  const col = blockColors[activeBlock];

  const blockGrandTotal = block.trades.reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Block selector */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 0 10px', flexShrink: 0 }}>
        {buildingBlocks.map((b, i) => {
          const label = b.block.replace('Land area of WH (', '').replace(')', '');
          return (
            <button key={i} onClick={() => setActiveBlock(i)} style={{
              padding: '6px 16px', borderRadius: 6, border: `2px solid ${blockColors[i]}`,
              background: activeBlock === i ? blockColors[i] : blockColors[i] + '15',
              color: activeBlock === i ? '#fff' : blockColors[i],
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{label}</button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: '#475569' }}>
            Plinth: <strong style={{ fontFamily: 'monospace', color: col }}>{fmt(block.plinthArea)} sqft</strong>
          </span>
          <span style={{ color: '#475569' }}>
            Mezz: <strong style={{ fontFamily: 'monospace', color: col }}>{fmt(block.mezzArea)} sqft</strong>
          </span>
          <span style={{ color: '#475569' }}>
            Total BUA: <strong style={{ fontFamily: 'monospace', color: col }}>{fmt(block.totalBUA)} sqft</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table" style={{ minWidth: 680 }}>
          <thead>
            <tr>
              <th className="left" style={{ width: 50 }}>Ref</th>
              <th className="left" style={{ minWidth: 380 }}>Description</th>
              <th style={{ width: 130 }}>Rate (₹)</th>
              <th style={{ width: 160 }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {block.trades.map((trade) => (
              <>
                <tr key={trade.tradeNo} style={{ background: col + '15' }}>
                  <td className="sno" style={{ color: col, fontWeight: 700 }}>{trade.tradeNo}</td>
                  <td className="left" style={{ fontWeight: 700, color: '#0f2044' }}>{trade.trade}</td>
                  <td className="mono" style={{ fontSize: 11, color: '#475569' }}>{fmt(trade.rate)}</td>
                  <td className="mono" style={{ fontWeight: 700, color: col }}>{fmt(trade.amount)}</td>
                </tr>
                {trade.items.map((item, ii) => (
                  <tr key={`${trade.tradeNo}-${ii}`}>
                    <td className="sno" style={{ color: '#94a3b8', fontSize: 10 }}>{item.ref}</td>
                    <td className="left" style={{ paddingLeft: 24, fontSize: 11, color: '#475569' }}>{item.description}</td>
                    <td></td>
                    <td className="mono" style={{ fontSize: 11 }}>{fmt(item.amount)}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: col }}>
              <td colSpan={3} className="left" style={{ color: '#fff', fontWeight: 700, padding: '9px 12px' }}>
                TOTAL — {block.block.replace('Land area of WH (', '').replace(')', '')}
              </td>
              <td className="mono" style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {fmt(blockGrandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — INFRA COST SHEET
// ═══════════════════════════════════════════════════════════════════════════
function InfraCostTab() {
  const [activeSection, setActiveSection] = useState(0);
  const section = infraSections[activeSection];

  const sectionColors = ['#1a56b0', '#0e6d41', '#c2410c', '#b91c1c', '#6b21a8'];
  const col = sectionColors[activeSection];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Section selector */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 0', flexShrink: 0, flexWrap: 'wrap' }}>
        {infraSections.map((s, i) => (
          <button key={i} onClick={() => setActiveSection(i)} style={{
            padding: '5px 12px', borderRadius: 6, border: `2px solid ${sectionColors[i]}`,
            background: activeSection === i ? sectionColors[i] : sectionColors[i] + '12',
            color: activeSection === i ? '#fff' : sectionColors[i],
            fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            {s.sno}. {s.section.replace(' Works ', '').replace(' works ', '').trim().slice(0, 28)}
          </button>
        ))}
      </div>

      {/* Section header card */}
      <div style={{
        background: col + '10', border: `1px solid ${col}30`,
        borderRadius: 6, padding: '10px 14px', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, color: '#0f2044' }}>{section.section}</div>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: col, fontSize: 14 }}>
          ₹ {fmt(section.amount)}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th className="left" style={{ width: 44 }}>Ref</th>
              <th className="left" style={{ minWidth: 320 }}>Description</th>
              <th style={{ width: 80 }}>Unit</th>
              <th style={{ width: 110 }}>Qty</th>
              <th style={{ width: 120 }}>Rate (₹)</th>
              <th style={{ width: 150 }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, i) => (
              <tr key={i}>
                <td className="sno">{item.ref}</td>
                <td className="left" style={{ fontSize: 11 }}>{item.description}</td>
                <td style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>{item.unit}</td>
                <td className="mono" style={{ fontSize: 11 }}>{item.qty ? fmt(item.qty) : '—'}</td>
                <td className="mono" style={{ fontSize: 11 }}>{item.rate ? fmt(item.rate) : '—'}</td>
                <td className="mono" style={{ fontWeight: item.amount > 5000000 ? 700 : 400, color: item.amount > 5000000 ? col : undefined }}>
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: col }}>
              <td colSpan={5} className="left" style={{ color: '#fff', fontWeight: 700, padding: '9px 12px' }}>
                SECTION TOTAL
              </td>
              <td className="mono" style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {fmt(section.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — MILESTONE INFRA
// ═══════════════════════════════════════════════════════════════════════════
function MilestoneInfraTab() {
  // Group by category
  const categories = Array.from(new Set(infraMilestones.map(m => m.category))).filter(Boolean);
  const grouped: Record<string, typeof infraMilestones> = {};
  infraMilestones.forEach(m => {
    if (!m.category) return;
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  const catColors: Record<string, string> = {
    'Infra Civil Works':        '#1a56b0',
    'External Electrical Works':'#6b21a8',
    'External Fire Works':      '#b91c1c',
    'Consultant Fees for Complete Park': '#0e6d41',
  };

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table className="data-table" style={{ minWidth: 820 }}>
        <thead>
          <tr>
            <th className="left" style={{ width: 50 }}>S.No</th>
            <th className="left" style={{ minWidth: 420 }}>Milestone Description</th>
            <th style={{ width: 90 }}>% of Total</th>
            <th style={{ width: 160 }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <>
              <SectionRow key={`cat-${cat}`} label={cat} cols={4} />
              {grouped[cat].map((m, i) => (
                <tr key={`${cat}-${i}`}>
                  <td className="sno">{m.sno}</td>
                  <td className="left" style={{ fontSize: 11 }}>{m.description}</td>
                  <td style={{ fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{
                          width: `${Math.min(m.pct * 100 * 3, 100)}%`,
                          height: '100%', background: catColors[cat] || '#1a56b0', borderRadius: 2,
                        }} />
                      </div>
                      <span>{(m.pct * 100).toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="mono">{fmt(m.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: (catColors[cat] || '#1a56b0') + '15' }}>
                <td colSpan={3} className="left" style={{
                  fontWeight: 700, fontSize: 11, paddingLeft: 16,
                  color: catColors[cat] || '#1a56b0',
                }}>
                  Sub-total — {cat}
                </td>
                <td className="mono" style={{ fontWeight: 700, color: catColors[cat] || '#1a56b0' }}>
                  {fmt(grouped[cat].reduce((s, m) => s + m.amount, 0))}
                </td>
              </tr>
            </>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td colSpan={3} className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>
              TOTAL INFRA AMOUNT (Incl. Ext. Electrical + Ext. Fire + Design)
            </td>
            <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 14 }}>
              {fmt(infraMilestoneTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — MILESTONE BUILDING
// ═══════════════════════════════════════════════════════════════════════════
function MilestoneBldgTab() {
  const categories = Array.from(new Set(buildingMilestones.map(m => m.category))).filter(Boolean);
  const grouped: Record<string, typeof buildingMilestones> = {};
  buildingMilestones.forEach(m => {
    if (!m.category) return;
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  const catColors: Record<string, string> = {
    'Building Civil Works':          '#1a56b0',
    'Internal Fire Works':           '#b91c1c',
    'Internal Electrical Fighting Works': '#6b21a8',
    'Internal Plumbing Works':       '#0e6d41',
  };

  const blockColors = ['#1e40af', '#166534', '#9a3412', '#6b21a8'];
  const grandTotal = blockTotals.block1 + blockTotals.block2 + blockTotals.block3 + blockTotals.block4;

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      {/* Block totals banner */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto',
        gap: 8, marginBottom: 10, flexShrink: 0,
      }}>
        {(['block1','block2','block3','block4'] as const).map((key, i) => (
          <div key={key} style={{
            background: blockColors[i] + '15', border: `1px solid ${blockColors[i]}30`,
            borderRadius: 6, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>Block-{i+1} Total</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: blockColors[i], fontSize: 13 }}>
              ₹ {fmt(blockTotals[key])}
            </div>
          </div>
        ))}
        <div style={{
          background: '#0f2044', borderRadius: 6, padding: '8px 14px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Grand Total</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#86efac', fontSize: 13 }}>
            ₹ {fmt(grandTotal)}
          </div>
        </div>
      </div>

      <table className="data-table" style={{ minWidth: 1000 }}>
        <thead>
          <tr>
            <th className="left" style={{ minWidth: 340 }}>Milestone Description</th>
            <th style={{ width: 80 }}>%</th>
            <th style={{ width: 150, background: '#dbeafe', color: '#1e40af' }}>Block-1 (₹)</th>
            <th style={{ width: 150, background: '#dcfce7', color: '#166534' }}>Block-2 (₹)</th>
            <th style={{ width: 150, background: '#ffedd5', color: '#9a3412' }}>Block-3 (₹)</th>
            <th style={{ width: 150, background: '#f3e8ff', color: '#6b21a8' }}>Block-4 (₹)</th>
            <th style={{ width: 150 }}>Row Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <>
              <SectionRow key={`cat-${cat}`} label={cat} cols={7} />
              {grouped[cat].map((m, i) => {
                const rowTotal = m.b1 + m.b2 + m.b3 + m.b4;
                return (
                  <tr key={`${cat}-${i}`}>
                    <td className="left" style={{ fontSize: 11 }}>{m.description}</td>
                    <td style={{ fontSize: 11, color: '#475569' }}>
                      {m.pct ? (m.pct * 100).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 11, background: '#eff6ff' }}>
                      {m.b1 ? fmt(m.b1) : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 11, background: '#f0fdf4' }}>
                      {m.b2 ? fmt(m.b2) : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 11, background: '#fff7ed' }}>
                      {m.b3 ? fmt(m.b3) : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 11, background: '#faf5ff' }}>
                      {m.b4 ? fmt(m.b4) : '—'}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: '#0f2044' }}>
                      {fmt(rowTotal)}
                    </td>
                  </tr>
                );
              })}
              {/* Category subtotal */}
              <tr style={{ background: (catColors[cat] || '#1a56b0') + '15' }}>
                <td className="left" style={{ fontWeight: 700, color: catColors[cat] || '#1a56b0', paddingLeft: 12 }}>
                  Sub-total — {cat}
                </td>
                <td></td>
                {(['b1','b2','b3','b4'] as const).map((key, ci) => (
                  <td key={key} className="mono" style={{ fontWeight: 700, color: blockColors[ci] }}>
                    {fmt(grouped[cat].reduce((s, m) => s + m[key], 0))}
                  </td>
                ))}
                <td className="mono" style={{ fontWeight: 700, color: catColors[cat] || '#1a56b0' }}>
                  {fmt(grouped[cat].reduce((s, m) => s + m.b1 + m.b2 + m.b3 + m.b4, 0))}
                </td>
              </tr>
            </>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>
              TOTAL BUILDING WORK (All Blocks)
            </td>
            <td style={{ color: '#fff' }}>100%</td>
            {(['block1','block2','block3','block4'] as const).map((key, i) => (
              <td key={key} className="mono" style={{ color: '#86efac', fontWeight: 700 }}>
                {fmt(blockTotals[key])}
              </td>
            ))}
            <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 14 }}>
              {fmt(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function POAbstractPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');

  return (
    <div style={{
      background: '#fff', border: '1px solid #d1d5db',
      borderRadius: 8, height: '100%',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #d1d5db',
        background: '#f8fafc', flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2044' }}>
          PO Abstract — Pragati Echur Project
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          WO: LPWWPL/ECHUR/PROJECT/24-25/08 &nbsp;|&nbsp;
          Contractor: M/s. Conserve Buildcon LLP &nbsp;|&nbsp;
          Total: ₹ {fmt(abstractSummary.totalBasicCost)} (excl. GST)
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '8px 16px 0',
        borderBottom: '1px solid #d1d5db', background: '#f8fafc', flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              borderRadius: '4px 4px 0 0',
              borderBottom: activeTab === tab.id ? '2px solid #1a56b0' : '2px solid transparent',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#1a56b0' : '#475569',
              transition: 'all 0.1s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 }}>
        {activeTab === 'summary'        && <AbstractSummaryTab />}
        {activeTab === 'building'       && <BuildingCostTab />}
        {activeTab === 'infra'          && <InfraCostTab />}
        {activeTab === 'milestoneInfra' && <MilestoneInfraTab />}
        {activeTab === 'milestoneBldg'  && <MilestoneBldgTab />}
      </div>
    </div>
  );
}
