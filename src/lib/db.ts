// ─────────────────────────────────────────────────────────────────────────────
// db.ts — Native IndexedDB wrapper for project data and billing records
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'BillingSystemDB';
const DB_VERSION = 1;

export interface ProjectRecord {
    id: string;
    name: string;
    contractor: string;
    client: string;
    pmc: string;
    woNumber: string;
    woDate: string;
    currentRA: number;
    totalBasicCost: number;
    costPerSqft: number;
    grandTotalArea: number;
    abstractSummary: any;
    buildingCostSheet: any;
    infraCostSheet: any;
    milestoneInfra: any;
    milestonesBldg: any;
    billingSummary: any;
    billingMilestones: any;
    infraRA: any;
    infraBilling: any;
    defaultMaterialRows: any;
    defaultHoldItems: any;
    boqs: any[];           // Dynamic BOQ sheets
    createdAt: string;
    updatedAt: string;
}

export interface RABillRecord {
    id?: number;
    projectId: string;
    raNumber: number;
    savedAt: string;
    label: string;
    building: any;
    infra: any;
    boqEntries?: any;      // boqId -> { itemIdx: { pct, amt } }
    buildingTotal: number;
    infraTotal: number;
    boqTotal?: number;
    grandTotal: number;
}

export interface COPRecord {
    id?: number;
    projectId: string;
    raNumber: number;
    copNumber: string;
    savedAt: string;
    status: string;
    data: any;
}

class DBService {
    private db: IDBDatabase | null = null;

    async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('raBills')) {
                    const store = db.createObjectStore('raBills', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('projectId', 'projectId', { unique: false });
                    store.createIndex('project_ra', ['projectId', 'raNumber'], { unique: true });
                }

                if (!db.objectStoreNames.contains('cops')) {
                    const store = db.createObjectStore('cops', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('projectId', 'projectId', { unique: false });
                    store.createIndex('project_ra', ['projectId', 'raNumber'], { unique: true });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve(this.db!);
            };

            request.onerror = (event: any) => {
                reject('IndexedDB error: ' + event.target.errorCode);
            };
        });
    }

    private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        const db = await this.init();
        const transaction = db.transaction(name, mode);
        return transaction.objectStore(name);
    }

    // ── Project Operations ───────────────────────────────────────────────────
    async saveProject(project: ProjectRecord): Promise<void> {
        const store = await this.getStore('projects', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put({ ...project, updatedAt: new Date().toISOString() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getProject(id: string): Promise<ProjectRecord | null> {
        const store = await this.getStore('projects');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllProjects(): Promise<ProjectRecord[]> {
        const store = await this.getStore('projects');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteProject(id: string): Promise<void> {
        const store = await this.getStore('projects', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ── RA Bill Operations ───────────────────────────────────────────────────
    async saveRA(ra: RABillRecord): Promise<void> {
        const store = await this.getStore('raBills', 'readwrite');
        return new Promise((resolve, reject) => {
            // Find existing RA for this project and number
            const index = store.index('project_ra');
            const getRequest = index.get([ra.projectId, ra.raNumber]);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                const request = store.put(existing ? { ...existing, ...ra } : ra);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getRA(projectId: string, raNumber: number): Promise<RABillRecord | null> {
        const store = await this.getStore('raBills');
        const index = store.index('project_ra');
        return new Promise((resolve, reject) => {
            const request = index.get([projectId, raNumber]);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRAs(projectId: string): Promise<RABillRecord[]> {
        const store = await this.getStore('raBills');
        const index = store.index('projectId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(projectId);
            request.onsuccess = () => {
                const results = request.result as RABillRecord[];
                resolve(results.sort((a, b) => a.raNumber - b.raNumber));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRA(projectId: string, raNumber: number): Promise<void> {
        const store = await this.getStore('raBills', 'readwrite');
        const index = store.index('project_ra');
        return new Promise((resolve, reject) => {
            const getRequest = index.getKey([projectId, raNumber]);
            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    const delRequest = store.delete(getRequest.result);
                    delRequest.onsuccess = () => resolve();
                    delRequest.onerror = () => reject(delRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // ── COP Operations ───────────────────────────────────────────────────────
    async saveCOP(cop: COPRecord): Promise<void> {
        const store = await this.getStore('cops', 'readwrite');
        return new Promise((resolve, reject) => {
            const index = store.index('project_ra');
            const getRequest = index.get([cop.projectId, cop.raNumber]);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                const request = store.put(existing ? { ...existing, ...cop } : cop);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getCOP(projectId: string, raNumber: number): Promise<COPRecord | null> {
        const store = await this.getStore('cops');
        const index = store.index('project_ra');
        return new Promise((resolve, reject) => {
            const request = index.get([projectId, raNumber]);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllCOPs(projectId: string): Promise<COPRecord[]> {
        const store = await this.getStore('cops');
        const index = store.index('projectId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(projectId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCOP(projectId: string, raNumber: number): Promise<void> {
        const store = await this.getStore('cops', 'readwrite');
        const index = store.index('project_ra');
        return new Promise((resolve, reject) => {
            const getRequest = index.getKey([projectId, raNumber]);
            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    const delRequest = store.delete(getRequest.result);
                    delRequest.onsuccess = () => resolve();
                    delRequest.onerror = () => reject(delRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    async getSetting(key: string): Promise<any> {
        const store = await this.getStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    async setSetting(key: string, value: any): Promise<void> {
        const store = await this.getStore('settings', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new DBService();
