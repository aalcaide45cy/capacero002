import React from 'react';
import { ExternalLink, Calculator, FileText } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';

export default function V4Footer() {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-center text-left">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2">
            <img src="/logo-capa-cero-small.png" alt="Capa Cero Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-white">Capa Cero 3D</h4>
            <p className="text-xs text-zinc-500">Tutoriales, herramientas y perfiles para makers.</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-zinc-400">
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-400 transition-colors flex items-center gap-1.5"
          >
            <YouTubeIcon className="w-4 h-4 text-red-500" />
            <span>Canal de YouTube</span>
          </a>
          <a href="/calculadora" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculadora 3D</span>
          </a>
          <a href="/editor" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Editor MD</span>
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
