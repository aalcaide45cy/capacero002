import React from 'react';
import { Eye } from 'lucide-react';
import { trackProductClick } from '../utils/analytics';

export default function ProductCard({ product, onClick }) {
    // Obtener la primera imagen del array
    const displayImage = Array.isArray(product.image) ? product.image[0] : product.image;

    const handleCardClick = () => {
        trackProductClick(product);
        onClick(product);
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-zinc-900 rounded-lg overflow-hidden cursor-pointer glow-blue-hover border border-zinc-800 relative"
        >
            {/* Tag personalizada en esquina superior derecha */}
            {product.tag && (
                <div className="absolute top-3 right-3 bg-capaBlue/90 text-white px-3 py-1 rounded-full text-sm font-bold z-10 shadow-lg">
                    {product.tag}
                </div>
            )}

            {/* Product Image */}
            <div className="aspect-[4/3] bg-zinc-950 overflow-hidden p-2">
                <img
                    src={displayImage}
                    alt={product.name}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Product Info */}
            <div className="p-4">
                {/* Title - truncated to 2 lines */}
                <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem] text-center">
                    {product.order !== null ? `${product.order.toString().padStart(2, '0')} - ` : ''}{product.name}
                </h3>

                {/* Price and Action - Layout condicional */}
                {product.showPrice ? (
                    // Layout con precio: precio izquierda, botón derecha
                    <div className="flex items-center justify-between">
                        <span className="text-capaBlue text-2xl font-bold">
                            {product.price}
                        </span>

                        <button className="flex items-center gap-2 bg-capaBlue/10 text-capaBlue px-4 py-2 rounded-lg hover:bg-capaBlue/20 transition-colors">
                            <Eye className="w-5 h-5" />
                            <span className="text-sm font-medium">Ver</span>
                        </button>
                    </div>
                ) : (
                    // Layout sin precio: botón centrado
                    <div className="flex justify-center">
                        <button className="flex items-center gap-2 bg-capaBlue/10 text-capaBlue px-6 py-2 rounded-lg hover:bg-capaBlue/20 transition-colors">
                            <Eye className="w-5 h-5" />
                            <span className="text-sm font-medium">Ver</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
