/**
 * Capa Cero Analytics - Local Data Engine (IndexedDB + LocalStorage Fallback)
 * Proporciona almacenamiento de alta capacidad y cálculos agregados en tiempo real.
 */

const DB_NAME = 'CapaCeroAnalyticsDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const EVENTS_STORE = 'events';

// Abre la conexión con IndexedDB
const openDB = () => {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
                    const sessionStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'sessionId' });
                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionStore.createIndex('country', 'country', { unique: false });
                }
                if (!db.objectStoreNames.contains(EVENTS_STORE)) {
                    const eventStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id', autoIncrement: true });
                    eventStore.createIndex('sessionId', 'sessionId', { unique: false });
                    eventStore.createIndex('type', 'type', { unique: false });
                    eventStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
                console.warn('IndexedDB unavailable, falling back to LocalStorage', event.target.error);
                resolve(null);
            };
        } catch (e) {
            resolve(null);
        }
    });
};

// Guardar o actualizar sesión
export const saveSession = async (sessionData) => {
    try {
        const db = await openDB();
        if (db) {
            const tx = db.transaction(SESSIONS_STORE, 'readwrite');
            const store = tx.objectStore(SESSIONS_STORE);
            store.put(sessionData);
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        } else {
            // LocalStorage fallback
            const sessions = JSON.parse(localStorage.getItem('capa_cero_sessions') || '{}');
            sessions[sessionData.sessionId] = sessionData;
            localStorage.setItem('capa_cero_sessions', JSON.stringify(sessions));
        }
    } catch (e) {
        console.warn('Error saving session to analytics DB:', e);
    }
};

// Guardar evento
export const saveEvent = async (eventData) => {
    try {
        const eventWithTime = {
            ...eventData,
            timestamp: eventData.timestamp || new Date().toISOString()
        };

        const db = await openDB();
        if (db) {
            const tx = db.transaction(EVENTS_STORE, 'readwrite');
            const store = tx.objectStore(EVENTS_STORE);
            store.add(eventWithTime);
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        } else {
            // LocalStorage fallback (guardar últimos 500 eventos)
            const events = JSON.parse(localStorage.getItem('capa_cero_events') || '[]');
            events.push({ id: Date.now() + Math.random(), ...eventWithTime });
            if (events.length > 500) events.shift();
            localStorage.setItem('capa_cero_events', JSON.stringify(events));
        }
    } catch (e) {
        console.warn('Error saving event to analytics DB:', e);
    }
};

// Obtener todas las sesiones
export const getAllSessions = async () => {
    try {
        const db = await openDB();
        if (db) {
            return new Promise((resolve) => {
                const tx = db.transaction(SESSIONS_STORE, 'readonly');
                const store = tx.objectStore(SESSIONS_STORE);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } else {
            const sessions = JSON.parse(localStorage.getItem('capa_cero_sessions') || '{}');
            return Object.values(sessions);
        }
    } catch (e) {
        return [];
    }
};

// Obtener todos los eventos
export const getAllEvents = async () => {
    try {
        const db = await openDB();
        if (db) {
            return new Promise((resolve) => {
                const tx = db.transaction(EVENTS_STORE, 'readonly');
                const store = tx.objectStore(EVENTS_STORE);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } else {
            return JSON.parse(localStorage.getItem('capa_cero_events') || '[]');
        }
    } catch (e) {
        return [];
    }
};

// Limpiar todos los datos
export const clearAnalyticsDB = async () => {
    try {
        const db = await openDB();
        if (db) {
            const tx = db.transaction([SESSIONS_STORE, EVENTS_STORE], 'readwrite');
            tx.objectStore(SESSIONS_STORE).clear();
            tx.objectStore(EVENTS_STORE).clear();
            await new Promise((resolve) => { tx.oncomplete = resolve; });
        }
        localStorage.removeItem('capa_cero_sessions');
        localStorage.removeItem('capa_cero_events');
        localStorage.removeItem('capa_cero_analytics_demo');
        return true;
    } catch (e) {
        console.error('Error clearing analytics DB:', e);
        return false;
    }
};

// Datos Demostrativos para inicializar el panel si la base de datos está vacía
export const generateSeedData = () => {
    const countries = [
        { name: 'España', code: 'ES', flag: '🇪🇸', cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Bilbao'], weight: 55 },
        { name: 'México', code: 'MX', flag: '🇲🇽', cities: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'], weight: 18 },
        { name: 'Argentina', code: 'AR', flag: '🇦🇷', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'], weight: 9 },
        { name: 'Colombia', code: 'CO', flag: '🇨🇴', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'], weight: 7 },
        { name: 'Chile', code: 'CL', flag: '🇨🇱', cities: ['Santiago', 'Valparaíso', 'Concepción'], weight: 5 },
        { name: 'Estados Unidos', code: 'US', flag: '🇺🇸', cities: ['Miami', 'Los Angeles', 'New York'], weight: 4 },
        { name: 'Perú', code: 'PE', flag: '🇵🇪', cities: ['Lima', 'Arequipa'], weight: 2 }
    ];

    const videoTitles = [
        { id: 'v1', title: '¡Adiós a las costuras en Bambu Studio! El ajuste secreto (Scarf Seam)', cat: 'Bambu Studio', downloads: true },
        { id: 'v2', title: 'Primera Capa Perfecta en Placa PEI: Todo lo que nadie te cuenta', cat: 'Calibración', downloads: true },
        { id: 'v3', title: 'Soportes Tipo Árbol: Cómo retirarlos con un solo tirón', cat: 'Bambu Studio', downloads: false },
        { id: 'v4', title: 'Ahorra un 40% de tiempo en el laminador sin perder calidad', cat: 'Optimización', downloads: true },
        { id: 'v5', title: 'Doctor 3D: Solución definitiva a los hilos y stringing en PETG', cat: 'Diagnóstico', downloads: false },
        { id: 'v6', title: 'Ajuste de Avance de Presión (Pressure Advance) paso a paso', cat: 'Calibración', downloads: true },
        { id: 'v7', title: 'Impresión Multicolor Eficiente: Reduce la purga al mínimo', cat: 'Bambu Studio', downloads: true },
        { id: 'v8', title: 'Boquillas 0.4 vs 0.6 High-Flow: ¿Vale la pena el cambio?', cat: 'Hardware', downloads: false }
    ];

    const symptoms = [
        'Primera Capa y Adherencia (Warping)',
        'Hilos y Stringing (Pelos entre viajes)',
        'Costura Visible (Z-Seam)',
        'Soportes Pegados y Difíciles de Quitar',
        'Tiempos de Impresión Eternos'
    ];

    const searches = [
        { term: 'costura invisible', count: 42, results: 3 },
        { term: 'petg hilos', count: 35, results: 2 },
        { term: 'bambu studio calibrar cama', count: 28, results: 4 },
        { term: 'soportes arbol', count: 24, results: 2 },
        { term: 'perfil pla rapido', count: 19, results: 1 },
        { term: 'fusion 360 roscas', count: 14, results: 0 },
        { term: 'abs ventilacion camara', count: 11, results: 0 },
        { term: 'resina tiempos curado', count: 8, results: 0 }
    ];

    const origins = [
        { name: 'YouTube (Descripción/Fijado)', weight: 45 },
        { name: 'TikTok (@capacero)', weight: 25 },
        { name: 'Instagram (@capa.cero_3d)', weight: 15 },
        { name: 'Google Search (Orgánico)', weight: 10 },
        { name: 'Directo / Favoritos', weight: 5 }
    ];

    const devices = [
        { device: 'Móvil', os: 'Android', browser: 'Chrome Mobile', weight: 48 },
        { device: 'Móvil', os: 'iOS', browser: 'Safari Mobile', weight: 26 },
        { device: 'Desktop', os: 'Windows', browser: 'Chrome Desktop', weight: 18 },
        { device: 'Desktop', os: 'macOS', browser: 'Safari Desktop', weight: 5 },
        { device: 'Tablet', os: 'iPadOS', browser: 'Safari Tablet', weight: 3 }
    ];

    const sessions = [];
    const events = [];
    const now = Date.now();
    const days = 14;

    const pickWeighted = (arr) => {
        let total = arr.reduce((acc, it) => acc + it.weight, 0);
        let rand = Math.random() * total;
        for (let it of arr) {
            if (rand < it.weight) return it;
            rand -= it.weight;
        }
        return arr[0];
    };

    let eventIdCounter = 1;

    for (let i = 0; i < 185; i++) {
        const timeOffset = Math.random() * (days * 24 * 60 * 60 * 1000);
        const sessionTime = new Date(now - timeOffset);
        const sessionId = 'ses_' + Math.random().toString(36).substring(2, 9);
        const userId = 'usr_' + Math.random().toString(36).substring(2, 9);

        const countryObj = pickWeighted(countries);
        const city = countryObj.cities[Math.floor(Math.random() * countryObj.cities.length)];
        const devObj = pickWeighted(devices);
        const originObj = pickWeighted(origins);

        const totalActiveSeconds = Math.floor(Math.random() * 260) + 25;
        const hasSubscribed = Math.random() < 0.19; // 19% tasa de suscripción
        const viewedCard = Math.random() < 0.72;
        const viewedVideo = Math.random() < 0.58;
        const downloadedFile = Math.random() < 0.35;
        const usedDoctor = Math.random() < 0.28;
        const searched = Math.random() < 0.38;

        const pickedVideo = videoTitles[Math.floor(Math.random() * videoTitles.length)];
        const subscribedFrom = hasSubscribed
            ? (Math.random() < 0.65 ? `Vídeo: ${pickedVideo.title}` : (Math.random() < 0.5 ? 'Hero Principal' : 'Barra Flotante (Sticky)'))
            : null;

        const dwellTimes = {
            'Hero Principal': Math.floor(Math.random() * 25) + 10,
            'Videoteca Grid': Math.floor(Math.random() * 60) + 15,
            'Doctor 3D': usedDoctor ? Math.floor(Math.random() * 45) + 10 : 0,
            'Descargas': downloadedFile ? Math.floor(Math.random() * 35) + 10 : 0,
            'Modal de Vídeo': viewedVideo ? Math.floor(Math.random() * 90) + 20 : 0
        };

        const session = {
            sessionId,
            userId,
            timestamp: sessionTime.toISOString(),
            ip: `8${Math.floor(Math.random()*8)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.xxx`,
            country: countryObj.name,
            countryCode: countryObj.code,
            flag: countryObj.flag,
            region: city,
            city: city,
            device: devObj.device,
            os: devObj.os,
            browser: devObj.browser,
            origin: originObj.name,
            totalActiveSeconds,
            scrollDepth: [25, 50, 75, 100][Math.floor(Math.random() * 4)],
            hasSubscribed,
            subscribedFrom,
            dwellTimes
        };
        sessions.push(session);

        // Generar eventos de la sesión
        events.push({
            id: eventIdCounter++,
            sessionId,
            type: 'session_start',
            timestamp: sessionTime.toISOString(),
            details: { origin: session.origin, country: session.country, city: session.city }
        });

        if (viewedCard) {
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'card_click',
                timestamp: new Date(sessionTime.getTime() + 5000).toISOString(),
                details: { title: pickedVideo.title, category: pickedVideo.cat }
            });
        }

        if (viewedVideo) {
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'video_open',
                timestamp: new Date(sessionTime.getTime() + 10000).toISOString(),
                details: { title: pickedVideo.title, category: pickedVideo.cat }
            });
        }

        if (downloadedFile && pickedVideo.downloads) {
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'download_click',
                timestamp: new Date(sessionTime.getTime() + 25000).toISOString(),
                details: {
                    label: `Perfil Optimizado .3MF - ${pickedVideo.title.substring(0, 30)}...`,
                    videoTitle: pickedVideo.title
                }
            });
        }

        if (usedDoctor) {
            const sym = symptoms[Math.floor(Math.random() * symptoms.length)];
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'doctor3d_select',
                timestamp: new Date(sessionTime.getTime() + 15000).toISOString(),
                details: { symptom: sym }
            });
        }

        if (searched) {
            const s = searches[Math.floor(Math.random() * searches.length)];
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'search_query',
                timestamp: new Date(sessionTime.getTime() + 8000).toISOString(),
                details: { term: s.term, resultsCount: s.results }
            });
        }

        if (hasSubscribed) {
            events.push({
                id: eventIdCounter++,
                sessionId,
                type: 'subscribe_click',
                timestamp: new Date(sessionTime.getTime() + 35000).toISOString(),
                details: {
                    source: subscribedFrom,
                    videoTitle: subscribedFrom.includes('Vídeo:') ? pickedVideo.title : null
                }
            });
        }
    }

    return { sessions, events };
};

// Cargar o inicializar datos completos para el panel
export const loadAnalyticsData = async () => {
    let sessions = await getAllSessions();
    let events = await getAllEvents();

    // Si aún no hay suficientes datos registrados en vivo, mezclar o sembrar datos demo
    const demoGenerated = localStorage.getItem('capa_cero_analytics_demo');
    if (sessions.length < 5 && !demoGenerated) {
        const seed = generateSeedData();
        for (const s of seed.sessions) {
            await saveSession(s);
        }
        for (const e of seed.events) {
            await saveEvent(e);
        }
        localStorage.setItem('capa_cero_analytics_demo', 'true');
        sessions = seed.sessions;
        events = seed.events;
    }

    return { sessions, events };
};

// Procesar métricas globales (KPIs, Gráficas, Rankings)
export const computeAnalyticsMetrics = (sessions, events, dateFilter = 'all') => {
    const now = new Date();
    let startDate = new Date(0);

    if (dateFilter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === 'yesterday') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (dateFilter === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredSessions = sessions.filter(s => new Date(s.timestamp) >= startDate);
    const sessionIdsSet = new Set(filteredSessions.map(s => s.sessionId));
    const filteredEvents = events.filter(e => sessionIdsSet.has(e.sessionId) || new Date(e.timestamp) >= startDate);

    // 1. KPIs Maestros
    const totalVisits = filteredSessions.length;
    const uniqueUsers = new Set(filteredSessions.map(s => s.userId || s.ip)).size;
    const totalSubscribers = filteredSessions.filter(s => s.hasSubscribed).length;
    const subscriptionRate = totalVisits > 0 ? ((totalSubscribers / totalVisits) * 100).toFixed(1) : 0;

    const totalSeconds = filteredSessions.reduce((acc, s) => acc + (s.totalActiveSeconds || 0), 0);
    const avgDurationSeconds = totalVisits > 0 ? Math.round(totalSeconds / totalVisits) : 0;

    const cardClicksCount = filteredEvents.filter(e => e.type === 'card_click').length;
    const videoOpensCount = filteredEvents.filter(e => e.type === 'video_open').length;
    const downloadsCount = filteredEvents.filter(e => e.type === 'download_click').length;
    const searchesCount = filteredEvents.filter(e => e.type === 'search_query').length;
    const doctorConsultsCount = filteredEvents.filter(e => e.type === 'doctor3d_select').length;

    // 2. Desglose Geográfico (Países, Ciudades)
    const countryMap = {};
    const cityMap = {};
    filteredSessions.forEach(s => {
        const country = s.country || 'Desconocido';
        const flag = s.flag || '🌐';
        const code = s.countryCode || '';
        if (!countryMap[country]) countryMap[country] = { name: country, flag, code, count: 0, subs: 0 };
        countryMap[country].count++;
        if (s.hasSubscribed) countryMap[country].subs++;

        const cityKey = `${s.city || 'Desconocida'}, ${country}`;
        if (!cityMap[cityKey]) cityMap[cityKey] = { city: s.city || 'Desconocida', country, flag, count: 0 };
        cityMap[cityKey].count++;
    });

    const countriesRank = Object.values(countryMap).sort((a, b) => b.count - a.count);
    const citiesRank = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 15);
    const topCountry = countriesRank[0] || { name: 'Sin datos', flag: '🌐', count: 0 };

    // 3. Suscripciones y Atribución de Vídeo
    const subsOriginMap = {};
    filteredSessions.filter(s => s.hasSubscribed).forEach(s => {
        const from = s.subscribedFrom || 'Origen General';
        subsOriginMap[from] = (subsOriginMap[from] || 0) + 1;
    });
    const subsOriginRank = Object.entries(subsOriginMap)
        .map(([origin, count]) => ({ origin, count }))
        .sort((a, b) => b.count - a.count);

    // 4. Tirón de Tarjetas de Vídeo
    const videoCardMap = {};
    filteredEvents.filter(e => e.type === 'card_click' || e.type === 'video_open').forEach(e => {
        const title = e.details?.title || 'Tutorial';
        const category = e.details?.category || 'General';
        if (!videoCardMap[title]) videoCardMap[title] = { title, category, clicks: 0, plays: 0 };
        if (e.type === 'card_click') videoCardMap[title].clicks++;
        if (e.type === 'video_open') videoCardMap[title].plays++;
    });
    const videoCardsRank = Object.values(videoCardMap).sort((a, b) => (b.clicks + b.plays) - (a.clicks + a.plays));
    const topVideo = videoCardsRank[0] || { title: 'Sin datos', clicks: 0 };

    // 5. Descargas con más tirón
    const downloadsMap = {};
    filteredEvents.filter(e => e.type === 'download_click').forEach(e => {
        const label = e.details?.label || 'Recurso .3MF';
        const videoTitle = e.details?.videoTitle || '';
        if (!downloadsMap[label]) downloadsMap[label] = { label, videoTitle, count: 0 };
        downloadsMap[label].count++;
    });
    const downloadsRank = Object.values(downloadsMap).sort((a, b) => b.count - a.count);

    // 6. Tiempo de Permanencia (Dwell Time) por Sección
    const sectionDwellMap = {
        'Hero Principal': { totalSec: 0, count: 0 },
        'Videoteca Grid': { totalSec: 0, count: 0 },
        'Doctor 3D': { totalSec: 0, count: 0 },
        'Descargas': { totalSec: 0, count: 0 },
        'Modal de Vídeo': { totalSec: 0, count: 0 }
    };

    filteredSessions.forEach(s => {
        if (s.dwellTimes) {
            Object.entries(s.dwellTimes).forEach(([sec, time]) => {
                if (time > 0) {
                    if (!sectionDwellMap[sec]) sectionDwellMap[sec] = { totalSec: 0, count: 0 };
                    sectionDwellMap[sec].totalSec += time;
                    sectionDwellMap[sec].count++;
                }
            });
        }
    });

    const sectionDwellRank = Object.entries(sectionDwellMap).map(([section, data]) => ({
        section,
        totalSec: data.totalSec,
        avgSec: data.count > 0 ? Math.round(data.totalSec / data.count) : 0,
        sessionsReached: data.count
    })).sort((a, b) => b.totalSec - a.totalSec);

    // 7. Doctor 3D y Búsquedas
    const doctorSymptomMap = {};
    filteredEvents.filter(e => e.type === 'doctor3d_select').forEach(e => {
        const sym = e.details?.symptom || 'Fallo General';
        doctorSymptomMap[sym] = (doctorSymptomMap[sym] || 0) + 1;
    });
    const doctorSymptomsRank = Object.entries(doctorSymptomMap)
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count);

    const searchKeywordsMap = {};
    filteredEvents.filter(e => e.type === 'search_query').forEach(e => {
        const term = (e.details?.term || '').trim().toLowerCase();
        if (term) {
            if (!searchKeywordsMap[term]) searchKeywordsMap[term] = { term, count: 0, resultsCount: e.details?.resultsCount ?? 1 };
            searchKeywordsMap[term].count++;
        }
    });
    const searchKeywordsRank = Object.values(searchKeywordsMap).sort((a, b) => b.count - a.count);
    const zeroResultSearches = searchKeywordsRank.filter(s => s.resultsCount === 0);

    // 8. Dispositivos y Canales de Origen
    const deviceMap = { 'Móvil': 0, 'Desktop': 0, 'Tablet': 0 };
    const originMap = {};
    filteredSessions.forEach(s => {
        const dev = s.device || 'Desktop';
        deviceMap[dev] = (deviceMap[dev] || 0) + 1;

        const orig = s.origin || 'Directo';
        originMap[orig] = (originMap[orig] || 0) + 1;
    });

    const originsRank = Object.entries(originMap).map(([origin, count]) => ({ origin, count })).sort((a, b) => b.count - a.count);

    // 9. Embudo de Conversión (Funnel)
    const funnel = [
        { step: '1. Visitas a la Web', count: totalVisits, percent: 100 },
        { step: '2. Interacción con Tarjeta / Búsqueda', count: Math.min(totalVisits, cardClicksCount + searchesCount), percent: totalVisits > 0 ? Math.round(((cardClicksCount + searchesCount) / totalVisits) * 100) : 0 },
        { step: '3. Tutorial Visto / Descarga', count: Math.min(totalVisits, videoOpensCount + downloadsCount), percent: totalVisits > 0 ? Math.round(((videoOpensCount + downloadsCount) / totalVisits) * 100) : 0 },
        { step: '4. Suscripción al Canal', count: totalSubscribers, percent: Number(subscriptionRate) }
    ];

    // 10. Evolución Diaria (Timeline de visitas)
    const timelineMap = {};
    filteredSessions.forEach(s => {
        const day = s.timestamp.substring(0, 10);
        if (!timelineMap[day]) timelineMap[day] = { date: day, visits: 0, subs: 0, clicks: 0 };
        timelineMap[day].visits++;
        if (s.hasSubscribed) timelineMap[day].subs++;
    });
    const dailyTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
        totalVisits,
        uniqueUsers,
        totalSubscribers,
        subscriptionRate,
        avgDurationSeconds,
        cardClicksCount,
        videoOpensCount,
        downloadsCount,
        searchesCount,
        doctorConsultsCount,
        topCountry,
        topVideo,
        countriesRank,
        citiesRank,
        subsOriginRank,
        videoCardsRank,
        downloadsRank,
        sectionDwellRank,
        doctorSymptomsRank,
        searchKeywordsRank,
        zeroResultSearches,
        deviceMap,
        originsRank,
        funnel,
        dailyTimeline,
        rawSessions: filteredSessions.slice().reverse(),
        rawEvents: filteredEvents.slice().reverse()
    };
};

// Exportar datos a CSV
export const exportAnalyticsToCSV = (sessions) => {
    if (!sessions || sessions.length === 0) return;
    const headers = ['Fecha/Hora', 'ID Sesion', 'Pais', 'Ciudad', 'Dispositivo', 'SO', 'Navegador', 'Origen', 'Tiempo Activo (s)', 'Suscrito', 'Suscrito Desde'];
    const rows = sessions.map(s => [
        `"${s.timestamp}"`,
        `"${s.sessionId}"`,
        `"${s.country || ''}"`,
        `"${s.city || ''}"`,
        `"${s.device || ''}"`,
        `"${s.os || ''}"`,
        `"${s.browser || ''}"`,
        `"${s.origin || ''}"`,
        s.totalActiveSeconds || 0,
        s.hasSubscribed ? 'SI' : 'NO',
        `"${s.subscribedFrom || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `capacero_estadisticas_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Exportar datos a JSON
export const exportAnalyticsToJSON = (sessions, events) => {
    const data = {
        exportedAt: new Date().toISOString(),
        totalSessions: sessions.length,
        totalEvents: events.length,
        sessions,
        events
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `capacero_analytics_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
