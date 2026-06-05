import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@/hooks/useRoute';
import { useShops } from '@/hooks/useShops';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatElapsed, formatPKRFull } from '@/utils/format';
import * as Location from 'expo-location';

interface RouteHeaderProps {
  onRouteEnded: () => void;
}

export function RouteHeader({ onRouteEnded }: RouteHeaderProps) {
  const { activeRoute, elapsedSeconds, endRoute, isLoading } = useRoute();
  const { todayTotal, visitedShops } = useShops();
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmDelay, setConfirmDelay] = useState(true);

  function openConfirm() {
    setConfirmModal(true);
    setConfirmDelay(true);
    setTimeout(() => setConfirmDelay(false), 2000);
  }

  async function handleEndRoute() {
    let lat: number | undefined, lng: number | undefined;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = loc.coords.latitude; lng = loc.coords.longitude;
    } catch { /* continue */ }
    await endRoute(lat, lng);
    setConfirmModal(false);
    onRouteEnded();
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.timerSection}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{visitedShops.size}</Text>
            <Text style={styles.statLabel}>Visited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatPKRFull(todayTotal)}</Text>
            <Text style={styles.statLabel}>Recovery</Text>
          </View>
        </View>

        <Pressable onPress={openConfirm} style={styles.endBtn}>
          <MaterialIcons name="stop" size={14} color="#fff" />
          <Text style={styles.endBtnText}>End</Text>
        </Pressable>
      </View>

      {/* End Route Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <MaterialIcons name="stop-circle" size={40} color={Colors.warning} style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.modalTitle}>End Route?</Text>
            <Text style={styles.modalSub}>
              {visitedShops.size} shops visited · {formatPKRFull(todayTotal)} collected{'\n'}
              This action cannot be undone.
            </Text>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setConfirmModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleEndRoute}
                disabled={confirmDelay || isLoading}
                style={[styles.confirmBtn, (confirmDelay || isLoading) && styles.confirmBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {confirmDelay ? 'Wait...' : 'End Route'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
    paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  timerSection: { alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.danger },
  liveText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.danger, letterSpacing: 1 },
  elapsed: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  statsSection: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  statDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.danger, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  endBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modal: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, padding: 12, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, alignItems: 'center' },
  cancelBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  confirmBtn: { flex: 1, padding: 12, backgroundColor: Colors.danger, borderRadius: Radius.md, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
