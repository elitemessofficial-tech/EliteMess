import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useSession } from '@descope/react-native-sdk';

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
  isBranchMode?: boolean;
}

export default function LocationPickerModal({ visible, onClose, onAddressSaved, isBranchMode = false }: LocationPickerModalProps) {
  const { isDark } = useAppTheme();
  const { session } = useSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const geocodeTimeoutRef = useRef<any>(null);

  const [lat, setLat] = useState(PUNE_LAT);
  const [lng, setLng] = useState(PUNE_LNG);
  const [reverseGeocoded, setReverseGeocoded] = useState('TSSM Road, Narhe, Pune, Maharashtra');
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState('Home'); // Home, Work, Other
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(false);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

  // Listen to messages from Leaflet map in iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const coords = JSON.parse(e.data);
        if (coords.latitude && coords.longitude) {
          setLat(coords.latitude);
          setLng(coords.longitude);
          
          // Debounce reverse geocoding to prevent hitting rate limits
          if (geocodeTimeoutRef.current) {
            clearTimeout(geocodeTimeoutRef.current);
          }
          
          setGeocoding(true);
          setReverseGeocoded('Detecting address...');
          
          geocodeTimeoutRef.current = setTimeout(() => {
            reverseGeocode(coords.latitude, coords.longitude);
          }, 1000); // 1-second debounce
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Browser Geolocation
  const detectLiveLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setLat(latitude);
          setLng(longitude);
          
          if (geocodeTimeoutRef.current) {
            clearTimeout(geocodeTimeoutRef.current);
          }
          reverseGeocode(latitude, longitude);
          setLoadingLocation(false);

          // Update iframe Leaflet map center
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            latitude,
            longitude
          }), '*');
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
      
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.display_name) {
            const clean = data.display_name.split(',').slice(0, 4).join(',').trim();
            setReverseGeocoded(clean || data.display_name);
            return;
          }
        }
      }
      throw new Error('Nominatim request failed or rate limited');
    } catch (e) {
      console.warn('Nominatim failed, trying BigDataCloud fallback:', e);
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (res.ok) {
          const data = await res.json();
          const parts = [];
          if (data.locality) parts.push(data.locality);
          if (data.city) parts.push(data.city);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          if (data.countryName) parts.push(data.countryName);
          
          if (parts.length > 0) {
            setReverseGeocoded(parts.join(', '));
            return;
          }
        }
      } catch (err) {
        console.warn('Fallback geocoding failed:', err);
      }
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
    if (!isBranchMode && !flatNo.trim()) {
      alert('Please enter your flat, house number, or suite details.');
      return;
    }

    try {
      setSaving(true);
      
      if (isBranchMode) {
        const addressDetails: AddressDetails = {
          id: Date.now().toString(),
          label: 'Branch',
          flatNo: flatNo.trim(),
          landmark: landmark.trim(),
          address: reverseGeocoded,
          latitude: lat,
          longitude: lng
        };
        onAddressSaved(addressDetails);
        setFlatNo('');
        setLandmark('');
        return;
      }
      
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

      const descopeUid = session?.user?.userId || 'guest';
      const storageKey = `hotelbet_saved_addresses_${descopeUid}`;
      const existing = await AsyncStorage.getItem(storageKey);
      const parsed = existing ? JSON.parse(existing) : [];
      
      const contactPhone = isOrderingForSomeoneElse ? recipientPhone.trim() : (session?.user?.phone || '');
      const phoneSuffix = contactPhone ? ` - Contact: ${contactPhone}` : '';
      const newFullAddress = `${addressDetails.flatNo}, ${addressDetails.address} (Landmark: ${addressDetails.landmark})${phoneSuffix}`;
      const updated = [
        {
          id: addressDetails.id,
          label: addressDetails.label,
          address: newFullAddress,
          latitude: addressDetails.latitude,
          longitude: addressDetails.longitude
        },
        ...parsed.filter((item: any) => item.address !== newFullAddress)
      ];

      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

      onAddressSaved(addressDetails);
      setFlatNo('');
      setLandmark('');
      setRecipientPhone('');
      setIsOrderingForSomeoneElse(false);
      setLabel('Home');
      onClose();
    } catch (e) {
      console.error('Failed to save address details:', e);
    } finally {
      setSaving(false);
    }
  };

  const mapHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: ${isDark ? '#0F0F0B' : '#F8FAFC'};
          }
          ${isDark ? `
          .leaflet-tile {
            filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.8);
          }
          ` : ''}
          .leaflet-control-zoom {
            display: none !important;
          }
          .leaflet-control-attribution {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${PUNE_LAT}, ${PUNE_LNG}], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          map.on('moveend', function() {
            var center = map.getCenter();
            window.parent.postMessage(JSON.stringify({
              latitude: center.lat,
              longitude: center.lng
            }), '*');
          });

          window.addEventListener('message', function(event) {
            try {
              var coords = JSON.parse(event.data);
              if (coords.latitude && coords.longitude) {
                map.setView([coords.latitude, coords.longitude], 16);
              }
            } catch(e) {}
          });
        </script>
      </body>
      </html>
    `;
  }, [isDark]);

  const mapDataUri = useMemo(() => {
    return `data:text/html;charset=utf-8,${encodeURIComponent(mapHtml)}`;
  }, [mapHtml]);

  const handleIframeLoad = () => {
    // Send initial lat/lng
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      latitude: lat,
      longitude: lng
    }), '*');
  };

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
              ref={iframeRef}
              src={mapDataUri}
              onLoad={handleIframeLoad}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="OpenStreetMap"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#181814', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF' }}>Web view only</Text>
            </View>
          )}

          {/* Persistent Center Pin overlay */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <View style={styles.pinWrapper}>
              <View style={styles.pinGlow} />
              <MapPin size={34} color={colors.accentGold} fill="rgba(212, 175, 55, 0.2)" />
            </View>
          </View>

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
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>
              {isBranchMode ? 'SELECT RESTAURANT LOCATION' : 'SELECT DELIVERY LOCATION (WEB)'}
            </Text>
            
            <View style={[styles.addressTextCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <View style={styles.addressLeftIcon}>
                <MapPin size={18} color={colors.accentGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressTitle, { color: colors.textMain }]}>Pinned Location</Text>
                {geocoding ? (
                  <ActivityIndicator size="small" color={colors.accentGold} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                ) : (
                  <Text style={[styles.addressSubtitle, { color: colors.textSub }]}>{reverseGeocoded}</Text>
                )}
              </View>
            </View>

            {/* Flat details input */}
            <Text style={[styles.inputLabel, { color: colors.accentGold }]}>
              {isBranchMode ? 'FLOOR / SUITE / DETAILS (OPTIONAL)' : 'HOUSE / FLAT / SUITE NUMBER *'}
            </Text>
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

            {!isBranchMode && (
              <>
                {/* Recipient Phone Choice */}
                <Text style={[styles.inputLabel, { color: colors.accentGold }]}>ORDERING FOR SOMEONE ELSE?</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: !isOrderingForSomeoneElse ? colors.accentGold : colors.cardBorder,
                      backgroundColor: !isOrderingForSomeoneElse ? 'rgba(212, 175, 55, 0.1)' : colors.inputBg,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => setIsOrderingForSomeoneElse(false)}
                  >
                    <Text style={{ color: !isOrderingForSomeoneElse ? colors.accentGold : colors.textMain, fontWeight: '700', fontSize: 13 }}>No (Use My Number)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isOrderingForSomeoneElse ? colors.accentGold : colors.cardBorder,
                      backgroundColor: isOrderingForSomeoneElse ? 'rgba(212, 175, 55, 0.1)' : colors.inputBg,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => setIsOrderingForSomeoneElse(true)}
                  >
                    <Text style={{ color: isOrderingForSomeoneElse ? colors.accentGold : colors.textMain, fontWeight: '700', fontSize: 13 }}>Yes (Enter Recipient's)</Text>
                  </TouchableOpacity>
                </View>

                {isOrderingForSomeoneElse && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.inputLabel, { color: colors.accentGold }]}>RECIPIENT'S PHONE NUMBER</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                      placeholder="e.g. +91 99999 99999"
                      placeholderTextColor={colors.textSub}
                      value={recipientPhone}
                      onChangeText={setRecipientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                )}

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
              </>
            )}

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
                <Text style={styles.saveBtnText}>
                  {isBranchMode ? 'Confirm Hotel Location' : 'Save Delivery Address'}
                </Text>
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
    height: '50%',
    position: 'relative',
    width: '100%',
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
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
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
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -38,
    marginLeft: -17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  pinWrapper: {
    alignItems: 'center',
  },
  pinGlow: {
    position: 'absolute',
    bottom: -2,
    width: 8,
    height: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    transform: [{ scaleX: 1.5 }],
  },
});
