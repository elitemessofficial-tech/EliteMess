import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Wallet,
  CheckCircle2,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  RotateCcw,
  Check,
  Star,
  ChevronRight,
  Utensils,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import LottieView from 'lottie-react-native';
import { getRazorpayKeys } from '../../src/config/razorpayConfig';

interface PlanTier {
  id: string;
  name: string;
  badge: string;
  price: number;
  tokens: number;
  skips: number;
  validityDays: number;
  popular?: boolean;
  colorGrad: [string, string];
  features: string[];
}

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'plan_silver',
    name: 'Starter Flexi Pass (30 Meals)',
    badge: '1 MEAL / DAY • 30 DAYS',
    price: 1499,
    tokens: 30,
    skips: 5,
    validityDays: 30,
    colorGrad: ['#94A3B8', '#64748B'],
    features: [
      '30 Meal Tokens (1 Meal/day: Lunch or Dinner)',
      '5 Skip & Rollover Passes',
      'Daily Cutoff Auto-Deduct at 7:00 PM IST if un-booked',
      'Unused Skips extend pass after 30 days',
      'Mess Hopping across all partner messes',
    ],
  },
  {
    id: 'plan_gold',
    name: 'Full Board Pass (60 Meals)',
    badge: '2 MEALS / DAY • 30 DAYS',
    price: 2699,
    tokens: 60,
    skips: 10,
    validityDays: 30,
    popular: true,
    colorGrad: ['#10B981', '#059669'],
    features: [
      '60 Meal Tokens (2 Meals/day: 1 Lunch + 1 Dinner)',
      '10 Skip & Rollover Passes',
      'Cutoff Auto-Deduct: 11:30 AM & 7:00 PM IST',
      'Unused Skips extend pass after 30 days',
      'Priority Mess Counter Clearance',
    ],
  },
  {
    id: 'plan_platinum',
    name: 'VIP Platinum Pass (120 Meals)',
    badge: '2 MEALS / DAY • 60 DAYS',
    price: 4999,
    tokens: 120,
    skips: 20,
    validityDays: 60,
    colorGrad: ['#F59E0B', '#D97706'],
    features: [
      '120 Meal Tokens (2 Meals/day: Lunch + Dinner)',
      '20 Skip & Rollover Passes',
      'Full Grace Period Protection via Skips',
      'Unlimited Mess Hopping Freedom',
      'Free Extra Skip Top-Up Bonuses',
    ],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const {
    subscriptionPlan,
    totalTokens,
    remainingTokens,
    totalSkips,
    remainingSkips,
    buyPassPlan,
  } = useToken();

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(PLAN_TIERS[1]);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [purchasedPlanName, setPurchasedPlanName] = useState<string>('');

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const handleSelectAndBuy = (plan: PlanTier) => {
    setSelectedPlan(plan);

    const executePurchase = async () => {
      if (buyPassPlan) {
        await buyPassPlan(
          plan.name,
          plan.tokens,
          plan.skips,
          plan.validityDays,
          plan.tokens >= 60 ? 'double' : 'single'
        );
      }
      setPurchasedPlanName(plan.name);
      setShowSuccessModal(true);
    };

    if (Platform.OS === 'web') {
      executePurchase();
    } else {
      Alert.alert(
        'Confirm Subscription Purchase',
        `Subscribe to ${plan.name} for ₹${plan.price.toLocaleString()}?\nIncludes ${plan.tokens} Tokens & ${plan.skips} Skips (valid for ${plan.validityDays} days).`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Pay ₹${plan.price.toLocaleString()}`,
            onPress: executePurchase,
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Meal Pass Subscription" titleAlign="center" showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CURRENT ACTIVE PASS STATUS CARD */}
        <AnimatedEntrance direction="down">
          <LinearGradient
            colors={isDark ? ['#121B18', '#0D1412', '#16231F'] : ['#ECFDF5', '#D1FAE5', '#A7F3D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activePassCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.passLabelRow}>
                <Wallet size={16} color="#10B981" />
                <Text style={styles.passLabelText} numberOfLines={1}>ACTIVE PASS</Text>
              </View>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>
                  {remainingTokens > 0 ? '● ACTIVE' : '○ NO PASS'}
                </Text>
              </View>
            </View>

            <Text style={[styles.planNameText, { color: colors.textMain }]} numberOfLines={1}>{subscriptionPlan}</Text>

            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.25)' }]}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>Tokens Available</Text>
                <Text style={[styles.metricNumber, { color: '#10B981' }]}>
                  {remainingTokens} <Text style={{ fontSize: 14, color: colors.textSub }}>/ {totalTokens}</Text>
                </Text>
              </View>

              <View style={[styles.metricBox, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.25)' }]}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>Skips Remaining</Text>
                <Text style={[styles.metricNumber, { color: '#FF6B00' }]}>{remainingSkips}</Text>
              </View>
            </View>
          </LinearGradient>
        </AnimatedEntrance>

        {/* CHOOSE SUBSCRIPTION PLAN */}
        <AnimatedEntrance direction="up" delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Choose Meal Pass Plan</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSub }]}>
            Hop across 25+ partner messes with guaranteed hygienic dining & full skip rollover protection.
          </Text>

          <View style={styles.plansContainer}>
            {PLAN_TIERS.map((tier, idx) => {
              const isSelected = subscriptionPlan === tier.name;
              return (
                <AnimatedEntrance key={tier.id} direction="up" delay={150 + idx * 80}>
                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: tier.popular ? '#10B981' : colors.cardBorder,
                        borderWidth: tier.popular ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleSelectAndBuy(tier)}
                    activeOpacity={0.88}
                  >
                    {tier.popular && (
                      <View style={styles.popularRibbon}>
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.popularRibbonText}>POPULAR CHOICE</Text>
                      </View>
                    )}

                    <View style={styles.planCardHeader}>
                      <View>
                        <Text style={[styles.planBadgeText, { color: tier.colorGrad[0] }]}>{tier.badge}</Text>
                        <Text style={[styles.planTitleText, { color: colors.textMain }]}>{tier.name}</Text>
                      </View>
                      <Text style={[styles.planPriceText, { color: colors.textMain }]}>
                        ₹{tier.price.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.tokensHighlightsRow}>
                      <View style={styles.highlightPill}>
                        <Utensils size={13} color="#10B981" />
                        <Text style={styles.highlightPillText}>{tier.tokens} Meal Tokens</Text>
                      </View>
                      <View style={[styles.highlightPill, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                        <RotateCcw size={13} color="#FF6B00" />
                        <Text style={[styles.highlightPillText, { color: '#FF6B00' }]}>{tier.skips} Skips Included</Text>
                      </View>
                    </View>

                    <View style={styles.featureList}>
                      {tier.features.map((feat, fIdx) => (
                        <View key={`feat_${fIdx}`} style={styles.featureItemRow}>
                          <CheckCircle2 size={14} color={tier.colorGrad[0]} />
                          <Text style={[styles.featureText, { color: colors.textSub }]}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={() => handleSelectAndBuy(tier)}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={tier.colorGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buyBtnGrad}
                      >
                        <Text style={styles.buyBtnText}>
                          {isSelected ? 'Renew Pass Plan →' : 'Subscribe Now →'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </AnimatedEntrance>
              );
            })}
          </View>
        </AnimatedEntrance>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.modalCardWrapper}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#0D1412' : '#FFFFFF', borderColor: colors.cardBorder }]}>
              <LottieView
                source={require('../../assets/images/Greentick.lottie')}
                autoPlay
                loop={false}
                style={{ width: 130, height: 130 }}
              />
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>Subscription Active!</Text>
              <Text style={[styles.modalSub, { color: colors.textSub }]}>
                Congratulations! You are now subscribed to {purchasedPlanName}. Your meal tokens & skips have been loaded into your account.
              </Text>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/(customer)/wallet');
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalDoneGrad}
                >
                  <Text style={styles.modalDoneText}>View Pass & Ledger →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      <CustomerBottomBar activeTab="profile" />
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
    gap: 20,
  },
  activePassCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 22,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  passLabelText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
  },
  planNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  popularRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularRibbonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planTitleText: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  planPriceText: {
    fontSize: 20,
    fontWeight: '900',
  },
  tokensHighlightsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  highlightPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  featureList: {
    gap: 8,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  buyBtnGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCardWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalCard: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalDoneBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalDoneGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
