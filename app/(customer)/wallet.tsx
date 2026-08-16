import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet,
  Clock,
  Flame,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldCheck,
  CreditCard,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken, MealHistoryItem } from '../../src/context/TokenContext';
import { useLedgerData } from '../../src/hooks/useLedgerData';
import LottieView from 'lottie-react-native';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { getRazorpayKeys } from '../../src/config/razorpayConfig';

export default function WalletLedgerScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { buyExtraSkips } = useToken();
  const { passStats, historyList, loading } = useLedgerData();

  // Success Modal state after Razorpay payment
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [purchasedSkipsCount, setPurchasedSkipsCount] = useState<number>(5);

  // Pulsing animation for "ACTIVE" badge
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  // Razorpay Top Up Handler
  const handleBuySkips = (count: number, price: number) => {
    const keys = getRazorpayKeys('');

    const executePayment = async () => {
      try {
        await buyExtraSkips(count, price);
        setPurchasedSkipsCount(count);
        setShowSuccessModal(true);
      } catch (err: any) {
        Alert.alert('Payment Error', err.message || 'Failed to complete Razorpay payment.');
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const rzpOptions = {
        key: keys.key_id,
        amount: Math.round(price * 100),
        currency: 'INR',
        name: 'Meal Hopping Pass',
        description: `Top Up +${count} Extra Skips`,
        theme: { color: '#10B981' },
        handler: async function () {
          await executePayment();
        },
      };

      try {
        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } catch (e) {
        executePayment();
      }
    } else {
      // Native flow trigger
      Alert.alert(
        `Top Up +${count} Extra Skips?`,
        `Amount: ₹${price} via Razorpay Gateway (${keys.isTestMode ? 'Test Sandbox' : 'Live'})`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Pay ₹${price}`,
            onPress: executePayment,
          },
        ]
      );
    }
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  // Render individual history item with status variation styling
  const renderHistoryItem = ({ item, index }: { item: MealHistoryItem; index: number }) => {
    let statusColor = '#10B981';
    let statusText = 'COMPLETED';
    let tokenText = '- 1 Token';
    let IconComponent = CheckCircle2;

    if (item.status === 'cancelled' || item.status === 'refunded' || item.tokensUsed < 0) {
      statusColor = '#10B981';
      statusText = 'CANCELLED & REFUNDED';
      tokenText = '+ 1 Token (Refund)';
      IconComponent = CheckCircle2;
    } else if (item.status === 'skipped') {
      statusColor = '#FF6B00';
      statusText = 'SKIPPED';
      tokenText = '0 Tokens';
      IconComponent = RotateCcw;
    } else if (item.status === 'no-show') {
      statusColor = '#EF4444';
      statusText = 'NO-SHOW (PENALTY)';
      tokenText = '- 1 Token';
      IconComponent = XCircle;
    }

    return (
      <AnimatedEntrance direction="up" delay={index * 60}>
        <View style={styles.historyRow}>
          <View style={[styles.historyIconCircle, { backgroundColor: `${statusColor}15` }]}>
            <IconComponent size={18} color={statusColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.historyMessName, { color: colors.textMain }]}>{item.messName}</Text>
            <Text style={{ fontSize: 11, color: colors.textSub }}>{item.date} • {item.mealType}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.historyStatus, { color: statusColor }]}>{statusText}</Text>
            <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>{tokenText}</Text>
          </View>
        </View>
      </AnimatedEntrance>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Pass & Ledger" titleAlign="center" showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ACTIVE SUBSCRIPTION PASS CARD WITH PULSING BADGE */}
        <AnimatedEntrance direction="down">
          <LinearGradient
            colors={isDark ? ['#121B18', '#0D1412', '#16231F'] : ['#ECFDF5', '#D1FAE5', '#A7F3D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ledgerCard}
          >
            <View style={styles.ledgerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Wallet size={18} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
                  ACTIVE SUBSCRIPTION PASS
                </Text>
              </View>

              {/* Pulsing Opacity Live Active Badge */}
              <Animated.View style={[styles.activeTag, { opacity: pulseAnim }]}>
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>● LIVE ACTIVE</Text>
              </Animated.View>
            </View>

            <Text style={[styles.planNameText, { color: colors.textMain }]}>{passStats.planName}</Text>

            <View style={styles.statGrid}>
              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.cardBorder }]}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>Tokens Balance</Text>
                <Text style={styles.statNumber}>
                  {passStats.remainingTokens} <Text style={{ fontSize: 14, color: colors.textSub }}>/ {passStats.totalTokens}</Text>
                </Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.cardBorder }]}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>Skips Remaining</Text>
                <Text style={[styles.statNumber, { color: '#FF6B00' }]}>{passStats.remainingSkips}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#10B981',
                borderWidth: isDark ? 1 : 0,
                borderColor: 'rgba(16, 185, 129, 0.3)',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => router.push('/(customer)/subscription')}
              activeOpacity={0.85}
            >
              <Text style={{ color: isDark ? '#10B981' : '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                {passStats.remainingTokens === 0 ? 'Get Meal Pass Subscription →' : 'Manage Subscription Plans →'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </AnimatedEntrance>

        {/* TOP UP EXTRA SKIPS MODULE (RAZORPAY GATEWAY) */}
        <AnimatedEntrance direction="up" delay={100}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Top Up Extra Skips</Text>
          <View style={styles.skipPackageRow}>
            {/* +5 Skips Card */}
            <TouchableOpacity
              style={[styles.pkgCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => handleBuySkips(5, 49)}
              activeOpacity={0.85}
            >
              <View style={styles.pkgBadge}>
                <Zap size={12} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>+5 SKIPS</Text>
              </View>
              <Text style={[styles.pkgPrice, { color: colors.textMain }]}>₹49</Text>
              <Text style={{ fontSize: 10, color: colors.textSub }}>₹9.8 per skip</Text>
            </TouchableOpacity>

            {/* +12 Skips Card (Best Value) */}
            <TouchableOpacity
              style={[styles.pkgCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => handleBuySkips(12, 99)}
              activeOpacity={0.85}
            >
              <View style={[styles.pkgBadge, { backgroundColor: 'rgba(255, 107, 0, 0.12)', borderColor: 'rgba(255, 107, 0, 0.3)' }]}>
                <Flame size={12} color="#FF6B00" />
                <Text style={{ color: '#FF6B00', fontSize: 10, fontWeight: '900' }}>+12 SKIPS</Text>
              </View>
              <Text style={[styles.pkgPrice, { color: colors.textMain }]}>₹99</Text>
              <Text style={{ fontSize: 10, color: colors.textSub }}>BEST VALUE</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* DYNAMIC MEAL HISTORY LEDGER FLATLIST */}
        <AnimatedEntrance direction="up" delay={150}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Meal History Ledger</Text>
          <View style={[styles.historyContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {loading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                <LottieView
                  source={require('../../assets/images/food_beverage.json')}
                  autoPlay
                  loop
                  style={{ width: 100, height: 100 }}
                />
                <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800', marginTop: 4 }}>
                  Loading Ledger...
                </Text>
                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                  Fetching meal pass transaction logs
                </Text>
              </View>
            ) : historyList.length > 0 ? (
              <FlatList
                data={historyList}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            ) : (
              <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                  No meal history yet. Book your first meal to view ledger logs.
                </Text>
              </View>
            )}
          </View>
        </AnimatedEntrance>
      </ScrollView>

      {/* Payment Success Modal */}
      {showSuccessModal && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.textMain }]}>Payment Successful!</Text>
            <Text style={[styles.successSub, { color: colors.textSub }]}>
              +{purchasedSkipsCount} Extra Skip Passes added to your account pass balance.
            </Text>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeModalBtnText}>Continue Meal Hopping</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      <CustomerBottomBar activeTab="wallet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 104,
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 16,
  },
  ledgerCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  planNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  skipPackageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pkgCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  pkgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pkgPrice: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  historyContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMessName: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '900',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    overflow: 'hidden',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  closeModalBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
