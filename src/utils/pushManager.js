/**
 * Capa Cero 3D - Web Push & PWA Manager (100% Self-Hosted / Zero 3rd Parties)
 */

import { SHEETS_DB_URL } from './analytics';

// Clave Pública VAPID oficial de Capa Cero 3D
export const VAPID_PUBLIC_KEY = 'BEOU0E1RrejUcC2jauuW_M3QWaVXstMPuGqxoBNLC3zud9NFAKece21xxQC6evzt9EsX4N5z_mHfUrThlZHci-s';

const PUSH_STORAGE_KEY = 'capacero_push_subscribed_v1';

/**
 * Convierte una clave VAPID base64 URL-safe en Uint8Array para el navegador
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra el Service Worker de la PWA
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (error) {
    console.warn('Error registrando Service Worker:', error);
    return null;
  }
}

/**
 * Comprueba si el dispositivo y navegador soportan Web Push
 */
export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Obtiene el estado actual de permisos de notificación
 */
export async function getPushSubscriptionState() {
  if (!isPushSupported()) return 'unsupported';
  
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'default';

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return 'subscribed';
    }
    return 'granted';
  } catch (e) {
    return Notification.permission;
  }
}

/**
 * Detecta dispositivo y sistema operativo
 */
function getDeviceContext() {
  const ua = navigator.userAgent || '';
  let os = 'Desconocido';
  let device = 'Escritorio';

  if (/android/i.test(ua)) {
    os = 'Android';
    device = 'Móvil';
  } else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iOS';
    device = 'iPhone / iPad';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  let browser = 'Desconocido';
  if (/chrome|crios/i.test(ua) && !/edge|edg|opr/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';

  return { os, device, browser };
}

/**
 * Solicita permiso y suscribe el dispositivo a las notificaciones Push VAPID
 */
export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    return { success: false, message: 'Tu navegador o dispositivo no soporta notificaciones push.' };
  }

  try {
    // 1. Pedir permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permiso de notificaciones denegado.' };
    }

    // 2. Obtener registro de Service Worker
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }
    await navigator.serviceWorker.ready;

    // 3. Crear suscripción VAPID
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    const subJson = subscription.toJSON();
    const { os, device, browser } = getDeviceContext();

    // 4. Enviar suscripción a Google Sheets (100% privado y propio)
    const payload = {
      type: 'push_subscription',
      timestamp: new Date().toISOString(),
      endpoint: subJson.endpoint || '',
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
      device: device,
      os: os,
      browser: browser,
      isPwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    };

    if (SHEETS_DB_URL) {
      try {
        await fetch(SHEETS_DB_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Error enviando suscripción push a Google Sheets:', err);
      }
    }

    localStorage.setItem(PUSH_STORAGE_KEY, 'true');
    window.dispatchEvent(new CustomEvent('capacero-push-changed', { detail: { state: 'subscribed' } }));

    return { 
      success: true, 
      message: '¡Notificaciones activadas con éxito! Te avisaremos con cada nuevo vídeo y directo.' 
    };

  } catch (error) {
    console.error('Error suscribiendo a push:', error);
    return { success: false, message: 'No se pudo completar la suscripción: ' + (error.message || error) };
  }
}

/**
 * Cancela la suscripción a notificaciones
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem(PUSH_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('capacero-push-changed', { detail: { state: 'unsubscribed' } }));
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Error desuscribiendo:', e);
    return false;
  }
}
