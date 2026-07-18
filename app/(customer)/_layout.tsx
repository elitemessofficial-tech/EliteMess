import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@descope/react-native-sdk';
import Loader from '../../components/Loader';

export default function CustomerLayout() {
  const router = useRouter();
  const { session } = useSession();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. VIP bypass active check
        const isVipActive = await AsyncStorage.getItem('vip_session_active');
        const selectedRole = await AsyncStorage.getItem('user_selected_role');
        if (isVipActive === 'true' && selectedRole === 'customer') {
          setAuthorized(true);
          return;
        }

        // 2. Demo role check
        const demoRole = await AsyncStorage.getItem('demo_role');
        if (demoRole === 'customer') {
          setAuthorized(true);
          return;
        }

        // 3. Authenticated session check
        if (session) {
          setAuthorized(true);
          return;
        }

        // Default to not authorized
        setAuthorized(false);
        router.replace('/(auth)/login');
      } catch (e) {
        console.error('Customer route guard error:', e);
        setAuthorized(false);
        router.replace('/(auth)/login');
      }
    };

    checkAuth();
  }, [session]);

  if (authorized === null) {
    return <Loader />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="branches" />
      <Stack.Screen name="account" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
