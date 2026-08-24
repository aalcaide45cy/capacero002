import React, { Suspense, lazy } from 'react';
import V4Hub from './components/V4/V4Hub';

// Carga perezosa (Code-Splitting) para rutas secundarias:
// Evita descargar y evaluar librerías pesadas en la home principal.
const Header = lazy(() => import('./components/Header'));
const PrivacyCookies = lazy(() => import('./components/PrivacyCookies'));
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

    // 4. Intercepción de ruta para Privacidad y Legal
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

    // 5. Limpieza automática de URL en el navegador para rutas eliminadas (/calculadora, /cursos, /v2-back, etc.)
    if (currentPath !== '/' && currentPath !== '') {
        window.history.replaceState({}, '', '/');
    }

    // 6. RUTA PRINCIPAL (/)
    return <V4Hub />;
}

export default App;
