import React, { Suspense, lazy } from 'react';
import V4Hub from './components/V4/V4Hub';

// Carga perezosa (Code-Splitting) para rutas secundarias:
// Evita descargar y evaluar librerías pesadas en la home principal.
const Header = lazy(() => import('./components/Header'));
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

    // 2. Intercepción de ruta para el Panel Privado de Estadísticas
    if (currentPath === '/estadisticas' || currentPath === '/estadisticas/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <AnalyticsDashboard />
            </Suspense>
        );
    }

    // 3. Intercepción de ruta para el Editor MD (Carga diferida aislada de CodeMirror)
    if (currentPath === '/editor' || currentPath === '/editor/') {
        return (
            <Suspense fallback={<RouteLoadingFallback />}>
                <LazyEditor />
            </Suspense>
        );
    }

    // 4. Intercepción de ruta para la Calculadora 3D
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
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Capa Cero 3D · Videoteca Oficial, Tutoriales de Bambu Studio, Perfiles 3MF y Herramientas para Makers.
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">
                                © {new Date().getFullYear()} Capa Cero 3D. Todos los derechos reservados.
                            </p>
                        </div>
                    </footer>
                </div>
            </Suspense>
        );
    }

    // 5. Intercepción de ruta para Privacidad y Legal
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

    // 6. RUTA PRINCIPAL POR DEFECTO (/) Y (/v4): Videoteca y Hub Oficial Capa Cero
    return <V4Hub />;
}

export default App;
