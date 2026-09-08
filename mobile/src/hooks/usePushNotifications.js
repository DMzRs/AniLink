import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../api/notifications';

// Foreground handling: show banner even when app is foregrounded (trust signal, per spec)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function createAndroidChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E5339',
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export function usePushNotifications() {
  const { token, user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  // Register token when auth changes (tied to notifications table via backend)
  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!token || !user) return; // need auth to POST /push-token (per spec tied to user)
      if (Platform.OS === 'web') return; // web push requires VAPID + service worker, not Expo — use polling fallback (notifications table)

      await createAndroidChannels();

      if (!Device.isDevice) {
        // Expo Go on web/simulator: use mock token for local dev so backend flow can be tested
        const mock = `ExponentPushToken[mock-${user.id}-${Date.now()}]`;
        if (!cancelled) setExpoPushToken(mock);
        console.log('[Push] Simulator — using mock token', mock);
        // Do not POST mock in simulator; web push not supported. Keep for e2e logs.
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (!cancelled) setPermissionStatus(finalStatus);
      if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted:', finalStatus);
        return;
      }

      // projectId is required for getExpoPushTokenAsync on EAS (SDK 57)
      // Fallback: try without projectId for classic Expo Go
      let pushToken = null;
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId) {
          const res = await Notifications.getExpoPushTokenAsync({ projectId });
          pushToken = res.data;
        } else {
          const res = await Notifications.getExpoPushTokenAsync();
          pushToken = res.data;
        }
      } catch (e) {
        console.log('[Push] getExpoPushTokenAsync failed, using mock for dev:', e.message);
        pushToken = `ExponentPushToken[dev-${user.id}-${String(Math.random()).slice(2, 10)}]`;
      }

      if (!pushToken || cancelled) return;
      setExpoPushToken(pushToken);

      try {
        await registerPushToken(pushToken, Platform.OS);
        console.log('[Push] Registered with backend:', pushToken.slice(0, 24) + '…');
      } catch (e) {
        console.log('[Push] Backend register failed (offline queuing — will retry):', e.message);
      }
    }

    register();
    return () => { cancelled = true; };
  }, [token, user]);

  // Foreground + tap listeners (spec: new order alerts farmer, status updates buyer)
  useEffect(() => {
    if (Platform.OS === 'web' || !Device.isDevice) return; // web + simulator: push not supported, avoids expo-notifications web warnings

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Received foreground:', notification.request.content.title, notification.request.content.data);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Push] Tapped:', data);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return { expoPushToken, permissionStatus };
}
