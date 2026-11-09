import React from 'react';
import { Youtube, Mail } from 'lucide-react';
import { trackSubscribe, trackSocialClick } from '../../utils/analytics';

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://youtube.com/@capacero0' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@capacero' },
  { label: 'Instagram', href: 'https://www.instagram.com/capa.cero_3d' },
  { label: 'Udemy', href: 'https://www.udemy.com/user/alfonso-alcaide-cornejo/' },
];

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
          <a href="/sobre-mi" className="hover:text-cyan-300 transition-colors">
            Sobre mí
          </a>
          <a href="/politica-privacidad" className="hover:text-cyan-300 transition-colors">
            Privacidad y Cookies
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-zinc-400">
          © {new Date().getFullYear()} Capa Cero. Creado para la comunidad 3D.
        </div>

      </div>

      {/* Sobre mí + redes (texto HTML para buscadores e IA) */}
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-zinc-900 text-left">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Sobre mí</h2>
        <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
          Hola, soy Alfonso Alcaide Cornejo, creador de CapaCero3D. Hago tutoriales en español sobre impresión 3D,
          Bambu Studio y Fusion 360 para que entiendas qué ajuste usar, por qué funciona y cómo evitar errores en el taller.
        </p>
        <nav aria-label="Redes de Alfonso Alcaide Cornejo" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-zinc-300">
          {SOCIAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="me noopener" className="hover:text-cyan-400 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
