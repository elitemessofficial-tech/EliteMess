import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@descope/react-native-sdk';
import { supabase } from '../../src/services/supabase';
import Loader from '../../components/Loader';
import envBypass from '../../src/config/env_bypass.json';

const isSpecialOwnerNumber = (phoneStr: string) => {
  const envVal = envBypass.EXPO_PUBLIC_OWNER_NUMBERS;
  const numbers = envVal.split(',').map(n => n.trim().replace(/\D/g, ''));
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return numbers.some(n => cleanPhone.endsWith(n) && n.length >= 5);
};

export default function OwnerLayout() {
  const router = useRouter();
  const { session } = useSession();
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

        // 1. VIP bypass active check
        const isVipActive = await AsyncStorage.getItem('vip_session_active');
        const selectedRole = await AsyncStorage.getItem('user_selected_role');
        if (isVipActive === 'true' && selectedRole === 'owner') {
          if (isMounted) setAuthorized(true);
          return;
        }

        // 2. Demo role check
        const demoRole = await AsyncStorage.getItem('demo_role');
        if (demoRole === 'owner') {
          if (isMounted) setAuthorized(true);
          return;
        }

        // 3. Authenticated session check
        if (session) {
          const uid = session.user.userId;
          const phone = session.user.phone || '';

          if (phone && isSpecialOwnerNumber(phone)) {
            // Verify if owner selection was chosen
            if (selectedRole === 'owner') {
              if (isMounted) setAuthorized(true);
              return;
            }
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single();

          if (profile && profile.role === 'owner') {
            if (isMounted) setAuthorized(true);
            return;
          }
        }

        // Default to not authorized
        if (isMounted) {
          setAuthorized(false);
          router.replace('/(auth)/login');
        }
      } catch (e) {
        console.error('Owner route guard error:', e);
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
      <Stack.Screen name="owner_dashboard" />
    </Stack>
  );
}
