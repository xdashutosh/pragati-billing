'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, ProjectRecord } from './db';
import {
  RABillData, COPData, BuildingMilestoneEntry, InfraMilestoneEntry, BOQEntry,
  loadRA, saveRA, deleteRA, getSavedRANumbers, loadAllCOPs,
} from '@/lib/raStore';
import { BOQSheet, BOQItem, createEmptyProject } from '@/data/projectData';
import { VendorConfig } from '@/data/vendorRegistry';

interface VendorContextType extends VendorConfig {
  activeProject?: ProjectRecord;
  allProjects: ProjectRecord[];
  allRAs: RABillData[];
  allCOPs: COPData[];
  approvedRANumbers: Set<number>;
  isLoading: boolean;
  switchProject: (id: string) => Promise<void>;
  createProject: (name: string) => Promise<string>;
  updateProject: (project: ProjectRecord) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  getRATotals: (raNum: number) => {
    bldg: { prev: number; this: number; cum: number };
    infra: { prev: number; this: number; cum: number };
    boqs: Record<string, { prev: number; this: number; cum: number }>;
  };
  getRATotalsRaw: (raNum: number) => {
    bldg: { prev: number; this: number; cum: number };
    infra: { prev: number; this: number; cum: number };
    boqs: Record<string, { prev: number; this: number; cum: number }>;
  };
  getMilestonesByRA: (raNum: number) => any[];
  getInfraMilestonesByRA: (raNum: number) => any[];
  getBOQMilestonesByRA: (raNum: number, boqId: string) => any[];
  refreshRAs: () => Promise<void>;
  boqs: BOQSheet[];
  tabs: BOQSheet[];
  migrateLegacyToBOQs: (project: any) => BOQSheet[];
  getCombinedBoqState: (raNum: number) => Record<string, any[]>;
}

const VendorContext = createContext<VendorContextType | null>(null);

export const VendorProvider = ({ children }: { children: React.ReactNode }) => {
  const [allProjects, setAllProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [allRAs, setAllRAs] = useState<RABillData[]>([]);
  const [allCOPs, setAllCOPs] = useState<COPData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set of RA numbers that have an approved COP
  const approvedRANumbers = React.useMemo(() => {
    const s = new Set<number>();
    allCOPs.forEach(c => { if (c.status === 'approved') s.add(Number(c.raNumber)); });
    return s;
  }, [allCOPs]);

  const refreshProjects = useCallback(async () => {
    const projects = await db.getAllProjects();
    setAllProjects(projects);

    const lastId = await db.getSetting('activeProjectId');
    if (lastId) {
      const p = projects.find(x => x.id === lastId);
      if (p) setActiveProject(p);
      else if (projects.length > 0) setActiveProject(projects[0]);
    } else if (projects.length > 0) {
      setActiveProject(projects[0]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // migrateFromLocalStorage(['lpw', 'kg', 'mll', 'tvs']); // Removed as per new raStore
        await refreshProjects();
      } catch (e) {
        console.error('Failed to init VendorContext:', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshProjects]);

  const refreshRAs = useCallback(async () => {
    if (activeProject?.id) {
      const raNumbers = await getSavedRANumbers(activeProject.id);
      const ras = await Promise.all(raNumbers.map(raNum => loadRA(raNum, activeProject.id)));
      setAllRAs(ras.filter(Boolean) as RABillData[]);
      const cops = await loadAllCOPs(activeProject.id);
      setAllCOPs(cops);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    refreshRAs();
  }, [refreshRAs]);

  const switchProject = async (id: string) => {
    const p = allProjects.find(x => x.id === id);
    if (p) {
      setActiveProject(p);
      await db.setSetting('activeProjectId', id);
    }
  };

  const createProject = async (name: string) => {
    const newProject = createEmptyProject(name);
    await db.saveProject(newProject);
    await refreshProjects();
    await switchProject(newProject.id);
    return newProject.id;
  };

  const updateProject = async (project: ProjectRecord) => {
    await db.saveProject(project);
    await refreshProjects();
    if (activeProject?.id === project.id) {
      setActiveProject(project);
    }
  };

  const deleteProject = async (id: string) => {
    await db.deleteProject(id);
    await refreshProjects();
    if (activeProject?.id === id) {
      setActiveProject(allProjects.length > 0 ? allProjects[0] : null);
    }
  };

  const migrateLegacyToBOQs = useCallback((project: any): BOQSheet[] => {
    if (!project) return [];
    const boqs: BOQSheet[] = [...(project.boqs || [])];
    if (boqs.length > 0) return boqs;

    const infraM = project.milestoneInfra?.milestones || [];
    const bldgM = project.milestonesBldg?.milestones || [];

    if (infraM.length > 0) {
      boqs.push({
        id: 'boq-infra-legacy',
        name: 'Infra',
        createdAt: new Date().toISOString(),
        items: infraM.map((m: any, i: number) => ({
          sno: m.sno || (i + 1).toString(),
          section: m.category || '',
          category: '',
          description: m.description || '',
          uom: m.uom || 'Nos',
          qty: m.qty || 0,
          rate: m.rate || 0,
          amount: m.amount || 0,
        })),
      });
    }

    if (bldgM.length > 0) {
      boqs.push({
        id: 'boq-bldg-legacy',
        name: 'Building',
        createdAt: new Date().toISOString(),
        items: bldgM.map((m: any, i: number) => ({
          sno: m.sno || (i + 1).toString(),
          section: m.section || m.category || '',
          category: m.category || '',
          description: m.description || '',
          uom: m.uom || 'Nos',
          qty: m.qty || 0,
          rate: m.rate || 0,
          amount: m.amount || 0,
        })),
      });
    }
    return boqs;
  }, []);

  const getRATotals = useCallback((raNum: number) => {
    const base = activeProject?.billingSummary?.totals || { orderAmount: 0, prevBillAmount: 0, thisBillAmount: 0, cumulativeAmount: 0 };
    const currentBaseRA = activeProject?.currentRA ?? 0;

    // Default to 0
    let prevB = 0, prevI = 0;
    let thisB = 0, thisI = 0;

    // If we are at or after the baseline, include baseline carry-overs
    if (activeProject?.currentRA && activeProject.currentRA > 0) {
      const cbra = activeProject.currentRA;
      if (raNum === cbra) {
        prevB = (base.prevBillAmount || 0) * 0.55;
        prevI = (base.prevBillAmount || 0) * 0.45;
        thisB = (base.thisBillAmount || 0);
      } else if (raNum > cbra) {
        prevB = ((base.prevBillAmount || 0) * 0.55) + (base.thisBillAmount || 0);
        prevI = (base.prevBillAmount || 0) * 0.45;
      }
    }

    // Add up all saved RAs between the project starting point and the target RA
    // Only count RAs whose COP is approved
    allRAs.forEach(r => {
      if (!approvedRANumbers.has(r.raNumber)) return; // skip unapproved
      if (r.raNumber < raNum) {
        if (r.raNumber > currentBaseRA) {
          prevB += (r.buildingTotal || 0);
          prevI += (r.infraTotal || 0);
        }
      }
      if (r.raNumber === raNum) {
        thisB = (r.buildingTotal || 0);
        thisI = (r.infraTotal || 0);
      }
    });

    const boqBreakdown: Record<string, { prev: number; this: number; cum: number }> = {};
    const boqList = activeProject ? migrateLegacyToBOQs(activeProject) : [];
    const customBoqIds = boqList.filter(b => b.id !== 'boq-infra-legacy' && b.id !== 'boq-bldg-legacy').map(b => b.id);

    customBoqIds.forEach(id => {
      let p = 0;
      let t = 0;
      allRAs.forEach(r => {
        if (!approvedRANumbers.has(r.raNumber)) return; // skip unapproved
        const boqSum = Object.values(r.boqEntries?.[id] || {}).reduce((s, ent) => s + (ent.amt || 0), 0);
        if (r.raNumber < raNum) p += boqSum;
        if (r.raNumber === raNum) t = boqSum;
      });
      boqBreakdown[id] = { prev: p, this: t, cum: p + t };
    });

    return {
      bldg: { prev: prevB, this: thisB, cum: prevB + thisB },
      infra: { prev: prevI, this: thisI, cum: prevI + thisI },
      boqs: boqBreakdown,
    };
  }, [activeProject, allRAs, approvedRANumbers]);

  // Unfiltered version — includes ALL saved RAs regardless of COP status.
  // Used by COP page (needs to see RA values before they're approved) and RA entry page.
  const getRATotalsRaw = useCallback((raNum: number) => {
    const base = activeProject?.billingSummary?.totals || { orderAmount: 0, prevBillAmount: 0, thisBillAmount: 0, cumulativeAmount: 0 };
    const currentBaseRA = activeProject?.currentRA ?? 0;

    let prevB = 0, prevI = 0;
    let thisB = 0, thisI = 0;

    if (activeProject?.currentRA && activeProject.currentRA > 0) {
      const cbra = activeProject.currentRA;
      if (raNum === cbra) {
        prevB = (base.prevBillAmount || 0) * 0.55;
        prevI = (base.prevBillAmount || 0) * 0.45;
        thisB = (base.thisBillAmount || 0);
      } else if (raNum > cbra) {
        prevB = ((base.prevBillAmount || 0) * 0.55) + (base.thisBillAmount || 0);
        prevI = (base.prevBillAmount || 0) * 0.45;
      }
    }

    allRAs.forEach(r => {
      if (r.raNumber < raNum) {
        if (r.raNumber > currentBaseRA) {
          prevB += (r.buildingTotal || 0);
          prevI += (r.infraTotal || 0);
        }
      }
      if (r.raNumber === raNum) {
        thisB = (r.buildingTotal || 0);
        thisI = (r.infraTotal || 0);
      }
    });

    const boqBreakdown: Record<string, { prev: number; this: number; cum: number }> = {};
    const boqList = activeProject ? migrateLegacyToBOQs(activeProject) : [];
    const customBoqIds = boqList.filter(b => b.id !== 'boq-infra-legacy' && b.id !== 'boq-bldg-legacy').map(b => b.id);

    customBoqIds.forEach(id => {
      let p = 0;
      let t = 0;
      allRAs.forEach(r => {
        const boqSum = Object.values(r.boqEntries?.[id] || {}).reduce((s, ent) => s + (ent.amt || 0), 0);
        if (r.raNumber < raNum) p += boqSum;
        if (r.raNumber === raNum) t = boqSum;
      });
      boqBreakdown[id] = { prev: p, this: t, cum: p + t };
    });

    return {
      bldg: { prev: prevB, this: thisB, cum: prevB + thisB },
      infra: { prev: prevI, this: thisI, cum: prevI + thisI },
      boqs: boqBreakdown,
    };
  }, [activeProject, allRAs]);

  const getMilestonesByRA = useCallback((raNum: number) => {
    const bldgBaseline = activeProject?.milestonesBldg?.milestones || [];
    return bldgBaseline.map((m: any, idx: number) => {
      const history = allRAs.reduce((acc: any, ra: RABillData) => {
        if (!approvedRANumbers.has(ra.raNumber)) return acc; // skip unapproved
        if (ra.raNumber <= raNum) {
          const entry = ra.building[idx];
          if (entry) {
            Object.keys(entry).forEach(blockKey => {
              if (!acc[blockKey]) acc[blockKey] = { scope: 0, cumAmt: 0, cumPct: 0 };
              acc[blockKey].cumAmt += (entry[blockKey].amt || 0);
            });
          }
        }
        return acc;
      }, {});
      const myBlock = m.category;
      const myCumAmt = history[myBlock]?.cumAmt || 0;
      const myCumPct = m.amount > 0 ? (myCumAmt / m.amount) : 0;
      return {
        ...m,
        [myBlock]: {
          scope: m.amount,
          cumAmt: myCumAmt,
          cumPct: myCumPct
        }
      };
    });
  }, [activeProject, allRAs, approvedRANumbers]);

  const getInfraMilestonesByRA = useCallback((raNum: number) => {
    const infraBaseline = activeProject?.milestoneInfra?.milestones || [];
    return infraBaseline.map((m: any, idx: number) => {
      const cumAmt = allRAs.reduce((sum: number, ra: RABillData) => {
        if (!approvedRANumbers.has(ra.raNumber)) return sum; // skip unapproved
        if (ra.raNumber < raNum) {
          return sum + (ra.infra[idx]?.amt || 0);
        }
        return sum;
      }, 0);
      return {
        ...m,
        scopeAmount: m.amount,
        cumAmt,
        cumPct: m.amount > 0 ? (cumAmt / m.amount) : 0,
      };
    });
  }, [activeProject, allRAs, approvedRANumbers]);

  const getBOQMilestonesByRA = useCallback((raNum: number, boqId: string) => {
    const boq = activeProject?.boqs?.find(b => b.id === boqId);
    if (!boq) return [];

    return boq.items.map((item: any, idx: number) => {
      const cumAmt = allRAs.reduce((sum: number, ra: RABillData) => {
        if (!approvedRANumbers.has(ra.raNumber)) return sum; // skip unapproved
        if (ra.raNumber < raNum) {
          return sum + (ra.boqEntries?.[boqId]?.[idx]?.amt || 0);
        }
        return sum;
      }, 0);
      return {
        ...item,
        cumAmt,
        cumPct: item.amount > 0 ? (cumAmt / item.amount) : 0,
      };
    });
  }, [activeProject, allRAs, approvedRANumbers]);

  // Combine items across historic RAs for dashboard
  const getCombinedBoqState = useCallback((raNum: number) => {
    const state: Record<string, any[]> = {};
    const boqList = activeProject ? migrateLegacyToBOQs(activeProject) : [];
    boqList.forEach(boq => {
      state[boq.id] = getBOQMilestonesByRA(raNum, boq.id);
    });
    return state;
  }, [activeProject, getBOQMilestonesByRA, migrateLegacyToBOQs]);

  // Derive billing data from baseline + RA history (latest total)
  const billingMilestones = React.useMemo(() => getMilestonesByRA(1000000), [getMilestonesByRA]);
  const infraBillingMilestones = React.useMemo(() => getInfraMilestonesByRA(1000000), [getInfraMilestonesByRA]);

  // Map ProjectRecord to VendorConfig interface for backward compatibility
  const value: VendorContextType = {
    ...(activeProject || ({} as any)),
    activeProject: activeProject || undefined,
    id: activeProject?.id || '',
    shortName: activeProject?.name || 'No Project',
    projectName: activeProject?.name || '',
    allProjects,
    allRAs,
    allCOPs,
    approvedRANumbers,
    isLoading,
    switchProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
    refreshRAs,
    getRATotals,
    getRATotalsRaw,
    getMilestonesByRA,
    getInfraMilestonesByRA,
    getBOQMilestonesByRA,
    abstractSummary: activeProject?.abstractSummary || { projectName: '', totalBasicCost: 0, costPerSqft: 0, items: [] },
    buildingBlocks: activeProject?.buildingCostSheet?.blocks || [],
    infraSections: activeProject?.infraCostSheet?.sections || [],
    billingSummaryItems: activeProject?.billingSummary?.items || [],
    billingSummaryTotals: activeProject?.billingSummary?.totals || { orderAmount: 0, prevBillAmount: 0, thisBillAmount: 0, cumulativeAmount: 0 },
    billingMilestones,
    infraBillingMilestones,
    infraRAMilestones: activeProject?.infraRA?.milestones || [],
    infraRATotal: activeProject?.infraRA?.totalInfraScope || 0,
    infraMilestones: activeProject?.milestoneInfra?.milestones || [],
    infraMilestoneTotal: activeProject?.milestoneInfra?.totalInfraAmount || 0,
    blockTotals: activeProject?.milestonesBldg?.blockTotals || {},
    buildingMilestones: activeProject?.milestonesBldg?.milestones || [],
    defaultMaterialRows: activeProject?.defaultMaterialRows || [],
    defaultHoldItems: activeProject?.defaultHoldItems || [],
    boqs: activeProject ? migrateLegacyToBOQs(activeProject) : [],
    tabs: activeProject ? migrateLegacyToBOQs(activeProject) : [],
    migrateLegacyToBOQs,
    getCombinedBoqState,
  };

  return (
    <VendorContext.Provider value={value}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (!context) throw new Error('useVendor must be used within VendorProvider');
  return context;
};
