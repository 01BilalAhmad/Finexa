import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator,
  ScrollView, Alert, Linking,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReceiptData } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatDate, formatTime } from '@/utils/format';
import { ShopInfoPrompt } from '@/components/feature/ShopInfoPrompt';
import { generateReceiptHTML } from '@/services/receipt';

// ── Reference Receipt Color Palette ──────────────────────────────────────
const R = {
  bg: '#3F3D9B',              // Royal blue background
  bgDark: '#2E2C7A',          // Darker blue for balance box
  white: '#FFFFFF',
  teal: '#4ECDC4',            // Light teal for highlights
  yellow: '#FFD166',          // Yellow for remaining balance
  gray: '#B8B8D4',            // Muted text on blue
  divider: 'rgba(255,255,255,0.15)',
  iconBg: 'rgba(255,255,255,0.12)',
};

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
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
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

      const text = [
        `*${r.companyName}*`,
        `Distributor No: ${r.distributorPhone || 'N/A'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `*Payment Receipt*`,
        ``,
        `Shop: ${r.shopName}`,
        `Owner: ${r.ownerName || 'N/A'}`,
        `Address: ${r.address || 'N/A'}`,
        `Orderbooker: ${r.orderbookerName}`,
        `Date: ${dateStr}`,
        `━━━━━━━━━━━━━━━━━━`,
        `Opening Balance: Rs. ${r.openingBalance.toLocaleString('en-PK')}`,
        `Payment Received: Rs. ${r.paymentAmount.toLocaleString('en-PK')}`,
        `*Remaining Balance: Rs. ${r.remainingBalance.toLocaleString('en-PK')}*`,
        `━━━━━━━━━━━━━━━━━━`,
        `Txn: ${r.transactionId || 'Pending (offline)'}`,
        ``,
        `Thank you for your Payment!`,
        `Receipt image saved in gallery. Please attach it.`,
      ].join('\n');

      const phone = r.shopPhone;
      let whatsappUrl: string;

      if (phone) {
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
        `Payment: Rs. ${r.paymentAmount.toLocaleString('en-PK')}`,
        `Remaining: Rs. ${r.remainingBalance.toLocaleString('en-PK')}`,
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialIcons name="close" size={22} color={R.gray} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Gallery Save Status */}
            <View style={styles.galleryStatus}>
              {savingGallery ? (
                <><ActivityIndicator size="small" color={R.teal} /><Text style={[styles.galleryText, { color: R.teal }]}>Saving to gallery...</Text></>
              ) : gallerySaved ? (
                <><MaterialIcons name="check-circle" size={16} color={R.teal} /><Text style={[styles.galleryText, { color: R.teal }]}>Receipt saved to gallery</Text></>
              ) : (
                <><MaterialIcons name="photo-library" size={16} color={R.gray} /><Text style={styles.galleryText}>Saving receipt...</Text></>
              )}
            </View>

            {/* ── Receipt Card (captured as image) ────────────────── */}
            <View ref={receiptRef} collapsable={false} style={styles.receiptCaptureArea}>
              <View style={styles.receiptCard}>

                {/* ── HEADER ── */}
                <View style={styles.receiptHeader}>
                  {/* Company Name with icon */}
                  <View style={styles.headerRow}>
                    <MaterialCommunityIcons name="bank" size={22} color={R.white} />
                    <Text style={styles.companyName}>{activeReceipt.companyName}</Text>
                  </View>

                  {/* Shop Name (teal) */}
                  <Text style={styles.shopNameHighlight}>{activeReceipt.shopName}</Text>
                  <Text style={styles.receiptLabel}>Payment Receipt</Text>

                  {/* Distributor No */}
                  <View style={styles.distRow}>
                    <MaterialIcons name="phone" size={16} color={R.teal} />
                    <Text style={styles.distText}>Distributor No: <Text style={styles.distValue}>{activeReceipt.distributorPhone || 'N/A'}</Text></Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* ── SHOP DETAILS ── */}
                <View style={styles.detailsSection}>
                  {/* Shop */}
                  <View style={styles.detailItem}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="store" size={14} color={R.white} />
                    </View>
                    <Text style={styles.detailLabel}>Shop:</Text>
                    <Text style={styles.detailValue}>{activeReceipt.shopName}</Text>
                  </View>

                  {/* Address */}
                  <View style={styles.detailItem}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="location-on" size={14} color={R.white} />
                    </View>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{activeReceipt.address || 'N/A'}</Text>
                  </View>

                  {/* Owner */}
                  <View style={styles.detailItem}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="person" size={14} color={R.white} />
                    </View>
                    <Text style={styles.detailLabel}>Owner:</Text>
                    <Text style={styles.detailValue}>{activeReceipt.ownerName || 'N/A'}</Text>
                  </View>

                  {/* Date */}
                  <View style={styles.detailItem}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="calendar-today" size={14} color={R.white} />
                    </View>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{dateStr}</Text>
                  </View>

                  {/* Orderbooker */}
                  <View style={styles.detailItem}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="badge" size={14} color={R.white} />
                    </View>
                    <Text style={styles.detailLabel}>Orderbooker:</Text>
                    <Text style={styles.detailValue}>{activeReceipt.orderbookerName}</Text>
                  </View>
                </View>

                {/* ── BALANCE BOX ── */}
                <View style={styles.balanceBox}>
                  <View style={styles.balRow}>
                    <Text style={styles.balLabel}>Opening Balance</Text>
                    <Text style={styles.balValue}>Rs. {activeReceipt.openingBalance.toLocaleString('en-PK')}</Text>
                  </View>
                  <View style={styles.balRow}>
                    <Text style={styles.balLabel}>Payment Received</Text>
                    <Text style={[styles.balValue, { color: R.teal, fontWeight: '700' }]}>Rs. {activeReceipt.paymentAmount.toLocaleString('en-PK')}</Text>
                  </View>
                  <View style={[styles.balRow, styles.balRowTotal]}>
                    <Text style={[styles.balLabel, { fontWeight: '700' }]}>Remaining Balance</Text>
                    <Text style={styles.balValueTotal}>Rs. {activeReceipt.remainingBalance.toLocaleString('en-PK')}</Text>
                  </View>
                </View>

                {/* ── THANK YOU ── */}
                <View style={styles.thankSection}>
                  <MaterialIcons name="check-circle" size={18} color={R.teal} />
                  <Text style={styles.thankText}>Thank you for your Payment!</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* ── URDU FOOTER ── */}
                <View style={styles.urduSection}>
                  <Text style={styles.urduText1}>
                    جب تک آپ کا کریڈٹ لیمٹ 15 ہزار روپے تک ہو گا آپ ہر دن 5 روپے کا سود دے گے{'\n'}
                    جب آپ کا کریڈٹ لیمٹ 15 ہزار روپے سے زیادہ ہو گا تو
                  </Text>
                  <Text style={styles.urduText2}>
                    اگر آپ کو بلنس میں کسی قسم کا کوئی فرق محسوس ہوتا ہے تو اوپر دیے گئے نمبر پر لازمی رابطہ کریں شکریہ
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Share Actions ──────────────────────────────────── */}
            <View style={styles.shareSection}>
              <Text style={styles.shareTitle}>Send Receipt</Text>
              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, styles.whatsappBtn]} onPress={handleWhatsApp} disabled={whatsApping}>
                  {whatsApping ? (
                    <ActivityIndicator size="small" color="#25D366" />
                  ) : (
                    <MaterialIcons name="chat" size={22} color="#25D366" />
                  )}
                  <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                </Pressable>

                <Pressable style={[styles.actionBtn, styles.smsBtn]} onPress={handleSMS}>
                  <MaterialIcons name="sms" size={22} color={R.bg} />
                  <Text style={[styles.actionBtnText, { color: R.bg }]}>SMS</Text>
                </Pressable>

                <Pressable style={[styles.actionBtn, styles.printBtn]} onPress={handlePrint} disabled={printing}>
                  {printing ? (
                    <ActivityIndicator size="small" color={R.gray} />
                  ) : (
                    <MaterialIcons name="print" size={22} color={R.gray} />
                  )}
                  <Text style={[styles.actionBtnText, { color: '#555' }]}>Print</Text>
                </Pressable>
              </View>
              <Text style={styles.shareHint}>
                Receipt image saved in gallery — attach it when sending via WhatsApp
              </Text>
            </View>

            {/* Undo */}
            {undoAvailable && onUndo && (
              <Pressable onPress={onUndo} style={styles.undoRow}>
                <MaterialIcons name="undo" size={16} color={R.gray} />
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1A3E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 8,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: 4,
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },

  // Gallery status
  galleryStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
  },
  galleryText: {
    fontSize: 12, color: R.gray, fontWeight: '500',
  },

  // Receipt capture area
  receiptCaptureArea: {
    width: '100%',
  },

  // Receipt Card — BLUE background matching reference
  receiptCard: {
    width: '100%',
    backgroundColor: R.bg,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 16,
  },

  // ── HEADER ──
  receiptHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: R.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopNameHighlight: {
    fontSize: 20,
    fontWeight: '700',
    color: R.teal,
    marginBottom: 2,
  },
  receiptLabel: {
    fontSize: 13,
    color: R.white,
    fontWeight: '500',
    marginBottom: 12,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: R.iconBg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distText: {
    fontSize: 13,
    color: R.gray,
  },
  distValue: {
    fontWeight: '700',
    color: R.white,
    fontSize: 15,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: R.divider,
    marginHorizontal: 20,
  },

  // ── SHOP DETAILS ──
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: R.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: R.gray,
    fontWeight: '500',
    minWidth: 90,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: R.white,
    flex: 1,
    textAlign: 'right',
  },

  // ── BALANCE BOX ──
  balanceBox: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: R.bgDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  balRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  balLabel: {
    fontSize: 14,
    color: R.gray,
    fontWeight: '500',
  },
  balValue: {
    fontSize: 14,
    fontWeight: '700',
    color: R.white,
  },
  balRowTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
    paddingTop: 10,
  },
  balValueTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: R.yellow,
  },

  // ── THANK YOU ──
  thankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  thankText: {
    fontSize: 14,
    fontWeight: '600',
    color: R.teal,
  },

  // ── URDU SECTION ──
  urduSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  urduText1: {
    fontSize: 12,
    color: R.white,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 4,
  },
  urduText2: {
    fontSize: 12,
    color: R.white,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },

  // ── SHARE SECTION ──
  shareSection: {
    width: '100%',
    marginTop: 16,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: R.gray,
    marginBottom: 10,
    textAlign: 'center',
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
    borderRadius: 12,
    borderWidth: 1.5,
  },
  whatsappBtn: {
    backgroundColor: 'rgba(37,211,102,0.15)',
    borderColor: '#25D366',
  },
  smsBtn: {
    backgroundColor: 'rgba(78,205,196,0.15)',
    borderColor: R.teal,
  },
  printBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionBtnText: {
    fontSize: 12, fontWeight: '700',
  },
  shareHint: {
    fontSize: 10, color: R.gray, textAlign: 'center',
    marginTop: 10, lineHeight: 14,
  },

  // Undo
  undoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 12, paddingVertical: 4,
  },
  undoText: {
    fontSize: 12, color: R.gray, fontWeight: '500',
  },

  // Done
  doneBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: R.teal,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16, fontWeight: '700', color: '#1A1A3E',
  },
});
