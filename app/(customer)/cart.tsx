import React, { useState, useEffect, useRef } from 'react';
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
import { ChevronLeft, Home, ShoppingBag, User, Star, CheckCircle, AlertCircle, ShieldCheck, Briefcase, MapPin, X, Gift, Info, Tag, Wallet, Check, Sparkles } from 'lucide-react-native';
import { validateAndApplyPromoCode, markPromoCodeAsUsed } from '../../src/config/promoCodes';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCart } from '../../src/context/CartContext';
import { supabase } from '../../src/services/supabase';
import { calculateHaversineDistance } from '../../src/utils/distance';
import Loader from '../../components/Loader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import LocationPickerModal, { AddressDetails } from '../../src/components/LocationPickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { useSession } from '@descope/react-native-sdk';

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
  const { session } = useSession();
  const { cart, menuItems, addToCart, removeFromCart, clearCart, cartTotalItems, cartTotalPrice, getCartItemsList, loading: cartLoading } = useCart();

  // Checkout Form States
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showPlatformFeeInfo, setShowPlatformFeeInfo] = useState(false);
  const [showDeliveryFeeInfo, setShowDeliveryFeeInfo] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [branchCoords, setBranchCoords] = useState<{ lat: number; lng: number }>({ lat: 18.4575, lng: 73.8088 });

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);

  // Wallet Pay States
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [useWallet, setUseWallet] = useState(false);

  // Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; address: string; latitude?: number; longitude?: number }[]>([]);
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
  const mainScrollRef = useRef<ScrollView>(null);

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
      const descopeUid = session?.user?.userId || 'guest';
      const storageKey = `hotelbet_saved_addresses_${descopeUid}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedAddresses(parsed);
        
        // Auto-populate first address if input is currently empty
        if (parsed.length > 0 && !address) {
          setAddress(parsed[0].address);
          setSelectedAddressId(parsed[0].id);
          setSelectedLatitude(parsed[0].latitude || null);
          setSelectedLongitude(parsed[0].longitude || null);
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
      const loadWalletBalanceInCart = async () => {
        try {
          const balStr = await AsyncStorage.getItem('hotelbet_wallet_balance');
          if (balStr) {
            setWalletBalance(parseFloat(balStr));
          } else {
            setWalletBalance(0.00);
          }
        } catch (e) {
          console.error('Failed to load wallet balance in cart:', e);
        }
      };
      loadWalletBalanceInCart();
      const fetchBranchCoords = async () => {
        try {
          const activeBranchId = await AsyncStorage.getItem('selected_branch_id') || 'f6e5d4c3-b2a1-8f7e-6d5c-4b3a2f1e0d9c';
          const { data } = await supabase
            .from('branches')
            .select('latitude, longitude')
            .eq('id', activeBranchId)
            .single();
          if (data && data.latitude && data.longitude) {
            setBranchCoords({ lat: data.latitude, lng: data.longitude });
          }
        } catch (e) {
          console.warn('Failed to fetch branch coords in cart:', e);
        }
      };
      fetchBranchCoords();
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
  const [selectedGift, setSelectedGift] = useState<string | null>(null);

  const subtotal = cartTotalPrice;

  // All items from unlocked tiers are selectable (only 1 choice total)
  useEffect(() => {
    if (subtotal < 500) {
      setSelectedGift(null);
    } else {
      const allowed: string[] = [];
      if (subtotal >= 500)  allowed.push('1L Water Bottle', 'Sweet', 'Cold Drink', 'Scratch Card (Min ₹25 - Up to ₹500)');
      if (subtotal >= 1000) allowed.push('Gobi Manchurian', 'Dry Lollipop', 'Scratch Card (Min ₹50 - Up to ₹1000)');
      if (subtotal >= 2000) allowed.push('Veg Biryani', 'Non-Veg Biryani', 'Scratch Card (Min ₹80 - Up to ₹2000)');
      if (selectedGift && !allowed.includes(selectedGift)) {
        setSelectedGift(null);
      }
    }
  }, [subtotal, selectedGift]);

  // Remove promo code if subtotal drops below ₹500
  useEffect(() => {
    if (subtotal < 500 && appliedPromoCode) {
      setAppliedPromoCode(null);
      setPromoDiscount(0);
      showToast('Promo Code Removed', 'Promo codes are valid only on orders above ₹500.', 'info');
    }
  }, [subtotal, appliedPromoCode]);

  // Dynamically determine selected tab (default to history if cart is empty)
  const selectedTab = cartTotalItems === 0 ? 'history' : activeSegment;
  // Calculate distance from active branch & delivery fee logic
  const latToUse = selectedLatitude || 18.4575;
  const lngToUse = selectedLongitude || 73.8088;
  const hasSelectedCoords = selectedLatitude !== null && selectedLongitude !== null;
  const deliveryDistance = calculateHaversineDistance(
    latToUse,
    lngToUse,
    branchCoords.lat,
    branchCoords.lng
  );

  const isNotDeliverable = hasSelectedCoords && deliveryDistance > 5.0;
  const isSmallOrder = subtotal < 200;
  const isFarDistance = deliveryDistance > 3.0;

  const deliveryFee = (subtotal > 0 && !isNotDeliverable) 
    ? ((isSmallOrder || isFarDistance) ? 40 : 0) 
    : 0;

  const platformFee = subtotal > 0 ? 15 : 0;
  const totalBeforePromo = subtotal + platformFee + deliveryFee;
  const totalBeforeWallet = Math.max(0, totalBeforePromo - promoDiscount);

  // Max 50% of the bill can be paid using wallet
  const maxWalletAllowed = Math.floor(totalBeforeWallet * 0.5);
  const walletDeduction = (useWallet && walletBalance > 0) 
    ? Math.min(walletBalance, maxWalletAllowed) 
    : 0;

  const total = Math.max(0, totalBeforeWallet - walletDeduction);

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

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedTab]);

  const fetchOrdersAndReviews = async () => {
    try {
      setLoadingOrders(true);
      let userId = session?.user?.userId;
      
      if (!userId) {
        const { data: sbSessionData } = await supabase.auth.getSession();
        userId = sbSessionData?.session?.user?.id;
      }
      
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

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      showToast('Error', 'Please enter a promo code', 'error');
      return;
    }
    if (appliedPromoCode) {
      showToast('Limit Reached', 'Only 1 promo code can be applied per order.', 'error');
      return;
    }
    setApplyingPromo(true);
    try {
      const res = await validateAndApplyPromoCode(promoCodeInput, subtotal);
      if (res.success) {
        setAppliedPromoCode(promoCodeInput.trim().toUpperCase());
        setPromoDiscount(res.discountAmount);
        showToast('Success', res.message, 'success');
        setPromoCodeInput('');
      } else {
        showToast('Invalid Promo Code', res.message, 'error');
      }
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to apply promo code', 'error');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoDiscount(0);
    showToast('Removed', 'Promo code removed from your order.', 'info');
  };

  const handlePlaceOrder = async () => {
    if (!address) {
      showToast('Error', 'Please enter a room number or suite name', 'error');
      return;
    }

    setPlacingOrder(true);

    try {
      // Get selected branch ID from AsyncStorage
      const activeBranchId = await AsyncStorage.getItem('selected_branch_id') || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

      // Calculate distance from active branch
      let branchLat = 18.4575;
      let branchLng = 73.8088;
      
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('latitude, longitude')
          .eq('id', activeBranchId)
          .single();
          
        if (branchData) {
          branchLat = branchData.latitude || 18.4575;
          branchLng = branchData.longitude || 73.8088;
        }
      } catch (e) {
        console.warn("Failed to fetch branch coordinates, using default fallbacks:", e);
      }

      const latToUse = selectedLatitude || 18.4575;
      const lngToUse = selectedLongitude || 73.8088;
      
      if (isNotDeliverable || deliveryDistance > 5.0) {
        showToast(
          'Delivery Not Available', 
          `We don't deliver to locations beyond 5 km radius (Selected address is ${deliveryDistance.toFixed(1)} km away).`, 
          'error'
        );
        setPlacingOrder(false);
        return;
      }
      let userId = session?.user?.userId;
      
      if (!userId) {
        const { data: sbSessionData } = await supabase.auth.getSession();
        userId = sbSessionData?.session?.user?.id;
      }
      
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



      if (subtotal >= 500 && !selectedGift) {
        showToast('Selection Required', 'Please choose your free gift or cashback reward.', 'error');
        setPlacingOrder(false);
        return;
      }

      let finalNotes = notes;
      let cashbackAmount = 0;

      if (selectedGift) {
        if (selectedGift.includes('Scratch Card') || selectedGift.includes('Cashback')) {
          const match = selectedGift.match(/Min ₹(\d+)/i) || selectedGift.match(/(\d+)/);
          cashbackAmount = match ? parseInt(match[1], 10) : 25;
          finalNotes = `[REWARD: ${selectedGift}] ${notes}`;
        } else {
          finalNotes = `[FREE Complementary Gift: ${selectedGift}] ${notes}`;
        }
      }

      if (appliedPromoCode) {
        finalNotes = `[PROMO CODE: ${appliedPromoCode} (-₹${promoDiscount})] ${finalNotes}`;
      }

      // Write order directly into public.orders table
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: userId,
          branch_id: activeBranchId,
          status: 'pending',
          total_amount: total,
          delivery_address: address,
          delivery_latitude: selectedLatitude || 18.4575,
          delivery_longitude: selectedLongitude || 73.8088,
          delivery_phone: '+15550192834',
          notes: finalNotes,
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
        notes: finalNotes,
        status: 'pending'
      });

      // Save Scratch Card if reward was selected
      if (selectedGift && (selectedGift.includes('Scratch Card') || selectedGift.includes('Cashback'))) {
        try {
          let minPrize = 25;
          let maxPrize = 35;
          let tierName = 'Order ₹500+ Tier';

          if (subtotal >= 2000) {
            minPrize = 80;
            maxPrize = 100;
            tierName = 'Order ₹2000+ Tier';
          } else if (subtotal >= 1000) {
            minPrize = 50;
            maxPrize = 65;
            tierName = 'Order ₹1000+ Tier';
          }

          const wonAmount = Math.floor(Math.random() * (maxPrize - minPrize + 1)) + minPrize;

          const cardObj = {
            id: `card_${Date.now()}`,
            orderId: newOrder.id,
            tierName,
            minPrize,
            maxPrize,
            wonAmount,
            isScratched: false,
            createdAt: new Date().toISOString()
          };

          const cardsKey = 'hotelbet_scratch_cards';
          const existingCardsStr = await AsyncStorage.getItem(cardsKey);
          const cardsList = existingCardsStr ? JSON.parse(existingCardsStr) : [];
          cardsList.push(cardObj);
          await AsyncStorage.setItem(cardsKey, JSON.stringify(cardsList));

          console.log(`Saved Scratch Card (${tierName}, prize ₹${wonAmount}) for order ${newOrder.id}`);
        } catch (walletErr) {
          console.warn('Failed to save scratch card:', walletErr);
        }
      }

      // Deduct used wallet credit if applied
      if (walletDeduction > 0) {
        try {
          const newBal = Math.max(0, walletBalance - walletDeduction);
          await AsyncStorage.setItem('hotelbet_wallet_balance', String(newBal));
          setWalletBalance(newBal);

          const txnKey = 'hotelbet_wallet_transactions';
          const existingTxnsStr = await AsyncStorage.getItem(txnKey);
          const txns = existingTxnsStr ? JSON.parse(existingTxnsStr) : [];
          txns.push({
            id: `txn_${Date.now()}`,
            orderId: newOrder.id,
            amount: walletDeduction,
            status: 'debited',
            description: `Used ₹${walletDeduction} credit on Order #${newOrder.id.substring(0, 8)}`,
            createdAt: new Date().toISOString()
          });
          await AsyncStorage.setItem(txnKey, JSON.stringify(txns));
        } catch (wErr) {
          console.warn('Failed to update wallet balance on checkout:', wErr);
        }
      }

      // Mark promo code as used globally
      if (appliedPromoCode) {
        await markPromoCodeAsUsed(appliedPromoCode, userId);
        setAppliedPromoCode(null);
        setPromoDiscount(0);
      }

      setSelectedGift(null);
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
                <View style={[styles.successDetailsRow, { flexDirection: 'column', alignItems: 'flex-start', marginTop: 4 }]}>
                  <Text style={[styles.successDetailsLabel, { color: colors.textSub, marginBottom: 2 }]}>Address:</Text>
                  <Text style={[styles.successDetailsVal, { color: colors.textMain, fontSize: 11, lineHeight: 16 }]} numberOfLines={2}>
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

      <ScrollView ref={mainScrollRef} contentContainerStyle={styles.contentContainer}>
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
                <View style={[styles.itemRow, { justifyContent: 'space-between' }]} key={idx}>
                  {/* Left Column: Item Name */}
                  <Text style={[styles.itemNameText, { color: colors.textMain, flex: 1.4, marginRight: 8 }]} numberOfLines={1}>
                    {entry.item.name}
                  </Text>
                  
                  {/* Center Column: Add & Remove quantity selectors (aligned vertically) */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: colors.inputBg, 
                    borderRadius: 14, 
                    borderWidth: 1, 
                    borderColor: colors.cardBorder, 
                    width: 76,
                    height: 28,
                    justifyContent: 'space-between',
                    paddingHorizontal: 2,
                    marginRight: 16
                  }}>
                    <TouchableOpacity 
                      onPress={() => removeFromCart(entry.item.id)}
                      style={{ width: 24, height: '100%', justifyContent: 'center', alignItems: 'center' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.accentGold, fontSize: 15, fontWeight: '900' }}>-</Text>
                    </TouchableOpacity>
                    
                    <Text style={{ color: colors.textMain, fontSize: 11, fontWeight: '900' }}>
                      {entry.qty}
                    </Text>
                    
                    <TouchableOpacity 
                      onPress={() => addToCart(entry.item.id)}
                      style={{ width: 24, height: '100%', justifyContent: 'center', alignItems: 'center' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.accentGold, fontSize: 15, fontWeight: '900' }}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Right Column: Price */}
                  <Text style={[styles.itemPriceText, { color: colors.accentGold, width: 70, textAlign: 'right' }]}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Platform Fee</Text>
                  <TouchableOpacity
                    onPress={() => setShowPlatformFeeInfo(!showPlatformFeeInfo)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Info size={13} color={colors.textSub} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.receiptVal, { color: colors.textMain }]}>₹{platformFee}</Text>
              </View>
              {showPlatformFeeInfo && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                  marginBottom: 4,
                }}>
                  <Text style={{ color: colors.textSub, fontSize: 10, lineHeight: 15, fontWeight: '600' }}>
                    A nominal ₹15 platform fee helps us maintain app infrastructure, secure payments, and 24/7 customer support. No delivery or hidden charges.
                  </Text>
                </View>
              )}

              {promoDiscount > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: '#10B981', fontWeight: '700' }]}>
                    Promo Discount ({appliedPromoCode})
                  </Text>
                  <Text style={[styles.receiptVal, { color: '#10B981', fontWeight: '900' }]}>
                    -₹{promoDiscount}
                  </Text>
                </View>
              )}

              {walletDeduction > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.accentGold, fontWeight: '700' }]}>
                    Wallet Credit Used
                  </Text>
                  <Text style={[styles.receiptVal, { color: colors.accentGold, fontWeight: '900' }]}>
                    -₹{walletDeduction}
                  </Text>
                </View>
              )}

              <View style={styles.receiptRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Delivery Fee</Text>
                  <TouchableOpacity
                    onPress={() => setShowDeliveryFeeInfo(!showDeliveryFeeInfo)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Info size={13} color={colors.textSub} />
                  </TouchableOpacity>
                </View>
                {isNotDeliverable ? (
                  <Text style={[styles.receiptVal, { color: '#EF4444', fontWeight: '900', fontSize: 11 }]}>
                    Not Deliverable
                  </Text>
                ) : deliveryFee === 0 ? (
                  <Text style={[styles.receiptVal, { color: '#10B981', fontWeight: '900' }]}>
                    FREE
                  </Text>
                ) : (
                  <Text style={[styles.receiptVal, { color: colors.accentGold, fontWeight: '900' }]}>
                    ₹40
                  </Text>
                )}
              </View>

              {!isNotDeliverable && deliveryDistance <= 3.0 && isSmallOrder && subtotal > 0 && (
                <View style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 0.5,
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                  marginTop: 2,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Sparkles size={13} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>
                    Add items worth ₹{200 - subtotal} more for FREE delivery!
                  </Text>
                </View>
              )}

              {!isNotDeliverable && deliveryDistance > 3.0 && subtotal > 0 && (
                <View style={{
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 0.5,
                  borderColor: 'rgba(212, 175, 55, 0.25)',
                  marginTop: 2,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <MapPin size={13} color={colors.accentGold} />
                  <Text style={{ color: colors.accentGold, fontSize: 10, fontWeight: '800' }}>
                    ₹40 delivery fee applied (distance {deliveryDistance.toFixed(1)} km)
                  </Text>
                </View>
              )}
              {showDeliveryFeeInfo && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                  marginBottom: 4,
                  gap: 4,
                }}>
                  <Text style={{ color: colors.textMain, fontSize: 10, fontWeight: '800', marginBottom: 2 }}>
                    Delivery Policy:
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 10, lineHeight: 15, fontWeight: '600' }}>
                    • FREE delivery on orders ₹200 & above within 3 km.{'\n'}
                    • ₹40 delivery fee for orders under ₹200 or between 3 km – 5 km.{'\n'}
                    • Delivery unavailable beyond 5 km radius.
                  </Text>
                </View>
              )}

              {isNotDeliverable && (
                <View style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', flex: 1 }}>
                    Location beyond 5 km ({deliveryDistance.toFixed(1)} km away). Delivery is not available.
                  </Text>
                </View>
              )}

              <View style={[styles.receiptRow, { marginTop: 12, marginBottom: 0 }]}>
                <Text style={[styles.totalLabel, { color: colors.textMain }]}>Total</Text>
                <Text style={[styles.totalVal, { color: colors.accentGold }]}>₹{total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Promo Code Input & Display Card */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>PROMO CODE</Text>
              <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 14, marginTop: 8, gap: 10 }]}>
                {/* Offline Dine-In Hint Banner */}
                <View style={{
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                  marginBottom: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Gift size={16} color={colors.accentGold} />
                  <Text style={{ color: colors.textMain, fontSize: 10, lineHeight: 15, fontWeight: '700', flex: 1 }}>
                    <Text style={{ color: colors.accentGold, fontWeight: '900' }}>Dine-In Offer:</Text> Visit Hotel Bet offline, dine in, and receive a scratch card at the billing counter to claim your ₹50 promo code from the owner!
                  </Text>
                </View>

                {!appliedPromoCode ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.inputBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      paddingHorizontal: 12,
                      height: 44,
                    }}>
                      <Tag size={15} color={colors.accentGold} style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, color: colors.textMain, fontSize: 12, fontWeight: '700' }}
                        value={promoCodeInput}
                        onChangeText={(txt) => setPromoCodeInput(txt.toUpperCase())}
                        placeholder="Enter Promo Code (e.g. 1IBZEWSI)"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="characters"
                        maxLength={10}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleApplyPromoCode}
                      disabled={applyingPromo}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: colors.accentGold,
                        paddingHorizontal: 16,
                        height: 44,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {applyingPromo ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12 }}>APPLY</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900' }}>
                        {appliedPromoCode} APPLIED (-₹{promoDiscount})
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleRemovePromoCode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Wallet Pay Option */}
            {walletBalance > 0 && subtotal > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>HOTEL BET WALLET</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setUseWallet(!useWallet)}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: useWallet ? 'rgba(212, 175, 55, 0.12)' : colors.cardBg,
                      borderColor: useWallet ? colors.accentGold : colors.cardBorder,
                      padding: 14,
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: useWallet ? colors.accentGold : 'rgba(212, 175, 55, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Wallet size={16} color={useWallet ? '#000000' : colors.accentGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '800' }}>
                        Pay with Wallet Balance (Available: ₹{walletBalance.toFixed(2)})
                      </Text>
                      <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                        Max 50% of bill (₹{maxWalletAllowed}) can be paid using wallet
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: useWallet ? colors.accentGold : colors.textSub,
                    backgroundColor: useWallet ? colors.accentGold : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {useWallet && <Check size={12} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Complementary Rewards Section — always visible */}
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>COMPLEMENTARY REWARDS</Text>
              <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 16, marginTop: 8, gap: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Gift size={18} color={colors.accentGold} />
                  <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800', flex: 1 }}>
                    {subtotal >= 500 ? 'You qualify for a Complementary Gift!' : 'Unlock rewards by ordering more!'}
                  </Text>
                </View>

                {/* ——— Tier 1: ₹500+ ——— */}
                {(() => {
                  const unlocked = subtotal >= 500;
                  const remaining = Math.max(0, 500 - subtotal);
                  const items = ['1L Water Bottle', 'Sweet', 'Cold Drink', 'Scratch Card (Min ₹25 - Up to ₹500)'];
                  const isCurrent = subtotal >= 500;
                  return (
                    <View style={{ opacity: unlocked ? 1 : 0.55, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: unlocked ? colors.accentGold : colors.textSub, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                          🎁  ORDER ₹500+
                        </Text>
                        {!unlocked && (
                          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>
                            Add ₹{remaining} more
                          </Text>
                        )}
                        {unlocked && <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>UNLOCKED ✓</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {items.map((gift) => {
                          const isSelected = selectedGift === gift;
                          return (
                            <TouchableOpacity
                              key={gift}
                              activeOpacity={isCurrent ? 0.8 : 1}
                              onPress={() => isCurrent && setSelectedGift(gift)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.accentGold : colors.cardBorder,
                                backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              }}
                            >
                              <Text style={{ color: isSelected ? colors.accentGold : (unlocked ? colors.textMain : colors.textSub), fontSize: 11, fontWeight: '700' }}>
                                {gift} {isSelected ? '✓' : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

                {/* ——— Tier 2: ₹1000+ ——— */}
                {(() => {
                  const unlocked = subtotal >= 1000;
                  const remaining = Math.max(0, 1000 - subtotal);
                  const items = ['Gobi Manchurian', 'Dry Lollipop', 'Scratch Card (Min ₹50 - Up to ₹1000)'];
                  const isCurrent = subtotal >= 1000;
                  return (
                    <View style={{ opacity: unlocked ? 1 : 0.55, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: unlocked ? colors.accentGold : colors.textSub, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                          🍽️  ORDER ₹1000+
                        </Text>
                        {!unlocked && (
                          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>
                            Add ₹{remaining} more
                          </Text>
                        )}
                        {unlocked && <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>UNLOCKED ✓</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {items.map((gift) => {
                          const isSelected = selectedGift === gift;
                          return (
                            <TouchableOpacity
                              key={gift}
                              activeOpacity={isCurrent ? 0.8 : 1}
                              onPress={() => isCurrent && setSelectedGift(gift)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.accentGold : colors.cardBorder,
                                backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              }}
                            >
                              <Text style={{ color: isSelected ? colors.accentGold : (unlocked ? colors.textMain : colors.textSub), fontSize: 11, fontWeight: '700' }}>
                                {gift} {isSelected ? '✓' : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

                {/* ——— Tier 3: ₹2000+ ——— */}
                {(() => {
                  const unlocked = subtotal >= 2000;
                  const remaining = Math.max(0, 2000 - subtotal);
                  const items = ['Veg Biryani', 'Non-Veg Biryani', 'Scratch Card (Min ₹80 - Up to ₹2000)'];
                  const isCurrent = subtotal >= 2000;
                  return (
                    <View style={{ opacity: unlocked ? 1 : 0.55, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: unlocked ? colors.accentGold : colors.textSub, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                          👑  ORDER ₹2000+
                        </Text>
                        {!unlocked && (
                          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>
                            Add ₹{remaining} more
                          </Text>
                        )}
                        {unlocked && <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>UNLOCKED ✓</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {items.map((gift) => {
                          const isSelected = selectedGift === gift;
                          return (
                            <TouchableOpacity
                              key={gift}
                              activeOpacity={isCurrent ? 0.8 : 1}
                              onPress={() => isCurrent && setSelectedGift(gift)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.accentGold : colors.cardBorder,
                                backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              }}
                            >
                              <Text style={{ color: isSelected ? colors.accentGold : (unlocked ? colors.textMain : colors.textSub), fontSize: 11, fontWeight: '700' }}>
                                {gift} {isSelected ? '✓' : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {selectedGift && (selectedGift.includes('Scratch Card') || selectedGift.includes('Cashback')) && (
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', marginTop: 4 }}>
                    🎟️ {selectedGift} will be credited to your account after order delivery.
                  </Text>
                )}
              </View>
            </View>

            {/* Address Form Box */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DELIVERY ADDRESS</Text>

            {/* Saved Address Pills Selector */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {/* Locate on Map Option */}
                <TouchableOpacity
                  style={[
                    styles.addressSelectPill,
                    { 
                      backgroundColor: colors.inputBg,
                      borderColor: colors.accentGold,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: 'dashed'
                    }
                  ]}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.8}
                >
                  <MapPin size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                  <Text 
                    style={{ 
                      color: colors.accentGold, 
                      fontWeight: '800', 
                      fontSize: 11 
                    }}
                  >
                    + Add New (Map)
                  </Text>
                </TouchableOpacity>

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
                        setSelectedLatitude(item.latitude || null);
                        setSelectedLongitude(item.longitude || null);
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

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setSelectedAddressId(null); // Clear selection when user edits manually
              }}
              placeholder="Delivery address..."
              placeholderTextColor="#8E8E93"
            />

            {/* Pick from Map helper link */}
            <TouchableOpacity 
              onPress={() => setShowPicker(true)} 
              style={{ alignSelf: 'flex-start', marginTop: -8, marginBottom: 16, paddingLeft: 4, flexDirection: 'row', alignItems: 'center' }}
            >
              <MapPin size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentGold }}>
                Locate or select address on map
              </Text>
            </TouchableOpacity>

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
                {orders.map((order, index) => {
                  const review = reviews[order.id];
                  const isEditing = activeFormOrderId === order.id;

                  return (
                    <AnimatedEntrance
                      key={order.id}
                      delay={index * 80}
                    >
                      <View
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
                    </AnimatedEntrance>
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

      <LocationPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onAddressSaved={(addressDetails: AddressDetails) => {
          loadSavedAddressesInCart();
          const cleanAddr = `${addressDetails.flatNo}, ${addressDetails.address}${addressDetails.landmark ? ` (Landmark: ${addressDetails.landmark})` : ''}`;
          setAddress(cleanAddr);
          setSelectedAddressId(addressDetails.id);
          setSelectedLatitude(addressDetails.latitude || null);
          setSelectedLongitude(addressDetails.longitude || null);
          setShowPicker(false);
        }}
      />
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
