import React, { useState, useEffect } from 'react';
import { Bell, Check, BellRing } from 'lucide-react';
import { isPushSupported, getPushSubscriptionState, subscribeToPushNotifications } from '../../utils/pushManager';

export default function V4NotificationBell({ onOpenInstallModal, className = '' }) {
  const [subscriptionState, setSubscriptionState] = useState('checking'); // 'checking' | 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar iOS
    const ua = navigator.userAgent || '';
    const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    async function checkState() {
      if (!isPushSupported()) {
        setSubscriptionState('unsupported');
        return;
      }
      try {
        const state = await getPushSubscriptionState();
        if (state === 'subscribed') {
          setSubscriptionState('subscribed');
        } else if (state === 'denied') {
          setSubscriptionState('denied');
        } else {
          setSubscriptionState('unsubscribed');
        }
      } catch {
        setSubscriptionState('unsubscribed');
      }
    }

    checkState();
  }, []);

  const handleClick = async (e) => {
    e.preventDefault();
    if (isSubscribing) return;

    // En iOS, Web Push exige añadir la PWA a la pantalla de inicio primero
    if (isIOS) {
      if (onOpenInstallModal) {
        onOpenInstallModal();
      }
      return;
    }

    // En Escritorio y Android, activar Web Push nativo directamente sin instalar PWA
    setIsSubscribing(true);
    try {
      const result = await subscribeToPushNotifications();
      if (result.success) {
        setSubscriptionState('subscribed');
      } else if (Notification.permission === 'denied') {
        setSubscriptionState('denied');
      }
    } catch (err) {
      console.warn('Error al activar notificaciones:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Si no está soportado o los permisos fueron denegados explícitamente en el navegador
  if (subscriptionState === 'unsupported' || subscriptionState === 'denied') {
    return null;
  }

  // Si ya está suscrito
  if (subscriptionState === 'subscribed') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 h-11 px-3.5 bg-zinc-950/70 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold select-none ${className}`}
        title="Notificaciones activadas para nuevos tutoriales"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Avisos activos</span>
      </div>
    );
  }

  // Estado: No suscrito -> Botón animado discreto
  return (
    <button
      onClick={handleClick}
      disabled={isSubscribing}
      className={`group relative flex items-center justify-center gap-2 h-11 px-4 sm:px-5 bg-zinc-950/90 hover:bg-zinc-900 text-zinc-200 hover:text-white font-extrabold text-xs sm:text-sm rounded-full border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_22px_rgba(0,229,255,0.4)] transition-all duration-300 active:scale-95 cursor-pointer ${className}`}
      title={isIOS ? 'Añadir a pantalla de inicio para recibir avisos de nuevos vídeos' : 'Activar avisos de nuevos vídeos en este dispositivo'}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
      </span>

      <BellRing className={`w-4 h-4 text-cyan-400 transition-transform group-hover:rotate-12 ${isSubscribing ? 'animate-spin' : ''}`} />

      <span>{isSubscribing ? 'Activando...' : 'Activar avisos'}</span>
    </button>
  );
}
