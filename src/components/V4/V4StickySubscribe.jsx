import React, { useState, useEffect, useRef } from 'react';
import { X, Youtube, Mail } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import { PatreonIcon } from './PatreonIcon';
import { trackSubscribe } from '../../utils/analytics';

export default function V4StickySubscribe({ isSticky = false, onOpenCollaboration }) {
  // Estados para PC: cada una de las 3 tarjetas se puede minimizar individualmente
  const [isPatreonDismissed, setIsPatreonDismissed] = useState(false);
  const [isCollabDismissed, setIsCollabDismissed] = useState(false);
  const [isYoutubeDismissed, setIsYoutubeDismissed] = useState(false);

  // Estado para Móvil: expandido durante 2 segundos y luego se encoge suavemente
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const mobileTimerRef = useRef(null);
  const prevStickyRef = useRef(false);

  const patreonUrl = "https://www.patreon.com/Capacero3d";
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  // Control de la animación de 2 segundos en móvil al hacerse sticky
  useEffect(() => {
    if (isSticky && !prevStickyRef.current) {
      setMobileExpanded(true);
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
      mobileTimerRef.current = setTimeout(() => {
        setMobileExpanded(false);
      }, 2000);
    } else if (!isSticky) {
      setMobileExpanded(true);
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    }
    prevStickyRef.current = isSticky;

    return () => {
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    };
  }, [isSticky]);

  return (
    <>
      {/* ==============================================================================
          1. DISPOSITIVOS MÓVILES (md:hidden)
          3 Botones flotantes abajo a la derecha:
          - Al hacer scroll aparecen expandidos mostrando texto (Ir a Patreon, COLABORACIONES, Ir al canal).
          - A los 2 segundos exactos se encogen suavemente a círculos con su respectivo icono.
          ============================================================================== */}
      <div
        className={`fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2.5 md:hidden transform transition-all duration-500 ease-out ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {/* Botón 1 Móvil: PATREON */}
        <a
          href={patreonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`h-11 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 text-white flex items-center shadow-[0_0_18px_rgba(249,104,84,0.65)] border-2 border-orange-300/70 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden cursor-pointer ${
            mobileExpanded ? 'px-4 w-auto' : 'w-11 justify-center px-0'
          }`}
          title="Ir a Patreon"
          aria-label="Ir a Patreon"
        >
          <PatreonIcon className="w-5 h-5 text-white fill-current shrink-0 drop-shadow" />
          <span
            className={`font-black text-xs tracking-wide whitespace-nowrap transition-all duration-500 ease-in-out ${
              mobileExpanded ? 'max-w-[130px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            Ir a Patreon
          </span>
        </a>

        {/* Botón 2 Móvil: COLABORACIONES */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onOpenCollaboration && onOpenCollaboration();
          }}
          className={`h-11 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white flex items-center shadow-[0_0_18px_rgba(37,117,196,0.75)] border-2 border-cyan-300/70 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden cursor-pointer ${
            mobileExpanded ? 'px-4 w-auto' : 'w-11 justify-center px-0'
          }`}
          title="Colaboraciones"
          aria-label="Contactar para Colaboraciones"
        >
          <Mail className="w-5 h-5 text-white shrink-0 drop-shadow" />
          <span
            className={`font-black text-xs tracking-wide whitespace-nowrap transition-all duration-500 ease-in-out ${
              mobileExpanded ? 'max-w-[150px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            COLABORACIONES
          </span>
        </button>

        {/* Botón 3 Móvil: YOUTUBE */}
        <a
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSubscribe && trackSubscribe('Botón Flotante YouTube (Mobile)')}
          className={`h-11 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white flex items-center shadow-[0_0_18px_rgba(37,117,196,0.75)] border-2 border-cyan-300/70 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden cursor-pointer ${
            mobileExpanded ? 'px-4 w-auto' : 'w-11 justify-center px-0'
          }`}
          title="Ir al canal de YouTube"
          aria-label="Ir al canal de YouTube"
        >
          <YouTubeIcon className="w-5 h-5 text-white shrink-0 drop-shadow" />
          <span
            className={`font-black text-xs tracking-wide whitespace-nowrap transition-all duration-500 ease-in-out ${
              mobileExpanded ? 'max-w-[130px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            Ir al canal
          </span>
        </a>
      </div>

      {/* ==============================================================================
          2. ESCRITORIO / PC (hidden md:flex)
          3 Cajitas Flotantes Apiladas abajo a la derecha:
          - Cada una con su aspa (✕) independiente.
          - Al cerrarse con la cruz, se encoge suavemente convirtiéndose en su icono circular flotante.
          ============================================================================== */}
      <div
        className={`hidden md:flex fixed bottom-5 right-6 z-40 flex-col items-end gap-2.5 max-w-[340px] transform transition-all duration-500 ease-out ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {/* Cajita / Botón 1 PC: PATREON */}
        {!isPatreonDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-orange-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 text-left ring-1 ring-orange-500/20 shadow-orange-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/30 border border-orange-300/40">
                <PatreonIcon className="w-4 h-4 text-white fill-current drop-shadow" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight truncate">
                  Comunidad Patreon
                </h4>
                <p className="text-[10px] text-zinc-400 leading-tight truncate">
                  Apoya el canal y accede a ventajas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={patreonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-orange-300/40"
              >
                Unirme
              </a>
              <button
                onClick={() => setIsPatreonDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Minimizar a icono"
                aria-label="Minimizar cajita Patreon"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <a
            href={patreonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-orange-500 via-rose-500 to-pink-600 text-white shadow-[0_0_18px_rgba(249,104,84,0.65)] border-2 border-orange-300/70 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Ir a Patreon"
            aria-label="Ir a Patreon"
          >
            <PatreonIcon className="w-5 h-5 text-white fill-current drop-shadow" />
          </a>
        )}

        {/* Cajita / Botón 2 PC: COLABORACIONES */}
        {!isCollabDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 text-left ring-1 ring-cyan-500/20 shadow-blue-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/30 border border-cyan-300/40">
                <Mail className="w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight truncate">
                  Colaboraciones
                </h4>
                <p className="text-[10px] text-zinc-400 leading-tight truncate">
                  Propuestas de proyectos y patrocinios.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onOpenCollaboration && onOpenCollaboration();
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-cyan-300/40"
              >
                Contactar
              </button>
              <button
                onClick={() => setIsCollabDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Minimizar a icono"
                aria-label="Minimizar cajita Colaboraciones"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              onOpenCollaboration && onOpenCollaboration();
            }}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(37,117,196,0.75)] border-2 border-cyan-300/70 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Colaboraciones"
            aria-label="Contactar para Colaboraciones"
          >
            <Mail className="w-5 h-5 text-white drop-shadow" />
          </button>
        )}

        {/* Cajita / Botón 3 PC: YOUTUBE */}
        {!isYoutubeDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 text-left ring-1 ring-cyan-500/20 shadow-blue-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/30 border border-cyan-300/40">
                <Youtube className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight truncate">
                  Capa Cero 3D en YouTube
                </h4>
                <p className="text-[10px] text-zinc-400 leading-tight truncate">
                  Tutoriales de Bambu Studio directo al grano.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSubscribe && trackSubscribe('Barra Flotante Desktop')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-cyan-300/40"
              >
                Suscribirme
              </a>
              <button
                onClick={() => setIsYoutubeDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Minimizar a icono"
                aria-label="Minimizar cajita YouTube"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSubscribe && trackSubscribe('Botón Flotante YouTube (Desktop)')}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(37,117,196,0.75)] border-2 border-cyan-300/70 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Suscribirme al Canal de YouTube"
            aria-label="Suscribirme al Canal de YouTube"
          >
            <YouTubeIcon className="w-5 h-5 text-white drop-shadow" />
          </a>
        )}
      </div>
    </>
  );
}

