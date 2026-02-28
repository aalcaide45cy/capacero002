import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw, BarChart2, Search, ArrowLeft } from 'lucide-react';

const SHEETS_DB_URL = "https://script.google.com/macros/s/AKfycbx4_oOWg3bri93p57u2q__jeo33S0ZHT2VSMSHQEGBL_LMTD-g6H5KTw-fyP76h5AI/exec";
const VAULT_PASSWORD = "Estadisticas02?";

export default function AnalyticsDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState(false);

    // Data states
    const [isLoading, setIsLoading] = useState(false);
    const [statsData, setStatsData] = useState([]);
    const [searchData, setSearchData] = useState([]);
    const [activeTab, setActiveTab] = useState('estadisticas'); // 'estadisticas' | 'buscador'
    const [tableSearchQuery, setTableSearchQuery] = useState('');

    // Date Formatter: Convierte "2026-02-28T13:45:42.000Z" a "28/02/2026 - 14:45"
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            return d.toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).replace(',', ' -');
        } catch (e) {
            return String(dateStr);
        }
    };

    // Filter Logic
    const filteredStats = statsData.filter(row => {
        const query = tableSearchQuery.toLowerCase();
        return (
            (row.name && row.name.toLowerCase().includes(query)) ||
            (row.id && String(row.id).toLowerCase().includes(query)) ||
            (row.origin && String(row.origin).toLowerCase().includes(query))
        );
    });

    const filteredSearch = searchData.filter(row => {
        const query = tableSearchQuery.toLowerCase();
        return (
            (row.term && row.term.toLowerCase().includes(query)) ||
            (row.userId && String(row.userId).toLowerCase().includes(query)) ||
            (row.origin && String(row.origin).toLowerCase().includes(query))
        );
    });

    // Check localStorage on mount
    useEffect(() => {
        // Add noindex strictly for this route just in case
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.name = 'robots';
            document.head.appendChild(metaRobots);
        }
        metaRobots.content = "noindex, nofollow";

        const savedAuth = localStorage.getItem('capa_cero_admin_auth');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            fetchData();
        }
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === VAULT_PASSWORD) {
            setIsAuthenticated(true);
            setError(false);
            localStorage.setItem('capa_cero_admin_auth', 'true');
            fetchData();
        } else {
            setError(true);
            setPasswordInput('');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('capa_cero_admin_auth');
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(SHEETS_DB_URL);
            const data = await response.json();

            // Revert arrays to show newest first if dates exist
            const sortDesc = (arr) => arr.reverse();

            if (data.estadisticas) setStatsData(sortDesc(data.estadisticas));
            if (data.buscador) setSearchData(sortDesc(data.buscador));
        } catch (err) {
            console.error("Error cargando estadísticas:", err);
            // It might fail during development if CORS is blocked, but the script deals with it when published
        }
        setIsLoading(false);
    };

    // --- RENDER LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative">
                <a href="/" className="absolute top-6 left-6 text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Volver a Capa Cero
                </a>

                <div className="bg-zinc-900 p-8 rounded-2xl max-w-sm w-full border border-zinc-800 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-capaBlue/20 p-4 rounded-full">
                            <Lock className="w-8 h-8 text-capaBlue" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white text-center mb-2">Acceso Restringido</h1>
                    <p className="text-gray-400 text-center mb-6 text-sm">Panel interno de estadísticas de Capa Cero.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="Contraseña Maestra..."
                                className={`w-full bg-black border ${error ? 'border-red-500' : 'border-zinc-700'} rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-capaBlue`}
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-xs mt-2 ml-1">Contraseña incorrecta.</p>}
                        </div>
                        <button type="submit" className="w-full bg-capaBlue text-black font-bold py-3 rounded-xl hover:bg-white transition-colors">
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER DASHBOARD ---
    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Navbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-capaBlue flex items-center gap-3">
                            <BarChart2 className="w-8 h-8" />
                            Capa Cero Analytics
                        </h1>
                        <p className="text-gray-400 mt-1 flex items-center gap-2">
                            Conectado a Google Sheets <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-capaBlue' : ''}`} />
                            <span className="hidden sm:inline">Refrescar Datos</span>
                        </button>

                        <a href="/" className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors">
                            Ir a la Tienda
                        </a>

                        <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg transition-colors ml-auto md:ml-0 border border-red-500/20">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-6">
                    <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('estadisticas')}
                            className={`px-4 sm:px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all whitespace-nowrap ${activeTab === 'estadisticas'
                                ? 'bg-capaBlue text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                                }`}
                        >
                            <BarChart2 className="w-5 h-5" />
                            Productos (Rendimiento)
                        </button>
                        <button
                            onClick={() => setActiveTab('buscador')}
                            className={`px-4 sm:px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all whitespace-nowrap ${activeTab === 'buscador'
                                ? 'bg-capaBlue text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                                }`}
                        >
                            <Search className="w-5 h-5" />
                            Búsquedas Analizadas
                        </button>
                    </div>

                    <div className="relative w-full lg:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en la tabla..."
                            value={tableSearchQuery}
                            onChange={(e) => setTableSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-capaBlue transition-colors"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && statsData.length === 0 && searchData.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-capaBlue"></div>
                    </div>
                ) : (
                    <>
                        {/* TAB: ESTADISTICAS */}
                        {activeTab === 'estadisticas' && (
                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-black/50 border-b border-zinc-800">
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Fecha / Hora</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">ID</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Nombre del Producto</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider text-right">Vistas (Tarjeta)</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider text-right">Clics (Oferta)</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Último Origen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {filteredStats.map((row, i) => (
                                            <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 text-gray-300 text-sm whitespace-nowrap">{formatDate(row.date)}</td>
                                                <td className="p-4 text-capaBlue font-mono text-xs">{row.id}</td>
                                                <td className="p-4 font-semibold text-white max-w-[300px] truncate" title={row.name}>{row.name}</td>
                                                <td className="p-4 text-right">
                                                    <span className="bg-zinc-800 text-white px-3 py-1 rounded-full text-sm">{row.views}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="bg-green-500/20 text-green-400 font-bold px-3 py-1 rounded-full text-sm border border-green-500/20">
                                                        {row.clicks}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">{row.origin}</td>
                                            </tr>
                                        ))}
                                        {filteredStats.length === 0 && !isLoading && (
                                            <tr><td colSpan="6" className="text-center p-8 text-gray-500">No hay datos que coincidan con la búsqueda.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TAB: BUSCADOR */}
                        {activeTab === 'buscador' && (
                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="bg-black/50 border-b border-zinc-800">
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Fecha / Hora</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Palabra Buscada</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider text-center">Teclazos</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">ID Espectador</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider">Origen</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider text-center">¿Vio Tarjeta?</th>
                                            <th className="p-4 text-gray-400 font-medium font-mono text-sm uppercase tracking-wider text-center">¿Fue a la Tienda?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {filteredSearch.map((row, i) => (
                                            <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 text-gray-300 text-sm whitespace-nowrap">{formatDate(row.date)}</td>
                                                <td className="p-4 text-white font-bold">"{row.term}"</td>
                                                <td className="p-4 text-gray-400 text-center">{row.count}</td>
                                                <td className="p-4 text-capaBlue font-mono text-xs">{row.userId}</td>
                                                <td className="p-4 text-gray-400 text-sm">{row.origin}</td>
                                                <td className="p-4 text-center">
                                                    {row.cardClick === 'Sí' ? <span className="text-green-500 font-bold">✓</span> : <span className="text-zinc-600">-</span>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {row.offerClick === 'Sí' ? <span className="bg-capaBlue/20 text-capaBlue px-2 py-1 rounded text-xs font-bold font-mono">💵 COMPRA</span> : <span className="text-zinc-600">-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSearch.length === 0 && !isLoading && (
                                            <tr><td colSpan="7" className="text-center p-8 text-gray-500">No hay búsquedas que coincidan.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                <div className="mt-8 text-center text-zinc-600 text-sm flex items-center justify-center gap-2">
                    <span>Panel seguro. Los datos se mantienen vivos tanto en este panel como en tu Google Sheets.</span>
                </div>
            </div>
        </div>
    );
}
