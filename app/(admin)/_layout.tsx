import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loader from '../../components/Loader';
import envBypass from '../../src/config/env_bypass.json';

const isVipNumber = (phoneStr: string) => {
  const vipVal = envBypass.EXPO_PUBLIC_VIP_NUMBER || '65244256';
  const cleanVip = vipVal.replace(/\D/g, '');
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return cleanPhone.endsWith(cleanVip) && cleanVip.length >= 5;
};

export default function AdminLayout() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const isLogout = await AsyncStorage.getItem('explicit_logout');
        if (isLogout === 'true') {
          if (isMounted) {
            setAuthorized(false);
            router.replace('/(auth)/login');
          }
          return;
        }

        // 1. VIP session active check
        const isVipActive = await AsyncStorage.getItem('vip_session_active');
        const userPhone = (await AsyncStorage.getItem('user_phone')) || '';

        if (isVipActive === 'true' || isVipNumber(userPhone)) {
          if (isMounted) setAuthorized(true);
          return;
        }

        // Unauthorized
        if (isMounted) {
          setAuthorized(false);
          router.replace('/(auth)/login');
        }
      } catch (e) {
        console.error('Admin route guard error:', e);
        if (isMounted) {
          setAuthorized(false);
          router.replace('/(auth)/login');
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

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
      <Stack.Screen name="admin_dashboard" />
    </Stack>
  );
}
