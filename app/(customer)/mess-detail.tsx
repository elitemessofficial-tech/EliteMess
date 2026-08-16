import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Star,
  MapPin,
  Clock,
  Heart,
  Zap,
  Flame,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import { supabase } from '../../src/services/supabase';
import { SEED_RESTAURANT_MESSES } from '../../src/services/dbSeedSync';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import Loader from '../../components/Loader';
import ConfirmModal from '../../components/ConfirmModal';
import ReviewsModal from '../../src/components/ReviewsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MessDetail {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  cutoffTime: string;
  image: string;
  starDish: string;
  highlights: string[];
  type: string;
  latitude?: number;
  longitude?: number;
}

export default function MessDetailScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { messId } = useLocalSearchParams<{ messId: string }>();
  const { addToShortlist, removeFromShortlist, isShortlisted, bookMeal, activeBooking } = useToken();

  const [mess, setMess] = useState<MessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsModal, setReviewsModal] = useState<{ visible: boolean; messId: string; messName: string }>({
    visible: false,
    messId: '',
    messName: '',
  });

  const fetchMessDetail = useCallback(async () => {
    if (!messId) return;
    setLoading(true);

    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('messes')
        .select('*')
        .eq('id', messId)
        .single();

      if (!error && data) {
        setMess({
          id: data.id,
          name: data.name,
          address: data.address,
          distance: data.distance || '300m (4 min walk)',
          rating: parseFloat(data.rating || '4.8'),
          cutoffTime: data.cutoff_time || '2:15 PM',
          image: data.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
          starDish: data.star_dish || 'Daily Special Thali',
          highlights: data.highlights || ['Daily Special', 'Rice', 'Roti'],
          type: data.type || 'Veg',
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Supabase mess detail fallback:', e);
    }

    // Fallback to local seed data
    const seedMatch = SEED_RESTAURANT_MESSES.find((m) => m.id === messId);
    if (seedMatch) {
      setMess({
        id: seedMatch.id,
        name: seedMatch.name,
        address: seedMatch.address,
        distance: seedMatch.distance,
        rating: seedMatch.rating,
        cutoffTime: seedMatch.cutoff_time,
        image: seedMatch.image_url,
        starDish: seedMatch.star_dish,
        highlights: seedMatch.highlights,
        type: seedMatch.type,
        latitude: seedMatch.latitude,
        longitude: seedMatch.longitude,
      });
    }
    setLoading(false);
  }, [messId]);

  useEffect(() => {
    fetchMessDetail();
  }, [fetchMessDetail]);

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

  const handleBookMeal = () => {
    if (!mess) return;

    if (activeBooking && activeBooking.status === 'booked') {
      setConfirmModal({
        visible: true,
        title: 'Active Booking Exists',
        message: `You already have a meal booked at ${activeBooking.messName}. Cancel or complete it first.`,
        icon: 'alert',
        confirmText: 'Got It',
        cancelText: 'Close',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: `Book at ${mess.name}?`,
      message: `This deducts 1 meal token. You'll get an 8-digit OTP to present at the counter before ${mess.cutoffTime}.`,
      icon: 'lock',
      confirmText: 'Lock Booking (1 Token)',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        const res = await bookMeal(
          mess.id,
          mess.name,
          mess.address,
          'Lunch',
          mess.highlights
        );
        setConfirmModal((prev) => ({ ...prev, visible: false, loading: false }));
        if (res.success) {
          router.push('/(customer)/bookings');
        } else {
          setConfirmModal({
            visible: true,
            title: 'Booking Error',
            message: res.message || 'Something went wrong',
            icon: 'alert',
            confirmText: 'Got It',
            cancelText: 'Close',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const handleGetDirections = () => {
    if (!mess) return;
    router.push({
      pathname: '/(customer)/all-messes',
      params: { view: 'map', targetMessId: mess.id },
    });
  };

  const handleToggleShortlist = () => {
    if (!mess) return;
    if (isShortlisted(mess.id)) {
      removeFromShortlist(mess.id);
    } else {
      addToShortlist(mess.id);
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

  if (loading || !mess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <FloatingHeader showBackButton={true} />
        <View style={styles.loadingCenter}>
          <Loader color={colors.emerald} />
          <Text style={{ color: colors.textSub, fontSize: 14, marginTop: 16 }}>Loading mess details...</Text>
        </View>
      </View>
    );
  }

  const shortlisted = isShortlisted(mess.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: mess.image }} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', 'rgba(8, 12, 14, 0.7)', 'rgba(8, 12, 14, 0.97)']}
            style={styles.heroGradient}
          />

          {/* Floating Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <BlurView intensity={80} tint="dark" style={styles.backButtonBlur}>
              <ChevronLeft size={20} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>

          {/* Floating Shortlist Button */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={handleToggleShortlist}
            activeOpacity={0.85}
          >
            <BlurView intensity={80} tint="dark" style={styles.heartButtonBlur}>
              <Heart
                size={20}
                color={shortlisted ? '#10B981' : '#FFFFFF'}
                fill={shortlisted ? '#10B981' : 'transparent'}
              />
            </BlurView>
          </TouchableOpacity>

          {/* Top Badges */}
          <View style={styles.heroBadgesRow}>
            <BlurView intensity={70} tint="dark" style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{mess.type}</Text>
            </BlurView>
            <BlurView intensity={70} tint="dark" style={styles.heroBadge}>
              <Star size={12} color="#10B981" fill="#10B981" />
              <Text style={styles.heroBadgeText}>{mess.rating}</Text>
            </BlurView>
          </View>

          {/* Hero Title Overlay */}
          <View style={styles.heroTitleOverlay}>
            <Text style={styles.heroTitle}>{mess.name}</Text>
            <View style={styles.heroSubRow}>
              <MapPin size={14} color="#A7F3D0" />
              <Text style={styles.heroSubText}>{mess.address}</Text>
              <Text style={styles.heroDot}>--</Text>
              <Text style={styles.heroSubText}>{mess.distance}</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Primary Actions: Book Meal & Student Reviews */}
          <AnimatedEntrance direction="up" delay={0}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.bookButton, { flex: 1, marginBottom: 0 }]}
                onPress={handleBookMeal}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bookButtonGrad}
                >
                  <Zap size={18} color="#FFFFFF" />
                  <Text style={[styles.bookButtonText, { fontSize: 13 }]}>BOOK (1 TOKEN)</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: 'rgba(245, 158, 11, 0.14)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
                onPress={() => setReviewsModal({ visible: true, messId: mess.id, messName: mess.name })}
                activeOpacity={0.85}
              >
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '900' }}>Reviews</Text>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>

          {/* Cutoff Time Card */}
          <AnimatedEntrance direction="up" delay={60}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={styles.infoRow}>
                <Clock size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSub }]}>BOOKING CUTOFF</Text>
                  <Text style={[styles.infoValue, { color: colors.textMain }]}>{mess.cutoffTime}</Text>
                </View>
              </View>
              <Text style={[styles.infoHint, { color: colors.textSub }]}>
                You must present your OTP at the counter before this time. Late arrivals are marked as no-show.
              </Text>
            </View>
          </AnimatedEntrance>

          {/* Star Dish Card */}
          <AnimatedEntrance direction="up" delay={120}>
            <View style={[styles.starDishCard, { borderColor: 'rgba(255, 107, 0, 0.25)' }]}>
              <View style={styles.starDishHeader}>
                <Flame size={18} color="#FF6B00" fill="#FF6B00" />
                <Text style={styles.starDishTag}>TODAY'S STAR DISH</Text>
              </View>
              <Text style={[styles.starDishName, { color: colors.textMain }]}>{mess.starDish}</Text>
            </View>
          </AnimatedEntrance>

          {/* Full Dish Menu */}
          <AnimatedEntrance direction="up" delay={180}>
            <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.menuCardTitle, { color: colors.textSub }]}>DISH MENU</Text>
              {mess.highlights.map((dish, i) => (
                <View key={i} style={styles.menuItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={[styles.menuItemText, { color: colors.textMain }]}>{dish}</Text>
                </View>
              ))}
            </View>
          </AnimatedEntrance>

          {/* Get Directions Card */}
          <AnimatedEntrance direction="up" delay={240}>
            <TouchableOpacity
              style={[styles.directionsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={handleGetDirections}
              activeOpacity={0.85}
            >
              <View style={styles.directionsRow}>
                <Navigation size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.directionsTitle, { color: colors.textMain }]}>Get Directions</Text>
                  <Text style={[styles.directionsAddress, { color: colors.textSub }]}>{mess.address}</Text>
                </View>
                <ChevronRight size={18} color={colors.textSub} />
              </View>
            </TouchableOpacity>
          </AnimatedEntrance>

          {/* Shortlist Toggle Card */}
          <AnimatedEntrance direction="up" delay={300}>
            <TouchableOpacity
              style={[
                styles.shortlistCard,
                {
                  backgroundColor: shortlisted ? 'rgba(16, 185, 129, 0.12)' : colors.cardBg,
                  borderColor: shortlisted ? '#10B981' : colors.cardBorder,
                },
              ]}
              onPress={handleToggleShortlist}
              activeOpacity={0.85}
            >
              <Heart
                size={18}
                color="#10B981"
                fill={shortlisted ? '#10B981' : 'transparent'}
              />
              <Text style={[styles.shortlistCardText, { color: shortlisted ? '#10B981' : colors.textMain }]}>
                {shortlisted ? 'Saved to Decision Room' : 'Add to Decision Room'}
              </Text>
            </TouchableOpacity>
          </AnimatedEntrance>

          {/* Trust Badge */}
          <AnimatedEntrance direction="up" delay={360}>
            <View style={styles.trustBadge}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={[styles.trustText, { color: colors.textSub }]}>
                Verified Campus Dining Partner -- Quality Checked
              </Text>
            </View>
          </AnimatedEntrance>
        </View>
      </ScrollView>

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

      {mess && (
        <ReviewsModal
          visible={reviewsModal.visible}
          messId={reviewsModal.messId}
          messName={reviewsModal.messName}
          onClose={() => setReviewsModal({ visible: false, messId: '', messName: '' })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    width: '100%',
    height: 340,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 44,
    left: 16,
    zIndex: 10,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  heartButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 44,
    right: 16,
    zIndex: 10,
  },
  heartButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBadgesRow: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 64 : 92,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  heroSubText: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '700',
  },
  heroDot: {
    color: '#A7F3D0',
    fontSize: 13,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },
  bookButton: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookButtonGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  infoHint: {
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  starDishCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  starDishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starDishTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  starDishName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  menuCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  directionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  directionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directionsTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  directionsAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  shortlistCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  shortlistCardText: {
    fontSize: 14,
    fontWeight: '800',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  trustText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
