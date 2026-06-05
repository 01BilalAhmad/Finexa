import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'outline';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary: { bg: Colors.primary, text: '#fff' },
  success: { bg: Colors.success, text: '#fff' },
  danger: { bg: Colors.danger, text: '#fff' },
  ghost: { bg: 'transparent', text: Colors.textSecondary },
  outline: { bg: 'transparent', border: Colors.border, text: Colors.textPrimary },
};

export function Button({
  label, onPress, variant = 'primary', loading = false,
  disabled = false, fullWidth = false, size = 'md', style, textStyle,
}: ButtonProps) {
  const vs = VARIANT_STYLES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: vs.bg },
        vs.border ? { borderWidth: 1, borderColor: vs.border } : null,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        fullWidth && styles.full,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <Text style={[styles.text, { color: vs.text }, size === 'sm' && styles.textSm, size === 'lg' && styles.textLg, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sm: { paddingHorizontal: Spacing.sm, paddingVertical: 7, minHeight: 36 },
  lg: { paddingHorizontal: Spacing.lg, paddingVertical: 15, minHeight: 52 },
  full: { width: '100%' },
  disabled: { opacity: 0.5 },
  text: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  textSm: { fontSize: FontSize.sm },
  textLg: { fontSize: FontSize.lg },
});
