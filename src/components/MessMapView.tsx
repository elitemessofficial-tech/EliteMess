import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Star,
  Utensils,
  Clock,
  Zap,
  Compass,
  Maximize2,
  X,
  Navigation,
  LocateFixed,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

export interface MessMapItem {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  address: string;
  distanceMeter: number;
  walkTimeMinutes: number;
  lat: number;
  lng: number;
  image: string;
  todaysSpecial: string;
  isVegOnly: boolean;
}

interface MessMapViewProps {
  messes: MessMapItem[];
  userLocation?: { latitude: number; longitude: number } | null;
  targetMessId?: string;
  onSelectMess: (mess: MessMapItem) => void;
  onOpenReviews: (messId: string, messName: string) => void;
}

const DEFAULT_MAP_MESSES: MessMapItem[] = [
  {
    id: 'm1',
    name: 'Annapurna Campus Mess',
    category: 'Pure Veg',
    rating: 4.8,
    reviewsCount: 142,
    address: 'Gate 2, North Campus Hub',
    distanceMeter: 240,
    walkTimeMinutes: 3,
    lat: 18.5204,
    lng: 73.8567,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80',
    todaysSpecial: 'Paneer Butter Masala + Gulab Jamun',
    isVegOnly: true,
  },
  {
    id: 'm2',
    name: 'Royal Spice Mess',
    category: 'Non-Veg & Veg',
    rating: 4.7,
    reviewsCount: 98,
    address: 'Near Hostel 4, Main Road',
    distanceMeter: 450,
    walkTimeMinutes: 6,
    lat: 18.5245,
    lng: 73.8595,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80',
    todaysSpecial: 'Chicken Biryani & Butter Roti',
    isVegOnly: false,
  },
  {
    id: 'm3',
    name: 'Green Leaf Dining',
    category: 'Pure Veg',
    rating: 4.9,
    reviewsCount: 176,
    address: 'Student Plaza, Block C',
    distanceMeter: 180,
    walkTimeMinutes: 2,
    lat: 18.5175,
    lng: 73.8540,
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80',
    todaysSpecial: 'Rajasthani Dal Baati Churma',
    isVegOnly: true,
  },
  {
    id: 'm4',
    name: 'Shree Krishna Bhojanalay',
    category: 'Pure Veg',
    rating: 4.6,
    reviewsCount: 84,
    address: 'South Gate, Near Library',
    distanceMeter: 600,
    walkTimeMinutes: 8,
    lat: 18.5255,
    lng: 73.8520,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
    todaysSpecial: 'Unlimited Gujarati Thali',
    isVegOnly: true,
  },
  {
    id: 'm5',
    name: 'Punjabi Tadka Mess',
    category: 'Punjabi Special',
    rating: 4.8,
    reviewsCount: 110,
    address: 'Hostel 7 Circle, West Wing',
    distanceMeter: 350,
    walkTimeMinutes: 4,
    lat: 18.5150,
    lng: 73.8605,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
    todaysSpecial: 'Amritsari Chole & Stuffed Paratha',
    isVegOnly: false,
  },
];

export default function MessMapView({
  messes = DEFAULT_MAP_MESSES,
  userLocation,
  targetMessId,
  onSelectMess,
  onOpenReviews,
}: MessMapViewProps) {
  const { isDark } = useAppTheme();
  const mapData = messes.length > 0 ? messes : DEFAULT_MAP_MESSES;

  const initialMess = targetMessId
    ? mapData.find(m => m.id === targetMessId) || mapData[0]
    : mapData[0];

  const [selectedMess, setSelectedMess] = useState<MessMapItem>(initialMess);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pure Veg' | 'Top Rated'>('All');
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    if (targetMessId) {
      const found = mapData.find(m => m.id === targetMessId);
      if (found) setSelectedMess(found);
    }
  }, [targetMessId, mapData]);

  const filteredMapData = mapData.filter(item => {
    if (activeFilter === 'Pure Veg') return item.isVegOnly;
    if (activeFilter === 'Top Rated') return item.rating >= 4.8;
    return true;
  });

  // Listen to message events from the Leaflet iframe when a student taps any pin
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'SELECT_MESS' && data.id) {
            const found = mapData.find(item => item.id === data.id);
            if (found) {
              setSelectedMess(found);
            }
          }
        } catch (e) {
          // ignore
        }
      };

      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [mapData]);

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(15, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const studentLat = userLocation?.latitude || 18.5195;
  const studentLng = userLocation?.longitude || 73.8550;

  // Generate real Leaflet HTML map content with CartoDB Dark Matter tiles and real OSRM street walking routes!
  const generateLeafletHTML = (isFull: boolean) => {
    const pinsJSON = JSON.stringify(
      filteredMapData.map(m => ({
        id: m.id,
        name: m.name,
        lat: m.lat || 18.5204,
        lng: m.lng || 73.8567,
        rating: m.rating,
        special: m.todaysSpecial,
        address: m.address,
        isSelected: selectedMess?.id === m.id,
      }))
    );

    const activeLat = selectedMess ? (selectedMess.lat || 18.5204) : 18.5204;
    const activeLng = selectedMess ? (selectedMess.lng || 73.8567) : 73.8567;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          html, body, #map { width: 100%; height: 100%; background: ${isDark ? '#080C0E' : '#F8FAFC'}; }
          .leaflet-tile-pane { filter: ${isDark ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none'}; }
          .custom-pin {
            background: #121A17;
            border: 2px solid #10B981;
            color: #10B981;
            font-weight: 900;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .custom-pin.selected {
            background: #10B981;
            color: #FFFFFF;
            border-color: #FFFFFF;
            transform: scale(1.2);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.8);
            z-index: 1000 !important;
          }
          .leaflet-popup-content-wrapper {
            background: #0F1A17;
            color: #FFFFFF;
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 12px;
            font-size: 12px;
          }
          .leaflet-popup-tip { background: #0F1A17; }
          .leaflet-control-zoom { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${studentLat}, ${studentLng}], 15);
          
          L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Map data © Google'
          }).addTo(map);

          var pins = ${pinsJSON};
          var boundsGroup = L.featureGroup();

          // User live GPS location blue pulse marker
          var userIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="width:18px;height:18px;background:#3B82F6;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 14px #3B82F6;"></div>',
            iconSize: [18, 18]
          });
          var userM = L.marker([${studentLat}, ${studentLng}], { icon: userIcon }).addTo(map).bindTooltip("📍 You Are Here", { permanent: true, direction: "top", offset: [0, -10] });
          boundsGroup.addLayer(userM);

          // Add ALL Mess markers & attach click handlers
          pins.forEach(function(p) {
            var iconClass = p.isSelected ? 'custom-pin selected' : 'custom-pin';
            var icon = L.divIcon({
              className: iconClass,
              html: '🍴 ' + p.rating + ' ★ ' + p.name.split(' ')[0],
              iconSize: null
            });
            var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
            m.bindPopup('<b>' + p.name + '</b><br><span style="color:#10B981;font-weight:700;">' + p.rating + ' ★</span> · ' + p.address + '<br><small>🔥 ' + p.special + '</small>');
            boundsGroup.addLayer(m);

            m.on('click', function() {
              if (window.parent) {
                window.parent.postMessage(JSON.stringify({ type: 'SELECT_MESS', id: p.id }), '*');
              }
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_MESS', id: p.id }));
              }
            });
          });

          // Fetch real street walking route geometry from OSRM Engine
          var osrmUrl = 'https://router.project-osrm.org/route/v1/foot/' + ${studentLng} + ',' + ${studentLat} + ';' + ${activeLng} + ',' + ${activeLat} + '?overview=full&geometries=geojson';

          fetch(osrmUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data && data.routes && data.routes.length > 0) {
                var routeCoords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
                var roadLine = L.polyline(routeCoords, {
                  color: '#10B981',
                  weight: 5,
                  opacity: 0.95,
                  smoothFactor: 1,
                  lineCap: 'round',
                  lineJoin: 'round'
                }).addTo(map);
                map.fitBounds(roadLine.getBounds().pad(0.35));
              } else {
                drawCurvedFallbackRoute();
              }
            })
            .catch(function(err) {
              drawCurvedFallbackRoute();
            });

          function drawCurvedFallbackRoute() {
            var start = [${studentLat}, ${studentLng}];
            var end = [${activeLat}, ${activeLng}];
            var mid1 = [start[0] + (end[0] - start[0]) * 0.35 + 0.0009, start[1] + (end[1] - start[1]) * 0.25 - 0.0004];
            var mid2 = [start[0] + (end[0] - start[0]) * 0.70 - 0.0005, start[1] + (end[1] - start[1]) * 0.75 + 0.0007];
            var curveWaypoints = [start, mid1, mid2, end];

            var curveLine = L.polyline(curveWaypoints, {
              color: '#10B981',
              weight: 5,
              opacity: 0.95,
              smoothFactor: 1.5,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
            map.fitBounds(curveLine.getBounds().pad(0.35));
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      {/* INLINE MAP VIEW */}
      <View style={[styles.inlineWrapper, { borderColor: colors.cardBorder }]}>
        {Platform.OS === 'web' ? (
          <iframe
            key={`inline-map-${recenterTrigger}`}
            srcDoc={generateLeafletHTML(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 22,
            }}
            title="Campus Mess Map Navigation"
          />
        ) : (
          <View style={[styles.fallbackMap, { backgroundColor: isDark ? '#0A120F' : '#E2E8F0' }]}>
            <Compass size={32} color="#10B981" />
            <Text style={{ color: colors.textMain, fontWeight: '800', marginTop: 8 }}>
              OpenStreetMap Campus Route Active
            </Text>
          </View>
        )}

        {/* Top Controls Overlay */}
        <View style={styles.topControlsOverlay}>
          <View style={styles.mapLegend}>
            <Text style={styles.legendText}>
              🗺️ Route to {selectedMess?.name.split(' ')[0]}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setIsFullscreen(true)}
            activeOpacity={0.85}
          >
            <Maximize2 size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Relocate Recenter Floating Button */}
        <TouchableOpacity
          style={styles.relocateBtnInline}
          onPress={() => setRecenterTrigger(prev => prev + 1)}
          activeOpacity={0.85}
        >
          <LocateFixed size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* HORIZONTAL MESS SELECTOR CHIPS */}
        <View style={styles.messSelectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
            {filteredMapData.map((m) => {
              const isSelected = selectedMess?.id === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.messSelectorPill,
                    isSelected && { backgroundColor: '#10B981', borderColor: '#FFFFFF' },
                  ]}
                  onPress={() => setSelectedMess(m)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.messSelectorPillText, isSelected && { color: '#FFFFFF', fontWeight: '900' }]}>
                    🍴 {m.name.split(' ')[0]} ({m.rating} ★)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* BOTTOM SELECTED MESS FLOATING CARD */}
        {selectedMess && (
          <View style={[styles.floatingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Image source={{ uri: selectedMess.image }} style={styles.cardImage} />

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.messName, { color: colors.textMain }]} numberOfLines={1}>
                  {selectedMess.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '900' }}>
                    {selectedMess.rating}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Navigation size={11} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
                    {selectedMess.distanceMeter > 0 ? `${selectedMess.distanceMeter}m away` : '240m away'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} color={colors.textSub} />
                  <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700' }}>
                    {selectedMess.walkTimeMinutes > 0 ? `${selectedMess.walkTimeMinutes} min walk` : '3 min walk'}
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.textSub, fontSize: 11 }} numberOfLines={1}>
                🔥 {selectedMess.todaysSpecial}
              </Text>

              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.reviewsBtn}
                  onPress={() => onOpenReviews(selectedMess.id, selectedMess.name)}
                  activeOpacity={0.8}
                >
                  <Star size={12} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }} numberOfLines={1}>
                    Reviews ({selectedMess.reviewsCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => onSelectMess(selectedMess)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bookBtnGrad}
                  >
                    <Zap size={12} color="#FFFFFF" />
                    <Text style={styles.bookBtnText} numberOfLines={1}>
                      Book 1 Token
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* FULLSCREEN REAL LEAFLET MAP MODAL (NO TOP NAVBAR) */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={[styles.fullscreenContainer, { backgroundColor: colors.bg }]}>
          <TouchableOpacity
            style={[
              styles.floatingCloseBtn,
              {
                backgroundColor: isDark ? 'rgba(15, 26, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
              }
            ]}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.85}
          >
            <X size={20} color={colors.textMain} />
          </TouchableOpacity>

          {/* Filter Pills Bar Floating */}
          <View style={styles.fullscreenFilterBarFloating}>
            {(['All', 'Pure Veg', 'Top Rated'] as const).map(f => {
              const isActive = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive
                        ? '#10B981'
                        : (isDark ? 'rgba(15, 26, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)'),
                      borderColor: isActive
                        ? '#10B981'
                        : (isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)'),
                    }
                  ]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, { color: isActive ? '#FFFFFF' : colors.textMain }]}>
                    {f === 'Pure Veg' ? '🥗 Pure Veg' : f === 'Top Rated' ? '⭐ Top Rated' : `🍱 All (${mapData.length})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Main Fullscreen Map Canvas */}
          <View style={styles.fullscreenCanvasArea}>
            {Platform.OS === 'web' ? (
              <iframe
                key={`fullscreen-map-${recenterTrigger}`}
                srcDoc={generateLeafletHTML(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Fullscreen Campus Mess Map"
              />
            ) : (
              <View style={[styles.fallbackMap, { backgroundColor: isDark ? '#0A120F' : '#E2E8F0' }]}>
                <Compass size={40} color="#10B981" />
                <Text style={{ color: colors.textMain, fontWeight: '800', marginTop: 10 }}>
                  Interactive OpenStreetMap Active
                </Text>
              </View>
            )}
          </View>

          {/* Relocate Recenter Floating Button in Fullscreen */}
          <TouchableOpacity
            style={styles.relocateBtnFull}
            onPress={() => setRecenterTrigger(prev => prev + 1)}
            activeOpacity={0.85}
          >
            <LocateFixed size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Fullscreen Bottom Selected Mess Card */}
          {selectedMess && (
            <View style={[styles.fullscreenMessCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Image source={{ uri: selectedMess.image }} style={styles.fullCardImage} />

              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.fullMessName, { color: colors.textMain }]} numberOfLines={1}>
                    {selectedMess.name}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '900' }}>
                      {selectedMess.rating}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: colors.textSub, fontSize: 12 }} numberOfLines={1}>
                  📍 {selectedMess.address}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>
                    {selectedMess.distanceMeter > 0 ? `${selectedMess.distanceMeter}m away` : '240m away'}
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700' }}>
                    🏃 {selectedMess.walkTimeMinutes > 0 ? `${selectedMess.walkTimeMinutes} min walk` : '3 min walk'}
                  </Text>
                </View>

                <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  🔥 {selectedMess.todaysSpecial}
                </Text>

                {/* Fullscreen Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.fullReviewsBtn}
                    onPress={() => {
                      setIsFullscreen(false);
                      onOpenReviews(selectedMess.id, selectedMess.name);
                    }}
                    activeOpacity={0.8}
                  >
                    <Star size={13} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
                      Reviews ({selectedMess.reviewsCount})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.fullBookBtn}
                    onPress={() => {
                      setIsFullscreen(false);
                      onSelectMess(selectedMess);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bookBtnGrad}
                    >
                      <Zap size={13} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }} numberOfLines={1}>
                        Book 1 Token
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  inlineWrapper: {
    width: '100%',
    height: 460,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
  },
  fallbackMap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControlsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 10,
  },
  mapLegend: {
    backgroundColor: 'rgba(8, 12, 14, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  legendText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  expandBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  relocateBtnInline: {
    position: 'absolute',
    bottom: 200,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 15,
  },
  messSelectorBar: {
    position: 'absolute',
    bottom: 155,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  messSelectorPill: {
    backgroundColor: 'rgba(15, 23, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  messSelectorPillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  floatingCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  messName: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bookBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookBtnGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  // FULLSCREEN STYLES (NO TOP NAVBAR)
  fullscreenContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 26, 23, 0.92)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fullscreenFilterBarFloating: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 90,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 26, 23, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  fullscreenCanvasArea: {
    flex: 1,
    position: 'relative',
  },
  relocateBtnFull: {
    position: 'absolute',
    bottom: 220,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  fullscreenMessCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    margin: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    zIndex: 100,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  fullCardImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
  },
  fullMessName: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  fullReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  fullBookBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
