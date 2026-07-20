import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MapPin, Phone, Clock, DollarSign, CheckCircle2, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, User, Info, Gift, Wallet, Sparkles, Lock, CreditCard, RotateCcw } from 'lucide-react-native';
import { useAppTheme } from '../../../src/context/ThemeContext';
import { useCart } from '../../../src/context/CartContext';
import { supabase } from '../../../src/services/supabase';
import Loader from '../../../components/Loader';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingHeader from '../../../components/FloatingHeader';
import { getRazorpayKeys } from '../../../src/config/razorpayConfig';

interface DBOrderItem {
  id: string;
  menu_item_id?: string;
  quantity: number;
  price_at_order: number;
  menu_items?: {
    id?: string;
    name: string;
  };
}

interface DBOrder {
  id: string;
  total_amount: number;
  tip_amount?: number;
  created_at: string;
  delivery_address: string;
  notes?: string;
  status: string;
  delivery_phone: string;
  delivery_otp?: string;
  branches?: {
    name: string;
    address: string;
  };
  order_items?: DBOrderItem[];
  deliveries?: {
    id: string;
    status: string;
    rider_id?: string;
    delivered_at?: string;
    profiles?: {
      full_name: string;
    };
  } | null;
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const { addToCart } = useCart();
  const [order, setOrder] = useState<DBOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReorderThisMeal = () => {
    if (!order?.order_items || order.order_items.length === 0) {
      Alert.alert('Re-Order', 'No items found in this order.');
      return;
    }

    let addedCount = 0;
    order.order_items.forEach(itemObj => {
      const dishId = itemObj.menu_item_id || itemObj.menu_items?.id;
      if (dishId) {
        const qty = itemObj.quantity || 1;
        for (let i = 0; i < qty; i++) {
          addToCart(dishId);
          addedCount++;
        }
      }
    });

    if (addedCount === 0) {
      Alert.alert('Re-Order', 'Could not find dish details for re-ordering.');
      return;
    }

    Alert.alert(
      'Re-Order Added! 🛒',
      `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your cart.`,
      [
        { text: 'View Cart & Checkout', onPress: () => router.push('/(customer)/cart') },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  // Tipping states
  const [customTip, setCustomTip] = useState('');
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [tipSuccessModal, setTipSuccessModal] = useState<{ visible: boolean; amount: number } | null>(null);

  // Cancellation states
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [refundPreference, setRefundPreference] = useState<'wallet' | 'bank'>('bank');

  // Toast notifications state
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

  const getRefundInfo = (status: string, totalAmount: number) => {
    if (status === 'pending') {
      return {
        percent: 100,
        amount: totalAmount,
        stageLabel: 'Order Placed (Not Accepted Yet)',
        note: 'Restaurant has not accepted your order yet. You get a 100% INSTANT FULL CASHBACK REFUND to your Wallet!'
      };
    }
    if (status === 'accepted' || status === 'preparing' || status === 'cooking') {
      return {
        percent: 70,
        amount: Math.round(totalAmount * 0.70),
        stageLabel: 'Kitchen Cooking / Preparing',
        note: 'Kitchen is currently preparing your food. A 70% refund is applicable (30% retained for kitchen prep costs).'
      };
    }
    if (status === 'ready_for_pickup' || status === 'out_for_delivery' || status === 'dispatched') {
      return {
        percent: 50,
        amount: Math.round(totalAmount * 0.50),
        stageLabel: 'Out for Delivery / Dispatched',
        note: 'Order is out for delivery. A 50% refund is applicable (50% retained for rider dispatch & food costs).'
      };
    }
    return {
      percent: 0,
      amount: 0,
      stageLabel: 'Completed / Delivered',
      note: 'This order cannot be cancelled once delivered.'
    };
  };

  const handleCancelOrder = async () => {
    // Load user's refund preference before showing modal
    const pref = await AsyncStorage.getItem('hotelbet_refund_preference');
    setRefundPreference(pref === 'wallet' ? 'wallet' : 'bank');
    setShowCancelConfirmation(true);
  };

  const executeCancelOrder = async () => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') return;

    const refund = getRefundInfo(order.status, order.total_amount);

    try {
      setCancelling(true);

      // Check user's refund preference
      const prefKey = 'hotelbet_refund_preference';
      const refundPref = await AsyncStorage.getItem(prefKey) || 'bank';

      if (refundPref === 'wallet') {
        // ── INSTANT WALLET REFUND ──
        const walletTag = `[WALLET_REFUND: status=CREDITED | percent=${refund.percent}% | amount=₹${refund.amount} | method=INSTANT_WALLET]`;
        const updatedNotes = order.notes ? `${walletTag} ${order.notes}` : walletTag;

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            notes: updatedNotes
          })
          .eq('id', order.id);

        if (error) throw error;

        // Credit wallet balance instantly
        const balStr = await AsyncStorage.getItem('hotelbet_wallet_balance') || '0';
        const currentBal = parseFloat(balStr);
        const newBal = currentBal + refund.amount;
        await AsyncStorage.setItem('hotelbet_wallet_balance', String(newBal));
        await AsyncStorage.setItem('hotelbet_wallet_balance_backup', String(newBal));

        // Add wallet transaction record
        const txnStr = await AsyncStorage.getItem('hotelbet_wallet_transactions');
        const txns = txnStr ? JSON.parse(txnStr) : [];
        txns.unshift({
          id: `refund_wallet_${order.id.slice(0, 8)}_${Date.now()}`,
          orderId: order.id,
          amount: refund.amount,
          status: 'credited',
          description: `Instant Refund (${refund.percent}% — Order Cancelled)`,
          createdAt: new Date().toISOString()
        });
        await AsyncStorage.setItem('hotelbet_wallet_transactions', JSON.stringify(txns));
        await AsyncStorage.setItem('hotelbet_wallet_transactions_backup', JSON.stringify(txns));

        setOrder(prev => prev ? { ...prev, status: 'cancelled', notes: updatedNotes, delivery_otp: undefined } : null);
        setShowCancelConfirmation(false);
        showToast('Instant Wallet Refund ⚡', `₹${refund.amount} (${refund.percent}%) instantly credited to your Hotel Bet Money wallet!`, 'success');
      } else {
        // ── BANK REFUND (UTR PAYOUT) ──
        const cancelNotesTag = `[BANK_REFUND: status=INITIATED | percent=${refund.percent}% | amount=₹${refund.amount} | txn_id=PENDING_OWNER_REF]`;
        const updatedNotes = order.notes ? `${cancelNotesTag} ${order.notes}` : cancelNotesTag;

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            notes: updatedNotes
          })
          .eq('id', order.id);

        if (error) throw error;

        setOrder(prev => prev ? { ...prev, status: 'cancelled', notes: updatedNotes, delivery_otp: undefined } : null);
        setShowCancelConfirmation(false);
        showToast('Bank Refund Initiated', `₹${refund.amount} (${refund.percent}%) Bank Payout initiated. Track in Bank Refund Tracker (2-5 days).`, 'success');
      }
    } catch (e: any) {
      console.error('Error cancelling order:', e.message);
      showToast('Error', 'Failed to cancel order: ' + e.message, 'error');
      setShowCancelConfirmation(false);
    } finally {
      setCancelling(false);
    }
  };

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    statusGreen: '#10B981',
    statusRed: '#EF4444',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
  };

  const fetchOrderDetails = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          tip_amount,
          created_at,
          delivery_address,
          notes,
          status,
          delivery_phone,
          delivery_otp,
          branches (
            name,
            address
          ),
          order_items (
            id,
            menu_item_id,
            quantity,
            price_at_order,
            menu_items (
              id,
              name
            )
          ),
          deliveries (
            id,
            status,
            rider_id,
            delivered_at,
            profiles (
              full_name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Order not found');

      // Safe formatting for nested properties (joined table objects/arrays)
      const rawDeliveries = data.deliveries as any;
      const formatted: DBOrder = {
        ...data,
        branches: Array.isArray(data.branches) ? data.branches[0] : data.branches,
        order_items: (data.order_items || []).map((item: any) => {
          const menuItemObj = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
          return {
            ...item,
            menu_item_id: item.menu_item_id || menuItemObj?.id,
            menu_items: menuItemObj
          };
        }),
        deliveries: Array.isArray(rawDeliveries) 
          ? (rawDeliveries[0] ? {
              ...rawDeliveries[0],
              profiles: Array.isArray(rawDeliveries[0].profiles) ? rawDeliveries[0].profiles[0] : rawDeliveries[0].profiles
            } : null)
          : (rawDeliveries ? {
              ...rawDeliveries,
              profiles: Array.isArray(rawDeliveries.profiles) ? rawDeliveries.profiles[0] : rawDeliveries.profiles
            } : null)
      };

      setOrder(formatted);
    } catch (e: any) {
      console.error('Failed to load order details:', e.message);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTipRider = async (amount: number) => {
    if (amount <= 0 || !order) return;
    try {
      setTipping(true);
      const customerPhone = order.delivery_phone || '';
      const razorpayKeys = getRazorpayKeys(customerPhone);

      const processTipSuccess = async (paymentId: string) => {
        try {
          const newNotes = order.notes 
            ? `${order.notes} [TIP_PAYMENT: ₹${amount} via Razorpay ID: ${paymentId}]` 
            : `[TIP_PAYMENT: ₹${amount} via Razorpay ID: ${paymentId}]`;

          const { error } = await supabase
            .from('orders')
            .update({ 
              tip_amount: amount,
              notes: newNotes
            })
            .eq('id', order.id);

          if (error) throw error;
          setOrder(prev => prev ? { ...prev, tip_amount: amount, notes: newNotes } : null);

          // Trigger Liquid Glass Modal
          setTipSuccessModal({ visible: true, amount });
        } catch (err: any) {
          console.error('Error saving tip after payment:', err);
          showToast('Tip Saved', `Your tip payment of ₹${amount} was processed successfully!`, 'success');
        } finally {
          setTipping(false);
          setShowCustomTipInput(false);
        }
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const rzpOptions = {
          key: razorpayKeys.key_id,
          amount: Math.round(amount * 100), // in paise
          currency: 'INR',
          name: 'Hotel Bet',
          description: `Delivery Partner Tip ₹${amount} (${razorpayKeys.isTestMode ? 'TEST' : 'LIVE'})`,
          prefill: {
            contact: customerPhone,
            name: 'Valued Customer'
          },
          theme: { color: '#D4AF37' },
          handler: async function (response: any) {
            const paymentId = response?.razorpay_payment_id || `pay_rzp_tip_${Date.now()}`;
            await processTipSuccess(paymentId);
          },
          modal: {
            ondismiss: function () {
              setTipping(false);
              Alert.alert('Tip Cancelled', 'Payment was cancelled. Tip was not processed.');
            }
          }
        };

        const openRzpModal = () => {
          try {
            const rzp = new (window as any).Razorpay(rzpOptions);
            rzp.open();
          } catch (e: any) {
            console.error('Failed to open Razorpay modal:', e);
            if (razorpayKeys.isTestMode) {
              processTipSuccess(`pay_test_tip_fallback_${Date.now()}`);
            } else {
              setTipping(false);
              Alert.alert('Payment Error', 'Failed to open Razorpay payment gateway.');
            }
          }
        };

        if ((window as any).Razorpay) {
          openRzpModal();
        } else {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => openRzpModal();
          script.onerror = () => {
            if (razorpayKeys.isTestMode) {
              processTipSuccess(`pay_test_tip_script_fail_${Date.now()}`);
            } else {
              setTipping(false);
              Alert.alert('Payment Error', 'Failed to load Razorpay payment gateway.');
            }
          };
          document.body.appendChild(script);
        }
      } else {
        if (razorpayKeys.isTestMode) {
          Alert.alert(
            'Razorpay Payment Gateway (Test Mode)',
            `Processing ₹${amount} tip payment for Delivery Partner via Razorpay Sandbox...`,
            [
              {
                text: 'Simulate Payment Success',
                onPress: () => processTipSuccess(`pay_native_tip_${Date.now()}`)
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setTipping(false)
              }
            ]
          );
        } else {
          await processTipSuccess(`pay_native_tip_${Date.now()}`);
        }
      }
    } catch (e: any) {
      console.error('Error starting tip payment:', e);
      setTipping(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();

    // Subscribe to realtime order & delivery updates for this specific order
    const orderChannel = supabase
      .channel(`order_tracking_${id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => {
          fetchOrderDetails();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        () => {
          fetchOrderDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [id]);

  const getLottieSource = (status: string) => {
    switch (status) {
      case 'pending':
        return require('../../../assets/images/food_beverage.lottie');
      case 'accepted':
      case 'preparing':
        return require('../../../assets/images/cooking.lottie');
      case 'ready_for_pickup':
        return require('../../../assets/images/food.lottie');
      case 'dispatched':
      case 'out_for_delivery':
        return require('../../../assets/images/receive_order.lottie');
      case 'delivered':
        return require('../../../assets/images/a2z_delivered.lottie');
      case 'cancelled':
        return require('../../../assets/images/wrong.lottie');
      default:
        return require('../../../assets/images/food_beverage.lottie');
    }
  };

  const getStatusLevel = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'accepted': return 2;
      case 'preparing': return 2;
      case 'ready_for_pickup': return 3;
      case 'out_for_delivery': return 4;
      case 'delivered': return 5;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Order Placed';
      case 'accepted': return 'Order Accepted';
      case 'preparing': return 'Preparing Food';
      case 'ready_for_pickup': return 'Ready for Pickup';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Processing';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <Loader />
      </View>
    );
  }

  if (errorMsg || !order) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.bg }]}>
        <AlertCircle size={40} color={colors.statusRed} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorText, { color: colors.textMain }]}>
          {errorMsg || 'Failed to load order details'}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.cardBorder }]} onPress={() => router.back()}>
          <Text style={{ color: colors.accentGold, fontWeight: '700', fontSize: 13 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentLevel = getStatusLevel(order.status);
  const isCancelled = order.status === 'cancelled';
  const steps = [
    { level: 1, label: 'Placed' },
    { level: 2, label: 'Cooking' },
    { level: 3, label: 'Ready' },
    { level: 4, label: 'Dispatched' },
    { level: 5, label: 'Arrived' }
  ];

  const subtotal = order.total_amount > 40 ? Math.round((order.total_amount - 40) / 1.05) : 0;
  const gst = order.total_amount > 40 ? Math.round(subtotal * 0.05) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Floating Header */}
      <FloatingHeader
        title="Track Order"
        titleAlign="center"
        showBackButton={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={[styles.orderIdLabel, { color: colors.accentGold }]}>ORDER ID</Text>
              <Text style={[styles.orderIdText, { color: colors.textMain }]}>
                #{order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: isCancelled ? colors.statusRed : colors.accentGold }]}>
              <Text style={[styles.statusBadgeText, { color: isCancelled ? colors.statusRed : colors.accentGold }]}>
                {getStatusText(order.status).toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.createdAtText, { color: colors.textSub }]}>
            Placed on: {new Date(order.created_at).toLocaleString()}
          </Text>
          {order.status === 'delivered' && order.deliveries?.delivered_at && (
            <Text style={[styles.createdAtText, { color: colors.statusGreen, marginTop: 4, fontWeight: '700' }]}>
              Delivered on: {new Date(order.deliveries.delivered_at).toLocaleString()}
            </Text>
          )}
          {/* Cancellation section with 30-min window check */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            (() => {
              const minutesElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60));
              const canCancel = minutesElapsed <= 30;

              if (canCancel) {
                return (
                  <TouchableOpacity
                    style={{ borderColor: colors.statusRed, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}
                    onPress={handleCancelOrder}
                    disabled={cancelling}
                    activeOpacity={0.8}
                  >
                    {cancelling ? (
                      <ActivityIndicator size="small" color={colors.statusRed} />
                    ) : (
                      <Text style={{ color: colors.statusRed, fontWeight: '800', fontSize: 12 }}>
                        Cancel Order ({getRefundInfo(order.status, order.total_amount).percent}% Bank Refund) · {30 - minutesElapsed}m left
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              } else {
                return (
                  <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 12, padding: 10, borderWidth: 0.8, borderColor: 'rgba(239, 68, 68, 0.2)', marginTop: 14, alignItems: 'center' }}>
                    <Text style={{ color: colors.statusRed, fontSize: 11, fontWeight: '800' }}>
                      ⏱️ Cancellation Window Closed (30 min limit expired)
                    </Text>
                    <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                      Orders can only be cancelled within 30 minutes of placement. Need help? Open Support.
                    </Text>
                  </View>
                );
              }
            })()
          )}

          {/* Refund Tracker Link Button if Cancelled */}
          {order.status === 'cancelled' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(customer)/refunds')}
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14, flexDirection: 'row', gap: 6 }}
            >
              <CreditCard size={14} color="#3B82F6" />
              <Text style={{ color: '#3B82F6', fontWeight: '900', fontSize: 12 }}>TRACK BANK REFUND STATUS ➔</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Lottie Status Illustration */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
          <LottieView
            source={getLottieSource(order.status)}
            autoPlay
            loop
            style={{ width: 180, height: 180 }}
          />
        </View>

        {/* Stepper Progress Section */}
        {!isCancelled && (
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionHeader, { color: colors.accentGold }]}>DELIVERY TIMELINE</Text>
            
            <View style={styles.stepperContainer}>
              {steps.map((step, idx) => {
                const isCompleted = currentLevel > step.level || (step.level === 5 && order.status === 'delivered');
                const isCurrent = (currentLevel === step.level && order.status !== 'delivered') || (step.level === 2 && (order.status === 'accepted' || order.status === 'preparing'));
                
                return (
                  <React.Fragment key={step.level}>
                    <View style={styles.stepWrapper}>
                      <View 
                        style={[
                          styles.stepDot,
                          {
                            borderColor: isCompleted ? colors.accentGold : colors.cardBorder,
                            backgroundColor: isCompleted ? colors.accentGold : 'transparent',
                          },
                          isCurrent && {
                            borderWidth: 2,
                            borderColor: colors.accentGold,
                            backgroundColor: 'transparent'
                          }
                        ]}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 size={12} color="#000000" />
                        ) : isCurrent ? (
                          <View style={[styles.currentStepInner, { backgroundColor: colors.accentGold }]} />
                        ) : null}
                      </View>
                      <Text 
                        style={[
                          styles.stepLabel, 
                          { 
                            color: isCompleted ? colors.textMain : colors.textSub,
                            fontWeight: isCurrent ? '800' : '600'
                          }
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                    
                    {idx < steps.length - 1 && (
                      <View 
                        style={[
                          styles.stepLine,
                          { backgroundColor: currentLevel > step.level ? colors.accentGold : colors.cardBorder }
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* OTP Code Display Box */}
        {order.status !== 'pending' && order.status !== 'delivered' && !isCancelled && order.delivery_otp && (
          <View style={[styles.card, styles.otpCard, { borderColor: 'rgba(212, 175, 55, 0.25)' }]}>
            <ShieldCheck size={20} color={colors.accentGold} style={{ marginBottom: 6 }} />
            <Text style={[styles.otpCardTitle, { color: colors.textMain }]}>Delivery Verification Code</Text>
            <Text style={[styles.otpCardSubtitle, { color: colors.textSub }]}>
              Provide this 8-digit OTP to the rider upon doorstep delivery to verify receipt:
            </Text>
            <Text style={[styles.otpCodeText, { color: colors.accentGold }]}>
              {order.delivery_otp}
            </Text>
          </View>
        )}

        {/* Scratch Card Reward Shortcut Banner */}
        {order.notes && (order.notes.toLowerCase().includes('scratch card') || order.notes.toLowerCase().includes('cashback')) && (
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.08)',
              borderColor: colors.accentGold,
              borderWidth: 1.2,
              gap: 12,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.accentGold,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Gift size={20} color="#000000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
                  Complementary Scratch Card Reward
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  {order.status === 'delivered' ? (
                    <>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>
                        Delivered · Ready to Scratch in Wallet
                      </Text>
                    </>
                  ) : (
                    <> 
                      <Lock size={13} color={colors.accentGold} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentGold }}>
                        Locked · Unlocks upon doorstep delivery
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(customer)/wallet')}
              style={{
                backgroundColor: colors.accentGold,
                borderRadius: 12,
                paddingVertical: 11,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Wallet size={16} color="#000000" />
              <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>
                {order.status === 'delivered' ? 'OPEN WALLET & CLAIM CASHBACK' : 'VIEW IN MY WALLET'}
              </Text>
              <ArrowRight size={14} color="#000000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Rider Details Card */}
        {order.deliveries && order.deliveries.rider_id && (
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionHeader, { color: colors.accentGold }]}>YOUR RIDER</Text>
            <View style={styles.riderRow}>
              <View style={[styles.riderAvatar, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                <User size={18} color={colors.accentGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>
                  {order.deliveries.profiles?.full_name || 'Elite Rider'}
                </Text>
                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                  Assigned courier dispatcher
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* Tip your Delivery Partner Card */}
        {order.deliveries && order.deliveries.rider_id && !isCancelled && (
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>Tip your Delivery Partner</Text>
              <Info size={14} color={colors.textSub} />
            </View>

            {order.tip_amount && order.tip_amount > 0 ? (
              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <Text style={{ color: colors.statusGreen, fontWeight: '700', fontSize: 12 }}>
                  Thank you! You tipped ₹{order.tip_amount} to your delivery partner. 100% of this tip goes to them.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, lineHeight: 16, marginBottom: 14 }}>
                  Thank your delivery partner by leaving them a tip. 100% of the tip will go to your delivery partner.
                </Text>

                {showCustomTipInput ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                      placeholder="Enter amount (₹)"
                      placeholderTextColor={colors.textSub}
                      keyboardType="numeric"
                      value={customTip}
                      onChangeText={setCustomTip}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: colors.accentGold, paddingHorizontal: 16, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => {
                        const amt = parseInt(customTip);
                        if (amt > 0) {
                          handleTipRider(amt);
                        }
                      }}
                      disabled={tipping}
                    >
                      {tipping ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12 }}>Submit</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => setShowCustomTipInput(false)}
                    >
                      <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[20, 30, 50].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={{ flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => handleTipRider(amt)}
                        disabled={tipping}
                      >
                        <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 12 }}>₹ {amt}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{ flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => setShowCustomTipInput(true)}
                    >
                      <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 12 }}>Other</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600', marginTop: 10, textAlign: 'center' }}>
                  Secured by <Text style={{ color: colors.accentGold, fontWeight: '800' }}>Razorpay</Text> • 100% of your tip goes directly to your rider.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Invoice details */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeader, { color: colors.accentGold }]}>ITEMS INVOICE</Text>
          
          <View style={{ gap: 12, marginBottom: 16 }}>
            {order.order_items?.map((item) => (
              <View key={item.id} style={styles.invoiceItemRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }}>
                    {item.menu_items?.name || 'Gourmet Dish'}
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                    Qty: {item.quantity} · ₹{parseFloat(item.price_at_order as any).toLocaleString()} / unit
                  </Text>
                </View>
                <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '800' }}>
                  ₹{(item.quantity * item.price_at_order).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {(() => {
            const notesStr = order.notes || '';
            const breakdownMatch = notesStr.match(/\[BILL_BREAKDOWN:\s*subtotal=(\d+)\s*\|\s*platformFee=(\d+)\s*\|\s*deliveryFee=(\d+)\s*\|\s*codFee=(\d+)\s*\|\s*promoDiscount=(\d+)\s*\|\s*walletDiscount=(\d+)\s*\|\s*total=(\d+)\]/i);

            let sub = 0;
            let plat = 15;
            let del = 40;
            let cod = (!notesStr.includes('ONLINE') && !notesStr.includes('Razorpay')) ? 12 : 0;
            let promo = 0;
            let wallet = 0;
            let grandTot = parseFloat(order.total_amount as any) || 0;

            if (breakdownMatch) {
              sub = parseInt(breakdownMatch[1]);
              plat = parseInt(breakdownMatch[2]);
              del = parseInt(breakdownMatch[3]);
              cod = parseInt(breakdownMatch[4]);
              promo = parseInt(breakdownMatch[5]);
              wallet = parseInt(breakdownMatch[6]);
              grandTot = parseInt(breakdownMatch[7]);
            } else {
              sub = order.order_items?.reduce((sum: number, i: any) => sum + (i.quantity * i.price_at_order), 0) || grandTot;
              const promoM = notesStr.match(/\[PROMO CODE:\s*[^\s\]]+\s*\(-₹(\d+)\)\]/i) || notesStr.match(/\[PROMO_CODE:\s*[^\s\]]+\s*\(-₹(\d+)\)\]/i);
              if (promoM) promo = parseInt(promoM[1]);
              
              const gross = sub + plat + del + cod - promo;
              if (gross > grandTot) {
                wallet = gross - grandTot;
              }
            }

            return (
              <>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Subtotal</Text>
                  <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹{sub.toLocaleString()}</Text>
                </View>

                {plat > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Platform Fee</Text>
                    <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹{plat}</Text>
                  </View>
                )}

                {cod > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.accentGold }]}>COD Handling Fee</Text>
                    <Text style={[styles.receiptValue, { color: colors.accentGold, fontWeight: '800' }]}>+₹{cod}</Text>
                  </View>
                )}

                {del > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Delivery Fee</Text>
                    <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹{del}</Text>
                  </View>
                )}

                {promo > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.statusGreen }]}>Promo Discount</Text>
                    <Text style={[styles.receiptValue, { color: colors.statusGreen, fontWeight: '800' }]}>-₹{promo}</Text>
                  </View>
                )}

                {wallet > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.accentGold }]}>Wallet Balance Applied</Text>
                    <Text style={[styles.receiptValue, { color: colors.accentGold, fontWeight: '800' }]}>-₹{wallet}</Text>
                  </View>
                )}

                {order.tip_amount && order.tip_amount > 0 ? (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Doorstep Tip</Text>
                    <Text style={[styles.receiptValue, { color: colors.statusGreen }]}>+₹{order.tip_amount}</Text>
                  </View>
                ) : null}

                <View style={[styles.receiptRow, { marginTop: 10 }]}>
                  <Text style={[styles.invoiceTotalLabel, { color: colors.textMain }]}>Total Invoice</Text>
                  <Text style={[styles.invoiceTotalVal, { color: colors.accentGold }]}>
                    ₹{(grandTot + (order.tip_amount || 0)).toLocaleString()}
                  </Text>
                </View>
              </>
            );
          })()}

          {/* 1-Tap Re-Order Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleReorderThisMeal}
            style={{
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              borderColor: colors.accentGold,
              borderWidth: 1.2,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 12,
            }}
          >
            <RotateCcw size={16} color={colors.accentGold} />
            <Text style={{ color: colors.accentGold, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>
              1-TAP RE-ORDER THIS MEAL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment & Refund Details Card */}
        {(() => {
          const notesStr = order.notes || '';
          const isRefunded = notesStr.includes('status=CREDITED') || notesStr.includes('[BANK_REFUND: status=CREDITED');
          let refundPercent = 100;
          if (notesStr.includes('70%')) refundPercent = 70;
          else if (notesStr.includes('50%')) refundPercent = 50;

          let amtMatch = notesStr.match(/amount=₹?(\d+)/i) || notesStr.match(/₹(\d+)/);
          let refundAmount = amtMatch ? parseInt(amtMatch[1]) : Math.round(order.total_amount * (refundPercent / 100));

          let txnMatch = notesStr.match(/txn_id=([^\s|\]]+)/i);
          let txnId = txnMatch ? txnMatch[1] : null;

          const isOnlineBill = notesStr.includes('[PAYMENT: ONLINE');
          const paymentMode = isOnlineBill ? 'ONLINE Payment (Razorpay)' : 'Cash on Delivery (COD)';

          const tipMatch = notesStr.match(/\[TIP_PAYMENT:\s*₹?(\d+)\s*via\s*Razorpay ID:\s*([^\]\s]+)\]/i);

          return (
            <View style={[styles.card, { backgroundColor: isRefunded ? 'rgba(16, 185, 129, 0.06)' : colors.cardBg, borderColor: isRefunded ? '#10B981' : colors.cardBorder }]}>
              <Text style={[styles.sectionHeader, { color: isRefunded ? '#10B981' : colors.accentGold }]}>
                {isRefunded ? 'BANK REFUND & PAYMENT DETAILS' : 'BILL PAYMENT METHOD'}
              </Text>

              <View style={{ gap: 8 }}>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Bill Payment Gateway:</Text>
                  <Text style={[styles.receiptValue, { color: colors.textMain, fontWeight: '700' }]}>{paymentMode}</Text>
                </View>

                {tipMatch ? (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.cardBorder, marginVertical: 4 }]} />
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Doorstep Tip Paid:</Text>
                      <Text style={[styles.receiptValue, { color: colors.statusGreen, fontWeight: '800' }]}>+₹{tipMatch[1]} (Razorpay)</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Tip Razorpay ID:</Text>
                      <Text style={[styles.receiptValue, { color: colors.accentGold, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                        {tipMatch[2].trim()}
                      </Text>
                    </View>
                  </>
                ) : null}

                {isRefunded ? (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.cardBorder, marginVertical: 4 }]} />
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Refund Status:</Text>
                      <Text style={[styles.receiptValue, { color: '#10B981', fontWeight: '900' }]}>REFUND COMPLETED ✓</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Refund Amount Credited:</Text>
                      <Text style={[styles.receiptValue, { color: '#10B981', fontWeight: '900' }]}>+₹{refundAmount} ({refundPercent}% Refund)</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Bank UTR Reference ID:</Text>
                      <Text style={[styles.receiptValue, { color: colors.textMain, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                        {txnId || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Processed On:</Text>
                      <Text style={[styles.receiptValue, { color: colors.textSub }]}>{new Date(order.created_at).toLocaleString()}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          );
        })()}

        {/* Address and Branch info */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeader, { color: colors.accentGold }]}>DELIVERY LOCATION</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MapPin size={15} color={colors.accentGold} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Doorstep Address</Text>
                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                  {order.delivery_address}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Clock size={15} color={colors.accentGold} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Preparation Kitchen</Text>
                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                  {order.branches?.name || 'Hotel Bet - Narhe'} ({order.branches?.address})
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Cancellation & Refund Policy Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCancelConfirmation}
        onRequestClose={() => setShowCancelConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(15, 15, 12, 0.96)' : 'rgba(255, 255, 255, 0.98)', maxWidth: 360 }]}>
            <LottieView
              source={require('../../../assets/images/wrong.lottie')}
              autoPlay
              loop
              style={{ width: 80, height: 80, marginBottom: 8 }}
            />
            <Text style={[styles.modalTitle, { color: colors.statusRed }]}>CANCEL ORDER & REFUND</Text>
            
            {order && (() => {
              const refund = getRefundInfo(order.status, order.total_amount);
              return (
                <View style={{ width: '100%', gap: 10, marginBottom: 16 }}>
                  {/* Stage & Refund Rate Badge */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 0.8,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}>
                    <Text style={{ color: colors.textMain, fontSize: 11, fontWeight: '800' }}>
                      {refund.stageLabel}
                    </Text>
                    <View style={{ backgroundColor: colors.statusRed, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                        {refund.percent}% REFUND
                      </Text>
                    </View>
                  </View>

                  {/* Refund Breakdown Box */}
                  <View style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    gap: 6,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSub, fontSize: 11 }}>Order Total Invoice:</Text>
                      <Text style={{ color: colors.textMain, fontSize: 11, fontWeight: '700' }}>₹{order.total_amount}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSub, fontSize: 11 }}>Applicable Refund Rate:</Text>
                      <Text style={{ color: colors.statusGreen, fontSize: 11, fontWeight: '800' }}>{refund.percent}%</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.cardBorder, marginVertical: 2 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '900' }}>
                        {refundPreference === 'wallet' ? 'Wallet Refund Credit:' : 'Bank Refund Payout:'}
                      </Text>
                      <Text style={{ color: colors.accentGold, fontSize: 16, fontWeight: '900' }}>+₹{refund.amount}</Text>
                    </View>
                  </View>

                  {/* Refund Destination Badge */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: refundPreference === 'wallet' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 0.8,
                    borderColor: refundPreference === 'wallet' 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : 'rgba(59, 130, 246, 0.3)',
                  }}>
                    {refundPreference === 'wallet' ? (
                      <Wallet size={16} color="#10B981" />
                    ) : (
                      <CreditCard size={16} color="#3B82F6" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontSize: 11, fontWeight: '800' }}>
                        {refundPreference === 'wallet' 
                          ? '⚡ Instant Hotel Bet Money (0 wait time)' 
                          : '🏦 Bank UTR Payout (2-5 business days)'}
                      </Text>
                      <Text style={{ color: colors.textSub, fontSize: 9, marginTop: 2 }}>
                        {refundPreference === 'wallet'
                          ? 'Refund credited instantly to your wallet balance'
                          : 'Refund will be processed to your original payment source'}
                      </Text>
                    </View>
                  </View>

                  {/* Policy Note Alert Box */}
                  <View style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 0.8,
                    borderColor: 'rgba(212, 175, 55, 0.25)',
                  }}>
                    <Text style={{ color: colors.textMain, fontSize: 10, lineHeight: 15, fontWeight: '600' }}>
                      💡 <Text style={{ color: colors.accentGold, fontWeight: '800' }}>Policy Note:</Text> {refund.note}
                    </Text>
                  </View>
                </View>
              );
            })()}
            
            <View style={{ gap: 8, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.statusRed, borderColor: colors.statusRed, height: 46 }]} 
                onPress={executeCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                    CONFIRM CANCELLATION (GET ₹{order ? getRefundInfo(order.status, order.total_amount).amount : 0})
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderColor: colors.cardBorder, height: 44 }]} 
                onPress={() => setShowCancelConfirmation(false)}
              >
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Keep My Order</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Liquid Glass Tip Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!tipSuccessModal?.visible}
        onRequestClose={() => setTipSuccessModal(null)}
      >
        <View style={styles.glassModalOverlay}>
          <BlurView
            intensity={90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.glassModalContainer,
              {
                borderColor: 'rgba(212, 175, 55, 0.35)',
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.95)'
              }
            ]}
          >
            {/* Sparkle Glow Icon */}
            <View style={styles.glassIconCircle}>
              <Sparkles size={28} color="#D4AF37" />
            </View>

            <Text style={[styles.glassModalTitle, { color: colors.textMain }]}>
              Tip Sent Successfully! 💖
            </Text>

            <Text style={[styles.glassModalSubtitle, { color: colors.textSub }]}>
              Thank you! Your tip of{' '}
              <Text style={{ color: colors.accentGold, fontWeight: '900' }}>
                ₹{tipSuccessModal?.amount || 0}
              </Text>{' '}
              was paid via Razorpay to your delivery partner. 100% of this tip goes to them!
            </Text>

            {/* Liquid Glass Direct Payout Badge */}
            <View style={styles.glassBadgeBox}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
                100% Direct Payout to Rider
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{ width: '100%', marginTop: 20 }}
              onPress={() => setTipSuccessModal(null)}
            >
              <LinearGradient
                colors={['#D4AF37', '#F3E5AB', '#AA7C11']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.glassModalBtn}
              >
                <Text style={styles.glassModalBtnText}>Awesome!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      {/* Toast Alert overlay */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.8,
  },
  headerBackBtn: {
    padding: 8,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 116 : Platform.OS === 'android' ? 104 : 88,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderIdLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createdAtText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  currentStepInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    flex: 1.2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  otpCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.04)',
    borderWidth: 1,
    alignItems: 'center',
    padding: 20,
  },
  otpCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  otpCardSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 12,
  },
  otpCodeText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 6,
  },
  divider: {
    height: 0.8,
    width: '100%',
    marginBottom: 12,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  invoiceTotalVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
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
  alertOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  alertGlassCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertTextWrapper: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  alertTitleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertMsgText: {
    fontSize: 10,
    fontWeight: '600',
  },
  glassModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glassModalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.2,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  glassIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glassModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  glassModalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  glassBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  glassModalBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glassModalBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
