import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Home, ShoppingBag, User, Star, CheckCircle, AlertCircle, ShieldCheck, Briefcase, MapPin, X } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCart } from '../../src/context/CartContext';
import { supabase } from '../../src/services/supabase';
import Loader from '../../components/Loader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_order: number;
  menu_items?: {
    name: string;
  };
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  delivery_address: string;
  notes?: string;
  status: string;
  order_items?: OrderItem[];
  delivery_otp?: string;
}

interface Review {
  orderRating: number;
  orderText: string;
  deliveryRating: number;
  deliveryText: string;
  customerName: string;
  timestamp: string;
}

export default function CartScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { cart, menuItems, addToCart, removeFromCart, clearCart, cartTotalItems, cartTotalPrice, getCartItemsList, loading: cartLoading } = useCart();

  // Checkout Form States
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; address: string }[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Success Lottie Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Custom Toast/Alert State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = React.useRef<any>(null);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastTitle(title);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  // Segment Selector
  const [activeSegment, setActiveSegment] = useState<'checkout' | 'history'>('checkout');

  const loadSavedAddressesInCart = async () => {
    try {
      const saved = await AsyncStorage.getItem('hotelbet_saved_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedAddresses(parsed);
        
        // Auto-populate first address if input is currently empty
        if (parsed.length > 0 && !address) {
          setAddress(parsed[0].address);
          setSelectedAddressId(parsed[0].id);
        }
      } else {
        setSavedAddresses([]);
      }
    } catch (e) {
      console.error('Failed to load saved addresses in cart:', e);
    }
  };

  useEffect(() => {
    if (activeSegment === 'checkout') {
      loadSavedAddressesInCart();
    }
  }, [activeSegment]);

  // History & Reviews States
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<{ [orderId: string]: Review }>({});
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Valued Guest');

  // Review Form States per Order
  const [activeFormOrderId, setActiveFormOrderId] = useState<string | null>(null);
  const [orderRating, setOrderRating] = useState(5);
  const [orderText, setOrderText] = useState('');
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [deliveryText, setDeliveryText] = useState('');

  // Dynamically determine selected tab (default to history if cart is empty)
  const selectedTab = cartTotalItems === 0 ? 'history' : activeSegment;

  const subtotal = cartTotalPrice;
  const gst = Math.round(subtotal * 0.05); // 5% GST
  const delivery = subtotal > 0 ? 150 : 0;
  const total = subtotal + gst + delivery;

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    inputBg: isDark ? 'rgba(60, 60, 56, 0.3)' : 'rgba(15, 23, 42, 0.04)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37', // Gold highlight
    statusRed: '#EF4444',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
    goldGlow: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.15)',
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  // Fetch orders and reviews when user toggles to the History tab
  useEffect(() => {
    if (selectedTab === 'history') {
      fetchOrdersAndReviews();

      // Realtime subscription for customer order updates
      const channel = supabase
        .channel(`customer_orders_stream_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrdersAndReviews();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'deliveries' },
          () => {
            fetchOrdersAndReviews();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTab]);

  const fetchOrdersAndReviews = async () => {
    try {
      setLoadingOrders(true);
      const { data: { session } } = await supabase.auth.getSession();

      let userId = session?.user?.id;
      if (!userId) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          userId = data?.user?.id;
        } catch (e) {
          console.warn('Anonymous auth failed/disabled in cart fetch', e);
        }
        if (!userId) {
          userId = 'mock-customer-uid-999';
        }
      }

      if (userId) {
        // Fetch user profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        if (profile?.full_name) {
          setCustomerName(profile.full_name);
        }

        // Fetch customer orders with relations
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            created_at,
            delivery_address,
            notes,
            status,
            delivery_otp,
            order_items (
              id,
              quantity,
              price_at_order,
              menu_items (
                name
              )
            )
          `)
          .eq('customer_id', userId)
          .order('created_at', { ascending: false });

        if (orderErr) throw orderErr;
        const formattedOrders = (orderData || []).map((order: any) => ({
          ...order,
          order_items: (order.order_items || []).map((item: any) => ({
            ...item,
            menu_items: Array.isArray(item.menu_items)
              ? item.menu_items[0]
              : item.menu_items
          }))
        }));
        setOrders(formattedOrders);
      }

      // Load Reviews from AsyncStorage
      const savedReviews = await AsyncStorage.getItem('hotelbet_reviews');
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      }
    } catch (err) {
      console.error('Error fetching orders and reviews:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const [cancelConfirmationOrderId, setCancelConfirmationOrderId] = useState<string | null>(null);

  const handleCancelOrder = (orderId: string) => {
    setCancelConfirmationOrderId(orderId);
  };

  const executeCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled', delivery_otp: undefined } 
            : order
        )
      );
      showToast("Success", "Your order has been cancelled successfully.", "success");
      setCancelConfirmationOrderId(null);
    } catch (e: any) {
      console.error('Error cancelling order:', e.message);
      showToast('Error', 'Failed to cancel order: ' + e.message, 'error');
      setCancelConfirmationOrderId(null);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const ensureUserProfileExists = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Insert profile to satisfy FK REFERENCES check
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            phone_number: '+15550192834',
            full_name: 'Guest Customer',
            role: 'customer'
          });
      }
    } catch (e) {
      console.warn('Error checking/creating user profile in DB:', e);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address) {
      showToast('Error', 'Please enter a room number or suite name', 'error');
      return;
    }

    setPlacingOrder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;

      if (!userId) {
        try {
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) throw anonError;
          userId = anonData.session?.user?.id;
        } catch (e) {
          console.warn('Anonymous auth failed/disabled in cart place', e);
        }
        if (!userId) {
          userId = 'mock-customer-uid-999';
        }
      }

      if (!userId) throw new Error('Could not establish user session');

      // Ensure profile check passes
      await ensureUserProfileExists(userId);

      const cartList = getCartItemsList();
      if (cartList.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Generate an 8-digit random delivery verification OTP
      const otpCode = Math.floor(10000000 + Math.random() * 90000000).toString();

      // Get selected branch ID from AsyncStorage
      const activeBranchId = await AsyncStorage.getItem('selected_branch_id') || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

      // Write order directly into public.orders table
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: userId,
          branch_id: activeBranchId,
          status: 'pending',
          total_amount: total,
          delivery_address: address,
          delivery_latitude: 12.9715987,
          delivery_longitude: 77.5945627,
          delivery_phone: '+15550192834',
          notes: notes,
          delivery_otp: otpCode
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert all order items
      const orderItemsData = cartList.map(entry => ({
        order_id: newOrder.id,
        menu_item_id: entry.item.id,
        quantity: entry.qty,
        price_at_order: entry.item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      console.log('Successfully placed order and items in database:', newOrder.id);

      // Clear local cart
      clearCart();
      setAddress('');
      setNotes('');

      // Set placed order details for the Lottie animation success screen
      setPlacedOrder({
        id: newOrder.id,
        total_amount: total,
        created_at: newOrder.created_at || new Date().toISOString(),
        delivery_address: newOrder.delivery_address || address,
        notes: notes,
        status: 'pending'
      });
      setShowSuccessModal(true);

      showToast('Success', 'Your order has been placed on the live database!', 'success');
    } catch (e: any) {
      console.error('Supabase order insert failed:', e.message);
      showToast('Error', 'Failed to place order: ' + e.message, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSubmitReview = async (orderId: string) => {
    try {
      const newReview: Review = {
        orderRating,
        orderText,
        deliveryRating,
        deliveryText,
        customerName: customerName || 'Valued Guest',
        timestamp: new Date().toLocaleDateString()
      };

      const updatedReviews = {
        ...reviews,
        [orderId]: newReview
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem('hotelbet_reviews', JSON.stringify(updatedReviews));
      setReviews(updatedReviews);

      // Reset form states
      setActiveFormOrderId(null);
      setOrderRating(5);
      setOrderText('');
      setDeliveryRating(5);
      setDeliveryText('');

      showToast('Review Submitted', 'Thank you for sharing your feedback.', 'success');
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const renderStars = (rating: number, onRatingChange?: (r: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={!onRatingChange}
          onPress={() => onRatingChange && onRatingChange(i)}
          style={{ paddingHorizontal: 2 }}
        >
          <Star
            size={18}
            color={i <= rating ? colors.accentGold : 'rgba(255, 255, 255, 0.15)'}
            fill={i <= rating ? colors.accentGold : 'transparent'}
          />
        </TouchableOpacity>
      );
    }
    return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {showSuccessModal && (
        <View style={styles.successOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.successGlassCard,
              {
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.9)' : 'rgba(255, 255, 255, 0.9)'
              }
            ]}
          >
            {/* Top Right Close button */}
            <TouchableOpacity 
              style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
              onPress={() => {
                setShowSuccessModal(false);
                setActiveSegment('history');
              }}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSub} />
            </TouchableOpacity>

            <View style={styles.lottieContainer}>
              <LottieView
                source={require('../../assets/images/delivery_guy.lottie')}
                autoPlay
                loop
                style={styles.lottieAnimation}
              />
            </View>

            <Text style={[styles.successTitle, { color: colors.accentGold }]}>
              Order Placed!
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textMain }]}>
              Your delivery is on its way.
            </Text>

            {placedOrder && (
              <View style={[styles.successDetailsCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                <Text style={[styles.successDetailsTitle, { color: colors.accentGold }]}>
                  Order Details
                </Text>
                <View style={styles.successDetailsRow}>
                  <Text style={[styles.successDetailsLabel, { color: colors.textSub }]}>Order ID:</Text>
                  <Text style={[styles.successDetailsVal, { color: colors.textMain }]}>
                    #{placedOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.successDetailsRow}>
                  <Text style={[styles.successDetailsLabel, { color: colors.textSub }]}>Total Amount:</Text>
                  <Text style={[styles.successDetailsVal, { color: colors.accentGold }]}>
                    ₹{placedOrder.total_amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.successDetailsRow}>
                  <Text style={[styles.successDetailsLabel, { color: colors.textSub }]}>Address:</Text>
                  <Text style={[styles.successDetailsVal, { color: colors.textMain, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                    {placedOrder.delivery_address}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                if (placedOrder) {
                  router.push({ pathname: '/(customer)/order/[id]', params: { id: placedOrder.id } });
                } else {
                  setActiveSegment('history');
                }
              }}
              activeOpacity={0.85}
              style={styles.trackBtnWrapper}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trackBtn}
              >
                <Text style={styles.trackBtnText}>Track Order</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom Close Option */}
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                setActiveSegment('history');
              }}
              activeOpacity={0.8}
              style={{ marginTop: 12, paddingVertical: 10, width: '100%', alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSub, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Close
              </Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}
      {toastVisible && (
        <View style={styles.alertOverlay}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.alertGlassCard, { borderColor: 'rgba(212, 175, 55, 0.25)', backgroundColor: isDark ? 'rgba(15, 15, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]}>
            <View style={styles.alertContent}>
              {toastType === 'success' && <CheckCircle size={18} color="#10B981" />}
              {toastType === 'error' && <AlertCircle size={18} color="#EF4444" />}
              {toastType === 'info' && <ShieldCheck size={18} color="#D4AF37" />}
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitleText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{toastTitle}</Text>
                <Text style={[styles.alertMsgText, { color: isDark ? '#AEAEB2' : '#48484A' }]}>{toastMessage}</Text>
              </View>
            </View>
          </BlurView>
        </View>
      )}
      <FloatingHeader
        title={selectedTab === 'checkout' ? "Your Order" : "Orders & Feedback"}
        titleAlign="center"
        showBackButton={true}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              selectedTab === 'checkout' && { backgroundColor: colors.accentGold }
            ]}
            onPress={() => cartTotalItems > 0 && setActiveSegment('checkout')}
            disabled={cartTotalItems === 0}
          >
            <Text style={[
              styles.segmentText,
              { color: selectedTab === 'checkout' ? '#000000' : colors.textSub }
            ]}>
              Checkout ({cartTotalItems})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              selectedTab === 'history' && { backgroundColor: colors.accentGold }
            ]}
            onPress={() => setActiveSegment('history')}
          >
            <Text style={[
              styles.segmentText,
              { color: selectedTab === 'history' ? '#000000' : colors.textSub }
            ]}>
              Order History
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'checkout' ? (
          // ================= CHECKOUT VIEW =================
          <View>
            {/* Main Order Card */}
            <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardLabel, { color: colors.accentGold }]}>ORDER ITEMS</Text>

              {getCartItemsList().map((entry, idx) => (
                <View style={styles.itemRow} key={idx}>
                  <View style={styles.itemNameWrapper}>
                    <Text style={[styles.itemNameText, { color: colors.textMain }]}>{entry.item.name}</Text>
                    <View style={styles.qtyBadge}>
                      <Text style={[styles.qtyBadgeText, { color: colors.accentGold }]}>{entry.qty}</Text>
                    </View>
                  </View>
                  <Text style={[styles.itemPriceText, { color: colors.accentGold }]}>
                    ₹{(entry.item.price * entry.qty).toLocaleString()}
                  </Text>
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Subtotal</Text>
                <Text style={[styles.receiptVal, { color: colors.textMain }]}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textSub }]}>GST (5%)</Text>
                <Text style={[styles.receiptVal, { color: colors.textMain }]}>₹{gst.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Delivery Fee</Text>
                <Text style={[styles.receiptVal, { color: colors.textMain }]}>₹{delivery.toLocaleString()}</Text>
              </View>

              <View style={[styles.receiptRow, { marginTop: 12, marginBottom: 0 }]}>
                <Text style={[styles.totalLabel, { color: colors.textMain }]}>Total</Text>
                <Text style={[styles.totalVal, { color: colors.accentGold }]}>₹{total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Address Form Box */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DELIVERY ADDRESS</Text>

            {/* Saved Address Pills Selector */}
            {savedAddresses.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                >
                  {savedAddresses.map((item) => {
                    const isSelected = selectedAddressId === item.id || address === item.address;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.addressSelectPill,
                          { 
                            backgroundColor: isSelected ? colors.accentGold : colors.cardBg,
                            borderColor: isSelected ? colors.accentGold : colors.cardBorder,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                          }
                        ]}
                        onPress={() => {
                          setAddress(item.address);
                          setSelectedAddressId(item.id);
                        }}
                        activeOpacity={0.8}
                      >
                        {item.label === 'Home' ? (
                          <Home size={12} color={isSelected ? '#000000' : colors.accentGold} style={{ marginRight: 4 }} />
                        ) : item.label === 'Work' ? (
                          <Briefcase size={12} color={isSelected ? '#000000' : colors.accentGold} style={{ marginRight: 4 }} />
                        ) : (
                          <MapPin size={12} color={isSelected ? '#000000' : colors.accentGold} style={{ marginRight: 4 }} />
                        )}
                        <Text 
                          style={{ 
                            color: isSelected ? '#000000' : colors.textMain, 
                            fontWeight: '800', 
                            fontSize: 11 
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setSelectedAddressId(null); // Clear selection when user edits manually
              }}
              placeholder="Room number or suite name..."
              placeholderTextColor="#8E8E93"
            />

            {/* Instructions Form Box */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>SPECIAL INSTRUCTIONS</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top', backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special requests?"
              placeholderTextColor="#8E8E93"
              multiline={true}
            />

            {/* Place Order CTA Button */}
            <TouchableOpacity
              onPress={handlePlaceOrder}
              disabled={placingOrder}
              activeOpacity={0.85}
              style={styles.placeBtnWrapper}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.placeBtn, { shadowColor: colors.accentGold }]}
              >
                {placingOrder ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.placeBtnText}>Place Order</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // ================= ORDER HISTORY VIEW =================
          <View>
            {loadingOrders ? (
              <View style={{ height: 120, position: 'relative' }}>
                <Loader />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ShoppingBag size={48} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={[styles.emptyText, { color: colors.textMain }]}>No Orders Placed Yet</Text>
                <Text style={[styles.emptySub, { color: colors.textSub }]}>
                  Place an order from the menu to leave reviews.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {orders.map((order) => {
                  const review = reviews[order.id];
                  const isEditing = activeFormOrderId === order.id;

                  return (
                    <View
                      key={order.id}
                      style={[
                        styles.orderHistoryCard,
                        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }
                      ]}
                    >
                      {/* Touchable Info block */}
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: order.id } })}
                        activeOpacity={0.7}
                      >
                        {/* Card Header Info */}
                        <View style={styles.cardHeader}>
                          <View>
                            <Text style={[styles.orderIdText, { color: colors.accentGold }]}>
                              #{order.id.slice(0, 8).toUpperCase()}
                            </Text>
                            <Text style={[styles.orderDate, { color: colors.textSub }]}>
                              {new Date(order.created_at).toLocaleString()}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.orderAmount, { color: colors.textMain }]}>
                              ₹ {parseFloat(order.total_amount as any).toLocaleString()}
                            </Text>
                            <View style={[styles.statusTag, { backgroundColor: order.status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(212, 175, 55, 0.1)' }]}>
                              <Text style={[styles.statusTagText, { color: order.status === 'delivered' ? '#10B981' : colors.accentGold }]}>
                                {order.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Display items list inside history card */}
                        {order.order_items && order.order_items.length > 0 && (
                          <View style={styles.historyItemsList}>
                            {order.order_items.map((entry, entryIdx) => (
                              <Text key={entry.id || entryIdx} style={[styles.historyItemRowText, { color: colors.textSub }]}>
                                • {entry.menu_items?.name || 'Menu Item'} <Text style={{ color: colors.accentGold }}>x{entry.quantity}</Text>
                              </Text>
                            ))}
                          </View>
                        )}

                        {order.delivery_address ? (
                          <Text style={[styles.addressText, { color: colors.textSub }]} numberOfLines={1}>
                            Deliver to: {order.delivery_address}
                          </Text>
                        ) : null}

                        {order.status !== 'pending' && order.status !== 'delivered' && order.status !== 'cancelled' && order.delivery_otp ? (
                          <View style={[styles.otpDisplayContainer, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.05)' : 'rgba(212, 175, 55, 0.08)', borderColor: colors.cardBorder }]}>
                            <Text style={[styles.otpDisplayText, { color: colors.textSub }]}>
                              Share this 8-digit OTP with the rider on delivery:
                            </Text>
                            <Text style={[styles.otpDisplayCode, { color: colors.accentGold }]}>
                              {order.delivery_otp}
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>

                      {order.status !== 'cancelled' && (
                        <>
                          <View style={[styles.divider, { backgroundColor: colors.cardBorder, marginVertical: 10 }]} />

                          {/* Review Detail (Submitted vs Form View) */}
                          {review ? (
                            <View style={styles.reviewSummaryBlock}>
                              <View style={styles.badgeRow}>
                                <CheckCircle size={14} color="#10B981" />
                                <Text style={styles.completedReviewText}>Review Submitted</Text>
                              </View>

                              {/* Order Feedback */}
                              <View style={styles.feedbackRow}>
                                <Text style={[styles.feedbackLabel, { color: colors.textSub }]}>Order Review:</Text>
                                {renderStars(review.orderRating)}
                              </View>
                              {review.orderText ? (
                                <Text style={[styles.feedbackComment, { color: colors.textMain }]}>
                                  "{review.orderText}"
                                </Text>
                              ) : null}

                              {/* Delivery Feedback */}
                              <View style={[styles.feedbackRow, { marginTop: 10 }]}>
                                <Text style={[styles.feedbackLabel, { color: colors.textSub }]}>Delivery Review:</Text>
                                {renderStars(review.deliveryRating)}
                              </View>
                              {review.deliveryText ? (
                                <Text style={[styles.feedbackComment, { color: colors.textMain }]}>
                                  "{review.deliveryText}"
                                </Text>
                              ) : null}
                            </View>
                          ) : isEditing ? (
                            <View style={styles.formBlock}>
                              <Text style={[styles.formSectionTitle, { color: colors.accentGold }]}>1. RATE YOUR ORDER / FOOD</Text>
                              <View style={styles.ratingStarsRow}>
                                {renderStars(orderRating, setOrderRating)}
                                <Text style={[styles.ratingValText, { color: colors.textMain }]}>{orderRating} / 5</Text>
                              </View>
                              <TextInput
                                style={[
                                  styles.formInput,
                                  { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }
                                ]}
                                value={orderText}
                                onChangeText={setOrderText}
                                placeholder="How was the food quality and preparation?"
                                placeholderTextColor="#8E8E93"
                              />

                              <Text style={[styles.formSectionTitle, { color: colors.accentGold, marginTop: 12 }]}>2. RATE YOUR DELIVERY RIDER</Text>
                              <View style={styles.ratingStarsRow}>
                                {renderStars(deliveryRating, setDeliveryRating)}
                                <Text style={[styles.ratingValText, { color: colors.textMain }]}>{deliveryRating} / 5</Text>
                              </View>
                              <TextInput
                                style={[
                                  styles.formInput,
                                  { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }
                                ]}
                                value={deliveryText}
                                onChangeText={setDeliveryText}
                                placeholder="Was the delivery quick and rider polite?"
                                placeholderTextColor="#8E8E93"
                              />

                              {/* Buttons */}
                              <View style={styles.buttonRow}>
                                <TouchableOpacity
                                  style={styles.cancelBtn}
                                  onPress={() => setActiveFormOrderId(null)}
                                >
                                  <Text style={[styles.cancelBtnText, { color: colors.textSub }]}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.submitBtnWrapper}
                                  onPress={() => handleSubmitReview(order.id)}
                                >
                                  <LinearGradient
                                    colors={colors.goldGrad}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitBtn}
                                  >
                                    <Text style={styles.submitBtnText}>Submit Review</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : order.status === 'pending' ? (
                            <TouchableOpacity
                              style={[styles.writeReviewBtn, { borderColor: '#EF4444' }]}
                              onPress={() => handleCancelOrder(order.id)}
                              disabled={cancellingOrderId === order.id}
                              activeOpacity={0.8}
                            >
                              {cancellingOrderId === order.id ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Text style={[styles.writeReviewBtnText, { color: '#EF4444' }]}>
                                  Cancel Order
                                </Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.writeReviewBtn, { borderColor: colors.accentGold }]}
                              onPress={() => setActiveFormOrderId(order.id)}
                            >
                              <Text style={[styles.writeReviewBtnText, { color: colors.accentGold }]}>
                                Leave Feedback
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation Bar */}
      {Platform.OS === 'ios' || Platform.OS === 'web' ? (
        <BlurView
          intensity={70}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.bottomTabContainer,
            {
              borderColor: colors.cardBorder,
              backgroundColor: isDark ? 'rgba(10, 10, 8, 0.5)' : 'rgba(255, 255, 255, 0.5)'
            }
          ]}
        >
          <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/branches')}>
            <Home size={18} color={colors.textSub} />
            <Text style={[styles.tabText, { color: colors.textSub }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={getTabStyle(true)} onPress={() => router.replace('/(customer)/cart')}>
            <ShoppingBag size={18} color={colors.accentGold} />
            <Text style={[styles.tabText, { color: colors.accentGold }]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/account')}>
            <User size={18} color={colors.textSub} />
            <Text style={[styles.tabText, { color: colors.textSub }]}>Profile</Text>
          </TouchableOpacity>
        </BlurView>
      ) : (
        <View
          style={[
            styles.bottomTabContainer,
            {
              backgroundColor: isDark ? 'rgba(10, 10, 8, 0.92)' : 'rgba(245, 245, 247, 0.95)',
              borderColor: colors.cardBorder
            }
          ]}
        >
          <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/branches')}>
            <Home size={18} color={colors.textSub} />
            <Text style={[styles.tabText, { color: colors.textSub }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={getTabStyle(true)} onPress={() => router.replace('/(customer)/cart')}>
            <ShoppingBag size={18} color={colors.accentGold} />
            <Text style={[styles.tabText, { color: colors.accentGold }]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/account')}>
            <User size={18} color={colors.textSub} />
            <Text style={[styles.tabText, { color: colors.textSub }]}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelConfirmationOrderId !== null}
        onRequestClose={() => setCancelConfirmationOrderId(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(15, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <LottieView
              source={require('../../assets/images/wrong.lottie')}
              autoPlay
              loop
              style={{ width: 100, height: 100, marginBottom: 12 }}
            />
            <Text style={[styles.modalTitle, { color: colors.statusRed }]}>CANCEL ORDER?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>
            
            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderColor: colors.cardBorder }]} 
                onPress={() => setCancelConfirmationOrderId(null)}
              >
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.statusRed, borderColor: colors.statusRed }]} 
                onPress={() => {
                  if (cancelConfirmationOrderId) {
                    executeCancelOrder(cancelConfirmationOrderId);
                  }
                }}
                disabled={cancellingOrderId === cancelConfirmationOrderId}
              >
                {cancellingOrderId === cancelConfirmationOrderId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 110,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 32,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  orderHistoryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  itemNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  qtyBadge: {
    marginLeft: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 0.8,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemPriceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 0.8,
    marginVertical: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  receiptLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  receiptVal: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 24,
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 0.8,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  placeBtnWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 4,
  },
  placeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusTag: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  historyItemsList: {
    marginTop: 10,
    paddingLeft: 4,
    gap: 4,
  },
  historyItemRowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  otpDisplayContainer: {
    borderRadius: 14,
    borderWidth: 0.8,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  otpDisplayText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpDisplayCode: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  writeReviewBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.03)',
  },
  writeReviewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reviewSummaryBlock: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  completedReviewText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackComment: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 2,
    paddingLeft: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: '#D4AF37',
    marginBottom: 6,
  },
  formBlock: {
    gap: 8,
  },
  formSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  ratingValText: {
    fontSize: 12,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  submitBtnWrapper: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    height: 44,
  },
  submitBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomTabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  alertOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  alertGlassCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitleText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertMsgText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  successGlassCard: {
    width: '95%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  lottieContainer: {
    width: 260,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  successDetailsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginVertical: 16,
  },
  successDetailsTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  successDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  successDetailsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  successDetailsVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackBtnWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    height: 52,
    marginTop: 12,
  },
  trackBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  addressSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
