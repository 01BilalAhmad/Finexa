import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Shop } from '@/types';
import { useShops } from '@/hooks/useShops';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { PulsingDot } from '@/components/ui/PulsingDot';
import { formatPKR, getCreditUsage } from '@/utils/format';
import { CREDIT_WARNING_THRESHOLD } from '@/constants/config';

interface ShopCardProps {
  shop: Shop;
  onCollect: (shop: Shop) => void;
  onDetail: (shop: Shop) => void;
  onGpsVisit?: (shop: Shop) => void;
  isPostRoute?: boolean;
  isLate?: boolean;
}

export const ShopCard = memo(function ShopCard({ shop, onCollect, onDetail, onGpsVisit, isPostRoute, isLate }: ShopCardProps) {
  const { visitedShops, recoverySubmitted } = useShops();
  const { selectedCompany } = useAuth();

  const recoveryKey = selectedCompany ? `${shop.id}_${selectedCompany.id}` : shop.id;
  const hasRecovery = recoverySubmitted.has(recoveryKey);
  const isVisited = visitedShops.has(shop.id);
  const isBalanceClear = shop.balance <= 0;
  const creditUsage = getCreditUsage(shop.balance, shop.creditLimit);
  const isOverLimit = creditUsage >= 1;
  const isNearLimit = creditUsage >= CREDIT_WARNING_THRESHOLD && !isOverLimit;

  let accentColor = Colors.border;
  if (hasRecovery) accentColor = Colors.primary;
  else if (isVisited) accentColor = Colors.purple;
  else if (isOverLimit) accentColor = Colors.danger;
  else if (isNearLimit) accentColor = Colors.warning;

  return (
    <Pressable
      onPress={() => onDetail(shop)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, isBalanceClear && styles.cardDim]}
    >
      {/* Left accent bar */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Top Row */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              {isOverLimit && <PulsingDot color={Colors.danger} size={7} style={{ marginLeft: 6 }} />}
              {isNearLimit && <PulsingDot color={Colors.warning} size={7} style={{ marginLeft: 6 }} />}
            </View>
            <Text style={styles.ownerText}>{shop.ownerName} · {shop.area}</Text>
          </View>
          <View style={styles.badgeCol}>
            {hasRecovery && <Badge label="Recovery Added" variant="primary" />}
            {!hasRecovery && isVisited && <Badge label="Visited" variant="purple" />}
            {isBalanceClear && <Badge label="Balance Clear" variant="muted" />}
            {isOverLimit && <Badge label="Over Limit" variant="danger" />}
            {isNearLimit && !isOverLimit && <Badge label="Near Limit" variant="warning" />}
            {isLate && <Badge label="Late Entry" variant="warning" />}
          </View>
        </View>

        {/* Balance Row */}
        {!isBalanceClear && (
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Outstanding</Text>
              <Text style={[styles.balanceAmount, isOverLimit && { color: Colors.danger }]}>
                {formatPKR(shop.balance)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceLabel}>Credit Limit</Text>
              <Text style={styles.balanceAmountSecondary}>{formatPKR(shop.creditLimit)}</Text>
            </View>
          </View>
        )}

        {/* Credit Usage Bar */}
        {shop.creditLimit > 0 && !isBalanceClear && (
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.min(creditUsage * 100, 100)}%` as any,
                backgroundColor: isOverLimit ? Colors.danger : isNearLimit ? Colors.warning : Colors.primary,
              }
            ]} />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => onCollect(shop)}
            disabled={hasRecovery || isBalanceClear}
            style={({ pressed }) => [
              styles.collectBtn,
              (hasRecovery || isBalanceClear) && styles.collectBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="payments" size={14} color={
              hasRecovery || isBalanceClear ? Colors.textMuted : '#fff'
            } />
            <Text style={[styles.collectBtnText, (hasRecovery || isBalanceClear) && { color: Colors.textMuted }]}>
              {hasRecovery ? 'Recovery Added' : isBalanceClear ? 'Clear' : isPostRoute ? 'Late Recovery' : 'Collect Recovery'}
            </Text>
          </Pressable>

          {onGpsVisit && !hasRecovery && !isVisited && (
            <Pressable onPress={() => onGpsVisit(shop)} style={styles.gpsBtn}>
              <MaterialIcons name="my-location" size={16} color={Colors.textSecondary} />
            </Pressable>
          )}

          <Pressable onPress={() => onDetail(shop)} style={styles.detailBtn}>
            <MaterialIcons name="info-outline" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDim: { opacity: 0.65 },
  accent: { width: 3 },
  body: { flex: 1, padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  shopName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  ownerText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badgeCol: { gap: 3, alignItems: 'flex-end' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 1 },
  balanceAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  balanceAmountSecondary: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  progressTrack: { height: 3, backgroundColor: Colors.surfaceBorder, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  collectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.sm, justifyContent: 'center',
  },
  collectBtnDisabled: { backgroundColor: Colors.surfaceElevated },
  collectBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: '#fff' },
  gpsBtn: {
    padding: 8, backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  detailBtn: {
    padding: 8, backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
});
