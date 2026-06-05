import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ReceiptData } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatDate, formatTime } from '@/utils/format';
import { printReceipt, shareReceipt, shareReceiptWhatsApp } from '@/services/receipt';

interface ReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onUndo?: () => void;
  undoAvailable?: boolean;
}

export function ReceiptModal({ visible, receipt, onClose, onUndo, undoAvailable }: ReceiptModalProps) {
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [whatsApping, setWhatsApping] = useState(false);

  if (!receipt) return null;

  async function handlePrint() {
    setPrinting(true);
    try {
      await printReceipt(receipt);
    } catch (e: any) {
      Alert.alert('Print Error', e?.message || 'Could not print receipt');
    } finally {
      setPrinting(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      await shareReceipt(receipt);
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Could not share receipt');
    } finally {
      setSharing(false);
    }
  }

  async function handleWhatsApp() {
    setWhatsApping(true);
    try {
      await shareReceiptWhatsApp(receipt);
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Could not share via WhatsApp');
    } finally {
      setWhatsApping(false);
    }
  }

  const dateStr = formatDate(receipt.date);
  const timeStr = formatTime(receipt.date);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Success Icon */}
            <View style={styles.iconCircle}>
              <MaterialIcons name="check" size={28} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Recovery Submitted!</Text>
            <Text style={styles.successAmount}>{formatPKRFull(receipt.paymentAmount)}</Text>

            {/* ── Receipt Card ───────────────────────────── */}
            <View style={styles.receiptCard}>
              {/* Header — Company */}
              <View style={styles.receiptHeader}>
                <Text style={styles.companyName}>{receipt.companyName}</Text>
                <Text style={styles.distPhone}>Distributor: <Text style={styles.distPhoneBold}>{receipt.distributorPhone || 'N/A'}</Text></Text>
                <View style={styles.receiptBadge}>
                  <Text style={styles.receiptBadgeText}>PAYMENT RECEIPT</Text>
                </View>
              </View>

              {/* Shop Details */}
              <View style={styles.receiptBody}>
                <Text style={styles.shopNameText}>{receipt.shopName}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Owner</Text>
                  <Text style={styles.detailValue}>{receipt.ownerName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{receipt.address || 'N/A'}</Text>
                </View>
                {receipt.shopPhone ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Shop Phone</Text>
                    <Text style={styles.detailValue}>{receipt.shopPhone}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Orderbooker</Text>
                  <Text style={styles.detailValue}>{receipt.orderbookerName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date / Time</Text>
                  <Text style={styles.detailValue}>{dateStr} · {timeStr}</Text>
                </View>
              </View>

              {/* Balance Section */}
              <View style={styles.balanceSection}>
                <View style={styles.balRow}>
                  <Text style={styles.balLabel}>Opening Balance</Text>
                  <Text style={styles.balValue}>{formatPKRFull(receipt.openingBalance)}</Text>
                </View>
                <View style={styles.balRow}>
                  <Text style={[styles.balLabel, { color: Colors.danger }]}>Payment Received</Text>
                  <Text style={[styles.balValue, { color: Colors.danger }]}>- {formatPKRFull(receipt.paymentAmount)}</Text>
                </View>
                <View style={[styles.balRow, styles.balRowTotal]}>
                  <Text style={styles.balLabelTotal}>Remaining Balance</Text>
                  <Text style={styles.balValueTotal}>{formatPKRFull(receipt.remainingBalance)}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.thankYou}>Thank you for your payment!</Text>
                <Text style={styles.txnId} numberOfLines={1}>Txn: {receipt.transactionId || 'Pending (offline)'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, styles.printBtn]}
                onPress={handlePrint}
                disabled={printing}
              >
                {printing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="print" size={18} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>Print</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <MaterialIcons name="share" size={18} color={Colors.primary} />
                )}
                <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Share PDF</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, styles.whatsappBtn]}
                onPress={handleWhatsApp}
                disabled={whatsApping}
              >
                {whatsApping ? (
                  <ActivityIndicator size="small" color="#25D366" />
                ) : (
                  <MaterialIcons name="chat" size={18} color="#25D366" />
                )}
                <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
              </Pressable>
            </View>

            {/* Undo Button */}
            {undoAvailable && onUndo && (
              <Pressable onPress={onUndo} style={styles.undoRow}>
                <MaterialIcons name="undo" size={16} color={Colors.textSecondary} />
                <Text style={styles.undoText}>Undo this recovery</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Done Button */}
          <Pressable onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    paddingTop: Spacing.sm,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
    padding: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },

  // Success header
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    marginBottom: 2,
  },
  successAmount: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.success,
    marginBottom: Spacing.lg,
  },

  // Receipt Card
  receiptCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.textPrimary,
  },
  companyName: {
    fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textPrimary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  distPhone: {
    fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2,
  },
  distPhoneBold: {
    fontWeight: FontWeight.bold, color: Colors.textPrimary,
  },
  receiptBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 3,
  },
  receiptBadgeText: {
    fontSize: 10, fontWeight: FontWeight.bold, color: Colors.bg,
    letterSpacing: 1.5,
  },

  // Shop details
  receiptBody: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  shopNameText: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium,
    minWidth: 100,
  },
  detailValue: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    flex: 1, textAlign: 'right',
  },

  // Balance section
  balanceSection: {
    padding: Spacing.md,
  },
  balRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  balLabel: {
    fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium,
  },
  balValue: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary,
  },
  balRowTotal: {
    borderTopWidth: 2, borderTopColor: Colors.textPrimary,
    marginTop: 4, paddingTop: 10,
  },
  balLabelTotal: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary,
  },
  balValueTotal: {
    fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.success,
  },

  // Receipt footer
  receiptFooter: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  thankYou: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary,
  },
  txnId: {
    fontSize: 10, color: Colors.textMuted, marginTop: 4,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  printBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  shareBtn: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  whatsappBtn: {
    backgroundColor: 'rgba(37,211,102,0.12)',
    borderColor: '#25D366',
  },
  actionBtnText: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff',
  },

  // Undo
  undoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.md, paddingVertical: Spacing.xs,
  },
  undoText: {
    fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium,
  },

  // Done
  doneBtn: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneBtnText: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary,
  },
});
