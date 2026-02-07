import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterButtons from './components/FilterButtons';
import CategoryFilters from './components/CategoryFilters';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import { loadProducts, filterProducts } from './utils/loadProducts';

function App() {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
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

    // Derive unique categories from products
    const categories = useMemo(() => {
        const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
        return uniqueCategories.sort((a, b) => {
            // Remove emojis and leading whitespace for sorting
            const cleanA = a.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            const cleanB = b.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            return cleanA.localeCompare(cleanB);
        });
    }, [allProducts]);

    // Filter products when search query, active filter, or active category changes
    useEffect(() => {
        let filtered = filterProducts(allProducts, searchQuery);

        // Filter by Tag (Top, Oferta, Nuevo)
        if (activeFilter) {
            filtered = filtered.filter(product =>
                product.tag && product.tag.toLowerCase().includes(activeFilter.toLowerCase())
            );
        }

        // Filter by Category
        if (activeCategory) {
            filtered = filtered.filter(product =>
                product.category === activeCategory
            );
        }

        setFilteredProducts(filtered);
    }, [searchQuery, activeFilter, activeCategory, allProducts]);

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

                <CategoryFilters
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
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
