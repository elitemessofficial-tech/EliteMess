import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingCart, ChevronLeft, Plus, Minus } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCart } from '../../src/context/CartContext';
import { supabase } from '../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available?: boolean;
  image_url?: string | null;
  branch_id?: string;
}

const MOCK_MENU: MenuItem[] = [
  { id: 'm1', name: "Crispy Paneer", price: 239, category: "Veg Starter", description: "Crisp fried paneer tossed in savory spices" },
  { id: 'm2', name: "Masala Papad", price: 49, category: "Papad", description: "Fried or roasted papad topped with spicy onion tomato mix" },
  { id: 'm3', name: "Chicken Chilli", price: 239, category: "Non-Veg Starter", description: "Tender chicken chunks in spicy chilli glaze" },
  { id: 'm4', name: "Paneer Tikka", price: 239, category: "Tandoor Veg Starter", description: "Skewered char-grilled spiced paneer cubes" },
  { id: 'm5', name: "Paneer Butter Masala", price: 259, category: "Main Course Veg", description: "Paneer in rich tomato, butter, and cashew gravy" },
  { id: 'm6', name: "Dal Fry", price: 139, category: "Main Course Veg", description: "Yellow lentils tempered with ghee, cumin, onion, and garlic" }
];

const CATEGORIES = [
  'All',
  'Veg Starter',
  'Papad',
  'Non-Veg Starter',
  'Fish Starter',
  'Tandoor Veg Starter',
  'Tandoor Non-Veg Starter',
  'Main Course Veg',
  'Maharashtra Special Veg',
  'Non-Veg Main Course (Chicken & Egg)',
  'Non-Veg Main Course (Mutton)',
  'Rice & Biryani',
  'Indian Breads',
  'Maharashtrian Thali & Veg Thali',
  'Kolhapuri Lal Masala Thali',
  'Chicken Dum Murgha & Maharaja Group Dishes',
  'Special Kala Masala Thali (Black Gravy)',
  'Bhigwan Special Chilapi Thali (Fish)'
];

export default function MenuScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { cart, menuItems, addToCart, removeFromCart, clearCart, cartTotalItems, cartTotalPrice, loading } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('Hotel Bet — Menu');

  useEffect(() => {
    const initBranchMenu = async () => {
      try {
        const branchId = await AsyncStorage.getItem('selected_branch_id');
        const activeBranchId = branchId || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
        setSelectedBranchId(activeBranchId);

        // Fetch branch name dynamically from Supabase
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', activeBranchId)
          .single();
        if (branchData?.name) {
          setBranchName(branchData.name);
        }

        // Branch mismatch cart cleanup
        const cartItemIds = Object.keys(cart).filter(id => cart[id] > 0);
        if (cartItemIds.length > 0 && menuItems.length > 0) {
          const hasMismatch = cartItemIds.some(itemId => {
            const item = menuItems.find(m => m.id === itemId);
            return item && item.branch_id !== activeBranchId;
          });

          if (hasMismatch) {
            console.log('Branch mismatch detected! Clearing cart.');
            clearCart();
          }
        }
      } catch (e) {
        console.error('Error initializing branch menu:', e);
      }
    };

    initBranchMenu();
  }, [menuItems, cart]);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37', // Gold highlight
    goldGrad: ['#E2B755', '#B88E2F'] as const,
    pillInactive: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.05)',
  };

  const handleAddToCart = (id: string) => {
    addToCart(id);
  };

  const handleRemoveFromCart = (id: string) => {
    removeFromCart(id);
  };

  const branchItems = selectedBranchId
    ? menuItems.filter(item => item.branch_id === selectedBranchId)
    : menuItems;

  const filteredMenu = selectedCategory === 'All'
    ? branchItems
    : branchItems.filter(item => item.category === selectedCategory);

  const renderItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const qty = cart[item.id] || 0;
    const isUnavailable = item.is_available === false;

    return (
      <AnimatedEntrance delay={index * 60}>
        <View style={[
          styles.cardWrapper,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          isUnavailable && { opacity: 0.6 }
        ]}>
          <View style={styles.cardContent}>
            {/* Left Details */}
            <View style={styles.menuInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.menuName, { color: colors.textMain }]}>{item.name}</Text>
                {isUnavailable && (
                  <View style={styles.unavailableBadge}>
                    <Text style={styles.unavailableBadgeText}>NOT DELIVERABLE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuDescription, { color: colors.textSub }]}>{item.description}</Text>

              <View style={styles.priceRow}>
                <Text style={[styles.menuPrice, { color: colors.accentGold }]}>
                  ₹ {item.price.toLocaleString()}
                </Text>

                {isUnavailable ? (
                  <View style={styles.unavailablePlaceholder}>
                    <Text style={styles.unavailablePlaceholderText}>Temporarily Out</Text>
                  </View>
                ) : qty > 0 ? (
                  <View style={styles.quantityControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleRemoveFromCart(item.id)}>
                      <Minus size={11} color="#000000" />
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAddToCart(item.id)}>
                      <Plus size={11} color="#000000" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.plusCircle, { backgroundColor: colors.accentGold }]}
                    onPress={() => handleAddToCart(item.id)}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#000000" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Right Image */}
            <View style={styles.photoContainer}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.foodPhoto}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.photoText}>Food Photo</Text>
              )}
            </View>
          </View>
        </View>
      </AnimatedEntrance>
    );
  };

  const renderFloatingFooter = () => (
    <View style={styles.floatingFooterContainer}>
      <BlurView
        intensity={95}
        tint={isDark ? 'dark' : 'light'}
        blurMethod="dimezisBlurView"
        style={[
          styles.footerInner,
          {
            borderColor: colors.cardBorder,
            backgroundColor: isDark ? 'rgba(10, 10, 8, 0.35)' : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 1
          }
        ]}
      >
        <View style={styles.footerSummary}>
          <Text style={[styles.footerTitle, { color: colors.textMain }]}>
            {cartTotalItems} Item{cartTotalItems > 1 ? 's' : ''} · ₹ {cartTotalPrice.toLocaleString()}
          </Text>
          <Text style={[styles.footerSubtitle, { color: colors.textSub }]}>Luxury cart ready</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(customer)/cart')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.goldGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutBtnGrad}
          >
            <Text style={styles.checkoutBtnText}>Checkout →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader
        title={branchName}
        titleAlign="center"
        showBackButton={true}
        rightContent={(
          <TouchableOpacity
            onPress={() => router.push('/(customer)/cart')}
            style={[
              styles.cartCircle,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                borderWidth: isDark ? 0 : 0.8,
                borderColor: 'rgba(15, 23, 42, 0.06)'
              }
            ]}
          >
            <ShoppingCart size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />
            {cartTotalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.accentGold }]}>
                <Text style={styles.badgeValText}>{cartTotalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Categories Horizontal Pill scroller */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map(category => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? 'transparent' : colors.pillInactive,
                    borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.08)',
                  }
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.85}
              >
                {isActive ? (
                  <LinearGradient
                    colors={colors.goldGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? '#000000' : colors.textMain }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMenu}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />

      {cartTotalItems > 0 && renderFloatingFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  cartCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeValText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  categoryWrapper: {
    paddingTop: 100,
    paddingBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
    height: 44,
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuInfo: {
    flex: 1,
    marginRight: 16,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  menuPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#D4AF37',
    padding: 2,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    marginHorizontal: 8,
  },
  photoContainer: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 9,
    color: '#AEAEB2',
    fontWeight: '700',
  },
  foodPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  floatingFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  footerSummary: {
    flexDirection: 'column',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  footerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  checkoutBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutBtnGrad: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 0.8,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unavailableBadgeText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unavailablePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unavailablePlaceholderText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
  },
});
