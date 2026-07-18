import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ArrowLeft } from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  // Colors aligned with the luxury liquid-glass design system
  const colors = {
    bgStart: isDark ? '#0A0A08' : '#F8FAFC',
    bgEnd: isDark ? '#070705' : '#EFF6FF',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? 'rgba(248, 250, 252, 0.6)' : 'rgba(15, 23, 42, 0.6)',
    goldStart: '#D4AF37',
    goldEnd: '#AA8C2C',
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <LinearGradient
        colors={[colors.bgStart, colors.bgEnd]}
        style={styles.container}
      >
        <View style={[styles.glassCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* Lottie Animation */}
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../assets/images/Error 404.lottie')}
              autoPlay
              loop
              style={styles.lottie}
              resizeMode="contain"
            />
          </View>

          {/* Error Message */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Lost Your Way?</Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            The culinary path or page you followed seems to have gone cold. Let's get you back to the main menu.
          </Text>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              activeOpacity={0.8}
              style={styles.homeButton}
            >
              <LinearGradient
                colors={[colors.goldStart, colors.goldEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goldGrad}
              >
                <Home size={18} color="#080A0F" style={styles.buttonIcon} />
                <Text style={styles.homeButtonText}>Return Home</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              activeOpacity={0.7}
              style={[styles.backButton, { borderColor: colors.cardBorder }]}
            >
              <ArrowLeft size={16} color={colors.textPrimary} style={styles.buttonIcon} />
              <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  animationContainer: {
    width: width * 0.7,
    height: width * 0.55,
    maxWidth: 280,
    maxHeight: 220,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  homeButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  goldGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#080A0F',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
