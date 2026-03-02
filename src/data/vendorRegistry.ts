// ─────────────────────────────────────────────────────────────────────────────
// vendorRegistry.ts — All vendor/project configurations
// LPW (id:'lpw') re-uses existing JSON data for backward-compat localStorage.
// Mock vendors have inline data.
// ─────────────────────────────────────────────────────────────────────────────

import {
  billingSummaryItems as lpwSummaryItems,
  billingSummaryTotals as lpwSummaryTotals,
  billingMilestones as lpwBillingMilestones,
  blockTotals as lpwBlockTotals,
  infraBillingMilestones as lpwInfraBilling,
  infraRAMilestones as lpwInfraRA,
  infraRATotal as lpwInfraRATotal,
  buildingMilestones as lpwBuildingMilestones,
  infraMilestones as lpwInfraMilestones,
  infraMilestoneTotal as lpwInfraMilestoneTotal,
  MATERIAL_DATA as lpwMaterials,
  HOLD_DATA as lpwHolds,
  PROJECT_INFO as lpwInfo,
  BillingSummaryItem, BillingMilestone, BillingBlockData,
  InfraBillingMilestone, InfraRAMilestone, BlockTotals,
  MaterialRow, HoldItem, BuildingMilestone, InfraMilestone,
} from './projectData';

// ─── VendorConfig Type ────────────────────────────────────────────────────────

export interface VendorConfig {
  // Identity
  id: string;
  shortName: string;
  // Project Info
  projectName: string;
  contractor: string;
  client: string;
  pmc: string;
  woNumber: string;
  woDate: string;
  currentRA: number;
  totalBasicCost: number;
  costPerSqft: number;
  grandTotalArea: number;
  // Billing summary
  billingSummaryItems: BillingSummaryItem[];
  billingSummaryTotals: { orderAmount: number; prevBillAmount: number; thisBillAmount: number; cumulativeAmount: number };
  // Building
  billingMilestones: BillingMilestone[];
  blockTotals: BlockTotals;
  buildingMilestones: BuildingMilestone[];
  // Infra
  infraBillingMilestones: Array<InfraBillingMilestone & { raHistory?: Record<string, { pct: number; amt: number }> }>;
  infraRAMilestones: InfraRAMilestone[];
  infraRATotal: number;
  infraMilestones: InfraMilestone[];
  infraMilestoneTotal: number;
  // Deduction defaults
  defaultMaterialRows: MaterialRow[];
  defaultHoldItems: HoldItem[];
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

const bd = (scope: number, prevP: number, thisP: number): BillingBlockData => ({
  scope,
  prevPct: prevP, prevAmt: Math.round(scope * prevP),
  thisPct: thisP, thisAmt: Math.round(scope * thisP),
  cumPct: prevP + thisP, cumAmt: Math.round(scope * (prevP + thisP)),
});
const Z: BillingBlockData = { scope: 0, prevPct: 0, prevAmt: 0, thisPct: 0, thisAmt: 0, cumPct: 0, cumAmt: 0 };

const bm = (cat: string, desc: string, b1: BillingBlockData, b2: BillingBlockData, b3 = Z, b4 = Z): BillingMilestone =>
  ({ category: cat, description: desc, block1: b1, block2: b2, block3: b3, block4: b4 });

type InfraM = InfraBillingMilestone & { raHistory?: Record<string, { pct: number; amt: number }> };
const im = (
  sno: string, cat: string, desc: string, scope: number, prevP: number, thisP: number, inst: number,
  history?: Record<string, { pct: number; amt: number }>
): InfraM => ({
  sno, category: cat, description: desc, scopeAmount: scope,
  prevPct: prevP, prevAmt: Math.round(scope * prevP),
  thisPct: thisP, thisAmt: Math.round(scope * thisP),
  cumPct: prevP + thisP, cumAmt: Math.round(scope * (prevP + thisP)),
  installmentsCompleted: inst,
  raHistory: history,
});

// Linear history generator: cumPct at finalRA reached by targetPct
const mkHist = (prefix: string, fromRA: number, toRA: number, scope: number, targetPct: number) => {
  const h: Record<string, { pct: number; amt: number }> = {};
  for (let ra = fromRA; ra <= toRA; ra++) {
    const p = parseFloat((targetPct * (ra / toRA)).toFixed(4));
    h[`${prefix}${String(ra).padStart(2, '0')}`] = { pct: p, amt: Math.round(scope * p) };
  }
  return h;
};

// ─── Sub-item helper ─────────────────────────────────────────────────────────

const si = (description: string, orderAmount: number, prevBillAmount: number, thisBillAmount: number) => ({
  description, orderAmount, prevBillAmount, thisBillAmount,
  cumulativeAmount: prevBillAmount + thisBillAmount,
});

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR 1 — LPW Echur (existing data, backward-compatible localStorage keys)
// ─────────────────────────────────────────────────────────────────────────────

const lpwVendor: VendorConfig = {
  id: 'lpw',
  shortName: 'LPW Echur',
  projectName: lpwInfo.name,
  contractor: lpwInfo.contractor,
  client: lpwInfo.client,
  pmc: lpwInfo.pmc,
  woNumber: lpwInfo.woNumber,
  woDate: lpwInfo.woDate,
  currentRA: lpwInfo.currentRA,
  totalBasicCost: lpwInfo.totalBasicCost,
  costPerSqft: lpwInfo.costPerSqft,
  grandTotalArea: lpwInfo.grandTotalArea,
  billingSummaryItems: lpwSummaryItems,
  billingSummaryTotals: lpwSummaryTotals,
  billingMilestones: lpwBillingMilestones,
  blockTotals: lpwBlockTotals,
  buildingMilestones: lpwBuildingMilestones,
  infraBillingMilestones: lpwInfraBilling,
  infraRAMilestones: lpwInfraRA,
  infraRATotal: lpwInfraRATotal,
  infraMilestones: lpwInfraMilestones,
  infraMilestoneTotal: lpwInfraMilestoneTotal,
  defaultMaterialRows: lpwMaterials,
  defaultHoldItems: lpwHolds,
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR 2 — KG Industrial Park, Hosur
// Contractor: Apex Constructions Pvt. Ltd. | Client: KG Fabriks Ltd.
// PMC: CBRE | RA-12 | ₹64.5 Cr | 2 Blocks
// ─────────────────────────────────────────────────────────────────────────────

const KG_INFRA_HIST_TO = 11; // RA-01 to RA-11 in history (current is RA-12)

const kgInfraBilling: InfraM[] = [
  im('1', 'Infra Civil Works',        'Road & Yard Paving & Kerbing',           80_000_000, 0.70, 0.05, 4, mkHist('RA Bill - ', 1, KG_INFRA_HIST_TO, 80_000_000, 0.70)),
  im('2', 'Infra Civil Works',        'Compound Wall, Gate & Security Cabin',   32_000_000, 0.80, 0.05, 3, mkHist('RA Bill - ', 1, KG_INFRA_HIST_TO, 32_000_000, 0.80)),
  im('3', 'External Electrical Works','Transformer, HT Line & LT Distribution', 52_000_000, 0.62, 0.10, 3, mkHist('RA Bill - ', 1, KG_INFRA_HIST_TO, 52_000_000, 0.62)),
  im('4', 'External Fire Works',      'External Fire Hydrant Network',           32_000_000, 0.58, 0.10, 2, mkHist('RA Bill - ', 1, KG_INFRA_HIST_TO, 32_000_000, 0.58)),
  im('5', 'Drainage & STP',           'STP Plant & Drainage Network',             6_000_000, 0.48, 0.10, 2, mkHist('RA Bill - ', 1, KG_INFRA_HIST_TO, 6_000_000,  0.48)),
];

const kgBillingMilestones: BillingMilestone[] = [
  // Building Civil Works
  bm('Building Civil Works', 'Foundation & Substructure Works',   bd(25_000_000,1.00,0), bd(22_000_000,1.00,0)),
  bm('Building Civil Works', 'Structural Frame & Slab',            bd(30_000_000,1.00,0), bd(27_000_000,0.85,0.05)),
  bm('Building Civil Works', 'Roofing, Sheeting & Waterproofing',  bd(40_000_000,0.85,0.03), bd(37_000_000,0.50,0.10)),
  bm('Building Civil Works', 'Finishing, Flooring & Painting',     bd(35_000_000,0.20,0.08), bd(31_000_000,0.05,0.10)),
  // Internal Electrical Works
  bm('Internal Electrical Works', 'HT/LT Panel & DG Set Installation', bd(18_000_000,0.80,0.05), bd(16_000_000,0.60,0.08)),
  bm('Internal Electrical Works', 'Internal Wiring & Cable Trays',      bd(15_000_000,0.55,0.10), bd(14_000_000,0.30,0.10)),
  bm('Internal Electrical Works', 'Lighting Fixtures & Earthing',        bd( 5_000_000,0.15,0.10), bd( 4_000_000,0.05,0.08)),
  // Internal Fire Works
  bm('Internal Fire Works', 'Underground Piping & Storage Tank',  bd(12_000_000,0.90,0),    bd(11_000_000,0.80,0.05)),
  bm('Internal Fire Works', 'Overhead Sprinkler System',           bd(13_000_000,0.55,0.10), bd(12_000_000,0.30,0.10)),
  bm('Internal Fire Works', 'Pump House, Hydrant & Hose Reel',     bd(10_000_000,0.45,0.08), bd( 8_000_000,0.20,0.08)),
  // Internal Plumbing Works
  bm('Internal Plumbing Works', 'Water Supply & Overhead Tank',   bd(15_000_000,0.70,0.05), bd(14_000_000,0.50,0.10)),
  bm('Internal Plumbing Works', 'Drainage, Sewerage & Manholes',  bd(15_000_000,0.55,0.10), bd(14_000_000,0.35,0.10)),
];

const kgBlockTotals: BlockTotals = {
  block1: kgBillingMilestones.reduce((s, m) => s + m.block1.scope, 0),
  block2: kgBillingMilestones.reduce((s, m) => s + m.block2.scope, 0),
  block3: 0,
  block4: 0,
};

const kgInfraRATotal = kgInfraBilling.reduce((s, m) => s + m.scopeAmount, 0);

const kgInfraRAMilestones: InfraRAMilestone[] = kgInfraBilling.map((m, i) => ({
  sno: m.sno,
  category: m.category,
  description: m.description,
  pctOfTotal: m.scopeAmount / kgInfraRATotal,
  scopeAmount: m.scopeAmount,
  prevPct: m.prevPct, prevAmt: m.prevAmt,
  thisPct: m.thisPct, thisAmt: m.thisAmt,
  cumPct: m.cumPct, cumAmt: m.cumAmt,
  raHistory: m.raHistory ?? {},
}));

// Bill summary items (aggregated)
const kgBuildingCivilOrder = kgBillingMilestones.filter(m => m.category === 'Building Civil Works').reduce((s, m) => s + m.block1.scope + m.block2.scope, 0);
const kgBuildingCivilPrev  = kgBillingMilestones.filter(m => m.category === 'Building Civil Works').reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt, 0);
const kgBuildingCivilThis  = kgBillingMilestones.filter(m => m.category === 'Building Civil Works').reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt, 0);

const kgElecOrder = kgBillingMilestones.filter(m => m.category === 'Internal Electrical Works').reduce((s, m) => s + m.block1.scope + m.block2.scope, 0);
const kgElecPrev  = kgBillingMilestones.filter(m => m.category === 'Internal Electrical Works').reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt, 0);
const kgElecThis  = kgBillingMilestones.filter(m => m.category === 'Internal Electrical Works').reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt, 0);

const kgFireOrder = kgBillingMilestones.filter(m => m.category === 'Internal Fire Works').reduce((s, m) => s + m.block1.scope + m.block2.scope, 0);
const kgFirePrev  = kgBillingMilestones.filter(m => m.category === 'Internal Fire Works').reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt, 0);
const kgFireThis  = kgBillingMilestones.filter(m => m.category === 'Internal Fire Works').reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt, 0);

const kgPlumbOrder = kgBillingMilestones.filter(m => m.category === 'Internal Plumbing Works').reduce((s, m) => s + m.block1.scope + m.block2.scope, 0);
const kgPlumbPrev  = kgBillingMilestones.filter(m => m.category === 'Internal Plumbing Works').reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt, 0);
const kgPlumbThis  = kgBillingMilestones.filter(m => m.category === 'Internal Plumbing Works').reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt, 0);

const kgRoadOrder  = 80_000_000; const kgRoadPrev  = Math.round(kgRoadOrder * 0.70);  const kgRoadThis  = Math.round(kgRoadOrder * 0.05);
const kgWallOrder  = 32_000_000; const kgWallPrev  = Math.round(kgWallOrder * 0.80);  const kgWallThis  = Math.round(kgWallOrder * 0.05);
const kgEEOrder    = 52_000_000; const kgEEPrev    = Math.round(kgEEOrder * 0.62);    const kgEEThis    = Math.round(kgEEOrder * 0.10);
const kgEFOrder    = 32_000_000; const kgEFPrev    = Math.round(kgEFOrder * 0.58);    const kgEFThis    = Math.round(kgEFOrder * 0.10);
const kgDrainOrder =  6_000_000; const kgDrainPrev = Math.round(kgDrainOrder * 0.48); const kgDrainThis = Math.round(kgDrainOrder * 0.10);

const kgSummaryItems: BillingSummaryItem[] = [
  { sno: '1', description: 'Warehouse building civil works', orderAmount: kgBuildingCivilOrder, prevBillAmount: kgBuildingCivilPrev, thisBillAmount: kgBuildingCivilThis, cumulativeAmount: kgBuildingCivilPrev + kgBuildingCivilThis, subItems: [si('Block-1 Civil Works', kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block1.scope,0), kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block1.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block1.thisAmt,0)), si('Block-2 Civil Works', kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block2.scope,0), kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block2.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Building Civil Works').reduce((s,m)=>s+m.block2.thisAmt,0))] },
  { sno: '2', description: 'Electrical works', orderAmount: kgElecOrder, prevBillAmount: kgElecPrev, thisBillAmount: kgElecThis, cumulativeAmount: kgElecPrev + kgElecThis, subItems: [si('Block-1 Electrical works', kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block1.scope,0), kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block1.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block1.thisAmt,0)), si('Block-2 Electrical works', kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block2.scope,0), kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block2.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Internal Electrical Works').reduce((s,m)=>s+m.block2.thisAmt,0))] },
  { sno: '3', description: 'Fire fighting works', orderAmount: kgFireOrder, prevBillAmount: kgFirePrev, thisBillAmount: kgFireThis, cumulativeAmount: kgFirePrev + kgFireThis, subItems: [si('Block-1 Fire fighting works', kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block1.scope,0), kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block1.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block1.thisAmt,0)), si('Block-2 Fire fighting works', kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block2.scope,0), kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block2.prevAmt,0), kgBillingMilestones.filter(m=>m.category==='Internal Fire Works').reduce((s,m)=>s+m.block2.thisAmt,0))] },
  { sno: '4', description: 'Plumbing works', orderAmount: kgPlumbOrder, prevBillAmount: kgPlumbPrev, thisBillAmount: kgPlumbThis, cumulativeAmount: kgPlumbPrev + kgPlumbThis, subItems: [] },
  { sno: '5', description: 'Infra civil works (Road & Compound Wall)', orderAmount: kgRoadOrder + kgWallOrder, prevBillAmount: kgRoadPrev + kgWallPrev, thisBillAmount: kgRoadThis + kgWallThis, cumulativeAmount: kgRoadPrev + kgWallPrev + kgRoadThis + kgWallThis, subItems: [] },
  { sno: '6', description: 'External electrical works', orderAmount: kgEEOrder, prevBillAmount: kgEEPrev, thisBillAmount: kgEEThis, cumulativeAmount: kgEEPrev + kgEEThis, subItems: [] },
  { sno: '7', description: 'External fire fighting works', orderAmount: kgEFOrder, prevBillAmount: kgEFPrev, thisBillAmount: kgEFThis, cumulativeAmount: kgEFPrev + kgEFThis, subItems: [] },
  { sno: '8', description: 'Drainage & STP', orderAmount: kgDrainOrder, prevBillAmount: kgDrainPrev, thisBillAmount: kgDrainThis, cumulativeAmount: kgDrainPrev + kgDrainThis, subItems: [] },
];

const kgSummaryTotals = {
  orderAmount:      kgSummaryItems.reduce((s, i) => s + i.orderAmount, 0),
  prevBillAmount:   kgSummaryItems.reduce((s, i) => s + i.prevBillAmount, 0),
  thisBillAmount:   kgSummaryItems.reduce((s, i) => s + i.thisBillAmount, 0),
  cumulativeAmount: kgSummaryItems.reduce((s, i) => s + i.cumulativeAmount, 0),
};

const kgVendor: VendorConfig = {
  id: 'kg',
  shortName: 'KG Hosur',
  projectName: 'KG Industrial Warehousing Park',
  contractor: 'M/s. Apex Constructions Pvt. Ltd.',
  client: 'KG Fabriks Ltd.',
  pmc: 'CBRE South Asia Pvt. Ltd.',
  woNumber: 'KGIP/HOSUR/PROJECT/23-24/05',
  woDate: '15.04.2023',
  currentRA: 12,
  totalBasicCost: kgSummaryTotals.orderAmount,
  costPerSqft: Math.round(kgSummaryTotals.orderAmount / 53_000),
  grandTotalArea: 53_000,
  billingSummaryItems: kgSummaryItems,
  billingSummaryTotals: kgSummaryTotals,
  billingMilestones: kgBillingMilestones,
  blockTotals: kgBlockTotals,
  buildingMilestones: [],
  infraBillingMilestones: kgInfraBilling,
  infraRAMilestones: kgInfraRAMilestones,
  infraRATotal: kgInfraRATotal,
  infraMilestones: [],
  infraMilestoneTotal: kgInfraRATotal,
  defaultMaterialRows: [
    { sno: '1', desc: 'PEB Structure (Client Supplied)',          total: 12_500_000, prev: 10_000_000, thisV: 625_000 },
    { sno: '2', desc: 'Fire Pumps & Accessories',                 total:  3_000_000, prev:  2_400_000, thisV: 150_000 },
    { sno: '3', desc: 'Electrical Transformers & HT Panels',      total:  2_500_000, prev:  2_000_000, thisV: 125_000 },
    { sno: '4', desc: 'Roofing Sheets & Purlins',                 total:  4_000_000, prev:  3_500_000, thisV: 200_000 },
  ],
  defaultHoldItems: [
    { id: 'KG-H01', desc: 'Quality Audit Hold — Block 2',         amt: 1_500_000, active: true },
    { id: 'KG-H02', desc: 'Safety Compliance Documentation Hold', amt: 1_000_000, active: true },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR 3 — Mahindra Logistics Hub, Pune
// Contractor: Simplex Infrastructures Ltd. | Client: Mahindra Logistics Ltd.
// PMC: Colliers International | RA-8 | ₹118.2 Cr | 3 Blocks
// ─────────────────────────────────────────────────────────────────────────────

const MLL_HIST_TO = 7; // RA-01 to RA-07 in history

const mllInfraBilling: InfraM[] = [
  im('1', 'Infra Civil Works',        'Road, Yard & Truck Docking Area',        75_000_000, 0.45, 0.08, 3, mkHist('RA Bill - ', 1, MLL_HIST_TO, 75_000_000, 0.45)),
  im('2', 'Infra Civil Works',        'Compound Wall, Gate & Guard Room',        35_000_000, 0.50, 0.08, 2, mkHist('RA Bill - ', 1, MLL_HIST_TO, 35_000_000, 0.50)),
  im('3', 'External Electrical Works','11KV HT Substation & Feeder Pillars',     22_000_000, 0.38, 0.08, 2, mkHist('RA Bill - ', 1, MLL_HIST_TO, 22_000_000, 0.38)),
  im('4', 'External Fire Works',      'External Fire Ring Main & Hydrants',      16_000_000, 0.35, 0.08, 2, mkHist('RA Bill - ', 1, MLL_HIST_TO, 16_000_000, 0.35)),
];

const mllBillingMilestones: BillingMilestone[] = [
  // Building Civil Works
  bm('Building Civil Works', 'Piling & Foundation Works',             bd(33_000_000,1.00,0),    bd(30_000_000,1.00,0),    bd(25_500_000,0.85,0.08)),
  bm('Building Civil Works', 'RCC Column, Beam & Slab',               bd(66_000_000,0.75,0.05), bd(60_000_000,0.55,0.08), bd(51_000_000,0.20,0.08)),
  bm('Building Civil Works', 'Roofing, Cladding & Fascia',            bd(77_000_000,0.40,0.08), bd(70_000_000,0.18,0.08), bd(59_500_000,0,0)),
  bm('Building Civil Works', 'Flooring, Finishing & Site Clearance',  bd(44_000_000,0.05,0.03), bd(40_000_000,0,0),       bd(34_000_000,0,0)),
  // Internal Electrical Works
  bm('Internal Electrical Works', 'HT/LT Panels, Transformers & DG', bd(28_000_000,0.70,0.05), bd(26_000_000,0.50,0.08), bd(22_000_000,0.20,0.05)),
  bm('Internal Electrical Works', 'Internal Wiring, Busduct & Trays', bd(25_000_000,0.40,0.08), bd(23_000_000,0.25,0.08), bd(19_000_000,0.05,0.05)),
  bm('Internal Electrical Works', 'Lighting, Earthing & BMS Cabling', bd(17_000_000,0.10,0.05), bd(16_000_000,0.05,0.05), bd(14_000_000,0,0)),
  // Internal Fire Works
  bm('Internal Fire Works', 'Underground Piping & Sump',             bd(24_000_000,0.80,0.05), bd(22_000_000,0.65,0.08), bd(18_000_000,0.30,0.08)),
  bm('Internal Fire Works', 'Overhead Sprinkler & Deluge System',    bd(22_000_000,0.35,0.08), bd(20_000_000,0.20,0.08), bd(16_000_000,0.05,0.05)),
  bm('Internal Fire Works', 'Fire Pump House & Monitoring Panel',    bd(14_000_000,0.30,0.05), bd(13_000_000,0.20,0.05), bd(11_000_000,0.10,0.05)),
  // Internal Plumbing Works
  bm('Internal Plumbing Works', 'Water Supply & OHT Works',          bd(14_000_000,0.50,0.08), bd(13_000_000,0.35,0.08), bd(11_000_000,0.15,0.05)),
  bm('Internal Plumbing Works', 'Drainage, STP Connection & Manholes',bd(13_000_000,0.40,0.08), bd(12_000_000,0.25,0.08), bd(10_000_000,0.08,0.05)),
  bm('Internal Plumbing Works', 'Sanitation Fixtures & Final Testing',bd( 8_000_000,0.10,0.03), bd( 7_000_000,0.05,0.03), bd( 6_000_000,0,0)),
];

const mllBlockTotals: BlockTotals = {
  block1: mllBillingMilestones.reduce((s, m) => s + m.block1.scope, 0),
  block2: mllBillingMilestones.reduce((s, m) => s + m.block2.scope, 0),
  block3: mllBillingMilestones.reduce((s, m) => s + m.block3.scope, 0),
  block4: 0,
};

const mllInfraRATotal = mllInfraBilling.reduce((s, m) => s + m.scopeAmount, 0);

const mllInfraRAMilestones: InfraRAMilestone[] = mllInfraBilling.map((m) => ({
  sno: m.sno, category: m.category, description: m.description,
  pctOfTotal: m.scopeAmount / mllInfraRATotal,
  scopeAmount: m.scopeAmount,
  prevPct: m.prevPct, prevAmt: m.prevAmt,
  thisPct: m.thisPct, thisAmt: m.thisAmt,
  cumPct: m.cumPct, cumAmt: m.cumAmt,
  raHistory: m.raHistory ?? {},
}));

const mkMllSumItem = (sno: string, desc: string, cat: string) => {
  const rows = mllBillingMilestones.filter(m => m.category === cat);
  const order = rows.reduce((s, m) => s + m.block1.scope + m.block2.scope + m.block3.scope, 0);
  const prev  = rows.reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt + m.block3.prevAmt, 0);
  const thisB = rows.reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt + m.block3.thisAmt, 0);
  return { sno, description: desc, orderAmount: order, prevBillAmount: prev, thisBillAmount: thisB, cumulativeAmount: prev + thisB, subItems: [] };
};

const mllInfraRowPrev = mllInfraBilling.reduce((s, m) => s + m.prevAmt, 0);
const mllInfraRowThis = mllInfraBilling.reduce((s, m) => s + m.thisAmt, 0);

const mllSummaryItems: BillingSummaryItem[] = [
  mkMllSumItem('1', 'Warehouse building civil works', 'Building Civil Works'),
  mkMllSumItem('2', 'Electrical works', 'Internal Electrical Works'),
  mkMllSumItem('3', 'Fire fighting works', 'Internal Fire Works'),
  mkMllSumItem('4', 'Plumbing works', 'Internal Plumbing Works'),
  { sno: '5', description: 'Infra civil works', orderAmount: mllInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: mllInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: mllInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: mllInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
  { sno: '6', description: 'External electrical works', orderAmount: mllInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: mllInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: mllInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: mllInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
  { sno: '7', description: 'External fire fighting works', orderAmount: mllInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: mllInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: mllInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: mllInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
];

const mllSummaryTotals = {
  orderAmount:      mllSummaryItems.reduce((s, i) => s + i.orderAmount, 0),
  prevBillAmount:   mllSummaryItems.reduce((s, i) => s + i.prevBillAmount, 0),
  thisBillAmount:   mllSummaryItems.reduce((s, i) => s + i.thisBillAmount, 0),
  cumulativeAmount: mllSummaryItems.reduce((s, i) => s + i.cumulativeAmount, 0),
};

const mllVendor: VendorConfig = {
  id: 'mll',
  shortName: 'MLL Pune',
  projectName: 'Mahindra Logistics Hub — Pune',
  contractor: 'M/s. Simplex Infrastructures Ltd.',
  client: 'Mahindra Logistics Ltd.',
  pmc: 'Colliers International (India) Pvt. Ltd.',
  woNumber: 'MLL/PUNE/PROJECT/24-25/03',
  woDate: '10.07.2024',
  currentRA: 8,
  totalBasicCost: mllSummaryTotals.orderAmount,
  costPerSqft: Math.round(mllSummaryTotals.orderAmount / 95_000),
  grandTotalArea: 95_000,
  billingSummaryItems: mllSummaryItems,
  billingSummaryTotals: mllSummaryTotals,
  billingMilestones: mllBillingMilestones,
  blockTotals: mllBlockTotals,
  buildingMilestones: [],
  infraBillingMilestones: mllInfraBilling,
  infraRAMilestones: mllInfraRAMilestones,
  infraRATotal: mllInfraRATotal,
  infraMilestones: [],
  infraMilestoneTotal: mllInfraRATotal,
  defaultMaterialRows: [
    { sno: '1', desc: 'PEB Structure — All 3 Blocks',                total: 28_000_000, prev: 20_000_000, thisV: 2_000_000 },
    { sno: '2', desc: 'Electrical Transformers & HT Panels',          total:  6_000_000, prev:  3_600_000, thisV: 480_000  },
    { sno: '3', desc: 'Fire Fighting Pumps & Controller Panel',       total:  4_000_000, prev:  2_000_000, thisV: 320_000  },
    { sno: '4', desc: 'Dock Levellers & Loading Bay Equipment',       total:  3_500_000, prev:  1_500_000, thisV: 280_000  },
    { sno: '5', desc: 'Roofing Sheets, Purlins & Gutter',             total:  7_000_000, prev:  5_000_000, thisV: 560_000  },
  ],
  defaultHoldItems: [
    { id: 'MLL-H01', desc: 'Structural Design Approval Hold',          amt: 3_500_000, active: true },
    { id: 'MLL-H02', desc: 'Block-3 Safety Audit Hold',                amt: 2_000_000, active: true },
    { id: 'MLL-H03', desc: 'MEP Coordination Documentation Hold',      amt: 1_500_000, active: true },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR 4 — TVS Warehouse, Chennai
// Contractor: NCC Limited | Client: TVS Supply Chain Solutions Ltd.
// PMC: JLL | RA-5 | ₹43.7 Cr | 2 Blocks
// ─────────────────────────────────────────────────────────────────────────────

const TVS_HIST_TO = 4; // RA-01 to RA-04 in history

const tvsInfraBilling: InfraM[] = [
  im('1', 'Infra Civil Works',        'Road Paving, Kerbing & Yard Hardening',  60_000_000, 0.30, 0.08, 2, mkHist('RA Bill - ', 1, TVS_HIST_TO, 60_000_000, 0.30)),
  im('2', 'Infra Civil Works',        'Compound Wall, Main Gate & Security',     25_000_000, 0.35, 0.08, 1, mkHist('RA Bill - ', 1, TVS_HIST_TO, 25_000_000, 0.35)),
  im('3', 'External Electrical Works','HT Substation, Cabling & Street Lights',  20_000_000, 0.25, 0.08, 1, mkHist('RA Bill - ', 1, TVS_HIST_TO, 20_000_000, 0.25)),
  im('4', 'External Fire Works',      'External Hydrant Main & Pump Station',    20_000_000, 0.20, 0.05, 1, mkHist('RA Bill - ', 1, TVS_HIST_TO, 20_000_000, 0.20)),
];

const tvsBillingMilestones: BillingMilestone[] = [
  // Building Civil Works
  bm('Building Civil Works', 'Excavation, PCC & Foundation Works', bd(14_250_000,1.00,0),    bd(12_750_000,1.00,0)),
  bm('Building Civil Works', 'RCC Column, Plinth Beam & Slab',     bd(28_500_000,0.60,0.08), bd(25_500_000,0.45,0.08)),
  bm('Building Civil Works', 'Roofing, Sheeting & Fascia Works',   bd(33_250_000,0.10,0.05), bd(29_750_000,0,0)),
  bm('Building Civil Works', 'Finishing, Flooring & Painting',     bd(19_000_000,0,0),       bd(17_000_000,0,0)),
  // Internal Electrical Works
  bm('Internal Electrical Works', 'HT/LT Panel, Transformer & DG Set',bd(12_000_000,0.50,0.08), bd(10_800_000,0.35,0.08)),
  bm('Internal Electrical Works', 'Internal Wiring & Cable Trays',     bd( 9_000_000,0.20,0.08), bd( 8_100_000,0.10,0.05)),
  bm('Internal Electrical Works', 'Lighting, Earthing & Distribution', bd( 9_000_000,0,0),       bd( 8_100_000,0,0)),
  // Internal Fire Works
  bm('Internal Fire Works', 'Underground Piping & Water Storage', bd(10_000_000,0.40,0.05), bd( 9_000_000,0.30,0.05)),
  bm('Internal Fire Works', 'Overhead Sprinkler System',           bd(10_000_000,0.10,0.05), bd( 9_000_000,0.05,0.05)),
  bm('Internal Fire Works', 'Pump House & Hydrant Network',        bd( 5_000_000,0.10,0.05), bd( 4_000_000,0.05,0.03)),
  // Internal Plumbing Works
  bm('Internal Plumbing Works', 'Water Supply, OHT & Booster Pump', bd(6_000_000,0.30,0.08), bd(5_400_000,0.20,0.05)),
  bm('Internal Plumbing Works', 'Drainage, Sewerage & Manholes',    bd(6_000_000,0.20,0.05), bd(5_400_000,0.10,0.05)),
];

const tvsBlockTotals: BlockTotals = {
  block1: tvsBillingMilestones.reduce((s, m) => s + m.block1.scope, 0),
  block2: tvsBillingMilestones.reduce((s, m) => s + m.block2.scope, 0),
  block3: 0,
  block4: 0,
};

const tvsInfraRATotal = tvsInfraBilling.reduce((s, m) => s + m.scopeAmount, 0);

const tvsInfraRAMilestones: InfraRAMilestone[] = tvsInfraBilling.map((m) => ({
  sno: m.sno, category: m.category, description: m.description,
  pctOfTotal: m.scopeAmount / tvsInfraRATotal,
  scopeAmount: m.scopeAmount,
  prevPct: m.prevPct, prevAmt: m.prevAmt,
  thisPct: m.thisPct, thisAmt: m.thisAmt,
  cumPct: m.cumPct, cumAmt: m.cumAmt,
  raHistory: m.raHistory ?? {},
}));

const mkTvsSumItem = (sno: string, desc: string, cat: string) => {
  const rows = tvsBillingMilestones.filter(m => m.category === cat);
  const order = rows.reduce((s, m) => s + m.block1.scope + m.block2.scope, 0);
  const prev  = rows.reduce((s, m) => s + m.block1.prevAmt + m.block2.prevAmt, 0);
  const thisB = rows.reduce((s, m) => s + m.block1.thisAmt + m.block2.thisAmt, 0);
  return { sno, description: desc, orderAmount: order, prevBillAmount: prev, thisBillAmount: thisB, cumulativeAmount: prev + thisB, subItems: [] };
};

const tvsSummaryItems: BillingSummaryItem[] = [
  mkTvsSumItem('1', 'Warehouse building civil works', 'Building Civil Works'),
  mkTvsSumItem('2', 'Electrical works', 'Internal Electrical Works'),
  mkTvsSumItem('3', 'Fire fighting works', 'Internal Fire Works'),
  mkTvsSumItem('4', 'Plumbing works', 'Internal Plumbing Works'),
  { sno: '5', description: 'Infra civil works', orderAmount: tvsInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: tvsInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: tvsInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: tvsInfraBilling.filter(m=>m.category==='Infra Civil Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
  { sno: '6', description: 'External electrical works', orderAmount: tvsInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: tvsInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: tvsInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: tvsInfraBilling.filter(m=>m.category==='External Electrical Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
  { sno: '7', description: 'External fire fighting works', orderAmount: tvsInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.scopeAmount,0), prevBillAmount: tvsInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.prevAmt,0), thisBillAmount: tvsInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.thisAmt,0), cumulativeAmount: tvsInfraBilling.filter(m=>m.category==='External Fire Works').reduce((s,m)=>s+m.cumAmt,0), subItems: [] },
];

const tvsSummaryTotals = {
  orderAmount:      tvsSummaryItems.reduce((s, i) => s + i.orderAmount, 0),
  prevBillAmount:   tvsSummaryItems.reduce((s, i) => s + i.prevBillAmount, 0),
  thisBillAmount:   tvsSummaryItems.reduce((s, i) => s + i.thisBillAmount, 0),
  cumulativeAmount: tvsSummaryItems.reduce((s, i) => s + i.cumulativeAmount, 0),
};

const tvsVendor: VendorConfig = {
  id: 'tvs',
  shortName: 'TVS Chennai',
  projectName: 'TVS Warehousing & Distribution Hub',
  contractor: 'M/s. NCC Limited',
  client: 'TVS Supply Chain Solutions Ltd.',
  pmc: 'JLL India Pvt. Ltd.',
  woNumber: 'TVSSCS/CHENNAI/WO/24-25/11',
  woDate: '01.11.2024',
  currentRA: 5,
  totalBasicCost: tvsSummaryTotals.orderAmount,
  costPerSqft: Math.round(tvsSummaryTotals.orderAmount / 38_000),
  grandTotalArea: 38_000,
  billingSummaryItems: tvsSummaryItems,
  billingSummaryTotals: tvsSummaryTotals,
  billingMilestones: tvsBillingMilestones,
  blockTotals: tvsBlockTotals,
  buildingMilestones: [],
  infraBillingMilestones: tvsInfraBilling,
  infraRAMilestones: tvsInfraRAMilestones,
  infraRATotal: tvsInfraRATotal,
  infraMilestones: [],
  infraMilestoneTotal: tvsInfraRATotal,
  defaultMaterialRows: [
    { sno: '1', desc: 'PEB Structure (Client Supplied)',      total:  8_000_000, prev:  3_000_000, thisV: 640_000 },
    { sno: '2', desc: 'Roofing Sheets & Accessories',         total:  3_500_000, prev:  1_000_000, thisV: 280_000 },
    { sno: '3', desc: 'Electrical Transformers',              total:  2_000_000, prev:    500_000, thisV: 160_000 },
  ],
  defaultHoldItems: [
    { id: 'TVS-H01', desc: 'Foundation Design Review Hold',   amt: 1_200_000, active: true },
    { id: 'TVS-H02', desc: 'Statutory Approval Documentation',amt:   800_000, active: true },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const VENDORS: VendorConfig[] = [lpwVendor, kgVendor, mllVendor, tvsVendor];

export function getVendor(id: string): VendorConfig {
  return VENDORS.find(v => v.id === id) ?? lpwVendor;
}
