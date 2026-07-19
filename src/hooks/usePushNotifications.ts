import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

// Safely resolve Notifications & Device modules dynamically to prevent compilation breaks
let Notifications: any = null;
let Device: any = null;

try {
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.warn('expo-notifications module not yet installed.');
}

try {
  Device = require('expo-device');
} catch (e) {
  console.warn('expo-device module not yet installed.');
}

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: any | null;
  error: Error | null;
  loading: boolean;
}

export function usePushNotifications(userId?: string | null, role: 'customer' | 'owner' | 'rider' = 'customer'): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function registerAndSaveToken() {
      try {
        setLoading(true);

        if (!Notifications) {
          console.log('[PushNotifications] expo-notifications package is required for push token generation.');
          return;
        }

        // 1. Setup Custom Android Notification Channel with custom ringtone
        if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
          await Notifications.setNotificationChannelAsync('order_alerts', {
            name: 'Order & Delivery Alerts',
            importance: Notifications.AndroidImportance?.MAX || 5,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4AF37', // Hotel Bet Gold Accent
            sound: 'cash_register.mp3', // References assets/cash-register.mp3
            enableVibrate: true,
            showBadge: true,
          });
        }

        // 2. Check Physical Device & Request Permissions
        const isPhysicalDevice = Device ? Device.isDevice : Platform.OS !== 'web';
        if (!isPhysicalDevice) {
          console.warn('Push Notifications require a physical device.');
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          throw new Error('Permission not granted for push notifications.');
        }

        // 3. Fetch Expo Push Token
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        const token = tokenData.data;
        if (isMounted) {
          setExpoPushToken(token);
        }

        // 4. Save/Update Push Token in Supabase Database
        if (userId && token) {
          const { error: dbError } = await supabase
            .from('user_push_tokens')
            .upsert(
              {
                user_id: userId,
                role: role,
                expo_push_token: token,
                device_os: Platform.OS,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,role' }
            );

          if (dbError) {
            console.error('Failed to save push token to Supabase:', dbError.message);
          } else {
            console.log(`[PushNotification] Saved token for user ${userId} (${role})`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
        }
        console.warn('Push notification registration notice:', err?.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    registerAndSaveToken();

    // 5. Listeners for incoming notifications & user taps
    if (Notifications && typeof Notifications.addNotificationReceivedListener === 'function') {
      notificationListener.current = Notifications.addNotificationReceivedListener((incoming: any) => {
        if (isMounted) {
          setNotification(incoming);
        }
      });
    }

    if (Notifications && typeof Notifications.addNotificationResponseReceivedListener === 'function') {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data;
        console.log('[PushNotification] User tapped notification data:', data);
      });
    }

    return () => {
      isMounted = false;
      if (Notifications) {
        if (notificationListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      }
    };
  }, [userId, role]);

  return { expoPushToken, notification, error, loading };
}
