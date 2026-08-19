import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Check, Sparkles, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { 
  getPushSubscriptionState, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  isPushSupported 
} from '../../utils/pushManager';

export default function V4NotificationModal({ isOpen, onClose }) {
  const [subscriptionState, setSubscriptionState] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      getPushSubscriptionState().then(setSubscriptionState);
    }
  }, [isOpen]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setMessage(null);
    const result = await subscribeToPushNotifications();
    setIsLoading(false);
    
    if (result.success) {
      setSubscriptionState('subscribed');
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    await unsubscribeFromPushNotifications();
    setIsLoading(false);
    setSubscriptionState('default');
    setMessage({ type: 'info', text: 'Notificaciones desactivadas en este dispositivo.' });
  };

  if (!isOpen) return null;

  const supported = isPushSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_40px_rgba(0,229,255,0.3)] text-left">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,229,255,0.4)] shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/80 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider mb-0.5">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Avisos en Tiempo Real</span>
            </div>
            <h3 className="text-lg font-black text-white">Notificaciones Capa Cero</h3>
          </div>
        </div>

        {/* Estado actual y mensajes */}
        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold mb-4 ${
            message.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' :
            message.type === 'error' ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50' :
            'bg-blue-950/80 text-cyan-200 border border-cyan-500/50'
          }`}>
            {message.text}
          </div>
        )}

        {!supported ? (
          <div className="p-4 bg-zinc-900 rounded-2xl text-xs text-zinc-400 leading-relaxed">
            Tu navegador actual no soporta notificaciones Web Push. Si estás en iPhone, asegúrate de haber añadido primero la app a tu pantalla de inicio desde Safari.
          </div>
        ) : subscriptionState === 'subscribed' ? (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs font-semibold">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Este dispositivo tiene las notificaciones activadas. Recibirás avisos de nuevos vídeos y directos.</span>
            </div>

            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-300 border border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BellOff className="w-4 h-4" />
              <span>Desactivar en este dispositivo</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Sé el primero en enterarte cuando publiquemos un nuevo tutorial de <strong>Bambu Studio</strong>, lección de <strong>Fusion 360</strong>, trucos maker o directos.
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>100% Privado y Directo:</strong> Sin spam, sin publicidad de terceros y sin pedirte correo electrónico. Puedes desactivarlo cuando quieras.
              </p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white font-extrabold rounded-2xl shadow-[0_0_25px_rgba(0,229,255,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{isLoading ? 'Activando...' : 'Activar Notificaciones Push'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
