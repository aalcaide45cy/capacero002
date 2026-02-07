import React from 'react';
import { Eye } from 'lucide-react';

export default function ProductCard({ product, onClick }) {
    // Badge mapping
    const badgeConfig = {
        'top': { emoji: '⭐', bg: 'bg-yellow-500/90', text: 'text-black' },
        'eco': { emoji: '🌱', bg: 'bg-green-500/90', text: 'text-white' },
        'indispensable': { emoji: '🔥', bg: 'bg-red-500/90', text: 'text-white' },
        'nuevo': { emoji: '✨', bg: 'bg-blue-500/90', text: 'text-white' },
        'oferta': { emoji: '💰', bg: 'bg-purple-500/90', text: 'text-white' },
    };

    const badge = product.badge ? badgeConfig[product.badge.toLowerCase()] : null;

    return (
        <div
            onClick={() => onClick(product)}
            className="bg-zinc-900 rounded-lg overflow-hidden cursor-pointer glow-blue-hover border border-zinc-800 relative"
        >
            {/* Badge en esquina superior derecha */}
            {product.badge && badge && (
                <div className={`absolute top-3 right-3 ${badge.bg} ${badge.text} px-3 py-1 rounded-full text-sm font-bold z-10 flex items-center gap-1 shadow-lg`}>
                    <span>{badge.emoji}</span>
                    <span className="uppercase">{product.badge}</span>
                </div>
            )}

            {/* Product Image */}
            <div className="aspect-[4/3] bg-zinc-950 overflow-hidden">
                <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Product Info */}
            <div className="p-4">
                {/* Title - truncated to 2 lines */}
                <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                    {product.title}
                </h3>

                {/* Price and Action */}
                <div className="flex items-center justify-between">
                    <span className="text-capaBlue text-2xl font-bold">
                        {product.price}
                    </span>

                    <button className="flex items-center gap-2 bg-capaBlue/10 text-capaBlue px-4 py-2 rounded-lg hover:bg-capaBlue/20 transition-colors">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-medium">Ver</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
