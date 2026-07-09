import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import Loader from '../../components/Loader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Home, ShoppingBag, Navigation, MapPin, Sun, Moon, LogOut, PackageCheck, ClipboardCheck, DollarSign, CheckCircle, AlertCircle, ShieldCheck, ChevronDown } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';

interface DBActiveDelivery {
  id: string;
  status: string;
  order_id: string;
  orders: {
    id: string;
    total_amount: number;
    delivery_address: string;
    notes?: string;
    delivery_phone: string;
    status: string;
    delivery_otp?: string;
    profiles?: {
      full_name: string;
    };
    branches?: {
      name: string;
      address: string;
    };
  };
}

interface DBAvailableOrder {
  id: string;
  total_amount: number;
  delivery_address: string;
  notes?: string;
  status: string;
  profiles?: {
    full_name: string;
  };
  branches?: {
    name: string;
    address: string;
  };
  deliveries?: {
    id: string;
    rider_id?: string;
  };
}

export default function RiderDashboard() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  const [activeDeliveries, setActiveDeliveries] = useState<DBActiveDelivery[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DBAvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [selectedDetailDelivery, setSelectedDetailDelivery] = useState<any | null>(null);

  const handleOpenMap = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = 'Delivery Location';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latLng}`
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  // Segment Tab & Earnings states
  const { segment } = useLocalSearchParams<{ segment?: string }>();
  const [activeSegment, setActiveSegment] = useState<'deliveries' | 'earnings'>('deliveries');

  useEffect(() => {
    if (segment === 'earnings') {
      setActiveSegment('earnings');
    } else if (segment === 'deliveries') {
      setActiveSegment('deliveries');
    }
  }, [segment]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);
  const [earningsFilter, setEarningsFilter] = useState<'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lifetime'>('lifetime');
  const [earningsDropdownOpen, setEarningsDropdownOpen] = useState(false);

  // OTP Verification Modal States
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(8).fill(''));
  const [otpTargetOrderId, setOtpTargetOrderId] = useState('');
  const [otpTargetDeliveryId, setOtpTargetDeliveryId] = useState('');
  const [otpCorrectValue, setOtpCorrectValue] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const otpRefs = React.useRef<Array<any>>([]);

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

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37', // Gold highlight
    statusGreen: '#10B981',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  const getFilteredDeliveries = (deliveriesList: any[], filter: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfSevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    return deliveriesList.filter(item => {
      if (!item.updated_at) return true;
      const itemDate = new Date(item.updated_at);
      
      switch (filter) {
        case 'today':
          return itemDate >= startOfToday;
        case 'yesterday':
          return itemDate >= startOfYesterday && itemDate < startOfToday;
        case 'last7days':
          return itemDate >= startOfSevenDaysAgo;
        case 'thisMonth':
          return itemDate >= startOfThisMonth;
        case 'lastMonth':
          return itemDate >= startOfLastMonth && itemDate < startOfThisMonth;
        case 'thisYear':
          return itemDate >= startOfThisYear;
        case 'lifetime':
        default:
          return true;
      }
    });
  };

  const ensureRiderProfileExists = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error || !data) {
        // Insert profile
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            phone_number: '+15559876543',
            full_name: 'Elite Rider Alpha',
            role: 'rider'
          });
      } else if (data.role !== 'rider') {
        // Ensure role is rider for testing dashboard
        await supabase
          .from('profiles')
          .update({ role: 'rider' })
          .eq('id', userId);
      }
    } catch (e) {
      console.warn('Error checking/creating rider profile in DB:', e);
    }
  };

  const fetchRiderData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let userId = session?.user?.id;
      if (!userId) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          userId = data?.user?.id;
        } catch (e) {
          console.warn('Anonymous auth failed/disabled in rider fetch', e);
        }
        if (!userId) {
          userId = 'mock-rider-uid-123';
        }
      }

      if (userId) {
        setRiderId(userId);
        await ensureRiderProfileExists(userId);

        // 1. Fetch active deliveries assigned to rider
        const { data: activeData, error: activeErr } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            order_id,
            orders (
              id,
              total_amount,
              delivery_address,
              delivery_latitude,
              delivery_longitude,
              notes,
              delivery_phone,
              status,
              delivery_otp,
              profiles (
                full_name
              ),
              branches (
                name,
                address
              ),
              order_items (
                quantity,
                price_at_order,
                menu_items (
                  name
                )
              )
            )
          `)
          .eq('rider_id', userId)
          .neq('status', 'delivered')
          .neq('status', 'failed');

        if (activeErr) throw activeErr;
        
        // Filter out any delivery where order is deleted/missing
        const formattedActive = (activeData || [])
          .filter(item => item.orders !== null)
          .map((item: any) => ({
            ...item,
            orders: {
              ...item.orders,
              profiles: Array.isArray(item.orders.profiles) ? item.orders.profiles[0] : item.orders.profiles,
              branches: Array.isArray(item.orders.branches) ? item.orders.branches[0] : item.orders.branches,
              order_items: (item.orders.order_items || []).map((oi: any) => ({
                ...oi,
                menu_items: Array.isArray(oi.menu_items) ? oi.menu_items[0] : oi.menu_items
              }))
            }
          }));
        setActiveDeliveries(formattedActive);

        // 2. Fetch available orders ready for pickup with no active rider assigned
        const { data: availableData, error: availableErr } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            delivery_address,
            delivery_latitude,
            delivery_longitude,
            notes,
            delivery_phone,
            status,
            profiles (
              full_name,
              phone_number
            ),
            branches (
              name,
              address
            ),
            deliveries (
              id,
              rider_id,
              status
            ),
            order_items (
              quantity,
              price_at_order,
              menu_items (
                name
              )
            )
          `)
          .eq('status', 'ready_for_pickup');

        if (availableErr) throw availableErr;

        // Filter orders where no delivery is assigned, or it is assigned but has no rider_id, or is not picked up
        const claimable = (availableData || [])
          .filter((order: any) => {
            const del = Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries;
            return !del || !del.rider_id;
          })
          .map((order: any) => ({
            ...order,
            profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
            branches: Array.isArray(order.branches) ? order.branches[0] : order.branches,
            deliveries: Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries,
            order_items: (order.order_items || []).map((oi: any) => ({
              ...oi,
              menu_items: Array.isArray(oi.menu_items) ? oi.menu_items[0] : oi.menu_items
            }))
          }));
        setAvailableOrders(claimable);

        // 3. Fetch completed deliveries for earnings tracking
        const { data: completedData } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            updated_at,
            order_id,
            orders (
              id,
              total_amount,
              delivery_address,
              delivery_latitude,
              delivery_longitude,
              notes,
              delivery_phone,
              tip_amount,
              profiles (
                full_name,
                phone_number
              ),
              branches (
                name,
                address
              ),
              order_items (
                quantity,
                price_at_order,
                menu_items (
                  name
                )
              )
            )
          `)
          .eq('rider_id', userId)
          .eq('status', 'delivered')
          .order('updated_at', { ascending: false });

        const formattedCompleted = (completedData || [])
          .filter((item: any) => item.orders !== null)
          .map((item: any) => ({
            ...item,
            orders: {
              ...item.orders,
              profiles: Array.isArray(item.orders.profiles) ? item.orders.profiles[0] : item.orders.profiles,
              branches: Array.isArray(item.orders.branches) ? item.orders.branches[0] : item.orders.branches,
              order_items: (item.orders.order_items || []).map((oi: any) => ({
                ...oi,
                menu_items: Array.isArray(oi.menu_items) ? oi.menu_items[0] : oi.menu_items
              }))
            }
          }));
        setCompletedDeliveries(formattedCompleted);
      }
    } catch (e) {
      console.error('Rider dashboard data load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiderData();

    // Subscribe to realtime orders and deliveries
    const realtimeChannel = supabase
      .channel(`rider_dashboard_stream_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchRiderData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchRiderData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const handleClaimOrder = async (orderId: string) => {
    if (!riderId) return;
    try {
      // Check if delivery row exists
      const { data: existingDel } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (existingDel) {
        await supabase
          .from('deliveries')
          .update({
            rider_id: riderId,
            status: 'assigned',
            assigned_at: new Date().toISOString()
          })
          .eq('order_id', orderId);
      } else {
        await supabase
          .from('deliveries')
          .insert({
            order_id: orderId,
            rider_id: riderId,
            status: 'assigned'
          });
      }

      // Progress order status to out_for_delivery
      await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .eq('id', orderId);

      showToast('Delivery Claimed', 'You have claimed this order. Start delivery now!', 'success');
      fetchRiderData();
    } catch (err: any) {
      showToast('Claim Error', err.message, 'error');
    }
  };

  const handlePickUpOrder = async (deliveryId: string, orderId: string) => {
    try {
      // Update delivery status
      const { error: delErr } = await supabase
        .from('deliveries')
        .update({ 
          status: 'picked_up',
          picked_up_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (delErr) throw delErr;

      // Update order status
      const { error: ordErr } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .eq('id', orderId);

      if (ordErr) throw ordErr;

      showToast('Picked Up', 'Order marked as picked up. Out for delivery!', 'success');
      fetchRiderData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCompleteDeliveryInitiate = (deliveryId: string, orderId: string, correctOtp: string) => {
    setOtpTargetDeliveryId(deliveryId);
    setOtpTargetOrderId(orderId);
    setOtpCorrectValue(correctOtp || 'LEGACY_BYPASS');
    setOtpDigits(Array(8).fill(''));
    setOtpError(null);
    setFocusedIndex(0);
    setOtpModalVisible(true);
    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 150);
  };

  const handleOtpChange = (text: string, index: number) => {
    setOtpError(null);
    const cleanText = text.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanText.length > 1) {
      const chars = cleanText.split('');
      for (let i = 0; i < chars.length && index + i < 8; i++) {
        newDigits[index + i] = chars[i];
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(index + chars.length, 7);
      setFocusedIndex(nextFocus);
      otpRefs.current[nextFocus]?.focus();
    } else {
      newDigits[index] = cleanText;
      setOtpDigits(newDigits);
      if (cleanText !== '' && index < 7) {
        setFocusedIndex(index + 1);
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setFocusedIndex(index - 1);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyAndComplete = async () => {
    const isLegacy = otpCorrectValue === 'LEGACY_BYPASS';
    const otpInputCombined = otpDigits.join('');
    const cleanInput = otpInputCombined.trim();
    const cleanCorrect = otpCorrectValue.trim();

    if (!isLegacy && cleanInput !== cleanCorrect) {
      setOtpError('The verification OTP is incorrect. Please check and try again.');
      return;
    }

    setOtpModalVisible(false);

    try {
      // Update delivery status
      const { error: delErr } = await supabase
        .from('deliveries')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', otpTargetDeliveryId);

      if (delErr) throw delErr;

      // Update order status
      const { error: ordErr } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', otpTargetOrderId);

      if (ordErr) throw ordErr;

      showToast('Delivered!', 'Delivery completed successfully.', 'success');
      fetchRiderData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('demo_role');
    router.replace('/(auth)/login');
  };

  const filteredDeliveries = getFilteredDeliveries(completedDeliveries, earningsFilter);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
        title="My Deliveries"
        titleAlign="left"
        rightContent={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { borderColor: colors.cardBorder }]} activeOpacity={0.7}>
              {isDark ? (
                <Sun size={15} color={colors.accentGold} />
              ) : (
                <Moon size={15} color={colors.accentGold} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={[styles.headerButton, styles.logoutButton, { borderColor: colors.cardBorder }]} activeOpacity={0.7}>
              <LogOut size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Tabs removed to be driven by the bottom tab bar */}

        {loading ? (
          <View style={{ height: 120, position: 'relative' }}>
            <Loader />
          </View>
        ) : activeSegment === 'deliveries' ? (
          <View style={{ gap: 24 }}>
            
            {/* 1. ACTIVE TASK CARDS */}
            <View>
              <Text style={[styles.sectionHeaderTitle, { color: colors.accentGold }]}>CURRENT ACTIVE DELIVERIES</Text>
              
              {activeDeliveries.length > 0 ? (
                <View style={{ gap: 16 }}>
                  {activeDeliveries.map((activeTask, idx) => (
                    <AnimatedEntrance key={activeTask.id} delay={idx * 60}>
                      <View style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                        <TouchableOpacity onPress={() => setSelectedDetailDelivery({ type: 'active', ...activeTask })} activeOpacity={0.8}>
                        {/* Top Label & Mode Pill */}
                        <View style={styles.cardTopRow}>
                          <View>
                            <Text style={[styles.cardLabel, { color: colors.accentGold }]}>ACTIVE TASK {activeDeliveries.length > 1 ? `#${idx + 1}` : ''}</Text>
                            <Text style={[styles.orderId, { color: colors.textMain }]}>
                              #{activeTask.orders.id.slice(0, 8).toUpperCase()}
                            </Text>
                          </View>
                          
                          <View style={styles.riderModeBadge}>
                            <Navigation size={12} color={colors.accentGold} style={styles.navigationIcon} />
                            <Text style={[styles.riderModeText, { color: colors.accentGold }]}>
                              {activeTask.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
    
                        {/* Details Grid */}
                        <View style={styles.gridContainer}>
                          <View style={styles.gridRow}>
                            <View style={styles.gridCol}>
                              <Text style={[styles.gridLabel, { color: colors.textSub }]}>PICKUP FROM</Text>
                              <Text style={[styles.gridValue, { color: colors.textMain }]}>
                                {activeTask.orders.branches?.name || 'Hotel Bet - Main Lobby'}
                              </Text>
                              <Text style={[styles.gridSubValue, { color: colors.textSub }]}>
                                {activeTask.orders.branches?.address}
                              </Text>
                            </View>
                            
                            <View style={styles.gridCol}>
                              <Text style={[styles.gridLabel, { color: colors.textSub }]}>CUSTOMER</Text>
                              <Text style={[styles.gridValue, { color: colors.textMain }]}>
                                {activeTask.orders.profiles?.full_name || 'Guest Customer'}
                              </Text>
                              <Text style={[styles.gridSubValue, { color: colors.textSub }]}>
                                Phone: {activeTask.orders.delivery_phone}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.gridRow}>
                            <View style={styles.gridCol}>
                              <Text style={[styles.gridLabel, { color: colors.textSub }]}>DELIVERY LOCATION</Text>
                              <Text style={[styles.gridValue, { color: colors.textMain }]}>
                                {activeTask.orders.delivery_address}
                              </Text>
                            </View>
                            
                            <View style={styles.gridCol}>
                              <Text style={[styles.gridLabel, { color: colors.textSub }]}>TOTAL VALUE</Text>
                              <Text style={[styles.gridValue, { color: colors.accentGold }]}>
                                ₹{parseFloat(activeTask.orders.total_amount as any).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>
    
                        {activeTask.orders.notes ? (
                          <>
                            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
                            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DELIVERY NOTES</Text>
                            <Text style={[styles.deliveryNotesText, { color: colors.textSub }]}>
                              "{activeTask.orders.notes}"
                            </Text>
                          </>
                        ) : null}
                        </TouchableOpacity>
    
                        {/* Action Buttons */}
                        <View style={styles.riderActionsRow}>
                          {activeTask.status === 'assigned' && (
                            <TouchableOpacity 
                              style={[styles.riderActionBtn, { backgroundColor: colors.accentGold }]}
                              onPress={() => handlePickUpOrder(activeTask.id, activeTask.orders.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.riderActionBtnText}>Confirm Pickup</Text>
                            </TouchableOpacity>
                          )}
    
                          {activeTask.status === 'picked_up' && (
                            <TouchableOpacity 
                              style={[styles.riderActionBtn, { backgroundColor: colors.statusGreen }]}
                              onPress={() => handleCompleteDeliveryInitiate(activeTask.id, activeTask.orders.id, activeTask.orders.delivery_otp || '')}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.riderActionBtnText, { color: '#FFFFFF' }]}>Complete Delivery</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </AnimatedEntrance>
                  ))}
                </View>
              ) : (
                <AnimatedEntrance delay={0}>
                  <View style={[styles.emptyTaskCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                    <ClipboardCheck size={28} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>No Active Deliveries</Text>
                    <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                      Claim an available order below to start earning.
                    </Text>
                  </View>
                </AnimatedEntrance>
              )}
            </View>

            {/* 2. AVAILABLE DELIVERIES LIST */}
            <View>
              <Text style={[styles.sectionHeaderTitle, { color: colors.accentGold }]}>AVAILABLE TO CLAIM</Text>
              
              {availableOrders.length === 0 ? (
                <View style={[styles.emptyTaskCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                  <PackageCheck size={28} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>All Caught Up</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    No orders are currently waiting for pickup.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {availableOrders.map((order, index) => (
                    <AnimatedEntrance key={order.id} delay={index * 80}>
                      <TouchableOpacity 
                        style={[styles.availableCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} 
                        onPress={() => setSelectedDetailDelivery({ type: 'available', ...order })}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.availableId, { color: colors.accentGold }]}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>
                            ₹{parseFloat(order.total_amount as any).toLocaleString()}
                          </Text>
                        </View>

                        <Text style={[styles.availableDetailText, { color: colors.textMain, marginTop: 8 }]}>
                          Pickup: <Text style={{ fontWeight: '500', color: colors.textSub }}>{order.branches?.name || 'Hotel Bet Downtown'}</Text>
                        </Text>

                        <Text style={[styles.availableDetailText, { color: colors.textMain, marginTop: 4 }]}>
                          Deliver to: <Text style={{ fontWeight: '500', color: colors.textSub }}>{order.delivery_address}</Text>
                        </Text>

                        <TouchableOpacity 
                          style={[styles.claimBtn, { backgroundColor: colors.accentGold }]}
                          onPress={() => handleClaimOrder(order.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.claimBtnText}>Claim & Deliver</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </AnimatedEntrance>
                  ))}
                </View>
              )}
            </View>

            {/* 3. DELIVERY HISTORY */}
            <View>
              <Text style={[styles.sectionHeaderTitle, { color: colors.accentGold }]}>DELIVERY HISTORY</Text>
              
              {completedDeliveries.length === 0 ? (
                <View style={[styles.emptyTaskCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                  <ClipboardCheck size={28} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>No Past Deliveries</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Your completed deliveries will show up here.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {completedDeliveries.map((delivery, index) => {
                    const dateStr = new Date(delivery.updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <AnimatedEntrance key={delivery.id} delay={index * 80}>
                        <TouchableOpacity 
                          style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }]}
                          onPress={() => setSelectedDetailDelivery({ type: 'history', ...delivery })}
                          activeOpacity={0.8}
                        >
                          <View style={{ gap: 2, flex: 1, marginRight: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMain }}>
                              #{delivery.orders.id.slice(0, 8).toUpperCase()}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSub }} numberOfLines={1}>
                              {delivery.orders.delivery_address}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textSub }}>Completed: {dateStr}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.accentGold }}>
                              +₹150
                            </Text>
                            <Text style={{ fontSize: 9, color: colors.statusGreen, fontWeight: '800' }}>DELIVERED</Text>
                          </View>
                        </TouchableOpacity>
                      </AnimatedEntrance>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : (
          // ================= RIDER EARNINGS TAB =================
          <>
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>MY EARNINGS</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.statusGreen }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>Flat ₹150 / delivery</Text>
            </View>

            {/* Earnings Sort / Filter Dropdown */}
            <View style={{ marginBottom: 16, zIndex: 100, position: 'relative' }}>
              <Text style={[styles.sectionTitle, { color: colors.accentGold, marginBottom: 8, fontSize: 10, letterSpacing: 1 }]}>
                FILTER BY TIME RANGE
              </Text>
              
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: earningsDropdownOpen ? colors.accentGold : colors.cardBorder
                    }
                  ]}
                  onPress={() => setEarningsDropdownOpen(!earningsDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownButtonText, { color: colors.textMain }]}>
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'yesterday', label: 'Yesterday' },
                      { key: 'last7days', label: 'Last 7 Days' },
                      { key: 'thisMonth', label: 'This Month' },
                      { key: 'lastMonth', label: 'Last Month' },
                      { key: 'thisYear', label: 'This Year' },
                      { key: 'lifetime', label: 'Lifetime' }
                    ].find(opt => opt.key === earningsFilter)?.label || 'Lifetime'}
                  </Text>
                  <ChevronDown size={14} color={colors.accentGold} style={{ transform: [{ rotate: earningsDropdownOpen ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {earningsDropdownOpen && (
                  <BlurView
                    intensity={80}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                      styles.dropdownMenu,
                      {
                        backgroundColor: isDark ? 'rgba(20, 20, 16, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: colors.cardBorder
                      }
                    ]}
                  >
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                      {[
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: 'last7days', label: 'Last 7 Days' },
                        { key: 'thisMonth', label: 'This Month' },
                        { key: 'lastMonth', label: 'Last Month' },
                        { key: 'thisYear', label: 'This Year' },
                        { key: 'lifetime', label: 'Lifetime' }
                      ].map((item) => {
                        const isActive = earningsFilter === item.key;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.dropdownItem,
                              isActive && { backgroundColor: 'rgba(212, 175, 55, 0.15)' }
                            ]}
                            onPress={() => {
                              setEarningsFilter(item.key as any);
                              setEarningsDropdownOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isActive ? colors.accentGold : colors.textMain,
                                  fontWeight: isActive ? '800' : '500'
                                }
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </BlurView>
                )}
              </View>
            </View>

            {/* Earnings Stats Cards */}
            {(() => {
              const basePayout = filteredDeliveries.length * 150;
              const totalTips = filteredDeliveries.reduce((sum, item) => sum + (item.orders?.tip_amount || 0), 0);
              const totalPayout = basePayout + totalTips;

              return (
                <View style={{ gap: 12, marginBottom: 20 }}>
                  <View style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 20 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub, letterSpacing: 1.5, textTransform: 'uppercase' }}>TOTAL PAYOUT</Text>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: colors.accentGold, marginTop: 8 }}>
                      ₹{totalPayout.toLocaleString()}
                    </Text>
                    {totalTips > 0 ? (
                      <Text style={{ fontSize: 11, color: colors.statusGreen, marginTop: 4, fontWeight: '700' }}>
                        Base: ₹{basePayout.toLocaleString()} · Tips: ₹{totalTips.toLocaleString()}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 4 }}>Earned via completed doorstep deliveries</Text>
                    )}
                  </View>

                  <View style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textSub, letterSpacing: 1 }}>DELIVERIES COMPLETED</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textMain, marginTop: 4 }}>
                      {filteredDeliveries.length}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Completed deliveries history list */}
            <Text style={[styles.sectionHeaderTitle, { color: colors.accentGold, marginTop: 8 }]}>COMPLETED DEPARTURES</Text>
            
            <View style={{ gap: 12 }}>
              {filteredDeliveries.length === 0 ? (
                <View style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, alignItems: 'center', padding: 30 }]}>
                  <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }}>No Deliveries Found</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                    No completed deliveries match the selected time range.
                  </Text>
                </View>
              ) : (
                filteredDeliveries.map((delivery, index) => {
                  const dateStr = new Date(delivery.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <AnimatedEntrance key={delivery.id} delay={index * 80}>
                      <TouchableOpacity 
                        style={[styles.taskCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }]}
                        onPress={() => setSelectedDetailDelivery({ type: 'history', ...delivery })}
                        activeOpacity={0.8}
                      >
                        <View style={{ gap: 2, flex: 1, marginRight: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMain }}>
                            #{delivery.orders.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSub }} numberOfLines={1}>
                            {delivery.orders.delivery_address}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.textSub }}>Completed: {dateStr}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: colors.accentGold }}>
                            +₹{150 + (delivery.orders?.tip_amount || 0)}
                          </Text>
                          {delivery.orders?.tip_amount > 0 && (
                            <Text style={{ fontSize: 9, color: colors.statusGreen, fontWeight: '800', marginVertical: 2 }}>
                              Includes ₹{delivery.orders.tip_amount} Tip
                            </Text>
                          )}
                          <Text style={{ fontSize: 9, color: colors.statusGreen, fontWeight: '800' }}>PAID</Text>
                        </View>
                      </TouchableOpacity>
                    </AnimatedEntrance>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(15, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <Text style={[styles.modalTitle, { color: colors.accentGold }]}>ENTER DELIVERY OTP</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
              {otpCorrectValue === 'LEGACY_BYPASS' 
                ? "This is a legacy order. Click verify to proceed."
                : "Ask the customer for the 8-digit verification code displayed on their device."}
            </Text>
            
            {otpCorrectValue === 'LEGACY_BYPASS' ? (
              <View style={[styles.otpContainer, { justifyContent: 'center' }]}>
                <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '700', paddingVertical: 10 }}>
                  [ Legacy Order Bypass Mode ]
                </Text>
              </View>
            ) : (
              <View style={styles.otpContainer}>
                {Array(8).fill(0).map((_, index) => {
                  const isFilled = otpDigits[index] !== '';
                  const isFocused = focusedIndex === index;
                  
                  const borderCol = isFilled 
                    ? colors.statusGreen 
                    : isFocused 
                      ? colors.accentGold 
                      : colors.cardBorder;

                  return (
                    <TextInput
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      style={[
                        styles.otpBox,
                        {
                          color: colors.textMain,
                          backgroundColor: colors.inputBg,
                          borderColor: borderCol
                        }
                      ]}
                      value={otpDigits[index]}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      onFocus={() => setFocusedIndex(index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      autoFocus={index === 0}
                      placeholder="-"
                      placeholderTextColor={isDark ? '#3A3A3C' : '#AEAEB2'}
                    />
                  );
                })}
              </View>
            )}

            {otpError ? (
              <View style={styles.modalErrorContainer}>
                <AlertCircle size={12} color="#EF4444" style={{ marginRight: 2 }} />
                <Text style={styles.modalErrorText}>{otpError}</Text>
              </View>
            ) : null}
            
            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderColor: '#EF4444' }]} 
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.accentGold, borderColor: colors.accentGold }]} 
                onPress={handleVerifyAndComplete}
              >
                <Text style={{ color: '#000000', fontWeight: '900', fontSize: 13 }}>Verify & Deliver</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Delivery Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedDetailDelivery !== null}
        onRequestClose={() => setSelectedDetailDelivery(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView 
            intensity={95} 
            tint={isDark ? 'dark' : 'light'} 
            style={[
              styles.modalContent, 
              { 
                borderColor: colors.cardBorder, 
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                maxHeight: '85%'
              }
            ]}
          >
            {selectedDetailDelivery && (() => {
              const delivery = selectedDetailDelivery;
              const orderData = delivery.orders || delivery;
              const status = delivery.status || orderData.status;
              const type = delivery.type;

              return (
                <View style={{ width: '100%', flexShrink: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.accentGold }]}>DELIVERY DETAILS</Text>
                  
                  <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }} contentContainerStyle={{ gap: 16 }}>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>
                        Order ID: <Text style={{ color: colors.accentGold }}>#{orderData.id.slice(0, 8).toUpperCase()}</Text>
                      </Text>
                      <View style={[styles.riderModeBadge, { backgroundColor: status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(212, 175, 55, 0.15)' }]}>
                        <Text style={[styles.riderModeText, { color: status === 'delivered' ? colors.statusGreen : colors.accentGold }]}>
                          {status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={[styles.detailLabel, { color: colors.accentGold }]}>CUSTOMER</Text>
                      <Text style={[styles.detailText, { color: colors.textMain, fontWeight: '800' }]}>
                        {orderData.profiles?.full_name || 'Guest Customer'}
                      </Text>
                      {orderData.delivery_phone ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${orderData.delivery_phone}`)}>
                          <Text style={{ fontSize: 12, color: colors.accentGold, textDecorationLine: 'underline', marginTop: 4, fontWeight: '700' }}>
                            📞 Call: {orderData.delivery_phone}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={[styles.detailLabel, { color: colors.accentGold }]}>PICKUP FROM</Text>
                      <Text style={[styles.detailText, { color: colors.textMain, fontWeight: '800' }]}>
                        {orderData.branches?.name || 'Hotel Bet'}
                      </Text>
                      <Text style={[styles.detailSubText, { color: colors.textSub }]}>
                        {orderData.branches?.address || 'Hotel Bet lobby'}
                      </Text>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={[styles.detailLabel, { color: colors.accentGold }]}>DELIVER TO</Text>
                      <Text style={[styles.detailText, { color: colors.textMain, fontWeight: '800' }]}>
                        {orderData.delivery_address}
                      </Text>
                      
                      {orderData.delivery_latitude && orderData.delivery_longitude ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub }}>
                            Exact Location (Coordinates):
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accentGold, marginTop: 2 }}>
                            📍 {orderData.delivery_latitude.toFixed(6)}, {orderData.delivery_longitude.toFixed(6)}
                          </Text>
                          
                          <TouchableOpacity 
                            style={[styles.mapNavBtn, { borderColor: colors.accentGold, borderWidth: 1 }]}
                            onPress={() => handleOpenMap(orderData.delivery_latitude, orderData.delivery_longitude)}
                            activeOpacity={0.8}
                          >
                            <Navigation size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
                            <Text style={styles.mapNavBtnText}>Open Navigation / Google Maps</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={[styles.detailLabel, { color: colors.accentGold }]}>ORDER ITEMS</Text>
                      {orderData.order_items && orderData.order_items.length > 0 ? (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          {orderData.order_items.map((oi: any, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '600' }}>
                                • {oi.menu_items?.name || 'Menu Item'} <Text style={{ color: colors.accentGold, fontWeight: '800' }}>x{oi.quantity}</Text>
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.textSub }}>
                                ₹{(oi.price_at_order * oi.quantity).toLocaleString()}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={[styles.detailSubText, { color: colors.textSub }]}>No items listing available</Text>
                      )}
                    </View>

                    {orderData.notes ? (
                      <View style={styles.detailBlock}>
                        <Text style={[styles.detailLabel, { color: colors.accentGold }]}>DELIVERY NOTES</Text>
                        <Text style={[styles.detailSubText, { color: colors.textSub, fontStyle: 'italic' }]}>
                          "{orderData.notes}"
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.8, borderTopColor: colors.cardBorder, paddingTop: 12, marginTop: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>Total Amount</Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.accentGold }}>
                        ₹{parseFloat(orderData.total_amount as any).toLocaleString()}
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity 
                      style={[styles.modalBtn, { flex: 1, borderColor: colors.cardBorder }]} 
                      onPress={() => setSelectedDetailDelivery(null)}
                    >
                      <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>Close</Text>
                    </TouchableOpacity>

                    {type === 'available' && (
                      <TouchableOpacity 
                        style={[styles.modalBtn, { flex: 1.5, backgroundColor: colors.accentGold, borderColor: colors.accentGold }]} 
                        onPress={() => {
                          handleClaimOrder(orderData.id);
                          setSelectedDetailDelivery(null);
                        }}
                      >
                        <Text style={{ color: '#000000', fontWeight: '900', fontSize: 13, textAlign: 'center' }}>Claim & Deliver</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })()}
          </BlurView>
        </View>
      </Modal>

      {/* Bottom Tab Navigation Bar */}
      <BlurView 
        intensity={95} 
        tint={isDark ? 'dark' : 'light'} 
        blurMethod="dimezisBlurView"
        style={[
          styles.bottomTabContainer, 
          { 
            borderColor: colors.cardBorder, 
            backgroundColor: isDark ? 'rgba(10, 10, 8, 0.35)' : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 1
          }
        ]}
      >
        <TouchableOpacity 
          style={getTabStyle(activeSegment === 'deliveries')} 
          onPress={() => setActiveSegment('deliveries')}
        >
          <Home size={18} color={activeSegment === 'deliveries' ? colors.accentGold : colors.textSub} />
          <Text style={[styles.tabText, { color: activeSegment === 'deliveries' ? colors.accentGold : colors.textSub }]}>Deliveries</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={getTabStyle(activeSegment === 'earnings')} 
          onPress={() => setActiveSegment('earnings')}
        >
          <DollarSign size={18} color={activeSegment === 'earnings' ? colors.accentGold : colors.textSub} />
          <Text style={[styles.tabText, { color: activeSegment === 'earnings' ? colors.accentGold : colors.textSub }]}>Earnings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.push('/(rider)/rider_profile')}>
          <User size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Account</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 110,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  taskCard: {
    borderRadius: 24,
    borderWidth: 0.8,
    padding: 20,
  },
  emptyTaskCard: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  orderId: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  riderModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 0.8,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navigationIcon: {
    marginRight: 6,
  },
  riderModeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gridContainer: {
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  gridSubValue: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 0.8,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  deliveryNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '600',
  },
  riderActionsRow: {
    marginTop: 20,
  },
  riderActionBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderActionBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  availableCard: {
    borderRadius: 18,
    borderWidth: 0.8,
    padding: 16,
  },
  availableId: {
    fontSize: 14,
    fontWeight: '800',
  },
  availableDetailText: {
    fontSize: 12,
    fontWeight: '700',
  },
  claimBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  claimBtnText: {
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(10, 10, 8, 0.5)',
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
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
  segmentContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  segmentBtnActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    marginLeft: 6,
  },
  realtimeText: {
    fontSize: 10,
    fontWeight: '700',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    gap: 6,
  },
  otpBox: {
    width: 30,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 8,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
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
  dropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  detailBlock: {
    paddingBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailSubText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  mapNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  mapNavBtnText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
  },
});
