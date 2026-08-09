import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Star,
  MapPin,
  Clock,
  Flame,
  Heart,
  Zap,
  CheckCircle2,
  X,
  Store,
  Filter,
} from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useToken } from '../../src/context/TokenContext';
import { supabase } from '../../src/services/supabase';
import { SEED_RESTAURANT_MESSES, MessRestaurantDB } from '../../src/services/dbSeedSync';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import ConfirmModal from '../../components/ConfirmModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AllMessesScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { addToShortlist, removeFromShortlist, isShortlisted, bookMeal, activeBooking } = useToken();

  const [messes, setMesses] = useState<MessRestaurantDB[]>(SEED_RESTAURANT_MESSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchAllMesses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messes')
        .select('*')
        .order('rating', { ascending: false });

      if (data && data.length > 0) {
        setMesses(data);
      } else {
        setMesses(SEED_RESTAURANT_MESSES);
      }
    } catch (e) {
      setMesses(SEED_RESTAURANT_MESSES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMesses();
  }, [fetchAllMesses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllMesses();
  };

  const categories = ['All', 'Pure Veg', 'Non-Veg & Veg', 'Punjabi Special', 'Kathiyawadi Veg'];

  const filteredMesses = messes.filter((mess) => {
    const matchesSearch =
      mess.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mess.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mess.star_dish.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat =
      selectedCategory === 'All' ||
      mess.type.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCat;
  });

  const handleBookMealClick = (mess: MessRestaurantDB) => {
    if (activeBooking && activeBooking.status === 'booked') {
      setConfirmModal({
        visible: true,
        title: 'Active Booking Exists',
        message: `You already have an active meal booking at ${activeBooking.messName}. Cancel or complete it first.`,
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
      message: `This deducts 1 meal token for ${mess.star_dish}. Your OTP will expire at ${mess.cutoff_time}.`,
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
            title: 'Booking Notice',
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
    cardBg: isDark ? 'rgba(18, 26, 23, 0.88)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Floating Header */}
      <FloatingHeader title="All Partner Messes" titleAlign="center" showBackButton={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
      >
        {/* Banner Section */}
        <AnimatedEntrance direction="down">
          <View style={[styles.bannerCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.bannerIconCircle}>
                <Store size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.textMain }]}>Explore Campus Messes</Text>
                <Text style={[styles.bannerSub, { color: colors.textSub }]}>
                  Choose from {messes.length} verified partner dining halls with flexible meal pass redemption.
                </Text>
              </View>
            </View>

            {/* Search Input Box */}
            <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }]}>
              <Search size={18} color={colors.textSub} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Search by mess name, dish, or location..."
                placeholderTextColor={colors.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <X size={16} color={colors.textSub} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isActive ? '#10B981' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isActive ? '#10B981' : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: isActive ? '#FFFFFF' : colors.textMain, fontWeight: isActive ? '900' : '700' },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </AnimatedEntrance>

        {/* Count Label */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSub }}>
            Showing {filteredMesses.length} Mess Partner{filteredMesses.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Empty State if No Mess Matches Search */}
        {filteredMesses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Store size={40} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Mess Partners Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSub }]}>
              Try adjusting your search filter or selecting a different category.
            </Text>
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>Reset Search Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Mess Cards List */
          filteredMesses.map((item, idx) => {
            const shortlisted = isShortlisted(item.id);
            return (
              <AnimatedEntrance key={item.id} delay={idx * 60}>
                <View style={[styles.messCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  {/* Top Image Banner */}
                  <View style={styles.cardImageHero}>
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(8, 12, 14, 0.9)']}
                      style={styles.imageOverlay}
                    />

                    {/* Top Badges */}
                    <View style={styles.topBadges}>
                      <BlurView intensity={75} tint="dark" style={styles.badgePill}>
                        <Text style={styles.badgeText}>{item.type}</Text>
                      </BlurView>
                      <BlurView intensity={75} tint="dark" style={styles.badgePill}>
                        <Star size={11} color="#10B981" fill="#10B981" />
                        <Text style={styles.badgeText}>{item.rating}</Text>
                      </BlurView>
                    </View>

                    {/* Shortlist Heart Icon */}
                    <TouchableOpacity
                      style={[styles.heartBtn, shortlisted && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                      onPress={() => (shortlisted ? removeFromShortlist(item.id) : addToShortlist(item.id))}
                      activeOpacity={0.8}
                    >
                      <Heart
                        size={16}
                        color={shortlisted ? '#FFFFFF' : '#10B981'}
                        fill={shortlisted ? '#FFFFFF' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Body Info */}
                  <View style={styles.cardBody}>
                    {/* Mess Name & Distance */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.messName, { color: colors.textMain }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <MapPin size={12} color={colors.textSub} />
                          <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>
                            {item.address} · {item.distance}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Star Dish Box */}
                    <View style={styles.starDishRow}>
                      <Flame size={14} color="#FF6B00" fill="#FF6B00" />
                      <Text style={styles.starDishText} numberOfLines={1}>
                        {item.star_dish}
                      </Text>
                    </View>

                    {/* Highlights Chips */}
                    <View style={styles.chipsWrap}>
                      {item.highlights.slice(0, 3).map((h, i) => (
                        <View key={i} style={styles.chipPill}>
                          <CheckCircle2 size={10} color="#10B981" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMain }}>{h}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Cutoff Time Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Clock size={12} color="#10B981" />
                      <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>
                        Cutoff Time: <Text style={{ color: '#10B981' }}>{item.cutoff_time}</Text>
                      </Text>
                    </View>

                    {/* Card Actions Row */}
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => router.push(`/(customer)/mess-detail?messId=${item.id}`)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.detailBtnText, { color: colors.textMain }]}>View Menu</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => handleBookMealClick(item)}
                        activeOpacity={0.88}
                      >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.bookBtnGrad}
                        >
                          <Zap size={14} color="#FFFFFF" />
                          <Text style={styles.bookBtnText}>Book (1 Token)</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedEntrance>
            );
          })
        )}
      </ScrollView>

      {/* Confirmation Card Modal */}
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

      <CustomerBottomBar activeTab="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 95,
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 14,
  },
  bannerCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  bannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
  },
  messCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageHero: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8, 12, 14, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  messName: {
    fontSize: 17,
    fontWeight: '900',
  },
  starDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 2,
  },
  starDishText: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  detailBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bookBtn: {
    flex: 1.3,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookBtnGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  clearSearchBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});
