import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { UrlTile, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

export interface Location {
  latitude: number;
  longitude: number;
}

interface OSMMapMarker {
  id: string;
  coordinate: Location;
  title?: string;
  description?: string;
  pinColor?: string;
}

interface MapViewOSMProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: OSMMapMarker[];
  onRegionChangeComplete?: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
}

export const MapViewOSM: React.FC<MapViewOSMProps> = ({
  initialRegion,
  markers = [],
  onRegionChangeComplete,
}) => {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        // CRITICAL: setting mapType to "none" stops loading default Google/Apple vector graphics, 
        // saving standard API billing usage entirely.
        mapType="none"
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <UrlTile
          /**
           * Google Maps standard tile template.
           */
          urlTemplate="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maximumZ={20}
          minimumZ={0}
          shouldReplaceMapContent={true}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor || '#E11D48'} // Default Tailwind Rose-600 color
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
