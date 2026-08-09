import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Star,
  Navigation,
  Utensils,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Layers,
  Filter,
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
  coords: { x: number; y: number }; // Relative percentage coordinates on campus map grid
  image: string;
  todaysSpecial: string;
  isVegOnly: boolean;
}

interface MessMapViewProps {
  messes: MessMapItem[];
  onSelectMess: (mess: MessMapItem) => void;
  onOpenReviews: (messId: string, messName: string) => void;
}

const DEFAULT_MESSES: MessMapItem[] = [
  {
    id: 'm1',
    name: 'Annapurna Campus Mess',
    category: 'Pure Veg',
    rating: 4.8,
    reviewsCount: 142,
    address: 'Gate 2, North Campus Hub',
    distanceMeter: 240,
    walkTimeMinutes: 3,
    coords: { x: 28, y: 35 },
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
    coords: { x: 68, y: 28 },
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
    coords: { x: 45, y: 62 },
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
    coords: { x: 78, y: 72 },
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
    coords: { x: 18, y: 75 },
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
    todaysSpecial: 'Amritsari Chole & Stuffed Paratha',
    isVegOnly: false,
  },
];

export default function MessMapView({
  messes = DEFAULT_MESSES,
  onSelectMess,
  onOpenReviews,
}: MessMapViewProps) {
  const { isDark } = useAppTheme();
  const mapData = messes.length > 0 ? messes : DEFAULT_MESSES;
  const [selectedMess, setSelectedMess] = useState<MessMapItem>(mapData[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 1.25 = 125%, 1.5 = 150%
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pure Veg' | 'Top Rated'>('All');

  const filteredMapData = mapData.filter(item => {
    if (activeFilter === 'Pure Veg') return item.isVegOnly;
    if (activeFilter === 'Top Rated') return item.rating >= 4.8;
    return true;
  });

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 1.8));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.8));
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(15, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const renderMapCanvas = (isFull: boolean) => (
    <View style={[styles.mapCanvas, { backgroundColor: isDark ? '#0A120F' : '#E2E8F0', transform: [{ scale: zoomLevel }] }]}>
      {/* Decorative Grid Lines & Road Tracks */}
      <View style={styles.gridLineHorizontal1} />
      <View style={styles.gridLineHorizontal2} />
      <View style={styles.gridLineVertical1} />
      <View style={styles.gridLineVertical2} />

      {/* Campus Central Hub Circle */}
      <View style={styles.campusCenterCircle} />

      {/* Student Current Location Marker */}
      <View style={[styles.userPin, { top: '48%', left: '22%' }]}>
        <View style={styles.userPinPulse} />
        <View style={styles.userPinCore}>
          <Compass size={12} color="#FFFFFF" />
        </View>
        <View style={styles.userPinLabel}>
          <Text style={styles.userPinText}>📍 You Are Here</Text>
        </View>
      </View>

      {/* Mess Location Pins on Campus Map */}
      {filteredMapData.map(mess => {
        const isSelected = selectedMess?.id === mess.id;
        return (
          <TouchableOpacity
            key={mess.id}
            style={[
              styles.messPin,
              { top: `${mess.coords.y}%`, left: `${mess.coords.x}%` },
              isSelected && styles.messPinActive,
            ]}
            onPress={() => setSelectedMess(mess)}
            activeOpacity={0.8}
          >
            <View style={[styles.pinBadge, isSelected && styles.pinBadgeSelected]}>
              <Utensils size={12} color={isSelected ? '#FFFFFF' : '#10B981'} />
              <Text style={[styles.pinText, isSelected && { color: '#FFFFFF' }]}>
                {mess.rating} ★
              </Text>
            </View>
            <View style={[styles.pinStem, isSelected && { backgroundColor: '#FFFFFF' }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* INLINE COMPACT MAP VIEW */}
      <View style={[styles.inlineWrapper, { borderColor: colors.cardBorder }]}>
        {renderMapCanvas(false)}

        {/* Top Controls Overlay */}
        <View style={styles.topControlsOverlay}>
          <View style={styles.mapLegend}>
            <Text style={styles.legendText}>📍 Live Campus Mess Map</Text>
          </View>

          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setIsFullscreen(true)}
            activeOpacity={0.85}
          >
            <Maximize2 size={13} color="#FFFFFF" />
            <Text style={styles.expandBtnText}>Expand Map (Fullscreen)</Text>
          </TouchableOpacity>
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
                  <MapPin size={11} color="#10B981" />
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
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.reviewsBtn}
                  onPress={() => onOpenReviews(selectedMess.id, selectedMess.name)}
                  activeOpacity={0.8}
                >
                  <Star size={12} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
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
                    <Text style={styles.bookBtnText}>Pre-Book Meal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* FULLSCREEN INTERACTIVE MAP MODAL */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={[styles.fullscreenContainer, { backgroundColor: colors.bg }]}>
          {/* Fullscreen Top Header Bar */}
          <View style={[styles.fullscreenHeader, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Compass size={22} color="#10B981" />
              <View>
                <Text style={[styles.fullscreenTitle, { color: colors.textMain }]}>Campus Mess Navigation</Text>
                <Text style={{ color: colors.textSub, fontSize: 11 }}>Tap pins to inspect dishes & pre-book</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setIsFullscreen(false)}
              activeOpacity={0.8}
            >
              <X size={20} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Filter Pills Bar */}
          <View style={[styles.fullscreenFilterBar, { backgroundColor: isDark ? '#0F1A17' : '#F1F5F9' }]}>
            {(['All', 'Pure Veg', 'Top Rated'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  activeFilter === f && { backgroundColor: '#10B981', borderColor: '#10B981' }
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterPillText, { color: activeFilter === f ? '#FFFFFF' : colors.textMain }]}>
                  {f === 'Pure Veg' ? '🥗 Pure Veg' : f === 'Top Rated' ? '⭐ Top Rated' : '🗺️ All Messes'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Fullscreen Map Canvas */}
          <View style={styles.fullscreenCanvasArea}>
            {renderMapCanvas(true)}

            {/* Floating Zoom Controls (+ / -) */}
            <View style={styles.zoomControlsContainer}>
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.8}>
                <ZoomIn size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.8}>
                <ZoomOut size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

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
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.fullReviewsBtn}
                    onPress={() => {
                      setIsFullscreen(false);
                      onOpenReviews(selectedMess.id, selectedMess.name);
                    }}
                    activeOpacity={0.8}
                  >
                    <Star size={14} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>
                      Verified Reviews ({selectedMess.reviewsCount})
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
                      <Zap size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                        Pre-Book (1 Token)
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
    height: 420,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
  },
  mapCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineHorizontal1: {
    position: 'absolute',
    top: '30%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  gridLineHorizontal2: {
    position: 'absolute',
    top: '65%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  gridLineVertical1: {
    position: 'absolute',
    left: '35%',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  gridLineVertical2: {
    position: 'absolute',
    left: '70%',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  campusCenterCircle: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  userPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  userPinPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  userPinCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPinLabel: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  userPinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  messPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  messPinActive: {
    zIndex: 10,
    transform: [{ scale: 1.2 }],
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#121A17',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  pinBadgeSelected: {
    backgroundColor: '#10B981',
    borderColor: '#FFFFFF',
  },
  pinText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
  },
  pinStem: {
    width: 2,
    height: 8,
    backgroundColor: '#10B981',
  },
  topControlsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapLegend: {
    backgroundColor: 'rgba(8, 12, 14, 0.85)',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  expandBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
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
    height: 30,
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
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  // FULLSCREEN STYLES
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fullscreenTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeModalBtn: {
    padding: 6,
  },
  fullscreenFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fullscreenCanvasArea: {
    flex: 1,
    position: 'relative',
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 16,
    top: 20,
    gap: 10,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 26, 23, 0.9)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  fullscreenMessCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    margin: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
