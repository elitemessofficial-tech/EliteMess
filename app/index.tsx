import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';

export default function EntrypointIndex() {
  const router = useRouter();

  useEffect(() => {
    // Check local supabase session or local demo bypass
    const checkSessionAndRole = async () => {
      try {
        const demoRole = await AsyncStorage.getItem('demo_role');
        if (demoRole) {
          if (demoRole === 'customer') {
            router.replace('/(customer)/branches');
            return;
          } else if (demoRole === 'owner') {
            router.replace('/(owner)/owner_dashboard');
            return;
          } else if (demoRole === 'rider') {
            router.replace('/(rider)/rider_dashboard');
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // If no session exists, redirect to auth login screen
          router.replace('/(auth)/login');
          return;
        }

        // Fetch user profile to determine role-based redirection
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          // If profile fetch fails, logout session and force login
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
          return;
        }

        // Role-based route redirection
        switch (profile.role) {
          case 'customer':
            router.replace('/(customer)/branches');
            break;
          case 'owner':
            router.replace('/(owner)/owner_dashboard');
            break;
          case 'rider':
            router.replace('/(rider)/rider_dashboard');
            break;
          default:
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
        }
      } catch (e) {
        console.error('Error during role routing:', e);
        router.replace('/(auth)/login');
      }
    };

    checkSessionAndRole();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E11D48" />
      <Text style={styles.text}>Initializing Hotel Bet Delivery...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
});
