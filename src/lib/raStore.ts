// ─────────────────────────────────────────────────────────────────────────────
// raStore.ts — Single source of truth for all RA bill data (Async IndexedDB)
// ─────────────────────────────────────────────────────────────────────────────

import { db, RABillRecord, ProjectRecord, COPRecord } from './db';

export interface BlockEntry { pct: number; amt: number; }
export interface BuildingMilestoneEntry {
  [key: string]: BlockEntry;
}
export interface BOQEntry { pct: number; amt: number; }
export interface InfraMilestoneEntry { pct: number; amt: number; }

export interface RABillData {
  raNumber: number;
  savedAt: string;
  label: string;           // e.g. "RA-17"
  building: Record<number, BuildingMilestoneEntry>;
  infra: Record<number, InfraMilestoneEntry>;
  boqEntries?: Record<string, Record<number, BOQEntry>>; // boqId -> itemIdx -> entry
  buildingTotal: number;
  infraTotal: number;
  boqTotal?: number;
  grandTotal: number;
}

// ─── RA Bill Operations ──────────────────────────────────────────────────────

export async function loadRA(raNumber: number, projectId: string): Promise<RABillData | null> {
  const record = await db.getRA(projectId, raNumber);
  if (!record) return null;
  return {
    raNumber: record.raNumber,
    savedAt: record.savedAt,
    label: record.label,
    building: record.building,
    infra: record.infra,
    boqEntries: record.boqEntries,
    buildingTotal: record.buildingTotal,
    infraTotal: record.infraTotal,
    boqTotal: record.boqTotal,
    grandTotal: record.grandTotal,
  };
}

export async function loadAllRAs(projectId: string): Promise<RABillData[]> {
  const records = await db.getAllRAs(projectId);
  return records.map(record => ({
    raNumber: record.raNumber,
    savedAt: record.savedAt,
    label: record.label,
    building: record.building,
    infra: record.infra,
    boqEntries: record.boqEntries,
    buildingTotal: record.buildingTotal,
    infraTotal: record.infraTotal,
    boqTotal: record.boqTotal,
    grandTotal: record.grandTotal,
  }));
}

export async function getSavedRANumbers(projectId: string): Promise<number[]> {
  const records = await db.getAllRAs(projectId);
  return records.map(r => r.raNumber).sort((a, b) => a - b);
}

export async function saveRA(data: RABillData, projectId: string): Promise<void> {
  const record: RABillRecord = {
    projectId,
    raNumber: data.raNumber,
    savedAt: data.savedAt,
    label: data.label,
    building: data.building,
    infra: data.infra,
    boqEntries: data.boqEntries,
    buildingTotal: data.buildingTotal,
    infraTotal: data.infraTotal,
    boqTotal: data.boqTotal,
    grandTotal: data.grandTotal,
  };
  await db.saveRA(record);
}

export async function deleteRA(raNumber: number, projectId: string): Promise<void> {
  await db.deleteRA(projectId, raNumber);
  await deleteCOP(raNumber, projectId);
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
  statusNote: string;
  statusUpdatedAt: string;

  raBuildingTotal: number;
  raInfraTotal: number;
  raGrandTotal: number;

  retentionPct: number;
  retentionAmt: number;

  deductions: { id: string; name: string; mode: 'amount' | 'pct'; amount: number; pct: number }[];
  additions: { id: string; name: string; mode: 'amount' | 'pct'; amount: number; pct: number }[];
  customLines: COPAdjustmentLine[];
  grossAmount: number;
  totalDeductions: number;
  totalAdditions: number;
  netPayable: number;

  approvals: {
    id: number;
    label: string;
    status: 'pending' | 'signed';
    signature?: string;
    signedAt?: string;
    signedBy?: string;
  }[];
}

export async function loadCOP(raNumber: number, projectId: string): Promise<COPData | null> {
  const record = await db.getCOP(projectId, raNumber);
  if (!record) return null;
  return {
    ...record.data,
    raNumber: record.raNumber,
    copNumber: record.copNumber,
    savedAt: record.savedAt,
    status: record.status as COPStatus,
  } as COPData;
}

export async function loadAllCOPs(projectId: string): Promise<COPData[]> {
  const records = await db.getAllCOPs(projectId);
  return records.map(record => ({
    ...record.data,
    raNumber: record.raNumber,
    copNumber: record.copNumber,
    savedAt: record.savedAt,
    status: record.status as COPStatus,
  } as COPData));
}

export async function saveCOP(data: COPData, projectId: string): Promise<void> {
  const record: COPRecord = {
    projectId,
    raNumber: data.raNumber,
    copNumber: data.copNumber,
    savedAt: data.savedAt,
    status: data.status,
    data: data,
  };
  await db.saveCOP(record);
}

export async function deleteCOP(raNumber: number, projectId: string): Promise<void> {
  await db.deleteCOP(projectId, raNumber);
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration Logic (One-time from localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export async function migrateFromLocalStorage(vendorIds: string[]): Promise<void> {
  const migratedKey = 'db_migrated_v1';
  if (localStorage.getItem(migratedKey)) return;

  console.log('Starting migration from localStorage to IndexedDB...');

  for (const vId of vendorIds) {
    try {
      // 1. Migrate RA Bills
      const raListKey = `${vId}-ra-list`;
      const raListRaw = localStorage.getItem(raListKey);
      if (raListRaw) {
        const raNumbers = JSON.parse(raListRaw) as number[];
        for (const n of raNumbers) {
          const raw = localStorage.getItem(`${vId}-ra-bill-${n}`);
          if (raw) {
            const data = JSON.parse(raw);
            await saveRA(data, vId);
          }
        }
      }

      // 2. Migrate COPs
      const copListKey = `${vId}-cop-list`;
      const copListRaw = localStorage.getItem(copListKey);
      if (copListRaw) {
        const copNumbers = JSON.parse(copListRaw) as number[];
        for (const n of copNumbers) {
          const raw = localStorage.getItem(`${vId}-cop-${n}`);
          if (raw) {
            const data = JSON.parse(raw);
            await saveCOP(data, vId);
          }
        }
      }
    } catch (e) {
      console.error(`Migration failed for vendor ${vId}:`, e);
    }
  }

  localStorage.setItem(migratedKey, 'true');
  console.log('Migration completed.');
}
