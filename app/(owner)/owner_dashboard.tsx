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
  TextInput,
  Switch,
  Image,
  Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import Loader from '../../components/Loader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Home, ShoppingBag, ShieldCheck, Star, Sun, Moon, LogOut, ClipboardList, CheckSquare, CheckCircle, AlertCircle, DollarSign, ChevronDown, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

interface OrderItem {
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
  profiles?: {
    full_name: string;
    phone_number: string;
  };
  order_items?: OrderItem[];
  deliveries?: {
    id: string;
    status: string;
    profiles?: {
      full_name: string;
    };
  };
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<DBOrder | null>(null);
  const [activeSegment, setActiveSegment] = useState<'orders' | 'reviews' | 'menu' | 'sales'>('orders');
  const [customerReviews, setCustomerReviews] = useState<any[]>([]);
  const [salesFilter, setSalesFilter] = useState<'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lifetime'>('lifetime');
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);

  // Menu Customization States
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Starters' | 'Mains' | 'Desserts' | 'Beverages'>('Starters');
  const [addingItem, setAddingItem] = useState(false);

  // States for Inline Edits
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [editDescs, setEditDescs] = useState<Record<string, string>>({});
  const [editAvail, setEditAvail] = useState<Record<string, boolean>>({});
  const [editImages, setEditImages] = useState<Record<string, string>>({});

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
    statusYellow: '#EAB308',
    statusGreen: '#10B981',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    goldGrad: (isDark ? ['#B88E2F', '#D4AF37'] : ['#D4AF37', '#B88E2F']) as [string, string],
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  const getFilteredOrders = (ordersList: any[], filter: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfSevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    return ordersList.filter(item => {
      if (!item.created_at) return true;
      const itemDate = new Date(item.created_at);
      
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

  const fetchOrdersAndReviews = async () => {
    try {
      // Query orders with profiles, order items, and delivery joins
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          delivery_address,
          notes,
          status,
          tip_amount,
          profiles (
            full_name,
            phone_number
          ),
          order_items (
            quantity,
            price_at_order,
            menu_items (
              name
            )
          ),
          deliveries (
            id,
            status,
            profiles (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formatted = (data || []).map((order: any) => ({
        ...order,
        profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
        order_items: (order.order_items || []).map((item: any) => ({
          ...item,
          menu_items: Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items
        })),
        deliveries: Array.isArray(order.deliveries) 
          ? (order.deliveries[0] ? {
              ...order.deliveries[0],
              profiles: Array.isArray(order.deliveries[0].profiles) ? order.deliveries[0].profiles[0] : order.deliveries[0].profiles
            } : null)
          : (order.deliveries ? {
              ...order.deliveries,
              profiles: Array.isArray(order.deliveries.profiles) ? order.deliveries.profiles[0] : order.deliveries.profiles
            } : null)
      }));
      setOrders(formatted);

      // Load Reviews from AsyncStorage
      const savedReviews = await AsyncStorage.getItem('hotelbet_reviews');
      if (savedReviews) {
        const parsed = JSON.parse(savedReviews);
        const reviewList = Object.keys(parsed).map(key => ({
          orderId: key,
          ...parsed[key]
        }));
        setCustomerReviews(reviewList);
      }
    } catch (e) {
      console.error('Failed to load operations data in Owner Dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const loaded = data || [];
      setMenuItems(loaded);
      
      // Initialize edit states
      const prices: Record<string, string> = {};
      const descs: Record<string, string> = {};
      const avail: Record<string, boolean> = {};
      const images: Record<string, string> = {};
      
      loaded.forEach((item: any) => {
        prices[item.id] = parseFloat(item.price).toString();
        descs[item.id] = item.description || '';
        avail[item.id] = item.is_available;
        images[item.id] = item.image_url || '';
      });
      
      setEditPrices(prices);
      setEditDescs(descs);
      setEditAvail(avail);
      setEditImages(images);
    } catch (e) {
      console.error('Failed to load menu items for customization:', e);
    }
  };

  const handleUpdateMenuItem = async (id: string, updatedFields: { price: number; description: string; is_available: boolean; image_url?: string | null }) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update(updatedFields)
        .eq('id', id);
      if (error) throw error;
      Alert.alert('Success', 'Menu item updated successfully.');
      fetchMenuItems();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      Alert.alert('Success', 'Menu item deleted successfully.');
      fetchMenuItems();
    } catch (err: any) {
      Alert.alert('Delete Failed', err.message);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      Alert.alert('Error', 'Please enter a name and price.');
      return;
    }
    
    // Check if the item already exists in the menu (case-insensitive)
    const isDuplicate = menuItems.some(
      item => item.name.trim().toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate Item', 'A menu item with this name already exists in the menu.');
      return;
    }
    
    setAddingItem(true);
    try {
      const priceNum = parseFloat(newItemPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error('Price must be a positive number');
      }

      const { error } = await supabase
        .from('menu_items')
        .insert({
          branch_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          name: newItemName.trim(),
          description: newItemDesc.trim(),
          price: priceNum,
          category: newItemCategory,
          image_url: newItemImage.trim() || null,
          is_available: true
        });

      if (error) throw error;

      Alert.alert('Success', 'New menu item added to database!');
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice('');
      setNewItemImage('');
      fetchMenuItems();
    } catch (err: any) {
      Alert.alert('Add Failed', err.message);
    } finally {
      setAddingItem(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndReviews();

    // Setup Supabase Realtime synchronization
    const ordersChannel = supabase
      .channel(`owner_dashboard_stream_${Date.now()}`)
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
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) throw error;
      showToast('Status Updated', `Order progressed to ${nextStatus}.`, 'success');
      fetchOrdersAndReviews();
    } catch (err: any) {
      showToast('Update Failed', err.message, 'error');
    }
  };

  const handleAssignRider = async (orderId: string) => {
    try {
      let riderId = '';
      
      // Fetch any profile with role = 'rider'
      const { data: riders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'rider');

      if (riders && riders.length > 0) {
        riderId = riders[0].id;
      } else {
        // Create a dummy rider for testing
        riderId = 'mock-rider-uid-123';
        const { error: insertErr } = await supabase
          .from('profiles')
          .upsert({
            id: riderId,
            phone_number: '+15559876543',
            full_name: 'Elite Rider Alpha',
            role: 'rider'
          });
        if (insertErr) throw insertErr;
      }

      // Upsert deliveries row
      const { data: existingDel } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (existingDel) {
        await supabase
          .from('deliveries')
          .update({ rider_id: riderId, status: 'assigned' })
          .eq('order_id', orderId);
      } else {
        await supabase
          .from('deliveries')
          .insert({ order_id: orderId, rider_id: riderId, status: 'assigned' });
      }

      // Progress order status to ready_for_pickup
      await supabase
        .from('orders')
        .update({ status: 'ready_for_pickup' })
        .eq('id', orderId);

      showToast('Driver Assigned', 'Elite Rider Alpha has been dispatched.', 'success');
      fetchOrdersAndReviews();
    } catch (err: any) {
      console.error('Failed to assign driver:', err.message);
      showToast('Assignment Error', err.message, 'error');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('demo_role');
    router.replace('/(auth)/login');
  };

  // Status-based stats calculation
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeDeliveriesCount = orders.filter(o => ['ready_for_pickup', 'out_for_delivery'].includes(o.status)).length;

  // Sales & Earnings Calculation Helpers
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const filteredCompletedOrders = getFilteredOrders(completedOrders, salesFilter);
  const totalSales = filteredCompletedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount as any || 0), 0);
  const totalCompleted = filteredCompletedOrders.length;
  const avgOrderValue = totalCompleted > 0 ? (totalSales / totalCompleted) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {toastVisible && (
        <View style={styles.alertOverlay}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.alertGlassCard, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(15, 15, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]}>
            <View style={styles.alertContent}>
              {toastType === 'success' && <CheckCircle size={18} color="#10B981" />}
              {toastType === 'error' && <AlertCircle size={18} color="#EF4444" />}
              {toastType === 'info' && <ShieldCheck size={18} color="#D4AF37" />}
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitleText, { color: colors.textMain }]}>{toastTitle}</Text>
                <Text style={[styles.alertMsgText, { color: colors.textSub }]}>{toastMessage}</Text>
              </View>
            </View>
          </BlurView>
        </View>
      )}
      <FloatingHeader 
        title="Operations Hub"
        subtitle={
          activeSegment === 'menu' 
            ? "Menu Customization Suite" 
            : activeSegment === 'sales' 
            ? "Revenue & Sales Statistics" 
            : "Owner Dispatch Dashboard"
        }
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
        {/* Statistics Summary Widgets - only on Home/Reviews tabs */}
        {(activeSegment === 'orders' || activeSegment === 'reviews') && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.numberRow}>
                <Text style={[styles.summaryNum, { color: colors.textMain }]}>{pendingCount}</Text>
                <View style={[styles.dot, { backgroundColor: colors.statusYellow }]} />
              </View>
              <Text style={[styles.summaryLabel, { color: colors.statusYellow }]}>PENDING</Text>
              <Text style={[styles.summaryLabel, { color: colors.statusYellow }]}>ORDERS</Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.numberRow}>
                <Text style={[styles.summaryNum, { color: colors.textMain }]}>{activeDeliveriesCount}</Text>
                <View style={[styles.dot, { backgroundColor: colors.statusGreen }]} />
              </View>
              <Text style={[styles.summaryLabel, { color: colors.accentGold }]}>ACTIVE</Text>
              <Text style={[styles.summaryLabel, { color: colors.accentGold }]}>DELIVERIES</Text>
            </View>
          </View>
        )}

        {/* Tab Segments (Rounded Row matching full width) - only on Home/Reviews tabs */}
        {(activeSegment === 'orders' || activeSegment === 'reviews') && (
          <View style={styles.segmentContainer}>
            <TouchableOpacity 
              style={[styles.segmentBtn, activeSegment === 'orders' && styles.segmentBtnActive, { borderColor: colors.cardBorder }]}
              onPress={() => setActiveSegment('orders')}
              activeOpacity={0.8}
            >
              <ShoppingBag size={14} color={activeSegment === 'orders' ? colors.bg : colors.textSub} />
              <Text style={[styles.segmentBtnText, { color: activeSegment === 'orders' ? colors.bg : colors.textMain }]}>Live Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.segmentBtn, activeSegment === 'reviews' && styles.segmentBtnActive, { borderColor: colors.cardBorder }]}
              onPress={() => {
                setActiveSegment('reviews');
                fetchOrdersAndReviews();
              }}
              activeOpacity={0.8}
            >
              <Star size={14} color={activeSegment === 'reviews' ? colors.bg : colors.textSub} />
              <Text style={[styles.segmentBtnText, { color: activeSegment === 'reviews' ? colors.bg : colors.textMain }]}>Reviews</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={{ height: 120, position: 'relative' }}>
            <Loader />
          </View>
        ) : activeSegment === 'orders' ? (
          // ================= ORDERS QUEUE =================
          <>
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>LIVE ORDER QUEUE</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.statusGreen }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>Realtime Sync</Text>
            </View>

            {orders.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 50, justifyContent: 'center' }}>
                <ClipboardList size={40} color={colors.textSub} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 14 }}>No Orders In System</Text>
                <Text style={{ color: colors.textSub, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Incoming customer orders will populate here.
                </Text>
              </View>
            ) : (
              <View style={styles.queueContainer}>
                {orders.map((order) => {
                  const guestName = order.profiles?.full_name || 'Guest Customer';
                  const elapsedMins = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const timeLabel = elapsedMins <= 0 ? 'Just now' : `${elapsedMins}m ago`;
                  
                  const itemsCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const priceLabel = `₹${parseFloat(order.total_amount as any).toLocaleString()}`;
                  
                  return (
                    <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} key={order.id}>
                      <TouchableOpacity 
                        onPress={() => setSelectedDetailOrder(order)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.cardHeader}>
                          <Text style={[styles.orderId, { color: colors.accentGold }]}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={[styles.orderItems, { color: colors.textMain }]}>
                            {itemsCount} item{itemsCount !== 1 ? 's' : ''} · {priceLabel}
                          </Text>
                        </View>
                        
                        <View style={styles.cardMid}>
                          <Text style={[styles.guestName, { color: colors.textMain }]}>
                            {guestName} ({order.profiles?.phone_number || 'No Phone'})
                          </Text>
                          <Text style={[styles.timeText, { color: colors.textSub }]}>{timeLabel}</Text>
                        </View>

                        {/* Display items names detail */}
                        {order.order_items && order.order_items.length > 0 && (
                          <View style={styles.itemsListing}>
                            {order.order_items.map((item, idx) => (
                              <Text key={idx} style={[styles.itemsListingText, { color: colors.textSub }]}>
                                • {item.menu_items?.name || 'Menu Item'} <Text style={{ color: colors.accentGold }}>x{item.quantity}</Text>
                              </Text>
                            ))}
                          </View>
                        )}
                        
                        <Text style={[styles.kitchenText, { color: colors.textMain }]}>
                          Deliver to: <Text style={{ fontWeight: '500', color: colors.textSub }}>{order.delivery_address}</Text>
                        </Text>

                        {order.notes ? (
                          <Text style={[styles.notesText, { color: colors.textSub }]}>
                            Notes: "{order.notes}"
                          </Text>
                        ) : null}

                        {/* Delivery assignment display */}
                        {order.deliveries ? (
                          <Text style={[styles.riderAssignmentText, { color: colors.statusGreen }]}>
                            Rider Assigned: {order.deliveries.profiles?.full_name || 'Elite Rider Alpha'} ({order.deliveries.status.toUpperCase()})
                          </Text>
                        ) : null}

                        <View style={[styles.statusBanner, { backgroundColor: 'rgba(255, 255, 255, 0.02)' }]}>
                          <Text style={[styles.statusBannerText, { color: colors.accentGold }]}>
                            STATUS: {order.status.toUpperCase()}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Actions */}
                      <View style={styles.actionsRow}>
                        {order.status === 'pending' && (
                          <>
                            <TouchableOpacity 
                              style={[styles.actionBtn, { borderColor: colors.accentGold }]}
                              onPress={() => handleUpdateStatus(order.id, 'accepted')}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.btnText, { color: colors.accentGold }]}>Accept Order</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                              onPress={() => handleUpdateStatus(order.id, 'cancelled')}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.btnText, { color: '#EF4444' }]}>Reject Order</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {order.status === 'accepted' && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: colors.accentGold }]}
                            onPress={() => handleUpdateStatus(order.id, 'preparing')}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.btnText, { color: colors.accentGold }]}>Start Cooking</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'preparing' && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: colors.statusGreen }]}
                            onPress={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.btnText, { color: colors.statusGreen }]}>Mark Ready</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'ready_for_pickup' && !order.deliveries && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: colors.accentGold }]}
                            onPress={() => handleAssignRider(order.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.btnText, { color: colors.textMain }]}>Assign Rider</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : activeSegment === 'reviews' ? (
          // ================= REVIEWS TAB =================
          <>
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>CUSTOMER FEEDBACK</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.accentGold }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>All Reviews</Text>
            </View>

            <View style={styles.queueContainer}>
              {customerReviews.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 50, justifyContent: 'center' }}>
                  <Star size={36} color={colors.textSub} style={{ opacity: 0.4, marginBottom: 12 }} />
                  <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 14 }}>No Reviews Yet</Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                    Reviews left by guests will appear here.
                  </Text>
                </View>
              ) : (
                customerReviews.map((review, idx) => (
                  <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} key={idx}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.orderId, { color: colors.accentGold }]}>
                        #{review.orderId.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text style={[styles.orderItems, { color: colors.textSub, fontSize: 11, fontWeight: '600' }]}>
                        {review.timestamp}
                      </Text>
                    </View>

                    <View style={styles.cardMid}>
                      <Text style={[styles.guestName, { color: colors.textMain }]}>{review.customerName}</Text>
                    </View>

                    <View style={{ marginTop: 8, gap: 6 }}>
                      {/* Food Feedback */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 90 }}>Food Quality:</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              color={i < review.orderRating ? colors.accentGold : 'rgba(255,255,255,0.1)'} 
                              fill={i < review.orderRating ? colors.accentGold : 'transparent'} 
                            />
                          ))}
                        </View>
                      </View>
                      {review.orderText ? (
                        <Text style={{ fontSize: 12, color: colors.textMain, fontStyle: 'italic', paddingLeft: 6, borderLeftWidth: 1.5, borderLeftColor: colors.accentGold, marginBottom: 4 }}>
                          "{review.orderText}"
                        </Text>
                      ) : null}

                      {/* Delivery Feedback */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 90 }}>Delivery Speed:</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              color={i < review.deliveryRating ? colors.accentGold : 'rgba(255,255,255,0.1)'} 
                              fill={i < review.deliveryRating ? colors.accentGold : 'transparent'} 
                            />
                          ))}
                        </View>
                      </View>
                      {review.deliveryText ? (
                        <Text style={{ fontSize: 12, color: colors.textMain, fontStyle: 'italic', paddingLeft: 6, borderLeftWidth: 1.5, borderLeftColor: colors.accentGold }}>
                          "{review.deliveryText}"
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : activeSegment === 'menu' ? (
          // ================= CUSTOMIZE MENU TAB =================
          <>
            {/* Customize Menu heading */}
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>CUSTOMIZE MENU ITEMS</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.accentGold }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>Manage Menu</Text>
            </View>

            {/* Create New Item Form */}
            <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.menuFormTitle, { color: colors.accentGold }]}>ADD NEW ITEM</Text>
              
              <TextInput 
                style={[styles.menuFormInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item Name (e.g. Lobster Thermidor)..."
                placeholderTextColor="#8E8E93"
              />

              <TextInput 
                style={[styles.menuFormInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                value={newItemDesc}
                onChangeText={setNewItemDesc}
                placeholder="Item Description..."
                placeholderTextColor="#8E8E93"
              />

              <View style={styles.menuFormRow}>
                <TextInput 
                  style={[styles.menuFormInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain, marginBottom: 0 }]}
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  placeholder="Price (₹)..."
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />

                {/* Category Selector Segment */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1.5 }} contentContainerStyle={{ gap: 4, alignItems: 'center' }}>
                  {['Starters', 'Mains', 'Desserts', 'Beverages'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        newItemCategory === cat && { backgroundColor: colors.accentGold }
                      ]}
                      onPress={() => setNewItemCategory(cat as any)}
                    >
                      <Text style={[styles.catPillText, { color: newItemCategory === cat ? '#000000' : colors.textMain }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TextInput 
                style={[styles.menuFormInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain, marginTop: 12 }]}
                value={newItemImage}
                onChangeText={setNewItemImage}
                placeholder="Image URL (e.g. https://images.unsplash.com/photo...)"
                placeholderTextColor="#8E8E93"
              />

              <TouchableOpacity 
                style={styles.menuFormBtn}
                onPress={handleAddMenuItem}
                disabled={addingItem}
              >
                <LinearGradient
                  colors={colors.goldGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.menuFormBtnGrad}
                >
                  {addingItem ? <ActivityIndicator color="#000000" size="small" /> : <Text style={styles.menuFormBtnText}>Add to Menu</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Existing Menu Items list */}
            <View style={{ gap: 16, marginTop: 12 }}>
              {menuItems.length === 0 ? (
                <ActivityIndicator size="small" color={colors.accentGold} style={{ marginTop: 20 }} />
              ) : (
                menuItems.map((item) => {
                  const currentPrice = editPrices[item.id] || '';
                  const currentDesc = editDescs[item.id] || '';
                  const currentAvail = editAvail[item.id] !== undefined ? editAvail[item.id] : true;
                  const currentImage = editImages[item.id] || '';

                  return (
                    <View 
                      style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} 
                      key={item.id}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {item.image_url ? (
                            <Image 
                              source={{ uri: item.image_url }} 
                              style={{ width: 36, height: 36, borderRadius: 8 }} 
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: colors.accentGold, borderStyle: 'dashed' }}>
                              <Text style={{ fontSize: 7, color: colors.textSub, fontWeight: '700' }}>No Pic</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>{item.name}</Text>
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accentGold, textTransform: 'uppercase' }}>
                          {item.category}
                        </Text>
                      </View>

                      {/* Price, Description & Image edits */}
                      <View style={{ marginTop: 10, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 70 }}>Price (₹):</Text>
                          <TextInput 
                            style={[styles.menuEditInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                            value={currentPrice}
                            onChangeText={(text) => setEditPrices(prev => ({ ...prev, [item.id]: text }))}
                            keyboardType="numeric"
                          />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 70 }}>Description:</Text>
                          <TextInput 
                            style={[styles.menuEditInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                            value={currentDesc}
                            onChangeText={(text) => setEditDescs(prev => ({ ...prev, [item.id]: text }))}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 70 }}>Image URL:</Text>
                          <TextInput 
                            style={[styles.menuEditInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                            value={currentImage}
                            onChangeText={(text) => setEditImages(prev => ({ ...prev, [item.id]: text }))}
                            placeholder="https://images.unsplash.com/photo..."
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        {/* Availability row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub }}>Available for ordering</Text>
                          <Switch 
                            value={currentAvail}
                            onValueChange={(val) => setEditAvail(prev => ({ ...prev, [item.id]: val }))}
                            trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: 'rgba(255, 255, 255, 0.25)' }}
                            thumbColor={currentAvail ? '#E5E7EB' : '#767577'}
                          />
                        </View>
                      </View>

                      {/* Action buttons */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                        <TouchableOpacity 
                          style={[styles.menuActionBtn, { borderColor: colors.statusGreen, flex: 2 }]}
                          onPress={() => handleUpdateMenuItem(item.id, {
                            price: parseFloat(currentPrice) || 0,
                            description: currentDesc,
                            is_available: currentAvail,
                            image_url: currentImage.trim() || null
                          })}
                        >
                          <Text style={{ color: colors.statusGreen, fontSize: 12, fontWeight: '800' }}>Save Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.menuActionBtn, { borderColor: '#EF4444', flex: 1 }]}
                          onPress={() => handleDeleteMenuItem(item.id)}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          // ================= SALES & EARNINGS TAB =================
          <>
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>SALES & ANALYTICS</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.statusGreen }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>Live Statistics</Text>
            </View>

            {/* Sales Filter Dropdown */}
            <View style={{ marginBottom: 16, zIndex: 100, position: 'relative' }}>
              <Text style={[styles.menuFormTitle, { color: colors.accentGold, marginBottom: 8 }]}>
                FILTER BY TIME RANGE
              </Text>
              
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: salesDropdownOpen ? colors.accentGold : colors.cardBorder
                    }
                  ]}
                  onPress={() => setSalesDropdownOpen(!salesDropdownOpen)}
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
                    ].find(opt => opt.key === salesFilter)?.label || 'Lifetime'}
                  </Text>
                  <ChevronDown size={14} color={colors.accentGold} style={{ transform: [{ rotate: salesDropdownOpen ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {salesDropdownOpen && (
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
                        const isActive = salesFilter === item.key;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.dropdownItem,
                              isActive && { backgroundColor: 'rgba(212, 175, 55, 0.15)' }
                            ]}
                            onPress={() => {
                              setSalesFilter(item.key as any);
                              setSalesDropdownOpen(false);
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

            {/* Sales Stat Widgets */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 20 }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub, letterSpacing: 1.5, textTransform: 'uppercase' }}>Total Revenue</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: colors.accentGold, marginTop: 8 }}>
                  ₹{totalSales.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 4 }}>Completed sales across hotel orders</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.menuCard, { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginBottom: 0 }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textSub, letterSpacing: 1 }}>COMPLETED</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textMain, marginTop: 4 }}>
                    {totalCompleted}
                  </Text>
                </View>

                <View style={[styles.menuCard, { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginBottom: 0 }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textSub, letterSpacing: 1 }}>AVG VALUE</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textMain, marginTop: 4 }}>
                    ₹{Math.round(avgOrderValue).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Completed Transactions */}
            <Text style={[styles.menuFormTitle, { color: colors.accentGold, marginTop: 8 }]}>RECENT TRANSACTIONS</Text>
            
            <View style={{ gap: 12, marginTop: 12 }}>
              {filteredCompletedOrders.length === 0 ? (
                <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, alignItems: 'center', padding: 30 }]}>
                  <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }}>No Transactions Found</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                    No completed sales match the selected time range.
                  </Text>
                </View>
              ) : (
                filteredCompletedOrders.map((order) => {
                  const dateStr = new Date(order.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const orderName = order.profiles?.full_name || 'Guest Guest';

                  return (
                    <View 
                      key={order.id}
                      style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    >
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMain }}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSub }}>{orderName} · {dateStr}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.accentGold }}>
                        ₹{parseFloat(order.total_amount as any).toLocaleString()}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
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
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'orders' || activeSegment === 'reviews')} 
            onPress={() => setActiveSegment('orders')}
          >
            <Home size={18} color={activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'menu')} 
            onPress={() => {
              setActiveSegment('menu');
              fetchMenuItems();
            }}
          >
            <ClipboardList size={18} color={activeSegment === 'menu' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'menu' ? colors.accentGold : colors.textSub }]}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'sales')} 
            onPress={() => setActiveSegment('sales')}
          >
            <DollarSign size={18} color={activeSegment === 'sales' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'sales' ? colors.accentGold : colors.textSub }]}>Earnings</Text>
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
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'orders' || activeSegment === 'reviews')} 
            onPress={() => setActiveSegment('orders')}
          >
            <Home size={18} color={activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'menu')} 
            onPress={() => {
              setActiveSegment('menu');
              fetchMenuItems();
            }}
          >
            <ClipboardList size={18} color={activeSegment === 'menu' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'menu' ? colors.accentGold : colors.textSub }]}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={getTabStyle(activeSegment === 'sales')} 
            onPress={() => setActiveSegment('sales')}
          >
            <DollarSign size={18} color={activeSegment === 'sales' ? colors.accentGold : colors.textSub} />
            <Text style={[styles.tabText, { color: activeSegment === 'sales' ? colors.accentGold : colors.textSub }]}>Earnings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detailed Order Modal for Owner */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedDetailOrder !== null}
        onRequestClose={() => setSelectedDetailOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              {
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.96)' : 'rgba(255, 255, 255, 0.96)'
              }
            ]}
          >
            {selectedDetailOrder && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                  <Text style={[styles.modalTitleText, { color: colors.accentGold }]}>
                    ORDER DETAILS
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDetailOrder(null)} style={{ padding: 4 }}>
                    <X size={20} color={colors.textSub} />
                  </TouchableOpacity>
                </View>

                {/* Status & ID banner */}
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textMain }}>
                    #{selectedDetailOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View style={{
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: selectedDetailOrder.status === 'cancelled' 
                      ? 'rgba(239, 68, 68, 0.15)' 
                      : selectedDetailOrder.status === 'completed' 
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(234, 179, 8, 0.15)',
                    borderWidth: 0.8,
                    borderColor: selectedDetailOrder.status === 'cancelled' 
                      ? '#EF4444' 
                      : selectedDetailOrder.status === 'completed' 
                      ? '#10B981'
                      : '#EAB308',
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: selectedDetailOrder.status === 'cancelled' 
                        ? '#EF4444' 
                        : selectedDetailOrder.status === 'completed' 
                        ? '#10B981'
                        : '#EAB308',
                    }}>
                      {selectedDetailOrder.status}
                    </Text>
                  </View>
                </View>

                {/* Section: Customer Info */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.accentGold }]}>Customer Details</Text>
                  <View style={[styles.modalInvoiceCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    <View style={styles.modalInfoRow}>
                      <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Name:</Text>
                      <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>
                        {selectedDetailOrder.profiles?.full_name || 'Guest Customer'}
                      </Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Phone:</Text>
                      <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>
                        {selectedDetailOrder.profiles?.phone_number || 'N/A'}
                      </Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Delivery Address:</Text>
                      <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '700', marginTop: 2 }}>
                        {selectedDetailOrder.delivery_address}
                      </Text>
                    </View>
                    {selectedDetailOrder.notes ? (
                      <View style={{ marginTop: 8, borderTopWidth: 0.8, borderTopColor: colors.cardBorder, paddingTop: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Instruction Notes:</Text>
                        <Text style={{ fontSize: 12, color: colors.textMain, fontStyle: 'italic', marginTop: 2 }}>
                          "{selectedDetailOrder.notes}"
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Section: Items Billing */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.accentGold }]}>Bill Invoice</Text>
                  <View style={[styles.modalInvoiceCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    {/* Header Row */}
                    <View style={[styles.invoiceItemRow, { borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder, paddingBottom: 6 }]}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub }}>ITEM</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub }}>SUBTOTAL</Text>
                    </View>

                    {/* Items loop */}
                    {selectedDetailOrder.order_items?.map((item, idx) => {
                      const itemSubtotal = item.quantity * item.price_at_order;
                      return (
                        <View key={idx} style={[styles.invoiceItemRow, { marginTop: 8 }]}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '800' }}>
                              {item.menu_items?.name || 'Menu Item'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>
                              ₹{item.price_at_order.toLocaleString()} x {item.quantity}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '800' }}>
                            ₹{itemSubtotal.toLocaleString()}
                          </Text>
                        </View>
                      );
                    })}

                    <View style={[styles.invoiceDivider, { backgroundColor: colors.cardBorder }]} />

                    {/* Subtotal, GST, Delivery Fee, Tips, Total */}
                    {(() => {
                      const subtotal = selectedDetailOrder.order_items?.reduce((sum, item) => sum + (item.quantity * item.price_at_order), 0) || 0;
                      const gst = Math.round(subtotal * 0.05);
                      const deliveryFee = 150;
                      const tip = selectedDetailOrder.tip_amount || 0;
                      const calculatedTotal = subtotal + gst + deliveryFee + tip;
                      
                      return (
                        <>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Subtotal:</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>₹{subtotal.toLocaleString()}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>GST (5%):</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>₹{gst.toLocaleString()}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Delivery Fee:</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>₹{deliveryFee}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Doorstep Tip:</Text>
                            <Text style={[styles.modalInfoValue, { color: colors.statusGreen }]}>+₹{tip.toLocaleString()}</Text>
                          </View>

                          <View style={[styles.invoiceDivider, { backgroundColor: colors.cardBorder }]} />

                          <View style={styles.modalInfoRow}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.textMain }}>Grand Total:</Text>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.accentGold }}>
                              ₹{calculatedTotal.toLocaleString()}
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>

                {/* Section: Rider Information */}
                {selectedDetailOrder.deliveries ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.accentGold }]}>Rider Assignment</Text>
                    <View style={[styles.modalInvoiceCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                      <View style={styles.modalInfoRow}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Rider Name:</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.textMain }]}>
                          {selectedDetailOrder.deliveries.profiles?.full_name || 'Elite Rider Alpha'}
                        </Text>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSub }]}>Delivery Status:</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.statusGreen, textTransform: 'uppercase' }]}>
                          {selectedDetailOrder.deliveries.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setSelectedDetailOrder(null)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={colors.goldGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: '100%', height: '100%', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[styles.modalCloseBtnText, { color: '#000000' }]}>
                      Dismiss Details
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
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
    padding: 16,
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 110,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
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
  queueContainer: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderItems: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  guestName: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemsListing: {
    marginTop: 8,
    paddingLeft: 4,
    gap: 3,
  },
  itemsListingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kitchenText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 4,
    paddingLeft: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: '#D4AF37',
  },
  riderAssignmentText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  statusBanner: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  statusBannerText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '900',
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
    borderRadius: 28,
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
  menuCard: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
    marginBottom: 16,
  },
  menuFormTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  menuFormInput: {
    borderRadius: 12,
    borderWidth: 0.8,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  menuFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  menuFormBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuFormBtnGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuFormBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  menuEditInput: {
    borderRadius: 10,
    borderWidth: 0.8,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  menuActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 0.8,
    paddingBottom: 12,
  },
  modalTitleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalInvoiceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceDivider: {
    height: 0.8,
    marginVertical: 12,
  },
  modalCloseBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
