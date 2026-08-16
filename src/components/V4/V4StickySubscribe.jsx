import React, { useState } from 'react';
import { X, Youtube, Mail } from 'lucide-react';
import { trackSubscribe } from '../../utils/analytics';

export default function V4StickySubscribe({ isSticky = false, onOpenCollaboration }) {
  const [isDismissed, setIsDismissed] = useState(false);

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <>
      {/* ================= 1. BOTONES FLOTANTES EN MÓVIL (Solo en móviles, aparecen sincronizados con la barra sticky) ================= */}
      <div
        className={`fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 md:hidden transform transition-all ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
        style={{
          transitionProperty: 'transform, opacity, scale',
          transitionDuration: '450ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform, opacity'
        }}
      >
        {/* Botón Flotante 1: Sobre (Colaboraciones) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onOpenCollaboration && onOpenCollaboration();
          }}
          aria-label="Contactar para Colaboraciones"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,117,196,0.7)] border-2 border-cyan-300/60 active:scale-90 transition-transform duration-200"
          title="Colaboraciones"
        >
          <Mail className="w-5 h-5 text-white drop-shadow" />
        </button>

        {/* Botón Flotante 2: Icono de YouTube (Suscribirse) con color Azul Eléctrico oficial */}
        <a
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSubscribe && trackSubscribe('Botón Flotante YouTube (Mobile)')}
          aria-label="Suscribirme a Capa Cero en YouTube"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,117,196,0.7)] border-2 border-cyan-300/60 active:scale-90 transition-transform duration-200"
          title="Suscribirme al Canal"
        >
          <Youtube className="w-6 h-6 text-white fill-white drop-shadow" />
        </a>
      </div>

      {/* ================= 2. TARJETA EN ESCRITORIO (Solo PC / Tablets) ================= */}
      {isSticky && !isDismissed && (
        <div className="hidden md:block fixed bottom-5 right-6 max-w-md z-40 animate-fade-in">
          <div className="bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-left ring-1 ring-cyan-500/20 shadow-blue-950/50">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30 border border-cyan-300/40">
                <Youtube className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                  Capa Cero 3D en YouTube
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Tutoriales y trucos de Bambu Studio directo al grano.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSubscribe('Barra Flotante Desktop')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-cyan-300/40"
              >
                Suscribirme
              </a>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                aria-label="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

