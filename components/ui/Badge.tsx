import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'primary' | 'purple' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successMuted, text: Colors.success },
  warning: { bg: Colors.warningMuted, text: Colors.warning },
  danger: { bg: Colors.dangerMuted, text: Colors.danger },
  primary: { bg: Colors.primaryMuted, text: Colors.primaryLight },
  purple: { bg: Colors.purpleMuted, text: Colors.purple },
  muted: { bg: Colors.surfaceElevated, text: Colors.textMuted },
};

export function Badge({ label, variant = 'primary', size = 'sm' }: BadgeProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <View style={[styles.base, { backgroundColor: s.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: s.text }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  textMd: { fontSize: FontSize.sm },
});
