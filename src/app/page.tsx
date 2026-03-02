'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import POAbstractPage from '@/components/POAbstractPage';
import AbstractPage from '@/components/AbstractPage';
import BuildingPage from '@/components/BuildingPage';
import InfraPage from '@/components/InfraPage';
import RAHistoryPage from '@/components/RAHistoryPage';
import RABuildingHistoryPage from '@/components/RABuildingHistoryPage';
import NewRAEntryPage from '@/components/NewRAEntryPage';
import COPPage from '@/components/COPPage';
import COPStatusPage from '@/components/COPStatusPage';
import MaterialsPage from '@/components/MaterialsPage';
import HoldsPage from '@/components/HoldsPage';
import DashboardPage from '@/components/DashboardPage';
import ChartsPage from '@/components/ChartsPage';
import { billingSummaryTotals, HOLD_DATA } from '@/data/projectData';
import { loadAllRAs, loadAllCOPs, RABillData, COPData } from '@/lib/raStore';
import { fmt } from '@/lib/utils';

export type NavPage = 'po-abstract' | 'abstract' | 'building' | 'infra'
  | 'ra-history-infra' | 'ra-history-building'
  | 'new-ra' | 'cop' | 'cop-status' | 'materials' | 'holds' | 'approvals' | 'charts' | 'dashboard';

const PAGE_TITLES: Record<NavPage, string> = {
  dashboard: 'Executive Dashboard',
  charts: 'Project Charts',
  'po-abstract': 'PO Abstract — Total Project Scope',
  abstract: 'Bill Summary',
  building: 'Building Milestones',
  infra: 'Infra Milestones',
  'ra-history-infra': 'RA History — Infra',
  'ra-history-building': 'RA History — Building',
  'new-ra': 'New RA Bill Entry',
  cop: 'Certificate of Payment (COP)',
  'cop-status': 'COP Approval Status Tracker',
  approvals: 'Pending Approvals',
  materials: 'Material Deductions',
  holds: 'Hold & Release',
};

export default function Home() {
  const [page, setPage] = useState<NavPage>('dashboard');
  const [allRAs, setAllRAs] = useState<RABillData[]>([]);
  const [allCOPs, setAllCOPs] = useState<COPData[]>([]);
  const [activeRA, setActiveRA] = useState<RABillData | null>(null);

  // ── Material deductions — persisted across navigation ──
  // Total "this bill" deduction entered in MaterialsPage
  const [materialDeductionThis, setMaterialDeductionThis] = useState(0);

  // ── Holds — persisted across navigation ──
  // We keep hold state here so it survives page switches
  const [holdItems, setHoldItems] = useState(HOLD_DATA);
  const activeHoldsTotal = holdItems.filter(h => h.active).reduce((s, h) => s + h.amt, 0);
  const releasedHoldsTotal = holdItems.filter(h => !h.active).reduce((s, h) => s + h.amt, 0);

  const refreshAll = useCallback(() => {
    const ras = loadAllRAs();
    setAllRAs(ras);
    setAllCOPs(loadAllCOPs());
    setActiveRA(prev => prev ? (ras.find(r => r.raNumber === prev.raNumber) ?? null) : null);
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const displayRA = activeRA?.raNumber ?? 16;
  const displayThis = activeRA?.grandTotal ?? billingSummaryTotals.thisBillAmount;
  const displayCum = billingSummaryTotals.cumulativeAmount + (activeRA?.grandTotal ?? 0);
  const activeCOP = activeRA ? allCOPs.find(c => c.raNumber === activeRA.raNumber) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        savedRAs={allRAs}
        allCOPs={allCOPs}
        activeRA={activeRA}
        onSelectRA={ra => { setActiveRA(ra); setPage('abstract'); }}
        onNewRA={() => setPage('new-ra')}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f1f5f9' }}>
        {/* Header */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #d1d5db',
          padding: '12px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, zIndex: 20,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f2044' }}>
              {PAGE_TITLES[page]}{activeRA && !['new-ra', 'cop', 'approvals'].includes(page) ? ` — RA-${displayRA}` : ''}
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              LPW Warehousing & Logistic Park, Echur — EPC Turnkey | WO: LPWWPL/ECHUR/PROJECT/24-25/08
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* RA switcher */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>View:</span>
              <button onClick={() => setActiveRA(null)} style={{
                padding: '4px 10px', borderRadius: 4,
                border: `1px solid ${!activeRA ? '#0f2044' : '#d1d5db'}`,
                background: !activeRA ? '#0f2044' : '#fff',
                color: !activeRA ? '#fff' : '#475569',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>RA-16</button>
              {allRAs.map(ra => {
                const cop = allCOPs.find(c => c.raNumber === ra.raNumber);
                return (
                  <button key={ra.raNumber} onClick={() => setActiveRA(ra)} style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: `1px solid ${activeRA?.raNumber === ra.raNumber ? '#1a56b0' : '#bfdbfe'}`,
                    background: activeRA?.raNumber === ra.raNumber ? '#1a56b0' : '#eff6ff',
                    color: activeRA?.raNumber === ra.raNumber ? '#fff' : '#1a56b0',
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    RA-{ra.raNumber}
                    {cop?.status === 'approved' && <span style={{ fontSize: 9 }}>✅</span>}
                    {cop?.status === 'rejected' && <span style={{ fontSize: 9 }}>❌</span>}
                  </button>
                );
              })}
            </div>

            {/* Figures strip */}
            <div style={{
              background: '#f8fafc', border: '1px solid #d1d5db',
              borderRadius: 6, padding: '6px 14px', fontSize: 11, display: 'flex', gap: 16,
            }}>
              <span>This Bill:&nbsp;
                <strong style={{ fontFamily: 'monospace', color: '#1a56b0' }}>
                  ₹ {(displayThis / 1e7).toFixed(2)} Cr
                </strong>
              </span>
              {activeCOP && (
                <span>Net Payable:&nbsp;
                  <strong style={{ fontFamily: 'monospace', color: '#0e6d41' }}>
                    ₹ {(activeCOP.netPayable / 1e7).toFixed(2)} Cr
                  </strong>
                </span>
              )}
              <span>Cumulative:&nbsp;
                <strong style={{ fontFamily: 'monospace', color: '#0f2044' }}>
                  ₹ {(displayCum / 1e7).toFixed(2)} Cr
                </strong>
              </span>
            </div>

            <div style={{
              background: activeRA ? '#1a56b0' : '#0f2044', color: '#fff',
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            }}>RA-{displayRA}</div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'charts' && <ChartsPage />}
          {page === 'po-abstract' && <POAbstractPage />}
          {page === 'abstract' && <AbstractPage activeRA={activeRA} />}
          {page === 'building' && <BuildingPage activeRA={activeRA} />}
          {page === 'infra' && <InfraPage activeRA={activeRA} />}
          {page === 'ra-history-infra' && <RAHistoryPage allRAs={allRAs} />}
          {page === 'ra-history-building' && <RABuildingHistoryPage allRAs={allRAs} />}
          {page === 'new-ra' && <NewRAEntryPage onSave={refreshAll} />}

          {page === 'cop-status' && (
            <COPStatusPage onViewCOP={(ra) => {
              const selected = allRAs.find(r => r.raNumber === ra);
              if (selected) setActiveRA(selected);
              setPage('cop');
            }} />
          )}

          {/* COP — receives live material + hold totals */}
          {(page === 'cop' || page === 'approvals') && (
            <COPPage
              allRAs={allRAs}
              onCOPSave={refreshAll}
              materialDeductionThis={materialDeductionThis}
              activeHoldsTotal={activeHoldsTotal}
              releasedHoldsTotal={releasedHoldsTotal}
            />
          )}

          {/* Materials — callbacks update state here so COP sees it */}
          {page === 'materials' && (
            <MaterialsPage onTotalChange={setMaterialDeductionThis} />
          )}

          {/* Holds — we manage state here and pass down so COP sees it */}
          {page === 'holds' && (
            <HoldsPage
              holds={holdItems}
              onHoldsChange={setHoldItems}
            />
          )}
        </div>
      </main>
    </div>
  );
}
