import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
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
    coords: { x: 30, y: 35 },
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
    coords: { x: 65, y: 25 },
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
    coords: { x: 45, y: 60 },
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
    coords: { x: 75, y: 70 },
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
    todaysSpecial: 'Unlimited Gujarati Thali',
    isVegOnly: true,
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

  const colors = {
    cardBg: isDark ? 'rgba(15, 26, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  return (
    <View style={styles.container}>
      {/* MAP CANVAS GRID CONTAINER */}
      <View style={[styles.mapCanvas, { backgroundColor: isDark ? '#0A120F' : '#E2E8F0' }]}>
        {/* Decorative Grid Lines */}
        <View style={styles.gridLineHorizontal1} />
        <View style={styles.gridLineHorizontal2} />
        <View style={styles.gridLineVertical1} />
        <View style={styles.gridLineVertical2} />

        {/* Student Current Location Marker */}
        <View style={[styles.userPin, { top: '50%', left: '20%' }]}>
          <View style={styles.userPinPulse} />
          <View style={styles.userPinCore}>
            <Compass size={12} color="#FFFFFF" />
          </View>
          <View style={styles.userPinLabel}>
            <Text style={styles.userPinText}> You Are Here</Text>
          </View>
        </View>

        {/* Mess Location Pins on Campus Map */}
        {mapData.map(mess => {
          const isSelected = selectedMess.id === mess.id;
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
              <View style={styles.pinStem} />
            </TouchableOpacity>
          );
        })}

        {/* Map Watermark & Distance Legend */}
        <View style={styles.mapLegend}>
          <Text style={styles.legendText}>📍 Live Campus Map • Walking Radius</Text>
        </View>
      </View>

      {/* SELECTED MESS FLOATING CARD */}
      {selectedMess && (
        <View style={[styles.floatingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Image source={{ uri: selectedMess.image }} style={styles.cardImage} />

          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.messName, { color: colors.textMain }]} numberOfLines={1}>
                {selectedMess.name}
              </Text>
              <View style={styles.ratingBadge}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '900' }}>
                  {selectedMess.rating}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
                  {selectedMess.distanceMeter}m away
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700' }}>
                  {selectedMess.walkTimeMinutes} min walk
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
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
    marginBottom: 16,
  },
  mapCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridLineHorizontal1: {
    position: 'absolute',
    top: '30%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  gridLineHorizontal2: {
    position: 'absolute',
    top: '65%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  gridLineVertical1: {
    position: 'absolute',
    left: '35%',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  gridLineVertical2: {
    position: 'absolute',
    left: '70%',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  userPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPinPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  userPinCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPinLabel: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  userPinText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  messPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  messPinActive: {
    zIndex: 10,
    transform: [{ scale: 1.15 }],
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
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
  mapLegend: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(8, 12, 14, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  legendText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
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
    width: 70,
    height: 70,
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
});
