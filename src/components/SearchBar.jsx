import React, { useState, useEffect } from 'react';
import { Search, X, Youtube } from 'lucide-react';
import Typewriter from 'typewriter-effect';

// TikTok icon SVG component
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

export default function SearchBar({ searchQuery, setSearchQuery, isSticky }) {
    const [allowOverflow, setAllowOverflow] = useState(false);

    // Enable overflow after transition to allow hover effects
    useEffect(() => {
        if (isSticky) {
            const timer = setTimeout(() => setAllowOverflow(true), 750);
            return () => clearTimeout(timer);
        } else {
            setAllowOverflow(false);
        }
    }, [isSticky]);

    return (
        <div className={`${isSticky ? 'transition-all duration-300 ease-in-out fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md py-2 border-b border-zinc-800 shadow-2xl' : 'w-full max-w-3xl mx-auto px-4 mb-6 relative z-10'}`}>
            <div className={`flex items-center justify-between transition-all duration-300 ${isSticky ? 'max-w-7xl mx-auto px-4' : 'w-full relative'}`}>

                {/* Logo (Left - Visible only when sticky) */}
                <div className={`transition-all ease-in-out overflow-hidden ${isSticky ? 'duration-700 max-w-[150px] opacity-100 mr-4' : 'duration-0 max-w-0 opacity-0'}`}>
                    <img
                        src="/logo-capa-cero.png"
                        alt="Capa Cero"
                        className={`w-auto object-contain transition-all duration-300 ${isSticky ? 'h-14' : 'h-10'}`}
                    />
                </div>

                {/* Search Input */}
                <div className={`relative flex-1 ${!isSticky ? 'w-full' : ''}`}>
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                        <Search className="w-6 h-6 text-capaBlue" />
                    </div>

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full bg-zinc-900 text-white text-lg px-14 rounded-full border-2 border-zinc-800 focus:border-capaBlue focus:outline-none transition-all duration-300 search-focus glow-blue-static ${isSticky ? 'py-1' : 'py-2'}`}
                        placeholder=""
                    />

                    {/* Typewriter effect for placeholder */}
                    {!searchQuery && (
                        <div className="absolute inset-y-0 left-14 right-14 flex items-center pointer-events-none text-gray-500 text-lg overflow-hidden whitespace-nowrap">
                            <Typewriter
                                options={{
                                    strings: [
                                        'Filamento...',
                                        'Componentes...',
                                        'Herramientas...',
                                        'Recambios...',
                                        'Accesorios...',
                                        'Tutoriales...'
                                    ],
                                    autoStart: true,
                                    loop: true,
                                    delay: 80,
                                    deleteSpeed: 50,
                                }}
                            />
                        </div>
                    )}

                    {/* Clear Button */}
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Social Icons (Right - Visible only when sticky) */}
                <div className={`flex items-center gap-3 transition-all ease-in-out ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${isSticky ? 'duration-700 max-w-[150px] opacity-100 ml-4' : 'duration-0 max-w-0 opacity-0'}`}>
                    <a
                        href="https://www.tiktok.com/@capacero"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 bg-black border border-capaBlue rounded-full group transition-all duration-300 hover:scale-110"
                    >
                        <span className="text-capaBlue group-hover:text-white transition-colors">
                            <TikTokIcon />
                        </span>
                    </a>
                    <a
                        href="https://www.youtube.com/@CapaCero0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 bg-black border border-capaBlue rounded-full group transition-all duration-300 hover:scale-110"
                    >
                        <Youtube className="w-5 h-5 text-capaBlue group-hover:text-red-500 transition-colors" />
                    </a>
                </div>

            </div>
        </div>
    );
}
