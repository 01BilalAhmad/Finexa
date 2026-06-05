import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ShopsProvider } from '@/contexts/ShopsContext';
import { RouteProvider } from '@/contexts/RouteContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/constants/theme';

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.splash}>
      <View style={styles.splashContent}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Finexa</Text>
        <Text style={styles.appSub}>Al-Falah Credit System</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SplashScreen onDone={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <ShopsProvider>
          <RouteProvider>
            <OfflineProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="pin-setup" />
              </Stack>
            </OfflineProvider>
          </RouteProvider>
        </ShopsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#070d1a', alignItems: 'center', justifyContent: 'center' },
  splashContent: { alignItems: 'center' },
  splashLogo: { width: 120, height: 120, marginBottom: 16 },
  appName: { fontSize: 32, fontWeight: FontWeight.extrabold, color: '#f1f5f9', letterSpacing: 2 },
  appSub: { fontSize: FontSize.sm, color: '#94a3b8', marginTop: 4 },
});
