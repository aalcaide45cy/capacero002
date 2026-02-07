import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterButtons from './components/FilterButtons';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import { loadProducts, filterProducts } from './utils/loadProducts';

function App() {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);
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

    // Filter products when search query or active filter changes
    useEffect(() => {
        let filtered = filterProducts(allProducts, searchQuery);

        if (activeFilter) {
            filtered = filtered.filter(product =>
                product.tag && product.tag.toLowerCase().includes(activeFilter.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    }, [searchQuery, activeFilter, allProducts]);

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

                <FilterButtons
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />

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
