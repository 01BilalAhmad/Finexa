export interface User {
  id: string;
  username: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  companies: Company[];
  allRoutesAccess?: boolean;
}

export interface Company {
  id: string;
  name: string;
  distributorPhone?: string;
}

export interface ShopBalance {
  companyId: string;
  outstanding: number;
  creditLimit: number;
}

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  area: string;
  address?: string;
  phone?: string;
  routeDays: string[];
  balance: number;
  creditLimit: number;
  companyBalances: ShopBalance[];
  lastRecoveryDate?: string;
  latitude?: number;
  longitude?: number;
}

export interface Transaction {
  id: string;
  shopId: string;
  shopName?: string;
  type: 'credit' | 'recovery';
  amount: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  createdAt: string;
  gpsLat?: number;
  gpsLng?: number;
  orderbookerId?: string;
  companyId?: string;
}

export interface OfflineRecovery {
  localId: string;
  shopId: string;
  shopName: string;
  amount: number;
  description?: string;
  gpsLat?: number;
  gpsLng?: number;
  orderbookerId: string;
  companyId: string;
  createdAt: string;
}

export interface RouteStop {
  shopId: string;
  shopName: string;
  checkInTime?: string;
  checkOutTime?: string;
  recoveryAmount?: number;
  gpsLat?: number;
  gpsLng?: number;
  isGpsStop?: boolean;
}

export interface ActiveRoute {
  id: string;
  isLocal: boolean;
  startTime: string;
  startLat?: number;
  startLng?: number;
  orderbookerId: string;
  companyId: string;
  stops: RouteStop[];
  waypoints: Array<{ lat: number; lng: number; timestamp: string }>;
  isEnded?: boolean;
  endTime?: string;
  endLat?: number;
  endLng?: number;
}

export interface ReceiptData {
  shopId: string;
  shopName: string;
  shopPhone?: string;
  ownerName?: string;
  address?: string;
  orderbookerName: string;
  distributorPhone: string;
  companyName: string;
  openingBalance: number;
  paymentAmount: number;
  remainingBalance: number;
  date: string;
  transactionId?: string;
}

export interface PendingNotification {
  id: string;
  shopId: string;
  shopName: string;
  phone?: string;
  receipt: ReceiptData;
  createdAt: string;
}

export interface ShopNote {
  shopId: string;
  text: string;
  updatedAt: string;
}

export interface LedgerEntry {
  shopId: string;
  shopName: string;
  ownerName: string;
  area: string;
  totalCredit: number;
  totalRecovery: number;
  balance: number;
  transactions: Transaction[];
}
