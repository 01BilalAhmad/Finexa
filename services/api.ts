import { API_BASE } from '@/constants/config';
import { Shop, Transaction, OfflineRecovery, ActiveRoute, LedgerEntry } from '@/types';

// ─── Auth Token Management ──────────────────────────────────────────────────
let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

// ─── Generic Request Helper ─────────────────────────────────────────────────
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: headers(), ...options });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch { /* ignore parse error */ }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string) {
  const res = await request<{ user: any; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // Normalize user data to match our types
  // Backend returns companies as: { companyId, companyName, distributorPhone, isPrimary }
  // Frontend Company type expects: { id, name, distributorPhone }
  const companies = (res.user.companies || []).map((c: any) => ({
    id: c.companyId || c.id,
    name: c.companyName || c.name,
    distributorPhone: c.distributorPhone || '',
  }));

  const user = {
    id: res.user.id,
    username: res.user.username,
    name: res.user.name,
    phone: res.user.phone || '',
    role: res.user.role,
    status: res.user.status,
    companies,
    allRoutesAccess: res.user.allRoutesEnabled || false,
  };

  return { user, token: res.token };
}

export async function apiValidateToken(token: string) {
  try {
    const res = await request<{ valid: boolean }>('/api/auth/validate');
    return res.valid;
  } catch {
    return false;
  }
}

// ─── Shops ──────────────────────────────────────────────────────────────────

export async function apiGetShops(companyId: string, options?: { orderbookerId?: string; routeDay?: string; balanceOnly?: boolean }): Promise<Shop[]> {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);
  if (options?.orderbookerId) params.set('orderbookerId', options.orderbookerId);
  if (options?.routeDay) params.set('routeDay', options.routeDay);
  if (options?.balanceOnly) params.set('balanceOnly', 'true');
  const data = await request<Shop[]>(`/api/shops?${params.toString()}`);
  return Array.isArray(data) ? data : [];
}

export async function apiMobileSync(userId: string) {
  const data = await request<{ shops: Shop[]; syncTime?: string }>(`/api/mobile/sync?userId=${userId}`);
  return { shops: data.shops || [], timestamp: data.syncTime || new Date().toISOString() };
}

// ─── Transactions ───────────────────────────────────────────────────────────

export async function apiSubmitRecovery(data: {
  shopId: string; amount: number; orderbookerId: string;
  gpsLat?: number; gpsLng?: number; description?: string;
  companyId: string; idempotencyKey: string;
}) {
  return request<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      shopId: data.shopId,
      type: 'recovery',
      amount: data.amount,
      createdBy: data.orderbookerId,
      description: data.description,
      gpsLat: data.gpsLat,
      gpsLng: data.gpsLng,
      companyId: data.companyId,
      idempotencyKey: data.idempotencyKey,
    }),
  });
}

export async function apiDeleteTransaction(id: string) {
  await request<any>(`/api/transactions?id=${id}`, { method: 'DELETE' });
  return true;
}

export async function apiEditPendingRecovery(id: string, amount: number, description?: string) {
  await request<any>('/api/transactions/edit-pending', {
    method: 'PATCH',
    body: JSON.stringify({ id, amount, description }),
  });
  return true;
}

export async function apiGetTransactions(shopId: string, companyId: string): Promise<Transaction[]> {
  const params = new URLSearchParams({ shopId, limit: '50' });
  if (companyId) params.set('companyId', companyId);
  const data = await request<{ transactions: Transaction[] } | Transaction[]>(`/api/transactions?${params.toString()}`);
  if (Array.isArray(data)) return data;
  return data.transactions || [];
}

// ─── GPS Visit ──────────────────────────────────────────────────────────────

export async function apiRecordVisit(shopId: string, data: {
  orderbookerId: string; lat: number; lng: number;
  address?: string; companyId: string; routeId?: string;
}) {
  return request<{ id: string }>(`/api/shops/${shopId}/visits`, {
    method: 'POST',
    body: JSON.stringify({
      orderbookerId: data.orderbookerId,
      gpsLat: data.lat,
      gpsLng: data.lng,
      gpsAddress: data.address,
      inRange: true,
    }),
  });
}

// ─── Route Tracking ─────────────────────────────────────────────────────────

export async function apiStartRoute(data: {
  orderbookerId: string; companyId: string;
  startLat?: number; startLng?: number;
}) {
  return request<{ id: string; startTime?: string }>(`/api/route-sessions/start`, {
    method: 'POST',
    body: JSON.stringify({
      orderbookerId: data.orderbookerId,
      startLat: data.startLat,
      startLng: data.startLng,
    }),
  });
}

export async function apiEndRoute(routeId: string, data: {
  endLat?: number; endLng?: number;
}) {
  return request<any>(`/api/route-sessions/end`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: routeId,
      endLat: data.endLat,
      endLng: data.endLng,
    }),
  });
}

export async function apiSendLocation(data: {
  sessionId: string; lat: number; lng: number;
  accuracy?: number; speed?: number; altitude?: number;
  batteryLevel?: number; isOffline?: boolean;
}) {
  return request<{ success: boolean; shopProximity?: any }>(`/api/route-sessions/location`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUploadWaypoints(sessionId: string, locations: Array<{
  lat: number; lng: number; accuracy?: number; speed?: number;
  altitude?: number; batteryLevel?: number; isOffline?: boolean;
  recordedAt?: string;
}>) {
  return request<{ saved: number; shopProximity?: any }>(`/api/route-sessions/locations-batch`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, locations }),
  });
}

export async function apiGetActiveRoute(orderbookerId: string) {
  return request<{ session?: any; shopVisits?: any[] }>(`/api/route-sessions/active?orderbookerId=${orderbookerId}`);
}

export async function apiCheckInShop(routeId: string, shopId: string, data: {
  lat?: number; lng?: number;
}) {
  // Server auto-detects shop visits via proximity — this is a manual fallback
  return { id: 'stop_' + Date.now() };
}

export async function apiCheckOutShop(stopId: string, data: {
  lat?: number; lng?: number; recoveryAmount?: number;
}) {
  // Server auto-detects shop exit via proximity
  return true;
}

export async function apiGetRouteSettings(): Promise<{ enabled: boolean }> {
  return { enabled: true };
}

// ─── Ledger ─────────────────────────────────────────────────────────────────

export async function apiGetLedger(shopId: string, companyId: string): Promise<LedgerEntry> {
  const params = new URLSearchParams({ shopId, limit: '50' });
  if (companyId) params.set('companyId', companyId);
  return request<LedgerEntry>(`/api/reports/ledger?${params.toString()}`);
}

// ─── Recovery Summary ───────────────────────────────────────────────────────

export async function apiGetRecoverySummary(orderbookerId: string, companyId: string) {
  const params = new URLSearchParams();
  if (orderbookerId) params.set('orderbookerId', orderbookerId);
  if (companyId) params.set('companyId', companyId);
  try {
    return request<any>(`/api/reports/recovery-summary?${params.toString()}`);
  } catch {
    return { todayTotal: 0, monthTotal: 0, shopsAssigned: 0, shopsVisited: 0 };
  }
}

// ─── Shop Phone ─────────────────────────────────────────────────────────────

export async function apiUpdateShopPhone(shopId: string, phone: string) {
  await request<any>(`/api/shops/phone`, {
    method: 'PATCH',
    body: JSON.stringify({ shopId, phone }),
  });
  return true;
}

export async function apiUpdateShopInfo(shopId: string, data: { phone?: string; ownerName?: string }) {
  await request<any>(`/api/shops/info`, {
    method: 'PATCH',
    body: JSON.stringify({ shopId, ...data }),
  });
  return true;
}

// ─── Company ────────────────────────────────────────────────────────────────

export async function apiGetCompanies(userId: string) {
  return request<any[]>(`/api/companies?userId=${userId}`);
}

export async function apiGetDistributorPhone(companyId: string) {
  return request<{ distributorPhone: string; companyName: string }>(`/api/companies/distributor-phone?companyId=${companyId}`);
}
