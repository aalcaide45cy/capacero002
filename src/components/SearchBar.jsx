import React from 'react';
import { Search, X } from 'lucide-react';
import Typewriter from 'typewriter-effect';

export default function SearchBar({ searchQuery, setSearchQuery }) {
    return (
        <div className="w-full max-w-3xl mx-auto px-4 mb-6">
            <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-capaBlue" />
                </div>

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 text-white text-lg px-14 py-4 rounded-full border-2 border-zinc-800 focus:border-capaBlue focus:outline-none transition-all duration-300 search-focus"
                    placeholder=""
                />

                {/* Typewriter effect for placeholder */}
                {!searchQuery && (
                    <div className="absolute inset-y-0 left-14 flex items-center pointer-events-none text-gray-500">
                        <Typewriter
                            options={{
                                strings: [
                                    'Busca Filamento...',
                                    'Busca Componentes...',
                                    'Busca Herramientas...',
                                    'Busca Recambios...',
                                    'Busca Accesorios...',
                                    'Busca Tutoriales...'
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
        </div>
    );
}
