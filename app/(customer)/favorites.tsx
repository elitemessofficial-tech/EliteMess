import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Plus, Minus, ShoppingBag, UtensilsCrossed } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCart } from '../../src/context/CartContext';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { getFavoriteDishIds, toggleFavoriteDishId } from '../../src/utils/favorites';
import { useFocusEffect } from 'expo-router';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { cart, menuItems, addToCart, removeFromCart, cartTotalItems, cartTotalPrice } = useCart();
  const [favIds, setFavIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    const ids = await getFavoriteDishIds();
    setFavIds(ids);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleToggleFav = async (dishId: string) => {
    const updated = await toggleFavoriteDishId(dishId);
    setFavIds(updated);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const favoriteDishes = menuItems.filter(item => favIds.includes(item.id));

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader
        title="My Favorite Dishes"
        titleAlign="center"
        showBackButton={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239, 68, 68, 0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444' }}>
              <Heart size={22} color="#EF4444" fill="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '900' }}>Your Saved Favorites ({favoriteDishes.length})</Text>
              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                Quickly order your most-loved dishes from Hotel Bet with a single tap.
              </Text>
            </View>
          </View>
        </View>

        {favoriteDishes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <UtensilsCrossed size={44} color={colors.textSub} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '900' }}>No Favorite Dishes Saved</Text>
            <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
              Tap the ❤️ heart icon on any dish in the restaurant menu to save your favorite meals here!
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(customer)/menu')}
              style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>EXPLORE MENU →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          favoriteDishes.map((item, idx) => {
            const qty = cart[item.id] || 0;
            const isNonVeg = item.category.toLowerCase().includes('non-veg') || item.category.toLowerCase().includes('chicken') || item.category.toLowerCase().includes('mutton') || item.category.toLowerCase().includes('fish');

            return (
              <AnimatedEntrance key={item.id} delay={idx * 50}>
                <View style={[styles.dishCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Food Details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {/* Veg / Non-Veg Indicator */}
                        <View style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          borderWidth: 1.5,
                          borderColor: isNonVeg ? '#EF4444' : '#10B981',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <View style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isNonVeg ? '#EF4444' : '#10B981',
                          }} />
                        </View>

                        <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '900', flex: 1 }}>
                          {item.name}
                        </Text>
                      </View>

                      <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, lineHeight: 15 }} numberOfLines={2}>
                        {item.description || item.category}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        <Text style={{ color: colors.accentGold, fontSize: 15, fontWeight: '900' }}>
                          ₹ {item.price.toLocaleString()}
                        </Text>

                        {/* Add to Cart Control */}
                        {qty > 0 ? (
                          <View style={styles.quantityControl}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                              <Minus size={11} color="#000000" />
                            </TouchableOpacity>
                            <Text style={styles.qtyVal}>{qty}</Text>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}>
                              <Plus size={11} color="#000000" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: colors.accentGold }]}
                            onPress={() => addToCart(item.id)}
                            activeOpacity={0.8}
                          >
                            <Plus size={13} color="#000000" />
                            <Text style={{ color: '#000000', fontSize: 11, fontWeight: '900', marginLeft: 4 }}>ADD</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Right Image + Remove Fav Heart Badge */}
                    <View style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative' }}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                          <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'center', fontWeight: '700' }}>Hotel Bet Special</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleToggleFav(item.id)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(15, 15, 12, 0.75)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 0.8,
                          borderColor: '#EF4444'
                        }}
                      >
                        <Heart size={14} color="#EF4444" fill="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedEntrance>
            );
          })
        )}
      </ScrollView>

      {cartTotalItems > 0 && (
        <View style={styles.floatingFooterContainer}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={[styles.footerInner, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(10, 10, 8, 0.85)' : 'rgba(255, 255, 255, 0.9)' }]}>
            <View>
              <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900' }}>
                {cartTotalItems} Item{cartTotalItems > 1 ? 's' : ''} · ₹ {cartTotalPrice.toLocaleString()}
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 10 }}>Ready to order</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(customer)/cart')} style={{ borderRadius: 10, overflow: 'hidden' }}>
              <LinearGradient colors={colors.goldGrad} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>Checkout →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}
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
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dishCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 6,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyVal: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  floatingFooterContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
});
