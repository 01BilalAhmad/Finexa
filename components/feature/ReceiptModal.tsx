import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, Pressable, ScrollView, Animated,
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReceiptData } from '@/types';
import { formatPKRFull, formatDate } from '@/utils/format';

// ── Receipt Color Palette ──────────────────────────────────────────
const C = {
  darkBlue: '#1B2A4A',
  deepBlue: '#0F1B33',
  teal: '#4ECDC4',
  tealMuted: '#3BA99F',
  yellow: '#FFD93D',
  yellowDark: '#F0C929',
  white: '#FFFFFF',
  white70: 'rgba(255,255,255,0.7)',
  white50: 'rgba(255,255,255,0.5)',
  white20: 'rgba(255,255,255,0.15)',
  white10: 'rgba(255,255,255,0.08)',
  pillBg: 'rgba(78,205,196,0.15)',
  pillBorder: 'rgba(78,205,196,0.35)',
  balanceBox: '#0D1526',
  successGreen: '#34D399',
  divider: 'rgba(255,255,255,0.12)',
  overlay: 'rgba(0,0,0,0.88)',
  closeBtn: '#4ECDC4',
  closeBtnText: '#1B2A4A',
  rowIcon: '#4ECDC4',
};

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
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>

          {/* ── Undo Bar ── */}
          {!undoExpired && onUndo && (
            <View style={s.undoSection}>
              <Animated.View
                style={[
                  s.undoProgressBar,
                  { width: undoProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
              <View style={s.undoContent}>
                <Text style={s.undoText}>Undo available for {undoTimeLeft}s</Text>
                <Pressable
                  onPress={onUndo}
                  style={({ pressed }) => [s.undoBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="undo" size={14} color={C.yellow} />
                  <Text style={s.undoBtnText}>Undo</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Receipt Card ── */}
          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.card}>

              {/* ── Header: Dark blue with company info ── */}
              <View style={s.header}>
                <View style={s.headerIconRow}>
                  <View style={s.bankIconCircle}>
                    <FontAwesome5 name="university" size={16} color={C.white} />
                  </View>
                  <Text style={s.headerTitle}>{receipt.companyName || 'AL-FALAH TRADERS'}</Text>
                </View>
                <Text style={s.headerSub}>Payment Receipt</Text>

                {/* Distributor Pill */}
                {receipt.distributorPhone ? (
                  <View style={s.pill}>
                    <MaterialIcons name="phone" size={12} color={C.teal} />
                    <Text style={s.pillText}>{receipt.distributorPhone}</Text>
                  </View>
                ) : null}

                <View style={s.headerDivider} />
              </View>

              {/* ── Shop & Transaction Details ── */}
              <View style={s.detailsSection}>

                {/* Shop Name */}
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <FontAwesome5 name="store" size={12} color={C.rowIcon} />
                  </View>
                  <Text style={s.detailLabel}>Shop</Text>
                  <Text style={s.detailValue} numberOfLines={2}>{receipt.shopName}</Text>
                </View>

                {/* Address */}
                {receipt.address ? (
                  <View style={s.detailRow}>
                    <View style={s.detailIconWrap}>
                      <Ionicons name="location" size={13} color={C.rowIcon} />
                    </View>
                    <Text style={s.detailLabel}>Address</Text>
                    <Text style={[s.detailValue, { maxWidth: '55%', textAlign: 'right' }]} numberOfLines={2}>
                      {receipt.address}
                    </Text>
                  </View>
                ) : null}

                {/* Owner */}
                {receipt.ownerName ? (
                  <View style={s.detailRow}>
                    <View style={s.detailIconWrap}>
                      <FontAwesome5 name="user" size={12} color={C.rowIcon} />
                    </View>
                    <Text style={s.detailLabel}>Owner</Text>
                    <Text style={s.detailValue}>{receipt.ownerName}</Text>
                  </View>
                ) : null}

                {/* Date */}
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <FontAwesome5 name="calendar-alt" size={12} color={C.rowIcon} />
                  </View>
                  <Text style={s.detailLabel}>Date</Text>
                  <Text style={s.detailValue}>{formatDate(receipt.date)}</Text>
                </View>

                {/* Orderbooker */}
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <FontAwesome5 name="id-badge" size={12} color={C.rowIcon} />
                  </View>
                  <Text style={s.detailLabel}>Orderbooker</Text>
                  <Text style={s.detailValue}>{receipt.orderbookerName}</Text>
                </View>
              </View>

              {/* ── Balance Box ── */}
              <View style={s.balanceBox}>
                {/* Opening Balance */}
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Opening Balance</Text>
                  <Text style={s.balanceAmountWhite}>{formatPKRFull(receipt.openingBalance)}</Text>
                </View>

                {/* Payment Received */}
                <View style={[s.balanceRow, { paddingVertical: 10 }]}>
                  <Text style={s.balanceLabel}>Payment Received</Text>
                  <Text style={s.balanceAmountTeal}>{formatPKRFull(receipt.paymentAmount)}</Text>
                </View>

                {/* Divider inside balance box */}
                <View style={s.balanceInnerDivider} />

                {/* Remaining Balance — biggest, boldest */}
                <View style={[s.balanceRow, { paddingVertical: 6 }]}>
                  <Text style={s.remainingLabel}>Remaining Balance</Text>
                  <Text style={[
                    s.remainingAmount,
                    { color: receipt.remainingBalance > 0 ? C.yellow : C.successGreen },
                  ]}>
                    {formatPKRFull(receipt.remainingBalance)}
                  </Text>
                </View>
              </View>

              {/* ── Thank You ── */}
              <View style={s.thankSection}>
                <View style={s.checkCircle}>
                  <MaterialIcons name="check" size={14} color={C.teal} />
                </View>
                <Text style={s.thankText}>Thank you for your Payment!</Text>
              </View>

              {/* ── Urdu Footer ── */}
              <View style={s.footerSection}>
                <Text style={s.footerUrdu}>
                  اگر آپ کو بلنس میں کسی قسم کا اختلاف ہو تو ڈسٹریبیوٹر سے رابطہ کریں
                </Text>
                {receipt.transactionId ? (
                  <Text style={s.footerTxn}>Txn: {receipt.transactionId}</Text>
                ) : null}
              </View>

            </View>
          </ScrollView>

          {/* ── Close Button ── */}
          <View style={s.actionBar}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="check" size={18} color={C.closeBtnText} />
              <Text style={s.closeBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.darkBlue,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: C.teal + '30',
  },

  // ── Undo ──
  undoSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: C.deepBlue,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.yellow + '30',
  },
  undoProgressBar: { height: 3, backgroundColor: C.yellow },
  undoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  undoText: { fontSize: 11, color: C.white50 },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.yellow + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  undoBtnText: { fontSize: 12, fontWeight: '700', color: C.yellow },

  // ── Scroll ──
  scroll: { flex: 1, marginHorizontal: 16, marginTop: 8 },
  card: {
    backgroundColor: C.deepBlue,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.white10,
  },

  // ── Header ──
  header: {
    backgroundColor: C.darkBlue,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bankIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.teal + '40',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: C.white50,
    letterSpacing: 2,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.pillBg,
    borderWidth: 1,
    borderColor: C.pillBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.teal,
    letterSpacing: 0.3,
  },
  headerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: C.divider,
    marginTop: 14,
  },

  // ── Detail Rows ──
  detailsSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  detailIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: C.white50,
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    color: C.white,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // ── Balance Box ──
  balanceBox: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: C.balanceBox,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.white10,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: C.white70,
    fontWeight: '500',
  },
  balanceAmountWhite: {
    fontSize: 14,
    color: C.white,
    fontWeight: '700',
  },
  balanceAmountTeal: {
    fontSize: 15,
    color: C.teal,
    fontWeight: '800',
  },
  balanceInnerDivider: {
    height: 1,
    backgroundColor: C.white20,
    marginVertical: 4,
  },
  remainingLabel: {
    fontSize: 13,
    color: C.white,
    fontWeight: '700',
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // ── Thank You ──
  thankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.teal + '50',
  },
  thankText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.teal,
  },

  // ── Footer ──
  footerSection: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    marginHorizontal: 16,
  },
  footerUrdu: {
    fontSize: 10,
    color: C.white50,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '700',
  },
  footerTxn: {
    fontSize: 9,
    color: C.white50,
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // ── Close Button ──
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.closeBtn,
    borderRadius: 14,
    height: 50,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.closeBtnText,
  },
});
