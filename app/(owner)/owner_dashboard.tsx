import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  FlatList,
  Linking
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import Loader from '../../components/Loader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Home, ShoppingBag, ShieldCheck, Star, Sun, Moon, LogOut, ClipboardList, CheckSquare, CheckCircle, AlertCircle, DollarSign, ChevronDown, X, MessageSquare, Navigation, Camera, Building2, Edit3, Trash2, Plus, MapPin, Phone } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import LocationPickerModal from '../../src/components/LocationPickerModal';


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
  delivery_latitude?: number;
  delivery_longitude?: number;
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

const MENU_CATEGORIES = [
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

export default function OwnerDashboard() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<DBOrder | null>(null);
  const [activeSegment, setActiveSegment] = useState<'orders' | 'reviews' | 'menu' | 'sales' | 'support' | 'riders'>('orders');
  const [customerReviews, setCustomerReviews] = useState<any[]>([]);
  const [salesFilter, setSalesFilter] = useState<'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lifetime'>('lifetime');
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);

  // Branch Management States
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [manageBranchesModalVisible, setManageBranchesModalVisible] = useState(false);
  const [showBranchLocationPicker, setShowBranchLocationPicker] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchLat, setBranchLat] = useState('');
  const [branchLng, setBranchLng] = useState('');
  const [branchImage, setBranchImage] = useState('');

  // Rider Management States
  const [riders, setRiders] = useState<any[]>([]);
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderName, setNewRiderName] = useState('');
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [ridersModalVisible, setRidersModalVisible] = useState(false);
  const [revokeConfirmData, setRevokeConfirmData] = useState<{ id: string; name: string } | null>(null);
  const [customerInfoProfileId, setCustomerInfoProfileId] = useState<string | null>(null);
  const [customerInfoData, setCustomerInfoData] = useState<{ profile: any; orders: any[] } | null>(null);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [selectedChatOrder, setSelectedChatOrder] = useState<any | null>(null);
  const selectedChatOrderRef = useRef<any>(null);
  useEffect(() => {
    selectedChatOrderRef.current = selectedChatOrder;
  }, [selectedChatOrder]);
  const [ownerReplyText, setOwnerReplyText] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const [supportTab, setSupportTab] = useState<'active' | 'resolved'>('active');

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeSegment]);

  useEffect(() => {
    if (!customerInfoProfileId) {
      setCustomerInfoData(null);
      return;
    }
    
    const fetchCustomerDetail = async () => {
      setLoadingCustomerInfo(true);
      try {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', customerInfoProfileId)
          .single();
        if (profErr) throw profErr;

        const { data: orders, error: ordErr } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            tip_amount,
            created_at,
            delivery_address,
            status,
            notes,
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
          .eq('customer_id', customerInfoProfileId)
          .neq('delivery_address', 'SUPPORT_TICKET')
          .order('created_at', { ascending: false });
        if (ordErr) throw ordErr;

        setCustomerInfoData({ profile, orders: orders || [] });
      } catch (err) {
        console.warn('Error fetching customer detail:', err);
        showToast('Error', 'Failed to load customer information.', 'error');
        setCustomerInfoProfileId(null);
      } finally {
        setLoadingCustomerInfo(false);
      }
    };
    
    fetchCustomerDetail();
  }, [customerInfoProfileId]);

  const fetchRiders = async () => {
    setLoadingRiders(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'rider')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setRiders(data || []);
    } catch (e) {
      console.error('Failed to load riders list:', e);
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleAddRider = async () => {
    const rawPhone = newRiderPhone.trim();
    if (rawPhone.length !== 10) {
      showToast('Error', 'Please enter a valid 10-digit phone number', 'error');
      return;
    }
    const formattedPhone = `+91${rawPhone}`;
    setLoadingRiders(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', formattedPhone)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'rider' })
          .eq('id', existingProfile.id);

        if (error) throw error;
        showToast('Success', `Rider access granted to existing user: ${existingProfile.full_name || rawPhone}`, 'success');
      } else {
        const tempId = `temp_rider_${Date.now()}`;
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: tempId,
            phone_number: formattedPhone,
            full_name: 'Pending Rider',
            role: 'rider'
          });

        if (error) throw error;
        showToast('Success', `Rider access provisioned for phone: ${formattedPhone}`, 'success');
      }
      setNewRiderPhone('');
      fetchRiders();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to assign rider role', 'error');
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleRevokeRider = (id: string, name: string) => {
    setRevokeConfirmData({ id, name });
  };

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

  // Menu Customization States
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Veg Starter');
  const [addingItem, setAddingItem] = useState(false);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('All');
  const [selectedMenuAvailability, setSelectedMenuAvailability] = useState<'All' | 'Available' | 'Unavailable'>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

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
    statusRed: '#EF4444',
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

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setBranches(data || []);
    } catch (e: any) {
      showToast('Error', 'Failed to load branches: ' + e.message, 'error');
    } finally {
      setLoadingBranches(false);
    }
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
          delivery_latitude,
          delivery_longitude,
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
      const normalOrders = formatted.filter((o: any) => o.delivery_address !== 'SUPPORT_TICKET');
      setOrders(normalOrders);

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
      
      fetchSupportChats();
    } catch (e) {
      console.error('Failed to load operations data in Owner Dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportChats = async () => {
    try {
      setLoadingSupport(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          notes,
          updated_at,
          status,
          profiles (
            full_name,
            phone_number
          )
        `)
        .eq('delivery_address', 'SUPPORT_TICKET')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((order: any) => ({
        ...order,
        profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
      }));

      setSupportChats(formatted);

      if (selectedChatOrderRef.current) {
        const current = formatted.find(c => c.id === selectedChatOrderRef.current.id);
        if (current) {
          setSelectedChatOrder(current);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch support chats:", e);
    } finally {
      setLoadingSupport(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const rawList = data || [];
      const seenNames = new Set<string>();
      const loaded: any[] = [];
      rawList.forEach((item: any) => {
        const lowerName = item.name.trim().toLowerCase();
        if (!seenNames.has(lowerName)) {
          seenNames.add(lowerName);
          loaded.push(item);
        }
      });

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
    const localItem = menuItems.find(item => item.id === id);
    if (!localItem) return;

    try {
      // Update item across all locations with the same name
      const { error } = await supabase
        .from('menu_items')
        .update(updatedFields)
        .eq('name', localItem.name);

      if (error) throw error;
      Alert.alert('Success', 'Menu item updated successfully across all branches.');
      fetchMenuItems();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    const localItem = menuItems.find(item => item.id === id);
    if (!localItem) return;

    try {
      // Delete item across all locations with the same name
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('name', localItem.name);

      if (error) throw error;
      Alert.alert('Success', 'Menu item deleted successfully across all branches.');
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

      // Fetch all branches
      const { data: branchesData, error: branchesErr } = await supabase
        .from('branches')
        .select('id');
        
      if (branchesErr) throw branchesErr;
      
      const insertRows = (branchesData || []).map((branch: any) => ({
        branch_id: branch.id,
        name: newItemName.trim(),
        description: newItemDesc.trim(),
        price: priceNum,
        category: newItemCategory,
        image_url: newItemImage.trim() || null,
        is_available: true
      }));

      const { error } = await supabase
        .from('menu_items')
        .insert(insertRows);

      if (error) throw error;

      Alert.alert('Success', 'New menu item added to all branches!');
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

  // Pick an image from device gallery and return base64 data URI
  const pickImage = async (target: 'new' | string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant gallery access to upload menu images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        const dataUri = `data:${mimeType};base64,${result.assets[0].base64}`;
        
        if (target === 'new') {
          setNewItemImage(dataUri);
        } else if (target === 'branch') {
          setBranchImage(dataUri);
        } else {
          setEditImages(prev => ({ ...prev, [target]: dataUri }));
        }
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not pick image.');
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
    await AsyncStorage.removeItem('user_selected_role');
    await AsyncStorage.removeItem('vip_session_active');
    router.replace('/(auth)/login');
  };

  // Status-based stats calculation
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeDeliveriesCount = orders.filter(o => ['ready_for_pickup', 'out_for_delivery'].includes(o.status)).length;
  const activeSupportCount = supportChats.filter(c => c.status === 'cancelled').length;

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
            <TouchableOpacity 
              onPress={() => {
                fetchBranches();
                setManageBranchesModalVisible(true);
              }} 
              style={[styles.headerButton, { borderColor: colors.cardBorder }]} 
              activeOpacity={0.7}
            >
              <Building2 size={15} color={colors.accentGold} />
            </TouchableOpacity>

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

      <ScrollView ref={mainScrollRef} contentContainerStyle={styles.contentContainer}>
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

        {/* Shortcut to Manage Rider Staff - Home screen only */}
        {(activeSegment === 'orders' || activeSegment === 'reviews') && (
          <TouchableOpacity 
            onPress={() => {
              setRidersModalVisible(true);
              fetchRiders();
            }}
            activeOpacity={0.85}
            style={{
              marginBottom: 16,
              borderRadius: 20,
              borderWidth: 0.8,
              borderColor: colors.cardBorder,
              backgroundColor: colors.cardBg,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <User size={18} color={colors.accentGold} />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Manage Rider Registry</Text>
                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>Assign roles & revoke rider privileges</Text>
              </View>
            </View>
            <ChevronDown size={16} color={colors.accentGold} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
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
                {orders.map((order, index) => {
                  const guestName = order.profiles?.full_name || 'Guest Customer';
                  const elapsedMins = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const timeLabel = elapsedMins <= 0 ? 'Just now' : `${elapsedMins}m ago`;
                  
                  const itemsCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const priceLabel = `₹${parseFloat(order.total_amount as any).toLocaleString()}`;
                  
                  return (
                    <AnimatedEntrance key={order.id} delay={index * 80}>
                      <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
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

                          {order.delivery_latitude && order.delivery_longitude ? (
                            <TouchableOpacity 
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                marginTop: 6,
                                marginBottom: 4,
                                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                                borderColor: colors.accentGold,
                                borderWidth: 0.8,
                                alignSelf: 'flex-start'
                              }}
                              onPress={() => handleOpenMap(order.delivery_latitude, order.delivery_longitude)}
                              activeOpacity={0.8}
                            >
                              <Navigation size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                              <Text style={{ color: colors.accentGold, fontSize: 10, fontWeight: '800' }}>
                                View Map Location
                              </Text>
                            </TouchableOpacity>
                          ) : null}

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
                    </AnimatedEntrance>
                  );
                })}
              </View>
            )}
          </>
        ) : activeSegment === 'support' ? (
          // ================= SUPPORT HELPDESK TAB =================
          <>
            <View style={styles.listHeaderRow}>
              <View style={styles.listHeaderLeft}>
                <Text style={[styles.listHeaderTitle, { color: colors.accentGold }]}>HELPDESK</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.accentGold }]} />
              </View>
              <Text style={[styles.realtimeText, { color: colors.textSub }]}>Live Support Chats</Text>
            </View>

            <View style={[styles.segmentContainer, { marginBottom: 12, marginTop: 4 }]}>
              <TouchableOpacity 
                style={[styles.segmentBtn, supportTab === 'active' && styles.segmentBtnActive, { borderColor: colors.cardBorder }]}
                onPress={() => setSupportTab('active')}
              >
                <Text style={[styles.segmentBtnText, { color: supportTab === 'active' ? colors.bg : colors.textMain }]}>Active Chats</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, supportTab === 'resolved' && styles.segmentBtnActive, { borderColor: colors.cardBorder }]}
                onPress={() => setSupportTab('resolved')}
              >
                <Text style={[styles.segmentBtnText, { color: supportTab === 'resolved' ? colors.bg : colors.textMain }]}>Resolved History</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginTop: 8 }}>
              {(() => {
                const filtered = supportChats.filter(c => {
                  if (supportTab === 'active') return c.status === 'cancelled';
                  return c.status === 'delivered';
                });

                if (filtered.length === 0) {
                  return (
                    <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, alignItems: 'center', padding: 30 }]}>
                      <MessageSquare size={32} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                      <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800' }}>
                        {supportTab === 'active' ? 'No Active Chats' : 'No Resolved History'}
                      </Text>
                      <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                        {supportTab === 'active' 
                          ? 'No customer has an active support chat open.' 
                          : 'No resolved support chats found.'}
                      </Text>
                    </View>
                  );
                }

                return filtered.map((chat, idx) => {
                  let parsedMsgs = [];
                  try { parsedMsgs = JSON.parse(chat.notes); } catch (e) {}
                  const lastMsg = parsedMsgs[parsedMsgs.length - 1];
                  const unreadCount = parsedMsgs.filter((m: any) => m.sender === 'customer').length;

                  return (
                    <AnimatedEntrance key={chat.id} delay={idx * 60}>
                      <TouchableOpacity
                        style={[
                          styles.orderCard, 
                          { 
                            backgroundColor: colors.cardBg, 
                            borderColor: selectedChatOrder?.id === chat.id ? colors.accentGold : colors.cardBorder,
                            padding: 16 
                          }
                        ]}
                        onPress={() => {
                          setSelectedChatOrder(chat);
                          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textMain }}>
                              {chat.profiles?.full_name || 'Guest Customer'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 4 }} numberOfLines={1}>
                              {lastMsg ? `${lastMsg.sender === 'customer' ? 'Customer' : 'Owner'}: ${lastMsg.text}` : 'No messages'}
                            </Text>
                          </View>
                          
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={{ fontSize: 9, color: colors.textSub }}>
                              {lastMsg ? lastMsg.time : ''}
                            </Text>
                            {chat.status === 'cancelled' && unreadCount > 0 && (
                              <View style={{ backgroundColor: colors.accentGold, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: '#000000', fontSize: 9, fontWeight: '900' }}>Active</Text>
                              </View>
                            )}
                            {chat.status === 'delivered' && (
                              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 0.5, borderColor: '#10B981' }}>
                                <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '900' }}>Resolved</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </AnimatedEntrance>
                  );
                });
              })()}
            </View>
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
                  <AnimatedEntrance key={review.orderId || idx} delay={idx * 80}>
                    <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
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
                  </AnimatedEntrance>
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
                  {MENU_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        newItemCategory === cat && { backgroundColor: colors.accentGold }
                      ]}
                      onPress={() => setNewItemCategory(cat)}
                    >
                      <Text style={[styles.catPillText, { color: newItemCategory === cat ? '#000000' : colors.textMain }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity 
                style={[styles.menuFormInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                onPress={() => pickImage('new')}
                activeOpacity={0.7}
              >
                <Camera size={16} color={colors.accentGold} />
                <Text style={{ color: newItemImage ? colors.textMain : '#8E8E93', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {newItemImage ? 'Image Selected ✓' : 'Upload Image from Device'}
                </Text>
                {newItemImage ? (
                  <Image source={{ uri: newItemImage }} style={{ width: 28, height: 28, borderRadius: 6 }} resizeMode="cover" />
                ) : null}
              </TouchableOpacity>

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

            {/* Menu Search Bar */}
            <View style={{ marginBottom: 12 }}>
              <TextInput 
                style={[styles.menuFormInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain, marginBottom: 0 }]}
                value={menuSearchQuery}
                onChangeText={setMenuSearchQuery}
                placeholder="Search menu items..."
                placeholderTextColor="#8E8E93"
              />
            </View>

            {/* Category Filter for browsing */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {['All', ...MENU_CATEGORIES].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPill,
                      selectedMenuCategory === cat && { backgroundColor: colors.accentGold }
                    ]}
                    onPress={() => setSelectedMenuCategory(cat)}
                  >
                    <Text style={[styles.catPillText, { color: selectedMenuCategory === cat ? '#000000' : colors.textMain }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Availability Filter pills */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['All', 'Available', 'Unavailable'] as const).map((status) => {
                const isActive = selectedMenuAvailability === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.catPill,
                      isActive && { backgroundColor: colors.accentGold }
                    ]}
                    onPress={() => setSelectedMenuAvailability(status)}
                  >
                    <Text style={[styles.catPillText, { color: isActive ? '#000000' : colors.textMain, fontSize: 10 }]}>
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Existing Menu Items list */}
            <View style={{ gap: 16, marginTop: 12 }}>
              {menuItems.length === 0 ? (
                <Loader />
              ) : (
                menuItems
                  .filter(item => {
                    const matchesCategory = selectedMenuCategory === 'All' || item.category === selectedMenuCategory;
                    
                    const isAvail = editAvail[item.id] !== undefined ? editAvail[item.id] : (item.is_available !== false);
                    const matchesAvailability = selectedMenuAvailability === 'All' ||
                      (selectedMenuAvailability === 'Available' && isAvail) ||
                      (selectedMenuAvailability === 'Unavailable' && !isAvail);
                      
                    const matchesSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
                      (item.description && item.description.toLowerCase().includes(menuSearchQuery.toLowerCase()));
                      
                    return matchesCategory && matchesAvailability && matchesSearch;
                  })
                  .map((item, index) => {
                  const currentPrice = editPrices[item.id] || '';
                  const currentDesc = editDescs[item.id] || '';
                  const currentAvail = editAvail[item.id] !== undefined ? editAvail[item.id] : true;
                  const currentImage = editImages[item.id] || '';

                  return (
                    <AnimatedEntrance key={item.id} delay={index * 80}>
                      <View 
                        style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} 
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
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, width: 70 }}>Image:</Text>
                            <TouchableOpacity
                              style={[styles.menuEditInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                              onPress={() => pickImage(item.id)}
                              activeOpacity={0.7}
                            >
                              <Camera size={13} color={colors.accentGold} />
                              <Text style={{ color: currentImage ? colors.textMain : '#8E8E93', fontSize: 11, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                                {currentImage ? 'Image Set ✓' : 'Upload'}
                              </Text>
                              {currentImage ? (
                                <Image source={{ uri: currentImage }} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="cover" />
                              ) : null}
                            </TouchableOpacity>
                          </View>

                          {/* Availability row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub }}>Available for ordering</Text>
                            <Switch 
                              value={currentAvail}
                              onValueChange={(val) => setEditAvail(prev => ({ ...prev, [item.id]: val }))}
                              trackColor={{ 
                                false: isDark ? '#3E3E3E' : '#CBD5E1', 
                                true: '#10B981' 
                              }}
                              thumbColor={currentAvail ? '#FFFFFF' : (isDark ? '#A1A1AA' : '#F4F4F5')}
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
                    </AnimatedEntrance>
                  );
                })
              )}
            </View>
          </>
        ) : activeSegment === 'sales' ? (
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
                filteredCompletedOrders.map((order, index) => {
                  const dateStr = new Date(order.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const orderName = order.profiles?.full_name || 'Guest Guest';

                  return (
                    <AnimatedEntrance key={order.id} delay={index * 80}>
                      <View 
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
                    </AnimatedEntrance>
                  );
                })
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

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
          style={getTabStyle(activeSegment === 'orders' || activeSegment === 'reviews')} 
          onPress={() => setActiveSegment('orders')}
        >
          <View style={{ position: 'relative' }}>
            <Home size={18} color={activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub} />
            {pendingCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: colors.statusRed,
                borderRadius: 9,
                minWidth: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
                borderWidth: 1,
                borderColor: colors.bg
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabText, { color: activeSegment === 'orders' || activeSegment === 'reviews' ? colors.accentGold : colors.textSub, marginTop: 2 }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={getTabStyle(activeSegment === 'support')} 
          onPress={() => {
            setActiveSegment('support');
            fetchSupportChats();
          }}
        >
          <View style={{ position: 'relative' }}>
            <MessageSquare size={18} color={activeSegment === 'support' ? colors.accentGold : colors.textSub} />
            {activeSupportCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: colors.statusRed,
                borderRadius: 9,
                minWidth: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
                borderWidth: 1,
                borderColor: colors.bg
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>
                  {activeSupportCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabText, { color: activeSegment === 'support' ? colors.accentGold : colors.textSub, marginTop: 2 }]}>Support</Text>
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

      {/* Manage Branches Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={manageBranchesModalVisible}
        onRequestClose={() => setManageBranchesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              {
                width: '95%',
                height: '85%',
                maxHeight: 700,
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                padding: 20,
                borderRadius: 24,
                borderWidth: 1,
              }
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={22} color={colors.accentGold} />
                <Text style={{ color: colors.accentGold, fontSize: 18, fontWeight: '800' }}>
                  MANAGE BRANCHES
                </Text>
              </View>
              <TouchableOpacity onPress={() => setManageBranchesModalVisible(false)}>
                <X size={22} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            {/* Premium Add Branch button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setEditingBranch(null);
                setBranchName('');
                setBranchAddress('');
                setBranchPhone('');
                setBranchLat('');
                setBranchLng('');
                setBranchImage('');
                setBranchModalVisible(true);
              }}
              style={{
                marginBottom: 16,
              }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Plus size={16} color="#000000" strokeWidth={3} />
                <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                  ADD NEW BRANCH
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {loadingBranches ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={colors.accentGold} size="large" />
              </View>
            ) : branches.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={48} color={colors.textSub} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 14 }}>No Branches Found</Text>
              </View>
            ) : (
              <FlatList
                data={branches}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ gap: 14, paddingBottom: 20 }}
                renderItem={({ item: branch }: { item: any }) => (
                  <View
                    style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginBottom: 0, padding: 16 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textMain }}>
                        {branch.name}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                        <MapPin size={13} color={colors.accentGold} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 12, color: colors.textSub, flex: 1, lineHeight: 16 }}>
                          {branch.address}
                        </Text>
                      </View>

                      {branch.phone_number ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <Phone size={13} color={colors.accentGold} />
                          <Text style={{ fontSize: 12, color: colors.textSub }}>
                            {branch.phone_number}
                          </Text>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Navigation size={10} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'} />
                        <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
                          GPS: {branch.latitude}, {branch.longitude}
                        </Text>
                      </View>
                    </View>

                    {/* Premium Action Row */}
                    <View style={{ 
                      flexDirection: 'row', 
                      gap: 10, 
                      marginTop: 14, 
                      borderTopWidth: 0.8, 
                      borderTopColor: colors.cardBorder, 
                      paddingTop: 12, 
                      justifyContent: 'flex-end', 
                      alignItems: 'center' 
                    }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={async () => {
                          try {
                            const nextActive = !branch.is_active;
                            const { error } = await supabase
                              .from('branches')
                              .update({ is_active: nextActive })
                              .eq('id', branch.id);
                            if (error) throw error;
                            showToast('Success', `${branch.name} status updated!`, 'success');
                            fetchBranches();
                          } catch (e: any) {
                            showToast('Error', 'Failed to toggle branch status: ' + e.message, 'error');
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: branch.is_active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          borderWidth: 0.8,
                          borderColor: branch.is_active ? '#10B981' : '#EF4444',
                        }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: branch.is_active ? '#10B981' : '#EF4444' }} />
                        <Text style={{ color: branch.is_active ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                          {branch.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setEditingBranch(branch);
                          setBranchName(branch.name);
                          setBranchAddress(branch.address);
                          setBranchPhone(branch.phone_number || '');
                          setBranchLat(String(branch.latitude));
                          setBranchLng(String(branch.longitude));
                          setBranchImage(branch.image_url || '');
                          setBranchModalVisible(true);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: 'rgba(212, 175, 55, 0.06)',
                          borderWidth: 0.8,
                          borderColor: 'rgba(212, 175, 55, 0.4)',
                        }}
                      >
                        <Edit3 size={11} color={colors.accentGold} />
                        <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                          EDIT
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          Alert.alert(
                            'Delete Branch',
                            `Are you sure you want to delete ${branch.name}? This will permanently remove it from the system.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('branches')
                                      .delete()
                                      .eq('id', branch.id);
                                    if (error) throw error;
                                    showToast('Deleted', `${branch.name} deleted successfully!`, 'success');
                                    fetchBranches();
                                  } catch (e: any) {
                                    showToast('Error', 'Failed to delete branch: ' + e.message, 'error');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: 'rgba(239, 68, 68, 0.06)',
                          borderWidth: 0.8,
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        <Trash2 size={11} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                          DELETE
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </BlurView>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={branchModalVisible}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              {
                width: '90%',
                maxWidth: 400,
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                padding: 24,
                borderRadius: 24,
                borderWidth: 1,
              }
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: colors.accentGold, fontSize: 18, fontWeight: '800' }}>
                {editingBranch ? 'EDIT BRANCH DETAILS' : 'ADD NEW BRANCH'}
              </Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <X size={20} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>BRANCH NAME</Text>
                <TextInput
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    color: colors.textMain,
                    fontSize: 13,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>ADDRESS</Text>
                <TextInput
                  value={branchAddress}
                  onChangeText={setBranchAddress}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    color: colors.textMain,
                    fontSize: 13,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>PHONE NUMBER</Text>
                <TextInput
                  value={branchPhone}
                  onChangeText={setBranchPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    color: colors.textMain,
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Photo Upload Section */}
              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>BRANCH PHOTO</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => pickImage('branch')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 48,
                    marginBottom: 6
                  }}
                >
                  <Text style={{ color: branchImage ? colors.textMain : '#8E8E93', fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                    {branchImage ? 'Photo Selected ✓' : 'Upload Photo from Device'}
                  </Text>
                  {branchImage ? (
                    <Image source={{ uri: branchImage }} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="cover" />
                  ) : (
                    <Camera size={18} color={colors.accentGold} />
                  )}
                </TouchableOpacity>
                {branchImage ? (
                  <TouchableOpacity
                    onPress={() => setBranchImage('')}
                    style={{ alignSelf: 'flex-end', marginTop: 2 }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>REMOVE PHOTO</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>LOCATION (GPS COORDINATES)</Text>
                {branchLat && branchLng ? (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 0.8,
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 48
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={colors.accentGold} />
                      <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '600' }}>
                        {parseFloat(branchLat).toFixed(4)}, {parseFloat(branchLng).toFixed(4)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowBranchLocationPicker(true)}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.15)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '800' }}>CHANGE PIN</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowBranchLocationPicker(true)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      borderWidth: 0.8,
                      borderColor: colors.accentGold,
                      borderRadius: 10,
                      height: 48
                    }}
                  >
                    <MapPin size={16} color={colors.accentGold} />
                    <Text style={{ color: colors.accentGold, fontSize: 13, fontWeight: '800' }}>
                      PIN LOCATION ON MAP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={async () => {
                  if (!branchName.trim() || !branchAddress.trim() || !branchLat.trim() || !branchLng.trim()) {
                    showToast('Error', 'Please fill all fields', 'error');
                    return;
                  }
                  try {
                    if (editingBranch) {
                      const { error } = await supabase
                        .from('branches')
                        .update({
                          name: branchName.trim(),
                          address: branchAddress.trim(),
                          phone_number: branchPhone.trim() || null,
                          latitude: parseFloat(branchLat),
                          longitude: parseFloat(branchLng),
                          image_url: branchImage.trim() || null,
                        })
                        .eq('id', editingBranch.id);

                      if (error) throw error;
                      showToast('Success', 'Branch updated successfully!', 'success');
                    } else {
                      const { error } = await supabase
                        .from('branches')
                        .insert({
                          name: branchName.trim(),
                          address: branchAddress.trim(),
                          phone_number: branchPhone.trim() || null,
                          latitude: parseFloat(branchLat),
                          longitude: parseFloat(branchLng),
                          image_url: branchImage.trim() || null,
                          is_active: true,
                        });

                      if (error) throw error;
                      showToast('Success', 'Branch created successfully!', 'success');
                    }
                    setBranchModalVisible(false);
                    fetchBranches();
                  } catch (e: any) {
                    showToast('Error', 'Failed to save branch: ' + e.message, 'error');
                  }
                }}
                activeOpacity={0.85}
                style={{ marginTop: 10 }}
              >
                <LinearGradient
                  colors={colors.goldGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#000000', fontWeight: '800', fontSize: 14 }}>
                    {editingBranch ? 'SAVE CHANGES' : 'CREATE BRANCH'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Location Picker Modal for Owners to pin branches */}
      <LocationPickerModal
        visible={showBranchLocationPicker}
        onClose={() => setShowBranchLocationPicker(false)}
        isBranchMode={true}
        onAddressSaved={(addressDetails) => {
          setBranchAddress(addressDetails.address);
          setBranchLat(String(addressDetails.latitude));
          setBranchLng(String(addressDetails.longitude));
          setShowBranchLocationPicker(false);
        }}
      />

      {/* Rider privileges directory modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ridersModalVisible}
        onRequestClose={() => setRidersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder, paddingBottom: 12 }]}>
              <Text style={[styles.modalTitleText, { color: colors.accentGold }]}>
                Rider Staffing Registry
              </Text>
              <TouchableOpacity onPress={() => setRidersModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', marginTop: 12 }}>
              <View style={[styles.menuCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                <Text style={[styles.menuFormTitle, { color: colors.accentGold, marginBottom: 12 }]}>ASSIGN NEW RIDER ROLE</Text>
                
                <View style={{ gap: 10 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSub, marginBottom: 6 }}>
                      PHONE NUMBER
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' }}>
                      <View style={{
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        borderRadius: 10,
                        height: 44,
                        paddingHorizontal: 12,
                        justifyContent: 'center',
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>IN +91</Text>
                      </View>
                      <TextInput 
                        style={[styles.menuFormInput, { flex: 1, minWidth: 0, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.textMain, marginBottom: 0, height: 44 }]}
                        value={newRiderPhone}
                        onChangeText={(val) => setNewRiderPhone(val.replace(/\D/g, ''))}
                        placeholder="e.g. 9876543210..."
                        placeholderTextColor="#8E8E93"
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>
                  </View>

                  {/* Rider Name input removed */}
                  <TouchableOpacity 
                    onPress={handleAddRider}
                    disabled={loadingRiders}
                    activeOpacity={0.8}
                    style={{ marginTop: 6 }}
                  >
                    <LinearGradient
                      colors={colors.goldGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {loadingRiders ? (
                        <ActivityIndicator color="#000000" size="small" />
                      ) : (
                        <Text style={{ color: '#000000', fontSize: 13, fontWeight: '900' }}>
                          Assign Rider Access
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.menuFormTitle, { color: colors.accentGold, marginTop: 12, marginBottom: 8 }]}>
                ACTIVE RIDERS DIRECTORY
              </Text>
              
              <View style={{ gap: 12, paddingBottom: 32 }}>
                {loadingRiders && riders.length === 0 ? (
                  <View style={{ height: 80, justifyContent: 'center' }}>
                    <Loader />
                  </View>
                ) : riders.length === 0 ? (
                  <View style={[styles.menuCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, alignItems: 'center', padding: 30 }]}>
                    <User size={30} color={colors.textSub} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }}>No Riders Assigned</Text>
                    <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                      Assign a phone number as a rider above. They will get custom rider view options upon login.
                    </Text>
                  </View>
                ) : (
                  riders.map((rider, index) => (
                    <AnimatedEntrance key={rider.id} delay={index * 60}>
                      <View 
                        style={[styles.menuCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}
                      >
                        <View style={{ gap: 2, flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>
                            {rider.full_name || 'Rider Staff'}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSub }}>
                            {rider.phone_number || 'N/A'}
                          </Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={{
                            borderColor: '#EF4444',
                            borderWidth: 0.8,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={() => handleRevokeRider(rider.id, rider.full_name || rider.phone_number)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>
                            Revoke Access
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </AnimatedEntrance>
                  ))
                )}
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Rider Revoke Confirmation Card Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={revokeConfirmData !== null}
        onRequestClose={() => setRevokeConfirmData(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              {
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(20, 20, 16, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                padding: 24,
                borderRadius: 24,
                width: '85%',
                maxWidth: 340,
                alignItems: 'center',
                borderWidth: 1,
              }
            ]}
          >
            <LottieView
              source={require('../../assets/images/wrong.lottie')}
              autoPlay
              loop={false}
              style={{ width: 100, height: 100, marginBottom: 12 }}
            />
            
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
              Revoke Rider Access?
            </Text>
            
            <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
              Are you sure you want to revoke rider privileges for <Text style={{ color: colors.accentGold, fontWeight: '700' }}>{revokeConfirmData?.name}</Text>?
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.inputBg,
                }}
                onPress={() => setRevokeConfirmData(null)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (!revokeConfirmData) return;
                  const targetId = revokeConfirmData.id;
                  setRevokeConfirmData(null);
                  try {
                    const { error } = await supabase
                      .from('profiles')
                      .update({ role: 'customer' })
                      .eq('id', targetId);

                    if (error) throw error;
                    showToast('Success', 'Rider privileges revoked.', 'success');
                    fetchRiders();
                  } catch (e: any) {
                    showToast('Error', e.message || 'Failed to revoke rider role', 'error');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>Revoke</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Customer Profile Info Modal */}


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
                      {selectedDetailOrder.delivery_latitude && selectedDetailOrder.delivery_longitude ? (
                        <TouchableOpacity 
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            marginTop: 10,
                            backgroundColor: 'rgba(212, 175, 55, 0.05)',
                            borderColor: colors.accentGold,
                            borderWidth: 1
                          }}
                          onPress={() => handleOpenMap(selectedDetailOrder.delivery_latitude, selectedDetailOrder.delivery_longitude)}
                          activeOpacity={0.8}
                        >
                          <Navigation size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
                          <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '800' }}>
                            Open Navigation / Google Maps
                          </Text>
                        </TouchableOpacity>
                      ) : null}
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

      {/* Live Support Chat Modal for Owner */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedChatOrder !== null}
        onRequestClose={() => setSelectedChatOrder(null)}
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
                maxHeight: '88%',
                paddingHorizontal: 20
              }
            ]}
          >
            {selectedChatOrder && (() => {
              const chat = selectedChatOrder;
              let parsedMsgs = [];
              try { parsedMsgs = JSON.parse(chat.notes); } catch (e) {}

              const handleSendOwnerReply = async () => {
                if (!ownerReplyText.trim()) return;
                const text = ownerReplyText.trim();
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const replyObj = {
                  id: `reply_${Date.now()}`,
                  sender: 'owner',
                  text: text,
                  time: timeStr
                };

                const updated = [...parsedMsgs, replyObj];
                setOwnerReplyText('');

                try {
                  const { error } = await supabase
                    .from('orders')
                    .update({ notes: JSON.stringify(updated) })
                    .eq('id', chat.id);

                  if (error) throw error;
                  
                  setSelectedChatOrder({
                    ...chat,
                    notes: JSON.stringify(updated)
                  });
                  
                  fetchSupportChats();
                  setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
                } catch (e) {
                  console.warn("Failed to send owner support reply:", e);
                }
              };

              return (
                <View style={{ width: '100%', flex: 1 }}>
                  <View style={{ borderBottomWidth: 0.8, borderBottomColor: colors.cardBorder, paddingBottom: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: colors.accentGold, letterSpacing: 1.5, textTransform: 'uppercase' }}>operations support</Text>
                      <TouchableOpacity onPress={() => setSelectedChatOrder(null)} style={{ padding: 4 }}>
                        <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '800' }}>Close</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (chat.customer_id) {
                            setCustomerInfoProfileId(chat.customer_id);
                          } else {
                            showToast('Error', 'Customer profile ID not found.', 'error');
                          }
                        }}
                        style={{ flex: 1 }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accentGold, textDecorationLine: 'underline' }} numberOfLines={1}>
                          Chat with: {chat.profiles?.full_name || 'Guest Customer'}
                        </Text>
                      </TouchableOpacity>
                      {chat.status === 'cancelled' && (
                        <TouchableOpacity 
                          onPress={async () => {
                            let parsed = [];
                            try { parsed = JSON.parse(chat.notes); } catch (e) {}
                            const closingMsg = {
                              id: `resolve_${Date.now()}`,
                              sender: 'owner',
                              text: '✅ This support session has been closed and resolved by the Owner.',
                              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            const updated = [...parsed, closingMsg];
                            try {
                              const { error } = await supabase
                                .from('orders')
                                .update({ 
                                  status: 'delivered',
                                  notes: JSON.stringify(updated)
                                })
                                .eq('id', chat.id);
                              if (error) throw error;
                              setSelectedChatOrder(null);
                              fetchSupportChats();
                            } catch (e) {
                              console.warn(e);
                            }
                          }}
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#10B981' }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>Resolve Chat</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <ScrollView
                    ref={chatScrollRef}
                    style={{ flex: 1, marginVertical: 12 }}
                    contentContainerStyle={{ gap: 12, paddingBottom: 16, paddingHorizontal: 16 }}
                    onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                  >
                    {parsedMsgs.map((msg: any) => {
                      const isOwner = msg.sender === 'owner' || msg.sender === 'concierge';
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageContainer,
                            isOwner ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start', alignItems: 'flex-start' }
                          ]}
                        >
                          <View
                            style={[
                              styles.messageBubble,
                              isOwner
                                ? { backgroundColor: colors.accentGold, borderBottomRightRadius: 4 }
                                : { backgroundColor: colors.inputBg, borderBottomLeftRadius: 4, borderColor: colors.cardBorder, borderWidth: 1 }
                            ]}
                          >
                            <Text style={{ color: isOwner ? '#000000' : colors.textMain, fontSize: 12, fontWeight: '600' }}>
                              {msg.text}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 8, color: colors.textSub, marginTop: 2 }}>{msg.time}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {chat.status === 'cancelled' ? (
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 12, borderTopWidth: 0.8, borderTopColor: colors.cardBorder, alignItems: 'center' }}>
                      <TextInput
                        style={{ 
                          flex: 1, 
                          height: 42, 
                          borderRadius: 12, 
                          borderWidth: 0.8, 
                          borderColor: colors.cardBorder, 
                          backgroundColor: colors.inputBg, 
                          color: colors.textMain, 
                          paddingHorizontal: 12,
                          fontSize: 12
                        }}
                        placeholder="Type reply to customer..."
                        placeholderTextColor={colors.textSub}
                        value={ownerReplyText}
                        onChangeText={setOwnerReplyText}
                        onSubmitEditing={handleSendOwnerReply}
                      />
                      <TouchableOpacity 
                        onPress={handleSendOwnerReply}
                        style={{ 
                          height: 42, 
                          width: 70, 
                          backgroundColor: colors.accentGold, 
                          borderRadius: 12, 
                          justifyContent: 'center', 
                          alignItems: 'center' 
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 14, borderTopWidth: 0.8, borderTopColor: colors.cardBorder, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '800' }}>
                        🔒 This support session was resolved and closed.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </BlurView>
        </View>
      </Modal>

      {/* Customer Profile Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customerInfoProfileId !== null}
        onRequestClose={() => setCustomerInfoProfileId(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.modalContent,
              {
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(15, 15, 12, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                maxHeight: '90%',
                width: '95%',
                maxWidth: 480,
              }
            ]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder, paddingBottom: 12 }]}>
              <Text style={[styles.modalTitleText, { color: colors.accentGold }]}>
                CUSTOMER PROFILE
              </Text>
              <TouchableOpacity onPress={() => setCustomerInfoProfileId(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {loadingCustomerInfo ? (
              <View style={{ flex: 1, height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={colors.accentGold} size="large" />
                <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 12 }}>Loading customer profile...</Text>
              </View>
            ) : customerInfoData ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                {/* Profile Details Card */}
                <View style={[styles.menuCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, padding: 16, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <User size={22} color={colors.accentGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>
                        {customerInfoData.profile?.full_name || 'Guest Customer'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                        {customerInfoData.profile?.phone_number || 'No Phone Number'}
                      </Text>
                    </View>
                  </View>

                  {/* Registered Addresses Section */}
                  <View style={{ borderTopWidth: 0.5, borderTopColor: colors.cardBorder, paddingTop: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accentGold, letterSpacing: 1, marginBottom: 6 }}>
                      DELIVERY ADDRESSES
                    </Text>
                    {Array.from(new Set(customerInfoData.orders.map(o => o.delivery_address).filter(a => a && a !== 'SUPPORT_TICKET'))).length === 0 ? (
                      <Text style={{ fontSize: 11, color: colors.textSub, fontStyle: 'italic' }}>No registered delivery addresses found.</Text>
                    ) : (
                      Array.from(new Set(customerInfoData.orders.map(o => o.delivery_address).filter(a => a && a !== 'SUPPORT_TICKET'))).map((addr: any, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
                          <Text style={{ color: colors.accentGold, fontSize: 12 }}>•</Text>
                          <Text style={{ fontSize: 11, color: colors.textSub, flex: 1, lineHeight: 15 }}>{addr}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* History Section Header */}
                <Text style={{ fontSize: 12, fontWeight: '900', color: colors.textMain, marginBottom: 8, letterSpacing: 0.5 }}>
                  ORDER HISTORY ({customerInfoData.orders.length})
                </Text>

                {customerInfoData.orders.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSub, fontSize: 12, fontStyle: 'italic' }}>No orders placed yet.</Text>
                  </View>
                ) : (
                  customerInfoData.orders.map((order: any) => {
                    const riderName = order.deliveries?.[0]?.profiles?.full_name || 'Not Dispatched';
                    const formattedDate = new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <View 
                        key={order.id} 
                        style={[
                          styles.menuCard, 
                          { 
                            backgroundColor: colors.inputBg, 
                            borderColor: colors.cardBorder, 
                            padding: 12, 
                            marginBottom: 10 
                          }
                        ]}
                      >
                        {/* Order ID & Status */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMain }}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <View style={{ 
                            paddingHorizontal: 8, 
                            paddingVertical: 2, 
                            borderRadius: 6, 
                            backgroundColor: order.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)' 
                          }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: order.status === 'completed' ? '#10B981' : order.status === 'cancelled' ? '#EF4444' : '#EAB308', textTransform: 'uppercase' }}>
                              {order.status}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 10, color: colors.textSub, marginBottom: 8 }}>
                          Placed on {formattedDate}
                        </Text>

                        {/* Order Items */}
                        <View style={{ backgroundColor: colors.cardBg, borderRadius: 8, padding: 8, gap: 4, marginBottom: 8 }}>
                          {(order.order_items || []).map((item: any, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: colors.textMain, fontWeight: '600' }}>
                                {item.menu_items?.name || 'Menu Item'}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSub }}>
                                x{item.quantity}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Financials & Rider Details */}
                        <View style={{ borderTopWidth: 0.5, borderTopColor: colors.cardBorder, paddingTop: 8, gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 10, color: colors.textSub }}>Delivery Partner:</Text>
                            <Text style={{ fontSize: 10, color: colors.textMain, fontWeight: '700' }}>{riderName}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                            <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>Total Amount:</Text>
                            <Text style={{ fontSize: 11, color: colors.accentGold, fontWeight: '900' }}>
                              ₹{order.total_amount} {order.tip_amount ? `(+ ₹${order.tip_amount} Tip)` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textSub, fontSize: 12, fontStyle: 'italic' }}>No customer details available.</Text>
              </View>
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
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
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
