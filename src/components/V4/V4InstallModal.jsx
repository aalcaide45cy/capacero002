import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Sparkles, Share, PlusSquare, ArrowRight, ShieldCheck } from 'lucide-react';

import { subscribeToPushNotifications } from '../../utils/pushManager';

export default function V4InstallModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada / abierta como PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Detectar si es dispositivo iOS (iPhone / iPad)
    const ua = navigator.userAgent || '';
    const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    // Escuchar el evento nativo de instalación en Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      // Fallback si el navegador no soporta beforeinstallprompt
      subscribeToPushNotifications();
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledSuccessfully(true);
      // Solicitar permiso nativo de notificaciones del sistema
      setTimeout(() => {
        subscribeToPushNotifications();
      }, 500);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

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

        {/* Cabecera con Icono de App */}
        <div className="flex items-center gap-4 mb-5">
          <img
            src="/icon-192.png"
            alt="Capa Cero 3D"
            width="56"
            height="56"
            className="w-14 h-14 rounded-2xl border border-cyan-400/50 shadow-[0_0_15px_rgba(0,229,255,0.4)] object-contain bg-black"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>App Oficial</span>
            </div>
            <h3 className="text-lg font-black text-white leading-tight">Instalar Capa Cero 3D</h3>
          </div>
        </div>

        {/* Contenido según dispositivo */}
        {installedSuccessfully ? (
          <div className="py-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mb-3">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-white mb-1">¡App Instalada con Éxito!</h4>
            <p className="text-xs text-zinc-300">Ya puedes acceder a Capa Cero 3D directamente desde la pantalla de inicio de tu teléfono.</p>
          </div>
        ) : isIOS ? (
          /* ================= GUÍA PASO A PASO PARA IPHONE / IPAD (SAFARI) ================= */
          <div className="flex flex-col gap-3.5 text-xs text-zinc-300">
            <p className="leading-relaxed text-zinc-200">
              Para tener Capa Cero en la pantalla de inicio de tu iPhone como una app nativa:
            </p>
            
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0 font-black">
                1
              </div>
              <p className="leading-snug">
                Pulsa el botón <strong>Compartir</strong> <Share className="w-4 h-4 inline-block text-cyan-400 mx-1" /> en la barra inferior de Safari.
              </p>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0 font-black">
                2
              </div>
              <p className="leading-snug">
                Baja en el menú y selecciona <strong>"Añadir a pantalla de inicio"</strong> <PlusSquare className="w-4 h-4 inline-block text-cyan-400 mx-1" />.
              </p>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0 font-black">
                3
              </div>
              <p className="leading-snug">
                Pulsa <strong>"Añadir"</strong> arriba a la derecha. ¡Listo!
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-95 transition-all text-center"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* ================= BOTÓN 1-CLIC PARA ANDROID / CHROME / ESCRITORIO ================= */
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Instala la aplicación oficial en tu teléfono u ordenador para acceder más rápido, navegar a pantalla completa sin barras del navegador y recibir avisos de nuevos tutoriales.
            </p>

            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Ligera (0 MB), sin descargas pesadas y 100% segura.</span>
            </div>

            <button
              onClick={handleNativeInstall}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white font-extrabold rounded-2xl shadow-[0_0_25px_rgba(0,229,255,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar en Pantalla de Inicio</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
