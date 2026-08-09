import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Star,
  MapPin,
  Clock,
  Heart,
  X,
  Zap,
  CheckCircle2,
  Radar,
  RotateCcw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import { useMessSwiper, MessSwiperCard } from '../../src/hooks/useMessSwiper';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 110;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
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
  infoSection: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
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
  cancelBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default function DiscoverScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { addToShortlist, removeFromShortlist, isShortlisted, bookMeal, activeBooking } = useToken();
  const { allMesses, markSwiped, resetSwiped } = useMessSwiper();

  // Active Index Tracking for Deck Progression
  const [currentIndex, setCurrentIndex] = useState(0);

  // Booking Confirmation Modal State
  const [bookingModal, setBookingModal] = useState<{ visible: boolean; mess: MessSwiperCard | null; loading: boolean; error: string | null }>({
    visible: false,
    mess: null,
    loading: false,
    error: null,
  });

  // Track whether user is actively dragging (to distinguish tap vs swipe)
  const isDragging = useRef(false);

  // PanResponder Animated Position
  const position = useRef(new Animated.ValueXY()).current;

  // Active & Background Mess Card Selection
  const currentMess = currentIndex < allMesses.length ? allMesses[currentIndex] : null;
  const nextMess = currentIndex + 1 < allMesses.length ? allMesses[currentIndex + 1] : null;

  // Ref to prevent Stale Closure bugs inside PanResponder handlers
  const currentMessRef = useRef<MessSwiperCard | null>(currentMess);
  useEffect(() => {
    currentMessRef.current = currentMess;
  }, [currentMess]);

  // Rotation Interpolation
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  // Stamp Opacity Interpolations
  const shortlistOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 120 : -SCREEN_WIDTH - 120;
    Animated.spring(position, {
      toValue: { x, y: 0 },
      speed: 18,
      bounciness: 4,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'left' | 'right') => {
    const activeMess = currentMessRef.current;
    if (activeMess) {
      if (direction === 'right') {
        addToShortlist(activeMess.id);
      } else if (direction === 'left') {
        removeFromShortlist(activeMess.id);
      }
      markSwiped(activeMess.id);
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5) {
          isDragging.current = true;
        }
        position.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.5) {
          forceSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.5) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const handleResetDeck = () => {
    resetSwiped();
    setCurrentIndex(0);
  };

  const handleQuickBook = (mess: MessSwiperCard) => {
    if (activeBooking && activeBooking.status === 'booked') {
      setBookingModal({ visible: true, mess: null, loading: false, error: `You already have a meal booked at ${activeBooking.messName}. Cancel or complete it first.` });
      return;
    }
    setBookingModal({ visible: true, mess, loading: false, error: null });
  };

  const confirmBooking = async () => {
    if (!bookingModal.mess) return;
    const mess = bookingModal.mess;
    setBookingModal((prev) => ({ ...prev, loading: true }));

    const res = await bookMeal(
      mess.id,
      mess.name,
      mess.address,
      'Lunch',
      mess.highlights
    );

    if (res.success) {
      setBookingModal({ visible: false, mess: null, loading: false, error: null });
      router.push('/(customer)/bookings');
    } else {
      setBookingModal((prev) => ({ ...prev, loading: false, error: res.message || 'Something went wrong.' }));
    }
  };

  const dismissBookingModal = () => {
    setBookingModal({ visible: false, mess: null, loading: false, error: null });
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Floating Header */}
      <FloatingHeader title="Mess Menu Swiper" titleAlign="center" showBackButton={false} />

      <View style={styles.swiperContainer}>
        {currentMess ? (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Background Card Preview (Next Mess in Deck) */}
            {nextMess && (
              <View style={[styles.cardWrapper, styles.backgroundCardStyle]}>
                <View style={[styles.fullCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: 0.5 }]}>
                  <View style={styles.imageHeroSection}>
                    <Image source={{ uri: nextMess.image }} style={styles.heroImage} />
                  </View>
                </View>
              </View>
            )}

            {/* Foreground Interactive Card (Current Mess) */}
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
                },
              ]}
            >
              <View style={[styles.fullCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {/* Top Image Section (46% Height) — swipe drag zone + tappable for detail */}
                <View {...panResponder.panHandlers} style={styles.imageHeroSection}>
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => router.push(`/(customer)/mess-detail?messId=${currentMess.id}`)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: currentMess.image }} style={styles.heroImage} />
                  </TouchableOpacity>
                  <LinearGradient
                    colors={['transparent', 'rgba(8, 12, 14, 0.95)']}
                    style={styles.heroGradientOverlay}
                    pointerEvents="none"
                  />

                  {/* SHORTLIST STAMP OVERLAY */}
                  <Animated.View style={[styles.stampContainer, styles.shortlistStamp, { opacity: shortlistOpacity }]} pointerEvents="none">
                    <Text style={styles.shortlistStampText}>SHORTLIST</Text>
                  </Animated.View>

                  {/* SKIP STAMP OVERLAY */}
                  <Animated.View style={[styles.stampContainer, styles.skipStamp, { opacity: skipOpacity }]} pointerEvents="none">
                    <Text style={styles.skipStampText}>SKIP</Text>
                  </Animated.View>

                  {/* Top Badges */}
                  <View style={styles.topBadgesRow} pointerEvents="none">
                    <BlurView intensity={70} tint="dark" style={styles.glassBadge}>
                      <Text style={styles.glassBadgeText}>{currentMess.type}</Text>
                    </BlurView>

                    <BlurView intensity={70} tint="dark" style={styles.glassBadge}>
                      <Star size={12} color="#10B981" fill="#10B981" />
                      <Text style={styles.glassBadgeText}>{currentMess.rating}</Text>
                    </BlurView>
                  </View>

                  {/* Image Overlay Footer */}
                  <View style={styles.heroFooterInfo} pointerEvents="none">
                    <Text style={styles.messTitleText}>{currentMess.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <MapPin size={13} color="#A7F3D0" />
                      <Text style={{ color: '#A7F3D0', fontSize: 12, fontWeight: '700' }}>
                        {currentMess.address} -- {currentMess.distance}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Card Content Section — NO panHandlers, buttons are fully interactive */}
                <View style={styles.cardContentSection}>
                  {/* LARGE QUICK BOOK BUTTON */}
                  <TouchableOpacity
                    style={styles.quickBookHeroBtn}
                    onPress={() => handleQuickBook(currentMess)}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.quickBookHeroGrad}
                    >
                      <Zap size={20} color="#FFFFFF" />
                      <Text style={styles.quickBookHeroText}>QUICK BOOK (1 TOKEN)</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Cutoff Time Row */}
                  <View style={styles.cutoffPillRow}>
                    <Clock size={14} color="#10B981" />
                    <Text style={{ fontSize: 12, color: colors.textSub, fontWeight: '700' }}>
                      Strict Cutoff: <Text style={{ color: '#10B981' }}>{currentMess.cutoffTime}</Text>
                    </Text>
                  </View>

                  {/* Today's Special Box */}
                  <View style={styles.specialDishCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Flame size={15} color="#FF6B00" fill="#FF6B00" />
                      <Text style={styles.specialTag}>TODAY'S STAR DISH</Text>
                    </View>
                    <Text style={[styles.specialTitle, { color: colors.textMain }]}>{currentMess.starDish}</Text>
                  </View>

                  {/* Menu Highlights Chips */}
                  <Text style={[styles.includedLabel, { color: colors.textSub }]}>PASS MENU HIGHLIGHTS</Text>
                  <View style={styles.chipsWrap}>
                    {currentMess.highlights.map((dish, i) => (
                      <View key={i} style={styles.chipPill}>
                        <CheckCircle2 size={12} color="#10B981" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMain }}>{dish}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Bottom Action Controls — fully interactive, no panHandlers */}
                <View style={styles.bottomControlsRow}>
                  <TouchableOpacity
                    style={styles.passBtn}
                    onPress={() => forceSwipe('left')}
                    activeOpacity={0.85}
                  >
                    <X size={26} color="#EF4444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.shortlistBtn,
                      isShortlisted(currentMess.id) && { backgroundColor: '#10B981' },
                    ]}
                    onPress={() => forceSwipe('right')}
                    activeOpacity={0.85}
                  >
                    <Heart
                      size={26}
                      color={isShortlisted(currentMess.id) ? '#FFFFFF' : '#10B981'}
                      fill={isShortlisted(currentMess.id) ? '#FFFFFF' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        ) : (
          /* "YOU'VE SWIPED ALL MESSES" EMPTY STATE CARD */
          <AnimatedEntrance direction="up">
            <View style={[styles.emptyStateCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.radarIconCircle}>
                <Radar size={36} color="#10B981" />
              </View>

              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>You've swiped them all!</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                Check your shortlisted messes in the Decision Room or wait for dinner menus.
              </Text>

              <TouchableOpacity
                style={styles.goToShortlistBtn}
                onPress={() => router.push('/(customer)/shortlist')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shortlistBtnGrad}
                >
                  <Text style={styles.shortlistBtnText}>Go to Shortlist (Decision Room)</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetDeckBtn}
                onPress={handleResetDeck}
                activeOpacity={0.85}
              >
                <RotateCcw size={14} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>Re-swipe All Messes</Text>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}
      </View>

      <CustomerBottomBar activeTab="discover" />

      {/* ============ BOOKING CONFIRMATION MODAL ============ */}
      <Modal
        visible={bookingModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={dismissBookingModal}
      >
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={dismissBookingModal}
        >
          <TouchableOpacity activeOpacity={1} style={modalStyles.cardWrapper}>
            <View style={[modalStyles.card, { backgroundColor: isDark ? '#0F1A17' : '#FFFFFF', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              {/* Error-Only State */}
              {bookingModal.error && !bookingModal.mess ? (
                <>
                  <View style={modalStyles.iconCircle}>
                    <Zap size={24} color="#EF4444" />
                  </View>
                  <Text style={[modalStyles.title, { color: colors.textMain }]}>Cannot Book</Text>
                  <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>{bookingModal.error}</Text>
                  <TouchableOpacity style={modalStyles.cancelBtn} onPress={dismissBookingModal} activeOpacity={0.85}>
                    <Text style={modalStyles.cancelBtnText}>Got It</Text>
                  </TouchableOpacity>
                </>
              ) : bookingModal.mess ? (
                <>
                  {/* Header */}
                  <View style={modalStyles.iconCircle}>
                    <Zap size={24} color="#10B981" />
                  </View>
                  <Text style={[modalStyles.title, { color: colors.textMain }]}>Confirm Booking</Text>
                  <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>
                    Lock a meal at {bookingModal.mess.name}
                  </Text>

                  {/* Info Rows */}
                  <View style={modalStyles.infoSection}>
                    <View style={modalStyles.infoRow}>
                      <Flame size={14} color="#FF6B00" />
                      <Text style={[modalStyles.infoText, { color: colors.textMain }]}>{bookingModal.mess.starDish}</Text>
                    </View>
                    <View style={modalStyles.infoRow}>
                      <Clock size={14} color="#10B981" />
                      <Text style={[modalStyles.infoText, { color: colors.textMain }]}>Cutoff: {bookingModal.mess.cutoffTime}</Text>
                    </View>
                    <View style={modalStyles.infoRow}>
                      <Zap size={14} color="#F59E0B" />
                      <Text style={[modalStyles.infoText, { color: '#F59E0B' }]}>Deducts 1 Meal Token</Text>
                    </View>
                  </View>

                  {/* Error Message */}
                  {bookingModal.error && (
                    <Text style={modalStyles.errorText}>{bookingModal.error}</Text>
                  )}

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={[modalStyles.confirmBtn, bookingModal.loading && { opacity: 0.6 }]}
                    onPress={confirmBooking}
                    activeOpacity={0.88}
                    disabled={bookingModal.loading}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={modalStyles.confirmBtnGrad}
                    >
                      <Text style={modalStyles.confirmBtnText}>
                        {bookingModal.loading ? 'Booking...' : 'Confirm & Lock Booking'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={modalStyles.cancelBtn} onPress={dismissBookingModal} activeOpacity={0.85}>
                    <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : null}
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
    overflow: 'hidden',
  },
  swiperContainer: {
    flex: 1,
    paddingTop: 88,
    paddingBottom: 85,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backgroundCardStyle: {
    transform: [{ scale: 0.95 }, { translateY: 10 }],
  },
  fullCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageHeroSection: {
    height: '46%',
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stampContainer: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 3,
    zIndex: 99,
  },
  shortlistStamp: {
    right: 24,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    transform: [{ rotate: '15deg' }],
  },
  shortlistStampText: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '900',
  },
  skipStamp: {
    left: 24,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    transform: [{ rotate: '-15deg' }],
  },
  skipStampText: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '900',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  glassBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  heroFooterInfo: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
  },
  messTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cardContentSection: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  quickBookHeroBtn: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  quickBookHeroGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickBookHeroText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cutoffPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 8,
    borderRadius: 10,
  },
  specialDishCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    borderRadius: 12,
    padding: 10,
  },
  specialTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  specialTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  includedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortlistBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    textAlign: 'center',
  },
  radarIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  goToShortlistBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  shortlistBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortlistBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  resetDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});
