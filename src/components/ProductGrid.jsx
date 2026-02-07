import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, onProductClick }) {
    if (products.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400 text-xl">
                    No se encontraron productos. Intenta con otra búsqueda.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onClick={onProductClick}
                    />
                ))}
            </div>
        </div>
    );
}
