import React, { useState, useEffect, useMemo } from 'react';
import {
    Lock, RefreshCw, BarChart2, Globe, Heart, Layers, Clock,
    Stethoscope, Search, Download, ArrowLeft, Users, Smartphone,
    Monitor, Tablet, ArrowUpRight, TrendingUp, ShieldCheck, CheckCircle2,
    Calendar, Sparkles, Filter, Trash2, Database, ExternalLink, HelpCircle,
    Play, X, Info, ChevronRight, Copy, Check, SlidersHorizontal, Eye
} from 'lucide-react';
import {
    loadAnalyticsData,
    computeAnalyticsMetrics,
    exportAnalyticsToCSV,
    exportAnalyticsToJSON,
    clearAnalyticsDB,
    RECOMMENDED_SHEET_COLUMNS,
    GOOGLE_APPS_SCRIPT_CODE,
    syncWithGoogleSheet
} from '../utils/analyticsStorage';
import { loadV4Videos, getYouTubeThumbnail } from '../utils/loadV4Videos';

const VAULT_PASSWORD = "Estadisticas02?";

export default function AnalyticsDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState(false);

    // Data States
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [events, setEvents] = useState([]);
    const [videosMetadata, setVideosMetadata] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Granular Filters State
    const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | '30days'
    const [countryFilter, setCountryFilter] = useState('all');
    const [deviceFilter, setDeviceFilter] = useState('all');
    const [originFilter, setOriginFilter] = useState('all');
    const [subscribedFilter, setSubscribedFilter] = useState('all'); // 'all' | 'subscribed' | 'not_subscribed'
    const [tableSearchQuery, setTableSearchQuery] = useState('');

    // Modal States
    const [selectedKpiModal, setSelectedKpiModal] = useState(null); // 'visits' | 'subs' | 'dwell' | 'cards' | 'downloads' | 'countries' | null
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isSheetsConfigModalOpen, setIsSheetsConfigModalOpen] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);
    const [statusToast, setStatusToast] = useState(null);

    // Hover Preview Tooltip State
    const [hoveredVideoPreview, setHoveredVideoPreview] = useState(null); // { video, x, y, contextText }

    // Verificar autenticación previa y cargar vídeos
    useEffect(() => {
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

        // Cargar metadatos de vídeos para vistas previas con miniaturas reales
        loadV4Videos().then(v => setVideosMetadata(v || []));
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
            const data = await loadAnalyticsData();
            setSessions(data.sessions || []);
            setEvents(data.events || []);
            showToast('Datos analíticos actualizados');
        } catch (err) {
            console.error("Error cargando estadísticas:", err);
        }
        setIsLoading(false);
    };

    const handleClearData = async () => {
        if (window.confirm("¿Seguro que deseas reiniciar y borrar el historial de analíticas?")) {
            await clearAnalyticsDB();
            await fetchData();
            showToast('Base de datos reiniciada');
        }
    };

    const showToast = (msg) => {
        setStatusToast(msg);
        setTimeout(() => setStatusToast(null), 3000);
    };

    const handleCopyScript = () => {
        navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
        setCopiedScript(true);
        showToast('Código Apps Script copiado al portapapeles');
        setTimeout(() => setCopiedScript(false), 3000);
    };

    // Extraer lista de países únicos disponibles para el filtro
    const availableCountries = useMemo(() => {
        const set = new Set();
        sessions.forEach(s => {
            if (s.country) set.add(s.country);
        });
        return Array.from(set).sort();
    }, [sessions]);

    // Métricas calculadas con todos los filtros combinados
    const metrics = useMemo(() => {
        return computeAnalyticsMetrics(sessions, events, {
            dateFilter,
            countryFilter,
            deviceFilter,
            originFilter,
            subscribedFilter,
            searchQuery: tableSearchQuery
        });
    }, [sessions, events, dateFilter, countryFilter, deviceFilter, originFilter, subscribedFilter, tableSearchQuery]);

    // Buscar metadatos de un vídeo a partir de su título o texto de atribución
    const findVideoByTitle = (titleOrContext) => {
        if (!titleOrContext) return null;
        const clean = String(titleOrContext).replace('Vídeo:', '').replace('Modal Vídeo:', '').replace('Modal:', '').trim().toLowerCase();
        return videosMetadata.find(v => v.title && (
            v.title.toLowerCase().includes(clean) || clean.includes(v.title.toLowerCase().substring(0, 20))
        )) || {
            title: titleOrContext,
            category: 'Tutorial',
            thumbnail: '/logo-capa-cero-small.png',
            youtubeUrl: 'https://www.youtube.com/@CapaCero0'
        };
    };

    // Formateadores
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            return d.toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).replace(',', ' ·');
        } catch (e) {
            return String(dateStr);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    // Resetear filtros
    const resetAllFilters = () => {
        setDateFilter('all');
        setCountryFilter('all');
        setDeviceFilter('all');
        setOriginFilter('all');
        setSubscribedFilter('all');
        setTableSearchQuery('');
        showToast('Filtros restablecidos');
    };

    const hasActiveFilters = dateFilter !== 'all' || countryFilter !== 'all' || deviceFilter !== 'all' || originFilter !== 'all' || subscribedFilter !== 'all' || tableSearchQuery !== '';

    // --- RENDER LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative selection:bg-[#2575c4] selection:text-white">
                <a href="/" className="absolute top-6 left-6 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4 text-cyan-400" /> Volver a Capa Cero
                </a>

                <div className="bg-zinc-950 p-8 sm:p-10 rounded-3xl max-w-md w-full border border-zinc-800 shadow-2xl shadow-blue-950/40 relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400" />

                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/40 to-cyan-500/40 rounded-full blur-xl" />
                            <div className="relative bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                                <Lock className="w-8 h-8 text-cyan-400" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-white text-center mb-2 tracking-tight">
                        Capa Cero Analytics
                    </h1>
                    <p className="text-zinc-400 text-center mb-6 text-xs sm:text-sm">
                        Panel de control con filtros dinámicos, geolocalización, suscripciones y dwell time.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="Contraseña de Administrador..."
                                className={`w-full bg-zinc-900/90 border ${error ? 'border-red-500' : 'border-zinc-800'} rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 text-sm transition-all`}
                                autoFocus
                            />
                            {error && <p className="text-red-400 text-xs mt-2 ml-1">Contraseña incorrecta. Inténtalo de nuevo.</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm"
                        >
                            Acceder al Panel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER DASHBOARD ---
    return (
        <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#2575c4] selection:text-white">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Toast Notification */}
                {statusToast && (
                    <div className="fixed bottom-6 right-6 z-50 bg-cyan-950/95 border border-cyan-500/50 text-cyan-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{statusToast}</span>
                    </div>
                )}

                {/* ================= HEADER NAVBAR ================= */}
                <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-left">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-950/60 border border-cyan-500/30 rounded-2xl shadow">
                                    <BarChart2 className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                                        <span>Capa Cero Analytics</span>
                                        <span className="text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            v4 Full
                                        </span>
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            Base de Datos Local Activa (IndexedDB)
                                        </span>
                                        <span className="text-zinc-600">•</span>
                                        <button
                                            onClick={() => setIsSheetsConfigModalOpen(true)}
                                            className="text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1"
                                            title="Ver configuración y columnas de Google Sheets"
                                        >
                                            <span>Google Sheets (Columnas & Apps Script)</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <button
                                onClick={() => setIsHelpModalOpen(true)}
                                className="bg-blue-950/40 hover:bg-blue-900/60 text-cyan-300 border border-cyan-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95"
                                title="Guía para interpretar las estadísticas"
                            >
                                <HelpCircle className="w-4 h-4 text-cyan-400" />
                                <span>¿Cómo interpretar?</span>
                            </button>

                            <button
                                onClick={fetchData}
                                disabled={isLoading}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                                title="Refrescar métricas"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : 'text-zinc-400'}`} />
                                <span>Refrescar</span>
                            </button>

                            <button
                                onClick={() => exportAnalyticsToCSV(metrics.rawSessions)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                                title="Descargar datos en CSV para Excel"
                            >
                                <Download className="w-3.5 h-3.5 text-cyan-400" />
                                <span>CSV</span>
                            </button>

                            <button
                                onClick={() => exportAnalyticsToJSON(metrics.rawSessions, metrics.rawEvents)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                                title="Descargar copia de seguridad en JSON"
                            >
                                <Database className="w-3.5 h-3.5 text-cyan-400" />
                                <span>JSON</span>
                            </button>

                            <a
                                href="/"
                                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Web</span>
                            </a>

                            <button
                                onClick={handleClearData}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-all"
                                title="Reiniciar base de datos de analíticas"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleLogout}
                                className="text-zinc-500 hover:text-zinc-300 text-xs px-2.5 py-2 transition-colors ml-auto lg:ml-0"
                            >
                                Salir
                            </button>
                        </div>
                    </div>

                    {/* ================= GRANULAR MULTI-FILTER BAR ================= */}
                    <div className="mt-6 pt-5 border-t border-zinc-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Barra de Filtros Globales (Afecta a todo el panel)</span>
                            </span>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetAllFilters}
                                    className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold transition-colors"
                                >
                                    Restablecer Filtros
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                            {/* 1. Periodo */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">Periodo</label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="all">Todo el Histórico</option>
                                    <option value="today">Hoy</option>
                                    <option value="yesterday">Ayer</option>
                                    <option value="7days">Últimos 7 Días</option>
                                    <option value="30days">Últimos 30 Días</option>
                                </select>
                            </div>

                            {/* 2. País */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">País</label>
                                <select
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="all">Todos los Países</option>
                                    {availableCountries.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Dispositivo */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">Dispositivo</label>
                                <select
                                    value={deviceFilter}
                                    onChange={(e) => setDeviceFilter(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="all">Todos los Dispositivos</option>
                                    <option value="Móvil">Móvil</option>
                                    <option value="Desktop">Desktop (PC/Mac)</option>
                                    <option value="Tablet">Tablet</option>
                                </select>
                            </div>

                            {/* 4. Canal de Origen */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">Canal de Entrada</label>
                                <select
                                    value={originFilter}
                                    onChange={(e) => setOriginFilter(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="all">Todos los Orígenes</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Google">Google Search</option>
                                    <option value="Directo">Directo</option>
                                </select>
                            </div>

                            {/* 5. Estado de Suscripción */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">Suscripción</label>
                                <select
                                    value={subscribedFilter}
                                    onChange={(e) => setSubscribedFilter(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="all">Todos</option>
                                    <option value="subscribed">Solo Suscritos ❤️</option>
                                    <option value="not_subscribed">No Suscritos</option>
                                </select>
                            </div>

                            {/* 6. Búsqueda de Texto en Vivo */}
                            <div>
                                <label className="text-[10px] text-zinc-500 font-semibold block mb-1">Buscar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ciudad, IP, origen..."
                                        value={tableSearchQuery}
                                        onChange={(e) => setTableSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl pl-8 pr-2.5 py-2 focus:outline-none focus:border-cyan-400"
                                    />
                                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= INTERACTIVE MASTER KPI CARDS ================= */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 text-left">
                    {/* 1. Visitas */}
                    <div
                        onClick={() => setSelectedKpiModal('visits')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-400 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver el desglose detallado de visitas y usuarios únicos"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-cyan-300">Total Visitas</span>
                            <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.totalVisits}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>{metrics.uniqueUsers} únicos</span>
                                <span className="text-[10px] text-cyan-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Suscripciones */}
                    <div
                        onClick={() => setSelectedKpiModal('subs')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-red-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver qué vídeos y secciones convirtieron a cada suscriptor"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-red-400">Suscripciones</span>
                            <Heart className="w-4 h-4 text-red-500 fill-red-500/30" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.totalSubscribers}</div>
                            <div className="text-[11px] text-emerald-400 font-bold mt-0.5 flex items-center justify-between">
                                <span>{metrics.subscriptionRate}% conv.</span>
                                <span className="text-[10px] text-red-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Tiempo Medio */}
                    <div
                        onClick={() => setSelectedKpiModal('dwell')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver cuánto tiempo pasan en el Hero, Videoteca, Doctor 3D y Descargas"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-blue-300">Tiempo Medio</span>
                            <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{formatDuration(metrics.avgDurationSeconds)}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>Permanencia activa</span>
                                <span className="text-[10px] text-blue-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Clics en Tarjetas */}
                    <div
                        onClick={() => setSelectedKpiModal('cards')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver qué vídeos y categorías tienen más tirón"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-amber-300">Tarjetas / Vídeos</span>
                            <Layers className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.cardClicksCount}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>{metrics.videoOpensCount} vistos</span>
                                <span className="text-[10px] text-amber-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. Descargas */}
                    <div
                        onClick={() => setSelectedKpiModal('downloads')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver qué archivos .3MF y perfiles se descargan más"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-cyan-300">Descargas .3MF</span>
                            <Download className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.downloadsCount}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>Perfiles / presets</span>
                                <span className="text-[10px] text-cyan-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>

                    {/* 6. País Líder */}
                    <div
                        onClick={() => setSelectedKpiModal('countries')}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-lg group relative"
                        title="Haz clic para ver el mapa y desglose por ciudades y países"
                    >
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold group-hover:text-emerald-300">País Líder</span>
                            <Globe className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-lg font-black text-white flex items-center gap-1.5 truncate">
                                <span>{metrics.topCountry.flag}</span>
                                <span className="truncate">{metrics.topCountry.name}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>{metrics.totalVisits > 0 ? Math.round((metrics.topCountry.count / metrics.totalVisits) * 100) : 0}% tráfico</span>
                                <span className="text-[10px] text-emerald-400 underline font-semibold">Ver detalle ➔</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= TABS NAVIGATION ================= */}
                <div className="flex items-center gap-2 bg-zinc-950/90 p-1.5 rounded-2xl border border-zinc-800/80 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', label: 'Visión General', icon: BarChart2 },
                        { id: 'geo', label: 'Geolocalización & Países', icon: Globe },
                        { id: 'subscriptions', label: 'Suscripciones & Origen', icon: Heart },
                        { id: 'content', label: 'Tarjetas & Tirón', icon: Layers },
                        { id: 'dwell', label: 'Tiempos & Secciones', icon: Clock },
                        { id: 'doctor_searches', label: 'Doctor 3D & Búsquedas', icon: Stethoscope },
                        { id: 'timeline', label: 'Registro en Vivo', icon: Sparkles }
                    ].map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ================= TAB 1: VISIÓN GENERAL ================= */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 text-left">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Gráfica de Evolución de Visitas */}
                            <div className="lg:col-span-7 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                                            Evolución Temporal de Visitas
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">Pasa el ratón por cada barra para ver visitas y conversiones exactas</p>
                                    </div>
                                </div>

                                {metrics.dailyTimeline.length > 0 ? (
                                    <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 border-b border-zinc-800/80">
                                        {metrics.dailyTimeline.slice(-14).map((d, i) => {
                                            const maxV = Math.max(...metrics.dailyTimeline.map(it => it.visits), 1);
                                            const heightPercent = Math.max(12, Math.round((d.visits / maxV) * 100));
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                                    {/* Hover Tooltip */}
                                                    <div className="absolute -top-14 bg-zinc-900 border border-cyan-500/50 text-white text-[11px] py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30 shadow-2xl shadow-blue-950/80">
                                                        <strong className="text-cyan-400 block">{d.date}</strong>
                                                        <span>{d.visits} visitas</span> · <span className="text-red-400 font-bold">{d.subs} suscriptores</span>
                                                    </div>

                                                    <div
                                                        style={{ height: `${heightPercent}%` }}
                                                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all group-hover:from-blue-500 group-hover:to-cyan-300 relative overflow-hidden"
                                                    >
                                                        {d.subs > 0 && (
                                                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_red]" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 font-mono rotate-45 sm:rotate-0 mt-1">
                                                        {d.date.substring(5)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
                                        No hay datos temporales registrados para estos filtros.
                                    </div>
                                )}
                            </div>

                            {/* Embudo de Conversión (Funnel) */}
                            <div className="lg:col-span-5 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                        Embudo de Conversión (Funnel)
                                    </h3>
                                    <span className="text-xs text-zinc-500">(Paso a paso)</span>
                                </div>
                                <p className="text-xs text-zinc-400 mb-6">Porcentaje de usuarios que avanzan en cada fase</p>

                                <div className="space-y-4">
                                    {metrics.funnel.map((step, idx) => (
                                        <div key={idx} className="space-y-1.5 group relative" title={`Fase: ${step.step} (${step.count} usuarios, ${step.percent}%)`}>
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-zinc-300">{step.step}</span>
                                                <span className="text-cyan-400 font-bold">{step.count} ({step.percent}%)</span>
                                            </div>
                                            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                                <div
                                                    style={{ width: `${Math.max(5, step.percent)}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        idx === 0 ? 'bg-zinc-500' :
                                                        idx === 1 ? 'bg-blue-500' :
                                                        idx === 2 ? 'bg-cyan-400' : 'bg-gradient-to-r from-red-500 to-pink-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-4 rounded-2xl bg-blue-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 flex items-start gap-2.5">
                                    <Heart className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Tasa de conversión actual: {metrics.subscriptionRate}%</strong>. Cada 100 visitas consigues {Math.round(metrics.totalVisits * (metrics.subscriptionRate / 100))} suscriptores nuevos.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Devices & Origins Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Dispositivos */}
                            <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                                    <Smartphone className="w-5 h-5 text-cyan-400" />
                                    Distribución por Dispositivo
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(metrics.deviceMap).map(([device, count]) => {
                                        const pct = metrics.totalVisits > 0 ? Math.round((count / metrics.totalVisits) * 100) : 0;
                                        return (
                                            <div key={device} className="space-y-1" title={`${device}: ${count} usuarios (${pct}%)`}>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-300 font-semibold flex items-center gap-2">
                                                        {device === 'Móvil' ? <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> :
                                                         device === 'Desktop' ? <Monitor className="w-3.5 h-3.5 text-blue-400" /> :
                                                         <Tablet className="w-3.5 h-3.5 text-purple-400" />}
                                                        {device}
                                                    </span>
                                                    <span className="text-zinc-400 font-mono">{count} ({pct}%)</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div style={{ width: `${pct}%` }} className="h-full bg-cyan-400 rounded-full" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Canales de Origen */}
                            <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                                    <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                                    Canales de Entrada (Tráfico)
                                </h3>
                                <div className="space-y-3">
                                    {metrics.originsRank.slice(0, 5).map((orig) => {
                                        const pct = metrics.totalVisits > 0 ? Math.round((orig.count / metrics.totalVisits) * 100) : 0;
                                        return (
                                            <div key={orig.origin} className="space-y-1" title={`${orig.origin}: ${orig.count} visitas (${pct}%)`}>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-300 font-semibold truncate max-w-[220px]" title={orig.origin}>
                                                        {orig.origin}
                                                    </span>
                                                    <span className="text-zinc-400 font-mono">{orig.count} ({pct}%)</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div style={{ width: `${pct}%` }} className="h-full bg-blue-500 rounded-full" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 2: GEOLOCALIZACIÓN ================= */}
                {activeTab === 'geo' && (
                    <div className="space-y-6 text-left">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Ranking de Países */}
                            <div className="lg:col-span-7 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Globe className="w-5 h-5 text-cyan-400" />
                                    Visitas por Países
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">De qué países provienen tus espectadores y quiénes se suscriben más</p>

                                <div className="space-y-3.5">
                                    {metrics.countriesRank.map((c) => {
                                        const pct = metrics.totalVisits > 0 ? Math.round((c.count / metrics.totalVisits) * 100) : 0;
                                        return (
                                            <div
                                                key={c.name}
                                                onClick={() => setCountryFilter(c.name)}
                                                className="p-3.5 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl border border-zinc-800/60 hover:border-cyan-500/40 flex items-center justify-between gap-4 cursor-pointer transition-all"
                                                title={`Haz clic para filtrar todo el panel por ${c.name}`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <span className="text-2xl">{c.flag}</span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                                                            <span>{c.name}</span>
                                                            <span className="text-cyan-400 font-mono">{c.count} visitas ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                                                            <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                                                        {c.subs} subs
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ranking de Provincias y Ciudades */}
                            <div className="lg:col-span-5 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Globe className="w-5 h-5 text-blue-400" />
                                    Top Ciudades y Provincias
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Ubicaciones más activas detectadas</p>

                                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                                    {metrics.citiesRank.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/40 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <span>{c.flag}</span>
                                                <strong className="text-zinc-200 truncate">{c.city}</strong>
                                                <span className="text-zinc-500 text-[11px] truncate">({c.country})</span>
                                            </div>
                                            <span className="font-mono text-cyan-400 font-bold shrink-0">{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 3: SUSCRIPCIONES Y ORIGEN ================= */}
                {activeTab === 'subscriptions' && (
                    <div className="space-y-6 text-left">
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <Heart className="w-5 h-5 text-red-500 fill-red-500/30" />
                                        ¿Desde qué Vídeo o Sección se Suscribieron?
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Pasa el ratón por cualquier vídeo para ver su miniatura flotante y detalles
                                    </p>
                                </div>
                                <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold px-3 py-1.5 rounded-xl self-start sm:self-auto">
                                    {metrics.totalSubscribers} Suscriptores Totales
                                </div>
                            </div>

                            {/* Ranking de Atribución con Vista Previa Flotante */}
                            <div className="space-y-3 mb-8">
                                {metrics.subsOriginRank.map((item, idx) => {
                                    const pct = metrics.totalSubscribers > 0 ? Math.round((item.count / metrics.totalSubscribers) * 100) : 0;
                                    const matchedVideo = findVideoByTitle(item.origin);

                                    return (
                                        <div
                                            key={idx}
                                            onMouseEnter={(e) => {
                                                if (matchedVideo) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoveredVideoPreview({
                                                        video: matchedVideo,
                                                        x: rect.left,
                                                        y: rect.bottom + 8,
                                                        contextText: `Generó ${item.count} suscriptores (${pct}%)`
                                                    });
                                                }
                                            }}
                                            onMouseLeave={() => setHoveredVideoPreview(null)}
                                            className="p-4 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/70 hover:border-red-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                                                        #{idx + 1}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <span>{item.origin}</span>
                                                        {matchedVideo?.youtubeUrl && (
                                                            <Eye className="w-3.5 h-3.5 text-cyan-400 opacity-60" />
                                                        )}
                                                    </h4>
                                                </div>
                                                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden mt-2">
                                                    <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-base font-black text-white">{item.count}</span>
                                                <span className="text-xs text-zinc-400 ml-1">({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Historial cronológico de suscriptores */}
                            <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
                                Últimos Suscriptores Registrados (Pasa el ratón para ver miniatura)
                            </h4>
                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                                    <thead>
                                        <tr className="bg-black/50 border-b border-zinc-800 text-zinc-400 font-mono uppercase">
                                            <th className="p-3.5">Fecha / Hora</th>
                                            <th className="p-3.5">Ubicación</th>
                                            <th className="p-3.5">Dispositivo</th>
                                            <th className="p-3.5">Canal de Entrada</th>
                                            <th className="p-3.5">Suscrito Desde</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {metrics.rawSessions.filter(s => s.hasSubscribed).slice(0, 20).map((s, i) => {
                                            const v = findVideoByTitle(s.subscribedFrom);
                                            return (
                                                <tr
                                                    key={i}
                                                    onMouseEnter={(e) => {
                                                        if (v) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredVideoPreview({
                                                                video: v,
                                                                x: rect.left + 200,
                                                                y: rect.bottom + 4,
                                                                contextText: `Suscriptor desde ${s.city || 'Desconocida'} (${s.country})`
                                                            });
                                                        }
                                                    }}
                                                    onMouseLeave={() => setHoveredVideoPreview(null)}
                                                    className="hover:bg-zinc-800/60 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-3.5 text-zinc-300 whitespace-nowrap">{formatDate(s.timestamp)}</td>
                                                    <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                                                        <span className="mr-1.5">{s.flag}</span> {s.city}, {s.country}
                                                    </td>
                                                    <td className="p-3.5 text-zinc-400">{s.device} ({s.os})</td>
                                                    <td className="p-3.5 text-zinc-400">{s.origin}</td>
                                                    <td className="p-3.5 font-bold text-red-400 flex items-center gap-1.5">
                                                        <span>{s.subscribedFrom}</span>
                                                        <Eye className="w-3 h-3 opacity-60 text-cyan-400" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 4: TARJETAS Y CONTENIDO ================= */}
                {activeTab === 'content' && (
                    <div className="space-y-6 text-left">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Ranking de Tarjetas de Vídeo */}
                            <div className="lg:col-span-7 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Layers className="w-5 h-5 text-cyan-400" />
                                    Vídeos con Mayor Tirón
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Qué tutoriales abrieron o reprodujeron los usuarios (Pasa el ratón para miniatura)</p>

                                <div className="space-y-3">
                                    {metrics.videoCardsRank.map((v, idx) => {
                                        const videoObj = findVideoByTitle(v.title);
                                        return (
                                            <div
                                                key={idx}
                                                onMouseEnter={(e) => {
                                                    if (videoObj) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHoveredVideoPreview({
                                                            video: videoObj,
                                                            x: rect.left,
                                                            y: rect.bottom + 8,
                                                            contextText: `${v.clicks} clics de tarjeta · ${v.plays} reproducciones`
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => setHoveredVideoPreview(null)}
                                                className="p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-cyan-500/40 rounded-2xl flex items-start justify-between gap-3 transition-all cursor-pointer"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-black text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                                                            #{idx + 1}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                                                            {v.category}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-white line-clamp-2 mt-1">
                                                        {v.title}
                                                    </h4>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-black text-cyan-400">{v.clicks + v.plays}</span>
                                                    <span className="text-[11px] text-zinc-500 block">interacciones</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ranking de Descargas de Recursos */}
                            <div className="lg:col-span-5 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Download className="w-5 h-5 text-emerald-400" />
                                    Perfiles y Archivos .3MF Más Descargados
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Recursos que mayor interés generan</p>

                                <div className="space-y-3">
                                    {metrics.downloadsRank.map((dl, idx) => (
                                        <div key={idx} className="p-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-white truncate" title={dl.label}>
                                                    {dl.label}
                                                </h4>
                                                {dl.videoTitle && (
                                                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                                        {dl.videoTitle}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl shrink-0 font-mono">
                                                {dl.count} descargas
                                            </span>
                                        </div>
                                    ))}
                                    {metrics.downloadsRank.length === 0 && (
                                        <p className="text-xs text-zinc-500 text-center py-6">No hay descargas registradas en este periodo.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 5: TIEMPOS Y SECCIONES (DWELL TIME) ================= */}
                {activeTab === 'dwell' && (
                    <div className="space-y-6 text-left">
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                <Clock className="w-5 h-5 text-cyan-400" />
                                Tiempo de Permanencia Activa por Sección (Dwell Time)
                            </h3>
                            <p className="text-xs text-zinc-400 mb-6">
                                Cuántos segundos reales pasan los usuarios leyendo o explorando cada zona de la página
                            </p>

                            <div className="space-y-4 mb-8">
                                {metrics.sectionDwellRank.map((sec) => {
                                    const maxTotal = Math.max(...metrics.sectionDwellRank.map(s => s.totalSec), 1);
                                    const pct = Math.round((sec.totalSec / maxTotal) * 100);
                                    return (
                                        <div key={sec.section} className="p-4 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl space-y-2" title={`Tiempo promedio: ${formatDuration(sec.avgSec)} | Total: ${formatDuration(sec.totalSec)}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                <span className="text-sm font-bold text-white">{sec.section}</span>
                                                <div className="flex items-center gap-3 text-zinc-400">
                                                    <span>Media: <strong className="text-cyan-400">{formatDuration(sec.avgSec)}</strong></span>
                                                    <span>•</span>
                                                    <span>Total acumulado: <strong className="text-white">{formatDuration(sec.totalSec)}</strong></span>
                                                    <span>•</span>
                                                    <span>{sec.sessionsReached} usuarios</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${Math.max(8, pct)}%` }}
                                                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 6: DOCTOR 3D Y BÚSQUEDAS ================= */}
                {activeTab === 'doctor_searches' && (
                    <div className="space-y-6 text-left">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Doctor 3D: Síntomas Consultados */}
                            <div className="lg:col-span-6 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Stethoscope className="w-5 h-5 text-cyan-400" />
                                    🩺 Fallos Consultados en Doctor 3D
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Qué problemas mecánicos o de laminado sufren más tus espectadores</p>

                                <div className="space-y-3">
                                    {metrics.doctorSymptomsRank.map((s, idx) => (
                                        <div key={idx} className="p-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl flex items-center justify-between gap-3">
                                            <span className="text-xs font-bold text-white">{s.symptom}</span>
                                            <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-xl font-mono">
                                                {s.count} consultas
                                            </span>
                                        </div>
                                    ))}
                                    {metrics.doctorSymptomsRank.length === 0 && (
                                        <p className="text-xs text-zinc-500 text-center py-6">No hay consultas de Doctor 3D registradas.</p>
                                    )}
                                </div>
                            </div>

                            {/* Búsquedas en el Buscador e Ideas de Nuevos Vídeos */}
                            <div className="lg:col-span-6 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Search className="w-5 h-5 text-amber-400" />
                                    Términos Buscados (Ideas de Contenido)
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Qué palabras teclean los usuarios en la barra de búsqueda</p>

                                <div className="space-y-2.5">
                                    {metrics.searchKeywordsRank.slice(0, 10).map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 text-xs">
                                            <span className="font-bold text-white font-mono">"{s.term}"</span>
                                            <div className="flex items-center gap-2">
                                                {s.resultsCount === 0 && (
                                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                                                        💡 Idea Nuevo Vídeo (0 res)
                                                    </span>
                                                )}
                                                <span className="font-bold text-cyan-400 font-mono">{s.count} búsquedas</span>
                                            </div>
                                        </div>
                                    ))}
                                    {metrics.searchKeywordsRank.length === 0 && (
                                        <p className="text-xs text-zinc-500 text-center py-6">No hay búsquedas registradas.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 7: REGISTRO EN VIVO (TIMELINE) ================= */}
                {activeTab === 'timeline' && (
                    <div className="space-y-6 text-left">
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-cyan-400" />
                                        Registro de Sesiones de Visitantes
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Pasa el ratón por la columna de suscrito para ver el modal flotante con la vista previa del vídeo
                                    </p>
                                </div>
                                <div className="text-xs text-zinc-400">
                                    Filtrado activo: <strong className="text-white">{metrics.rawSessions.length}</strong> sesiones
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                                    <thead>
                                        <tr className="bg-black/50 border-b border-zinc-800 text-zinc-400 font-mono uppercase">
                                            <th className="p-3.5">Fecha</th>
                                            <th className="p-3.5">Ubicación</th>
                                            <th className="p-3.5">Dispositivo</th>
                                            <th className="p-3.5">Origen</th>
                                            <th className="p-3.5">Permanencia</th>
                                            <th className="p-3.5">¿Suscrito? (Pasa ratón para Frame)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {metrics.rawSessions.slice(0, 40).map((s, i) => {
                                            const videoObj = findVideoByTitle(s.subscribedFrom);
                                            return (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-zinc-800/50 transition-colors"
                                                >
                                                    <td className="p-3.5 text-zinc-300 whitespace-nowrap">{formatDate(s.timestamp)}</td>
                                                    <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                                                        <span className="mr-1.5">{s.flag}</span> {s.city}, {s.country}
                                                    </td>
                                                    <td className="p-3.5 text-zinc-400">{s.device} ({s.browser})</td>
                                                    <td className="p-3.5 text-zinc-400">{s.origin}</td>
                                                    <td className="p-3.5 text-cyan-400 font-mono">{formatDuration(s.totalActiveSeconds)}</td>
                                                    <td className="p-3.5">
                                                        {s.hasSubscribed ? (
                                                            <div
                                                                onMouseEnter={(e) => {
                                                                    if (videoObj) {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredVideoPreview({
                                                                            video: videoObj,
                                                                            x: Math.max(10, rect.left - 150),
                                                                            y: rect.bottom + 8,
                                                                            contextText: `Suscripción generada desde: ${s.subscribedFrom}`
                                                                        });
                                                                    }
                                                                }}
                                                                onMouseLeave={() => setHoveredVideoPreview(null)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-2.5 py-1 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm"
                                                            >
                                                                <Heart className="w-3.5 h-3.5 fill-red-400 shrink-0" />
                                                                <span className="truncate max-w-[200px]">{s.subscribedFrom}</span>
                                                                <Eye className="w-3 h-3 text-cyan-400 ml-1" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-zinc-600 font-mono">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= FLOATING HOVER PREVIEW MODAL / FRAME ================= */}
                {hoveredVideoPreview && (
                    <div
                        style={{
                            position: 'fixed',
                            top: `${Math.min(window.innerHeight - 320, hoveredVideoPreview.y)}px`,
                            left: `${Math.min(window.innerWidth - 360, hoveredVideoPreview.x)}px`,
                            zIndex: 100
                        }}
                        className="w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-md border border-cyan-500/50 rounded-3xl p-4 shadow-2xl shadow-blue-950/80 animate-fade-in pointer-events-none text-left"
                    >
                        {/* Thumbnail Frame */}
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-3 bg-black border border-zinc-800">
                            <img
                                src={hoveredVideoPreview.video.thumbnail || '/logo-capa-cero-small.png'}
                                alt={hoveredVideoPreview.video.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/logo-capa-cero-small.png'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg border border-cyan-300/40">
                                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                                </div>
                            </div>
                            <div className="absolute top-2 left-2">
                                <span className="text-[10px] font-bold text-white bg-blue-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-md backdrop-blur-md">
                                    {hoveredVideoPreview.video.category || 'Tutorial'}
                                </span>
                            </div>
                        </div>

                        {/* Title & Context */}
                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight mb-2">
                            {hoveredVideoPreview.video.title}
                        </h4>

                        <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-[11px] text-red-200 flex items-center gap-2 font-medium">
                            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 shrink-0" />
                            <span className="truncate">{hoveredVideoPreview.contextText}</span>
                        </div>
                    </div>
                )}

                {/* ================= MASTER KPI DRILL-DOWN MODAL ================= */}
                {selectedKpiModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                        <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto text-left space-y-6">
                            
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-950/60 border border-cyan-500/30 rounded-2xl">
                                        {selectedKpiModal === 'visits' && <Users className="w-6 h-6 text-cyan-400" />}
                                        {selectedKpiModal === 'subs' && <Heart className="w-6 h-6 text-red-500 fill-red-500/30" />}
                                        {selectedKpiModal === 'dwell' && <Clock className="w-6 h-6 text-blue-400" />}
                                        {selectedKpiModal === 'cards' && <Layers className="w-6 h-6 text-amber-400" />}
                                        {selectedKpiModal === 'downloads' && <Download className="w-6 h-6 text-emerald-400" />}
                                        {selectedKpiModal === 'countries' && <Globe className="w-6 h-6 text-cyan-400" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">
                                            {selectedKpiModal === 'visits' && 'Desglose Detallado: Visitas y Usuarios'}
                                            {selectedKpiModal === 'subs' && 'Desglose Detallado: Suscripciones y Atribución'}
                                            {selectedKpiModal === 'dwell' && 'Desglose Detallado: Permanencia y Retención'}
                                            {selectedKpiModal === 'cards' && 'Desglose Detallado: Rendimiento de Tarjetas'}
                                            {selectedKpiModal === 'downloads' && 'Desglose Detallado: Descargas .3MF'}
                                            {selectedKpiModal === 'countries' && 'Desglose Detallado: Países y Ciudades'}
                                        </h3>
                                        <p className="text-xs text-zinc-400">Información profunda con filtros aplicados</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedKpiModal(null)}
                                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content depending on KPI */}
                            {selectedKpiModal === 'visits' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                                            <span className="text-[11px] text-zinc-500 block">Total Visitas</span>
                                            <strong className="text-xl text-white">{metrics.totalVisits}</strong>
                                        </div>
                                        <div className="p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                                            <span className="text-[11px] text-zinc-500 block">Usuarios Únicos</span>
                                            <strong className="text-xl text-cyan-400">{metrics.uniqueUsers}</strong>
                                        </div>
                                        <div className="p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                                            <span className="text-[11px] text-zinc-500 block">Frecuencia Media</span>
                                            <strong className="text-xl text-emerald-400">
                                                {metrics.uniqueUsers > 0 ? (metrics.totalVisits / metrics.uniqueUsers).toFixed(1) : 1}x
                                            </strong>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 text-xs text-zinc-300">
                                        <strong>Consejo para el Canal:</strong> El {Math.round(metrics.deviceMap['Móvil'] / (metrics.totalVisits || 1) * 100)}% de tu audiencia entra desde el móvil. Asegúrate de que tus miniaturas y primeros 10 segundos de vídeo sean ultra claros en pantallas pequeñas.
                                    </div>
                                </div>
                            )}

                            {selectedKpiModal === 'subs' && (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 text-xs text-red-200">
                                        <strong>Vídeo #1 con mayor conversión:</strong> "{metrics.subsOriginRank[0]?.origin || 'Canal General'}" generó {metrics.subsOriginRank[0]?.count || 0} suscriptores directos.
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {metrics.subsOriginRank.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                                                <span className="font-bold text-white truncate max-w-[380px]">{s.origin}</span>
                                                <span className="font-mono text-red-400 font-bold">{s.count} suscriptores</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedKpiModal === 'dwell' && (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {metrics.sectionDwellRank.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                                                <span className="font-bold text-white">{s.section}</span>
                                                <span className="font-mono text-cyan-400 font-bold">{formatDuration(s.avgSec)} / usuario</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedKpiModal === 'cards' && (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {metrics.videoCardsRank.map((v, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                                                <span className="font-bold text-white truncate max-w-[360px]">{v.title}</span>
                                                <span className="font-mono text-amber-400 font-bold">{v.clicks + v.plays} interacciones</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedKpiModal === 'downloads' && (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {metrics.downloadsRank.map((d, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                                                <span className="font-bold text-white truncate max-w-[360px]">{d.label}</span>
                                                <span className="font-mono text-emerald-400 font-bold">{d.count} descargas</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedKpiModal === 'countries' && (
                                <div className="space-y-4">
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {metrics.countriesRank.map((c, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                                                <span className="font-bold text-white flex items-center gap-2">
                                                    <span>{c.flag}</span>
                                                    <span>{c.name}</span>
                                                </span>
                                                <span className="font-mono text-cyan-400 font-bold">{c.count} visitas ({c.subs} subs)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setSelectedKpiModal(null)}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= HELP & INTERPRETATION MODAL ================= */}
                {isHelpModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                        <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto text-left space-y-6 max-h-[90vh] overflow-y-auto">
                            
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-950/60 border border-cyan-500/30 rounded-2xl">
                                        <HelpCircle className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">
                                            💡 Guía para Interpretar tus Estadísticas
                                        </h3>
                                        <p className="text-xs text-zinc-400">Cómo usar estos datos para hacer crecer tu canal de YouTube</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsHelpModalOpen(false)}
                                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1.5">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-red-500" />
                                        1. ¿Qué significa la Atribución de Suscripción?
                                    </h4>
                                    <p className="text-zinc-400 text-xs">
                                        Cuando un espectador entra a la web y decide pulsar "Suscribirme al Canal", el sistema guarda qué vídeo o qué sección estaba mirando en ese segundo exacto. Si ves que un tutorial tiene 25 suscriptores y otro solo 2, significa que el primer tema tiene muchísimo más "tirón" y deberías hacer más vídeos de esa temática.
                                    </p>
                                </div>

                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1.5">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-cyan-400" />
                                        2. ¿Qué es el Dwell Time (Tiempo de Permanencia Activa)?
                                    </h4>
                                    <p className="text-zinc-400 text-xs">
                                        Mide los segundos reales que el usuario pasa leyendo una sección (se pausa automáticamente si cambia de pestaña). Un tiempo superior a 45s en la Videoteca o en el Doctor 3D indica que la gente lee tus descripciones y consejos con mucho interés.
                                    </p>
                                </div>

                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1.5">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Search className="w-4 h-4 text-amber-400" />
                                        3. ¿Cómo usar las Búsquedas con 0 Resultados?
                                    </h4>
                                    <p className="text-zinc-400 text-xs">
                                        Son términos que los usuarios teclean en tu buscador pero para los que aún no tienes ningún vídeo grabado. ¡Son minas de oro! Si grabas un tutorial sobre esa palabra exacta, se posicionará inmediatamente en los primeros puestos de YouTube y Google.
                                    </p>
                                </div>

                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1.5">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-emerald-400" />
                                        4. ¿Para qué sirve el ranking del Doctor 3D?
                                    </h4>
                                    <p className="text-zinc-400 text-xs">
                                        Muestra cuáles son los problemas reales de impresión que más sufre tu comunidad (warping, hilos, costuras). Te da ideas directas para crear Shorts y tutoriales largos con soluciones prácticas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsHelpModalOpen(false)}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg"
                                >
                                    ¡Entendido!
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= GOOGLE SHEETS CONFIG MODAL ================= */}
                {isSheetsConfigModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                        <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto text-left space-y-6 max-h-[90vh] overflow-y-auto">
                            
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl">
                                        <Database className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">
                                            ⚙️ Conexión con Google Sheets
                                        </h3>
                                        <p className="text-xs text-zinc-400">Estructura de columnas requerida y script de sincronización</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSheetsConfigModalOpen(false)}
                                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Columnas Requeridas */}
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">
                                    1. Columnas necesarias en tu pestaña "Estadisticas" (Fila 1):
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 max-h-56 overflow-y-auto text-xs">
                                    {RECOMMENDED_SHEET_COLUMNS.map(col => (
                                        <div key={col.col} className="p-2 rounded-lg bg-black/40 border border-zinc-800">
                                            <div className="font-mono text-cyan-400 font-bold">Col {col.col}: {col.name}</div>
                                            <div className="text-[11px] text-zinc-500 mt-0.5">{col.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Google Apps Script Code */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-white">
                                        2. Código Apps Script Unificado (Vídeos + Estadísticas + Webhook):
                                    </h4>
                                    <button
                                        onClick={handleCopyScript}
                                        className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedScript ? '¡Copiado!' : 'Copiar Código Completo'}</span>
                                    </button>
                                </div>
                                <div className="p-3 bg-blue-950/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-200 mb-2">
                                    💡 <strong>Paso 1:</strong> Pega este código en <em>Extensiones &gt; Apps Script</em> y guarda.<br />
                                    💡 <strong>Paso 2:</strong> Recarga tu Google Sheet y en el menú superior <strong>"🎥 Capa Cero"</strong> haz clic en <strong>"📊 Crear y Formatear Pestaña Estadísticas"</strong> para crear automáticamente las 19 columnas con sus anchos y formatos.<br />
                                    💡 <strong>Paso 3:</strong> Pulsa <em>Implementar &gt; Nueva Implementación &gt; Aplicación Web</em> (Acceso: Cualquier persona / Anyone) y copia la URL resultante abajo si deseas guardar en vivo.
                                </div>
                                <pre className="bg-black text-zinc-300 text-xs p-4 rounded-2xl border border-zinc-800 overflow-x-auto max-h-44 font-mono leading-relaxed">
                                    {GOOGLE_APPS_SCRIPT_CODE}
                                </pre>
                            </div>

                            {/* Campo de URL de Webhook para conexión en vivo */}
                            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Database className="w-4 h-4 text-cyan-400" />
                                    3. URL del Webhook de tu Aplicación Web (Opcional para guardado en vivo):
                                </h4>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="url"
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        defaultValue={localStorage.getItem('capa_cero_sheets_webhook') || ''}
                                        id="sheets-webhook-input"
                                        className="flex-1 bg-black border border-zinc-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('sheets-webhook-input');
                                            const val = input ? input.value.trim() : '';
                                            if (val) {
                                                localStorage.setItem('capa_cero_sheets_webhook', val);
                                                showToast('URL de Google Sheets Webhook guardada');
                                            } else {
                                                localStorage.removeItem('capa_cero_sheets_webhook');
                                                showToast('Webhook desactivado');
                                            }
                                        }}
                                        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
                                    >
                                        Guardar URL
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsSheetsConfigModalOpen(false)}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-zinc-600 text-xs py-4">
                    Capa Cero Analytics v4 · Sistema de telemetría completa · Filtros globales activos
                </div>

            </div>
        </div>
    );
}
