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
    const [isSticky, setIsSticky] = useState(false);

    // Load all products on mount
    useEffect(() => {
        async function fetchProducts() {
            setIsLoading(true);
            const products = await loadProducts();
            setAllProducts(products);
            setFilteredProducts(products);
            setIsLoading(false);

            // SEO Routing: Check if URL contains a product ID
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('p');
            if (productId) {
                const targetProduct = products.find(p => p.id === productId);
                if (targetProduct) {
                    setSelectedProduct(targetProduct);
                }
            }
        }

        fetchProducts();
    }, []);

    // Scroll listener for sticky header
    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Derive unique tags from products
    const tags = useMemo(() => {
        const uniqueTags = [...new Set(allProducts.map(p => p.tag).filter(Boolean))];
        return uniqueTags.sort((a, b) => {
            const cleanA = a.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            const cleanB = b.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            return cleanA.localeCompare(cleanB);
        });
    }, [allProducts]);

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

    // Generate dynamic search terms from product names
    const searchTerms = useMemo(() => {
        if (allProducts.length === 0) return [];
        // Get 6 random product names
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 6).map(p => `${p.name}...`);
    }, [allProducts]);

    // Filter products when search query, active filter, or active category changes
    useEffect(() => {
        let filtered = filterProducts(allProducts, searchQuery);

        // Filter by Tag (Top, Oferta, Nuevo)
        if (activeFilter) {
            filtered = filtered.filter(product =>
                product.tag && product.tag.toLowerCase() === activeFilter.toLowerCase()
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
        // SEO: Update URL to allow easy sharing and indexing
        window.history.replaceState({}, '', `/?p=${product.id}`);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
        // SEO: Revert URL when closing modal
        window.history.replaceState({}, '', '/');
    };

    return (
        <div className="min-h-screen bg-black">
            <Header isSticky={isSticky} />

            <div style={{ paddingTop: '15px' }}>
                <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSticky={isSticky}
                    placeholderTerms={searchTerms}
                />
                {isSticky && <div className="h-24" />}

                <div className={`transition-all duration-300 ${isSticky ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                    <FilterButtons
                        tags={tags}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                    />

                    <CategoryFilters
                        categories={categories}
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                    />
                </div>

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
