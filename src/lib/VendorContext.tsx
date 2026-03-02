'use client';

import { createContext, useContext } from 'react';
import { VendorConfig } from '@/data/vendorRegistry';
import { getVendor } from '@/data/vendorRegistry';

const VendorContext = createContext<VendorConfig>(getVendor('lpw'));

export function VendorProvider({ vendor, children }: { vendor: VendorConfig; children: React.ReactNode }) {
  return <VendorContext.Provider value={vendor}>{children}</VendorContext.Provider>;
}

export function useVendor(): VendorConfig {
  return useContext(VendorContext);
}
