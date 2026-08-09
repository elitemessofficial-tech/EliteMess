import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ThemeProvider, useAppTheme } from '../src/context/ThemeContext';
import { TokenProvider } from '../src/context/TokenContext';
import { AuthProvider } from '@descope/react-native-sdk';

function RootLayoutInner() {
  const { isDark } = useAppTheme();

  // Liquid glass color configuration
  const theme = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    headerBg: isDark ? 'rgba(12, 18, 16, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    headerText: isDark ? '#F8FAFC' : '#0F172A',
    headerBorder: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)',
    statusBar: isDark ? 'light-content' : 'dark-content',
  };

  return (
    <>
      <StatusBar barStyle={theme.statusBar as any} translucent={true} backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.bg,
          },
          animation: 'slide_from_right',
        }}
      >
        {/* Entry / Redirect root */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* Auth Group */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        
        {/* Customer View Layout */}
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        
        {/* Owner View Layout */}
        <Stack.Screen name="(owner)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const descopeProjectId = process.env.EXPO_PUBLIC_DESCOPE_PROJECT_ID || 'P3GOuYyRSvFn6eKacCsTAkE5QFhF';
  return (
    <SafeAreaProvider>
      <AuthProvider projectId={descopeProjectId}>
        <ThemeProvider>
          <TokenProvider>
            <RootLayoutInner />
          </TokenProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
