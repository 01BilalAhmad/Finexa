import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@/hooks/useRoute';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, getDayName } from '@/utils/format';
import { CompanySelector } from '@/components/layout/CompanySelector';
import * as Location from 'expo-location';

interface RouteStartCardProps {
  todayShopCount: number;
}

export function RouteStartCard({ todayShopCount }: RouteStartCardProps) {
  const { user, selectedCompany } = useAuth();
  const { startRoute, isLoading } = useRoute();
  const { todayTotal } = useShops();

  async function handleStart() {
    if (!user || !selectedCompany) return;
    let lat: number | undefined, lng: number | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch { /* continue without GPS */ }
    await startRoute(user.id, selectedCompany.id, lat, lng);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Top */}
        <View style={styles.topRow}>
          <View style={styles.dayBadge}>
            <MaterialIcons name="calendar-today" size={12} color={Colors.primary} />
            <Text style={styles.dayText}>{getDayName()}</Text>
          </View>
          <CompanySelector />
        </View>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <MaterialIcons name="play-circle-filled" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Start Your Route</Text>
        <Text style={styles.sub}>
          {todayShopCount} shop{todayShopCount !== 1 ? 's' : ''} assigned for today
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{todayShopCount}</Text>
            <Text style={styles.statLabel}>Shops</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatPKRFull(todayTotal)}</Text>
            <Text style={styles.statLabel}>Today Recovery</Text>
          </View>
        </View>

        {/* Start Button */}
        <Pressable
          onPress={handleStart}
          disabled={isLoading}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start Route</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.hint}>GPS location will be captured on start</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: Spacing.lg },
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  dayText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.primaryLight },
  iconWrap: { marginVertical: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: Spacing.lg, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: 14, borderRadius: Radius.lg, width: '100%',
    justifyContent: 'center', marginBottom: 8,
  },
  startBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted },
});
