import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { trackFilterSelect } from '../utils/analytics';

export default function FilterButtons({ tags, activeFilter, onFilterChange }) {
    if (!tags || tags.length === 0) return null;

    const handleFilterClick = (tag) => {
        const nextFilter = activeFilter === tag ? null : tag;
        if (nextFilter) {
            trackFilterSelect(nextFilter);
        }
        onFilterChange(nextFilter);
    };

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-2 mb-4 px-4">
            {tags.map((tag) => {
                const isActive = activeFilter === tag;

                return (
                    <motion.button
                        key={tag}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFilterClick(tag)}
                        className={`
                            relative flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border
                            ${isActive
                                ? 'bg-capaBlue/20 border-capaBlue text-white shadow-[0_0_15px_rgba(37,117,196,0.5)]'
                                : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:border-capaBlue/50 hover:text-white'
                            }
                        `}
                    >
                        <span>{tag}</span>

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
