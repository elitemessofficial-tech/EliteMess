import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

// Default fallback campus center (e.g. Pune / Mumbai Campus area)
const FALLBACK_LOCATION: UserCoordinates = {
  latitude: 18.5204,
  longitude: 73.8567,
};

let cachedUserLocation: UserCoordinates | null = null;

/**
 * Calculate accurate distance in meters between two GPS coordinates (Haversine formula)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format meters & walking time string (e.g. "240m (3 min walk)" or "1.2 km (15 min walk)")
 */
export function formatDistanceAndWalkTime(distanceMeters: number): {
  distanceStr: string;
  walkTimeMinutes: number;
  formattedLabel: string;
} {
  const walkTimeMinutes = Math.max(1, Math.ceil(distanceMeters / 80)); // 80m per min average walking speed

  let distanceStr = `${distanceMeters}m`;
  if (distanceMeters >= 1000) {
    distanceStr = `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return {
    distanceStr,
    walkTimeMinutes,
    formattedLabel: `${distanceStr} (${walkTimeMinutes} min walk)`,
  };
}

/**
 * Request GPS permission & fetch current student location accurately
 */
export async function getCurrentStudentLocation(): Promise<UserCoordinates> {
  if (cachedUserLocation) return cachedUserLocation;

  try {
    if (Platform.OS === 'web') {
      if ('geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              cachedUserLocation = coords;
              resolve(coords);
            },
            () => resolve(FALLBACK_LOCATION),
            { timeout: 8000, enableHighAccuracy: true }
          );
        });
      }
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        cachedUserLocation = coords;
        return coords;
      }
    }
  } catch (e) {
    console.warn('GPS location fetch fallback used:', e);
  }

  return FALLBACK_LOCATION;
}
