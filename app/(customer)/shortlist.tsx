import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock,
  Flame,
  Star,
  MapPin,
  Clock,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import { supabase } from '../../src/services/supabase';
import { SEED_RESTAURANT_MESSES } from '../../src/services/dbSeedSync';
import LottieView from 'lottie-react-native';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import ConfirmModal from '../../components/ConfirmModal';

interface MessCardData {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  cutoffTime: string;
  image: string;
  starDish: string;
  highlights: string[];
}

// Legacy ID to UUID normalization map
const LEGACY_ID_MAP: Record<string, string> = {
  mess_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  mess_2: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  mess_3: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  mess_4: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  mess_5: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
};

export default function ShortlistScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { shortlistedMessIds, toggleShortlistMess, removeFromShortlist, bookMeal, activeBooking } = useToken();

  const [dbMesses, setDbMesses] = useState<MessCardData[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch live shortlisted messes directly from Supabase DB or Local Seed Data
  const fetchShortlistedMesses = useCallback(async () => {
    if (shortlistedMessIds.length === 0) {
      setDbMesses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {

    // Normalize IDs to valid UUIDs for Supabase queries
    const normalizedIds = shortlistedMessIds.map((id) => LEGACY_ID_MAP[id] || id);
    const validUuids = normalizedIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );

    let supabaseResults: MessCardData[] = [];

    if (validUuids.length > 0) {
      try {
        const { data, error } = await supabase
          .from('messes')
          .select('*')
          .in('id', validUuids);

        if (!error && data && data.length > 0) {
          supabaseResults = data.map((m: any) => ({
            id: m.id,
            name: m.name,
            address: m.address,
            distance: m.distance || '300m (4 min walk)',
            rating: parseFloat(m.rating || '4.8'),
            cutoffTime: m.cutoff_time || '2:15 PM',
            image: m.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            starDish: m.star_dish || 'Daily Special Thali',
            highlights: m.highlights || ['Daily Special', 'Rice', 'Roti'],
          }));
        }
      } catch (e) {
        console.warn('Supabase shortlist query fallback notice:', e);
      }
    }

    // Combine Supabase results with local SEED_RESTAURANT_MESSES to guarantee zero missing cards
    const localMatches: MessCardData[] = SEED_RESTAURANT_MESSES
      .filter((m) => shortlistedMessIds.includes(m.id) || normalizedIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        address: m.address,
        distance: m.distance,
        rating: m.rating,
        cutoffTime: m.cutoff_time,
        image: m.image_url,
        starDish: m.star_dish,
        highlights: m.highlights,
      }));

    // Merge without duplicates
    const combinedMap = new Map<string, MessCardData>();
    localMatches.forEach((m) => combinedMap.set(m.id, m));
    supabaseResults.forEach((m) => combinedMap.set(m.id, m));

    setDbMesses(Array.from(combinedMap.values()));
    } finally {
      setLoading(false);
    }
  }, [shortlistedMessIds]);

  useEffect(() => {
    fetchShortlistedMesses();
  }, [fetchShortlistedMesses]);

  const handleLockBooking = (mess: MessCardData) => {
    if (activeBooking && activeBooking.status === 'booked') {
      setConfirmModal({
        visible: true,
        title: 'Active Booking Exists!',
        message: `You already have an active meal booked at ${activeBooking.messName}. Please cancel or complete it before locking another meal.`,
        icon: 'alert',
        confirmText: 'Got It',
        cancelText: 'Close',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: `Lock Meal Booking at ${mess.name}?`,
      message: `This will deduct 1 meal token from your balance. You will get an 8-digit dining OTP to present at counter before cutoff (${mess.cutoffTime}).`,
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

  const handleRemoveMess = (messId: string) => {
    removeFromShortlist(messId);
    setDbMesses((prev) => prev.filter((m) => m.id !== messId));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader title="Decision Room" titleAlign="center" showBackButton={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Notice */}
        <AnimatedEntrance direction="down">
          <View style={styles.headerNoticeCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
                DECISION ROOM • {dbMesses.length} SHORTLISTED MESSES
              </Text>
            </View>
            <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4 }}>
              Compare today's menus side-by-side and tap "Lock Booking" to deduct 1 token and generate your OTP.
            </Text>
          </View>
        </AnimatedEntrance>

        {/* Shortlisted Mess Cards List OR Loading OR Empty State */}
        {loading ? (
          <AnimatedEntrance direction="up" delay={50}>
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, minHeight: 280, justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 30 }]}>
              <LottieView
                source={require('../../assets/images/food.lottie')}
                autoPlay
                loop
                style={{ width: 150, height: 150 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.textMain, marginTop: 12, fontSize: 16, textAlign: 'center' }]}>
                Loading Shortlisted Messes...
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSub, marginTop: 6, textAlign: 'center', maxWidth: 280 }]}>
                Comparing menus and preparing your Decision Room
              </Text>
            </View>
          </AnimatedEntrance>
        ) : dbMesses.length > 0 ? (
          dbMesses.map((mess, index) => (
            <AnimatedEntrance key={mess.id} direction="up" delay={index * 80}>
              <View style={[styles.decisionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {/* Mess Top Row — tappable to open detail */}
                <TouchableOpacity
                  style={styles.messRowHeader}
                  onPress={() => router.push(`/(customer)/mess-detail?messId=${mess.id}`)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: mess.image }} style={styles.messThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.messName, { color: colors.textMain }]}>{mess.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MapPin size={12} color="#10B981" />
                      <Text style={{ fontSize: 11, color: colors.textSub }}>{mess.distance}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={(e) => { e.stopPropagation(); handleRemoveMess(mess.id); }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Today's Special Banner */}
                <View style={styles.specialBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Flame size={14} color="#FF6B00" fill="#FF6B00" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#FF6B00' }}>TODAY'S SPECIAL</Text>
                  </View>
                  <Text style={[styles.starDishName, { color: colors.textMain }]}>{mess.starDish}</Text>
                </View>

                {/* Menu Highlights List */}
                <View style={styles.menuChipsWrap}>
                  {mess.highlights.map((dish, i) => (
                    <View key={i} style={styles.menuChip}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMain }}>{dish}</Text>
                    </View>
                  ))}
                </View>

                {/* Cutoff Time Row */}
                <View style={styles.cutoffRow}>
                  <Clock size={14} color="#10B981" />
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>
                    Pre-Book Cutoff: <Text style={{ color: '#10B981' }}>{mess.cutoffTime}</Text>
                  </Text>
                </View>

                {/* GIANT LOCK BOOKING BUTTON */}
                <TouchableOpacity
                  style={styles.lockBtn}
                  onPress={() => handleLockBooking(mess)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.lockGrad}
                  >
                    <Lock size={18} color="#FFFFFF" />
                    <Text style={styles.lockBtnText}>LOCK BOOKING (DEDUCT 1 TOKEN)</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </AnimatedEntrance>
          ))
        ) : (
          /* CLEAN EMPTY STATE CARD */
          <AnimatedEntrance direction="up" delay={100}>
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.emptyIconCircle}>
                <ShieldCheck size={32} color="#10B981" />
              </View>

              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Decision Room is Empty</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                Swipe right on mess cards in the Discover tab to add them to your decision room for instant comparison.
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
                  <Text style={styles.discoverBtnText}>Explore Mess Swiper</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}
      </ScrollView>

      <CustomerBottomBar activeTab="shortlist" />

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
  headerNoticeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 18,
    padding: 14,
  },
  decisionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  messRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  messName: {
    fontSize: 16,
    fontWeight: '900',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialBanner: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    padding: 10,
    borderRadius: 12,
  },
  starDishName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  menuChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  menuChip: {
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
  cutoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  lockGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
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
});
