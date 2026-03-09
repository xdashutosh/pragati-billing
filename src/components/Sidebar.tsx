'use client';

import React from 'react';
import { RABillData, COPData } from '@/lib/raStore';
import { NavPage } from '@/app/page';
import { VendorConfig } from '@/data/vendorRegistry';
import { useVendor } from '@/lib/VendorContext';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  savedRAs: RABillData[];
  allCOPs: COPData[];
  activeRA: RABillData | null;
  onSelectRA: (ra: RABillData | null) => void;
  onNewRA: () => void;
  vendors: VendorConfig[];
  activeVendorId: string;
  onSwitchVendor: (id: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8', prepared: '#1e40af', l1_approved: '#0369a1', l2_approved: '#0891b2', l3_approved: '#059669', approved: '#166534', rejected: '#b91c1c',
};
const STATUS_BG: Record<string, string> = {
  draft: '#f1f5f9', prepared: '#eff6ff', l1_approved: '#f0f9ff', l2_approved: '#ecfeff', l3_approved: '#ecfdf5', approved: '#dcfce7', rejected: '#fee2e2',
};

export default function Sidebar({ activePage, onNavigate, savedRAs, allCOPs, activeRA, onSelectRA, onNewRA, vendors, activeVendorId, onSwitchVendor }: SidebarProps) {
  const { boqs } = useVendor();
  const activeVendor = (vendors.find(v => v.id === activeVendorId) ?? vendors[0]) || { currentRA: 1, billingSummaryTotals: { orderAmount: 0 } } as any;
  return (
    <aside style={{
      width: 232, background: '#0f2044', color: '#fff',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Vendor switcher */}
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Project</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {vendors.map(v => {
            const isActive = v.id === activeVendorId;
            const totals = (v as any).billingSummaryTotals || (v as any).billingSummary?.totals || { orderAmount: 0, cumulativeAmount: 0 };
            const pct = totals.orderAmount > 0
              ? ((totals.cumulativeAmount / totals.orderAmount) * 100).toFixed(0)
              : '0';
            return (
              <button key={v.id} onClick={() => onSwitchVendor(v.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                    {v.shortName}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    RA-{v.currentRA} · ₹{(totals.orderAmount / 1e7).toFixed(1)} Cr
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  {isActive && <Dot color="#86efac" />}
                  <div style={{ fontSize: 9, color: isActive ? '#86efac' : 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                    {pct}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>

        {/* OVERVIEW */}
        <SLabel>Overview</SLabel>
        <NavBtn id="dashboard" active={activePage} onClick={() => onNavigate('dashboard')} icon={<DashboardIcon />} highlight="#86efac">Dashboard</NavBtn>
        <NavBtn id="po-abstract" active={activePage} onClick={() => onNavigate('po-abstract')} icon={<PieIcon />}>PO Abstract</NavBtn>
        <NavBtn id="abstract" active={activePage} onClick={() => onNavigate('abstract')} icon={<DocIcon />}>Bill Summary</NavBtn>

        {/* RA BILLS */}
        <SLabel>RA Bills</SLabel>



        {/* Saved RAs */}
        {savedRAs.map(ra => {
          const cop = allCOPs.find(c => c.raNumber === ra.raNumber);
          const isActive = activeRA?.raNumber === ra.raNumber;
          return (
            <div key={ra.raNumber} onClick={() => { onSelectRA(ra); onNavigate('ra-details'); }} style={raBtnStyle(isActive, true)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BillIcon />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>RA-{ra.raNumber}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                    ₹{(ra.grandTotal / 1e7).toFixed(2)} Cr
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                {isActive && <Dot color="#86efac" />}
                {cop && (
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 6, fontWeight: 700,
                    background: STATUS_BG[cop.status], color: STATUS_COLOR[cop.status],
                  }}>{cop.status.toUpperCase()}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* New RA */}
        <button onClick={onNewRA} style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '7px 10px', borderRadius: 6, marginTop: 4,
          border: '1px dashed rgba(134,239,172,0.4)', cursor: 'pointer',
          background: activePage === 'new-ra' ? 'rgba(22,101,52,0.3)' : 'transparent',
          color: '#86efac', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        }}>
          <PlusIcon /> New RA Entry
        </button>

        {/* COP */}
        <SLabel>Certification</SLabel>
        <NavBtn id="cop" active={activePage} onClick={() => onNavigate('cop')} icon={<CertIcon />} highlight="#fde68a">
          Certificate of Payment
        </NavBtn>
        <NavBtn id="cop-status" active={activePage} onClick={() => onNavigate('cop-status')} icon={<HistIcon />} highlight="#86efac">
          COP Status Tracker
        </NavBtn>


        {/* VIEW DETAILS */}
        <SLabel>View Details</SLabel>
        <NavBtn id="ra-details" active={activePage} onClick={() => onNavigate('ra-details')} icon={<DocIcon />}>RA Details & BOQs</NavBtn>
        <NavBtn id="adjustments" active={activePage} onClick={() => onNavigate('adjustments')} icon={<HistIcon />} highlight="#86efac">Adjustment History</NavBtn>

      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)', margin: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Active</span>
          <span style={{ background: activeRA ? '#1a56b0' : '#374151', color: '#fff', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
            {activeRA ? `RA-${activeRA.raNumber}` : 'Project'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{activeVendor.contractor}</div>
      </div>
    </aside>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function raBtnStyle(active: boolean, isNew = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 3,
    background: active ? (isNew ? '#1a56b0' : 'rgba(255,255,255,0.1)') : isNew ? 'rgba(26,86,176,0.2)' : 'transparent',
    border: active ? `1px solid ${isNew ? '#3b82f6' : 'rgba(255,255,255,0.2)'}` : `1px solid ${isNew ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
    transition: 'all 0.15s',
  };
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 8px 4px' }}>
      {children}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />;
}

function NavBtn({ id, active, onClick, icon, children, highlight }: {
  id: string; active: string; onClick: () => void; icon: React.ReactNode;
  children: React.ReactNode; highlight?: string;
}) {
  const isActive = active === id;
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
      textAlign: 'left', fontSize: 12, fontFamily: 'inherit', marginBottom: 2, transition: 'all 0.15s',
      background: isActive ? '#1a56b0' : 'transparent',
      color: isActive ? '#fff' : highlight || 'rgba(255,255,255,0.65)',
    }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = highlight || 'rgba(255,255,255,0.65)'; } }}
    >
      {icon}{children}
    </button>
  );
}

// Icons
const i = (d: string) => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>;
function PieIcon() { return i("M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"); }
function DocIcon() { return i("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"); }
function BuildingIcon() { return i("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"); }
function MapIcon() { return i("M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"); }
function HistIcon() { return i("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"); }
function BillIcon() { return i("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"); }
function PlusIcon() { return i("M12 4v16m8-8H4"); }
function CertIcon() { return i("M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"); }
function BoxIcon() { return i("M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"); }
function LockIcon() { return i("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"); }
function BarChartIcon() { return i("M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"); }
function DashboardIcon() { return i("M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm6 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-6 8a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm6 0a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z"); }
