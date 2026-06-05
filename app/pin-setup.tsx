import React from 'react';
import { router } from 'expo-router';
import { PinScreen } from '@/components/feature/PinScreen';
import { Colors } from '@/constants/theme';
import { View, StatusBar } from 'react-native';

export default function PinSetupPage() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <PinScreen mode="setup" onSuccess={() => router.back()} />
    </View>
  );
}
