import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Image,
  Animated,
  Modal
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, ChevronRight, LogOut, Sun, Moon, Home, ShoppingBag, User, Star, Briefcase, Map, X, Plus, CheckCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { calculateHaversineDistance, formatDistance } from '../../src/utils/distance';
import LocationPickerModal, { AddressDetails } from '../../src/components/LocationPickerModal';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';

export default function BranchesScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  const [branches, setBranches] = useState<any[]>([]);
  const [rawBranches, setRawBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Geolocation & Map Address states
  const [selectedAddress, setSelectedAddress] = useState<AddressDetails | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showSavedAddressesModal, setShowSavedAddressesModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;
  const themeAnim = React.useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Sorting and formatting nearest branches
  const sortAndFormatBranches = (rawList: any[], coords: { latitude: number; longitude: number } | null) => {
    if (!coords) {
      return rawList.map(b => ({
        ...b,
        distance: b.distance || (b.id === 'f6e5d4c3-b2a1-8f7e-6d5c-4b3a2f1e0d9c' ? '1.1 km' : '0.3 km')
      }));
    }

    return [...rawList].map(branch => {
      const lat = branch.latitude || 18.4575;
      const lng = branch.longitude || 73.8088;
      const dist = calculateHaversineDistance(coords.latitude, coords.longitude, lat, lng);
      return {
        ...branch,
        distanceVal: dist,
        distance: formatDistance(dist)
      };
    }).sort((a, b) => a.distanceVal - b.distanceVal);
  };

  // Re-sort branches whenever coordinates or raw list changes
  useEffect(() => {
    if (rawBranches.length > 0) {
      setBranches(sortAndFormatBranches(rawBranches, userCoords));
    }
  }, [userCoords, rawBranches]);

  // Load saved location on startup or request GPS fallback
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_selected_address');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSelectedAddress(parsed);
          setUserCoords({ latitude: parsed.latitude, longitude: parsed.longitude });
          return;
        }

        // GPS Live fallback detection
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        console.warn('Failed to initialize location on startup:', e);
      }
    };
    initializeLocation();
  }, []);

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 500, // smooth cross-fade
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  const getBranchImages = (branchId: string) => {
    if (branchId === 'f6e5d4c3-b2a1-8f7e-6d5c-4b3a2f1e0d9c') {
      return {
        day: require('../../assets/images/Hotel_warje_day.png'),
        night: require('../../assets/images/Hotel_warje_night.png')
      };
    }
    return {
      day: require('../../assets/images/Hotel_narhe_day.png'),
      night: require('../../assets/images/Hotel_narhe_night.png')
    };
  };

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 850,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [loading]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;
        
        const listToUse = data && data.length > 0 ? data : [
          { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Hotel Bet — Main Lobby', address: 'Signature dining • Ground floor', latitude: 12.9715987, longitude: 77.5945627 },
          { id: 'f6e5d4c3-b2a1-8f7e-6d5c-4b3a2f1e0d9c', name: 'Hotel Bet — East Wing', address: 'Private lounge • 12th floor', latitude: 12.998492, longitude: 77.6120384 }
        ];

        setRawBranches(listToUse);
        setBranches(sortAndFormatBranches(listToUse, userCoords));
      } catch (e) {
        console.error('Failed to load branches from Supabase:', e);
        const fallbacks = [
          { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Hotel Bet — Main Lobby', address: 'Signature dining • Ground floor', latitude: 12.9715987, longitude: 77.5945627 },
          { id: 'f6e5d4c3-b2a1-8f7e-6d5c-4b3a2f1e0d9c', name: 'Hotel Bet — East Wing', address: 'Private lounge • 12th floor', latitude: 12.998492, longitude: 77.6120384 }
        ];
        setRawBranches(fallbacks);
        setBranches(sortAndFormatBranches(fallbacks, userCoords));
      } finally {
        setLoading(false);
      }
    };
    loadBranches();
  }, []);

  // Color tokens matching the luxury target design
  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37', // Gold highlight
    statusGreen: '#10B981',
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  const handleSelectBranch = async (branchId: string) => {
    console.log('Selected Branch:', branchId);
    try {
      await AsyncStorage.setItem('selected_branch_id', branchId);
    } catch (e) {
      console.error('Failed to save selected branch ID:', e);
    }
    router.push('/(customer)/menu');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('demo_role');
    router.replace('/(auth)/login');
  };

  const renderSkeletonCard = (index: number) => {
    return (
      <Animated.View 
        key={`skeleton_${index}`}
        style={[
          styles.branchCard, 
          { 
            backgroundColor: colors.cardBg, 
            borderColor: colors.cardBorder, 
            opacity: pulseAnim 
          }
        ]}
      >
        {/* Top Half: Photo Placeholder Skeleton */}
        <View style={[styles.photoBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }]} />

        {/* Bottom Half: Details Skeleton */}
        <View style={styles.cardDetails}>
          <View style={[styles.titleRow, { marginBottom: 12 }]}>
            <View style={{ width: '60%', height: 16, borderRadius: 4, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }} />
            <View style={{ width: '20%', height: 16, borderRadius: 4, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }} />
          </View>

          <View style={{ width: '85%', height: 12, borderRadius: 3, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)', marginBottom: 8 }} />
          <View style={{ width: '50%', height: 12, borderRadius: 3, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)', marginBottom: 16 }} />

          {/* Select button skeleton */}
          <View 
            style={[styles.selectBtn, { borderColor: 'rgba(212, 175, 55, 0.08)', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', alignItems: 'center', justifyContent: 'center' }]} 
          >
            <View style={{ width: '40%', height: 10, borderRadius: 3, backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)' }} />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderBranchCard = (
    branchId: string, 
    title: string, 
    subtitle: string, 
    distance: string,
    index?: number
  ) => {
    const imgs = getBranchImages(branchId);
    return (
      <AnimatedEntrance 
        key={branchId || `branch-key-${index}`} 
        delay={(index || 0) * 100}
      >
        <View style={[styles.branchCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* Top Half: Photo with smooth cross-fade */}
          <View style={styles.photoBox}>
            <Image 
              source={imgs.day}
              style={styles.branchImage}
              resizeMode="cover"
            />
            <Animated.Image 
              source={imgs.night}
              style={[styles.branchImage, { opacity: themeAnim }]}
              resizeMode="cover"
            />
          </View>

          {/* Bottom Half: Details */}
          <View style={styles.cardDetails}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <View style={[styles.statusDot, { backgroundColor: colors.statusGreen }]} />
                <Text style={[styles.cardTitle, { color: colors.textMain }]}>{title}</Text>
              </View>
              <View style={[styles.distanceBadge, { borderColor: 'rgba(212, 175, 55, 0.3)' }]}>
                <Text style={[styles.distanceText, { color: colors.accentGold }]}>{distance}</Text>
              </View>
            </View>

            <Text style={[styles.cardSubtitle, { color: colors.textSub }]}>{subtitle}</Text>

            {/* Select button */}
            <TouchableOpacity 
              style={[styles.selectBtn, { borderColor: 'rgba(212, 175, 55, 0.25)' }]} 
              onPress={() => handleSelectBranch(branchId)}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectBtnText, { color: colors.accentGold }]}>Select Branch →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedEntrance>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader 
        leftContent={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            <Image 
              source={require('../../assets/images/hotelbet.png')} 
              style={{ width: 26, height: 26, borderRadius: 13 }} 
              resizeMode="contain"
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain, letterSpacing: 0.5 }}>
              HOTEL BET
            </Text>
          </View>
        )}
        rightContent={(
          <>
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
          </>
        )}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Page Content Header */}
        <View style={styles.headerSpacer}>
          <Text style={[styles.pageTitle, { color: colors.textMain }]}>Select Your Branch</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSub }]}>
            Choose your nearest hotel location
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addressCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={async () => {
            try {
              const saved = await AsyncStorage.getItem('hotelbet_saved_addresses');
              setSavedAddresses(saved ? JSON.parse(saved) : []);
            } catch (e) {
              console.warn(e);
            }
            setShowSavedAddressesModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.addressCardLeft}>
            {selectedAddress?.label === 'Home' ? (
              <Home size={16} color={colors.accentGold} />
            ) : selectedAddress?.label === 'Work' ? (
              <Briefcase size={16} color={colors.accentGold} />
            ) : (
              <MapPin size={16} color={colors.accentGold} />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.accentGold, letterSpacing: 1.5 }}>DELIVERING TO</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain, marginTop: 2 }} numberOfLines={1}>
                {selectedAddress 
                  ? `${selectedAddress.label} (${selectedAddress.flatNo}, ${selectedAddress.address})` 
                  : 'Set your delivery location...'}
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textSub} />
        </TouchableOpacity>

        <View style={styles.cardContainer}>
          {loading ? (
            <>
              {renderSkeletonCard(1)}
              {renderSkeletonCard(2)}
            </>
          ) : (
            branches.map((branch, index) => (
              renderBranchCard(
                branch.id, 
                branch.name, 
                branch.address, 
                branch.distance || (branch.id === 'downtown' || branch.id === 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' ? '0.3 km' : '1.1 km'),
                index
              )
            ))
          )}
        </View>
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
        <TouchableOpacity style={getTabStyle(true)} onPress={() => router.replace('/(customer)/branches')}>
          <Home size={18} color={colors.accentGold} />
          <Text style={[styles.tabText, { color: colors.accentGold }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/cart')}>
          <ShoppingBag size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(customer)/account')}>
          <User size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Profile</Text>
        </TouchableOpacity>
      </BlurView>
      {/* Location Picker Modal Overlay */}
      <LocationPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onAddressSaved={(addr) => {
          setSelectedAddress(addr);
          setUserCoords({ latitude: addr.latitude, longitude: addr.longitude });
        }}
      />

      {/* Saved Addresses List Modal */}
      <Modal
        visible={showSavedAddressesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSavedAddressesModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' }}>
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              maxHeight: '75%',
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderBottomWidth: 0,
              backgroundColor: colors.cardBg,
            }}
          >
            {/* Indicator */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginBottom: 20 }} />

            {/* Title Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textMain }}>Select Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowSavedAddressesModal(false)} style={{ padding: 4 }}>
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {savedAddresses.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <MapPin size={32} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800' }}>No Saved Addresses</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Add an address to check the distance from our kitchen.
                  </Text>
                </View>
              ) : (
                savedAddresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id || selectedAddress?.label === addr.label;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.accentGold : colors.cardBorder,
                        backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.04)' : 'rgba(0,0,0,0)',
                      }}
                      onPress={async () => {
                        setSelectedAddress(addr);
                        setUserCoords({ latitude: addr.latitude, longitude: addr.longitude });
                        await AsyncStorage.setItem('user_selected_address', JSON.stringify(addr));
                        setShowSavedAddressesModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                        <View style={{ marginRight: 12 }}>
                          {addr.label === 'Home' ? (
                            <Home size={18} color={colors.accentGold} />
                          ) : addr.label === 'Work' ? (
                            <Briefcase size={18} color={colors.accentGold} />
                          ) : (
                            <MapPin size={18} color={colors.accentGold} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>{addr.label}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }} numberOfLines={2}>
                            {addr.address}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <CheckCircle size={16} color={colors.statusGreen} />}
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Add New Address Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.accentGold,
                  backgroundColor: 'rgba(212, 175, 55, 0.05)',
                  marginTop: 8,
                }}
                onPress={() => {
                  setShowSavedAddressesModal(false);
                  setTimeout(() => setShowPicker(true), 250);
                }}
                activeOpacity={0.8}
              >
                <Plus size={15} color={colors.accentGold} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.accentGold, fontSize: 13, fontWeight: '900' }}>
                  ADD NEW ADDRESS
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
  addressCard: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  addressCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
    paddingTop: 10,
  },
  headerButton: {
    padding: 8,
    borderRadius: 999,
    borderWidth: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  contentContainer: {
    padding: 16,
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 110, // accommodate bottom tab bar
  },
  headerSpacer: {
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  cardContainer: {
    gap: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  branchCard: {
    borderRadius: 24,
    borderWidth: 0.8,
    padding: 16,
    overflow: 'hidden',
  },
  photoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  branchImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  photoPill: {
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  photoPillText: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '700',
  },
  cardDetails: {
    marginTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  distanceBadge: {
    borderRadius: 12,
    borderWidth: 0.8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 14, // align with title text offset due to statusDot
  },
  selectBtn: {
    borderRadius: 14,
    borderWidth: 0.8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.02)',
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
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
});
