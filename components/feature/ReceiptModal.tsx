import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator,
  ScrollView, Alert, Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReceiptData } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatDate, formatTime } from '@/utils/format';
import { ShopInfoPrompt } from '@/components/feature/ShopInfoPrompt';
import { generateReceiptHTML } from '@/services/receipt';

interface ReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onUndo?: () => void;
  undoAvailable?: boolean;
}

export function ReceiptModal({ visible, receipt, onClose, onUndo, undoAvailable }: ReceiptModalProps) {
  const receiptRef = useRef<View>(null);
  const [gallerySaved, setGallerySaved] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [whatsApping, setWhatsApping] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showInfoPrompt, setShowInfoPrompt] = useState(false);
  const [updatedReceipt, setUpdatedReceipt] = useState<ReceiptData | null>(null);

  const activeReceipt = updatedReceipt || receipt;

  // Check if shop info is missing when modal opens
  useEffect(() => {
    if (visible && receipt) {
      setUpdatedReceipt(null);
      setGallerySaved(false);
      const missingOwner = !receipt.ownerName || receipt.ownerName.trim() === '';
      const missingPhone = !receipt.shopPhone || receipt.shopPhone.trim() === '';
      if (missingOwner || missingPhone) {
        setShowInfoPrompt(true);
      }
    }
  }, [visible, receipt?.transactionId]);

  // Auto-save to gallery when receipt becomes visible (after info prompt if needed)
  useEffect(() => {
    if (visible && activeReceipt && !showInfoPrompt && !gallerySaved && !savingGallery) {
      // Small delay to let the view render before capturing
      const timer = setTimeout(() => saveToGallery(), 800);
      return () => clearTimeout(timer);
    }
  }, [visible, activeReceipt, showInfoPrompt]);

  async function saveToGallery() {
    if (!receiptRef.current || gallerySaved) return;
    setSavingGallery(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access to save receipt.');
        setSavingGallery(false);
        return;
      }

      // Capture the receipt view as PNG
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Save to gallery
      await MediaLibrary.createAssetAsync(uri);
      setGallerySaved(true);
    } catch (e: any) {
      console.error('Gallery save error:', e);
    } finally {
      setSavingGallery(false);
    }
  }

  async function handleWhatsApp() {
    if (!activeReceipt) return;
    setWhatsApping(true);
    try {
      const r = activeReceipt;
      const dateStr = formatDate(r.date);
      const timeStr = formatTime(r.date);

      const text = [
        `*${r.companyName}*`,
        `Distributor Name: ${r.companyName}`,
        `Distributor No: ${r.distributorPhone || 'N/A'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `*Payment Receipt*`,
        ``,
        `Shop: ${r.shopName}`,
        `Owner: ${r.ownerName || 'N/A'}`,
        `Address: ${r.address || 'N/A'}`,
        `Orderbooker: ${r.orderbookerName}`,
        `Date: ${dateStr} · ${timeStr}`,
        `━━━━━━━━━━━━━━━━━━`,
        `Opening Balance: PKR ${r.openingBalance.toLocaleString('en-PK')}`,
        `Payment: PKR ${r.paymentAmount.toLocaleString('en-PK')}`,
        `*Remaining: PKR ${r.remainingBalance.toLocaleString('en-PK')}*`,
        `━━━━━━━━━━━━━━━━━━`,
        `Txn: ${r.transactionId || 'Pending (offline)'}`,
        ``,
        `Receipt image saved in gallery. Please attach it.`,
        `Thank you for your payment!`,
      ].join('\n');

      const phone = r.shopPhone;
      let whatsappUrl: string;

      if (phone) {
        // Format phone for WhatsApp (remove leading 0, add country code 92)
        const formattedPhone = phone.replace(/^0/, '92').replace(/\s/g, '');
        whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
      } else {
        whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
      }

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to share receipt.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not share via WhatsApp');
    } finally {
      setWhatsApping(false);
    }
  }

  async function handleSMS() {
    if (!activeReceipt) return;
    try {
      const r = activeReceipt;
      const phone = r.shopPhone;
      if (!phone) {
        Alert.alert('No Phone', 'Shop phone number is not available.');
        return;
      }
      const dateStr = formatDate(r.date);
      const text = [
        `${r.companyName} - Payment Receipt`,
        `Shop: ${r.shopName}`,
        `Payment: PKR ${r.paymentAmount.toLocaleString('en-PK')}`,
        `Remaining: PKR ${r.remainingBalance.toLocaleString('en-PK')}`,
        `Date: ${dateStr}`,
        `Txn: ${r.transactionId || 'Pending'}`,
      ].join('\n');

      const smsUrl = `sms:${phone}?body=${encodeURIComponent(text)}`;
      await Linking.openURL(smsUrl);
    } catch (e: any) {
      Alert.alert('Error', 'Could not open SMS app');
    }
  }

  async function handlePrint() {
    if (!activeReceipt) return;
    setPrinting(true);
    try {
      const html = generateReceiptHTML(activeReceipt);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Print Error', e?.message || 'Could not print receipt');
    } finally {
      setPrinting(false);
    }
  }

  function handleInfoDone(updatedInfo: { ownerName?: string; phone?: string }) {
    setShowInfoPrompt(false);
    if (activeReceipt) {
      setUpdatedReceipt({
        ...activeReceipt,
        ownerName: updatedInfo.ownerName || activeReceipt.ownerName,
        shopPhone: updatedInfo.phone || activeReceipt.shopPhone,
      });
    }
  }

  function handleInfoSkip() {
    setShowInfoPrompt(false);
  }

  if (!activeReceipt) return null;

  const dateStr = formatDate(activeReceipt.date);
  const timeStr = formatTime(activeReceipt.date);

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
            <Text style={styles.successAmount}>{formatPKRFull(activeReceipt.paymentAmount)}</Text>

            {/* Gallery Save Status */}
            <View style={styles.galleryStatus}>
              {savingGallery ? (
                <><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.galleryText}>Saving to gallery...</Text></>
              ) : gallerySaved ? (
                <><MaterialIcons name="check-circle" size={16} color={Colors.success} /><Text style={[styles.galleryText, { color: Colors.success }]}>Receipt saved to gallery</Text></>
              ) : (
                <><MaterialIcons name="photo-library" size={16} color={Colors.textMuted} /><Text style={styles.galleryText}>Saving receipt...</Text></>
              )}
            </View>

            {/* ── Receipt Card (captured as image) ────────────────── */}
            <View ref={receiptRef} collapsable={false} style={styles.receiptCaptureArea}>
              <View style={styles.receiptCard}>
                {/* Header — Company */}
                <View style={styles.receiptHeader}>
                  <Text style={styles.companyName}>{activeReceipt.companyName}</Text>
                  <Text style={styles.distLabel}>Distributor Name: <Text style={styles.distPhoneBold}>{activeReceipt.companyName}</Text></Text>
                  <Text style={styles.distLabel}>Distributor No: <Text style={styles.distPhoneBold}>{activeReceipt.distributorPhone || 'N/A'}</Text></Text>
                  <View style={styles.receiptBadge}>
                    <Text style={styles.receiptBadgeText}>PAYMENT RECEIPT</Text>
                  </View>
                </View>

                {/* Shop Details */}
                <View style={styles.receiptBody}>
                  <Text style={styles.shopNameText}>{activeReceipt.shopName}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Owner</Text>
                    <Text style={styles.detailValue}>{activeReceipt.ownerName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{activeReceipt.address || 'N/A'}</Text>
                  </View>
                  {activeReceipt.shopPhone ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Shop Phone</Text>
                      <Text style={styles.detailValue}>{activeReceipt.shopPhone}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Orderbooker</Text>
                    <Text style={styles.detailValue}>{activeReceipt.orderbookerName}</Text>
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
                    <Text style={styles.balValue}>{formatPKRFull(activeReceipt.openingBalance)}</Text>
                  </View>
                  <View style={styles.balRow}>
                    <Text style={[styles.balLabel, { color: Colors.danger }]}>Payment Received</Text>
                    <Text style={[styles.balValue, { color: Colors.danger }]}>- {formatPKRFull(activeReceipt.paymentAmount)}</Text>
                  </View>
                  <View style={[styles.balRow, styles.balRowTotal]}>
                    <Text style={styles.balLabelTotal}>Remaining Balance</Text>
                    <Text style={styles.balValueTotal}>{formatPKRFull(activeReceipt.remainingBalance)}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.receiptFooter}>
                  <Text style={styles.thankYou}>Thank you for your Payment!</Text>
                  <View style={styles.urduBox}>
                    <Text style={styles.urduText}>
                      جب تک آپ کا کریڈٹ لیمٹ 15 ہزار روپے تک ہو گا آپ ہر دن 5 روپے کا سود دے گے{'\n'}
                      جب آپ کا کریڈٹ لیمٹ 15 ہزار روپے سے زیادہ ہو گا تو
                    </Text>
                  </View>
                  <Text style={styles.txnId} numberOfLines={1}>Txn: {activeReceipt.transactionId || 'Pending (offline)'}</Text>
                </View>
              </View>
            </View>

            {/* ── Share Actions ──────────────────────────────────── */}
            <View style={styles.shareSection}>
              <Text style={styles.shareTitle}>Send Receipt</Text>
              <View style={styles.actions}>
                {/* WhatsApp */}
                <Pressable
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={handleWhatsApp}
                  disabled={whatsApping}
                >
                  {whatsApping ? (
                    <ActivityIndicator size="small" color="#25D366" />
                  ) : (
                    <MaterialIcons name="chat" size={22} color="#25D366" />
                  )}
                  <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                </Pressable>

                {/* SMS */}
                <Pressable
                  style={[styles.actionBtn, styles.smsBtn]}
                  onPress={handleSMS}
                >
                  <MaterialIcons name="sms" size={22} color={Colors.primary} />
                  <Text style={[styles.actionBtnText, { color: Colors.primary }]}>SMS</Text>
                </Pressable>

                {/* Print */}
                <Pressable
                  style={[styles.actionBtn, styles.printBtn]}
                  onPress={handlePrint}
                  disabled={printing}
                >
                  {printing ? (
                    <ActivityIndicator size="small" color={Colors.textSecondary} />
                  ) : (
                    <MaterialIcons name="print" size={22} color={Colors.textSecondary} />
                  )}
                  <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Print</Text>
                </Pressable>
              </View>
              <Text style={styles.shareHint}>
                Receipt image saved in gallery — attach it when sending via WhatsApp
              </Text>
            </View>

            {/* Undo */}
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

      {/* Shop Info Prompt — if phone/owner missing, shown AFTER recovery */}
      <ShopInfoPrompt
        visible={showInfoPrompt}
        shop={activeReceipt ? {
          id: activeReceipt.shopId,
          name: activeReceipt.shopName,
          ownerName: activeReceipt.ownerName || '',
          area: '',
          address: activeReceipt.address,
          phone: activeReceipt.shopPhone,
          routeDays: [],
          balance: activeReceipt.openingBalance,
          creditLimit: 0,
          companyBalances: [],
        } : null}
        onDone={handleInfoDone}
        onSkip={handleInfoSkip}
      />
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
    marginBottom: Spacing.sm,
  },

  // Gallery status
  galleryStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.md,
  },
  galleryText: {
    fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium,
  },

  // Receipt capture area (this gets captured as image)
  receiptCaptureArea: {
    width: '100%',
    backgroundColor: Colors.bg,
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
  distLabel: {
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
  urduBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  urduText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  txnId: {
    fontSize: 10, color: Colors.textMuted, marginTop: 4,
  },

  // Share section
  shareSection: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  shareTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary,
    marginBottom: Spacing.sm, textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  whatsappBtn: {
    backgroundColor: 'rgba(37,211,102,0.12)',
    borderColor: '#25D366',
  },
  smsBtn: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  printBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
  },
  shareHint: {
    fontSize: 10, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.sm, lineHeight: 14,
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
