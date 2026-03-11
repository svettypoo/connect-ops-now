/**
 * Push notification registration for:
 * - Android APK: Capacitor PushNotifications (FCM)
 * - iOS PWA: Web Push API (VAPID)
 */
import { Capacitor } from '@capacitor/core';
import api from '@/api/inboxAiClient';

// Event bridge — usePhone listens to this to wake/reconnect on incoming call push
export const callEventEmitter = new EventTarget();

const VAPID_PUBLIC_KEY = 'BJWIfBkuXOz1k83sCsdCZx0UlhrcWAcB8QS9yqLi9AIxCuz5P9N7TWM21ytUlV_Ps-VgGIz-xBX7AZucjz22daY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ── Android APK (Capacitor FCM) ───────────────────────────────────────────────
async function initCapacitorPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM] Token:', token.value);
      await api.registerPushToken({ type: 'fcm', token: token.value }).catch(() => {});
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[FCM] Registration error:', err.error);
    });

    // Foreground: push arrived while app is open
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const data = notification.data || {};
      console.log('[FCM] Push received:', notification.title, data.type);
      if (data.type === 'incoming_call') {
        callEventEmitter.dispatchEvent(new CustomEvent('incoming_call', { detail: data }));
      }
    });

    // Background/killed: user tapped the notification to open the app
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data || {};
      console.log('[FCM] Push tapped:', action.notification.title, data.type);
      if (data.type === 'incoming_call') {
        callEventEmitter.dispatchEvent(new CustomEvent('incoming_call', { detail: data }));
      }
    });
  } catch (e) {
    console.warn('[FCM] init error:', e.message);
  }
}

// ── iOS / Web Push (VAPID) ────────────────────────────────────────────────────
async function initWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await api.registerPushToken({ type: 'webpush', subscription: sub.toJSON() }).catch(() => {});
    console.log('[WebPush] Subscribed');
  } catch (e) {
    console.warn('[WebPush] init error:', e.message);
  }
}

// ── Entry point (called after auth) ──────────────────────────────────────────
export async function initPushNotifications() {
  if (Capacitor.isNativePlatform()) {
    await initCapacitorPush();
  } else {
    // Web (iOS Safari 16.4+ PWA, or desktop Chrome)
    if (Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission === 'granted') {
      await initWebPush();
    }
  }
}
