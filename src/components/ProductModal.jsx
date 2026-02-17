import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductModal({ product, onClose }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    if (!product) return null;

    // Asegurar que images sea un array
    const images = Array.isArray(product.image) ? product.image : [product.image];
    const hasMultipleImages = images.length > 1;

    // Navegación del carrusel
    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToImage = (index) => {
        setCurrentImageIndex(index);
    };

    // Manejo de swipe táctil
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextImage();
        } else if (isRightSwipe) {
            prevImage();
        }
    };

    // Navegación con teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Bloquear scroll del body cuando el modal está abierto
    useEffect(() => {
        // Guardar el overflow original
        const originalOverflow = document.body.style.overflow;

        // Bloquear scroll
        document.body.style.overflow = 'hidden';

        // Restaurar scroll al desmontar
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Auto-play del carrusel
    useEffect(() => {
        if (!hasMultipleImages) return;

        const interval = setInterval(() => {
            nextImage();
        }, product.carouselInterval);

        return () => clearInterval(interval);
    }, [currentImageIndex, hasMultipleImages, product.carouselInterval]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCTAClick = () => {
        window.open(product.link, '_blank', 'noopener,noreferrer');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleBackdropClick}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-capaBlue/30 shadow-2xl relative"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors z-10"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Image Carousel */}
                    <div
                        className="aspect-[16/10] bg-zinc-950 overflow-hidden rounded-t-2xl relative p-6"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        {/* Image */}
                        <motion.img
                            key={currentImageIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            src={images[currentImageIndex]}
                            alt={`${product.name} - ${currentImageIndex + 1}`}
                            className="w-full h-full object-contain"
                        />

                        {/* Navigation Arrows - Only if multiple images */}
                        {hasMultipleImages && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full transition-all z-10"
                                >
                                    <ChevronLeft className="w-6 h-6 text-white" />
                                </button>

                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full transition-all z-10"
                                >
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </button>
                            </>
                        )}

                        {/* Indicators/Dots - Only if multiple images */}
                        {hasMultipleImages && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                {images.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToImage(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${index === currentImageIndex
                                            ? 'bg-capaBlue w-6'
                                            : 'bg-white/50 hover:bg-white/80'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="p-8">
                        {/* Tag */}
                        {product.tag && (
                            <div className="inline-block bg-capaBlue/20 text-capaBlue px-3 py-1 rounded-full text-sm font-bold mb-4">
                                {product.tag}
                            </div>
                        )}

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-white mb-4">
                            {product.order !== null ? `${product.order.toString().padStart(2, '0')} - ` : ''}{product.name}
                        </h2>

                        {/* Price - Solo si showPrice es true */}
                        {product.showPrice && (
                            <div className="text-4xl font-bold text-capaBlue mb-6">
                                {product.price}
                            </div>
                        )}

                        {/* Description */}
                        {product.description && (
                            <p className="text-gray-300 text-lg leading-relaxed mb-8">
                                {product.description}
                            </p>
                        )}

                        {/* CTA Button */}
                        <button
                            onClick={handleCTAClick}
                            className="w-full bg-capaBlue hover:bg-capaBlue/90 text-black font-bold text-lg py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-capaBlue/50"
                        >
                            <span>{product.buttonText}</span>
                            <ExternalLink className="w-6 h-6" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
