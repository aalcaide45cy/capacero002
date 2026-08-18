import React from 'react';
import { Youtube, Mail } from 'lucide-react';
import { trackSubscribe, trackSocialClick } from '../../utils/analytics';

export default function V4Footer({ onOpenCollaboration }) {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-center text-left">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <img
            src="/logo-emblem.webp"
            alt="Capa Cero Logo"
            width="48"
            height="48"
            loading="lazy"
            decoding="async"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain drop-shadow-[0_0_15px_rgba(37,117,196,0.5)]"
          />
          <div className="text-left">
            <span className="block text-sm sm:text-base font-extrabold text-white">Capa Cero 3D</span>
            <p className="text-xs text-zinc-300">Tutoriales, guías y trucos reales de impresión 3D para makers.</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-zinc-300">
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackSocialClick('YouTube (Footer)');
              trackSubscribe('Footer');
            }}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <Youtube className="w-4 h-4 text-[#2575c4]" />
            <span>Canal de YouTube</span>
          </a>
          {onOpenCollaboration && (
            <button
              onClick={onOpenCollaboration}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Colaboraciones</span>
            </button>
          )}
          <a href="/politica-privacidad" className="hover:text-cyan-300 transition-colors">
            Privacidad y Cookies
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-zinc-400">
          © {new Date().getFullYear()} Capa Cero. Creado para la comunidad 3D.
        </div>

      </div>
    </footer>
  );
}
