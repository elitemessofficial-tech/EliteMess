import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function EntrypointIndex() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
        // Enforce a minimum load time of 5 seconds to showcase the premium loading screen
        const minDelay = new Promise(resolve => setTimeout(resolve, 4000));

        const determineRoute = async () => {
          const demoRole = await AsyncStorage.getItem('demo_role');
          if (demoRole) {
            if (demoRole === 'customer') return '/(customer)/branches';
            if (demoRole === 'owner') return '/(owner)/owner_dashboard';
            if (demoRole === 'rider') return '/(rider)/rider_dashboard';
          }

          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            return '/(auth)/login';
          }

          // Fetch user profile to determine role-based redirection
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (error || !profile) {
            await supabase.auth.signOut();
            return '/(auth)/login';
          }

          // Role-based route redirection
          switch (profile.role) {
            case 'customer':
              return '/(customer)/branches';
            case 'owner':
              return '/(owner)/owner_dashboard';
            case 'rider':
              return '/(rider)/rider_dashboard';
            default:
              await supabase.auth.signOut();
              return '/(auth)/login';
          }
        };

        const [targetRoute] = await Promise.all([determineRoute(), minDelay]);
        router.replace(targetRoute as any);
      } catch (e) {
        console.error('Error during role routing:', e);
        router.replace('/(auth)/login');
      }
    };

    checkSessionAndRole();
  }, [router]);

  return (
    <LinearGradient
      colors={['#0A0A08', '#181814', '#070705']}
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
            <Image
              source={require('../assets/images/hotelbet.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Brand details */}
        <Text style={styles.brandTitle}>HOTEL BET</Text>
        <Text style={styles.brandSubtitle}>LUXURY DINING & DELIVERY</Text>

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
        <Text style={styles.text}>Initializing premium services...</Text>
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
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  logoInnerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E1E1A',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
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
    color: '#D4AF37',
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
