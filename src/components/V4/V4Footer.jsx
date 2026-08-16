import React from 'react';
import { YouTubeIcon } from './YouTubeIcon';

export default function V4Footer() {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-center text-left">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <img
            src="/logo-capa-cero.webp"
            alt="Capa Cero Logo"
            className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(37,117,196,0.35)]"
          />
          <div className="text-left">
            <h4 className="text-sm sm:text-base font-extrabold text-white">Capa Cero 3D</h4>
            <p className="text-xs text-zinc-400">Tutoriales, herramientas y perfiles para makers.</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-zinc-400">
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-400 transition-colors flex items-center gap-1.5"
          >
            <YouTubeIcon className="w-4 h-4 text-red-500" />
            <span>Canal de YouTube</span>
          </a>
          <a href="/politica-privacidad" className="hover:text-zinc-200 transition-colors">
            Privacidad y Cookies
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-zinc-600">
          © {new Date().getFullYear()} Capa Cero. Creado para la comunidad 3D.
        </div>

      </div>
    </footer>
  );
}
