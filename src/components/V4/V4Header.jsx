import React from 'react';
import { YouTubeIcon } from './YouTubeIcon';

export default function V4Header({ onOpenTab, activeTab }) {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a href="/v4" className="flex items-center gap-3 group">
            <img
              src="/logo-capa-cero.webp"
              alt="Capa Cero"
              className="h-10 sm:h-11 w-auto object-contain drop-shadow-[0_0_12px_rgba(37,117,196,0.35)] group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base sm:text-lg tracking-tight group-hover:text-red-400 transition-colors">
                  Capa Cero
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
                  YouTube Hub
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Bambu Studio & Impresión 3D</span>
            </div>
          </a>
        </div>

        {/* Navigation Tabs (Only V4 Sections) */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/70 p-1 rounded-xl border border-zinc-800/60">
          <button
            onClick={() => onOpenTab('videos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'videos'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            📺 Videoteca
          </button>
          <button
            onClick={() => onOpenTab('doctor')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'doctor'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            🩺 Doctor 3D
          </button>
          <button
            onClick={() => onOpenTab('downloads')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'downloads'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            📥 Perfiles & 3MF
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Primary YouTube Subscribe Button */}
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group overflow-hidden flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-lg shadow-red-600/20 transition-all duration-200 active:scale-95"
          >
            <YouTubeIcon className="w-4 h-4 text-white" />
            <span>Suscribirme</span>
            <span className="hidden sm:inline-block text-[11px] bg-red-800/80 px-1.5 py-0.5 rounded font-normal text-red-100">
              1 Clic
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
