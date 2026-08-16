import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  MapPin,
  CheckCircle2,
  X,
  Crosshair,
  Building2,
  Maximize2,
  Minimize2,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

export interface MessPinnedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface MessLocationPinModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSaved: (location: MessPinnedLocation) => void;
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
}

const DEFAULT_PUNE_LAT = 18.5204;
const DEFAULT_PUNE_LNG = 73.8567;

const CAMPUS_PRESETS = [
  { name: 'Gate 2, North Campus', lat: 18.5204, lng: 73.8567, address: 'Gate 2, North Campus Hub, Pune' },
  { name: 'Hostel Square / Block C', lat: 18.5175, lng: 73.8540, address: 'Student Plaza, Hostel Block C, Pune' },
  { name: 'East Gate Main Road', lat: 18.5245, lng: 73.8595, address: 'Near Hostel 4, East Gate Road, Pune' },
  { name: 'South Campus Food Court', lat: 18.5150, lng: 73.8605, address: 'Hostel 7 Circle, South Campus, Pune' },
  { name: 'Narhe Campus Hub', lat: 18.4575, lng: 73.8088, address: 'TSSM Road, Narhe Campus, Pune' },
];

export default function MessLocationPinModal({
  visible,
  onClose,
  onLocationSaved,
  initialAddress = '',
  initialLatitude = DEFAULT_PUNE_LAT,
  initialLongitude = DEFAULT_PUNE_LNG,
}: MessLocationPinModalProps) {
  const { isDark } = useAppTheme();

  const [lat, setLat] = useState(initialLatitude || DEFAULT_PUNE_LAT);
  const [lng, setLng] = useState(initialLongitude || DEFAULT_PUNE_LNG);
  const [addressText, setAddressText] = useState(initialAddress || 'Gate 2, North Campus Hub, Pune');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (visible) {
      setLat(initialLatitude || DEFAULT_PUNE_LAT);
      setLng(initialLongitude || DEFAULT_PUNE_LNG);
      if (initialAddress) setAddressText(initialAddress);
      setIsExpanded(false);
    }
  }, [visible, initialLatitude, initialLongitude, initialAddress]);

  // Reverse Geocoding
  const reverseGeocode = async (targetLat: number, targetLng: number) => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        {
          headers: { 'User-Agent': 'FlexiMeal-Mess-Pin/2.0' },
        }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        const cleanAddr = parts.slice(0, 4).join(', ');
        setAddressText(cleanAddr);
      }
    } catch (e) {
    } finally {
      setIsGeocoding(false);
    }
  };

  // Listen to message from Leaflet Google Maps iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const parsed = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (parsed && parsed.latitude && parsed.longitude) {
          setLat(parsed.latitude);
          setLng(parsed.longitude);
          reverseGeocode(parsed.latitude, parsed.longitude);
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleApplyPreset = (preset: typeof CAMPUS_PRESETS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setAddressText(preset.address);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'SET_COORDS', latitude: preset.lat, longitude: preset.lng }),
        '*'
      );
    }
  };

  const handleSave = () => {
    onLocationSaved({
      address: addressText.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
    });
    onClose();
  };

  const colors = {
    bg: isDark ? '#060A0C' : '#F8FAFC',
    cardBg: isDark ? 'rgba(14, 22, 19, 0.98)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#000000',
    textSub: isDark ? '#94A3B8' : '#475569',
    inputBg: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F1F5F9',
  };

  // High-visibility Google Maps Teardrop Pin Marker HTML (No zoom controls [+] [-])
  const googleMapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
        html, body, #map { width:100%; height:100%; background:#101815; }
        .leaflet-control-zoom { display: none !important; }
        .pin-anchor {
          position: relative;
          width: 36px;
          height: 48px;
          cursor: grab;
          user-select: none;
        }
        .pin-bubble {
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%);
          background: #091410;
          border: 1.5px solid #10B981;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 12px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.7);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        }
        .pin-pulse {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 6px;
          background: rgba(16, 185, 129, 0.6);
          border-radius: 50%;
          animation: pulse 1.6s infinite ease-out;
        }
        @keyframes pulse {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0.9; }
          100% { transform: translateX(-50%) scale(2.4); opacity: 0; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 16);
        
        // Google Maps Standard Layer
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(map);

        var pinSVG = \`
          <div class="pin-anchor">
            <div class="pin-bubble">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 6px #10B981;"></span>
              Mess Location
            </div>
            <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 48 18 48C18 48 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="#10B981"/>
              <path d="M18 2C9.16 2 2 9.16 2 18C2 30.1 18 45.5 18 45.5C18 45.5 34 30.1 34 18C34 9.16 26.84 2 18 2Z" fill="#047857"/>
              <circle cx="18" cy="18" r="10" fill="#FFFFFF"/>
              <circle cx="18" cy="18" r="6" fill="#10B981"/>
            </svg>
            <div class="pin-pulse"></div>
          </div>
        \`;

        var messIcon = L.divIcon({
          className: 'mess-pin-wrapper',
          html: pinSVG,
          iconSize: [36, 48],
          iconAnchor: [18, 48]
        });

        var marker = L.marker([${lat}, ${lng}], {
          draggable: true,
          icon: messIcon
        }).addTo(map);

        marker.on('dragend', function(e) {
          var position = marker.getLatLng();
          window.parent.postMessage(JSON.stringify({
            latitude: position.lat,
            longitude: position.lng
          }), '*');
        });

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          window.parent.postMessage(JSON.stringify({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }), '*');
        });

        window.addEventListener('message', function(e) {
          try {
            var data = JSON.parse(e.data);
            if (data.type === 'SET_COORDS') {
              map.setView([data.latitude, data.longitude], 16);
              marker.setLatLng([data.latitude, data.longitude]);
            }
          } catch(err) {}
        });
      </script>
    </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={95}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            isExpanded && styles.expandedCard,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
              <View style={styles.iconCircle}>
                <MapPin size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textMain }]} numberOfLines={1}>
                  Set Mess Location on Map
                </Text>
                <Text style={[styles.sub, { color: colors.textSub }]} numberOfLines={1}>
                  Drag the pin or tap to set mess entrance
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <X size={16} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Quick Campus Presets (hide in expanded mode to maximize map view) */}
          {!isExpanded && (
            <View style={{ paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub, marginBottom: 6, letterSpacing: 0.5 }}>
                QUICK CAMPUS PRESETS
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {CAMPUS_PRESETS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleApplyPreset(p)}
                    style={[
                      styles.presetPill,
                      { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                      lat === p.lat && lng === p.lng && { backgroundColor: '#10B981', borderColor: '#10B981' },
                    ]}
                  >
                    <Building2 size={12} color={lat === p.lat && lng === p.lng ? '#FFFFFF' : colors.textSub} />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: lat === p.lat && lng === p.lng ? '#FFFFFF' : colors.textMain,
                      }}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Interactive Google Map Box */}
          <View
            style={[
              styles.mapContainer,
              { borderColor: colors.cardBorder },
              isExpanded && styles.expandedMapContainer,
            ]}
          >
            <iframe
              ref={iframeRef as any}
              srcDoc={googleMapHTML}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Google Maps Pin Picker"
            />

            {/* Maximize / Minimize Button */}
            <TouchableOpacity
              style={styles.maximizeBtn}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.8}
            >
              {isExpanded ? (
                <Minimize2 size={16} color="#FFFFFF" />
              ) : (
                <Maximize2 size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/* Live GPS Coordinates Tag */}
            <View style={styles.coordsTag}>
              <Crosshair size={12} color="#10B981" />
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </Text>
              {isGeocoding && <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 4 }} />}
            </View>
          </View>

          {/* Address Input & Confirmation */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSub, letterSpacing: 0.5 }}>
              CONFIRM MESS ENTRANCE ADDRESS
            </Text>
            <View style={[styles.addressBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <MapPin size={16} color="#10B981" />
              <TextInput
                style={[styles.addressInput, { color: colors.textMain }]}
                value={addressText}
                onChangeText={setAddressText}
                placeholder="e.g. Gate 2, North Campus Hub, Pune"
                placeholderTextColor={colors.textSub}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.cardBorder }]} onPress={onClose}>
              <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>Save Mess Location</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '94%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
  },
  expandedCard: {
    maxWidth: '100%',
    maxHeight: '100%',
    height: '100%',
    borderRadius: 0,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  mapContainer: {
    width: '100%',
    height: 270,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  expandedMapContainer: {
    flex: 1,
    height: undefined,
  },
  maximizeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(9, 20, 16, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  coordsTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#091410',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
