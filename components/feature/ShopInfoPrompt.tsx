import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Shop } from '@/types';
import { useOffline } from '@/hooks/useOffline';
import { apiUpdateShopInfo, apiUpdateShopPhone } from '@/services/api';
import { StorageService } from '@/services/storage';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

interface ShopInfoPromptProps {
  visible: boolean;
  shop: Shop | null;
  onDone: (updatedShop: Shop) => void;
  onSkip: () => void;
}

export function ShopInfoPrompt({ visible, shop, onDone, onSkip }: ShopInfoPromptProps) {
  const { isOnline } = useOffline();
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const missingOwner = !shop?.ownerName || shop.ownerName.trim() === '';
  const missingPhone = !shop?.phone || shop.phone.trim() === '';
  const hasMissing = missingOwner || missingPhone;

  useEffect(() => {
    if (visible && shop) {
      setOwnerName(shop.ownerName || '');
      setPhone(shop.phone || '');
    }
  }, [visible, shop?.id]);

  if (!shop || !hasMissing) return null;

  async function handleSave() {
    if (!shop) return;

    const trimmedOwner = ownerName.trim();
    const trimmedPhone = phone.trim();

    // At least one field should be filled
    if (!trimmedOwner && !trimmedPhone) {
      Alert.alert('Info Required', 'Please add at least the owner name or phone number.');
      return;
    }

    setSaving(true);
    try {
      if (isOnline) {
        await apiUpdateShopInfo(shop.id, {
          ownerName: trimmedOwner || undefined,
          phone: trimmedPhone || undefined,
        });
      } else {
        // Queue for offline sync
        await StorageService.addOfflinePhoneUpdate({
          shopId: shop.id,
          phone: trimmedPhone,
          ownerName: trimmedOwner,
          createdAt: new Date().toISOString(),
        });
      }

      // Update local shop object
      const updatedShop: Shop = {
        ...shop,
        ownerName: trimmedOwner || shop.ownerName,
        phone: trimmedPhone || shop.phone,
      };

      onDone(updatedShop);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save shop info. You can skip and add later.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <MaterialIcons name="person-add" size={28} color={Colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Shop Info Missing</Text>
          <Text style={styles.subtitle}>
            {shop.name} is missing contact details. Please add them for better record keeping.
          </Text>

          {/* Owner Name Input */}
          {missingOwner && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Name</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter owner name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>
          )}

          {/* Phone Input */}
          {missingPhone && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="03XX XXXXXXX"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* Offline hint */}
          {!isOnline && (
            <View style={styles.offlineHint}>
              <MaterialIcons name="cloud-off" size={14} color={Colors.warning} />
              <Text style={styles.offlineText}>Offline — will sync when connected</Text>
            </View>
          )}

          {/* Buttons */}
          <Button
            label={saving ? 'Saving...' : 'Save & Continue'}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          <Pressable onPress={onSkip} style={styles.skipBtn} disabled={saving}>
            <Text style={styles.skipText}>Skip for now</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '88%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  title: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  offlineHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.warningMuted,
    borderRadius: Radius.sm,
    padding: 8,
    marginTop: Spacing.xs,
  },
  offlineText: {
    fontSize: FontSize.xs, color: Colors.warning,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium,
  },
});
