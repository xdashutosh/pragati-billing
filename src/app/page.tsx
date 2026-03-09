'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardPage from '@/components/DashboardPage';
import POAbstractPage from '@/components/POAbstractPage';
import AbstractPage from '@/components/AbstractPage';
import NewRAEntryPage from '@/components/NewRAEntryPage';
import COPPage from '@/components/COPPage';
import COPStatusPage from '@/components/COPStatusPage';
import SetupPage from '@/components/SetupPage';
import AdjustmentsPage from '@/components/AdjustmentsPage';
import RAViewPage from '@/components/RAViewPage';

import { VendorProvider, useVendor } from '@/lib/VendorContext';
import { loadAllRAs, loadAllCOPs, RABillData, COPData } from '@/lib/raStore';
import { MaterialRow, HoldItem } from '@/data/projectData';

export type NavPage =
  | 'dashboard' | 'po-abstract' | 'abstract'
  | 'new-ra' | 'ra-details'
  | 'cop' | 'cop-status' | 'approvals' | 'adjustments'
  | 'holds' | 'materials';

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f2044', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #fff', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Project Data...</div>
      </div>
    </div>
  );
}

function MainApp() {
  const {
    id: activeVendorId,
    allProjects,
    isLoading,
    switchProject,
    activeProject,
    defaultMaterialRows,
    defaultHoldItems
  } = useVendor();

  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [allRAs, setAllRAs] = useState<RABillData[]>([]);
  const [allCOPs, setAllCOPs] = useState<COPData[]>([]);
  const [activeRA, setActiveRA] = useState<RABillData | null>(null);
  const [activeRaNumber, setActiveRaNumber] = useState<number | null>(null);

  const refreshData = useCallback(async () => {
    if (!activeVendorId) return;
    const ras = await loadAllRAs(activeVendorId);
    const cops = await loadAllCOPs(activeVendorId);
    setAllRAs(ras);
    setAllCOPs(cops);
  }, [activeVendorId]);

  useEffect(() => {
    refreshData();
  }, [refreshData, activePage]);

  const handleNewRA = () => { setActiveRA(null); setActivePage('new-ra'); };
  const handleSelectRA = (ra: RABillData | null) => { setActiveRA(ra); };
  const handleViewCOP = (raNumber: number) => {
    setActiveRaNumber(raNumber);
    setActivePage('cop');
  };

  if (isLoading) return <LoadingScreen />;
  if (!activeVendorId) return <SetupPage onComplete={() => window.location.reload()} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9' }}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        savedRAs={allRAs}
        allCOPs={allCOPs}
        activeRA={activeRA}
        onSelectRA={handleSelectRA}
        onNewRA={handleNewRA}
        vendors={allProjects as any}
        activeVendorId={activeVendorId}
        onSwitchVendor={switchProject}
      />

      <main style={{ flex: 1, padding: '16px', overflowY: 'auto', position: 'relative' }}>
        {activePage === 'dashboard' && <DashboardPage onNavigate={setActivePage} />}
        {activePage === 'po-abstract' && <POAbstractPage />}
        {activePage === 'abstract' && <AbstractPage activeRA={activeRA} />}
        {activePage === 'new-ra' && <NewRAEntryPage onSave={refreshData} />}
        {activePage === 'ra-details' && <RAViewPage activeRA={activeRA} allRAs={allRAs} />}
        {activePage === 'cop' && (
          <COPPage
            allRAs={allRAs}
            onCOPSave={refreshData}
            initialRaNumber={activeRaNumber}
          />
        )}
        {activePage === 'cop-status' && <COPStatusPage allRAs={allRAs} allCOPs={allCOPs} onUpdate={refreshData} onViewCOP={handleViewCOP} />}
        {activePage === 'approvals' && <COPStatusPage allRAs={allRAs} allCOPs={allCOPs} onUpdate={refreshData} onViewCOP={handleViewCOP} approvalsOnly />}
        {activePage === 'adjustments' && <AdjustmentsPage allRAs={allRAs} allCOPs={allCOPs} />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <VendorProvider>
      <MainApp />
    </VendorProvider>
  );
}
