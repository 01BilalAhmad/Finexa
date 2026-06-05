import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { useRoute } from '@/hooks/useRoute';
import { StorageService } from '@/services/storage';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull, getInitials } from '@/utils/format';
import { CompanySelector } from '@/components/layout/CompanySelector';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, selectedCompany, logout, updateUser } = useAuth();
  const { shops, todayTotal } = useShops();
  const { activeRoute, isRouteActive } = useRoute();

  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [logoutModal, setLogoutModal] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function savePhone() {
    if (!phone.trim()) return;
    updateUser({ phone: phone.trim() });
    setEditingPhone(false);
  }

  async function handleChangePIN() {
    router.push('/pin-setup');
  }

  async function handleClearPIN() {
    Alert.alert('Clear PIN', 'Remove PIN protection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await StorageService.clearPin(); Alert.alert('PIN Removed'); }
      }
    ]);
  }

  if (!user) return null;

  const todayShops = shops.length;
  const monthTotal = 145000; // mocked

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <CompanySelector />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <Text style={styles.heroName}>{user.name}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.roleBadge}>
              <MaterialIcons name="badge" size={11} color={Colors.primaryLight} />
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
            {selectedCompany && (
              <View style={styles.companyBadge}>
                <MaterialIcons name="business" size={11} color={Colors.textMuted} />
                <Text style={styles.companyBadgeText}>{selectedCompany.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <MaterialIcons name="trending-up" size={20} color={Colors.success} />
            <Text style={styles.kpiValue}>{formatPKRFull(monthTotal)}</Text>
            <Text style={styles.kpiLabel}>Month Recovery</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialIcons name="today" size={20} color={Colors.primary} />
            <Text style={styles.kpiValue}>{formatPKRFull(todayTotal)}</Text>
            <Text style={styles.kpiLabel}>Today</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialIcons name="store" size={20} color={Colors.warning} />
            <Text style={styles.kpiValue}>{todayShops}</Text>
            <Text style={styles.kpiLabel}>Shops</Text>
          </View>
        </View>

        {/* Route Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Status</Text>
          <View style={styles.routeStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: isRouteActive ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.statusText}>
              {isRouteActive ? 'Route Active' : activeRoute?.isEnded ? 'Route Ended Today' : 'No Active Route'}
            </Text>
            {activeRoute && (
              <View style={styles.routeId}>
                <Text style={styles.routeIdText}>
                  {activeRoute.isLocal ? 'Local ID' : 'Server Synced'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>{user.username}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Phone</Text>
            {editingPhone ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.textMuted}
                />
                <Pressable onPress={savePhone} style={{ padding: 4 }}>
                  <MaterialIcons name="check" size={16} color={Colors.success} />
                </Pressable>
                <Pressable onPress={() => setEditingPhone(false)} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={16} color={Colors.danger} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.editRow}>
                <Text style={styles.detailValue}>{user.phone || 'Not set'}</Text>
                <Pressable onPress={() => setEditingPhone(true)}>
                  <MaterialIcons name="edit" size={14} color={Colors.textMuted} />
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="verified-user" size={16} color={Colors.success} />
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{user.status}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="business" size={16} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>Companies</Text>
            <Text style={styles.detailValue}>{user.companies.length}</Text>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Pressable onPress={handleChangePIN} style={styles.menuItem}>
            <MaterialIcons name="lock" size={18} color={Colors.primary} />
            <Text style={styles.menuLabel}>Set / Change PIN</Text>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={handleClearPIN} style={styles.menuItem}>
            <MaterialIcons name="lock-open" size={18} color={Colors.warning} />
            <Text style={styles.menuLabel}>Clear PIN Protection</Text>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* Companies */}
        {user.companies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Companies</Text>
            {user.companies.map(c => (
              <View key={c.id} style={styles.companyItem}>
                <View style={styles.companyIcon}>
                  <MaterialIcons name="business" size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.companyName}>{c.name}</Text>
                  {c.distributorPhone && (
                    <Text style={styles.companyPhone}>{c.distributorPhone}</Text>
                  )}
                </View>
                {selectedCompany?.id === c.id && (
                  <View style={styles.activeCompanyDot}>
                    <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Logout */}
        <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
          <MaterialIcons name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>Finexa v1.0 · Al-Falah Credit System</Text>
      </ScrollView>

      {/* Logout Confirm Modal */}
      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialIcons name="logout" size={36} color={Colors.danger} style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSub}>All local data will be cleared. Make sure pending recoveries are synced.</Text>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setLogoutModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleLogout} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
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
  heroCard: {
    backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm, borderWidth: 2, borderColor: Colors.primary,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
  heroName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  heroBadgeRow: { flexDirection: 'row', gap: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  roleBadgeText: { fontSize: FontSize.xs, color: Colors.primaryLight, fontWeight: FontWeight.medium },
  companyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  companyBadgeText: { fontSize: FontSize.xs, color: Colors.textMuted },
  kpiRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: Spacing.sm },
  kpiCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  kpiValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  kpiLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  section: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  routeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  routeId: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  routeIdText: { fontSize: FontSize.xs, color: Colors.textMuted },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  detailValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 4, color: Colors.textPrimary,
    fontSize: FontSize.sm, minWidth: 120,
  },
  activeBadge: { backgroundColor: Colors.successMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  activeBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  companyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  companyIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  companyName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  companyPhone: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  activeCompanyDot: { marginLeft: 'auto' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4,
    backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.danger,
  },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.danger },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 8, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, padding: 12, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, alignItems: 'center' },
  cancelText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  confirmBtn: { flex: 1, padding: 12, backgroundColor: Colors.danger, borderRadius: Radius.md, alignItems: 'center' },
  confirmText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
