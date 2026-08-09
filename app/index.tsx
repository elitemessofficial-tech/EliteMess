import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useSession } from '@descope/react-native-sdk';
import { Utensils } from 'lucide-react-native';

const { width } = Dimensions.get('window');

import envBypass from '../src/config/env_bypass.json';

const isSpecialOwnerNumber = (phoneStr: string) => {
  const envVal = envBypass.EXPO_PUBLIC_OWNER_NUMBERS;
  const numbers = envVal.split(',').map(n => n.trim().replace(/\D/g, ''));
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return numbers.some(n => cleanPhone.endsWith(n) && n.length >= 5);
};

const isVipNumber = (phoneStr: string) => {
  const vipVal = envBypass.EXPO_PUBLIC_VIP_NUMBER || '7777777777';
  const cleanVip = vipVal.replace(/\D/g, '');
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return cleanPhone.endsWith(cleanVip) && cleanVip.length >= 5;
};

export default function EntrypointIndex() {
  const router = useRouter();
  const { session } = useSession();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Loop pulsing animation for logo container
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Check local supabase session or local demo bypass
    const checkSessionAndRole = async () => {
      try {
        const isLogout = await AsyncStorage.getItem('explicit_logout');
        if (isLogout === 'true') {
          if (isMounted) router.replace('/(auth)/login');
          return;
        }

        const minDelay = new Promise(resolve => setTimeout(resolve, 1200));

        const determineRoute = async () => {
          const isLogoutCheck = await AsyncStorage.getItem('explicit_logout');
          if (isLogoutCheck === 'true') {
            return '/(auth)/login';
          }

          const isVipActive = await AsyncStorage.getItem('vip_session_active');
          if (isVipActive === 'true') {
            const selectedRole = await AsyncStorage.getItem('user_selected_role');
            if (selectedRole === 'customer') return '/(customer)/dashboard';
            if (selectedRole === 'owner') return '/(owner)/owner_dashboard';
            if (selectedRole === 'rider') {
              await AsyncStorage.removeItem('user_selected_role');
              return '/(customer)/dashboard';
            }
            return '/(auth)/login';
          }

          if (session) {
            const uid = session.user.userId;
            const phone = session.user.phone || '';

            // Check if special owner phone number
            if (phone && isSpecialOwnerNumber(phone)) {
              const selectedRole = await AsyncStorage.getItem('user_selected_role');
              if (selectedRole === 'customer') {
                return '/(customer)/dashboard';
              } else if (selectedRole === 'owner') {
                return '/(owner)/owner_dashboard';
              }
              if (selectedRole === 'rider') {
                await AsyncStorage.removeItem('user_selected_role');
                return '/(customer)/dashboard';
              }
              return '/(auth)/login';
            }

            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', uid)
              .single();

            const role = profile?.role || 'customer';

            if (role === 'owner') {
              return '/(owner)/owner_dashboard';
            }

            return '/(customer)/dashboard';
          }

          const demoRole = await AsyncStorage.getItem('demo_role');
          if (demoRole) {
            if (demoRole === 'customer') return '/(customer)/dashboard';
            if (demoRole === 'owner') return '/(owner)/owner_dashboard';
            await AsyncStorage.removeItem('demo_role');
            return '/(customer)/dashboard';
          }

          // Clear any leftover/anonymous Supabase session to prevent security bypass
          await supabase.auth.signOut();
          return '/(auth)/login';
        };

        const [targetRoute] = await Promise.all([determineRoute(), minDelay]);
        
        const freshLogoutCheck = await AsyncStorage.getItem('explicit_logout');
        if (freshLogoutCheck === 'true') {
          if (isMounted) router.replace('/(auth)/login');
          return;
        }

        if (isMounted) {
          router.replace(targetRoute as any);
        }
      } catch (e) {
        console.error('Error during role routing:', e);
        if (isMounted) router.replace('/(auth)/login');
      }
    };

    checkSessionAndRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <LinearGradient
      colors={['#080C0E', '#0F1714', '#060A0C']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Pulsing Glowing Logo Container */}
        <Animated.View style={[styles.logoOuterCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoInnerCircle}>
            <Utensils size={42} color="#10B981" />
          </View>
        </Animated.View>

        {/* Brand details */}
        <Text style={styles.brandTitle}>ELITE MESS</Text>
        <Text style={styles.brandSubtitle}>PREMIUM MEAL HOPPING PASS</Text>

        {/* Lottie Loader Illustration */}
        <View style={styles.loaderContainer}>
          <LottieView
            source={require('../assets/images/food_beverage.lottie')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>

        {/* Action text */}
        <Text style={styles.text}>Initializing services...</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoOuterCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  logoInnerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#121A17',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  loaderContainer: {
    height: 70,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lottie: {
    width: 90,
    height: 90,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
