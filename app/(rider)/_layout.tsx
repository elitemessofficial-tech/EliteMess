import React from 'react';
import { Stack } from 'expo-router';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="rider_dashboard" />
    </Stack>
  );
}
