import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet,
  FlatList, TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { Company } from '@/types';

interface CompanySelectorProps {
  onSelect?: (company: Company) => void;
}

export function CompanySelector({ onSelect }: CompanySelectorProps) {
  const { user, selectedCompany, setSelectedCompany } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || user.companies.length < 2) return null;

  const handleSelect = async (company: Company) => {
    await setSelectedCompany(company);
    onSelect?.(company);
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.pill}>
        <MaterialIcons name="business" size={12} color={Colors.primaryLight} />
        <Text style={styles.pillText} numberOfLines={1}>{selectedCompany?.name || 'Select Company'}</Text>
        <MaterialIcons name="arrow-drop-down" size={14} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Company</Text>
            {user.companies.map(c => (
              <TouchableOpacity key={c.id} style={styles.item} onPress={() => handleSelect(c)}>
                <View style={styles.radio}>
                  {selectedCompany?.id === c.id && <View style={styles.radioInner} />}
                </View>
                <View>
                  <Text style={styles.itemName}>{c.name}</Text>
                  {c.distributorPhone ? (
                    <Text style={styles.itemSub}>{c.distributorPhone}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160,
  },
  pillText: { fontSize: FontSize.xs, color: Colors.primaryLight, fontWeight: FontWeight.medium, flex: 1 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, width: '100%' },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  itemSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
});
