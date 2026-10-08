/**
 * Capa Cero 3D - Web Push & PWA Manager (100% Self-Hosted / Zero 3rd Parties)
 */

import { SHEETS_DB_URL, getGeoLocation } from './analytics';

// Clave Pública VAPID oficial de Capa Cero 3D (rotada en Fase 02 de seguridad)
export const VAPID_PUBLIC_KEY = 'BB1OXByPbiP9Y2ADikAImkmfqjNArnVUo6oQ_iRe1rHYF16thPUitNAArFTHVrtrP6rBpoU5Kh-4bvRfk7LlSo8';

const PUSH_STORAGE_KEY = 'capacero_push_subscribed_v1';
const PUSH_VAPID_KEY_STORAGE = 'capacero_push_vapid_key';

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
 * Compara dos Uint8Array byte a byte
 */
function areUint8ArraysEqual(a, b) {
  if (!a || !b) return false;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Comprueba si la clave pública de una suscripción coincide con la clave VAPID actual
 */
function doesSubscriptionMatchVapid(subscription) {
  if (!subscription || !subscription.options || !subscription.options.applicationServerKey) {
    return false;
  }
  try {
    const subKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
    const targetKeyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    return areUint8ArraysEqual(subKeyBytes, targetKeyBytes);
  } catch (e) {
    return false;
  }
}

/**
 * Registra el Service Worker de la PWA y comprueba rotación silenciosa si ya está suscrito
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if ('Notification' in window && Notification.permission === 'granted') {
      checkAndRotatePushSubscriptionSilent().catch(() => {});
    }
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

    // 3. Obtener suscripción existente o crear una nueva VAPID
    let subscription = await registration.pushManager.getSubscription();

    // Si la suscripción existente no coincide con la clave VAPID actual o no se puede leer, renovarla
    if (subscription && !doesSubscriptionMatchVapid(subscription)) {
      try {
        await subscription.unsubscribe();
      } catch (unsubErr) {
        console.warn('Error al cancelar suscripción previa no coincidente:', unsubErr);
      }
      subscription = null;
    }

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    if (!subscription) {
      throw new Error('No se pudo generar la suscripción Push en el navegador');
    }

    const subJson = subscription.toJSON();
    const { os, device, browser } = getDeviceContext();

    // Detección silenciosa por IP y zona horaria (0 permisos de ubicación al usuario)
    let geo = { country: 'España', countryCode: 'ES', flag: '🇪🇸', region: 'Madrid', city: 'Madrid' };
    try {
      geo = await getGeoLocation();
    } catch (e) {}
    const timezone = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Europe/Madrid';

    // 4. Enviar suscripción a Google Sheets (100% privado y propio)
    const payload = {
      type: 'push_subscription',
      timestamp: new Date().toISOString(),
      endpoint: subJson.endpoint || '',
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
      country: geo.country || 'España',
      countryCode: geo.countryCode || 'ES',
      flag: geo.flag || '🇪🇸',
      region: geo.region || geo.city || '',
      city: geo.city || '',
      timezone: timezone,
      device: device,
      os: os,
      browser: browser,
      isPwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    };

    if (SHEETS_DB_URL && payload.endpoint) {
      try {
        const jsonPayload = JSON.stringify(payload);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([jsonPayload], { type: 'text/plain;charset=utf-8' });
          navigator.sendBeacon(SHEETS_DB_URL, blob);
        } else {
          await fetch(SHEETS_DB_URL, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: jsonPayload
          });
        }
      } catch (err) {
        console.warn('Error enviando suscripción push a Google Sheets:', err);
      }
    }

    localStorage.setItem(PUSH_STORAGE_KEY, 'true');
    localStorage.setItem(PUSH_VAPID_KEY_STORAGE, VAPID_PUBLIC_KEY);
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
      localStorage.removeItem(PUSH_VAPID_KEY_STORAGE);
      window.dispatchEvent(new CustomEvent('capacero-push-changed', { detail: { state: 'unsubscribed' } }));
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Error desuscribiendo:', e);
    return false;
  }
}

/**
 * Rota la suscripción silenciosamente en segundo plano si la clave VAPID ha cambiado
 */
export async function checkAndRotatePushSubscriptionSilent() {
  if (!isPushSupported() || typeof window === 'undefined') return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();

    const isMatching = doesSubscriptionMatchVapid(existingSub);
    const savedKey = localStorage.getItem(PUSH_VAPID_KEY_STORAGE);

    // Si ya existe suscripción, coincide la clave en PushManager y está guardada, no hace falta renovar
    if (existingSub && isMatching && savedKey === VAPID_PUBLIC_KEY) {
      return false;
    }

    // Si existe suscripción pero la clave no coincide o no se puede leer, desuscribir antes de renovar
    if (existingSub && !isMatching) {
      try {
        await existingSub.unsubscribe();
      } catch (unsubErr) {
        console.warn('Error al desuscribir suscripción obsoleta o con clave diferente:', unsubErr);
      }
    }

    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    if (newSub) {
      const subJson = newSub.toJSON();
      const { os, device, browser } = getDeviceContext();
      let geo = { country: 'España', countryCode: 'ES', flag: '🇪🇸', region: 'Madrid', city: 'Madrid' };
      try { geo = await getGeoLocation(); } catch (e) {}
      const timezone = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Europe/Madrid';

      const payload = {
        type: 'push_subscription',
        timestamp: new Date().toISOString(),
        endpoint: subJson.endpoint || '',
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
        country: geo.country || 'España',
        countryCode: geo.countryCode || 'ES',
        flag: geo.flag || '🇪🇸',
        region: geo.region || geo.city || '',
        city: geo.city || '',
        timezone: timezone,
        device: device,
        os: os,
        browser: browser,
        isPwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      };

      if (SHEETS_DB_URL && payload.endpoint) {
        const jsonPayload = JSON.stringify(payload);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(SHEETS_DB_URL, new Blob([jsonPayload], { type: 'text/plain;charset=utf-8' }));
        } else {
          await fetch(SHEETS_DB_URL, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: jsonPayload
          });
        }
      }

      localStorage.setItem(PUSH_STORAGE_KEY, 'true');
      localStorage.setItem(PUSH_VAPID_KEY_STORAGE, VAPID_PUBLIC_KEY);
      return true;
    }
  } catch (err) {
    console.warn('Rotación silenciosa push no requerida o cancelada:', err);
  }
  return false;
}

// Comprobación automática al cargar la web si las notificaciones ya fueron concedidas
if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
  if (Notification.permission === 'granted') {
    if (document.readyState === 'complete') {
      checkAndRotatePushSubscriptionSilent().catch(() => {});
    } else {
      window.addEventListener('load', () => {
        checkAndRotatePushSubscriptionSilent().catch(() => {});
      }, { once: true });
    }
  }
}

