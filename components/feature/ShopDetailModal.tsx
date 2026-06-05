import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, TextInput, Alert, Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Shop, Transaction, ShopNote, ReceiptData } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { apiGetTransactions, apiUpdateShopPhone } from '@/services/api';
import { StorageService } from '@/services/storage';
import { ReceiptModal } from '@/components/feature/ReceiptModal';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatPKR, formatDate, getCreditUsage } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ShopDetailModalProps {
  visible: boolean;
  shop: Shop | null;
  onClose: () => void;
  onCollect: (shop: Shop) => void;
}

export function ShopDetailModal({ visible, shop, onClose, onCollect }: ShopDetailModalProps) {
  const { user, selectedCompany } = useAuth();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (visible && shop && selectedCompany) {
      loadTransactions();
      loadNote();
      loadLastReceipt();
      setPhone(shop.phone || '');
    }
  }, [visible, shop?.id]);

  async function loadTransactions() {
    if (!shop || !selectedCompany) return;
    setTxnLoading(true);
    try {
      const txns = await apiGetTransactions(shop.id, selectedCompany.id);
      setTransactions(txns);
    } catch { /* ignore */ }
    finally { setTxnLoading(false); }
  }

  async function loadNote() {
    if (!shop) return;
    const notes = await StorageService.getShopNotes();
    setNote(notes[shop.id]?.text || '');
  }

  async function saveNote() {
    if (!shop) return;
    if (note.trim()) await StorageService.saveShopNote(shop.id, note.trim());
    else await StorageService.deleteShopNote(shop.id);
    setEditingNote(false);
  }

  async function loadLastReceipt() {
    if (!shop) return;
    const receipts = await StorageService.getLastReceipts();
    setLastReceipt(receipts[shop.id] || null);
  }

  async function savePhone() {
    if (!shop || !phone.trim()) return;
    setPhoneSaving(true);
    try {
      await apiUpdateShopPhone(shop.id, phone.trim());
      setEditingPhone(false);
    } catch { Alert.alert('Error', 'Failed to update phone'); }
    finally { setPhoneSaving(false); }
  }

  if (!shop) return null;

  const creditUsage = getCreditUsage(shop.balance, shop.creditLimit);
  const usagePct = Math.min(creditUsage * 100, 100);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>
            <Text style={styles.headerSub}>{shop.area}</Text>
          </View>
          <Pressable onPress={() => onCollect(shop)} style={styles.collectBtn}>
            <MaterialIcons name="payments" size={14} color="#fff" />
            <Text style={styles.collectBtnText}>Collect</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Balance Cards */}
          <View style={styles.section}>
            <View style={styles.balanceGrid}>
              <View style={styles.balanceCard}>
                <Text style={styles.balLabel}>Outstanding</Text>
                <Text style={styles.balAmount}>{formatPKRFull(shop.balance)}</Text>
              </View>
              <View style={styles.balanceCard}>
                <Text style={styles.balLabel}>Credit Limit</Text>
                <Text style={styles.balAmountSec}>{formatPKRFull(shop.creditLimit)}</Text>
              </View>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Credit Usage: {usagePct.toFixed(1)}%</Text>
              <Text style={styles.usagePct}>
                {formatPKR(shop.balance)} / {formatPKR(shop.creditLimit)}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${usagePct}%` as any,
                backgroundColor: usagePct >= 100 ? Colors.danger : usagePct >= 90 ? Colors.warning : Colors.primary,
              }]} />
            </View>
          </View>

          {/* Owner & Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Details</Text>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={16} color={Colors.textMuted} />
              <Text style={styles.detailText}>{shop.ownerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={16} color={Colors.textMuted} />
              <Text style={styles.detailText}>{shop.address || shop.area}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={16} color={Colors.textMuted} />
              {editingPhone ? (
                <View style={styles.editPhoneRow}>
                  <TextInput
                    style={styles.phoneInput} value={phone} onChangeText={setPhone}
                    keyboardType="phone-pad" placeholderTextColor={Colors.textMuted}
                  />
                  <Pressable onPress={savePhone} disabled={phoneSaving} style={styles.saveBtn}>
                    {phoneSaving ? <ActivityIndicator size="small" color={Colors.success} /> : <MaterialIcons name="check" size={16} color={Colors.success} />}
                  </Pressable>
                  <Pressable onPress={() => setEditingPhone(false)}><MaterialIcons name="close" size={16} color={Colors.danger} /></Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.detailText}>{shop.phone || 'No phone'}</Text>
                  <Pressable onPress={() => setEditingPhone(true)}>
                    <MaterialIcons name="edit" size={14} color={Colors.textMuted} />
                  </Pressable>
                  {shop.phone && (
                    <>
                      <Pressable onPress={() => Linking.openURL(`sms:${shop.phone}`)}>
                        <MaterialIcons name="sms" size={16} color={Colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => Linking.openURL(`whatsapp://send?phone=92${shop.phone?.replace(/^0/, '')}`)}>
                        <MaterialIcons name="chat" size={16} color={Colors.success} />
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={16} color={Colors.textMuted} />
              <Text style={styles.detailText}>Route: {shop.routeDays.join(', ')}</Text>
            </View>
          </View>

          {/* Last Receipt */}
          {lastReceipt && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Last Receipt</Text>
                <Pressable onPress={() => setShowReceipt(true)} style={styles.viewReceiptBtn}>
                  <MaterialIcons name="receipt-long" size={14} color={Colors.primary} />
                  <Text style={styles.viewReceiptBtnText}>View Receipt</Text>
                </Pressable>
              </View>
              <View style={styles.lastReceiptPreview}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={[styles.detailText, { color: Colors.success, fontWeight: FontWeight.bold }]}>{formatPKRFull(lastReceipt.paymentAmount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remaining</Text>
                  <Text style={styles.detailText}>{formatPKRFull(lastReceipt.remainingBalance)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailText}>{formatDate(lastReceipt.date)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Note */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Pressable onPress={() => setEditingNote(!editingNote)}>
                <MaterialIcons name={editingNote ? 'check' : 'edit'} size={16} color={Colors.primary} />
              </Pressable>
            </View>
            {editingNote ? (
              <>
                <TextInput
                  style={styles.noteInput} value={note} onChangeText={setNote}
                  placeholder="Add note about this shop..." placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <Pressable onPress={saveNote} style={styles.saveNoteBtn}>
                  <Text style={styles.saveNoteBtnText}>Save Note</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.noteText}>{note || 'No notes added'}</Text>
            )}
          </View>

          {/* Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {txnLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions found</Text>
            ) : (
              transactions.slice(0, 8).map(txn => (
                <View key={txn.id} style={styles.txnRow}>
                  <View style={[styles.txnIcon, { backgroundColor: txn.type === 'credit' ? Colors.primaryMuted : Colors.successMuted }]}>
                    <MaterialIcons
                      name={txn.type === 'credit' ? 'arrow-downward' : 'arrow-upward'}
                      size={14}
                      color={txn.type === 'credit' ? Colors.primary : Colors.success}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnType}>{txn.type === 'credit' ? 'Credit' : 'Recovery'}</Text>
                    <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                    {txn.description ? <Text style={styles.txnDesc}>{txn.description}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={[styles.txnAmount, { color: txn.type === 'credit' ? Colors.primary : Colors.success }]}>
                      {formatPKR(txn.amount)}
                    </Text>
                    <Badge
                      label={txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      variant={txn.status === 'approved' ? 'success' : txn.status === 'pending' ? 'warning' : 'danger'}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Receipt Modal */}
        <ReceiptModal
          visible={showReceipt}
          receipt={lastReceipt}
          onClose={() => setShowReceipt(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  collectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.md,
  },
  collectBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: '#fff' },
  section: {
    margin: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  balanceGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  balanceCard: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: 10 },
  balLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 3 },
  balAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  balAmountSec: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  usagePct: { fontSize: FontSize.xs, color: Colors.textMuted },
  progressTrack: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  detailText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  editPhoneRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: 6, color: Colors.textPrimary, fontSize: FontSize.sm,
  },
  saveBtn: { padding: 4 },
  noteInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: 10, color: Colors.textPrimary, fontSize: FontSize.sm, minHeight: 60,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  noteText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  saveNoteBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, padding: 8, alignItems: 'center' },
  saveNoteBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },
  txnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txnIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txnType: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  txnDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  txnDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  txnAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  viewReceiptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  viewReceiptBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  detailLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium, minWidth: 80 },
  lastReceiptPreview: { gap: 2 },
});
