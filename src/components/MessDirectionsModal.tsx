import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MapPin, Navigation, X, ExternalLink, Compass } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '../context/ThemeContext';

interface MessDirectionsModalProps {
  visible: boolean;
  onClose: () => void;
  messName: string;
  messAddress: string;
  messLat?: number;
  messLng?: number;
}

const DEFAULT_MESS_LAT = 18.5204;
const DEFAULT_MESS_LNG = 73.8567;
const DEFAULT_STUDENT_LAT = 18.5175;
const DEFAULT_STUDENT_LNG = 73.8518;

export default function MessDirectionsModal({
  visible,
  onClose,
  messName,
  messAddress,
  messLat = DEFAULT_MESS_LAT,
  messLng = DEFAULT_MESS_LNG,
}: MessDirectionsModalProps) {
  const { isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);

  const studentLat = DEFAULT_STUDENT_LAT;
  const studentLng = DEFAULT_STUDENT_LNG;

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(13, 20, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        .leaflet-container { width: 100%; height: 100%; }
        .leaflet-tile-pane { filter: ${isDark ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none'}; }
        html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: ${isDark ? '#080C0E' : '#F8FAFC'}; touch-action: none; }
        .custom-mess-pin { background: #10B981; border: 3px solid #FFF; border-radius: 50%; width: 28px; height: 28px; box-shadow: 0 0 16px rgba(16, 185, 129, 0.9); }
        .custom-student-pin { background: #3B82F6; border: 3px solid #FFF; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 16px rgba(59, 130, 246, 0.9); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true
        }).setView([${(studentLat + messLat) / 2}, ${(studentLng + messLng) / 2}], 15);

        // Official Google Maps Tile Layer
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: 'Map data © Google'
        }).addTo(map);

        var studentIcon = L.divIcon({
          className: 'custom-student-pin',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([${studentLat}, ${studentLng}], { icon: studentIcon }).addTo(map).bindPopup("<b>Your Location</b>").openPopup();

        var messIcon = L.divIcon({
          className: 'custom-mess-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker([${messLat}, ${messLng}], { icon: messIcon }).addTo(map).bindPopup("<b>${messName.replace(/'/g, "\\'")}</b>");

        var osrmUrl = 'https://router.project-osrm.org/route/v1/foot/${studentLng},${studentLat};${messLng},${messLat}?overview=full&geometries=geojson';

        fetch(osrmUrl)
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data.routes && data.routes.length > 0) {
              var coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              var polyline = L.polyline(coords, { color: '#10B981', weight: 6, opacity: 0.95 }).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [45, 45] });
            } else {
              var fallback = [[${studentLat}, ${studentLng}], [${messLat}, ${messLng}]];
              var polyline = L.polyline(fallback, { color: '#10B981', weight: 5, opacity: 0.85, dashArray: '8, 8' }).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [45, 45] });
            }
          })
          .catch(function() {
            var fallback = [[${studentLat}, ${studentLng}], [${messLat}, ${messLng}]];
            var polyline = L.polyline(fallback, { color: '#10B981', weight: 5, opacity: 0.85, dashArray: '8, 8' }).addTo(map);
            map.fitBounds(polyline.getBounds(), { padding: [45, 45] });
          });
      </script>
    </body>
    </html>
  `;

  const handleOpenExternalMaps = () => {
    const encoded = encodeURIComponent(`${messName}, ${messAddress}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${messLat},${messLng}`,
    });
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.modalContainer}>
          {/* Header */}
          <View style={[styles.header, { borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Compass size={20} color="#10B981" />
              <Text style={[styles.headerTitle, { color: colors.textMain }]}>Google Maps Live Directions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <X size={18} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Interactive Native WebView Map */}
          <View style={styles.mapContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={{ flex: 1, backgroundColor: 'transparent' }}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ color: colors.textMain, marginTop: 8, fontSize: 12, fontWeight: '700' }}>
                  Loading Google Maps...
                </Text>
              </View>
            )}
          </View>

          {/* Destination Details Card */}
          <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.messPinBg}>
                <MapPin size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.messName, { color: colors.textMain }]}>{messName}</Text>
                <Text style={[styles.messAddress, { color: colors.textSub }]}>{messAddress}</Text>
              </View>
              <View style={styles.distPill}>
                <Navigation size={12} color="#10B981" />
                <Text style={styles.distPillText}>350m (4 min walk)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.externalBtn} onPress={handleOpenExternalMaps} activeOpacity={0.85}>
              <ExternalLink size={16} color="#FFFFFF" />
              <Text style={styles.externalBtnText}>Open in Google / Apple Maps</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 12, 14, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    padding: 18,
    borderTopWidth: 1,
    gap: 14,
  },
  messPinBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messName: {
    fontSize: 16,
    fontWeight: '900',
  },
  messAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  distPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distPillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  externalBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  externalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
