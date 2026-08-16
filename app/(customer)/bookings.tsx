import React, { useState, useEffect, useCallback } from 'react';
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
  History,
  Utensils,
  ShieldCheck,
  ChevronRight,
  Radar,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken, MealHistoryItem } from '../../src/context/TokenContext';
import LottieView from 'lottie-react-native';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import MessDirectionsModal from '../../src/components/MessDirectionsModal';
import RefundVerificationModal from '../../src/components/RefundVerificationModal';
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

export default function BookingsScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { activeBooking, cancelBooking, mealHistory, loading } = useToken();

  // Countdown for active booking OTP
  const [countdownText, setCountdownText] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  useEffect(() => {
    if (!activeBooking) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(activeBooking.otpExpiresAt || Date.now() + 2 * 60 * 60 * 1000).getTime();
      const diff = Math.max(0, expires - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff <= 0) {
        setCountdownText('Expired');
      } else if (hours > 0) {
        setCountdownText(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdownText(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    setCancelling(true);
    await cancelBooking();
    setCancelling(false);
    setShowCancelModal(false);
  };

  const handleOpenOrderDetail = (item?: MealHistoryItem) => {
    const targetId = item ? item.id : (activeBooking ? activeBooking.bookingId : 'active');
    try {
      router.push({
        pathname: `/(customer)/order/[id]`,
        params: {
          id: targetId,
          messName: item ? item.messName : (activeBooking?.messName || ''),
          mealType: item ? item.mealType : (activeBooking?.mealType || ''),
          status: item ? item.status : 'booked',
          date: item ? item.date : '',
        },
      });
    } catch {
      router.push(`/(customer)/booking-detail?id=${targetId}`);
    }
  };

  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [directionsMess, setDirectionsMess] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  const getMessCoords = (messId?: string, messName?: string): { lat: number; lng: number } => {
    const nameLower = (messName || '').toLowerCase();
    if (nameLower.includes('green leaf')) return { lat: 18.5114, lng: 73.8347 };
    if (nameLower.includes('royal')) return { lat: 18.5314, lng: 73.8447 };
    if (nameLower.includes('cloud')) return { lat: 18.5414, lng: 73.8247 };
    if (nameLower.includes('punjabi') || nameLower.includes('spice')) return { lat: 18.5014, lng: 73.8647 };
    if (nameLower.includes('annapurna')) return { lat: 18.5204, lng: 73.8567 };

    if (messId === 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e') return { lat: 18.5314, lng: 73.8447 };
    if (messId === 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f') return { lat: 18.5114, lng: 73.8347 };
    if (messId === 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a') return { lat: 18.5414, lng: 73.8247 };
    if (messId === 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b') return { lat: 18.5014, lng: 73.8647 };

    return { lat: 18.5204, lng: 73.8567 };
  };

  const handleGetDirections = (address?: string, messName?: string, lat?: number, lng?: number) => {
    const targetName = messName || activeBooking?.messName || 'Campus Partner Mess';
    const targetAddress = address || activeBooking?.messAddress || 'Campus Hub, Pune';
    const coords = (lat && lng) ? { lat, lng } : getMessCoords(activeBooking?.messId, targetName);

    setDirectionsMess({
      name: targetName,
      address: targetAddress,
      lat: coords.lat,
      lng: coords.lng,
    });
    setShowDirectionsModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} color="#10B981" />;
      case 'skipped':
        return <XCircle size={16} color="#F59E0B" />;
      case 'cancelled':
        return <XCircle size={16} color="#EF4444" />;
      case 'no-show':
        return <AlertTriangle size={16} color="#EF4444" />;
      default:
        return <CheckCircle2 size={16} color="#10B981" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'skipped':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'no-show':
        return '#EF4444';
      default:
        return '#10B981';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'COMPLETED';
      case 'skipped':
        return 'SKIPPED';
      case 'cancelled':
        return 'CANCELLED & REFUNDED';
      case 'no-show':
        return 'NO-SHOW';
      default:
        return status.toUpperCase();
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
  const rawOtp = activeBooking ? activeBooking.otp.padStart(8, '0') : '84920156';
  const otpPart1 = rawOtp.slice(0, 4);
  const otpPart2 = rawOtp.slice(4, 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="My Bookings" titleAlign="center" showBackButton={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* =============== ACTIVE BOOKING SECTION =============== */}
        {activeBooking && activeBooking.status === 'booked' ? (
          <AnimatedEntrance direction="down">
            <View style={[styles.activeBookingCard, { borderColor: '#10B981' }]}>
              {/* Header Strip */}
              <TouchableOpacity
                onPress={() => handleOpenOrderDetail()}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeHeader}
                >
                  <CalendarCheck2 size={16} color="#FFFFFF" />
                  <Text style={styles.activeHeaderText}>ACTIVE BOOKING (TAP FOR DETAILS)</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Booking Content */}
              <View style={styles.activeContent}>
                {/* Mess Name */}
                <TouchableOpacity onPress={() => handleOpenOrderDetail()} activeOpacity={0.85}>
                  <Text style={[styles.activeMess, { color: colors.textMain }]}>{activeBooking.messName}</Text>
                </TouchableOpacity>

                {/* Location Row */}
                <View style={styles.activeInfoRow}>
                  <MapPin size={14} color="#10B981" />
                  <Text style={[styles.activeInfoText, { color: colors.textSub }]}>{activeBooking.messAddress}</Text>
                </View>

                {/* Meal Type */}
                <View style={styles.activeInfoRow}>
                  <Utensils size={14} color="#10B981" />
                  <Text style={[styles.activeInfoText, { color: colors.textSub }]}>{activeBooking.mealType} Meal</Text>
                </View>

                {/* 8-Digit OTP Display */}
                <TouchableOpacity onPress={() => handleOpenOrderDetail()} activeOpacity={0.9} style={styles.otpContainer}>
                  <Text style={[styles.otpLabel, { color: colors.textSub }]}>YOUR 8-DIGIT DINING OTP</Text>
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
                  <Text style={[styles.otpHint, { color: colors.textSub }]}>
                    Show this 8-digit OTP to the mess counter staff
                  </Text>
                </TouchableOpacity>

                {/* Countdown */}
                <View style={styles.countdownRow}>
                  <Clock size={14} color="#F59E0B" />
                  <Text style={styles.countdownText}>
                    {countdownText === 'Expired' ? 'OTP Expired (Time Slot Over)' : `Expires in ${countdownText}`}
                  </Text>
                </View>

                {/* Cutoff Time */}
                <View style={[styles.cutoffBadge, { backgroundColor: colors.surface }]}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={[styles.cutoffText, { color: colors.textSub }]}>
                    Cutoff: <Text style={{ color: '#10B981', fontWeight: '900' }}>{activeBooking.cutoffTime}</Text>
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.activeActionsRow}>
                  <TouchableOpacity
                    style={styles.directionsBtn}
                    onPress={() => handleGetDirections(activeBooking.messAddress, activeBooking.messName)}
                    activeOpacity={0.85}
                  >
                    <Navigation size={16} color="#10B981" />
                    <Text style={styles.directionsBtnText}>Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancelBooking}
                    activeOpacity={0.85}
                  >
                    <XCircle size={16} color="#EF4444" />
                    <Text style={styles.cancelBtnText}>Cancel & Refund</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </AnimatedEntrance>
        ) : (
          /* No Active Booking Empty State */
          <AnimatedEntrance direction="down">
            <View style={[styles.noBookingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.noBookingIconCircle}>
                <Radar size={28} color="#10B981" />
              </View>
              <Text style={[styles.noBookingTitle, { color: colors.textMain }]}>No Active Booking</Text>
              <Text style={[styles.noBookingSub, { color: colors.textSub }]}>
                Swipe through messes in Discover and book your next meal.
              </Text>
              <TouchableOpacity
                style={styles.discoverBtn}
                onPress={() => router.push('/(customer)/discover')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.discoverBtnGrad}
                >
                  <Text style={styles.discoverBtnText}>Discover Messes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* =============== MEAL HISTORY SECTION =============== */}
        <AnimatedEntrance direction="up" delay={100}>
          <View style={styles.historyHeader}>
            <History size={18} color="#10B981" />
            <Text style={[styles.historyTitle, { color: colors.textMain }]}>Meal History</Text>
          </View>
        </AnimatedEntrance>

        {loading ? (
          <AnimatedEntrance direction="up" delay={100}>
            <View style={[styles.emptyHistory, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, minHeight: 180, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }]}>
              <LottieView
                source={require('../../assets/images/food_beverage.lottie')}
                autoPlay
                loop
                style={{ width: 110, height: 110 }}
              />
              <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800', marginTop: 4 }}>
                Loading Meal History...
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                Fetching your dining logs & tokens
              </Text>
            </View>
          </AnimatedEntrance>
        ) : mealHistory.length > 0 ? (
          mealHistory.map((item, index) => (
            <AnimatedEntrance key={item.id} direction="up" delay={150 + index * 60}>
              <TouchableOpacity
                style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => handleOpenOrderDetail(item)}
                activeOpacity={0.85}
              >
                <View style={styles.historyCardRow}>
                  {getStatusIcon(item.status)}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyMess, { color: colors.textMain }]}>{item.messName}</Text>
                    <Text style={[styles.historyMeta, { color: colors.textSub }]}>
                      {item.mealType} • {item.date}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSub} style={{ marginLeft: 4 }} />
                </View>
                {item.tokensUsed > 0 && (
                  <Text style={[styles.tokenUsed, { color: colors.textSub }]}>
                    {item.tokensUsed} token used
                  </Text>
                )}
              </TouchableOpacity>
            </AnimatedEntrance>
          ))
        ) : (
          <AnimatedEntrance direction="up" delay={200}>
            <View style={[styles.emptyHistory, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.emptyHistoryText, { color: colors.textSub }]}>
                No meal history yet. Book your first meal to get started.
              </Text>
            </View>
          </AnimatedEntrance>
        )}
      </ScrollView>

      <RefundVerificationModal
        visible={showCancelModal}
        activeBooking={activeBooking}
        onClose={() => setShowCancelModal(false)}
        onConfirmRefund={cancelBooking}
      />

      <MessDirectionsModal
        visible={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        messName={directionsMess?.name || 'Mess Location'}
        messAddress={directionsMess?.address || ''}
        messLat={directionsMess?.lat}
        messLng={directionsMess?.lng}
      />

      <CustomerBottomBar activeTab="bookings" />
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
    paddingBottom: 100,
    gap: 14,
  },
  // ---- Active Booking Card ----
  activeBookingCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  activeHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeContent: {
    padding: 18,
    gap: 10,
  },
  activeMess: {
    fontSize: 20,
    fontWeight: '900',
  },
  activeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  otpContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  otpDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  otpHint: {
    fontSize: 11,
    marginTop: 10,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  countdownText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  cutoffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  cutoffText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  directionsBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  // ---- No Booking Card ----
  noBookingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  noBookingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noBookingTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  noBookingSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  discoverBtn: {
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
  // ---- History Section ----
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyMess: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tokenUsed: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 26,
  },
  emptyHistory: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
