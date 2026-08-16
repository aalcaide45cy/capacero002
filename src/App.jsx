import React from 'react';
import V4Hub from './components/V4/V4Hub';
import V2BackCatalog from './components/V2BackCatalog';
import Header from './components/Header';
import CourseGrid from './components/CourseGrid';
import PrivacyCookies from './components/PrivacyCookies';
import Calculator from './components/Calculator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { ThemeProvider } from './context/ThemeContext';
import { ScaleProvider } from './context/ScaleContext';
import { EditorProvider } from './context/EditorContext';
import { AppShell } from './components/EditorMD/AppShell';

function App() {
    const currentPath = window.location.pathname;

    // 1. Ruta Privada para la versión anterior (Catálogo de productos)
    if (currentPath === '/v2-back' || currentPath === '/v2-back/' || currentPath.startsWith('/v2-back/') || currentPath.startsWith('/producto/')) {
        return <V2BackCatalog />;
    }

    // 2. Intercepción de ruta para el Panel Privado de Estadísticas
    if (currentPath === '/estadisticas' || currentPath === '/estadisticas/') {
        return <AnalyticsDashboard />;
    }

    // 3. Intercepción de ruta para el Editor MD
    if (currentPath === '/editor' || currentPath === '/editor/') {
        return (
            <ThemeProvider>
                <ScaleProvider>
                    <EditorProvider>
                        <AppShell />
                    </EditorProvider>
                </ScaleProvider>
            </ThemeProvider>
        );
    }

    // 4. Intercepción de ruta para la Calculadora 3D
    if (currentPath === '/calculadora' || currentPath === '/calculadora/') {
        return (
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
        );
    }

    // 5. Intercepción de ruta para la Academia de Cursos
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
    
    // 6. Intercepción de ruta para Privacidad y Legal
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

    // 7. RUTA PRINCIPAL POR DEFECTO (/) Y (/v4): Nueva Videoteca y Hub Oficial Capa Cero
    return <V4Hub />;
}

export default App;
