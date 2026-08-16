import React, { useEffect, useState } from 'react';
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
      <div
        className={`${
          isSticky
            ? 'fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md py-2.5 border-b border-zinc-800 shadow-2xl transition-all duration-300 ease-in-out animate-fade-in'
            : 'w-full max-w-3xl mx-auto px-4 mt-6 mb-8 relative z-10'
        }`}
      >
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            isSticky ? 'max-w-7xl mx-auto px-4 sm:px-6' : 'w-full relative'
          }`}
        >
          {/* Logo (Left - Visible only when sticky) */}
          <div
            className={`transition-all ease-in-out overflow-hidden flex items-center ${
              isSticky ? 'duration-500 max-w-[150px] opacity-100 mr-3 sm:mr-4' : 'duration-0 max-w-0 opacity-0'
            }`}
          >
            <a href="/" className="block shrink-0">
              <img
                src="/logo-capa-cero.webp"
                alt="Capa Cero"
                className="w-auto h-9 sm:h-11 object-contain rounded-lg drop-shadow-[0_0_12px_rgba(37,117,196,0.5)]"
              />
            </a>
          </div>

          {/* Search Input Container */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-3.5 sm:left-4 flex items-center pointer-events-none z-10">
              <Search className="w-5 h-5 text-[#2575c4]" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                trackSearch(val);
              }}
              className={`w-full bg-zinc-900 text-white text-sm sm:text-base px-11 sm:px-14 rounded-full border-2 border-zinc-800 focus:border-[#2575c4] focus:outline-none transition-all duration-300 search-focus glow-blue-static ${
                isSticky ? 'py-1.5 sm:py-2' : 'py-2.5 sm:py-3'
              }`}
              placeholder=""
            />

            {/* Typewriter effect for placeholder */}
            {!searchQuery && (
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
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3.5 sm:right-4 flex items-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Fila inferior flotante (Solo en modo Sticky) */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden flex justify-center w-full ${
            isSticky ? 'max-h-24 sm:max-h-20 mt-2 sm:mt-2.5 pb-1 opacity-100' : 'max-h-0 mt-0 opacity-0'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 w-full sm:w-auto px-4 justify-center">
            {/* Redes Sociales en modo Sticky */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="https://www.youtube.com/@CapaCero0"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick && trackSocialClick('YouTube')}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
                title="YouTube"
                aria-label="YouTube"
              >
                <Youtube className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2575c4] group-hover:text-red-500 transition-colors" />
              </a>
              <a
                href="https://www.tiktok.com/@capacero"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick && trackSocialClick('TikTok')}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
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
                onClick={() => trackSocialClick && trackSocialClick('Instagram')}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-black border border-[#2575c4] rounded-full group transition-all duration-300 hover:scale-110 flex-shrink-0"
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2575c4] group-hover:text-pink-500 transition-colors" />
              </a>
            </div>

            {/* Botón de Colaboraciones en modo Sticky */}
            <button
              onClick={(e) => {
                e.preventDefault();
                onOpenCollaboration && onOpenCollaboration();
              }}
              className="relative flex items-center justify-center h-7 sm:h-8 px-3.5 sm:px-4 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-[10px] sm:text-[12px] rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_20px_rgba(34,211,238,0.7)] uppercase tracking-wider whitespace-nowrap overflow-hidden group cursor-pointer active:scale-95 flex-shrink-0 border border-cyan-300/40"
              title="Contactar para Colaboraciones"
            >
              <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-cyan-200" />
                COLABORACIONES
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:transition-all group-hover:duration-700 group-hover:translate-x-[150%] pointer-events-none"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer when sticky to prevent layout shift / jumps */}
      {isSticky && <div className="h-20 sm:h-24" aria-hidden="true" />}
    </>
  );
}
