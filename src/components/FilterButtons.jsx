import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hand, ArrowLeft, ArrowRight } from 'lucide-react';
import { trackFilterSelect } from '../utils/analytics';

export default function FilterButtons({ tags, activeFilter, onFilterChange }) {
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
    }, [tags]);

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
        setTimeout(() => setIsDragging(false), 50);
    };

    const handleMouseMove = (e) => {
        if (!isDown.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1;

        if (!isDragging && Math.abs(x - startX) > 5) {
            setIsDragging(true);
        }

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

    const handleFilterClick = (tag) => {
        const nextFilter = activeFilter === tag ? null : tag;
        if (nextFilter) {
            trackFilterSelect(nextFilter);
        }
        onFilterChange(nextFilter);
    };

    if (!tags || tags.length === 0) return null;

    return (
        <div className="w-full max-w-3xl mx-auto mb-4 mt-2 relative group px-4">

            {/* Hand Animation Hint */}
            <AnimatePresence>
                {showHint && !activeFilter && isScrollable && (
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
                                x: [0, 60, -60, 0],
                                scale: [1, 0.9, 0.9, 0.9, 1],
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
                    flex items-center overflow-x-auto py-2 gap-4 no-scrollbar px-4 w-fit mx-auto max-w-full select-none
                    ${isScrollable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}
                `}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
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
                                flex-shrink-0 relative flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border whitespace-nowrap
                                ${isActive
                                    ? 'bg-capaBlue/20 border-capaBlue text-white shadow-[0_0_15px_rgba(37,117,196,0.5)]'
                                    : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:border-capaBlue/50 hover:text-white'
                                }
                                ${isDragging ? 'pointer-events-none' : ''}
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
        </div>
    );
}
