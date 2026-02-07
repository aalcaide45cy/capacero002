import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';

export default function ProductModal({ product, onClose }) {
    if (!product) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCTAClick = () => {
        window.open(product.affiliateLink, '_blank', 'noopener,noreferrer');
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

                    {/* Product Image */}
                    <div className="aspect-[16/10] bg-zinc-950 overflow-hidden rounded-t-2xl">
                        <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Product Details */}
                    <div className="p-8">
                        {/* Title */}
                        <h2 className="text-3xl font-bold text-white mb-4">
                            {product.title}
                        </h2>

                        {/* Price */}
                        <div className="text-4xl font-bold text-capaBlue mb-6">
                            {product.price}
                        </div>

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
                            <span>VER OFERTA</span>
                            <ExternalLink className="w-6 h-6" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
