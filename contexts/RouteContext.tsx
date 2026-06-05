import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { StorageService } from '@/services/storage';
import { apiStartRoute, apiEndRoute, apiGetActiveRoute } from '@/services/api';
import {
  startLocationTracking,
  stopLocationTracking,
  getCurrentLocation,
  flushWaypointQueue,
  resumeTrackingIfNeeded,
} from '@/services/locationTracking';
import { ActiveRoute, RouteStop } from '@/types';
import { STALE_ROUTE_HOURS } from '@/constants/config';

interface RouteContextType {
  activeRoute: ActiveRoute | null;
  isRouteActive: boolean;
  elapsedSeconds: number;
  routeEnabled: boolean;
  startRoute: (orderbookerId: string, companyId: string, lat?: number, lng?: number) => Promise<void>;
  endRoute: (lat?: number, lng?: number) => Promise<ActiveRoute | null>;
  addStop: (stop: RouteStop) => Promise<void>;
  isLoading: boolean;
}

export const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [routeEnabled] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    restoreRoute();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (activeRoute && !activeRoute.isEnded) {
      startTimer(activeRoute.startTime);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsedSeconds(0);
    }
  }, [activeRoute?.id, activeRoute?.isEnded]);

  function startTimer(startTime: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setElapsedSeconds(diff);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }

  async function restoreRoute() {
    // First try to restore from local storage
    const route = await StorageService.getActiveRoute();
    if (route && !route.isEnded) {
      const hoursSinceStart = (Date.now() - new Date(route.startTime).getTime()) / 3600000;
      if (hoursSinceStart > STALE_ROUTE_HOURS) {
        // Route is stale — auto-end it
        await endRoute(route.startLat, route.startLng);
        return;
      }
      setActiveRoute(route);

      // Resume GPS tracking if there's an active session
      if (!route.isLocal) {
        await resumeTrackingIfNeeded();
      }
    }
  }

  const startRoute = useCallback(async (orderbookerId: string, companyId: string, lat?: number, lng?: number) => {
    setIsLoading(true);
    try {
      let routeId = 'local_' + Date.now();
      let isLocal = false;

      try {
        const res = await apiStartRoute({ orderbookerId, companyId, startLat: lat, startLng: lng });
        if (res.id) {
          routeId = res.id;
          isLocal = false;
        }
      } catch (err) {
        // API failed — use local ID, will sync later
        console.warn('[Route] API start failed, using local ID:', err);
        isLocal = true;
      }

      const route: ActiveRoute = {
        id: routeId,
        isLocal,
        startTime: new Date().toISOString(),
        startLat: lat,
        startLng: lng,
        orderbookerId,
        companyId,
        stops: [],
        waypoints: [],
      };

      setActiveRoute(route);
      await StorageService.saveActiveRoute(route);

      // Start GPS tracking (continuous location updates)
      if (!isLocal) {
        await startLocationTracking(routeId, orderbookerId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endRoute = useCallback(async (lat?: number, lng?: number): Promise<ActiveRoute | null> => {
    if (!activeRoute) return null;
    setIsLoading(true);
    try {
      // Stop GPS tracking first
      await stopLocationTracking();

      // Flush any remaining waypoints
      if (!activeRoute.isLocal) {
        try {
          await flushWaypointQueue(activeRoute.id);
        } catch { /* continue */ }

        // End route on server
        try {
          await apiEndRoute(activeRoute.id, { endLat: lat, endLng: lng });
        } catch { /* continue even if API fails */ }
      }

      const ended: ActiveRoute = {
        ...activeRoute,
        isEnded: true,
        endTime: new Date().toISOString(),
        endLat: lat,
        endLng: lng,
      };

      setActiveRoute(ended);
      await StorageService.saveActiveRoute(ended);
      return ended;
    } finally {
      setIsLoading(false);
    }
  }, [activeRoute]);

  const addStop = useCallback(async (stop: RouteStop) => {
    if (!activeRoute) return;
    const updated = {
      ...activeRoute,
      stops: [...activeRoute.stops, stop],
    };
    setActiveRoute(updated);
    await StorageService.saveActiveRoute(updated);
  }, [activeRoute]);

  return (
    <RouteContext.Provider value={{
      activeRoute, isRouteActive: !!(activeRoute && !activeRoute.isEnded),
      elapsedSeconds, routeEnabled, startRoute, endRoute, addStop, isLoading,
    }}>
      {children}
    </RouteContext.Provider>
  );
}
