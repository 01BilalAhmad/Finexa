import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { StorageService } from '@/services/storage';
import { apiGetShops, apiMobileSync } from '@/services/api';
import { Shop } from '@/types';
import { getDayName } from '@/utils/format';

interface ShopsContextType {
  shops: Shop[];
  isLoading: boolean;
  visitedShops: Set<string>;
  recoverySubmitted: Set<string>;
  todayTotal: number;
  loadShops: (companyId: string, userId?: string, allRoutesAccess?: boolean) => Promise<void>;
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

  const loadShops = useCallback(async (companyId: string, userId?: string, allRoutesAccess?: boolean) => {
    setIsLoading(true);
    try {
      let fetched: Shop[];
      const todayDay = getDayName();

      // Determine routeDay filter: if allRoutesAccess is ON, no routeDay filter (show all shops)
      // If OFF, only today's route shops
      const routeDay = allRoutesAccess ? undefined : todayDay;

      if (allRoutesAccess && userId) {
        // All routes mode: use mobile sync to get all shops for this orderbooker
        try {
          const syncData = await apiMobileSync(userId);
          fetched = syncData.shops;
        } catch {
          // Fallback to shops-only API
          fetched = await apiGetShops(companyId, { orderbookerId: userId });
        }
      } else {
        // Route-wise mode: only today's shops using routeDay filter
        fetched = await apiGetShops(companyId, { orderbookerId: userId, routeDay });
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
