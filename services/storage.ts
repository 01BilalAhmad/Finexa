import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_STORAGE_KEYS, OFFLINE_EXPIRY_DAYS } from '@/constants/config';
import {
  User, Shop, OfflineRecovery, ActiveRoute,
  ReceiptData, PendingNotification, ShopNote,
} from '@/types';

export const StorageService = {
  async saveUser(user: User) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.USER, JSON.stringify(user));
  },
  async getUser(): Promise<User | null> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.USER);
    return v ? JSON.parse(v) : null;
  },
  async saveToken(token: string) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(APP_STORAGE_KEYS.TOKEN);
  },
  async saveSelectedCompany(companyId: string) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.SELECTED_COMPANY, companyId);
  },
  async getSelectedCompany(): Promise<string | null> {
    return AsyncStorage.getItem(APP_STORAGE_KEYS.SELECTED_COMPANY);
  },
  async saveDistributorPhone(phone: string) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.DISTRIBUTOR_PHONE, phone);
  },
  async getDistributorPhone(): Promise<string | null> {
    return AsyncStorage.getItem(APP_STORAGE_KEYS.DISTRIBUTOR_PHONE);
  },
  async clearSession() {
    await AsyncStorage.multiRemove([
      APP_STORAGE_KEYS.USER, APP_STORAGE_KEYS.TOKEN,
      APP_STORAGE_KEYS.SELECTED_COMPANY, APP_STORAGE_KEYS.DISTRIBUTOR_PHONE,
    ]);
  },
  async saveShops(shops: Shop[]) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.SHOPS_CACHE, JSON.stringify(shops));
  },
  async getShops(): Promise<Shop[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.SHOPS_CACHE);
    return v ? JSON.parse(v) : [];
  },
  async getOfflineQueue(): Promise<OfflineRecovery[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.OFFLINE_QUEUE);
    return v ? JSON.parse(v) : [];
  },
  async addOfflineRecovery(recovery: OfflineRecovery) {
    const queue = await StorageService.getOfflineQueue();
    queue.push(recovery);
    await AsyncStorage.setItem(APP_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },
  async removeOfflineRecovery(localId: string) {
    const queue = await StorageService.getOfflineQueue();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue.filter(r => r.localId !== localId)));
  },
  async cleanExpiredOfflineQueue() {
    const queue = await StorageService.getOfflineQueue();
    const expiry = Date.now() - OFFLINE_EXPIRY_DAYS * 86400000;
    const cleaned = queue.filter(r => new Date(r.createdAt).getTime() > expiry);
    await AsyncStorage.setItem(APP_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(cleaned));
  },
  async getVisitedShops(): Promise<string[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.VISITED_SHOPS);
    return v ? JSON.parse(v) : [];
  },
  async addVisitedShop(shopId: string) {
    const list = await StorageService.getVisitedShops();
    if (!list.includes(shopId)) {
      await AsyncStorage.setItem(APP_STORAGE_KEYS.VISITED_SHOPS, JSON.stringify([...list, shopId]));
    }
  },
  async removeVisitedShop(shopId: string) {
    const list = await StorageService.getVisitedShops();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.VISITED_SHOPS, JSON.stringify(list.filter(id => id !== shopId)));
  },
  async getRecoverySubmitted(): Promise<string[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.RECOVERY_SUBMITTED);
    return v ? JSON.parse(v) : [];
  },
  async addRecoverySubmitted(key: string) {
    const list = await StorageService.getRecoverySubmitted();
    if (!list.includes(key)) {
      await AsyncStorage.setItem(APP_STORAGE_KEYS.RECOVERY_SUBMITTED, JSON.stringify([...list, key]));
    }
  },
  async removeRecoverySubmitted(key: string) {
    const list = await StorageService.getRecoverySubmitted();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.RECOVERY_SUBMITTED, JSON.stringify(list.filter(k => k !== key)));
  },
  async saveActiveRoute(route: ActiveRoute | null) {
    if (route) await AsyncStorage.setItem(APP_STORAGE_KEYS.ACTIVE_ROUTE, JSON.stringify(route));
    else await AsyncStorage.removeItem(APP_STORAGE_KEYS.ACTIVE_ROUTE);
  },
  async getActiveRoute(): Promise<ActiveRoute | null> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.ACTIVE_ROUTE);
    return v ? JSON.parse(v) : null;
  },
  async savePin(pin: string) {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.PIN, pin);
  },
  async getPin(): Promise<string | null> {
    return AsyncStorage.getItem(APP_STORAGE_KEYS.PIN);
  },
  async clearPin() {
    await AsyncStorage.removeItem(APP_STORAGE_KEYS.PIN);
  },
  async getShopNotes(): Promise<Record<string, ShopNote>> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.SHOP_NOTES);
    return v ? JSON.parse(v) : {};
  },
  async saveShopNote(shopId: string, text: string) {
    const notes = await StorageService.getShopNotes();
    notes[shopId] = { shopId, text, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(APP_STORAGE_KEYS.SHOP_NOTES, JSON.stringify(notes));
  },
  async deleteShopNote(shopId: string) {
    const notes = await StorageService.getShopNotes();
    delete notes[shopId];
    await AsyncStorage.setItem(APP_STORAGE_KEYS.SHOP_NOTES, JSON.stringify(notes));
  },
  async getPendingNotifications(): Promise<PendingNotification[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.PENDING_NOTIFICATIONS);
    return v ? JSON.parse(v) : [];
  },
  async addPendingNotification(n: PendingNotification) {
    const list = await StorageService.getPendingNotifications();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.PENDING_NOTIFICATIONS, JSON.stringify([...list, n]));
  },
  async removePendingNotification(id: string) {
    const list = await StorageService.getPendingNotifications();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.PENDING_NOTIFICATIONS, JSON.stringify(list.filter(n => n.id !== id)));
  },
  async saveLastReceipt(shopId: string, receipt: ReceiptData) {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.LAST_RECEIPTS);
    const map = v ? JSON.parse(v) : {};
    map[shopId] = receipt;
    await AsyncStorage.setItem(APP_STORAGE_KEYS.LAST_RECEIPTS, JSON.stringify(map));
  },
  async getLastReceipts(): Promise<Record<string, ReceiptData>> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.LAST_RECEIPTS);
    return v ? JSON.parse(v) : {};
  },
  async setTourDone() {
    await AsyncStorage.setItem(APP_STORAGE_KEYS.TOUR_DONE, '1');
  },
  async isTourDone(): Promise<boolean> {
    return (await AsyncStorage.getItem(APP_STORAGE_KEYS.TOUR_DONE)) === '1';
  },

  // ─── GPS Waypoints Queue (for offline tracking) ───────────────────────────
  async getGpsQueue(): Promise<any[]> {
    const v = await AsyncStorage.getItem(APP_STORAGE_KEYS.WAYPOINTS);
    return v ? JSON.parse(v) : [];
  },
  async addGpsPoint(point: any): Promise<void> {
    const queue = await StorageService.getGpsQueue();
    queue.push(point);
    // Trim to max 2000 points
    while (queue.length > 2000) queue.shift();
    await AsyncStorage.setItem(APP_STORAGE_KEYS.WAYPOINTS, JSON.stringify(queue));
  },
  async removeGpsPoints(count: number): Promise<void> {
    const queue = await StorageService.getGpsQueue();
    const remaining = queue.slice(count);
    await AsyncStorage.setItem(APP_STORAGE_KEYS.WAYPOINTS, JSON.stringify(remaining));
  },
  async getGpsQueueCount(): Promise<number> {
    const queue = await StorageService.getGpsQueue();
    return queue.length;
  },
  async clearGpsQueue(): Promise<void> {
    await AsyncStorage.removeItem(APP_STORAGE_KEYS.WAYPOINTS);
  },
};
