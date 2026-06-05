import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { StorageService } from '@/services/storage';
import { apiGetShops, apiMobileSync } from '@/services/api';
import { Shop } from '@/types';

interface ShopsContextType {
  shops: Shop[];
  isLoading: boolean;
  visitedShops: Set<string>;
  recoverySubmitted: Set<string>;
  todayTotal: number;
  loadShops: (companyId: string, userId?: string) => Promise<void>;
  markVisited: (shopId: string) => Promise<void>;
  unmarkVisited: (shopId: string) => Promise<void>;
  markRecoverySubmitted: (key: string) => Promise<void>;
  unmarkRecoverySubmitted: (key: string) => Promise<void>;
  addToTodayTotal: (amount: number) => void;
  subtractFromTodayTotal: (amount: number) => void;
  updateShopPhone: (shopId: string, phone: string) => void;
  updateShopBalance: (shopId: string, newBalance: number) => void;
  restoreShopState: () => Promise<void>;
}

export const ShopsContext = createContext<ShopsContextType | undefined>(undefined);

export function ShopsProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visitedShops, setVisitedShops] = useState<Set<string>>(new Set());
  const [recoverySubmitted, setRecoverySubmitted] = useState<Set<string>>(new Set());
  const [todayTotal, setTodayTotal] = useState(0);

  const restoreShopState = useCallback(async () => {
    const [cachedShops, visited, submitted] = await Promise.all([
      StorageService.getShops(),
      StorageService.getVisitedShops(),
      StorageService.getRecoverySubmitted(),
    ]);
    if (cachedShops.length) setShops(cachedShops);
    setVisitedShops(new Set(visited));
    setRecoverySubmitted(new Set(submitted));
  }, []);

  const loadShops = useCallback(async (companyId: string, userId?: string) => {
    setIsLoading(true);
    try {
      let fetched: Shop[];

      // Try mobile sync first (returns more data including transactions)
      if (userId) {
        try {
          const syncData = await apiMobileSync(userId);
          fetched = syncData.shops;
        } catch {
          // Fallback to shops-only API
          fetched = await apiGetShops(companyId);
        }
      } else {
        fetched = await apiGetShops(companyId);
      }

      setShops(fetched);
      await StorageService.saveShops(fetched);
    } catch {
      // Offline: load from cache
      const cached = await StorageService.getShops();
      if (cached.length) setShops(cached);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markVisited = useCallback(async (shopId: string) => {
    setVisitedShops(prev => new Set([...prev, shopId]));
    await StorageService.addVisitedShop(shopId);
  }, []);

  const unmarkVisited = useCallback(async (shopId: string) => {
    setVisitedShops(prev => { const s = new Set(prev); s.delete(shopId); return s; });
    await StorageService.removeVisitedShop(shopId);
  }, []);

  const markRecoverySubmitted = useCallback(async (key: string) => {
    setRecoverySubmitted(prev => new Set([...prev, key]));
    await StorageService.addRecoverySubmitted(key);
  }, []);

  const unmarkRecoverySubmitted = useCallback(async (key: string) => {
    setRecoverySubmitted(prev => { const s = new Set(prev); s.delete(key); return s; });
    await StorageService.removeRecoverySubmitted(key);
  }, []);

  const addToTodayTotal = useCallback((amount: number) => {
    setTodayTotal(prev => prev + amount);
  }, []);

  const subtractFromTodayTotal = useCallback((amount: number) => {
    setTodayTotal(prev => Math.max(0, prev - amount));
  }, []);

  const updateShopPhone = useCallback((shopId: string, phone: string) => {
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, phone } : s));
  }, []);

  const updateShopBalance = useCallback((shopId: string, newBalance: number) => {
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, balance: newBalance } : s));
  }, []);

  return (
    <ShopsContext.Provider value={{
      shops, isLoading, visitedShops, recoverySubmitted, todayTotal,
      loadShops, markVisited, unmarkVisited, markRecoverySubmitted,
      unmarkRecoverySubmitted, addToTodayTotal, subtractFromTodayTotal,
      updateShopPhone, updateShopBalance, restoreShopState,
    }}>
      {children}
    </ShopsContext.Provider>
  );
}
