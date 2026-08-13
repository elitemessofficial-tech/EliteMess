import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  Flame,
  Clock,
  MapPin,
  Utensils,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  XCircle,
  Star,
  Navigation,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import QRCodeDisplay from '../../src/components/QRCodeDisplay';
import { useDashboardData, FavoriteMess } from '../../src/hooks/useDashboardData';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import ReviewsModal from '../../src/components/ReviewsModal';
import ConfirmModal from '../../components/ConfirmModal';
import MessDirectionsModal from '../../src/components/MessDirectionsModal';

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 14,
    gap: 8,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  confirmBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  keepBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { cancelBooking, skipMeal, bookMeal } = useToken();
  const { passData, activeBooking, favoriteMesses, userName, loadingData } = useDashboardData();

  // Dynamic Time-Aware Greeting Logic
  const getDynamicGreeting = (): { greeting: string; icon: string } => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 15) {
      return { greeting: `Good Morning, ${userName}!`, icon: 'Ready for lunch?' };
    } else if (hour >= 15 && hour < 22) {
      return { greeting: `Good Evening, ${userName}!`, icon: 'Dinner plans?' };
    } else {
      return { greeting: `Hello, ${userName}!`, icon: 'Fuel up for tomorrow!' };
    }
  };

  const { greeting, icon } = getDynamicGreeting();

  // Countdown timer for active OTP booking
  const [countdownText, setCountdownText] = useState<string>('1h 45m');
  const [reviewsModal, setReviewsModal] = useState<{ visible: boolean; messId: string; messName: string }>({
    visible: false,
    messId: '',
    messName: '',
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!activeBooking) return;
      const now = new Date().getTime();
      const expires = new Date(activeBooking.otpExpiresAt || Date.now() + 2 * 60 * 60 * 1000).getTime();
      const diff = Math.max(0, expires - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff <= 0) {
        setCountdownText('Expired');
      } else if (hours > 0) {
        setCountdownText(`OTP expires in ${hours}h ${minutes}m`);
      } else {
        setCountdownText(`OTP expires in ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

// Open Interactive Directions Map Modal
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [directionsMess, setDirectionsMess] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  const handleGetDirections = (address: string, messName?: string, lat?: number, lng?: number) => {
    setDirectionsMess({
      name: messName || activeBooking?.messName || 'Annapurna Campus Mess',
      address: address || activeBooking?.messAddress || 'Gate 2, North Campus, Pune',
      lat: lat || 18.5204,
      lng: lng || 73.8567,
    });
    setShowDirectionsModal(true);
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: 'zap' | 'lock' | 'clock' | 'alert' | 'check' | 'skip';
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    setCancelling(true);
    await cancelBooking();
    setCancelling(false);
    setShowCancelModal(false);
  };

  const handleSkipMeal = () => {
    setConfirmModal({
      visible: true,
      title: "Skip Today's Meal?",
      message: "This will use 1 skip pass from your balance without deducting your meal token.",
      icon: 'skip',
      confirmText: 'Use Skip Pass',
      cancelText: 'Back',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        const res = await skipMeal();
        setConfirmModal((prev) => ({ ...prev, visible: false, loading: false }));
        if (!res.success) {
          setConfirmModal({
            visible: true,
            title: 'Notice',
            message: res.message || 'Could not skip meal.',
            icon: 'alert',
            confirmText: 'Got It',
            cancelText: 'Close',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const handleQuickRebook = (mess: FavoriteMess) => {
    setConfirmModal({
      visible: true,
      title: `Re-Book ${mess.name}?`,
      message: `Deducts 1 token for ${mess.starDish}. Cutoff time is ${mess.cutoffTime}.`,
      icon: 'lock',
      confirmText: 'Confirm (1 Token)',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        const res = await bookMeal(
          mess.id,
          mess.name,
          mess.address,
          'Lunch',
          [mess.starDish]
        );
        setConfirmModal((prev) => ({ ...prev, visible: false, loading: false }));
        if (!res.success) {
          setConfirmModal({
            visible: true,
            title: 'Notice',
            message: res.message || 'Could not complete booking.',
            icon: 'alert',
            confirmText: 'Got It',
            cancelText: 'Close',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const tokenPercent = Math.round((passData.remainingTokens / passData.totalTokens) * 100);

  const rawOtp = activeBooking ? activeBooking.otp.padStart(8, '0') : '84920156';
  const otpPart1 = rawOtp.slice(0, 4);
  const otpPart2 = rawOtp.slice(4, 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Meal Hopping Pass" titleAlign="center" showBackButton={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Time-Aware Greeting Header */}
        <AnimatedEntrance direction="down">
          <View style={styles.greetingHeader}>
            <Text style={[styles.greetingTitle, { color: colors.textMain }]}>{greeting}</Text>
            <Text style={[styles.greetingSub, { color: colors.textSub }]}>{icon}</Text>
          </View>
        </AnimatedEntrance>

        {/* Visual Token Battery / Pass Banner */}
        <AnimatedEntrance direction="up" delay={50}>
          <LinearGradient
            colors={isDark ? ['#0F241C', '#061712', '#0C2B20'] : ['#ECFDF5', '#D1FAE5', '#A7F3D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.passBanner}
          >
            <View style={styles.passBannerTop}>
              <View style={styles.badgeRow}>
                <Zap size={14} color="#10B981" />
                <Text style={styles.planTitle}>{passData.subscriptionPlan}</Text>
              </View>

              <View style={styles.streakPill}>
                <Flame size={14} color="#FF6B00" fill="#FF6B00" />
                <Text style={styles.streakText}>{passData.streakDays} Day Streak</Text>
              </View>
            </View>

            {/* Visual Token Battery Meter */}
            <View style={styles.batteryContainer}>
              <View style={styles.batteryHeader}>
                <Text style={[styles.batteryLabel, { color: colors.textSub }]}>Meal Tokens Remaining</Text>
                <Text style={styles.batteryValue}>
                  {passData.remainingTokens} <Text style={{ fontSize: 16, color: colors.textSub }}>/ {passData.totalTokens}</Text>
                </Text>
              </View>

              {/* Glowing Progress Meter */}
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${tokenPercent}%` }]} />
              </View>

              <View style={styles.batteryFooter}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>
                  {passData.remainingSkips} Free Skips Left
                </Text>
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>
                  {tokenPercent}% Available
                </Text>
              </View>
            </View>
          </LinearGradient>
        </AnimatedEntrance>

        {/* DYNAMIC "LIVE BOOKING ACTION HUB" vs "EMPTY RADAR STATE" */}
        {activeBooking && activeBooking.status === 'booked' ? (
          /* ACTIVE BOOKING ACTION HUB */
          <AnimatedEntrance direction="up" delay={120}>
            <View style={styles.liveBookingCard}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.liveHeaderBar}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={16} color="#FFFFFF" />
                  <Text style={styles.liveHeaderTitle}>PRE-BOOKED MEAL ACTIVE</Text>
                </View>
                <View style={styles.timerBadge}>
                  <Clock size={12} color="#FFFFFF" />
                  <Text style={styles.timerText}>{countdownText}</Text>
                </View>
              </LinearGradient>

              <View style={[styles.liveCardBody, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Text style={[styles.messNameTitle, { color: colors.textMain }]}>{activeBooking.messName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MapPin size={12} color={colors.textSub} />
                  <Text style={{ color: colors.textSub, fontSize: 12 }}>{activeBooking.messAddress}</Text>
                </View>

                {/* QR CODE & 8-DIGIT VERIFICATION OTP */}
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>SCAN QR OR SHOW OTP AT COUNTER</Text>
                  
                  <View style={{ alignItems: 'center', marginVertical: 14 }}>
                    <QRCodeDisplay value={activeBooking.otp} size={125} showCorners={true} />
                  </View>

                  <View style={styles.otpDigitsRow}>
                    <View style={styles.otpSubRow}>
                      {otpPart1.split('').map((digit, i) => (
                        <View key={`p1_${i}`} style={styles.otpDigitBox}>
                          <Text style={styles.otpDigit}>{digit}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.otpDash}>-</Text>
                    <View style={styles.otpSubRow}>
                      {otpPart2.split('').map((digit, i) => (
                        <View key={`p2_${i}`} style={styles.otpDigitBox}>
                          <Text style={styles.otpDigit}>{digit}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.otpSubtext}>Scan QR code or show 8-digit OTP at dining counter</Text>
                </View>

                {/* Get Directions Button */}
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => handleGetDirections(activeBooking.messAddress)}
                  activeOpacity={0.85}
                >
                  <Navigation size={16} color="#FFFFFF" />
                  <Text style={styles.directionsBtnText}>Get Directions (Maps)</Text>
                </TouchableOpacity>

                {/* Secondary Actions Row */}
                <View style={styles.bookingActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking}>
                    <XCircle size={14} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.skipBtn} onPress={handleSkipMeal}>
                    <RotateCcw size={14} color={colors.emerald} />
                    <Text style={{ color: colors.emerald, fontSize: 12, fontWeight: '800' }}>Use Skip Pass</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </AnimatedEntrance>
        ) : (
          /* EMPTY RADAR SEARCH STATE */
          <AnimatedEntrance direction="up" delay={120}>
            <View style={[styles.noBookingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* Pulsing Lottie Radar Animation */}
              <View style={styles.lottieRadarContainer}>
                <LottieView
                  source={{ uri: 'https://assets5.lottiefiles.com/packages/lf20_t24twix2.json' }}
                  autoPlay
                  loop
                  style={styles.radarLottie}
                />
              </View>

              <Text style={[styles.noBookingTitle, { color: colors.textMain }]}>No Active Pre-Booking</Text>
              <Text style={[styles.noBookingSub, { color: colors.textSub }]}>
                Browse today's special mess menus, swipe right to shortlist, and lock your meal before cutoff time.
              </Text>

              <TouchableOpacity
                style={styles.discoverCTA}
                onPress={() => router.push('/(customer)/discover')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.discoverBtnGrad}
                >
                  <Text style={styles.discoverBtnText}>Explore Mess Menus</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* NEW SECTION: "QUICK BOOK (YOUR FAVORITES)" */}
        <AnimatedEntrance direction="up" delay={180}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Quick Book (Your Favorites)</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/all-messes')}>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>View All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={favoriteMesses}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoriteListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.favMessCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/(customer)/mess-detail?messId=${item.id}`)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: item.image }} style={styles.favMessImage} />
                <View style={styles.favMessBody}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.favMessTitle, { color: colors.textMain }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.favRatingPill}>
                      <Star size={10} color="#10B981" fill="#10B981" />
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>{item.rating}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }} numberOfLines={1}>
                    {item.starDish}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSub }}>{item.distance}</Text>

                  {/* One-Tap Re-Book Button */}
                  <TouchableOpacity
                    style={styles.rebookBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleQuickRebook(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rebookBtnText}>Re-Book</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        </AnimatedEntrance>

        {/* Quick Action Grid */}
        <AnimatedEntrance direction="up" delay={240}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Pass Management</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/(customer)/discover')}
            >
              <Flame size={22} color="#10B981" />
              <Text style={[styles.gridTitle, { color: colors.textMain }]}>Mess Swiper</Text>
              <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>Tinder-style daily menus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/(customer)/shortlist')}
            >
              <ShieldCheck size={22} color="#10B981" />
              <Text style={[styles.gridTitle, { color: colors.textMain }]}>Decision Room</Text>
              <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>Compare & lock meal</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>
      </ScrollView>

      {/* =============== CANCEL & REFUND THEMED MODAL CARD =============== */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowCancelModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={modalStyles.cardWrapper}>
            <View style={[modalStyles.card, { backgroundColor: isDark ? '#0F1A17' : '#FFFFFF', borderColor: 'rgba(239, 68, 68, 0.35)' }]}>
              {/* Lottie Wrong Animation */}
              <LottieView
                source={require('../../assets/images/wrong.lottie')}
                autoPlay
                loop
                style={{ width: 80, height: 80, marginBottom: 8 }}
              />

              {/* Title & Subtitle */}
              <Text style={[modalStyles.title, { color: colors.textMain }]}>Cancel Meal Booking?</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>
                Your 1 meal token will be refunded immediately back to your pass balance.
              </Text>

              {/* Booking Summary Box */}
              {activeBooking && (
                <View style={modalStyles.summaryBox}>
                  <View style={modalStyles.summaryRow}>
                    <Utensils size={14} color="#10B981" />
                    <Text style={[modalStyles.summaryText, { color: colors.textMain }]}>{activeBooking.messName}</Text>
                  </View>
                  <View style={modalStyles.summaryRow}>
                    <ShieldCheck size={14} color="#10B981" />
                    <Text style={[modalStyles.summaryText, { color: colors.textSub }]}>OTP: {activeBooking.otp}</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[modalStyles.confirmBtn, cancelling && { opacity: 0.6 }]}
                onPress={confirmCancelBooking}
                activeOpacity={0.88}
                disabled={cancelling}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={modalStyles.confirmBtnGrad}
                >
                  <Text style={modalStyles.confirmBtnText}>
                    {cancelling ? 'Refunding...' : 'Confirm & Refund 1 Token'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.keepBtn}
                onPress={() => setShowCancelModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[modalStyles.keepBtnText, { color: colors.textMain }]}>Keep My Booking</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        icon={confirmModal.icon}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />

      <ReviewsModal
        visible={reviewsModal.visible}
        messId={reviewsModal.messId}
        messName={reviewsModal.messName}
        onClose={() => setReviewsModal({ visible: false, messId: '', messName: '' })}
      />

      {directionsMess && (
        <MessDirectionsModal
          visible={showDirectionsModal}
          onClose={() => setShowDirectionsModal(false)}
          messName={directionsMess.name}
          messAddress={directionsMess.address}
          messLat={directionsMess.lat}
          messLng={directionsMess.lng}
        />
      )}

      <CustomerBottomBar activeTab="dashboard" />
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
  greetingHeader: {
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  passBanner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  passBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  streakText: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '800',
  },
  batteryContainer: {
    gap: 10,
  },
  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  batteryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  batteryValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981',
  },
  meterTrack: {
    height: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  batteryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBookingCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  liveHeaderBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  liveCardBody: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  messNameTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  otpBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 14,
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  otpDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  otpSubRow: {
    flexDirection: 'row',
    gap: 4,
  },
  otpDash: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  otpDigitBox: {
    width: 32,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  otpSubtext: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    marginBottom: 12,
  },
  directionsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  bookingActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  noBookingCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  lottieRadarContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  radarLottie: {
    width: 80,
    height: 80,
  },
  noBookingTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  noBookingSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  discoverCTA: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  discoverBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  favoriteListContent: {
    gap: 12,
    paddingRight: 16,
  },
  favMessCard: {
    width: 220,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  favMessImage: {
    width: '100%',
    height: 100,
  },
  favMessBody: {
    padding: 12,
    gap: 4,
  },
  favMessTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  favRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rebookBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  rebookBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
});
