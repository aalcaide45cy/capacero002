import React from 'react';
import { Search, X, Youtube, Instagram, Mail } from 'lucide-react';
import Typewriter from 'typewriter-effect';
import { trackSocialClick, trackSearch } from '../../utils/analytics';

// TikTok icon SVG component
const TikTokIcon = ({ color = "currentColor" }) => (
  <svg
    className="w-4 h-4 sm:w-5 sm:h-5"
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

export default function V4SearchBar({
  searchQuery,
  setSearchQuery,
  isSticky,
  onOpenCollaboration
}) {
  const tutorialPlaceholderTerms = [
    '¡Adiós a las costuras en Bambu Studio...',
    'Fusion 360 para principiantes...',
    'Perfiles de impresión y calibración...',
    'Warping y adherencia en placa PEI...',
    'Boquillas estándar vs High-Flow...',
    'Impresión multicolor sin AMS...',
    'Ahorra tiempo en el laminador...',
    'Soportes tipo árbol en Bambu Studio...',
    'Ajustes secretos de laminado...'
  ];

  return (
    <>
      {/* ================= 1. BUSCADOR HERO (Estático, siempre en su posición natural sin saltos) ================= */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-1 mb-3 sm:mb-4 relative z-10">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-3.5 sm:left-4 flex items-center pointer-events-none z-10">
            <Search className="w-5 h-5 text-[#2575c4]" />
          </div>

          <input
            type="text"
            value={searchQuery}
            aria-label="Buscar tutoriales, trucos y perfiles de impresión 3D"
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              trackSearch(val);
            }}
            className="w-full bg-zinc-900 text-white text-sm sm:text-base px-11 sm:px-14 py-2.5 sm:py-3 rounded-full border-2 border-zinc-800 focus:border-[#2575c4] focus:outline-none transition-all duration-300 search-focus glow-blue-static"
            placeholder=""
          />

          {/* Typewriter effect for placeholder (Solo cuando la barra Hero está activa) */}
          {!searchQuery && !isSticky && (
            <div className="absolute inset-y-0 left-11 sm:left-14 right-10 sm:right-14 flex items-center pointer-events-none text-zinc-400 text-xs sm:text-base overflow-hidden whitespace-nowrap">
              <Typewriter
                options={{
                  strings: tutorialPlaceholderTerms,
                  autoStart: true,
                  loop: true,
                  delay: 50,
                  deleteSpeed: 30,
                }}
              />
            </div>
          )}

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                trackSearch('');
              }}
              className="absolute inset-y-0 right-3.5 sm:right-4 flex items-center text-zinc-400 hover:text-white transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Sugerencias Rápidas de Búsqueda */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 text-xs">
          <span className="text-zinc-400 font-semibold text-[11px] mr-1 hidden sm:inline">
            🔥 Sugerencias:
          </span>
          {[
            'Costura Scarf',
            'Warping PEI',
            'Fusion 360',
            'Multicolor',
            'Boquillas High-Flow',
            'ChatGPT'
          ].map((term) => (
            <button
              key={term}
              onClick={() => {
                setSearchQuery(term);
                trackSearch(term);
                window.scrollTo({ top: 460, behavior: 'smooth' });
              }}
              className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-500/40 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 shadow-sm"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* ================= 2. NAVBAR STICKY FLOTANTE (Desliza suavemente desde arriba sin mover el contenido) ================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-800 shadow-2xl py-2.5 transition-all duration-500 ease-out transform ${
          isSticky
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          transitionProperty: 'transform, opacity',
          transitionDuration: '450ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform, opacity'
        }}
        aria-hidden={!isSticky}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo Pequeño Sticky (Emblema clásico de Capa Cero) */}
          <div className="flex items-center shrink-0">
            <a href="/" tabIndex={isSticky ? 0 : -1} className="block select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <img
                src="/logo-emblem.webp"
                alt="Capa Cero 3D"
                width="44"
                height="44"
                loading="lazy"
                decoding="async"
                draggable="false"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl drop-shadow-[0_0_12px_rgba(37,117,196,0.5)] pointer-events-none select-none"
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserDrag: 'none',
                  userSelect: 'none'
                }}
              />
            </a>
          </div>

          {/* Buscador Compacto en Sticky con efecto Máquina de Escribir */}
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
              <Search className="w-4 h-4 text-[#2575c4]" />
            </div>

            <input
              type="text"
              value={searchQuery}
              aria-label="Buscar tutoriales"
              tabIndex={isSticky ? 0 : -1}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                trackSearch(val);
              }}
              className="w-full bg-zinc-900 text-white text-xs sm:text-sm pl-9 pr-9 py-1.5 sm:py-2 rounded-full border border-zinc-800 focus:border-[#2575c4] focus:outline-none transition-all search-focus"
              placeholder=""
            />

            {/* Typewriter en buscador Sticky (Solo cuando la barra sticky está en pantalla) */}
            {!searchQuery && isSticky && (
              <div className="absolute inset-y-0 left-9 right-8 flex items-center pointer-events-none text-zinc-400 text-xs sm:text-sm overflow-hidden whitespace-nowrap">
                <Typewriter
                  options={{
                    strings: tutorialPlaceholderTerms,
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 30,
                  }}
                />
              </div>
            )}

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  trackSearch('');
                }}
                tabIndex={isSticky ? 0 : -1}
                className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Redes Sociales y Botón COLABORACIONES en Sticky (Escritorio / Tablets: fila única) */}
          <div className="hidden md:flex items-center gap-2.5 sm:gap-3 shrink-0">
            <a
              href="https://www.youtube.com/@CapaCero0"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={isSticky ? 0 : -1}
              onClick={() => trackSocialClick && trackSocialClick('YouTube')}
              className="flex items-center justify-center w-8 h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
              title="YouTube"
              aria-label="YouTube"
            >
              <Youtube className="w-4 h-4 text-[#2575c4] group-hover:text-red-500 transition-colors" />
            </a>
            
            <a
              href="https://www.tiktok.com/@capacero"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={isSticky ? 0 : -1}
              onClick={() => trackSocialClick && trackSocialClick('TikTok')}
              className="flex items-center justify-center w-8 h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
              title="TikTok"
              aria-label="TikTok"
            >
              <span className="text-[#2575c4] group-hover:text-white transition-colors">
                <TikTokIcon />
              </span>
            </a>

            <a
              href="https://www.instagram.com/capa.cero_3d/"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={isSticky ? 0 : -1}
              onClick={() => trackSocialClick && trackSocialClick('Instagram')}
              className="flex items-center justify-center w-8 h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
              title="Instagram"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4 text-[#2575c4] group-hover:text-pink-500 transition-colors" />
            </a>

            <button
              onClick={(e) => {
                e.preventDefault();
                onOpenCollaboration && onOpenCollaboration();
              }}
              tabIndex={isSticky ? 0 : -1}
              className="relative flex items-center justify-center h-8 px-4 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-[11px] sm:text-[12px] rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_20px_rgba(34,211,238,0.7)] uppercase tracking-wider whitespace-nowrap overflow-hidden group cursor-pointer active:scale-95 flex-shrink-0 border border-cyan-300/40"
              title="Contactar para Colaboraciones"
            >
              <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-200" />
                COLABORACIONES
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:transition-all group-hover:duration-700 group-hover:translate-x-[150%] pointer-events-none"></div>
            </button>
          </div>

        </div>

        {/* Fila inferior para Móviles en modo Sticky: Redes Sociales un 50% más grandes (YouTube, TikTok, Instagram) */}
        <div className="flex md:hidden items-center justify-center gap-5 mt-2.5 pt-2 border-t border-zinc-800/80 px-4">
          <a
            href="https://www.youtube.com/@CapaCero0"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={isSticky ? 0 : -1}
            onClick={() => trackSocialClick && trackSocialClick('YouTube')}
            className="flex items-center justify-center w-11 h-11 bg-black border-2 border-[#2575c4] rounded-full group transition-all hover:scale-110 shadow-[0_0_10px_rgba(37,117,196,0.3)] flex-shrink-0"
            title="YouTube"
            aria-label="YouTube"
          >
            <Youtube className="w-5 h-5 text-[#2575c4] group-hover:text-red-500 transition-colors" />
          </a>
          
          <a
            href="https://www.tiktok.com/@capacero"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={isSticky ? 0 : -1}
            onClick={() => trackSocialClick && trackSocialClick('TikTok')}
            className="flex items-center justify-center w-11 h-11 bg-black border-2 border-[#2575c4] rounded-full group transition-all hover:scale-110 shadow-[0_0_10px_rgba(37,117,196,0.3)] flex-shrink-0"
            title="TikTok"
            aria-label="TikTok"
          >
            <span className="text-[#2575c4] group-hover:text-white transition-colors">
              <TikTokIcon color="currentColor" />
            </span>
          </a>

          <a
            href="https://www.instagram.com/capa.cero_3d/"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={isSticky ? 0 : -1}
            onClick={() => trackSocialClick && trackSocialClick('Instagram')}
            className="flex items-center justify-center w-11 h-11 bg-black border-2 border-[#2575c4] rounded-full group transition-all hover:scale-110 shadow-[0_0_10px_rgba(37,117,196,0.3)] flex-shrink-0"
            title="Instagram"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 text-[#2575c4] group-hover:text-pink-500 transition-colors" />
          </a>
        </div>
      </header>
    </>
  );
}
