import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import SearchBar from './SearchBar';
import FilterButtons from './FilterButtons';
import CategoryFilters from './CategoryFilters';
import ProductGrid from './ProductGrid';
import ProductModal from './ProductModal';
import { loadProducts, filterProducts } from '../utils/loadProducts';
import WaitlistModal from './WaitlistModal';
import CollaborationModal from './CollaborationModal';

export default function V2BackCatalog() {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSticky, setIsSticky] = useState(false);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);

    // Ocultar a buscadores (noindex, nofollow)
    useEffect(() => {
        let metaRobots = document.querySelector('meta[name="robots"]');
        let created = false;
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
            created = true;
        }
        metaRobots.setAttribute('content', 'noindex, nofollow, noarchive');

        return () => {
            if (created && metaRobots.parentNode) {
                metaRobots.parentNode.removeChild(metaRobots);
            } else if (metaRobots) {
                metaRobots.setAttribute('content', 'index, follow');
            }
        };
    }, []);

    // Load all products on mount
    useEffect(() => {
        async function fetchProducts() {
            setIsLoading(true);
            const products = await loadProducts();
            setAllProducts(products);
            setFilteredProducts(products);
            setIsLoading(false);

            // SEO Routing: Check if URL is /producto/id
            const currentPath = window.location.pathname;
            let productId = null;
            
            if (currentPath.startsWith('/producto/')) {
                productId = currentPath.replace('/producto/', '');
            } else {
                const params = new URLSearchParams(window.location.search);
                productId = params.get('p');
            }

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
            const cleanA = a.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            const cleanB = b.replace(/^[\p{Emoji}\u200d\ufe0f\s]+/u, '');
            return cleanA.localeCompare(cleanB);
        });
    }, [allProducts]);

    // Generate dynamic search terms from product names
    const searchTerms = useMemo(() => {
        if (allProducts.length === 0) return [];
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 6).map(p => `${p.name}...`);
    }, [allProducts]);

    // Filter products when search query, active filter, or active category changes
    useEffect(() => {
        let filtered = filterProducts(allProducts, searchQuery);

        if (activeFilter) {
            filtered = filtered.filter(product =>
                product.tag && product.tag.toLowerCase() === activeFilter.toLowerCase()
            );
        }

        if (activeCategory) {
            filtered = filtered.filter(product =>
                product.category === activeCategory
            );
        }

        setFilteredProducts(filtered);
    }, [searchQuery, activeFilter, activeCategory, allProducts]);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        window.history.replaceState({}, '', `/producto/${product.id}`);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
        window.history.replaceState({}, '', '/v2-back');
    };

    return (
        <div className="min-h-screen bg-black">
            <Header
                isSticky={isSticky}
                onOpenCollaboration={() => setIsCollaborationOpen(true)}
            />

            <div style={{ paddingTop: '5px' }}>
                <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSticky={isSticky}
                    placeholderTerms={searchTerms}
                    onOpenCollaboration={() => setIsCollaborationOpen(true)}
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

            {/* Global Amazon Associates Footer */}
            <footer className="mt-20 border-t border-zinc-900 bg-black py-10 px-6 text-center">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
                    <img src="/logo-capa-cero-small.png" alt="Capa Cero Logo" className="w-12 h-12 opacity-50 grayscale hidden md:block" />
                    <p className="text-xs text-zinc-600 leading-relaxed">
                        Capa Cero participa en el Programa de Afiliados de Amazon EU, un programa de publicidad para afiliados diseñado para ofrecer a sitios web un modo de obtener comisiones por publicidad, publicitando e incluyendo enlaces a Amazon.es / Amazon.com.
                        <br/>
                        Amazon y el logotipo de Amazon son marcas comerciales de Amazon.com, Inc. o de sociedades de su grupo.
                    </p>
                    <p className="text-xs text-zinc-700 mt-2">
                        © {new Date().getFullYear()} Capa Cero. Todos los derechos reservados.
                    </p>
                </div>
            </footer>

            {/* Modal de Productos */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={handleCloseModal}
                />
            )}

            {/* Modal Global de Lista de Espera */}
            {isWaitlistOpen && (
                <WaitlistModal onClose={() => setIsWaitlistOpen(false)} />
            )}

            {/* Modal Global de Colaboraciones */}
            {isCollaborationOpen && (
                <CollaborationModal onClose={() => setIsCollaborationOpen(false)} />
            )}
        </div>
    );
}
