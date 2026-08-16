import React from 'react';
import { Mail, Youtube } from 'lucide-react';

export default function V4Header({ onOpenTab, activeTab, onOpenCollaboration }) {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/logo-capa-cero.webp"
              alt="Capa Cero"
              className="h-10 sm:h-11 w-auto object-contain drop-shadow-[0_0_12px_rgba(37,117,196,0.5)] group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-black text-white text-base sm:text-lg tracking-tight group-hover:text-cyan-400 transition-colors">
                Capa Cero 3D
              </span>
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
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            📺 Videoteca
          </button>
          <button
            onClick={() => onOpenTab('doctor')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'doctor'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            🩺 Doctor 3D
          </button>
          <button
            onClick={() => onOpenTab('downloads')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'downloads'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            📥 Perfiles & 3MF
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Botón Colaboraciones Header */}
          <button
            onClick={onOpenCollaboration}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-cyan-500/40 bg-blue-950/40 hover:bg-blue-900/50 text-cyan-300 hover:text-cyan-100 text-xs font-bold transition-all shadow-[0_0_15px_rgba(37,117,196,0.25)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-300" />
            <span>Colaboraciones</span>
          </button>

          {/* Primary YouTube Subscribe Button */}
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group overflow-hidden flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95 border border-cyan-400/30"
          >
            <Youtube className="w-4 h-4 text-white" />
            <span>Suscribirme</span>
          </a>
        </div>
      </div>
    </header>
  );
}
