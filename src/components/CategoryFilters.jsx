import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Hand, ArrowLeft, ArrowRight } from 'lucide-react';
import { trackCategorySelect } from '../utils/analytics';

export default function CategoryFilters({ categories, activeCategory, onCategoryChange }) {
    const scrollRef = useRef(null);
    const [showHint, setShowHint] = useState(true);
    const [isScrollable, setIsScrollable] = useState(false);

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const isDown = useRef(false);

    // Check if scrolling is needed
    useEffect(() => {
        const checkScroll = () => {
            if (scrollRef.current) {
                const { scrollWidth, clientWidth } = scrollRef.current;
                setIsScrollable(scrollWidth > clientWidth);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [categories]);

    const handleMouseDown = (e) => {
        isDown.current = true;
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        isDown.current = false;
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        isDown.current = false;
        // Delay resetting isDragging to ensure onClick doesn't fire if it was dragging
        setTimeout(() => setIsDragging(false), 50);
    };

    const handleMouseMove = (e) => {
        if (!isDown.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1; // 1:1 movement speed

        // Only start dragging if moved more than 5px
        if (!isDragging && Math.abs(x - startX) > 5) {
            setIsDragging(true);
        }

        // Scroll if dragging active (or just activated)
        if (isDragging || Math.abs(x - startX) > 5) {
            scrollRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    // Hide hint after 4.5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHint(false);
        }, 4500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll to active category
    useEffect(() => {
        if (activeCategory && scrollRef.current) {
            const activeButton = scrollRef.current.querySelector('[data-active="true"]');
            if (activeButton) {
                activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeCategory]);

    const handleCategoryClick = (category) => {
        const nextCategory = activeCategory === category ? null : category;
        if (nextCategory) {
            trackCategorySelect(nextCategory);
        }
        onCategoryChange(nextCategory);
    };

    if (!categories || categories.length === 0) return null;

    return (
        <div className="w-full max-w-3xl mx-auto mb-4 relative group px-4">

            {/* Hand Animation Hint */}
            <AnimatePresence>
                {showHint && !activeCategory && isScrollable && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ x: 0 }}
                            animate={{
                                x: [0, 60, -60, 0], // Center -> Right -> Left -> Center
                                scale: [1, 0.9, 0.9, 0.9, 1], // Press and hold
                            }}
                            transition={{
                                duration: 3,
                                ease: "easeInOut",
                                times: [0, 0.2, 0.5, 0.8, 1],
                                delay: 0.5
                            }}
                            className="flex items-center gap-4"
                        >
                            <ArrowLeft className="w-6 h-6 text-white/50 drop-shadow-md animate-pulse" />

                            <Hand className="w-8 h-8 text-capaBlue drop-shadow-2xl fill-black/20" />

                            <ArrowRight className="w-6 h-6 text-white/50 drop-shadow-md animate-pulse" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className={`
                    flex items-center overflow-x-auto py-2 gap-3 no-scrollbar px-4 w-fit mx-auto max-w-full select-none
                    ${isScrollable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}
                `}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {categories.map((category) => {
                    const isActive = activeCategory === category;

                    return (
                        <motion.button
                            key={category}
                            data-active={isActive}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCategoryClick(category)}
                            className={`
                                flex-shrink-0 relative flex items-center gap-2 px-6 py-2 rounded-full border text-sm font-bold transition-all duration-300 whitespace-nowrap
                                ${isActive
                                    ? 'bg-zinc-800 border-capaBlue text-white shadow-[0_0_15px_rgba(0,163,255,0.5)] scale-105'
                                    : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:border-capaBlue/50 hover:text-white hover:shadow-[0_0_15px_rgba(0,163,255,0.3)]'
                                }
                                ${isDragging ? 'pointer-events-none' : ''}
                            `}
                        >
                            <span>{category}</span>

                            <AnimatePresence>
                                {isActive && (
                                    <motion.span
                                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        className="flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3 hover:text-red-400" />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
