import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { StorageService } from '@/services/storage';
import { apiSubmitRecovery, apiRecordVisit, apiMobileSyncPush, apiUpdateShopPhone } from '@/services/api';
import { GPSTracker } from '@/services/gps-tracker';
import { OfflineRecovery } from '@/types';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  pendingWaypoints: number;
  syncStatus: SyncStatus;
  addToQueue: (recovery: OfflineRecovery) => Promise<void>;
  removeFromQueue: (localId: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingWaypoints, setPendingWaypoints] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncLockRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !isOnline;
      setIsOnline(online);
      if (online) {
        // Just came back online — trigger sync
        triggerSync();
        // Also upload pending waypoints from GPS tracker
        GPSTracker.uploadPendingWaypoints();
      }
    });

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        NetInfo.fetch().then(s => {
          if (s.isConnected) triggerSync();
        });
        refreshPendingCount();
      }
    });

    refreshPendingCount();

    // Refresh waypoint count periodically
    const wpInterval = setInterval(async () => {
      const count = await StorageService.getWaypointCount();
      setPendingWaypoints(count);
    }, 15000);

    return () => {
      unsubNet();
      appStateSub.remove();
      clearInterval(wpInterval);
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const queue = await StorageService.getOfflineQueue();
    setPendingCount(queue.length);
    const wpCount = await StorageService.getWaypointCount();
    setPendingWaypoints(wpCount);
  }, []);

  const addToQueue = useCallback(async (recovery: OfflineRecovery) => {
    await StorageService.addOfflineRecovery(recovery);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const removeFromQueue = useCallback(async (localId: string) => {
    await StorageService.removeOfflineRecovery(localId);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const triggerSync = useCallback(async () => {
    if (syncLockRef.current) return;

    // Clean expired items first
    await StorageService.cleanExpiredOfflineQueue();

    const queue = await StorageService.getOfflineQueue();
    const phoneUpdates = await StorageService.getOfflinePhoneUpdates();
    if (queue.length === 0 && phoneUpdates.length === 0) return;

    syncLockRef.current = true;
    setSyncStatus('syncing');
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => { syncLockRef.current = false; }, 30000);

    try {
      let hasError = false;

      // 1. Sync offline recoveries using mobile sync push API
      if (queue.length > 0) {
        try {
          const transactions = queue.map(recovery => ({
            localId: recovery.localId,
            shopId: recovery.shopId,
            type: 'recovery' as const,
            amount: recovery.amount,
            createdBy: recovery.orderbookerId,
            description: recovery.description,
            companyId: recovery.companyId,
            idempotencyKey: recovery.localId,
            gpsLat: recovery.gpsLat,
            gpsLng: recovery.gpsLng,
          }));

          const result = await apiMobileSyncPush(transactions);

          // Remove successfully synced items
          if (result.results) {
            for (const r of result.results) {
              if (r.success) {
                await StorageService.removeOfflineRecovery(r.localId);
              }
            }
          }

          // Remove permanently failed items
          if (result.errors) {
            for (const e of result.errors) {
              const msg = (e.error || '').toLowerCase();
              const permanent = msg.includes('exceeds') || msg.includes('not found') ||
                msg.includes('minimum') || msg.includes('maximum single');
              if (permanent) {
                await StorageService.removeOfflineRecovery(e.localId);
              } else {
                hasError = true;
              }
            }
          }

          // Also record GPS visits for synced recoveries
          for (const recovery of queue) {
            if (recovery.gpsLat && recovery.gpsLng) {
              try {
                await apiRecordVisit(recovery.shopId, {
                  orderbookerId: recovery.orderbookerId,
                  lat: recovery.gpsLat,
                  lng: recovery.gpsLng,
                  companyId: recovery.companyId,
                });
              } catch { /* optional */ }
            }
          }
        } catch (err) {
          console.warn('[Offline] Recovery sync failed, trying individual API:', err);
          // Fallback: try individual API calls
          for (const recovery of queue) {
            try {
              await apiSubmitRecovery({
                shopId: recovery.shopId,
                amount: recovery.amount,
                orderbookerId: recovery.orderbookerId,
                gpsLat: recovery.gpsLat,
                gpsLng: recovery.gpsLng,
                description: recovery.description,
                companyId: recovery.companyId,
                idempotencyKey: recovery.localId,
              });
              if (recovery.gpsLat && recovery.gpsLng) {
                try {
                  await apiRecordVisit(recovery.shopId, {
                    orderbookerId: recovery.orderbookerId,
                    lat: recovery.gpsLat,
                    lng: recovery.gpsLng,
                    companyId: recovery.companyId,
                  });
                } catch { /* optional */ }
              }
              await StorageService.removeOfflineRecovery(recovery.localId);
            } catch (err2: any) {
              const msg = err2?.message?.toLowerCase() || '';
              const permanent = msg.includes('exceeds') || msg.includes('not found') ||
                msg.includes('minimum') || msg.includes('maximum single');
              if (permanent) await StorageService.removeOfflineRecovery(recovery.localId);
              else hasError = true;
            }
          }
        }
      }

      // 2. Sync offline phone updates
      for (const update of phoneUpdates) {
        try {
          await apiUpdateShopPhone(update.shopId, update.phone);
          await StorageService.removeOfflinePhoneUpdate(update.shopId);
        } catch { /* retry next time */ }
      }

      // 3. Upload pending GPS waypoints
      try {
        await GPSTracker.uploadPendingWaypoints();
      } catch { /* ignore */ }

      await refreshPendingCount();
      setSyncStatus(hasError ? 'error' : 'success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      syncLockRef.current = false;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    }
  }, [refreshPendingCount]);

  return (
    <OfflineContext.Provider value={{
      isOnline, pendingCount, pendingWaypoints, syncStatus,
      addToQueue, removeFromQueue, triggerSync, refreshPendingCount,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}
