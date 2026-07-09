import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ThemeProvider, useAppTheme } from '../src/context/ThemeContext';
import { CartProvider } from '../src/context/CartContext';

function RootLayoutInner() {
  const { isDark } = useAppTheme();

  // Liquid glass color configuration
  const theme = {
    bg: isDark ? '#080A0F' : '#F8FAFC',
    headerBg: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
    headerText: isDark ? '#F8FAFC' : '#0F172A',
    headerBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
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
        
        {/* Rider View Layout */}
        <Stack.Screen name="(rider)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CartProvider>
          <RootLayoutInner />
        </CartProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
