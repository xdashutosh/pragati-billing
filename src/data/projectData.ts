// ─────────────────────────────────────────────────────────────────────────────
// projectData.ts — Single source of truth
// Abstract data  → lpw_project_data.json  (PO scope / contract baseline)
// Billing data   → billing_lpw.json       (RA-16 previous/this/cumulative %)
//
// RULE: billing JSON stores % only. Amounts = % × scope from abstract JSON.
//       Change scope in abstract → billing amounts recalculate automatically.
// ─────────────────────────────────────────────────────────────────────────────

import rawAbstract from './lpw_project_data.json';
import rawBilling from './billing_lpw.json';

// ─── ABSTRACT TYPES ──────────────────────────────────────────────────────────

export interface AbstractSubItem {
  description: string;
  amount: number;
}
export interface AbstractItem {
  sno: string;
  description: string;
  amount: number;
  ratePerSqft: number | null;
  subItems: AbstractSubItem[];
}
export interface AbstractSummary {
  projectName: string;
  totalBasicCost: number;
  costPerSqft: number;
  items: AbstractItem[];
}
export interface TradeItem { ref: string; description: string; amount: number; }
export interface Trade { tradeNo: number; trade: string; rate: number; amount: number; items: TradeItem[]; }
export interface Block { block: string; plinthArea: number; mezzArea: number; totalBUA: number; trades: Trade[]; }
export interface InfraItem { ref: string; description: string; unit: string; qty: number; rate: number; amount: number; }
export interface InfraSection { sno: number; section: string; rate: number; amount: number; items: InfraItem[]; }
export interface InfraMilestone { sno: string; category: string; description: string; pct: number; amount: number; }
export interface BuildingMilestone { category: string; description: string; pct: number; b1: number; b2: number; b3: number; b4: number; }
export interface BlockTotals { block1: number; block2: number; block3: number; block4: number; }

// ─── BILLING TYPES ───────────────────────────────────────────────────────────

export interface BillingSummarySubItem {
  description: string;
  orderAmount: number;
  prevBillAmount: number;
  thisBillAmount: number;
  cumulativeAmount: number;
}
export interface BillingSummaryItem {
  sno: string;
  description: string;
  orderAmount: number;
  prevBillAmount: number;
  thisBillAmount: number;
  cumulativeAmount: number;
  subItems: BillingSummarySubItem[];
}
export interface BillingBlockData {
  scope: number;
  prevPct: number; prevAmt: number;
  thisPct: number; thisAmt: number;
  cumPct: number; cumAmt: number;
}
export interface BillingMilestone {
  category: string;
  description: string;
  block1: BillingBlockData;
  block2: BillingBlockData;
  block3: BillingBlockData;
  block4: BillingBlockData;
}
export interface InfraRAMilestone {
  sno: string;
  category: string;
  description: string;
  pctOfTotal: number;
  scopeAmount: number;
  prevPct: number; prevAmt: number;
  thisPct: number; thisAmt: number;
  cumPct: number; cumAmt: number;
  raHistory: Record<string, { pct: number; amt: number }>;
}
export interface InfraBillingMilestone {
  sno: string;
  category: string;
  description: string;
  scopeAmount: number;
  prevPct: number; prevAmt: number;
  thisPct: number; thisAmt: number;
  cumPct: number; cumAmt: number;
  installmentsCompleted: number;
}

export interface MaterialRow {
  sno: string;
  desc: string;
  total: number;
  prev: number;
  thisV: number;
}

export interface HoldItem {
  id: string;
  desc: string;
  amt: number;
  active: boolean;
}

export interface InfraRow {
  sno: string;
  cat: string;
  desc: string;
  scope: number;
  prevP: number;
  thisP: number;
  prevA: number;
  thisA: number;
  cumP: number;
  cumA: number;
}

// ─── ABSTRACT EXPORTS ────────────────────────────────────────────────────────

export const abstractSummary: AbstractSummary = rawAbstract.abstractSummary as AbstractSummary;
export const buildingBlocks: Block[] = rawAbstract.buildingCostSheet.blocks as Block[];
export const infraSections: InfraSection[] = rawAbstract.infraCostSheet.sections as InfraSection[];
export const infraMilestones: InfraMilestone[] = rawAbstract.milestoneInfra.milestones as InfraMilestone[];
export const infraMilestoneTotal: number = rawAbstract.milestoneInfra.totalInfraAmount;
export const buildingMilestones: BuildingMilestone[] = rawAbstract.milestonesBldg.milestones as BuildingMilestone[];
export const blockTotals: BlockTotals = rawAbstract.milestonesBldg.blockTotals as BlockTotals;

// ─── BILLING EXPORTS ─────────────────────────────────────────────────────────

export const billingSummaryItems: BillingSummaryItem[] = rawBilling.summary.items as BillingSummaryItem[];
export const billingSummaryTotals = rawBilling.summary.totals;
export const billingMilestones: BillingMilestone[] = rawBilling.buildingMilestones.milestones as BillingMilestone[];
export const infraRAMilestones: InfraRAMilestone[] = rawBilling.infraRA.milestones as InfraRAMilestone[];
export const infraBillingMilestones: InfraBillingMilestone[] = rawBilling.infraBilling.milestones as InfraBillingMilestone[];
export const infraRATotal: number = rawBilling.infraRA.totalInfraScope;

export const MATERIAL_DATA: MaterialRow[] = [
  { sno: '1', desc: 'Pre-Engineered Building (PEB) Structure', total: 20451107.14, prev: 16360885.71, thisV: 1022555.36 },
  { sno: '2', desc: 'Fire Fighting Pumps & Accessories', total: 5000000.00, prev: 4000000.00, thisV: 250000.00 },
  { sno: '3', desc: 'Electrical Transformers & HT Panels', total: 4000000.00, prev: 3200000.00, thisV: 200000.00 },
];

export const HOLD_DATA: HoldItem[] = [
  { id: 'H001', desc: 'Documentation Hold (Phase 1)', amt: 2500000, active: true },
  { id: 'H002', desc: 'Safety Compliance Hold', amt: 1500000, active: true },
  { id: 'H003', desc: 'Quality Audit Hold (Block 3)', amt: 2654800, active: true },
];

export const INFRA_DATA: InfraRow[] = (rawBilling.infraRA.milestones as any[]).map(m => ({
  sno: m.sno,
  cat: m.category,
  desc: m.description,
  scope: m.scopeAmount,
  prevP: m.prevPct * 100,
  thisP: m.thisPct * 100,
  prevA: m.prevAmt,
  thisA: m.thisAmt,
  cumP: m.cumPct * 100,
  cumA: m.cumAmt,
}));

export const BUILDING_TOTAL_THIS = (rawBilling.summary.items as any[])
  .filter(i => ['1', '2', '3', '4'].includes(i.sno))
  .reduce((s, i) => s + i.thisBillAmount, 0);

export const INFRA_TOTAL_THIS = (rawBilling.summary.items as any[])
  .filter(i => ['5', '6', '7'].includes(i.sno))
  .reduce((s, i) => s + i.thisBillAmount, 0);

// ─── PROJECT INFO ────────────────────────────────────────────────────────────

export const PROJECT_INFO = {
  name: rawAbstract.abstractSummary.projectName,
  totalBasicCost: rawAbstract.abstractSummary.totalBasicCost,
  costPerSqft: rawAbstract.abstractSummary.costPerSqft,
  woNumber: 'LPWWPL/ECHUR/PROJECT/24-25/08',
  woDate: '21.08.2024',
  contractor: 'M/s. Conserve Buildcon LLP',
  client: 'M/s. LPW Warehousing Private Limited',
  pmc: 'JLL',
  currentRA: 16,
  grandTotalArea: rawAbstract.buildingCostSheet.blocks.reduce(
    (s: number, b: { plinthArea: number }) => s + b.plinthArea, 0
  ),
};
