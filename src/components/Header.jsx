import React from 'react';
import { Youtube } from 'lucide-react';
import { trackSocialClick } from '../utils/analytics';

// TikTok icon SVG component (Lucide doesn't have TikTok)
const TikTokIcon = ({ color = "currentColor" }) => (
    <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

export default function Header({ isSticky, compactLogo = false }) {
    return (
        <header className="w-full p-6 bg-gradient-to-b from-black to-transparent">
            <div className="max-w-7xl mx-auto">
                {/* Logo */}
                <div className={`flex items-center justify-center px-4 transition-all duration-300 ${compactLogo ? 'mb-4' : 'mb-10'}`}>
                    <img
                        src="/logo-capa-cero.webp"
                        alt="CAPA CERO"
                        className={`object-contain breathe-animation transition-all duration-300 ${compactLogo ? 'w-14 h-14 md:w-[75px] md:h-[75px] rounded-lg' : 'w-[180px] md:w-full md:max-w-sm h-auto rounded-2xl mx-auto'}`}
                    />
                </div>

                {/* Social Buttons & CTA (Ocultados en Landing Pages) */}
                {!compactLogo && (
                    <div className={`flex flex-col items-center justify-center gap-4 mb-4 mt-2 transition-all duration-300 ${isSticky ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                        <div className="flex items-center justify-center gap-5">
                            {/* TikTok - Left */}
                            <a
                                href="https://www.tiktok.com/@capacero"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackSocialClick('TikTok')}
                            className="flex items-center justify-center w-12 h-12 bg-black border-2 border-capaBlue rounded-full transition-all duration-300 hover:scale-110 breathe-animation group"
                            aria-label="TikTok"
                        >
                            <span className="text-capaBlue group-hover:text-white transition-colors">
                                <TikTokIcon color="currentColor" />
                            </span>
                        </a>

                        {/* YouTube - Right */}
                        <a
                            href="https://www.youtube.com/@CapaCero0"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackSocialClick('YouTube')}
                            className="flex items-center justify-center w-12 h-12 bg-black border-2 border-capaBlue rounded-full transition-all duration-300 hover:scale-110 breathe-animation-delayed group flex-shrink-0"
                            aria-label="YouTube"
                        >
                                <Youtube className="w-6 h-6 text-capaBlue group-hover:text-red-500 transition-colors" />
                            </a>
                        </div>

                        {/* CTA Cursos - Llamativo (Deshabilitado temporalmente) */}
                        <a
                            href="#"
                            className="relative flex items-center justify-center h-12 px-8 bg-zinc-800 text-zinc-500 font-black text-[15px] sm:text-[17px] rounded-full transition-all duration-300 border border-zinc-700 cursor-not-allowed opacity-80 uppercase tracking-wide whitespace-nowrap overflow-hidden"
                            title="Próximamente"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                🎓 ACCESO CURSO BAMBUSTUDIO
                            </span>
                        </a>
                    </div>
                )}
            </div>
        </header>
    );
}
