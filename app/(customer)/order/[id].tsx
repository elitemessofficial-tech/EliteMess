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
import { ChevronLeft, MapPin, Phone, Clock, DollarSign, CheckCircle2, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, User, Info } from 'lucide-react-native';
import { useAppTheme } from '../../../src/context/ThemeContext';
import { supabase } from '../../../src/services/supabase';
import Loader from '../../../components/Loader';
import LottieView from 'lottie-react-native';

interface DBOrderItem {
  id: string;
  quantity: number;
  price_at_order: number;
  menu_items?: {
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

  const [order, setOrder] = useState<DBOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tipping states
  const [customTip, setCustomTip] = useState('');
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [tipping, setTipping] = useState(false);

  // Cancellation states
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

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

  const handleCancelOrder = () => {
    setShowCancelConfirmation(true);
  };

  const executeCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;
    try {
      setCancelling(true);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;
      setOrder(prev => prev ? { ...prev, status: 'cancelled', delivery_otp: undefined } : null);
      
      // Close confirmation modal and show toast immediately
      setShowCancelConfirmation(false);
      showToast("Success", "Your order has been cancelled successfully.", "success");
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
            quantity,
            price_at_order,
            menu_items (
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
        order_items: (data.order_items || []).map((item: any) => ({
          ...item,
          menu_items: Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items
        })),
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
      const { error } = await supabase
        .from('orders')
        .update({ tip_amount: amount })
        .eq('id', order.id);

      if (error) throw error;
      setOrder(prev => prev ? { ...prev, tip_amount: amount } : null);
    } catch (e: any) {
      console.error('Error submitting tip:', e.message);
    } finally {
      setTipping(false);
      setShowCustomTipInput(false);
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

  const subtotal = order.total_amount > 150 ? Math.round((order.total_amount - 150) / 1.05) : 0;
  const gst = order.total_amount > 150 ? Math.round(subtotal * 0.05) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Floating Header */}
      <View style={[styles.header, { borderColor: colors.cardBorder }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.push('/(customer)/cart')}>
          <ChevronLeft size={18} color={colors.accentGold} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Track Order</Text>
        <View style={{ width: 32 }} />
      </View>

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
          {order.status === 'pending' && (
            <TouchableOpacity
              style={{ borderColor: colors.statusRed, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}
              onPress={handleCancelOrder}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.statusRed} />
              ) : (
                <Text style={{ color: colors.statusRed, fontWeight: '800', fontSize: 12 }}>Cancel Order</Text>
              )}
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

          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Subtotal</Text>
            <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSub }]}>GST (5%)</Text>
            <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹{gst.toLocaleString()}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Delivery Payout</Text>
            <Text style={[styles.receiptValue, { color: colors.textMain }]}>₹150</Text>
          </View>

          {order.tip_amount && order.tip_amount > 0 ? (
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSub }]}>Doorstep Tip</Text>
              <Text style={[styles.receiptValue, { color: colors.statusGreen }]}>+₹{order.tip_amount}</Text>
            </View>
          ) : null}

          <View style={[styles.receiptRow, { marginTop: 10 }]}>
            <Text style={[styles.invoiceTotalLabel, { color: colors.textMain }]}>Total Invoice</Text>
            <Text style={[styles.invoiceTotalVal, { color: colors.accentGold }]}>
              ₹{(parseFloat(order.total_amount as any) + (order.tip_amount || 0)).toLocaleString()}
            </Text>
          </View>
        </View>

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

      {/* Cancellation Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCancelConfirmation}
        onRequestClose={() => setShowCancelConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(15, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <LottieView
              source={require('../../../assets/images/wrong.lottie')}
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
                onPress={() => setShowCancelConfirmation(false)}
              >
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 12 }}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.statusRed, borderColor: colors.statusRed }]} 
                onPress={executeCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
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
});
