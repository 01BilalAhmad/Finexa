export const API_BASE = 'https://alfalah-traders.vercel.app';

export const ROUTE_DAYS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Saturday', // Saturday shifted to index 5 for weekday mapping
  6: 'Saturday',
};

export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

export const MIN_RECOVERY = 1;
export const MAX_RECOVERY = 500000;
export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const OFFLINE_EXPIRY_DAYS = 7;
export const STALE_ROUTE_HOURS = 24;
export const UNDO_WINDOW_MS = 4000;
export const SUCCESS_OVERLAY_MS = 2500;
export const WAYPOINT_INTERVAL_MS = 5000;
export const WAYPOINT_BATCH_SIZE = 100;
export const WAYPOINT_UPLOAD_INTERVAL_MS = 30000;

export const CREDIT_WARNING_THRESHOLD = 0.9; // 90%
export const PROXIMITY_THRESHOLD_METERS = 100;

export const APP_STORAGE_KEYS = {
  USER: 'finexa_user',
  TOKEN: 'finexa_token',
  SELECTED_COMPANY: 'finexa_company',
  DISTRIBUTOR_PHONE: 'finexa_dist_phone',
  SHOPS_CACHE: 'finexa_shops',
  OFFLINE_QUEUE: 'finexa_offline_queue',
  VISITED_SHOPS: 'finexa_visited',
  RECOVERY_SUBMITTED: 'finexa_recovery_submitted',
  ACTIVE_ROUTE: 'finexa_active_route',
  ROUTE_STOPS: 'finexa_route_stops',
  WAYPOINTS: 'finexa_waypoints',
  PIN: 'finexa_pin',
  TOUR_DONE: 'finexa_tour_done',
  SHOP_NOTES: 'finexa_shop_notes',
  PENDING_NOTIFICATIONS: 'finexa_pending_notifications',
  LAST_RECEIPTS: 'finexa_last_receipts',
  OFFLINE_PHONE_UPDATES: 'finexa_offline_phone_updates',
  DAILY_TARGET: 'finexa_daily_target',
};
