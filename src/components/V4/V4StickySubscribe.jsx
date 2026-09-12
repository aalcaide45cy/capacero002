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
          className={`h-11 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center shadow-[0_0_18px_rgba(245,158,11,0.65)] border-2 border-amber-300/70 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden cursor-pointer ${
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
          - Ancho ampliado a 410px manteniendo right-6 intacto.
          - Mensajes completos sin recortar con ganchos comerciales potentes.
          - Cada una con su aspa (✕) independiente para encogerse a su icono flotante.
          ============================================================================== */}
      <div
        className={`hidden md:flex fixed bottom-5 right-6 z-40 flex-col items-end gap-2.5 w-[410px] max-w-[calc(100vw-3rem)] transform transition-all duration-500 ease-out ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {/* Cajita / Botón 1 PC: PATREON */}
        {!isPatreonDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3.5 text-left ring-1 ring-amber-500/20 shadow-amber-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/30 border border-amber-300/50">
                <PatreonIcon className="w-5 h-5 text-white fill-current drop-shadow" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight">
                  Patreon & Licencia Comercial
                </h4>
                <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                  Descarga modelos 3D exclusivos y obtén tu licencia oficial para vender las impresiones.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={patreonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-amber-300/50 cursor-pointer"
              >
                Unirme
              </a>
              <button
                onClick={() => setIsPatreonDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
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
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_0_18px_rgba(245,158,11,0.65)] border-2 border-amber-300/70 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Ir a Patreon"
            aria-label="Ir a Patreon"
          >
            <PatreonIcon className="w-5 h-5 text-white fill-current drop-shadow" />
          </a>
        )}

        {/* Cajita / Botón 2 PC: COLABORACIONES */}
        {!isCollabDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3.5 text-left ring-1 ring-cyan-500/20 shadow-blue-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/30 border border-cyan-300/40">
                <Mail className="w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight">
                  Colaboraciones & Marcas
                </h4>
                <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                  ¿Tienes una marca o producto? Llega a miles de makers y apasionados de la impresión 3D.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onOpenCollaboration && onOpenCollaboration();
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-cyan-300/40 cursor-pointer"
              >
                Contactar
              </button>
              <button
                onClick={() => setIsCollabDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
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
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(37,117,196,0.75)] border-2 border-cyan-300/70 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Colaboraciones"
            aria-label="Contactar para Colaboraciones"
          >
            <Mail className="w-5 h-5 text-white drop-shadow" />
          </button>
        )}

        {/* Cajita / Botón 3 PC: YOUTUBE */}
        {!isYoutubeDismissed ? (
          <div className="bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3.5 text-left ring-1 ring-cyan-500/20 shadow-blue-950/40 w-full animate-fade-in transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/30 border border-cyan-300/40">
                <Youtube className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white leading-tight">
                  Canal Oficial Capa Cero 3D
                </h4>
                <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                  Domina Bambu Studio y Fusion 360 con tutoriales claros, directos al grano y sin rodeos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSubscribe && trackSubscribe('Barra Flotante Desktop')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap border border-cyan-300/40 cursor-pointer"
              >
                Suscribirme
              </a>
              <button
                onClick={() => setIsYoutubeDismissed(true)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
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

