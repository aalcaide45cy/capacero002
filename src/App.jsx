import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterButtons from './components/FilterButtons';
import CategoryFilters from './components/CategoryFilters';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import { loadProducts, filterProducts } from './utils/loadProducts';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CourseGrid from './components/CourseGrid';
import PrivacyCookies from './components/PrivacyCookies';

function App() {
    // Intercepción de ruta para el Panel Privado de Estadísticas
    const currentPath = window.location.pathname;
    if (currentPath === '/estadisticas' || currentPath === '/estadisticas/') {
        return <AnalyticsDashboard />;
    }

    // Intercepción de ruta para la Academia de Cursos
    if (currentPath === '/cursos' || currentPath === '/cursos/') {
        return (
            <div className="min-h-screen bg-black">
                <Header isSticky={false} compactLogo={true} />
                <div style={{ paddingTop: '80px' }}>
                    <CourseGrid />
                </div>
            </div>
        );
    }
    
    // Intercepción de ruta para Privacidad y Legal
    if (currentPath === '/politica-privacidad' || currentPath === '/politica-privacidad/') {
        return (
            <div className="min-h-screen bg-black">
                <Header isSticky={false} compactLogo={true} />
                <div style={{ paddingTop: '80px' }}>
                    <PrivacyCookies />
                </div>
            </div>
        );
    }

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

            // SEO Routing: Check if URL is /producto/id
            const currentPath = window.location.pathname;
            let productId = null;
            
            if (currentPath.startsWith('/producto/')) {
                productId = currentPath.replace('/producto/', '');
            } else {
                // Retrocompatibilidad con enlaces antiguos ?p=
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
        // SEO: Update URL to allow easy sharing and indexing (Rutas limpias)
        window.history.replaceState({}, '', `/producto/${product.id}`);
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

                {/* Hero Text */}
                <div className="text-center mt-6 mb-10 relative z-10 px-4 max-w-5xl mx-auto">
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-3 tracking-tight leading-tight lg:leading-[1.1]"
                    >
                        Encuentra los mejores productos de Amazon
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto"
                    >
                        Descubre ofertas, novedades y productos recomendados en tecnología, hogar, moda y mucho más.
                    </motion.p>
                </div>

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
