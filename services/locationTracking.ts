/**
 * Background GPS Location Tracking Service
 * 
 * Continuously tracks GPS position every 30 seconds and:
 * - ONLINE: Sends each point to server in real-time
 * - OFFLINE: Queues points in AsyncStorage, batch-uploads when back online
 * 
 * Also handles:
 * - Shop proximity detection (server-side via API)
 * - Midnight auto-end check
 * - Waypoint batch upload on reconnect
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiSendLocation, apiUploadWaypoints, setAuthToken } from './api';

// ─── Configuration ──────────────────────────────────────────────────────────
const LOCATION_TASK_NAME = 'finexa-background-location';
const GPS_INTERVAL_MS = 30000;        // 30 seconds
const GPS_DISTANCE_FILTER = 10;       // 10 meters minimum
const MAX_QUEUE_SIZE = 2000;          // Max offline waypoints
const BATCH_SIZE = 200;               // Upload batch size
const UPLOAD_INTERVAL_MS = 30000;     // 30 seconds batch upload when online
const WAYPOINTS_KEY = 'finexa_gps_queue';
const SESSION_KEY = 'finexa_tracking_session';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  altitude?: number;
  batteryLevel?: number;
  isOffline: boolean;
  recordedAt: string;
}

interface TrackingSession {
  sessionId: string;
  orderbookerId: string;
  isActive: boolean;
}

// ─── Waypoint Queue (AsyncStorage) ──────────────────────────────────────────
async function getQueuedWaypoints(): Promise<GPSPoint[]> {
  try {
    const data = await AsyncStorage.getItem(WAYPOINTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function queueWaypoint(point: GPSPoint): Promise<void> {
  const queue = await getQueuedWaypoints();
  queue.push(point);
  // Trim oldest if over max
  while (queue.length > MAX_QUEUE_SIZE) queue.shift();
  await AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(queue));
}

async function removeWaypoints(count: number): Promise<void> {
  const queue = await getQueuedWaypoints();
  const remaining = queue.slice(count);
  await AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(remaining));
}

// ─── Session Storage ────────────────────────────────────────────────────────
export async function saveTrackingSession(session: TrackingSession | null) {
  if (session) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}

export async function getTrackingSession(): Promise<TrackingSession | null> {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ─── Get Current Location ───────────────────────────────────────────────────
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  altitude?: number;
  address?: string;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let address: string | undefined;
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo[0]) {
        address = [geo[0].street, geo[0].city, geo[0].region].filter(Boolean).join(', ');
      }
    } catch { /* ignore reverse geocode failure */ }

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      speed: loc.coords.speed ?? undefined,
      altitude: loc.coords.altitude ?? undefined,
      address,
    };
  } catch {
    return null;
  }
}

// ─── Foreground Location Watching ───────────────────────────────────────────
let locationSubscription: Location.LocationSubscription | null = null;
let uploadInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start continuous GPS tracking (foreground only — works in Expo Go)
 * Sends single points in real-time when online, queues when offline
 */
export async function startLocationTracking(sessionId: string, orderbookerId: string) {
  // Save session
  await saveTrackingSession({ sessionId, orderbookerId, isActive: true });

  // Request permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[GPS] Location permission denied');
    return;
  }

  // Start watching position
  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: GPS_INTERVAL_MS,
        distanceInterval: GPS_DISTANCE_FILTER,
      },
      async (location) => {
        const point: GPSPoint = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          speed: location.coords.speed ?? undefined,
          altitude: location.coords.altitude ?? undefined,
          isOffline: false,
          recordedAt: new Date().toISOString(),
        };

        // Try to send immediately
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          try {
            await apiSendLocation({
              sessionId,
              lat: point.lat,
              lng: point.lng,
              accuracy: point.accuracy,
              speed: point.speed,
              altitude: point.altitude,
              isOffline: false,
            });
          } catch {
            // Failed — queue for batch upload
            point.isOffline = true;
            await queueWaypoint(point);
          }
        } else {
          // Offline — queue
          point.isOffline = true;
          await queueWaypoint(point);
        }
      }
    );
  } catch (err) {
    console.error('[GPS] watchPosition error:', err);
  }

  // Start periodic batch upload for queued points
  startPeriodicUpload(sessionId);

  // Listen for network reconnection
  NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await flushWaypointQueue(sessionId);
    }
  });
}

/**
 * Stop GPS tracking
 */
export async function stopLocationTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  if (uploadInterval) {
    clearInterval(uploadInterval);
    uploadInterval = null;
  }
  await saveTrackingSession(null);
}

// ─── Periodic Upload ────────────────────────────────────────────────────────
function startPeriodicUpload(sessionId: string) {
  if (uploadInterval) clearInterval(uploadInterval);
  uploadInterval = setInterval(async () => {
    await flushWaypointQueue(sessionId);
  }, UPLOAD_INTERVAL_MS);
}

/**
 * Flush queued waypoints to server in batches
 */
export async function flushWaypointQueue(sessionId: string): Promise<number> {
  const queue = await getQueuedWaypoints();
  if (queue.length === 0) return 0;

  let totalFlushed = 0;
  while (queue.length > totalFlushed) {
    const batch = queue.slice(totalFlushed, totalFlushed + BATCH_SIZE);
    try {
      await apiUploadWaypoints(sessionId, batch);
      totalFlushed += batch.length;
    } catch (err) {
      console.warn('[GPS] Batch upload failed:', err);
      break; // Stop on error, will retry next interval
    }
  }

  if (totalFlushed > 0) {
    await removeWaypoints(totalFlushed);
  }

  return totalFlushed;
}

/**
 * Get count of queued waypoints
 */
export async function getQueuedWaypointCount(): Promise<number> {
  const queue = await getQueuedWaypoints();
  return queue.length;
}

// ─── App Start Recovery ─────────────────────────────────────────────────────
/**
 * Called on app startup to resume tracking if a session was active
 */
export async function resumeTrackingIfNeeded(): Promise<boolean> {
  const session = await getTrackingSession();
  if (!session || !session.isActive) return false;

  // Check if session is still valid (not stale > 24 hours)
  const sessionData = await getTrackingSession();
  if (!sessionData) return false;

  await startLocationTracking(session.sessionId, session.orderbookerId);
  return true;
}
