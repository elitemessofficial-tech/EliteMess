import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarCheck2,
  Clock,
  MapPin,
  Navigation,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  ShieldCheck,
  ChevronLeft,
  Copy,
  Check,
  Flame,
  Zap,
  Info,
  QrCode,
  CheckCircle,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken, MealHistoryItem } from '../../src/context/TokenContext';
import LottieView from 'lottie-react-native';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';

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
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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

export default function BookingDetailScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string; messName?: string; mealType?: string; status?: string; date?: string }>();
  const { activeBooking, cancelBooking, expireBooking, completeBooking, mealHistory, isOTPValid } = useToken();

  const [copied, setCopied] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Determine if viewing active booking or a past order from history
  const isTargetActive = !params.id || params.id === 'active' || (activeBooking && activeBooking.bookingId === params.id);

  // Derive order details
  const orderData = isTargetActive && activeBooking
    ? {
        id: activeBooking.bookingId,
        messName: activeBooking.messName,
        messAddress: activeBooking.messAddress,
        mealType: activeBooking.mealType,
        otp: activeBooking.otp,
        cutoffTime: activeBooking.cutoffTime,
        status: 'booked',
        date: activeBooking.bookedAt ? new Date(activeBooking.bookedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today',
        menuHighlights: activeBooking.menuHighlights || ['Daily Thali Special', 'Roti', 'Rice', 'Paneer Gravy'],
        tokensUsed: 1,
      }
    : {
        id: params.id || `bk_${Date.now()}`,
        messName: params.messName || 'Annapurna Campus Mess',
        messAddress: 'Gate 2, North Campus Hub',
        mealType: params.mealType || 'Lunch',
        otp: '84920156',
        cutoffTime: '2:30 PM',
        status: params.status || 'completed',
        date: params.date || 'Jul 27, 09:40 PM',
        menuHighlights: ['Daily Special Thali', 'Roti', 'Rice', 'Dal Fry'],
        tokensUsed: params.status === 'skipped' ? 0 : 1,
      };

  useEffect(() => {
    if (!isTargetActive || !activeBooking) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(activeBooking.otpExpiresAt || Date.now() + 2 * 60 * 60 * 1000).getTime();
      const diff = Math.max(0, expires - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff <= 0) {
        setCountdownText('Expired');
        setIsExpired(true);
        // Auto-expire in context
        expireBooking();
      } else if (hours > 0) {
        setCountdownText(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdownText(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeBooking, isTargetActive]);

  const handleCopyOTP = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    setCancelling(true);
    await cancelBooking();
    setCancelling(false);
    setShowCancelModal(false);
    router.replace('/(customer)/bookings');
  };

  const handleSimulateOwnerRedeem = async () => {
    if (!isOTPValid(rawOtp)) {
      const msg = 'Invalid OTP: This OTP was cancelled & refunded by customer. Mess owner cannot verify it.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('OTP Invalidated', msg);
      }
      return;
    }
    await completeBooking();
    router.replace('/(customer)/bookings');
  };

  const handleGetDirections = (address: string) => {
    const encoded = encodeURIComponent(address || 'Campus Mess');
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      web: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        if (Platform.OS === 'web') {
          window.alert(`Navigate to: ${address}`);
        } else {
          Alert.alert('Directions', `Navigate to: ${address}`);
        }
      });
    }
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
    surface: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)',
  };

  // Format 8-digit OTP into 2 groups of 4 digits
  const rawOtp = (orderData.otp || '84920156').padStart(8, '0');
  const otpPart1 = rawOtp.slice(0, 4);
  const otpPart2 = rawOtp.slice(4, 8);

  const isCompleted = orderData.status === 'completed';
  const isSkipped = orderData.status === 'skipped';
  const isCancelled = orderData.status === 'cancelled';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Order Details" titleAlign="center" showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* =============== STATUS HERO BANNER =============== */}
        <AnimatedEntrance direction="down">
          <View style={[styles.statusHeroCard, { borderColor: isTargetActive ? '#10B981' : isCompleted ? '#10B981' : isSkipped ? '#F59E0B' : '#EF4444' }]}>
            <LinearGradient
              colors={
                isTargetActive
                  ? ['#10B981', '#059669']
                  : isCompleted
                  ? ['#10B981', '#047857']
                  : isSkipped
                  ? ['#F59E0B', '#D97706']
                  : ['#EF4444', '#DC2626']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroGrad}
            >
              {isTargetActive ? (
                <CalendarCheck2 size={24} color="#FFFFFF" />
              ) : isCompleted ? (
                <CheckCircle2 size={24} color="#FFFFFF" />
              ) : isSkipped ? (
                <AlertTriangle size={24} color="#FFFFFF" />
              ) : (
                <XCircle size={24} color="#FFFFFF" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.heroStatusTag}>
                  {isTargetActive
                    ? 'ACTIVE DINING BOOKING'
                    : isCompleted
                    ? 'MEAL COMPLETED & REDEEMED'
                    : isSkipped
                    ? 'MEAL SKIPPED'
                    : 'BOOKING CANCELLED / EXPIRED'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {isTargetActive
                    ? 'Present OTP at mess counter to claim meal'
                    : isCompleted
                    ? 'Verified by mess counter staff'
                    : isSkipped
                    ? 'Pass skip credit preserved'
                    : 'Meal token refunded to balance'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </AnimatedEntrance>

        {/* =============== 8-DIGIT DINING OTP SECTION (IF ACTIVE) =============== */}
        {isTargetActive && (
          <AnimatedEntrance direction="up" delay={60}>
            <View style={[styles.otpCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.otpHeaderRow}>
                <QrCode size={18} color="#10B981" />
                <Text style={[styles.otpSectionTitle, { color: colors.textMain }]}>8-DIGIT VERIFICATION OTP</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyOTP} activeOpacity={0.7}>
                  {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} color={colors.textSub} />}
                  <Text style={[styles.copyBtnText, { color: copied ? '#10B981' : colors.textSub }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 8-Digit OTP Grid Display */}
              <View style={styles.otpDisplayWrap}>
                {/* First 4 Digits */}
                <View style={styles.otpGroupRow}>
                  {otpPart1.split('').map((digit, i) => (
                    <View key={i} style={styles.digitBox}>
                      <Text style={styles.digitText}>{digit}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.otpDivider}>--</Text>

                {/* Second 4 Digits */}
                <View style={styles.otpGroupRow}>
                  {otpPart2.split('').map((digit, i) => (
                    <View key={`2_${i}`} style={styles.digitBox}>
                      <Text style={styles.digitText}>{digit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={[styles.otpNoticeText, { color: colors.textSub }]}>
                Show this 8-digit OTP to the mess owner or counter staff for meal verification.
              </Text>

              {/* Countdown & Expiration Notice */}
              <View style={styles.countdownBox}>
                <Clock size={16} color="#F59E0B" />
                <Text style={styles.countdownTitle}>
                  {isExpired || countdownText === 'Expired'
                    ? 'OTP Expired (Time Slot Over)'
                    : `OTP Expires in: ${countdownText}`}
                </Text>
              </View>

              <View style={[styles.expiryNote, { backgroundColor: colors.surface }]}>
                <ShieldCheck size={14} color="#10B981" />
                <Text style={[styles.expiryNoteText, { color: colors.textSub }]}>
                  Automatically expires once verified by mess owner or after time slot ends ({orderData.cutoffTime}).
                </Text>
              </View>

              {/* SIMULATE MESS OWNER VERIFICATION (FOR DEMO) */}
              <TouchableOpacity
                style={styles.simulateOwnerBtn}
                onPress={handleSimulateOwnerRedeem}
                activeOpacity={0.85}
              >
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.simulateOwnerText}>Simulate Owner OTP Verification</Text>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* =============== MESS & MEAL INFORMATION =============== */}
        <AnimatedEntrance direction="up" delay={120}>
          <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitleLabel, { color: colors.textSub }]}>MESS & LOCATION</Text>

            <Text style={[styles.messTitle, { color: colors.textMain }]}>{orderData.messName}</Text>

            <View style={styles.infoRow}>
              <MapPin size={15} color="#10B981" />
              <Text style={[styles.infoVal, { color: colors.textSub }]}>{orderData.messAddress}</Text>
            </View>

            <TouchableOpacity
              style={styles.directionsBar}
              onPress={() => handleGetDirections(orderData.messAddress)}
              activeOpacity={0.85}
            >
              <Navigation size={15} color="#10B981" />
              <Text style={styles.directionsBarText}>Get Directions to Mess</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* =============== MEAL PASS BREAKDOWN =============== */}
        <AnimatedEntrance direction="up" delay={180}>
          <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitleLabel, { color: colors.textSub }]}>MEAL PASS BREAKDOWN</Text>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakLabel, { color: colors.textSub }]}>Meal Type</Text>
              <Text style={[styles.breakVal, { color: colors.textMain }]}>{orderData.mealType} Service</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakLabel, { color: colors.textSub }]}>Pre-Book Cutoff</Text>
              <Text style={[styles.breakVal, { color: '#10B981' }]}>{orderData.cutoffTime}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakLabel, { color: colors.textSub }]}>Token Cost</Text>
              <Text style={[styles.breakVal, { color: colors.textMain }]}>
                {orderData.tokensUsed} Meal Token {isCancelled || isSkipped ? '(Refunded/Preserved)' : ''}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakLabel, { color: colors.textSub }]}>Booking Ref ID</Text>
              <Text style={[styles.breakVal, { color: colors.textSub, fontSize: 11 }]}>{orderData.id}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakLabel, { color: colors.textSub }]}>Booked Date</Text>
              <Text style={[styles.breakVal, { color: colors.textMain }]}>{orderData.date}</Text>
            </View>
          </View>
        </AnimatedEntrance>

        {/* =============== MENU HIGHLIGHTS =============== */}
        <AnimatedEntrance direction="up" delay={240}>
          <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Flame size={16} color="#FF6B00" fill="#FF6B00" />
              <Text style={[styles.cardTitleLabel, { color: '#FF6B00', marginBottom: 0 }]}>INCLUDED MENU</Text>
            </View>

            {orderData.menuHighlights.map((item, idx) => (
              <View key={idx} style={styles.menuLine}>
                <CheckCircle2 size={15} color="#10B981" />
                <Text style={[styles.menuLineText, { color: colors.textMain }]}>{item}</Text>
              </View>
            ))}
          </View>
        </AnimatedEntrance>

        {/* =============== ACTION BUTTONS =============== */}
        {isTargetActive && (
          <AnimatedEntrance direction="up" delay={300}>
            <TouchableOpacity
              style={styles.cancelBookingBtn}
              onPress={handleCancelBooking}
              activeOpacity={0.85}
            >
              <XCircle size={18} color="#EF4444" />
              <Text style={styles.cancelBookingBtnText}>Cancel & Refund 1 Token</Text>
            </TouchableOpacity>
          </AnimatedEntrance>
        )}

        <TouchableOpacity
          style={[styles.backToBookingsBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={[styles.backToBookingsText, { color: colors.textMain }]}>Back to My Bookings</Text>
        </TouchableOpacity>
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

              {/* Summary Box */}
              <View style={modalStyles.summaryBox}>
                <View style={modalStyles.summaryRow}>
                  <Utensils size={14} color="#10B981" />
                  <Text style={[modalStyles.summaryText, { color: colors.textMain }]}>{orderData.messName}</Text>
                </View>
                <View style={modalStyles.summaryRow}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={[modalStyles.summaryText, { color: colors.textSub }]}>OTP: {rawOtp}</Text>
                </View>
              </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  statusHeroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  heroGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  heroStatusTag: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  otpCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  otpSectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  otpDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 6,
  },
  otpGroupRow: {
    flexDirection: 'row',
    gap: 6,
  },
  digitBox: {
    width: 36,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
  },
  otpDivider: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  otpNoticeText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    width: '100%',
    justifyContent: 'center',
  },
  countdownTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  expiryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  expiryNoteText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  simulateOwnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 4,
  },
  simulateOwnerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  detailsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  cardTitleLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  messTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  directionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginTop: 6,
  },
  directionsBarText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  menuLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  cancelBookingBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
  },
  backToBookingsBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  backToBookingsText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
