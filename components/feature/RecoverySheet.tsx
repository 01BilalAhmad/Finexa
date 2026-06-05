import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Shop, OfflineRecovery, ReceiptData } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { useRoute } from '@/hooks/useRoute';
import { useOffline } from '@/hooks/useOffline';
import { apiSubmitRecovery, apiRecordVisit } from '@/services/api';
import { StorageService } from '@/services/storage';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatPKR, generateLocalId } from '@/utils/format';
import { QUICK_AMOUNTS, MIN_RECOVERY, MAX_RECOVERY, UNDO_WINDOW_MS } from '@/constants/config';
import * as Location from 'expo-location';

interface RecoverySheetProps {
  visible: boolean;
  shop: Shop | null;
  onClose: () => void;
  onSuccess: (amount: number, shop: Shop, receipt: ReceiptData, txnId?: string) => void;
}

export function RecoverySheet({ visible, shop, onClose, onSuccess }: RecoverySheetProps) {
  const { user, selectedCompany, distributorPhone } = useAuth();
  const { markVisited, markRecoverySubmitted, addToTodayTotal } = useShops();
  const { activeRoute, isRouteActive, addStop } = useRoute();
  const { isOnline, addToQueue } = useOffline();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [capturedGps, setCapturedGps] = useState<{ lat: number; lng: number } | null>(null);

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const remaining = shop ? Math.max(0, shop.balance - parsedAmount) : 0;
  const isValidAmount = parsedAmount >= MIN_RECOVERY && parsedAmount <= MAX_RECOVERY && (shop ? parsedAmount <= shop.balance : true);

  useEffect(() => {
    if (visible && gpsEnabled) captureGps();
    if (!visible) {
      setAmount('');
      setNote('');
      setCapturedGps(null);
    }
  }, [visible]);

  async function captureGps() {
    setGpsCapturing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsCapturing(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCapturedGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) setCapturedGps({ lat: last.coords.latitude, lng: last.coords.longitude });
      } catch { /* fallback */ }
    } finally {
      setGpsCapturing(false);
    }
  }

  async function handleSubmit() {
    if (!shop || !user || !selectedCompany || !isValidAmount) return;
    setLoading(true);
    try {
      const companyId = selectedCompany.id;
      const recoveryKey = `${shop.id}_${companyId}`;

      let txnId: string | undefined;

      if (isOnline) {
        const txn = await apiSubmitRecovery({
          shopId: shop.id,
          amount: parsedAmount,
          orderbookerId: user.id,
          gpsLat: gpsEnabled && capturedGps ? capturedGps.lat : undefined,
          gpsLng: gpsEnabled && capturedGps ? capturedGps.lng : undefined,
          description: note,
          companyId,
          idempotencyKey: generateLocalId(),
        });
        txnId = txn.id;
        if (gpsEnabled && capturedGps) {
          try {
            await apiRecordVisit(shop.id, {
              orderbookerId: user.id,
              lat: capturedGps.lat,
              lng: capturedGps.lng,
              companyId,
              routeId: activeRoute?.id,
            });
          } catch { /* optional */ }
        }
      } else {
        const localId = generateLocalId('local');
        const offlineRec: OfflineRecovery = {
          localId,
          shopId: shop.id,
          shopName: shop.name,
          amount: parsedAmount,
          description: note,
          gpsLat: gpsEnabled && capturedGps ? capturedGps.lat : undefined,
          gpsLng: gpsEnabled && capturedGps ? capturedGps.lng : undefined,
          orderbookerId: user.id,
          companyId,
          createdAt: new Date().toISOString(),
        };
        await addToQueue(offlineRec);
      }

      await markVisited(shop.id);
      await markRecoverySubmitted(recoveryKey);
      addToTodayTotal(parsedAmount);

      if (isRouteActive && activeRoute) {
        await addStop({
          shopId: shop.id,
          shopName: shop.name,
          checkInTime: new Date().toISOString(),
          checkOutTime: new Date().toISOString(),
          recoveryAmount: parsedAmount,
          gpsLat: capturedGps?.lat,
          gpsLng: capturedGps?.lng,
          isGpsStop: !!(gpsEnabled && capturedGps),
        });
      }

      const receipt: ReceiptData = {
        shopId: shop.id,
        shopName: shop.name,
        shopPhone: shop.phone,
        ownerName: shop.ownerName,
        address: shop.address,
        orderbookerName: user.name,
        distributorPhone,
        companyName: selectedCompany.name,
        openingBalance: shop.balance,
        paymentAmount: parsedAmount,
        remainingBalance: remaining,
        date: new Date().toISOString(),
        transactionId: txnId,
      };

      await StorageService.saveLastReceipt(shop.id, receipt);
      onClose();
      onSuccess(parsedAmount, shop, receipt, txnId);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit recovery. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!shop) return null;
  const usagePct = shop.creditLimit > 0 ? Math.min((shop.balance / shop.creditLimit) * 100, 100) : 0;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopSub}>{shop.ownerName} · {shop.area}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}><MaterialIcons name="close" size={22} color={Colors.textMuted} /></Pressable>
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceRow}>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>Outstanding</Text>
          <Text style={styles.balAmount}>{formatPKR(shop.balance)}</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>Credit Limit</Text>
          <Text style={styles.balAmountSecondary}>{formatPKR(shop.creditLimit)}</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>Usage</Text>
          <Text style={[styles.balAmount, usagePct >= 100 ? { color: Colors.danger } : usagePct >= 90 ? { color: Colors.warning } : {}]}>
            {usagePct.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Amount Input */}
      <Text style={styles.label}>Amount (PKR)</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.currencyLabel}>PKR</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />
      </View>

      {/* Quick Amounts */}
      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map(q => (
          <Pressable
            key={q}
            onPress={() => setAmount(q.toString())}
            style={({ pressed }) => [styles.quickPill, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.quickText}>{q >= 1000 ? `${q / 1000}K` : q}</Text>
          </Pressable>
        ))}
      </View>

      {/* Balance Preview */}
      {parsedAmount > 0 && (
        <View style={styles.preview}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Current Balance</Text>
            <Text style={styles.previewValue}>{formatPKRFull(shop.balance)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Payment</Text>
            <Text style={[styles.previewValue, { color: Colors.success }]}>- {formatPKRFull(parsedAmount)}</Text>
          </View>
          <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }]}>
            <Text style={styles.previewLabelBold}>Remaining Balance</Text>
            <Text style={styles.previewValueBold}>{formatPKRFull(remaining)}</Text>
          </View>
        </View>
      )}

      {/* Note */}
      <Text style={styles.label}>Note (Optional)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Add description..."
        placeholderTextColor={Colors.textMuted}
        multiline
      />

      {/* GPS Toggle */}
      <Pressable onPress={() => { setGpsEnabled(!gpsEnabled); if (!gpsEnabled) captureGps(); }} style={styles.gpsRow}>
        <View style={[styles.toggle, gpsEnabled && styles.toggleOn]}>
          <View style={[styles.toggleThumb, gpsEnabled && styles.toggleThumbOn]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.gpsLabel}>GPS Store Visit</Text>
          <Text style={styles.gpsSub}>
            {gpsCapturing ? 'Capturing GPS...' :
              capturedGps ? `${capturedGps.lat.toFixed(4)}, ${capturedGps.lng.toFixed(4)}` :
                'Location not captured'}
          </Text>
        </View>
        {gpsCapturing && <ActivityIndicator size="small" color={Colors.primary} />}
        {capturedGps && !gpsCapturing && <MaterialIcons name="gps-fixed" size={16} color={Colors.success} />}
      </Pressable>

      {/* Offline Badge */}
      {!isOnline && (
        <View style={styles.offlineBadge}>
          <MaterialIcons name="cloud-off" size={14} color={Colors.warning} />
          <Text style={styles.offlineText}>Offline – will sync when connected</Text>
        </View>
      )}

      {/* Submit */}
      <Button
        label={loading ? 'Submitting...' : `Collect PKR ${parsedAmount > 0 ? parsedAmount.toLocaleString() : '–'}`}
        onPress={handleSubmit}
        disabled={!isValidAmount || loading}
        loading={loading}
        fullWidth
        size="lg"
        style={{ marginTop: Spacing.md }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  shopName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  shopSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  balanceRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  balCard: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: 10, alignItems: 'center' },
  balLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 3 },
  balAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  balAmountSecondary: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  currencyLabel: { fontSize: FontSize.md, color: Colors.textMuted, marginRight: 8 },
  input: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingVertical: 14 },
  quickRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md, flexWrap: 'wrap' },
  quickPill: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.primaryMuted, borderRadius: Radius.full },
  quickText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primaryLight },
  preview: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12, marginBottom: Spacing.md },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  previewLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  previewValue: { fontSize: FontSize.sm, color: Colors.textPrimary },
  previewLabelBold: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  previewValueBold: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  noteInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.textPrimary, fontSize: FontSize.sm, minHeight: 60, marginBottom: Spacing.md },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 12, marginBottom: Spacing.sm },
  toggle: { width: 40, height: 22, borderRadius: 11, backgroundColor: Colors.border, padding: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.textSecondary },
  toggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 18 }] },
  gpsLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  gpsSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningMuted, borderRadius: Radius.sm, padding: 8, marginBottom: Spacing.sm },
  offlineText: { fontSize: FontSize.xs, color: Colors.warning },
});
