import { API_BASE } from '@/constants/config';
import { Shop, Transaction, OfflineRecovery, ActiveRoute, LedgerEntry } from '@/types';

// Mock delay helper
const mockDelay = (ms = 600) => new Promise(res => setTimeout(res, ms));

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

const headers = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SHOPS: Shop[] = [
  {
    id: 's1', name: 'Al-Noor General Store', ownerName: 'Ahmed Khan', area: 'Gulshan',
    address: 'Shop 12, Gulshan Market', phone: '03001234567',
    routeDays: ['Monday', 'Thursday'], balance: 45000, creditLimit: 100000,
    companyBalances: [{ companyId: 'c1', outstanding: 45000, creditLimit: 100000 }],
    lastRecoveryDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    latitude: 24.8607, longitude: 67.0105,
  },
  {
    id: 's2', name: 'Bismillah Traders', ownerName: 'Muhammad Ali', area: 'PECHS',
    address: 'Block 6, PECHS', phone: '03021234567',
    routeDays: ['Monday', 'Wednesday'], balance: 92000, creditLimit: 100000,
    companyBalances: [{ companyId: 'c1', outstanding: 92000, creditLimit: 100000 }],
    lastRecoveryDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    latitude: 24.8697, longitude: 67.0600,
  },
  {
    id: 's3', name: 'Habib Medical Store', ownerName: 'Habib Ur Rehman', area: 'Saddar',
    address: 'Burns Road, Saddar', phone: '03031234567',
    routeDays: ['Monday', 'Tuesday', 'Thursday'], balance: 0, creditLimit: 50000,
    companyBalances: [{ companyId: 'c1', outstanding: 0, creditLimit: 50000 }],
    lastRecoveryDate: new Date().toISOString(),
    latitude: 24.8543, longitude: 67.0328,
  },
  {
    id: 's4', name: 'Farooq Electronics', ownerName: 'Farooq Siddiqui', area: 'Defence',
    address: 'Phase 5, DHA', phone: '03041234567',
    routeDays: ['Monday', 'Saturday'], balance: 115000, creditLimit: 120000,
    companyBalances: [{ companyId: 'c1', outstanding: 115000, creditLimit: 120000 }],
    lastRecoveryDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    latitude: 24.8074, longitude: 67.0366,
  },
  {
    id: 's5', name: 'Rehman Grocery', ownerName: 'Rehman Butt', area: 'Gulshan',
    address: 'Block 13, Gulshan', phone: '03051234567',
    routeDays: ['Monday', 'Wednesday', 'Saturday'], balance: 28000, creditLimit: 80000,
    companyBalances: [{ companyId: 'c1', outstanding: 28000, creditLimit: 80000 }],
    lastRecoveryDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    latitude: 24.9000, longitude: 67.0800,
  },
  {
    id: 's6', name: 'City Mart', ownerName: 'Zafar Iqbal', area: 'Nazimabad',
    address: 'Block 1, Nazimabad', phone: '03061234567',
    routeDays: ['Tuesday', 'Thursday'], balance: 67000, creditLimit: 150000,
    companyBalances: [{ companyId: 'c1', outstanding: 67000, creditLimit: 150000 }],
    lastRecoveryDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    latitude: 24.9200, longitude: 67.0300,
  },
  {
    id: 's7', name: 'Sunrise Bakery', ownerName: 'Imran Shah', area: 'FB Area',
    address: 'Block 17, FB Area', phone: '03071234567',
    routeDays: ['Wednesday', 'Saturday'], balance: 34500, creditLimit: 60000,
    companyBalances: [{ companyId: 'c1', outstanding: 34500, creditLimit: 60000 }],
    lastRecoveryDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    latitude: 24.9500, longitude: 67.0400,
  },
  {
    id: 's8', name: 'Khan Brothers', ownerName: 'Waqar Khan', area: 'Orangi',
    address: 'Sector 11, Orangi', phone: '03081234567',
    routeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], balance: 55000, creditLimit: 75000,
    companyBalances: [{ companyId: 'c1', outstanding: 55000, creditLimit: 75000 }],
    lastRecoveryDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    latitude: 24.9600, longitude: 66.9900,
  },
];

const MOCK_TRANSACTIONS: Record<string, Transaction[]> = {
  s1: [
    { id: 't1', shopId: 's1', type: 'credit', amount: 50000, status: 'approved', date: '2026-05-28', createdAt: '2026-05-28T10:00:00Z', description: 'Monthly credit' },
    { id: 't2', shopId: 's1', type: 'recovery', amount: 5000, status: 'approved', date: '2026-06-01', createdAt: '2026-06-01T11:00:00Z' },
    { id: 't3', shopId: 's1', type: 'recovery', amount: 0, status: 'pending', date: '2026-06-04', createdAt: '2026-06-04T09:30:00Z', description: 'Cash collected' },
  ],
  s2: [
    { id: 't4', shopId: 's2', type: 'credit', amount: 100000, status: 'approved', date: '2026-05-25', createdAt: '2026-05-25T10:00:00Z' },
    { id: 't5', shopId: 's2', type: 'recovery', amount: 8000, status: 'approved', date: '2026-05-30', createdAt: '2026-05-30T10:00:00Z' },
  ],
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string) {
  await mockDelay(800);
  // Mock credentials: demo/1234 or any non-empty
  if (!username || !password) throw new Error('Credentials required');
  if (username === 'demo' && password !== '1234') throw new Error('Invalid password');

  const user = {
    id: 'u1', username, name: username === 'demo' ? 'Ahmed Orderbooker' : username,
    phone: '03009876543', role: 'orderbooker', status: 'active',
    companies: [
      { id: 'c1', name: 'Al-Falah Traders', distributorPhone: '03331234567' },
      { id: 'c2', name: 'Metro Distribution', distributorPhone: '03221234567' },
    ],
    allRoutesAccess: false,
  };
  const token = 'mock_token_' + Date.now();
  return { user, token };
}

export async function apiValidateToken(token: string) {
  await mockDelay(300);
  return token.startsWith('mock_token_');
}

// ─── Shops ────────────────────────────────────────────────────────────────────

export async function apiGetShops(companyId: string): Promise<Shop[]> {
  await mockDelay(700);
  return MOCK_SHOPS;
}

export async function apiMobileSync(companyId: string) {
  await mockDelay(1000);
  return { shops: MOCK_SHOPS, timestamp: new Date().toISOString() };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function apiSubmitRecovery(data: {
  shopId: string; amount: number; orderbookerId: string;
  gpsLat?: number; gpsLng?: number; description?: string;
  companyId: string; idempotencyKey: string;
}) {
  await mockDelay(800);
  const txn: Transaction = {
    id: 'txn_' + Date.now(),
    shopId: data.shopId,
    type: 'recovery',
    amount: data.amount,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    description: data.description,
    gpsLat: data.gpsLat,
    gpsLng: data.gpsLng,
    companyId: data.companyId,
    orderbookerId: data.orderbookerId,
  };
  return txn;
}

export async function apiDeleteTransaction(id: string) {
  await mockDelay(400);
  return true;
}

export async function apiEditPendingRecovery(id: string, amount: number, description?: string) {
  await mockDelay(500);
  return true;
}

export async function apiGetTransactions(shopId: string, companyId: string): Promise<Transaction[]> {
  await mockDelay(600);
  return MOCK_TRANSACTIONS[shopId] || [];
}

// ─── GPS Visit ────────────────────────────────────────────────────────────────

export async function apiRecordVisit(shopId: string, data: {
  orderbookerId: string; lat: number; lng: number;
  address?: string; companyId: string; routeId?: string;
}) {
  await mockDelay(400);
  return { id: 'visit_' + Date.now() };
}

// ─── Route Tracking ───────────────────────────────────────────────────────────

export async function apiStartRoute(data: {
  orderbookerId: string; companyId: string;
  startLat?: number; startLng?: number;
}) {
  await mockDelay(600);
  return { id: 'route_' + Date.now() };
}

export async function apiEndRoute(routeId: string, data: {
  endLat?: number; endLng?: number;
}) {
  await mockDelay(600);
  return true;
}

export async function apiCheckInShop(routeId: string, shopId: string, data: {
  lat?: number; lng?: number;
}) {
  await mockDelay(300);
  return { id: 'stop_' + Date.now() };
}

export async function apiCheckOutShop(stopId: string, data: {
  lat?: number; lng?: number; recoveryAmount?: number;
}) {
  await mockDelay(300);
  return true;
}

export async function apiUploadWaypoints(routeId: string, waypoints: any[]) {
  await mockDelay(400);
  return true;
}

export async function apiGetRouteSettings(): Promise<{ enabled: boolean }> {
  await mockDelay(300);
  return { enabled: true };
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export async function apiGetLedger(shopId: string, companyId: string): Promise<LedgerEntry> {
  await mockDelay(800);
  const shop = MOCK_SHOPS.find(s => s.id === shopId);
  const transactions = MOCK_TRANSACTIONS[shopId] || [];
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalRecovery = transactions.filter(t => t.type === 'recovery').reduce((s, t) => s + t.amount, 0);
  return {
    shopId,
    shopName: shop?.name || 'Unknown',
    ownerName: shop?.ownerName || '',
    area: shop?.area || '',
    totalCredit,
    totalRecovery,
    balance: totalCredit - totalRecovery,
    transactions: transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

// ─── Recovery Summary ─────────────────────────────────────────────────────────

export async function apiGetRecoverySummary(orderbookerId: string, companyId: string) {
  await mockDelay(500);
  return {
    todayTotal: 0,
    monthTotal: 145000,
    shopsAssigned: MOCK_SHOPS.length,
    shopsVisited: 0,
  };
}

// ─── Shop Phone ───────────────────────────────────────────────────────────────

export async function apiUpdateShopPhone(shopId: string, phone: string) {
  await mockDelay(400);
  return true;
}
