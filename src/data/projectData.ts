// ─────────────────────────────────────────────────────────────────────────────
// projectData.ts — Templates and Types for Project Initialization
// ─────────────────────────────────────────────────────────────────────────────

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
  section: string;
  description: string;
  uom: string;
  qty: number;
  rate: number;
  [key: string]: any;
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
  released?: boolean;
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

// ─── BOQ (Bill of Quantities) ────────────────────────────────────────────────

export interface BOQItem {
  sno: string;
  section: string;      // grouping header (e.g. "Civil Works")
  category: string;     // sub-group (e.g. "Block A", "Floor 1")
  description: string;
  uom: string;
  qty: number;
  rate: number;
  weightage?: number;
  amount: number;
}

export interface BOQSheet {
  id: string;           // unique id, e.g. "boq-1678..."
  name: string;         // user-given name, e.g. "Infra", "Building Phase-1"
  createdAt: string;
  items: BOQItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA (LPW ECHUR)
// ─────────────────────────────────────────────────────────────────────────────

export const LPW_PROJECT: any = {
  name: 'Pragati Echur Project',
  contractor: 'M/s. Conserve Buildcon LLP',
  client: 'Pragati Group',
  pmc: 'Echur PMC Services',
  woNumber: 'LPWWPL/ECHUR/PROJECT/24-25/08',
  woDate: '20.05.2024',
  currentRA: 16,
  totalBasicCost: 247500000,
  costPerSqft: 247.5,
  grandTotalArea: 1000000,
  abstractSummary: {
    projectName: 'Pragati Echur Project',
    totalBasicCost: 247500000,
    costPerSqft: 247.5,
    items: [
      { sno: '1', description: 'Civil Works', amount: 150000000, ratePerSqft: 150, subItems: [] },
      { sno: '2', description: 'PEB Works', amount: 80000000, ratePerSqft: 80, subItems: [] },
      { sno: '3', description: 'Flooring', amount: 17500000, ratePerSqft: 17.5, subItems: [] }
    ]
  },
  buildingCostSheet: {
    blocks: [
      {
        block: 'Block-1',
        plinthArea: 250000,
        mezzArea: 25000,
        totalBUA: 275000,
        trades: [
          { tradeNo: 1, trade: 'Earthwork', rate: 100, amount: 2500000, items: [] },
          { tradeNo: 2, trade: 'Concrete', rate: 500, amount: 12500000, items: [] }
        ]
      }
    ]
  },
  infraCostSheet: { sections: [] },
  milestoneInfra: { milestones: [], totalInfraAmount: 0 },
  milestonesBldg: {
    milestones: [],
    blockTotals: { block1: 15000000, block2: 0, block3: 0, block4: 0 }
  },
  billingSummary: {
    items: [],
    totals: { orderAmount: 247500000, prevBillAmount: 210000000, thisBillAmount: 15000000, cumulativeAmount: 225000000 }
  },
  billingMilestones: { milestones: [] },
  infraRA: { milestones: [], totalInfraScope: 0 },
  infraBilling: { milestones: [] },
  defaultMaterialRows: [],
  defaultHoldItems: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export function createEmptyProject(name: string): any {
  return {
    id: `project-${Date.now()}`,
    name,
    contractor: '',
    client: '',
    pmc: '',
    woNumber: '',
    woDate: '',
    currentRA: 0,
    totalBasicCost: 0,
    costPerSqft: 0,
    grandTotalArea: 0,
    abstractSummary: {
      projectName: name,
      totalBasicCost: 0,
      costPerSqft: 0,
      items: []
    },
    buildingCostSheet: { blocks: [] },
    infraCostSheet: { sections: [] },
    // Legacy fields kept for backward compatibility
    milestoneInfra: { milestones: [], totalInfraAmount: 0 },
    milestonesBldg: { milestones: [], blockTotals: { block1: 0, block2: 0, block3: 0, block4: 0 } },
    // New dynamic BOQ sheets
    boqs: [] as BOQSheet[],
    billingSummary: { items: [], totals: { orderAmount: 0, prevBillAmount: 0, thisBillAmount: 0, cumulativeAmount: 0 } },
    billingMilestones: { milestones: [] },
    infraRA: { milestones: [], totalInfraScope: 0 },
    infraBilling: { milestones: [] },
    defaultMaterialRows: [],
    defaultHoldItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
