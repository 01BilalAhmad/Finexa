import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShops } from '@/hooks/useShops';
import { useAuth } from '@/hooks/useAuth';
import { apiGetLedger } from '@/services/api';
import { Shop, LedgerEntry } from '@/types';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, formatPKR, formatDate } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { CompanySelector } from '@/components/layout/CompanySelector';

export default function LedgerScreen() {
  const insets = useSafeAreaInsets();
  const { shops } = useShops();
  const { selectedCompany } = useAuth();

  const [shopSearch, setShopSearch] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredShops = useMemo(() => {
    if (!shopSearch.trim()) return shops.slice(0, 30);
    const q = shopSearch.toLowerCase();
    return shops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.area.toLowerCase().includes(q)
    );
  }, [shops, shopSearch]);

  async function selectShop(shop: Shop) {
    setSelectorOpen(false);
    setSelectedShop(shop);
    setLedger(null);
    setLoading(true);
    try {
      const data = await apiGetLedger(shop.id, selectedCompany?.id || '');
      setLedger(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ledger</Text>
        <CompanySelector />
      </View>

      {/* Shop Selector */}
      <Pressable onPress={() => setSelectorOpen(true)} style={styles.shopSelector}>
        <MaterialIcons name="store" size={18} color={selectedShop ? Colors.primary : Colors.textMuted} />
        <Text style={[styles.shopSelectorText, selectedShop && { color: Colors.textPrimary }]}>
          {selectedShop ? selectedShop.name : 'Select a shop to view ledger'}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading ledger...</Text>
        </View>
      ) : !selectedShop ? (
        <View style={styles.center}>
          <MaterialIcons name="receipt-long" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Select a Shop</Text>
          <Text style={styles.emptyText}>Choose a shop above to view its complete account ledger</Text>
        </View>
      ) : !ledger ? null : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Shop Info */}
          <View style={styles.ledgerHeader}>
            <Text style={styles.ledgerShopName}>{ledger.shopName}</Text>
            <Text style={styles.ledgerShopSub}>{ledger.ownerName} · {ledger.area}</Text>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderTopColor: Colors.primary }]}>
              <Text style={styles.summaryLabel}>Total Credit</Text>
              <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatPKR(ledger.totalCredit)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: Colors.success }]}>
              <Text style={styles.summaryLabel}>Total Recovery</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{formatPKR(ledger.totalRecovery)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: ledger.balance > 0 ? Colors.warning : Colors.success }]}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={[styles.summaryValue, { color: ledger.balance > 0 ? Colors.warning : Colors.success }]}>
                {formatPKR(ledger.balance)}
              </Text>
            </View>
          </View>

          {/* Transactions */}
          <View style={styles.txnSection}>
            <Text style={styles.txnSectionTitle}>All Transactions</Text>
            {ledger.transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions</Text>
            ) : (
              ledger.transactions.map(txn => (
                <View key={txn.id} style={styles.txnRow}>
                  <View style={[styles.txnIcon, {
                    backgroundColor: txn.type === 'credit' ? Colors.primaryMuted : Colors.successMuted
                  }]}>
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
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.txnAmount, {
                      color: txn.type === 'credit' ? Colors.primary : Colors.success
                    }]}>
                      {txn.type === 'credit' ? '+' : '-'}{formatPKR(txn.amount)}
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
      )}

      {/* Shop Selector Modal */}
      <Modal visible={selectorOpen} animationType="slide" onRequestClose={() => setSelectorOpen(false)}>
        <View style={[styles.selectorModal, { paddingTop: insets.top }]}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>Select Shop</Text>
            <Pressable onPress={() => setSelectorOpen(false)}>
              <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.selectorSearch}>
            <MaterialIcons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.selectorInput}
              value={shopSearch}
              onChangeText={setShopSearch}
              placeholder="Search by name, owner, area..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredShops}
            keyExtractor={s => s.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => selectShop(item)} style={({ pressed }) => [styles.shopItem, pressed && { opacity: 0.8 }]}>
                <View style={styles.shopItemIcon}>
                  <MaterialIcons name="store" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopItemName}>{item.name}</Text>
                  <Text style={styles.shopItemSub}>{item.ownerName} · {item.area}</Text>
                </View>
                <Text style={styles.shopItemBalance}>{formatPKR(item.balance)}</Text>
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  shopSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  shopSelectorText: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  ledgerHeader: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ledgerShopName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ledgerShopSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10,
    borderTopWidth: 2, borderWidth: 1, borderColor: Colors.border,
  },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  txnSection: { padding: Spacing.md },
  txnSectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  txnRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  txnIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  txnType: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  txnDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  txnDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  txnAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  selectorModal: { flex: 1, backgroundColor: Colors.bg },
  selectorHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selectorTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  selectorSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  selectorInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  shopItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  shopItemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  shopItemName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  shopItemSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  shopItemBalance: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
});
