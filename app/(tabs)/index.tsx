import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  Pressable, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { useRoute } from '@/hooks/useRoute';
import { Shop, ReceiptData } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { getDayName, formatPKRFull } from '@/utils/format';
import { ShopCard } from '@/components/feature/ShopCard';
import { RecoverySheet } from '@/components/feature/RecoverySheet';
import { SuccessOverlay } from '@/components/feature/SuccessOverlay';
import { ReceiptModal } from '@/components/feature/ReceiptModal';
import { ShopDetailModal } from '@/components/feature/ShopDetailModal';
import { RouteStartCard } from '@/components/feature/RouteStartCard';
import { RouteHeader } from '@/components/feature/RouteHeader';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { CompanySelector } from '@/components/layout/CompanySelector';

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const { user, selectedCompany } = useAuth();
  const { shops, isLoading, todayTotal, visitedShops, unmarkVisited, unmarkRecoverySubmitted, subtractFromTodayTotal } = useShops();
  const { isRouteActive, activeRoute, routeEnabled } = useRoute();

  const [search, setSearch] = useState('');
  const [activeSheet, setActiveSheet] = useState<Shop | null>(null);
  const [detailShop, setDetailShop] = useState<Shop | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; shop: Shop; txnId?: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [routeEnded, setRouteEnded] = useState(false);

  const todayDay = getDayName();

  const filteredShops = useMemo(() => {
    let base = shops;
    // Filter by today's route day
    if (!activeRoute?.isEnded) {
      base = shops.filter(s => s.routeDays.includes(todayDay));
    }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return base;
  }, [shops, search, todayDay, activeRoute]);

  const todayShopCount = useMemo(() =>
    shops.filter(s => s.routeDays.includes(todayDay)).length,
    [shops, todayDay]
  );

  function handleRecoverySuccess(amount: number, shop: Shop, receipt: ReceiptData, txnId?: string) {
    setSuccessData({ amount, shop, txnId });
    setReceiptData(receipt);
    setShowReceipt(true);
  }

  async function handleUndo() {
    if (!successData || !selectedCompany) return;
    const { shop, amount, txnId } = successData;
    const key = `${shop.id}_${selectedCompany.id}`;
    await unmarkVisited(shop.id);
    await unmarkRecoverySubmitted(key);
    subtractFromTodayTotal(amount);
    setShowReceipt(false);
    setShowSuccess(false);
    setReceiptData(null);
    setSuccessData(null);
  }

  const showRouteStart = routeEnabled && !isRouteActive && !activeRoute?.isEnded;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {user ? `Salaam, ${user.name.split(' ')[0]}` : 'Salaam'}
          </Text>
          <Text style={styles.subGreeting}>{todayDay} Route · {todayShopCount} shops</Text>
        </View>
        <CompanySelector />
      </View>

      {/* Route Tracking Header (when active) */}
      {isRouteActive && <RouteHeader onRouteEnded={() => setRouteEnded(true)} />}

      {/* Route Ended Summary */}
      {activeRoute?.isEnded && (
        <View style={styles.routeEndedBanner}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.routeEndedText}>
            Route ended · {visitedShops.size} visited · {formatPKRFull(todayTotal)} collected
          </Text>
        </View>
      )}

      {/* Main Content */}
      {showRouteStart ? (
        <RouteStartCard todayShopCount={todayShopCount} />
      ) : (
        <>
          {/* Search */}
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search shops, owners, areas..."
              placeholderTextColor={Colors.textMuted}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{filteredShops.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.success }]}>{visitedShops.size}</Text>
              <Text style={styles.statLabel}>Visited</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>{formatPKRFull(todayTotal)}</Text>
              <Text style={styles.statLabel}>Recovery</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading shops...</Text>
            </View>
          ) : filteredShops.length === 0 ? (
            <View style={styles.center}>
              <MaterialIcons name="store" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Shops Found</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term' : `No shops assigned for ${todayDay}`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredShops}
              keyExtractor={s => s.id}
              renderItem={({ item }) => (
                <ShopCard
                  shop={item}
                  onCollect={setActiveSheet}
                  onDetail={setDetailShop}
                  isPostRoute={activeRoute?.isEnded}
                />
              )}
              contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 90 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Recovery Bottom Sheet */}
      <RecoverySheet
        visible={!!activeSheet}
        shop={activeSheet}
        onClose={() => setActiveSheet(null)}
        onSuccess={handleRecoverySuccess}
      />

      {/* Receipt Modal (replaces SuccessOverlay with full receipt view) */}
      <ReceiptModal
        visible={showReceipt}
        receipt={receiptData}
        onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        onUndo={handleUndo}
        undoAvailable={!!receiptData}
      />

      {/* Shop Detail Modal */}
      <ShopDetailModal
        visible={!!detailShop}
        shop={detailShop}
        onClose={() => setDetailShop(null)}
        onCollect={shop => { setDetailShop(null); setActiveSheet(shop); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  greeting: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subGreeting: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  routeEndedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successMuted, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  routeEndedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginVertical: 6,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: 10, borderWidth: 1, borderColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.sm, fontSize: FontSize.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
});
