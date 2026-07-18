import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Wallet, Clock } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';

export default function WalletScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader 
        title="My Wallet" 
        titleAlign="center" 
        showBackButton={true} 
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Balance Card */}
        <BlurView
          intensity={90}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.balanceCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.iconCircle}>
            <Wallet size={24} color={colors.accentGold} />
          </View>
          <Text style={[styles.balanceLabel, { color: colors.textSub }]}>TOTAL BALANCE</Text>
          <Text style={[styles.balanceVal, { color: colors.textMain }]}>₹ 0.00</Text>
        </BlurView>

        {/* Transactions Section */}
        <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>TRANSACTION HISTORY</Text>
        
        <View style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Clock size={28} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>No Transactions Yet</Text>
          <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
            Your transaction history will be shown here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 40,
    gap: 20,
  },
  balanceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: '#D4AF37',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceVal: {
    fontSize: 32,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
