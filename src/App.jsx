import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import { loadProducts, filterProducts } from './utils/loadProducts';

function App() {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load all products on mount
    useEffect(() => {
        async function fetchProducts() {
            setIsLoading(true);
            const products = await loadProducts();
            setAllProducts(products);
            setFilteredProducts(products);
            setIsLoading(false);
        }

        fetchProducts();
    }, []);

    // Filter products when search query changes
    useEffect(() => {
        const filtered = filterProducts(allProducts, searchQuery);
        setFilteredProducts(filtered);
    }, [searchQuery, allProducts]);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    return (
        <div className="min-h-screen bg-black">
            <Header />

            <div style={{ paddingTop: '15px' }}>
                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="text-capaBlue text-2xl">Cargando productos...</div>
                    </div>
                ) : (
                    <ProductGrid
                        products={filteredProducts}
                        onProductClick={handleProductClick}
                    />
                )}
            </div>

            {/* Modal */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}

export default App;
