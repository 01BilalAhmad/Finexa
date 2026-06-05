import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, Pressable, ScrollView, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReceiptData } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatDate } from '@/utils/format';

interface ReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onUndo?: () => void;
  undoAvailable?: boolean;
}

const UNDO_WINDOW_MS = 4000;

export function ReceiptModal({ visible, receipt, onClose, onUndo, undoAvailable }: ReceiptModalProps) {
  const insets = useSafeAreaInsets();
  const [undoTimeLeft, setUndoTimeLeft] = useState(UNDO_WINDOW_MS / 1000);
  const [undoExpired, setUndoExpired] = useState(false);
  const undoProgress = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible && undoAvailable) {
      setUndoTimeLeft(UNDO_WINDOW_MS / 1000);
      setUndoExpired(false);
      undoProgress.setValue(1);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setUndoTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setUndoExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Animate progress bar
      animRef.current = Animated.timing(undoProgress, {
        toValue: 0,
        duration: UNDO_WINDOW_MS,
        useNativeDriver: false,
      });
      animRef.current.start();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) animRef.current.stop();
    };
  }, [visible]);

  if (!receipt) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
          {/* Success Header */}
          <View style={styles.successHeader}>
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check-circle" size={36} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Recovery Submitted!</Text>
            <Text style={styles.successAmount}>{formatPKRFull(receipt.paymentAmount)}</Text>
            <Text style={styles.successShop}>{receipt.shopName}</Text>
          </View>

          {/* Undo Bar */}
          {!undoExpired && onUndo && (
            <View style={styles.undoSection}>
              <Animated.View
                style={[
                  styles.undoProgressBar,
                  { width: undoProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
              <View style={styles.undoContent}>
                <Text style={styles.undoText}>Undo available for {undoTimeLeft}s</Text>
                <Pressable
                  onPress={onUndo}
                  style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="undo" size={14} color={Colors.warning} />
                  <Text style={styles.undoBtnText}>Undo</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Receipt */}
          <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.receipt}>
              {/* Receipt Header */}
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>AL-FALAH CREDIT SYSTEM</Text>
                <Text style={styles.receiptCompany}>{receipt.companyName}</Text>
                <View style={styles.receiptDivider} />
                <Text style={styles.receiptLabel}>PAYMENT RECEIPT</Text>
              </View>

              {/* Distributor Phone */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Distributor</Text>
                <Text style={styles.receiptVal}>{receipt.distributorPhone || '-'}</Text>
              </View>

              <View style={styles.receiptDividerThin} />

              {/* Shop Info */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Shop</Text>
                <Text style={[styles.receiptVal, { maxWidth: '60%', textAlign: 'right' }]}>{receipt.shopName}</Text>
              </View>
              {receipt.ownerName ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Owner</Text>
                  <Text style={styles.receiptVal}>{receipt.ownerName}</Text>
                </View>
              ) : null}
              {receipt.address ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Address</Text>
                  <Text style={[styles.receiptVal, { maxWidth: '60%', textAlign: 'right' }]}>{receipt.address}</Text>
                </View>
              ) : null}

              <View style={styles.receiptDividerThin} />

              {/* Transaction Info */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Date</Text>
                <Text style={styles.receiptVal}>{formatDate(receipt.date)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Collected By</Text>
                <Text style={styles.receiptVal}>{receipt.orderbookerName}</Text>
              </View>

              <View style={styles.receiptDividerThin} />

              {/* Balance Details */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Opening Balance</Text>
                <Text style={[styles.receiptVal, { color: Colors.warning }]}>
                  {formatPKRFull(receipt.openingBalance)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Payment Received</Text>
                <Text style={[styles.receiptVal, { color: Colors.success, fontWeight: FontWeight.bold }]}>
                  - {formatPKRFull(receipt.paymentAmount)}
                </Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptKey, { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary }]}>
                  Remaining Balance
                </Text>
                <Text style={[styles.receiptVal, {
                  fontSize: FontSize.md,
                  fontWeight: FontWeight.bold,
                  color: receipt.remainingBalance > 0 ? Colors.warning : Colors.success,
                }]}>
                  {formatPKRFull(receipt.remainingBalance)}
                </Text>
              </View>

              {/* Thank You */}
              <View style={styles.thankYou}>
                <Text style={styles.thankYouText}>Thank You</Text>
                <Text style={styles.thankYouUrdu}>کسی بھی اختلاف کے لیے ڈسٹریبیوٹر سے رابطہ کریں</Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  successHeader: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  successTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  successAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  successShop: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Undo
  undoSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.warningMuted,
  },
  undoProgressBar: {
    height: 3,
    backgroundColor: Colors.warning,
  },
  undoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  undoText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  undoBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },

  // Receipt
  receiptScroll: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  receipt: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  receiptTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  receiptCompany: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  receiptLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  receiptDividerThin: {
    height: 1,
    backgroundColor: Colors.border + '60',
    marginVertical: 6,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  receiptKey: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  receiptVal: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  thankYou: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  thankYouText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  thankYouUrdu: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Actions
  actions: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 50,
  },
  closeBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});
