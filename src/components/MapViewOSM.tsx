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
           * Standard OpenStreetMap PNG tile template.
           * Bypasses proprietary map API billing by fetching open raster maps.
           */
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          minimumZ={0}
          // replaces the grey background grids with the downloaded tiles
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
