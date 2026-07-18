import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Platform,
  Switch
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ShoppingBag, User, Sun, Moon, LogOut, ShieldCheck, UserCheck, CheckCircle, AlertCircle, MapPin, Briefcase, Plus, Trash2, Edit, HelpCircle, ChevronRight, Wallet, DollarSign } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import Loader from '../../components/Loader';
import FloatingHeader from '../../components/FloatingHeader';
import LocationPickerModal from '../../src/components/LocationPickerModal';
export default function AccountScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

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
  
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Saved Addresses states
  const [addresses, setAddresses] = useState<{ id: string; label: string; address: string }[]>([]);
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddressText, setNewAddressText] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0.00);
 
  useFocusEffect(
    useCallback(() => {
      const loadWalletBalance = async () => {
        try {
          const balStr = await AsyncStorage.getItem('hotelbet_wallet_balance');
          if (balStr) {
            setWalletBalance(parseFloat(balStr));
          } else {
            setWalletBalance(0.00);
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadWalletBalance();
    }, [])
  );

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    inputBg: isDark ? 'rgba(60, 60, 56, 0.3)' : 'rgba(15, 23, 42, 0.04)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  useEffect(() => {
    fetchProfile();
    loadSavedAddresses();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      let currentUserId = null;
      
      const { data: sbSessionData } = await supabase.auth.getSession();
      currentUserId = sbSessionData?.session?.user?.id;

      if (!currentUserId) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          currentUserId = data?.user?.id;
        } catch (e) {
          console.warn('Anonymous auth failed/disabled, using fallback customer ID', e);
        }
        if (!currentUserId) {
          currentUserId = 'mock-customer-uid-999';
        }
      }

      if (currentUserId) {
        setUserId(currentUserId);
        
        // Fetch profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUserId)
          .single();

        if (error || !profile) {
          // If profile does not exist in DB yet, seed a placeholder
          const placeholderPhone = '+15550192834';
          const placeholderName = 'Guest Customer';
          
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: currentUserId,
              phone_number: placeholderPhone,
              full_name: placeholderName,
              role: 'customer'
            })
            .select()
            .single();

          if (newProfile) {
            setFullName(newProfile.full_name || '');
            setPhoneNumber(newProfile.phone_number || '');
            setRole(newProfile.role || 'customer');
          }
        } else {
          setFullName(profile.full_name || '');
          setPhoneNumber(profile.phone_number || '');
          setRole(profile.role || 'customer');
        }
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      showToast('Error', 'Please enter your full name', 'error');
      return;
    }

    if (!userId) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim()
        })
        .eq('id', userId);

      if (error) throw error;

      showToast('Success', 'Profile updated successfully!', 'success');
    } catch (e: any) {
      console.error('Failed to update profile:', e.message);
      showToast('Error', 'Failed to update profile: ' + e.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const loadSavedAddresses = async () => {
    try {
      const descopeUid = userId || 'guest';
      const storageKey = `hotelbet_saved_addresses_${descopeUid}`;
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        setAddresses(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load saved addresses:', e);
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddressText.trim()) {
      showToast('Validation Error', 'Address text cannot be empty.', 'error');
      return;
    }

    let updated = [...addresses];
    const contactPhone = isOrderingForSomeoneElse ? newRecipientPhone.trim() : phoneNumber;
    const phoneSuffix = contactPhone ? ` - Contact: ${contactPhone}` : '';
    const finalAddress = `${newAddressText.trim()}${phoneSuffix}`;
    if (editingAddressId) {
      updated = updated.map(item => 
        item.id === editingAddressId 
          ? { ...item, label: newLabel, address: finalAddress } 
          : item
      );
      showToast('Address Updated', 'Saved changes successfully.', 'success');
    } else {
      const newItem = {
        id: `addr_${Date.now()}`,
        label: newLabel,
        address: finalAddress
      };
      updated.push(newItem);
      showToast('Address Added', 'Saved new address successfully.', 'success');
    }

    setAddresses(updated);
    const descopeUid = userId || 'guest';
    const storageKey = `hotelbet_saved_addresses_${descopeUid}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    setNewAddressText('');
    setNewRecipientPhone('');
    setIsOrderingForSomeoneElse(false);
    setNewLabel('Home');
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const handleEditClick = (item: { id: string; label: string; address: string }) => {
    setEditingAddressId(item.id);
    setNewLabel(item.label);
    setNewAddressText(item.address);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (id: string) => {
    const updated = addresses.filter(item => item.id !== id);
    setAddresses(updated);
    const descopeUid = userId || 'guest';
    const storageKey = `hotelbet_saved_addresses_${descopeUid}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    showToast('Address Deleted', 'Address removed successfully.', 'success');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('demo_role');
      await AsyncStorage.removeItem('user_selected_role');
      await AsyncStorage.removeItem('vip_session_active');
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Failed to sign out:', e);
      router.replace('/(auth)/login');
    }
  };

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
      <FloatingHeader title="Profile Settings" titleAlign="center" />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={{ height: 120, position: 'relative' }}>
            <Loader />
          </View>
        ) : (
          <View style={styles.formContainer}>
            {/* User Meta Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.avatarCircle}>
                <User size={32} color={colors.accentGold} />
              </View>
              <Text style={[styles.profileNameTitle, { color: colors.textMain }]}>
                {fullName || 'Hotel Bet Guest'}
              </Text>
              <Text style={[styles.profilePhoneSub, { color: colors.textSub }]}>
                {phoneNumber}
              </Text>
              <View style={styles.roleBadge}>
                <UserCheck size={11} color="#000000" style={{ marginRight: 4 }} />
                <Text style={styles.roleBadgeText}>
                  {role.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Wallet Section */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 24 }]}>MY WALLET</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(customer)/wallet')}
              style={[styles.settingsRow, { 
                backgroundColor: colors.cardBg, 
                borderColor: colors.cardBorder, 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(212, 175, 55, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 0.8,
                  borderColor: colors.accentGold
                }}>
                  <Wallet size={16} color={colors.accentGold} />
                </View>
                <View>
                  <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800' }}>Wallet Balance</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>Current Balance: ₹ {walletBalance.toFixed(2)}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textSub} />
            </TouchableOpacity>

            {/* Profile Inputs */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>EDIT PERSONAL DETAILS</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSub }]}>Full Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name..."
                placeholderTextColor="#8E8E93"
              />
            </View>

            <TouchableOpacity 
              onPress={handleUpdateProfile}
              disabled={updating}
              activeOpacity={0.85}
              style={styles.saveBtnWrapper}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                {updating ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* SAVED ADDRESSES SECTION */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 32 }]}>SAVED ADDRESSES</Text>
            
            {addresses.length === 0 ? (
              <View style={[styles.settingsRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 16, alignItems: 'center', justifyContent: 'center' }]}>
                <MapPin size={24} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 6 }} />
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700' }}>No Saved Addresses</Text>
                <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'center', marginTop: 2 }}>
                  Add a delivery address to select it during checkout.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {addresses.map((item) => (
                  <View 
                    key={item.id}
                    style={[styles.settingsRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                      <View style={[styles.addressIconWrapper, { backgroundColor: colors.inputBg }]}>
                        {item.label === 'Home' ? (
                          <Home size={15} color={colors.accentGold} />
                        ) : item.label === 'Work' ? (
                          <Briefcase size={15} color={colors.accentGold} />
                        ) : (
                          <MapPin size={15} color={colors.accentGold} />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 12 }}>{item.label}</Text>
                        <Text style={{ color: colors.textSub, fontSize: 11 }} numberOfLines={2}>{item.address}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => handleEditClick(item)} style={styles.addressActionBtn}>
                        <Edit size={14} color={colors.accentGold} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={styles.addressActionBtn}>
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add / Edit Address Form or Trigger */}
            {!showAddressForm ? (
              <TouchableOpacity 
                style={[styles.addAddressBtn, { borderColor: colors.accentGold, marginTop: 12 }]}
                onPress={() => {
                  setShowPicker(true);
                }}
              >
                <Plus size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 12 }}>Add New Address</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addressFormCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, marginTop: 12, padding: 16 }]}>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 12, marginBottom: 12 }}>
                  {editingAddressId ? 'EDIT SAVED ADDRESS' : 'ADD NEW ADDRESS'}
                </Text>

                <Text style={[styles.inputLabel, { color: colors.textSub }]}>Address Label</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <TouchableOpacity
                      key={lbl}
                      style={[
                        styles.labelChoiceBtn,
                        { borderColor: colors.cardBorder },
                        newLabel === lbl && { backgroundColor: colors.accentGold }
                      ]}
                      onPress={() => setNewLabel(lbl)}
                    >
                      <Text style={{ color: newLabel === lbl ? '#000000' : colors.textMain, fontWeight: '800', fontSize: 11 }}>
                        {lbl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {newLabel !== 'Home' && newLabel !== 'Work' && newLabel !== 'Other' && (
                  <View style={{ marginBottom: 12 }}>
                    <TextInput
                      style={[styles.input, { height: 40, paddingVertical: 8, fontSize: 12, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                      value={newLabel}
                      placeholder="e.g. Friend's Place, Gym..."
                      placeholderTextColor="#8E8E93"
                      onChangeText={(text) => setNewLabel(text)}
                    />
                  </View>
                )}
                {newLabel === 'Other' && (
                  <View style={{ marginBottom: 12 }}>
                    <TextInput
                      style={[styles.input, { height: 40, paddingVertical: 8, fontSize: 12, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                      placeholder="e.g. Friend's Place, Gym..."
                      placeholderTextColor="#8E8E93"
                      onChangeText={(text) => setNewLabel(text)}
                    />
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: colors.textSub }]}>Delivery Address Details</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top', fontSize: 12, padding: 10, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain, marginBottom: 16 }]}
                  multiline={true}
                  placeholder="Street name, apartment, area info..."
                  placeholderTextColor="#8E8E93"
                  value={newAddressText}
                  onChangeText={setNewAddressText}
                />

                {/* Recipient Phone Choice */}
                <Text style={[styles.inputLabel, { color: colors.textSub }]}>Ordering for someone else?</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: !isOrderingForSomeoneElse ? colors.accentGold : colors.cardBorder,
                      backgroundColor: !isOrderingForSomeoneElse ? 'rgba(212, 175, 55, 0.1)' : colors.inputBg,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => setIsOrderingForSomeoneElse(false)}
                  >
                    <Text style={{ color: !isOrderingForSomeoneElse ? colors.accentGold : colors.textMain, fontWeight: '700', fontSize: 12 }}>No (Use My Number)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isOrderingForSomeoneElse ? colors.accentGold : colors.cardBorder,
                      backgroundColor: isOrderingForSomeoneElse ? 'rgba(212, 175, 55, 0.1)' : colors.inputBg,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => setIsOrderingForSomeoneElse(true)}
                  >
                    <Text style={{ color: isOrderingForSomeoneElse ? colors.accentGold : colors.textMain, fontWeight: '700', fontSize: 12 }}>Yes (Enter Recipient's)</Text>
                  </TouchableOpacity>
                </View>

                {isOrderingForSomeoneElse && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSub }]}>Recipient's Phone Number</Text>
                    <TextInput
                      style={[styles.input, { height: 40, fontSize: 12, paddingHorizontal: 10, backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                      placeholder="Mobile number of recipient..."
                      placeholderTextColor="#8E8E93"
                      value={newRecipientPhone}
                      onChangeText={setNewRecipientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.addressFormCancelBtn, { borderColor: '#EF4444', flex: 1 }]}
                    onPress={() => setShowAddressForm(false)}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12, textAlign: 'center' }}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.addressFormSaveBtn, { backgroundColor: colors.accentGold, flex: 1 }]}
                    onPress={handleSaveAddress}
                  >
                    <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12, textAlign: 'center' }}>Save Address</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 32 }]}>PREFERENCES & ACCOUNT</Text>

            {/* Switch Theme Row */}
            <View style={[styles.settingsRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.settingsLabelWrapper}>
                {isDark ? (
                  <Moon size={18} color={colors.accentGold} style={{ marginRight: 10 }} />
                ) : (
                  <Sun size={18} color={colors.accentGold} style={{ marginRight: 10 }} />
                )}
                <Text style={[styles.settingsLabelText, { color: colors.textMain }]}>Dark Mode</Text>
              </View>
              <Switch 
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: '#E2B755' }}
                thumbColor={isDark ? '#B88E2F' : '#f4f3f4'}
              />
            </View>

            {/* Help & Support Row */}
            <TouchableOpacity 
              style={[styles.settingsRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/(customer)/support')}
              activeOpacity={0.7}
            >
              <View style={styles.settingsLabelWrapper}>
                <HelpCircle size={18} color={colors.accentGold} style={{ marginRight: 10 }} />
                <Text style={[styles.settingsLabelText, { color: colors.textMain }]}>Help & Support</Text>
              </View>
              <ChevronRight size={16} color={colors.textSub} />
            </TouchableOpacity>

            {/* Logout Row */}
            <TouchableOpacity 
              style={[styles.settingsRow, styles.logoutRow, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingsLabelWrapper}>
                <LogOut size={18} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.settingsLabelText, { color: '#EF4444', fontWeight: '800' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
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
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/branches')}>
          <Home size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/cart')}>
          <ShoppingBag size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(true)}>
          <User size={18} color={colors.accentGold} />
          <Text style={[styles.tabText, { color: colors.accentGold }]}>Profile</Text>
        </TouchableOpacity>
      </BlurView>

      <LocationPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onAddressSaved={() => {
          loadSavedAddresses();
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
  formContainer: {
    width: '100%',
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileNameTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  profilePhoneSub: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
    paddingLeft: 4,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    paddingLeft: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    height: 48,
  },
  saveBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  saveBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  settingsLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabelText: {
    fontSize: 13,
    fontWeight: '700',
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
  addressIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressActionBtn: {
    padding: 6,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addressFormCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  labelChoiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.8,
  },
  addressFormCancelBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressFormSaveBtn: {
    paddingVertical: 10,
    borderRadius: 12,
  },
});
