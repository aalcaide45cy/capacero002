import React, { Suspense, lazy } from 'react';
import V4Hub from './components/V4/V4Hub';

// Carga perezosa (Code-Splitting) para rutas secundarias:
// Evita descargar y evaluar >2 MB de JavaScript (CodeMirror, Markdown, KaTeX, XLSX, etc.) en la home principal.
const V2BackCatalog = lazy(() => import('./components/V2BackCatalog'));
const Header = lazy(() => import('./components/Header'));
const CourseGrid = lazy(() => import('./components/CourseGrid'));
const PrivacyCookies = lazy(() => import('./components/PrivacyCookies'));
const Calculator = lazy(() => import('./components/Calculator'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

const LazyEditor = lazy(() => import('./components/EditorMD/EditorEntry'));

function RouteLoadingFallback() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">Cargando módulo...</span>
            </div>
        </div>
    );
}

function App() {
    const currentPath = window.location.pathname;

    // 1. Redirección limpia de /v4 a la raíz / para evitar contenido duplicado en SEO
    if (currentPath === '/v4' || currentPath === '/v4/' || currentPath.startsWith('/v4/')) {
        window.history.replaceState({}, '', '/');
        return <V4Hub />;
    }

    // 2. Ruta Privada para la versión anterior (Catálogo de productos)
    if (currentPath === '/v2-back' || currentPath === '/v2-back/' || currentPath.startsWith('/v2-back/') || currentPath.startsWith('/producto/')) {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <V2BackCatalog />
            </Suspense>
        );
    }

    // 3. Intercepción de ruta para el Panel Privado de Estadísticas
    if (currentPath === '/estadisticas' || currentPath === '/estadisticas/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <AnalyticsDashboard />
            </Suspense>
        );
    }

    // 4. Intercepción de ruta para el Editor MD (Carga diferida aislada de CodeMirror)
    if (currentPath === '/editor' || currentPath === '/editor/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <LazyEditor />
            </Suspense>
        );
    }

    // 5. Intercepción de ruta para la Calculadora 3D
    if (currentPath === '/calculadora' || currentPath === '/calculadora/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <div className="min-h-screen bg-black">
                    <Header isSticky={false} compactLogo={false} isCalculatorPage={true} />
                    <div style={{ paddingTop: '20px' }}>
                        <Calculator />
                    </div>
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
                </div>
            </Suspense>
        );
    }

    // 6. Intercepción de ruta para la Academia de Cursos
    if (currentPath === '/cursos' || currentPath === '/cursos/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <div className="min-h-screen bg-black">
                    <Header isSticky={false} compactLogo={true} />
                    <div style={{ paddingTop: '80px' }}>
                        <CourseGrid />
                    </div>
                </div>
            </Suspense>
        );
    }
    
    // 7. Intercepción de ruta para Privacidad y Legal
    if (currentPath === '/politica-privacidad' || currentPath === '/politica-privacidad/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <div className="min-h-screen bg-black">
                    <Header isSticky={false} compactLogo={true} />
                    <div style={{ paddingTop: '80px' }}>
                        <PrivacyCookies />
                    </div>
                </div>
            </Suspense>
        );
    }

    // 8. RUTA PRINCIPAL POR DEFECTO (/) Y (/v4): Nueva Videoteca y Hub Oficial Capa Cero
    return <V4Hub />;
}

export default App;
