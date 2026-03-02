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
import { loadAllRAs, loadAllCOPs, RABillData, COPData } from '@/lib/raStore';
import { VendorProvider } from '@/lib/VendorContext';
import { VENDORS, getVendor, VendorConfig } from '@/data/vendorRegistry';
import { MaterialRow, HoldItem } from '@/data/projectData';
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

  // ── Vendor selection ──────────────────────────────────────────────────────
  const [vendorId, setVendorId] = useState<string>('lpw');
  const vendor: VendorConfig = getVendor(vendorId);

  const [allRAs, setAllRAs] = useState<RABillData[]>([]);
  const [allCOPs, setAllCOPs] = useState<COPData[]>([]);
  const [activeRA, setActiveRA] = useState<RABillData | null>(null);

  // ── Material deductions ───────────────────────────────────────────────────
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>(vendor.defaultMaterialRows);
  const materialDeductionThis = materialRows.reduce((s, r) => s + r.thisV, 0);

  // ── Holds ──────────────────────────────────────────────────────────────────
  const [holdItems, setHoldItems] = useState<HoldItem[]>(vendor.defaultHoldItems);
  const activeHoldsTotal   = holdItems.filter(h =>  h.active).reduce((s, h) => s + h.amt, 0);
  const releasedHoldsTotal = holdItems.filter(h => !h.active).reduce((s, h) => s + h.amt, 0);

  const refreshAll = useCallback(() => {
    const ras = loadAllRAs(vendorId);
    setAllRAs(ras);
    setAllCOPs(loadAllCOPs(vendorId));
    setActiveRA(prev => prev ? (ras.find(r => r.raNumber === prev.raNumber) ?? null) : null);
  }, [vendorId]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Switch vendor: reset all per-vendor state
  const switchVendor = (id: string) => {
    const v = getVendor(id);
    setVendorId(id);
    setActiveRA(null);
    setMaterialRows(v.defaultMaterialRows);
    setHoldItems(v.defaultHoldItems);
    setPage('dashboard');
  };

  const displayRA  = activeRA?.raNumber ?? vendor.currentRA;
  const displayThis = activeRA?.grandTotal ?? vendor.billingSummaryTotals.thisBillAmount;
  const displayCum  = vendor.billingSummaryTotals.cumulativeAmount + (activeRA?.grandTotal ?? 0);
  const activeCOP  = activeRA ? allCOPs.find(c => c.raNumber === activeRA.raNumber) : null;

  return (
    <VendorProvider vendor={vendor}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          activePage={page}
          onNavigate={setPage}
          savedRAs={allRAs}
          allCOPs={allCOPs}
          activeRA={activeRA}
          onSelectRA={ra => { setActiveRA(ra); setPage('abstract'); }}
          onNewRA={() => setPage('new-ra')}
          vendors={VENDORS}
          activeVendorId={vendorId}
          onSwitchVendor={switchVendor}
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
                {vendor.projectName} — EPC Turnkey | WO: {vendor.woNumber}
              </p>
            </div>
          </header>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
            {page === 'dashboard'          && <DashboardPage onNavigate={setPage} />}
            {page === 'charts'             && <ChartsPage />}
            {page === 'po-abstract'        && <POAbstractPage />}
            {page === 'abstract'           && <AbstractPage activeRA={activeRA} />}
            {page === 'building'           && <BuildingPage activeRA={activeRA} />}
            {page === 'infra'              && <InfraPage activeRA={activeRA} />}
            {page === 'ra-history-infra'   && <RAHistoryPage allRAs={allRAs} />}
            {page === 'ra-history-building'&& <RABuildingHistoryPage allRAs={allRAs} />}
            {page === 'new-ra'             && <NewRAEntryPage onSave={refreshAll} vendorId={vendorId} />}

            {page === 'cop-status' && (
              <COPStatusPage onViewCOP={(ra) => {
                const selected = allRAs.find(r => r.raNumber === ra);
                if (selected) setActiveRA(selected);
                setPage('cop');
              }} />
            )}

            {(page === 'cop' || page === 'approvals') && (
              <COPPage
                allRAs={allRAs}
                onCOPSave={refreshAll}
                materialDeductionThis={materialDeductionThis}
                activeHoldsTotal={activeHoldsTotal}
                releasedHoldsTotal={releasedHoldsTotal}
                vendorId={vendorId}
              />
            )}

            {page === 'materials' && (
              <MaterialsPage rows={materialRows} onRowsChange={setMaterialRows} />
            )}

            {page === 'holds' && (
              <HoldsPage holds={holdItems} onHoldsChange={setHoldItems} />
            )}
          </div>
        </main>
      </div>
    </VendorProvider>
  );
}
