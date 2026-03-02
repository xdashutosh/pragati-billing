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

// Keys are namespaced by vendorId so each vendor has isolated storage.
// LPW vendor uses id='lpw' → keys: 'lpw-ra-bill-X', 'lpw-ra-list' (backward-compat).
const raKey = (v: string, n: number) => `${v}-ra-bill-${n}`;
const raList = (v: string) => `${v}-ra-list`;

// ─── Read ─────────────────────────────────────────────────────────────────────
export function loadRA(raNumber: number, vendorId = 'lpw'): RABillData | null {
  try {
    const raw = localStorage.getItem(raKey(vendorId, raNumber));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadAllRAs(vendorId = 'lpw'): RABillData[] {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(raList(vendorId)) || '[]');
    return list.map(n => loadRA(n, vendorId)).filter(Boolean) as RABillData[];
  } catch { return []; }
}

export function getSavedRANumbers(vendorId = 'lpw'): number[] {
  try {
    return JSON.parse(localStorage.getItem(raList(vendorId)) || '[]');
  } catch { return []; }
}

// ─── Write ────────────────────────────────────────────────────────────────────
export function saveRA(data: RABillData, vendorId = 'lpw'): void {
  localStorage.setItem(raKey(vendorId, data.raNumber), JSON.stringify(data));
  const list = getSavedRANumbers(vendorId);
  if (!list.includes(data.raNumber)) {
    list.push(data.raNumber);
    list.sort((a, b) => a - b);
    localStorage.setItem(raList(vendorId), JSON.stringify(list));
  }
}

export function deleteRA(raNumber: number, vendorId = 'lpw'): void {
  localStorage.removeItem(raKey(vendorId, raNumber));
  const list = getSavedRANumbers(vendorId).filter(n => n !== raNumber);
  localStorage.setItem(raList(vendorId), JSON.stringify(list));
  deleteCOP(raNumber, vendorId);
}

// ─────────────────────────────────────────────────────────────────────────────
// COP (Certificate of Payment) data
// ─────────────────────────────────────────────────────────────────────────────

export type COPStatus = 'draft' | 'prepared' | 'l1_approved' | 'l2_approved' | 'l3_approved' | 'approved' | 'rejected';

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

const copKey = (v: string, n: number) => `${v}-cop-${n}`;
const copList = (v: string) => `${v}-cop-list`;

export function loadCOP(raNumber: number, vendorId = 'lpw'): COPData | null {
  try {
    const raw = localStorage.getItem(copKey(vendorId, raNumber));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadAllCOPs(vendorId = 'lpw'): COPData[] {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(copList(vendorId)) || '[]');
    return list.map(n => loadCOP(n, vendorId)).filter(Boolean) as COPData[];
  } catch { return []; }
}

export function saveCOP(data: COPData, vendorId = 'lpw'): void {
  localStorage.setItem(copKey(vendorId, data.raNumber), JSON.stringify(data));
  const list: number[] = JSON.parse(localStorage.getItem(copList(vendorId)) || '[]');
  if (!list.includes(data.raNumber)) {
    list.push(data.raNumber);
    list.sort((a, b) => a - b);
    localStorage.setItem(copList(vendorId), JSON.stringify(list));
  }
}

export function deleteCOP(raNumber: number, vendorId = 'lpw'): void {
  localStorage.removeItem(copKey(vendorId, raNumber));
  const list: number[] = JSON.parse(localStorage.getItem(copList(vendorId)) || '[]')
    .filter((n: number) => n !== raNumber);
  localStorage.setItem(copList(vendorId), JSON.stringify(list));
}
