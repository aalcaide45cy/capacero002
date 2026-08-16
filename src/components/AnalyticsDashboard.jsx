import React, { useState, useEffect, useMemo } from 'react';
import {
    Lock, RefreshCw, BarChart2, Globe, Heart, Layers, Clock,
    Stethoscope, Search, Download, ArrowLeft, Users, Smartphone,
    Monitor, Tablet, ArrowUpRight, TrendingUp, ShieldCheck, CheckCircle2,
    Calendar, Sparkles, Filter, Trash2, Database, ExternalLink, HelpCircle
} from 'lucide-react';
import {
    loadAnalyticsData,
    computeAnalyticsMetrics,
    exportAnalyticsToCSV,
    exportAnalyticsToJSON,
    clearAnalyticsDB
} from '../utils/analyticsStorage';

const VAULT_PASSWORD = "Estadisticas02?";

export default function AnalyticsDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState(false);

    // Data States
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | '30days'
    const [tableSearchQuery, setTableSearchQuery] = useState('');
    const [selectedSessionModal, setSelectedSessionModal] = useState(null);
    const [statusToast, setStatusToast] = useState(null);

    // Verificar autenticación previa
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
            showToast('Datos analíticos actualizados con éxito');
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

    // Métricas procesadas y filtradas
    const metrics = useMemo(() => {
        return computeAnalyticsMetrics(sessions, events, dateFilter);
    }, [sessions, events, dateFilter]);

    // Formateador de fechas
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

    // Formatear segundos a min:seg
    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    // --- RENDER LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative selection:bg-[#2575c4] selection:text-white">
                <a href="/" className="absolute top-6 left-6 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4 text-cyan-400" /> Volver a Capa Cero
                </a>

                <div className="bg-zinc-950 p-8 sm:p-10 rounded-3xl max-w-md w-full border border-zinc-800 shadow-2xl shadow-blue-950/40 relative overflow-hidden">
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
                        Panel privado de estadísticas completas, geolocalización, suscripciones y dwell time.
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
                    <div className="fixed bottom-6 right-6 z-50 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        <span>{statusToast}</span>
                    </div>
                )}

                {/* ================= HEADER NAVBAR ================= */}
                <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
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
                                            v4 Pro
                                        </span>
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                                        <span className="flex items-center gap-1.5 text-emerald-400">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            Motor Local Activo (IndexedDB)
                                        </span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-zinc-500">
                                            Google Sheets: Desconectado (Listo para reconectar)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                            <button
                                onClick={fetchData}
                                disabled={isLoading}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                                title="Refrescar métricas"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : 'text-zinc-400'}`} />
                                <span>Refrescar</span>
                            </button>

                            <button
                                onClick={() => exportAnalyticsToCSV(metrics.rawSessions)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                                title="Descargar reporte en formato CSV"
                            >
                                <Download className="w-4 h-4 text-cyan-400" />
                                <span>Exportar CSV</span>
                            </button>

                            <button
                                onClick={() => exportAnalyticsToJSON(metrics.rawSessions, metrics.rawEvents)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                                title="Descargar copia de seguridad en JSON"
                            >
                                <Database className="w-4 h-4 text-cyan-400" />
                                <span>JSON</span>
                            </button>

                            <a
                                href="/"
                                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Ir a la Web</span>
                            </a>

                            <button
                                onClick={handleClearData}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-all"
                                title="Reiniciar datos locales"
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

                    {/* Date Filters Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-zinc-800/80">
                        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto no-scrollbar">
                            <span className="px-2.5 text-zinc-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Periodo:</span>
                            </span>
                            {[
                                { id: 'all', label: 'Todo el Histórico' },
                                { id: 'today', label: 'Hoy' },
                                { id: 'yesterday', label: 'Ayer' },
                                { id: '7days', label: 'Últimos 7 Días' },
                                { id: '30days', label: 'Últimos 30 Días' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setDateFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                                        dateFilter === f.id
                                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="text-xs text-zinc-400">
                            Mostrando <strong className="text-white">{metrics.totalVisits}</strong> sesiones y <strong className="text-white">{metrics.rawEvents.length}</strong> eventos registrados.
                        </div>
                    </div>
                </div>

                {/* ================= TOP MASTER KPI CARDS ================= */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                    {/* 1. Visitas */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">Total Visitas</span>
                            <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.totalVisits}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                                {metrics.uniqueUsers} usuarios únicos
                            </div>
                        </div>
                    </div>

                    {/* 2. Suscriptores */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-red-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">Suscripciones</span>
                            <Heart className="w-4 h-4 text-red-500 fill-red-500/30" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.totalSubscribers}</div>
                            <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                                {metrics.subscriptionRate}% tasa conv.
                            </div>
                        </div>
                    </div>

                    {/* 3. Tiempo Medio */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">Tiempo Medio</span>
                            <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{formatDuration(metrics.avgDurationSeconds)}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                                Permanencia activa
                            </div>
                        </div>
                    </div>

                    {/* 4. Clics en Tarjetas */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">Tarjetas / Vídeos</span>
                            <Layers className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.cardClicksCount}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                                {metrics.videoOpensCount} tutoriales vistos
                            </div>
                        </div>
                    </div>

                    {/* 5. Descargas */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">Descargas .3MF</span>
                            <Download className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.downloadsCount}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                                Perfiles y presets
                            </div>
                        </div>
                    </div>

                    {/* 6. País #1 */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-xs font-semibold">País Líder</span>
                            <Globe className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-lg font-black text-white flex items-center gap-1.5 truncate">
                                <span>{metrics.topCountry.flag}</span>
                                <span className="truncate">{metrics.topCountry.name}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                                {metrics.totalVisits > 0 ? Math.round((metrics.topCountry.count / metrics.totalVisits) * 100) : 0}% del tráfico
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
                    <div className="space-y-6">
                        {/* Timeline & Funnel Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Gráfica de Evolución de Visitas */}
                            <div className="lg:col-span-7 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                                            Evolución Temporal de Visitas
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">Sesiones y conversiones registradas por día</p>
                                    </div>
                                </div>

                                {metrics.dailyTimeline.length > 0 ? (
                                    <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 border-b border-zinc-800/80">
                                        {metrics.dailyTimeline.slice(-14).map((d, i) => {
                                            const maxV = Math.max(...metrics.dailyTimeline.map(it => it.visits), 1);
                                            const heightPercent = Math.max(12, Math.round((d.visits / maxV) * 100));
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-12 bg-zinc-900 border border-zinc-700 text-white text-[11px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                                        <strong className="text-cyan-400">{d.date}</strong>: {d.visits} visitas, {d.subs} subs
                                                    </div>

                                                    <div
                                                        style={{ height: `${heightPercent}%` }}
                                                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all group-hover:from-blue-500 group-hover:to-cyan-300 relative overflow-hidden"
                                                    >
                                                        {d.subs > 0 && (
                                                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_red]" />
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
                                        No hay datos temporales registrados todavía.
                                    </div>
                                )}
                            </div>

                            {/* Embudo de Conversión (Funnel) */}
                            <div className="lg:col-span-5 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Embudo de Conversión (Funnel)
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">De visitante casual a suscriptor fiel</p>

                                <div className="space-y-4">
                                    {metrics.funnel.map((step, idx) => (
                                        <div key={idx} className="space-y-1.5">
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
                                            <div key={device} className="space-y-1">
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
                                    Canales de Origen (Tráfico)
                                </h3>
                                <div className="space-y-3">
                                    {metrics.originsRank.slice(0, 5).map((orig) => {
                                        const pct = metrics.totalVisits > 0 ? Math.round((orig.count / metrics.totalVisits) * 100) : 0;
                                        return (
                                            <div key={orig.origin} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-300 font-semibold truncate max-w-[200px]" title={orig.origin}>
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
                    <div className="space-y-6">
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
                                            <div key={c.name} className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/60 flex items-center justify-between gap-4">
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
                                                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
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

                                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
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
                    <div className="space-y-6">
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <Heart className="w-5 h-5 text-red-500 fill-red-500/30" />
                                        ¿Desde qué Vídeo o Sección se Suscribieron?
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Atribución exacta del contenido que motivó a los usuarios a suscribirse al canal
                                    </p>
                                </div>
                                <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold px-3 py-1.5 rounded-xl self-start sm:self-auto">
                                    {metrics.totalSubscribers} Suscriptores Totales
                                </div>
                            </div>

                            {/* Ranking de Atribución */}
                            <div className="space-y-3 mb-8">
                                {metrics.subsOriginRank.map((item, idx) => {
                                    const pct = metrics.totalSubscribers > 0 ? Math.round((item.count / metrics.totalSubscribers) * 100) : 0;
                                    return (
                                        <div key={idx} className="p-4 bg-zinc-900/70 border border-zinc-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                                                        #{idx + 1}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-white">
                                                        {item.origin}
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
                                Últimos Suscriptores Registrados
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
                                        {metrics.rawSessions.filter(s => s.hasSubscribed).slice(0, 15).map((s, i) => (
                                            <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                                                <td className="p-3.5 text-zinc-300 whitespace-nowrap">{formatDate(s.timestamp)}</td>
                                                <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                                                    <span className="mr-1.5">{s.flag}</span> {s.city}, {s.country}
                                                </td>
                                                <td className="p-3.5 text-zinc-400">{s.device} ({s.os})</td>
                                                <td className="p-3.5 text-zinc-400">{s.origin}</td>
                                                <td className="p-3.5 font-bold text-red-400">{s.subscribedFrom}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 4: TARJETAS Y CONTENIDO ================= */}
                {activeTab === 'content' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Ranking de Tarjetas de Vídeo */}
                            <div className="lg:col-span-7 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    <Layers className="w-5 h-5 text-cyan-400" />
                                    Vídeos con Mayor Tirón
                                </h3>
                                <p className="text-xs text-zinc-400 mb-6">Qué tutoriales abrieron o reprodujeron los usuarios</p>

                                <div className="space-y-3">
                                    {metrics.videoCardsRank.map((v, idx) => (
                                        <div key={idx} className="p-4 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl flex items-start justify-between gap-3">
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
                                    ))}
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
                    <div className="space-y-6">
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
                                        <div key={sec.section} className="p-4 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl space-y-2">
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
                    <div className="space-y-6">
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
                    <div className="space-y-6">
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-cyan-400" />
                                        Registro de Sesiones de Visitantes
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Detalle de cada usuario, ubicación, duración y acciones realizadas
                                    </p>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por ciudad, país, IP..."
                                        value={tableSearchQuery}
                                        onChange={(e) => setTableSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 pl-9 pr-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-400"
                                    />
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
                                            <th className="p-3.5 text-center">¿Suscrito?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {metrics.rawSessions
                                            .filter(s => {
                                                const q = tableSearchQuery.toLowerCase();
                                                return !q ||
                                                    (s.country && s.country.toLowerCase().includes(q)) ||
                                                    (s.city && s.city.toLowerCase().includes(q)) ||
                                                    (s.origin && s.origin.toLowerCase().includes(q)) ||
                                                    (s.ip && s.ip.toLowerCase().includes(q));
                                            })
                                            .slice(0, 30)
                                            .map((s, i) => (
                                                <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                                                    <td className="p-3.5 text-zinc-300 whitespace-nowrap">{formatDate(s.timestamp)}</td>
                                                    <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                                                        <span className="mr-1.5">{s.flag}</span> {s.city}, {s.country}
                                                    </td>
                                                    <td className="p-3.5 text-zinc-400">{s.device} ({s.browser})</td>
                                                    <td className="p-3.5 text-zinc-400">{s.origin}</td>
                                                    <td className="p-3.5 text-cyan-400 font-mono">{formatDuration(s.totalActiveSeconds)}</td>
                                                    <td className="p-3.5 text-center">
                                                        {s.hasSubscribed ? (
                                                            <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded-md">
                                                                ❤️ {s.subscribedFrom ? s.subscribedFrom.substring(0, 20) : 'SÍ'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-600">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Status */}
                <div className="text-center text-zinc-600 text-xs py-4">
                    Capa Cero Analytics v4 · Motor de datos autónomo · Privacidad y seguridad integradas
                </div>

            </div>
        </div>
    );
}
