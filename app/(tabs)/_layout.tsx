import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useShops } from '@/hooks/useShops';
import { StorageService } from '@/services/storage';
import { PinLockOverlay } from '@/components/feature/PinScreen';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, user, selectedCompany, logout } = useAuth();
  const { loadShops, restoreShopState } = useShops();
  const [pinLocked, setPinLocked] = useState(false);
  const [pinChecked, setPinChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && selectedCompany) {
      loadShops(selectedCompany.id, user?.id, user?.allRoutesAccess);
      restoreShopState();
      checkPin();
    }
  }, [isAuthenticated, selectedCompany?.id]);

  async function checkPin() {
    const pin = await StorageService.getPin();
    if (pin) setPinLocked(true);
    setPinChecked(true);
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const tabBarStyle = {
    height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  };

  if (isLoading || !pinChecked) return null;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Route',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="route" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="map" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="ledger"
          options={{
            title: 'Ledger',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt-long" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>

      <PinLockOverlay
        visible={pinLocked}
        onUnlock={() => setPinLocked(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
