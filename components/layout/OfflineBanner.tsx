import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useOffline } from '@/hooks/useOffline';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

export function OfflineBanner() {
  const { isOnline, pendingCount, pendingWaypoints, syncStatus, triggerSync } = useOffline();

  if (isOnline && pendingCount === 0 && pendingWaypoints === 0 && syncStatus === 'idle') return null;

  let bgColor = Colors.surfaceElevated;
  let icon: any = 'wifi-off';
  let message = 'You are offline';
  let actionLabel = '';

  const totalPending = pendingCount + pendingWaypoints;

  if (!isOnline) {
    bgColor = '#1c1c2e';
    icon = 'wifi-off';
    const parts: string[] = [];
    if (pendingCount > 0) parts.push(`${pendingCount} recovery`);
    if (pendingWaypoints > 0) parts.push(`${pendingWaypoints} GPS pts`);
    message = parts.length > 0 ? `Offline · ${parts.join(', ')} pending` : 'You are offline';
  } else if (syncStatus === 'syncing') {
    bgColor = Colors.indigoMuted;
    icon = 'sync';
    message = 'Syncing...';
  } else if (syncStatus === 'success') {
    bgColor = Colors.successMuted;
    icon = 'check-circle';
    message = 'All data synced';
  } else if (syncStatus === 'error') {
    bgColor = Colors.dangerMuted;
    icon = 'error-outline';
    message = 'Sync failed';
    actionLabel = 'Retry';
  } else if (totalPending > 0) {
    bgColor = Colors.warningMuted;
    icon = 'pending';
    const parts: string[] = [];
    if (pendingCount > 0) parts.push(`${pendingCount} recover${pendingCount === 1 ? 'y' : 'ies'}`);
    if (pendingWaypoints > 0) parts.push(`${pendingWaypoints} GPS pts`);
    message = `${parts.join(', ')} pending`;
    actionLabel = 'Sync Now';
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      {syncStatus === 'syncing' ? (
        <ActivityIndicator size="small" color={Colors.indigo} style={{ marginRight: 6 }} />
      ) : (
        <MaterialIcons name={icon} size={14} color={
          syncStatus === 'success' ? Colors.success :
          syncStatus === 'error' ? Colors.danger :
          !isOnline ? Colors.textMuted :
          totalPending > 0 ? Colors.warning : Colors.textMuted
        } style={{ marginRight: 4 }} />
      )}
      <Text style={styles.msg}>{message}</Text>
      {actionLabel ? (
        <Pressable onPress={triggerSync} style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  msg: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  btn: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: Colors.surfaceBorder, borderRadius: 12,
  },
  btnText: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
});
