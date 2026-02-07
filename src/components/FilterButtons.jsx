import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Tag, Sparkles } from 'lucide-react';

export default function FilterButtons({ activeFilter, onFilterChange }) {
    const filters = [
        { id: 'Top', label: 'Top', icon: Trophy, color: 'text-yellow-500' },
        { id: 'Oferta', label: 'Oferta', icon: Tag, color: 'text-green-500' },
        { id: 'Nuevo', label: 'Nuevo', icon: Sparkles, color: 'text-purple-500' }
    ];

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-6 mb-8 px-4">
            {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                const Icon = filter.icon;

                return (
                    <motion.button
                        key={filter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onFilterChange(isActive ? null : filter.id)}
                        className={`
                            relative flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border
                            ${isActive
                                ? 'bg-capaBlue/20 border-capaBlue text-white shadow-[0_0_15px_rgba(37,117,196,0.5)]'
                                : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:border-capaBlue/50 hover:text-white'
                            }
                        `}
                    >
                        {/* Icono del filtro */}
                        <Icon className={`w-4 h-4 ${isActive ? 'text-capaBlue' : filter.color}`} />

                        {/* Texto */}
                        <span>{filter.label}</span>

                        {/* Botón de cerrar (X) solo si está activo */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
                                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    className="flex items-center justify-center bg-capaBlue/20 rounded-full p-0.5"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                );
            })}
        </div>
    );
}
