import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { MapPin, Navigation, Home, Briefcase, X, Map } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const PUNE_LAT = 18.4575;
const PUNE_LNG = 73.8088;

export interface AddressDetails {
  id: string;
  label: string;
  flatNo: string;
  landmark: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddressSaved: (address: AddressDetails) => void;
}

export default function LocationPickerModal({ visible, onClose, onAddressSaved }: LocationPickerModalProps) {
  const { isDark } = useAppTheme();

  const [lat, setLat] = useState(PUNE_LAT);
  const [lng, setLng] = useState(PUNE_LNG);
  const [reverseGeocoded, setReverseGeocoded] = useState('TSSM Road, Narhe, Pune, Maharashtra');
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState('Home'); // Home, Work, Other
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
  };

  // Browser Geolocation
  const detectLiveLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          reverseGeocode(position.coords.latitude, position.coords.longitude);
          setLoadingLocation(false);
        },
        (error) => {
          console.warn('Browser location error:', error);
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'HotelBetApp/1.0',
          },
        }
      );
      
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('OSM Nominatim returned non-JSON response');
      }

      const data = await res.json();
      if (data && data.display_name) {
        const clean = data.display_name.split(',').slice(0, 4).join(',').trim();
        setReverseGeocoded(clean || data.display_name);
      } else {
        setReverseGeocoded(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
      setReverseGeocoded(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    if (visible) {
      detectLiveLocation();
    }
  }, [visible]);

  const handleSaveAddress = async () => {
    if (!flatNo.trim()) {
      alert('Please enter your flat, house number, or suite details.');
      return;
    }

    try {
      setSaving(true);
      
      const addressDetails: AddressDetails = {
        id: Date.now().toString(),
        label,
        flatNo: flatNo.trim(),
        landmark: landmark.trim(),
        address: reverseGeocoded,
        latitude: lat,
        longitude: lng
      };

      await AsyncStorage.setItem('user_selected_address', JSON.stringify(addressDetails));

      const existing = await AsyncStorage.getItem('hotelbet_saved_addresses');
      const parsed = existing ? JSON.parse(existing) : [];
      
      const updated = [
        {
          id: addressDetails.id,
          label: addressDetails.label,
          address: `${addressDetails.flatNo}, ${addressDetails.address} (Landmark: ${addressDetails.landmark})`,
          latitude: addressDetails.latitude,
          longitude: addressDetails.longitude
        },
        ...parsed.filter((item: any) => item.label !== addressDetails.label)
      ];

      await AsyncStorage.setItem('hotelbet_saved_addresses', JSON.stringify(updated));

      onAddressSaved(addressDetails);
      setFlatNo('');
      setLandmark('');
      setLabel('Home');
      onClose();
    } catch (e) {
      console.error('Failed to save address details:', e);
    } finally {
      setSaving(false);
    }
  };

  // Embed OSM map in iframe for the web browser
  const mapBbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Interactive Web Map Wrapper */}
        <View style={styles.mapWrapper}>
          {Platform.OS === 'web' ? (
            <iframe 
              src={mapUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="OpenStreetMap"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#181814', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF' }}>Web view only</Text>
            </View>
          )}

          {/* Floating Action Header */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity
              style={[styles.floatingCircleBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={16} color={colors.textMain} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingCircleBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={detectLiveLocation}
              disabled={loadingLocation}
              activeOpacity={0.7}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={colors.accentGold} />
              ) : (
                <Navigation size={15} color={colors.accentGold} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Input Form Bottom Sheet */}
        <BlurView
          intensity={95}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.formContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.formIndicator} />
          
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>SELECT DELIVERY LOCATION (WEB)</Text>
            
            <View style={[styles.addressTextCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <View style={styles.addressLeftIcon}>
                <MapPin size={18} color={colors.accentGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressTitle, { color: colors.textMain }]}>Panned Location</Text>
                {geocoding ? (
                  <ActivityIndicator size="small" color={colors.accentGold} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                ) : (
                  <Text style={[styles.addressSubtitle, { color: colors.textSub }]}>{reverseGeocoded}</Text>
                )}
              </View>
            </View>

            {/* Flat details input */}
            <Text style={[styles.inputLabel, { color: colors.accentGold }]}>HOUSE / FLAT / SUITE NUMBER *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
              placeholder="e.g. Flat 101, TSSM Boys Hostel"
              placeholderTextColor={colors.textSub}
              value={flatNo}
              onChangeText={setFlatNo}
            />

            {/* Landmark details input */}
            <Text style={[styles.inputLabel, { color: colors.accentGold }]}>NEARBY LANDMARK (OPTIONAL)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
              placeholder="e.g. Behind TSSM College College Campus"
              placeholderTextColor={colors.textSub}
              value={landmark}
              onChangeText={setLandmark}
            />

            {/* Label Pills row */}
            <Text style={[styles.inputLabel, { color: colors.accentGold }]}>SAVE ADDRESS AS</Text>
            <View style={styles.labelRow}>
              {[
                { name: 'Home', icon: Home },
                { name: 'Work', icon: Briefcase },
                { name: 'Other', icon: Map }
              ].map((item) => {
                const isSelected = label === item.name;
                const IconComp = item.icon;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.labelPill,
                      {
                        backgroundColor: isSelected ? colors.accentGold : colors.inputBg,
                        borderColor: isSelected ? colors.accentGold : colors.cardBorder
                      }
                    ]}
                    onPress={() => setLabel(item.name)}
                    activeOpacity={0.8}
                  >
                    <IconComp size={13} color={isSelected ? '#000000' : colors.textMain} style={{ marginRight: 6 }} />
                    <Text style={[styles.labelPillText, { color: isSelected ? '#000000' : colors.textMain }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Address Button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveAddress}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.saveBtnText}>Save Delivery Address</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  floatingHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  floatingCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  formContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: height * 0.52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 15,
  },
  formIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  addressTextCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 0.8,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  addressLeftIcon: {
    marginTop: 2,
  },
  addressTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  formInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 0.8,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  labelPill: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#D4AF37',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
