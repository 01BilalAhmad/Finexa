import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { StorageService } from './storage';
import { apiSendLocation, apiSendLocationsBatch, setAuthToken } from './api';
import { API_BASE } from '@/constants/config';
import NetInfo from '@react-native-community/netinfo';

// ─── Constants ────────────────────────────────────────────────────────────────
const LOCATION_TASK_NAME = 'finexa-background-location';
const GPS_INTERVAL_MS = 30000;        // 30 seconds — GPS capture interval
const BATCH_UPLOAD_INTERVAL_MS = 60000; // 60 seconds — batch upload interval
const MAX_BATCH_SIZE = 500;            // Max locations per batch API call

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GPSWaypoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  altitude: number | null;
  timestamp: string;   // ISO string of when the GPS was recorded
  isOffline: boolean;
}

// ─── Background Location Task ─────────────────────────────────────────────────
// This runs even when the app is in the background
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[GPS] Background location error:', error);
    return;
  }
  if (!data) return;

  const { coords } = (data as any).locations?.[0] || data as any;
  if (!coords) return;

  const waypoint: GPSWaypoint = {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy || 0,
    speed: coords.speed || null,
    altitude: coords.altitude || null,
    timestamp: new Date().toISOString(),
    isOffline: false, // Will be determined at upload time
  };

  // Store locally regardless of network state
  await StorageService.addWaypoint(waypoint);
});

// ─── GPS Tracker Service ──────────────────────────────────────────────────────
class GPSTrackerService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private batchInterval: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private isTracking = false;
  private onWaypointCallback: ((wp: GPSWaypoint) => void) | null = null;
  private onProximityCallback: ((data: any) => void) | null = null;

  // ─── Start Tracking ───────────────────────────────────────────────────────
  async startTracking(sessionId: string): Promise<boolean> {
    if (this.isTracking) {
      console.log('[GPS] Already tracking');
      return true;
    }

    this.sessionId = sessionId;

    try {
      // Request permissions
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('[GPS] Foreground permission denied');
        return false;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      const hasBgPermission = bgStatus === 'granted';

      // Start foreground location watching (every 30 seconds)
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: GPS_INTERVAL_MS,
          distanceInterval: 10, // Also trigger if moved 10+ meters
        },
        async (location) => {
          const waypoint: GPSWaypoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            speed: location.coords.speed || null,
            altitude: location.coords.altitude || null,
            timestamp: new Date().toISOString(),
            isOffline: false,
          };

          // Store locally
          await StorageService.addWaypoint(waypoint);

          // Notify UI
          if (this.onWaypointCallback) {
            this.onWaypointCallback(waypoint);
          }

          // Try to send to server immediately if online
          const netState = await NetInfo.fetch();
          if (netState.isConnected && this.sessionId) {
            try {
              const result = await apiSendLocation(this.sessionId, {
                lat: waypoint.lat,
                lng: waypoint.lng,
                accuracy: waypoint.accuracy,
                speed: waypoint.speed || undefined,
                altitude: waypoint.altitude || undefined,
                isOffline: false,
              });
              // Check for shop proximity detection
              if (result?.shopProximity && this.onProximityCallback) {
                this.onProximityCallback(result.shopProximity);
              }
            } catch (err) {
              console.warn('[GPS] Failed to send location:', err);
              // Mark as offline for later batch upload
              waypoint.isOffline = true;
            }
          } else {
            waypoint.isOffline = true;
          }
        }
      );

      // Start background location task if permission granted
      if (hasBgPermission) {
        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: GPS_INTERVAL_MS,
            distanceInterval: 15,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Finexa Route Tracking',
              notificationBody: 'GPS is being tracked for your route',
            },
          });
          console.log('[GPS] Background tracking started');
        } catch (err) {
          console.warn('[GPS] Background task failed:', err);
        }
      }

      // Start batch upload interval
      this.batchInterval = setInterval(() => this.uploadPendingWaypoints(), BATCH_UPLOAD_INTERVAL_MS);

      this.isTracking = true;
      console.log('[GPS] Tracking started for session:', sessionId);
      return true;
    } catch (err) {
      console.error('[GPS] Failed to start tracking:', err);
      return false;
    }
  }

  // ─── Stop Tracking — ROBUST cleanup ────────────────────────────────────────
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      console.log('[GPS] Not tracking, skip stop');
      return;
    }

    console.log('[GPS] stopTracking called');

    // Stop foreground watch (most critical)
    try {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
    } catch (err) {
      console.warn('[GPS] Failed to remove watch subscription:', err);
      this.watchSubscription = null;
    }

    // Stop background task
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[GPS] Background location task stopped');
      }
    } catch (err) {
      console.warn('[GPS] Failed to stop background task:', err);
    }

    // Stop batch interval
    try {
      if (this.batchInterval) {
        clearInterval(this.batchInterval);
        this.batchInterval = null;
      }
    } catch (err) {
      console.warn('[GPS] Failed to clear batch interval:', err);
    }

    // Upload any remaining waypoints (best effort)
    try {
      await this.uploadPendingWaypoints();
    } catch (err) {
      console.warn('[GPS] Failed to upload remaining waypoints:', err);
    }

    this.isTracking = false;
    this.sessionId = null;
    console.log('[GPS] Tracking stopped — all resources cleaned up');
  }

  // ─── Upload Pending Waypoints ────────────────────────────────────────────
  async uploadPendingWaypoints(): Promise<number> {
    if (!this.sessionId) return 0;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return 0;

      const waypoints = await StorageService.getWaypoints();
      if (waypoints.length === 0) return 0;

      // Split into batches of MAX_BATCH_SIZE
      let uploaded = 0;
      for (let i = 0; i < waypoints.length; i += MAX_BATCH_SIZE) {
        const batch = waypoints.slice(i, i + MAX_BATCH_SIZE);
        const locations = batch.map(wp => ({
          lat: wp.lat,
          lng: wp.lng,
          accuracy: wp.accuracy,
          speed: wp.speed || undefined,
          altitude: wp.altitude || undefined,
          isOffline: wp.isOffline,
          recordedAt: wp.timestamp,
        }));

        try {
          const result = await apiSendLocationsBatch(this.sessionId, locations);
          uploaded += batch.length;

          // Notify about proximity if detected
          if (result?.shopProximity?.length > 0 && this.onProximityCallback) {
            result.shopProximity.forEach((p: any) => this.onProximityCallback!(p));
          }
        } catch (err) {
          console.warn('[GPS] Batch upload failed:', err);
          break; // Stop trying more batches
        }
      }

      // Clear uploaded waypoints
      if (uploaded > 0) {
        await StorageService.clearWaypoints();
      }

      return uploaded;
    } catch (err) {
      console.error('[GPS] Upload error:', err);
      return 0;
    }
  }

  // ─── Get Current Position ────────────────────────────────────────────────
  async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
      } catch { /* ignore */ }
      return null;
    }
  }

  // ─── Callbacks ────────────────────────────────────────────────────────────
  onWaypoint(callback: (wp: GPSWaypoint) => void) {
    this.onWaypointCallback = callback;
  }

  onProximity(callback: (data: any) => void) {
    this.onProximityCallback = callback;
  }

  getIsTracking() {
    return this.isTracking;
  }

  getSessionId() {
    return this.sessionId;
  }
}

// Singleton instance
export const GPSTracker = new GPSTrackerService();
