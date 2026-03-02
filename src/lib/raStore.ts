// ─────────────────────────────────────────────────────────────────────────────
// raStore.ts — Single source of truth for all RA bill data
// All pages read from here. NewRAEntryPage writes here.
// ─────────────────────────────────────────────────────────────────────────────

export type BK = 'block1' | 'block2' | 'block3' | 'block4';
export const BKEYS: BK[] = ['block1', 'block2', 'block3', 'block4'];

export interface BlockEntry { pct: number; amt: number; }
export interface BuildingMilestoneEntry {
  block1: BlockEntry; block2: BlockEntry;
  block3: BlockEntry; block4: BlockEntry;
}
export interface InfraMilestoneEntry { pct: number; amt: number; }

export interface RABillData {
  raNumber: number;
  savedAt: string;
  label: string;           // e.g. "RA-17"
  building: Record<number, BuildingMilestoneEntry>;
  infra: Record<number, InfraMilestoneEntry>;
  // Computed totals (filled on save)
  buildingTotal: number;
  infraTotal: number;
  grandTotal: number;
}

const KEY_PREFIX = 'lpw-ra-bill-';
const KEY_LIST = 'lpw-ra-list';

// ─── Read ─────────────────────────────────────────────────────────────────────
export function loadRA(raNumber: number): RABillData | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + raNumber);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadAllRAs(): RABillData[] {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(KEY_LIST) || '[]');
    return list.map(n => loadRA(n)).filter(Boolean) as RABillData[];
  } catch { return []; }
}

export function getSavedRANumbers(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_LIST) || '[]');
  } catch { return []; }
}

// ─── Write ────────────────────────────────────────────────────────────────────
export function saveRA(data: RABillData): void {
  localStorage.setItem(KEY_PREFIX + data.raNumber, JSON.stringify(data));
  // Update list
  const list = getSavedRANumbers();
  if (!list.includes(data.raNumber)) {
    list.push(data.raNumber);
    list.sort((a, b) => a - b);
    localStorage.setItem(KEY_LIST, JSON.stringify(list));
  }
}

export function deleteRA(raNumber: number): void {
  localStorage.removeItem(KEY_PREFIX + raNumber);
  const list = getSavedRANumbers().filter(n => n !== raNumber);
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
  deleteCOP(raNumber);
}

// ─────────────────────────────────────────────────────────────────────────────
// COP (Certificate of Payment) data
// ─────────────────────────────────────────────────────────────────────────────

export type COPStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface COPAdjustmentLine {
  id: string;
  label: string;
  type: 'deduction' | 'addition';
  amount: number;
}

export interface COPData {
  raNumber: number;
  copNumber: string;         // e.g. "COP-17"
  savedAt: string;
  status: COPStatus;
  statusNote: string;        // reason for rejection / approval note
  statusUpdatedAt: string;

  // Source amounts from RA bill
  raBuildingTotal: number;
  raInfraTotal: number;
  raGrandTotal: number;

  // Standard deductions
  materialDeduction: number;   // free issue materials
  retentionPct: number;   // % — applied to gross
  retentionAmt: number;   // calculated
  advanceRecovery: number;   // fixed amount
  holdRelease: number;   // amount being released (positive = adds back)

  // Custom adjustment lines (up to 10)
  customLines: COPAdjustmentLine[];

  // Computed
  grossAmount: number;   // RA total after material deduction
  totalDeductions: number;
  totalAdditions: number;
  netPayable: number;

  // New: 4-step approval
  approvals: {
    id: number;
    label: string;
    status: 'pending' | 'signed';
    signature?: string; // data-url
    signedAt?: string;
    signedBy?: string;
  }[];
}

const COP_PREFIX = 'lpw-cop-';
const COP_LIST = 'lpw-cop-list';

export function loadCOP(raNumber: number): COPData | null {
  try {
    const raw = localStorage.getItem(COP_PREFIX + raNumber);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadAllCOPs(): COPData[] {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(COP_LIST) || '[]');
    return list.map(n => loadCOP(n)).filter(Boolean) as COPData[];
  } catch { return []; }
}

export function saveCOP(data: COPData): void {
  localStorage.setItem(COP_PREFIX + data.raNumber, JSON.stringify(data));
  const list: number[] = JSON.parse(localStorage.getItem(COP_LIST) || '[]');
  if (!list.includes(data.raNumber)) {
    list.push(data.raNumber);
    list.sort((a, b) => a - b);
    localStorage.setItem(COP_LIST, JSON.stringify(list));
  }
}

export function deleteCOP(raNumber: number): void {
  localStorage.removeItem(COP_PREFIX + raNumber);
  const list: number[] = JSON.parse(localStorage.getItem(COP_LIST) || '[]')
    .filter((n: number) => n !== raNumber);
  localStorage.setItem(COP_LIST, JSON.stringify(list));
}
