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

  // Official Free Google Maps Directions Embed URL
  const googleMapsEmbedUrl = `https://maps.google.com/maps?saddr=${studentLat},${studentLng}&daddr=${messLat},${messLng}&t=m&z=15&output=embed`;

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

          {/* Interactive Native WebView Google Maps */}
          <View style={styles.mapContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ uri: googleMapsEmbedUrl }}
              style={{ flex: 1, backgroundColor: 'transparent' }}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
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
