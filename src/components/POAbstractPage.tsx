'use client';

import React, { useState, useRef } from 'react';
import { useVendor } from '@/lib/VendorContext';
import { fmt } from '@/lib/utils';
import { BOQSheet, BOQItem } from '@/data/projectData';
import * as XLSX from 'xlsx';

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
// ABSTRACT SUMMARY TAB (read-only, auto-derived from BOQs)
// ═══════════════════════════════════════════════════════════════════════════
function AbstractSummaryTab({ boqs }: { boqs: BOQSheet[] }) {
  // Aggregate data: Section -> { total: number, categories: Map<category, amount> }
  const sectionMap: Record<string, { total: number; subItems: Record<string, number> }> = {};

  boqs.forEach(boq => {
    boq.items.forEach(item => {
      const sec = item.section || 'Uncategorized';
      const cat = item.category || '';
      const amt = item.amount || 0;

      if (!sectionMap[sec]) {
        sectionMap[sec] = { total: 0, subItems: {} };
      }
      sectionMap[sec].total += amt;
      if (cat) {
        sectionMap[sec].subItems[cat] = (sectionMap[sec].subItems[cat] || 0) + amt;
      }
    });
  });

  const sortedSections = Object.keys(sectionMap).sort();
  const grandTotal = Object.values(sectionMap).reduce((s, it) => s + it.total, 0);

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table className="data-table" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th className="left" style={{ width: 50 }}>S.No</th>
            <th className="left" style={{ minWidth: 380 }}>Description</th>
            <th style={{ width: 180 }}>Amount (₹)</th>
            <th style={{ width: 100 }}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {sortedSections.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No items found. Add sections and items in the BOQ tabs.
              </td>
            </tr>
          )}
          {sortedSections.map((secName, idx) => {
            const data = sectionMap[secName];
            const categories = Object.keys(data.subItems).sort();

            return (
              <React.Fragment key={secName}>
                <tr style={{ background: categories.length ? '#f8fafc' : '#fff' }}>
                  <td className="sno" style={{ fontWeight: 700, color: '#0f2044' }}>{(idx + 1)}</td>
                  <td className="left" style={{ fontWeight: 600 }}>{secName}</td>
                  <td className="mono" style={{ fontWeight: 700, color: '#0f2044' }}>{fmt(data.total)}</td>
                  <td style={{ fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 48, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{
                          width: `${Math.min((data.total / (grandTotal || 1)) * 100, 100)}%`,
                          height: '100%', background: '#1a56b0', borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ color: '#475569' }}>{grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </td>
                </tr>
                {categories.map((cat, ci) => (
                  <tr key={`${secName}-sub-${ci}`} style={{ background: '#eef2ff' }}>
                    <td style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}></td>
                    <td className="left" style={{ paddingLeft: 20, fontSize: 10, fontWeight: 700, color: '#1a56b0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {cat}
                    </td>
                    <td className="mono" style={{ fontSize: 10, fontWeight: 600, color: '#1a56b0' }}>{fmt(data.subItems[cat])}</td>
                    <td></td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td colSpan={2} className="left" style={{ color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 12px' }}>
              TOTAL BASIC COST (GST Excluding)
            </td>
            <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 14 }}>
              {fmt(grandTotal)}
            </td>
            <td style={{ color: '#86efac', fontWeight: 700, textAlign: 'center' }}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC BOQ TAB (editable, used for every dynamic BOQ)
// ═══════════════════════════════════════════════════════════════════════════
interface BOQTabProps {
  boq: BOQSheet;
  isEditing: boolean;
  onUpdate: (items: BOQItem[]) => void;
}

function BOQTab({ boq, isEditing, onUpdate }: BOQTabProps) {
  const items = boq.items || [];
  const sections = Array.from(new Set(items.map(m => m.section).filter(Boolean)));

  const handleUpdate = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'rate' || field === 'weightage') {
      const q = Number(item.qty) || 0;
      const r = Number(item.rate) || 0;
      const w = item.weightage !== undefined ? Number(item.weightage) : 100;
      item.amount = q * r * (w / 100);
    }
    newItems[index] = item;
    onUpdate(newItems);
  };

  const handleAddRow = (section: string, category: string) => {
    const newItem: BOQItem = {
      sno: (items.length + 1).toString(),
      section, category,
      description: 'New Item',
      uom: 'Nos', qty: 0, rate: 0, weightage: 100, amount: 0,
    };
    onUpdate([...items, newItem]);
  };

  const handleAddSection = () => {
    const name = prompt('Enter new section name:');
    if (!name) return;
    handleAddRow(name, '');
  };

  const handleAddCategory = (section: string) => {
    const name = prompt('Enter new sub-section name (e.g. Block A, Phase 1):');
    if (!name) return;

    // Check if we have a single purely placeholder item at the root of this section
    const secItems = items.filter(m => m.section === section);
    const placeholderIdx = items.findIndex(m =>
      m.section === section &&
      m.category === '' &&
      m.description === 'New Item' &&
      m.qty === 0 &&
      m.rate === 0
    );

    if (secItems.length === 1 && placeholderIdx !== -1) {
      // Repurpose the placeholder
      const newItems = [...items];
      newItems[placeholderIdx] = { ...newItems[placeholderIdx], category: name };
      onUpdate(newItems);
    } else {
      handleAddRow(section, name);
    }
  };

  const handleDelete = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const getSectionTotal = (section: string) =>
    items.filter(m => m.section === section).reduce((s, m) => s + (m.amount || 0), 0);

  const getGrandTotal = () => items.reduce((s, m) => s + (m.amount || 0), 0);

  const catColors: Record<string, string> = {};
  const palette = ['#1a56b0', '#6b21a8', '#b91c1c', '#0e6d41', '#92400e', '#0369a1', '#7c3aed', '#be185d'];
  sections.forEach((sec, i) => { catColors[sec] = palette[i % palette.length]; });

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table className="data-table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th className="left" style={{ width: 50 }}>S.No</th>
            <th className="left" style={{ minWidth: 320 }}>Description</th>
            <th style={{ width: 80 }}>UOM</th>
            <th style={{ width: 100 }}>Qty</th>
            <th style={{ width: 120 }}>Rate (₹)</th>
            <th style={{ width: 100 }}>Weightage (%)</th>
            <th style={{ width: 150 }}>Amount (₹)</th>
            {isEditing && <th style={{ width: 50 }}></th>}
          </tr>
        </thead>
        <tbody>
          {sections.length === 0 && !isEditing && (
            <tr>
              <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                This BOQ is empty. Click <strong>Edit Baseline</strong> to add items.
              </td>
            </tr>
          )}
          {sections.length === 0 && isEditing && (
            <tr>
              <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                No sections added. Click below to start, or upload an Excel template.
              </td>
            </tr>
          )}
          {sections.map(sec => {
            const secItems = items.filter(m => m.section === sec);
            const categories = Array.from(new Set(secItems.map(m => m.category).filter(Boolean)));
            const hasCategories = categories.length > 0 && categories.some(c => c !== '');

            return (
              <React.Fragment key={sec}>
                <SectionRow label={sec} cols={isEditing ? 8 : 7} />

                {hasCategories ? (
                  categories.map(cat => (
                    <React.Fragment key={`${sec}-${cat}`}>
                      {cat && (
                        <tr>
                          <td colSpan={isEditing ? 8 : 7} style={{
                            background: '#f1f5f9', color: '#475569',
                            fontSize: 10, fontWeight: 700, padding: '4px 12px',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            {cat}
                          </td>
                        </tr>
                      )}
                      {items.map((m, idx) => {
                        if (m.section !== sec || m.category !== cat) return null;
                        return renderItemRow(m, idx);
                      })}
                      {isEditing && (
                        <tr>
                          <td colSpan={8} style={{ padding: '4px 12px' }}>
                            <button onClick={() => handleAddRow(sec, cat)} style={btnDashedSmall}>+ Add Row to {cat || sec}</button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    {items.map((m, idx) => {
                      if (m.section !== sec) return null;
                      return renderItemRow(m, idx);
                    })}
                    {isEditing && (
                      <tr>
                        <td colSpan={8} style={{ padding: '4px 12px' }}>
                          <button onClick={() => handleAddRow(sec, '')} style={btnDashedSmall}>+ Add Row to {sec}</button>
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {isEditing && (
                  <tr>
                    <td colSpan={8} style={{ padding: '8px 12px' }}>
                      <button onClick={() => handleAddCategory(sec)} style={{
                        width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1',
                        color: '#475569', fontSize: 10, fontWeight: 600, padding: 4, borderRadius: 4, cursor: 'pointer'
                      }}>+ Add Sub-section to {sec}</button>
                    </td>
                  </tr>
                )}

                <tr style={{ background: (catColors[sec] || '#1a56b0') + '10' }}>
                  <td colSpan={isEditing ? 6 : 5} className="left" style={{
                    fontWeight: 700, fontSize: 11, paddingLeft: 16,
                    color: catColors[sec] || '#1a56b0',
                  }}>Sub-total — {sec}</td>
                  <td className="mono" style={{ fontWeight: 700, color: catColors[sec] || '#1a56b0', textAlign: 'right' }}>
                    {fmt(getSectionTotal(sec))}
                  </td>
                  {isEditing && <td></td>}
                </tr>
              </React.Fragment>
            );
          })}

          {isEditing && (
            <tr>
              <td colSpan={8} style={{ padding: '12px 16px', background: '#f0fdf4', borderTop: '2px solid #059669' }}>
                <button onClick={handleAddSection} style={{
                  width: '100%', padding: '12px', background: '#059669', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>+ Create New Section</button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td colSpan={isEditing ? 6 : 5} className="left" style={{ color: '#fff', fontWeight: 700, padding: '10px 12px' }}>
              TOTAL — {boq.name}
            </td>
            <td className="mono" style={{ color: '#86efac', fontWeight: 700, fontSize: 15 }}>
              {fmt(getGrandTotal())}
            </td>
            {isEditing && <td></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );

  function renderItemRow(m: BOQItem, idx: number) {
    return (
      <tr key={idx}>
        <td className="sno">
          {isEditing ? (
            <input value={m.sno} onChange={e => handleUpdate(idx, 'sno', e.target.value)} style={inputInline('center')} />
          ) : m.sno}
        </td>
        <td className="left" style={{ fontSize: 11 }}>
          {isEditing ? (
            <input value={m.description} onChange={e => handleUpdate(idx, 'description', e.target.value)} style={inputInline('left')} />
          ) : m.description}
        </td>
        <td style={{ fontSize: 11, color: '#475569' }}>
          {isEditing ? (
            <input value={m.uom} onChange={e => handleUpdate(idx, 'uom', e.target.value)} style={inputInline('center')} />
          ) : (m.uom || '—')}
        </td>
        <td className="mono" style={{ fontSize: 11 }}>
          {isEditing ? (
            <input type="number" value={m.qty} onChange={e => handleUpdate(idx, 'qty', parseFloat(e.target.value) || 0)} style={{ ...inputInline('right'), fontFamily: 'monospace' }} />
          ) : (m.qty ? fmt(m.qty) : '—')}
        </td>
        <td className="mono" style={{ fontSize: 11 }}>
          {isEditing ? (
            <input type="number" value={m.rate} onChange={e => handleUpdate(idx, 'rate', parseFloat(e.target.value) || 0)} style={{ ...inputInline('right'), fontFamily: 'monospace' }} />
          ) : (m.rate ? fmt(m.rate) : '—')}
        </td>
        <td className="mono" style={{ fontSize: 11 }}>
          {isEditing ? (
            <input type="number" value={m.weightage ?? 100} onChange={e => handleUpdate(idx, 'weightage', parseFloat(e.target.value) || 0)} style={{ ...inputInline('right'), fontFamily: 'monospace' }} />
          ) : ((m.weightage ?? 100) + '%')}
        </td>
        <td className="mono" style={{ fontWeight: 600, color: '#0f2044' }}>{fmt(m.amount)}</td>
        {isEditing && (
          <td>
            <button onClick={() => handleDelete(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
          </td>
        )}
      </tr>
    );
  }
}

const inputInline = (align: string): React.CSSProperties => ({
  width: '100%', border: 'none', background: 'transparent', textAlign: align as any,
});
const btnDashedSmall: React.CSSProperties = {
  background: 'transparent', border: '1px dashed #ccc', color: '#64748b',
  fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
};

// ═══════════════════════════════════════════════════════════════════════════
// NEW BOQ MODAL
// ═══════════════════════════════════════════════════════════════════════════
function NewBOQModal({ onClose, onCreate, onUpload }: {
  onClose: () => void;
  onCreate: (name: string) => void;
  onUpload: (name: string, items: BOQItem[]) => void;
}) {
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) {
      if (!name.trim()) alert('Please enter a BOQ name first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        const items: BOQItem[] = rows.map((row, idx) => {
          const qty = Number(row['Qty'] || row['qty'] || 0);
          const rate = Number(row['Rate'] || row['rate'] || 0);
          const weightage = Number(row['Weightage (%)'] || row['Weightage'] || row['weightage']) || (row['Weightage (%)'] !== undefined ? 0 : 100);
          const amount = Number(row['Amount'] || row['amount'] || 0) || (qty * rate * (weightage / 100));
          return {
            sno: String(row['S.No'] || row['SNo'] || row['sno'] || (idx + 1)),
            section: String(row['Section'] || row['section'] || ''),
            category: String(row['Category'] || row['category'] || row['Sub-Section'] || ''),
            description: String(row['Description'] || row['description'] || ''),
            uom: String(row['UOM'] || row['uom'] || 'Nos'),
            qty,
            rate,
            weightage,
            amount,
          };
        });
        onUpload(name.trim(), items);
      } catch (err) {
        alert('Failed to parse the uploaded file. Please check the format.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { 'S.No': '1', Section: 'Civil Works', Category: 'Block A', Description: 'Foundation Works', UOM: 'Sqm', Qty: 100, Rate: 500, 'Weightage (%)': 100, Amount: 50000 },
      { 'S.No': '2', Section: 'Civil Works', Category: 'Block A', Description: 'Column & Beam', UOM: 'Rmt', Qty: 200, Rate: 300, 'Weightage (%)': 100, Amount: 60000 },
      { 'S.No': '3', Section: 'Electrical Works', Category: '', Description: 'HT Cabling', UOM: 'Rmt', Qty: 500, Rate: 150, 'Weightage (%)': 100, Amount: 75000 },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ Template');
    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.writeFile(wb, 'BOQ_Template.xlsx');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2044', marginBottom: 16 }}>
          Create New BOQ
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
          BOQ Name
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Infra Works, Building Phase-1"
          autoFocus
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 20,
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => { if (name.trim()) onCreate(name.trim()); else alert('Please enter a name.'); }}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            Create Empty
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #1a56b0',
              background: '#fff', color: '#1a56b0', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            Upload Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleUpload} />
        </div>

        <button onClick={downloadTemplate} style={{
          width: '100%', padding: '8px', borderRadius: 6, border: '1px dashed #94a3b8',
          background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', marginBottom: 12,
        }}>
          ↓ Download Excel Template
        </button>

        <button onClick={onClose} style={{
          width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RENAME MODAL
// ═══════════════════════════════════════════════════════════════════════════
function RenameModal({ currentName, onClose, onRename }: {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}) {
  const [name, setName] = useState(currentName);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f2044', marginBottom: 12 }}>Rename BOQ</div>
        <input
          value={name} onChange={e => setName(e.target.value)} autoFocus
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => { if (name.trim()) onRename(name.trim()); }} style={{
            flex: 1, padding: '8px', borderRadius: 6, border: 'none',
            background: '#1a56b0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function POAbstractPage() {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [showNewBOQModal, setShowNewBOQModal] = useState(false);
  const [renamingBOQId, setRenamingBOQId] = useState<string | null>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const {
    activeProject,
    abstractSummary,
    updateProject,
    boqs,
    migrateLegacyToBOQs
  } = useVendor();

  const projectName = isEditing ? draft?.name : (activeProject?.name || 'Project');
  const woNumber = isEditing ? draft?.woNumber : (activeProject?.woNumber || '—');
  const contractor = isEditing ? draft?.contractor : (activeProject?.contractor || '—');
  const client = isEditing ? draft?.client : (activeProject?.client || '—');


  // Current BOQs (from draft when editing, otherwise from project with legacy migration fallback)
  const currentBOQs: BOQSheet[] = isEditing
    ? (draft?.boqs || [])
    : boqs;

  // Rebuild abstract summary from BOQs
  const rebuildAbstractFromBOQs = (project: any) => {
    const boqs: BOQSheet[] = project.boqs || [];

    // Build abstract items from BOQs
    const allItems = boqs.map((boq, idx) => {
      const boqTotal = boq.items.reduce((s: number, it: BOQItem) => s + (it.amount || 0), 0);
      const sections = Array.from(new Set(boq.items.map(it => it.section).filter(Boolean)));
      const subItems = sections.map(sec => {
        const secItems = boq.items.filter(it => it.section === sec);
        const secTotal = secItems.reduce((s: number, it: BOQItem) => s + (it.amount || 0), 0);
        return { section: sec, description: sec, amount: secTotal };
      });
      return {
        sno: (idx + 1).toString(),
        description: boq.name,
        amount: boqTotal,
        ratePerSqft: boqTotal / (project.grandTotalArea || 1),
        subItems,
      };
    });

    const totalBasicCost = allItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      ...project,
      totalBasicCost,
      costPerSqft: totalBasicCost / (project.grandTotalArea || 1),
      abstractSummary: {
        ...(project.abstractSummary || {}),
        items: allItems,
        totalBasicCost,
      },
      billingSummary: {
        ...(project.billingSummary || {}),
        totals: {
          ...(project.billingSummary?.totals || {}),
          orderAmount: totalBasicCost,
        },
      },
    };
  };

  const handleEdit = () => {
    if (!activeProject) return;
    const projectCopy = JSON.parse(JSON.stringify(activeProject));
    // Auto-migrate legacy data
    projectCopy.boqs = migrateLegacyToBOQs(projectCopy);
    setDraft(projectCopy);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const rebuilt = rebuildAbstractFromBOQs(draft);
      await updateProject(rebuilt);
      setIsEditing(false);
      setDraft(null);
    } catch (e) {
      alert('Failed to save project baseline');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(null);
    setActiveTab('summary');
  };

  const updateDraft = (updater: (prev: any) => any) => {
    setDraft((prev: any) => {
      const updated = updater(prev);
      return rebuildAbstractFromBOQs(updated);
    });
  };

  // BOQ CRUD
  const handleCreateBOQ = (name: string) => {
    const newBOQ: BOQSheet = {
      id: `boq-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };
    updateDraft(d => ({ ...d, boqs: [...(d.boqs || []), newBOQ] }));
    setShowNewBOQModal(false);
    setActiveTab(newBOQ.id);
  };

  const handleUploadBOQ = (name: string, items: BOQItem[]) => {
    const newBOQ: BOQSheet = {
      id: `boq-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      items,
    };
    updateDraft(d => ({ ...d, boqs: [...(d.boqs || []), newBOQ] }));
    setShowNewBOQModal(false);
    setActiveTab(newBOQ.id);
  };

  const handleDeleteBOQ = (boqId: string) => {
    if (!confirm('Delete this BOQ? This cannot be undone.')) return;
    updateDraft(d => ({
      ...d,
      boqs: (d.boqs || []).filter((b: BOQSheet) => b.id !== boqId),
    }));
    setActiveTab('summary');
  };

  const handleRenameBOQ = (boqId: string, newName: string) => {
    updateDraft(d => ({
      ...d,
      boqs: (d.boqs || []).map((b: BOQSheet) =>
        b.id === boqId ? { ...b, name: newName } : b
      ),
    }));
    setRenamingBOQId(null);
  };

  const handleUpdateBOQItems = (boqId: string, items: BOQItem[]) => {
    updateDraft(d => ({
      ...d,
      boqs: (d.boqs || []).map((b: BOQSheet) =>
        b.id === boqId ? { ...b, items } : b
      ),
    }));
  };

  // Upload Excel into an existing BOQ tab
  const handleUploadIntoExistingBOQ = (boqId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);

          const items: BOQItem[] = rows.map((row, idx) => {
            const qty = Number(row['Qty'] || row['qty'] || 0);
            const rate = Number(row['Rate'] || row['rate'] || 0);
            const weightage = Number(row['Weightage (%)'] || row['Weightage'] || row['weightage']) || (row['Weightage (%)'] !== undefined ? 0 : 100);
            const amount = Number(row['Amount'] || row['amount'] || 0) || (qty * rate * (weightage / 100));
            return {
              sno: String(row['S.No'] || row['SNo'] || row['sno'] || (idx + 1)),
              section: String(row['Section'] || row['section'] || ''),
              category: String(row['Category'] || row['category'] || row['Sub-Section'] || ''),
              description: String(row['Description'] || row['description'] || ''),
              uom: String(row['UOM'] || row['uom'] || 'Nos'),
              qty,
              rate,
              weightage,
              amount,
            };
          });

          handleUpdateBOQItems(boqId, items);
        } catch (err) {
          alert('Failed to parse the uploaded file.');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  // Download current BOQ as Excel
  const handleDownloadBOQ = (boq: BOQSheet) => {
    const rows = boq.items.map(it => ({
      'S.No': it.sno,
      Section: it.section,
      Category: it.category,
      Description: it.description,
      UOM: it.uom,
      Qty: it.qty,
      Rate: it.rate,
      'Weightage (%)': it.weightage ?? 100,
      Amount: it.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, boq.name);
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.writeFile(wb, `${boq.name.replace(/\s+/g, '_')}_BOQ.xlsx`);
  };

  const activeBOQ = currentBOQs.find(b => b.id === activeTab);

  // Compute grand total from BOQs
  const totalFromBOQs = currentBOQs.reduce((s, b) => s + b.items.reduce((s2, it) => s2 + (it.amount || 0), 0), 0);

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
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                value={projectName}
                onChange={e => updateDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Project Name"
                style={{
                  fontWeight: 700, fontSize: 14, color: '#0f2044',
                  border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px 8px', width: '300px'
                }}
              />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Editing Baseline</span>
            </div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2044' }}>
              PO Abstract — {projectName}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>WO:</span>
              {isEditing ? (
                <input value={woNumber} onChange={e => updateDraft(d => ({ ...d, woNumber: e.target.value }))} placeholder="WO Number" style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11 }} />
              ) : <strong>{woNumber}</strong>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Contractor:</span>
              {isEditing ? (
                <input value={contractor} onChange={e => updateDraft(d => ({ ...d, contractor: e.target.value }))} placeholder="Contractor" style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11 }} />
              ) : <strong>{contractor}</strong>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Client:</span>
              {isEditing ? (
                <input value={client} onChange={e => updateDraft(d => ({ ...d, client: e.target.value }))} placeholder="Client" style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11 }} />
              ) : <strong>{client}</strong>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Area (Sqft):</span>
              {isEditing ? (
                <input type="number" value={isEditing ? draft?.grandTotalArea : (activeProject?.grandTotalArea || 0)} onChange={e => updateDraft(d => ({ ...d, grandTotalArea: parseFloat(e.target.value) || 0 }))} placeholder="Area" style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11, width: 80 }} />
              ) : <strong>{activeProject?.grandTotalArea || 0}</strong>}
            </div>
            <div style={{ marginLeft: 'auto', color: '#0f2044', fontWeight: 600 }}>
              Total: ₹ {fmt(isEditing ? (draft?.abstractSummary?.totalBasicCost || totalFromBOQs) : (abstractSummary?.totalBasicCost || 0))}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 24, display: 'flex', gap: 8 }}>
          {isEditing ? (
            <>
              <button onClick={handleCancel} style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleSave} style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>Save Baseline</button>
            </>
          ) : (
            <button onClick={handleEdit} style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid #1a56b0',
              background: '#fff', color: '#1a56b0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Baseline
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '8px 16px 0',
        borderBottom: '1px solid #d1d5db', background: '#f8fafc', flexShrink: 0,
        alignItems: 'center', overflowX: 'auto',
      }}>
        {/* Fixed Abstract Summary tab */}
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '7px 14px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'summary' ? '2px solid #1a56b0' : '2px solid transparent',
            background: activeTab === 'summary' ? '#fff' : 'transparent',
            color: activeTab === 'summary' ? '#1a56b0' : '#475569',
            transition: 'all 0.1s', whiteSpace: 'nowrap',
          }}
        >
          Abstract Summary
        </button>

        {/* Dynamic BOQ tabs */}
        {currentBOQs.map(boq => (
          <div key={boq.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <button
              onClick={() => setActiveTab(boq.id)}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                borderRadius: '4px 4px 0 0',
                borderBottom: activeTab === boq.id ? '2px solid #1a56b0' : '2px solid transparent',
                background: activeTab === boq.id ? '#fff' : 'transparent',
                color: activeTab === boq.id ? '#1a56b0' : '#475569',
                transition: 'all 0.1s', whiteSpace: 'nowrap',
                paddingRight: isEditing ? 28 : 14,
              }}
            >
              {boq.name}
            </button>
            {isEditing && (
              <div style={{ display: 'flex', gap: 2, position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenamingBOQId(boq.id); }}
                  title="Rename"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#94a3b8', padding: 0 }}
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteBOQ(boq.id); }}
                  title="Delete"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#ef4444', padding: 0 }}
                >×</button>
              </div>
            )}
          </div>
        ))}

        {/* "+ New BOQ" button */}
        {isEditing && (
          <button
            onClick={() => setShowNewBOQModal(true)}
            style={{
              padding: '6px 12px', border: '1px dashed #94a3b8', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
              borderRadius: '4px 4px 0 0', background: 'transparent',
              color: '#059669', transition: 'all 0.1s', whiteSpace: 'nowrap',
              marginLeft: 4,
            }}
          >
            + New BOQ
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 }}>
        {activeTab === 'summary' && (
          <AbstractSummaryTab boqs={currentBOQs} />
        )}

        {activeBOQ && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* BOQ toolbar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2044' }}>{activeBOQ.name}</div>
              <div style={{ flex: 1 }} />
              {isEditing && (
                <button onClick={() => handleUploadIntoExistingBOQ(activeBOQ.id)} style={{
                  padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>↑ Upload Excel</button>
              )}
              <button onClick={() => handleDownloadBOQ(activeBOQ)} style={{
                padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>↓ Download Excel</button>
            </div>

            <BOQTab
              boq={activeBOQ}
              isEditing={isEditing}
              onUpdate={(items) => handleUpdateBOQItems(activeBOQ.id, items)}
            />
          </div>
        )}

        {activeTab !== 'summary' && !activeBOQ && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select a tab to view its contents.
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewBOQModal && (
        <NewBOQModal
          onClose={() => setShowNewBOQModal(false)}
          onCreate={handleCreateBOQ}
          onUpload={handleUploadBOQ}
        />
      )}

      {renamingBOQId && (
        <RenameModal
          currentName={currentBOQs.find(b => b.id === renamingBOQId)?.name || ''}
          onClose={() => setRenamingBOQId(null)}
          onRename={(newName) => handleRenameBOQ(renamingBOQId, newName)}
        />
      )}
    </div>
  );
}
