import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatPKRFull } from '@/utils/format';
import { UNDO_WINDOW_MS, SUCCESS_OVERLAY_MS } from '@/constants/config';

interface SuccessOverlayProps {
  visible: boolean;
  amount: number;
  shopName: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function SuccessOverlay({ visible, amount, shopName, onUndo, onDismiss }: SuccessOverlayProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const [undoProgress, setUndoProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
      setUndoProgress(100);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / UNDO_WINDOW_MS) * 100);
        setUndoProgress(remaining);
        if (remaining === 0 && timerRef.current) clearInterval(timerRef.current);
      }, 50);
      dismissRef.current = setTimeout(onDismiss, SUCCESS_OVERLAY_MS);
    } else {
      Animated.timing(scale, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="check" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Recovery Submitted!</Text>
          <Text style={styles.amount}>{formatPKRFull(amount)}</Text>
          <Text style={styles.sub}>{shopName}</Text>
          <Pressable
            onPress={onUndo}
            style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.undoProgress, { width: `${undoProgress}%` as any }]} />
            <View style={styles.undoContent}>
              <MaterialIcons name="undo" size={14} color={Colors.textSecondary} />
              <Text style={styles.undoText}>Undo</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', width: 280,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  amount: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.success, marginBottom: 4 },
  sub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  undoBtn: {
    width: '100%', borderRadius: Radius.md, overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated, height: 36,
  },
  undoProgress: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: Colors.dangerMuted, borderRadius: Radius.md,
  },
  undoContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  undoText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
});
