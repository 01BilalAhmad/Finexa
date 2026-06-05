import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageService } from '@/services/storage';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

interface PinScreenProps {
  mode: 'setup' | 'verify';
  onSuccess: () => void;
  onForceLogout?: () => void;
}

export function PinScreen({ mode, onSuccess, onForceLogout }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleKey(key: string) {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const newPin = pin + key;
    setPin(newPin);
    if (newPin.length === 4) handleComplete(newPin);
  }

  async function handleComplete(p: string) {
    setError('');
    if (mode === 'setup') {
      if (step === 'enter') {
        setConfirmPin(p);
        setPin('');
        setStep('confirm');
      } else {
        if (p === confirmPin) {
          await StorageService.savePin(p);
          onSuccess();
        } else {
          triggerError('PINs do not match. Try again.');
          setStep('enter');
          setConfirmPin('');
        }
      }
    } else {
      const storedPin = await StorageService.getPin();
      if (p === storedPin) {
        onSuccess();
      } else {
        triggerError('Incorrect PIN');
      }
    }
  }

  function triggerError(msg: string) {
    setError(msg);
    setPin('');
    setShake(true);
    Vibration.vibrate(200);
    setTimeout(() => setShake(false), 500);
  }

  const title = mode === 'setup'
    ? (step === 'enter' ? 'Create PIN' : 'Confirm PIN')
    : 'Enter PIN';
  const sub = mode === 'setup'
    ? (step === 'enter' ? 'Choose a 4-digit PIN to secure your app' : 'Re-enter your PIN to confirm')
    : 'Enter your 4-digit PIN to continue';

  return (
    <View style={styles.root}>
      <View style={styles.lockIcon}>
        <MaterialIcons name="lock" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>

      {/* Dots */}
      <View style={[styles.dotsRow, shake && styles.shake]}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            onPress={() => handleKey(key)}
            disabled={key === '' || pin.length >= 4}
            style={({ pressed }) => [
              styles.key,
              key === '' && styles.keyEmpty,
              pressed && key !== '' && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={[styles.keyText, key === '⌫' && { color: Colors.textSecondary }]}>{key}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'verify' && onForceLogout && (
        <Pressable onPress={onForceLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Force Logout</Text>
        </Pressable>
      )}
    </View>
  );
}

interface PinLockOverlayProps {
  visible: boolean;
  onUnlock: () => void;
  onLogout: () => void;
}

export function PinLockOverlay({ visible, onUnlock, onLogout }: PinLockOverlayProps) {
  return (
    <Modal visible={visible} animationType="fade">
      <PinScreen mode="verify" onSuccess={onUnlock} onForceLogout={onLogout} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  lockIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 8 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: Spacing.sm },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  shake: { transform: [{ translateX: 8 }] },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, marginBottom: Spacing.md },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, marginTop: Spacing.lg, justifyContent: 'center' },
  key: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  logoutBtn: { marginTop: Spacing.xl },
  logoutText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: FontWeight.medium },
});
