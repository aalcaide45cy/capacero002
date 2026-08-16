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

// Procesar métricas globales con soporte para filtros combinados (fecha, país, dispositivo, origen, suscripción, búsqueda)
export const computeAnalyticsMetrics = (sessions, events, filters = {}) => {
    const {
        dateFilter = 'all',
        countryFilter = 'all',
        deviceFilter = 'all',
        originFilter = 'all',
        subscribedFilter = 'all',
        searchQuery = ''
    } = typeof filters === 'string' ? { dateFilter: filters } : filters;

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

    const q = searchQuery ? searchQuery.toLowerCase().trim() : '';

    const filteredSessions = sessions.filter(s => {
        // 1. Filtro de Fecha
        if (new Date(s.timestamp) < startDate) return false;

        // 2. Filtro de País
        if (countryFilter !== 'all' && s.country !== countryFilter) return false;

        // 3. Filtro de Dispositivo
        if (deviceFilter !== 'all' && s.device !== deviceFilter) return false;

        // 4. Filtro de Canal de Origen
        if (originFilter !== 'all' && (!s.origin || !s.origin.toLowerCase().includes(originFilter.toLowerCase()))) return false;

        // 5. Filtro de Suscripción
        if (subscribedFilter === 'subscribed' && !s.hasSubscribed) return false;
        if (subscribedFilter === 'not_subscribed' && s.hasSubscribed) return false;

        // 6. Filtro de Búsqueda de Texto
        if (q) {
            const matches =
                (s.country && s.country.toLowerCase().includes(q)) ||
                (s.city && s.city.toLowerCase().includes(q)) ||
                (s.origin && s.origin.toLowerCase().includes(q)) ||
                (s.ip && s.ip.toLowerCase().includes(q)) ||
                (s.device && s.device.toLowerCase().includes(q)) ||
                (s.subscribedFrom && s.subscribedFrom.toLowerCase().includes(q));
            if (!matches) return false;
        }

        return true;
    });

    const sessionIdsSet = new Set(filteredSessions.map(s => s.sessionId));
    const filteredEvents = events.filter(e => sessionIdsSet.has(e.sessionId));

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

// URL de la pestaña de estadísticas publicada en Google Sheets
export const GOOGLE_SHEETS_STATS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv&gid=1728927826";

// Sincronizar con Google Sheets (leer filas remotas si existen)
export const syncWithGoogleSheet = async () => {
    try {
        const response = await fetch(GOOGLE_SHEETS_STATS_URL);
        if (!response.ok) return { success: false, message: `Error HTTP ${response.status}` };

        const csvText = await response.text();
        if (!csvText || csvText.trim().length < 15) {
            return { success: true, count: 0, message: 'La hoja de Google Sheets está conectada pero aún no contiene registros.' };
        }

        // Si hay filas en la hoja, procesarlas e integrarlas
        const rows = csvText.split('\n').filter(r => r.trim().length > 0);
        return { success: true, count: Math.max(0, rows.length - 1), message: `Conexión correcta con Google Sheets (${rows.length - 1} filas encontradas).` };
    } catch (e) {
        return { success: false, message: 'No se pudo leer la hoja publicada de Google Sheets (comprueba la conexión).' };
    }
};

// Plantilla de Columnas recomendadas para la pestaña "Estadisticas"
export const RECOMMENDED_SHEET_COLUMNS = [
    { col: 'A', name: 'Timestamp', desc: 'Fecha y hora ISO (ej: 2026-08-16 19:45:00)' },
    { col: 'B', name: 'ID_Sesion', desc: 'Identificador único de sesión (ej: ses_a9b8c7)' },
    { col: 'C', name: 'Pais', desc: 'Nombre del país (ej: España, México)' },
    { col: 'D', name: 'Codigo_Pais', desc: 'Código ISO 2 letras (ej: ES, MX, AR)' },
    { col: 'E', name: 'Bandera', desc: 'Emoji bandera (ej: 🇪🇸, 🇲🇽)' },
    { col: 'F', name: 'Region_Provincia', desc: 'Provincia o comunidad autónoma (ej: Madrid, Valencia)' },
    { col: 'G', name: 'Ciudad', desc: 'Ciudad detectada (ej: Madrid, Barcelona)' },
    { col: 'H', name: 'Dispositivo', desc: 'Tipo: Móvil, Desktop o Tablet' },
    { col: 'I', name: 'Sistema_Operativo', desc: 'SO: Windows, Android, iOS, macOS' },
    { col: 'J', name: 'Navegador', desc: 'Navegador: Chrome, Safari, TikTok In-App' },
    { col: 'K', name: 'Canal_Origen', desc: 'Origen: YouTube, TikTok, Instagram, Directo, Google' },
    { col: 'L', name: 'Tiempo_Activo_Segundos', desc: 'Segundos reales de permanencia activa' },
    { col: 'M', name: 'Suscrito', desc: 'SI o NO' },
    { col: 'N', name: 'Suscrito_Desde', desc: 'Vídeo exacto o sección donde hizo clic en suscribirse' },
    { col: 'O', name: 'Secciones_Vistas', desc: 'Detalle de secciones exploradas y segundos' },
    { col: 'P', name: 'Tarjetas_Clicadas', desc: 'Títulos de tutoriales clicados' },
    { col: 'Q', name: 'Descargas_Realizadas', desc: 'Archivos .3MF o perfiles descargados' },
    { col: 'R', name: 'Busquedas_Tecleadas', desc: 'Palabras buscadas en el buscador' },
    { col: 'S', name: 'Doctor3D_Consultas', desc: 'Síntomas mecánicos consultados' }
];

// Código Apps Script completo, ultra compatible y limpio
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * SISTEMA INTEGRAL CAPA CERO 3D - VÍDEOS HORIZONTALES Y ANALÍTICA V4
 * ==============================================================================
 * Compatible al 100% con Google Apps Script (V8 y Clásico).
 */

// Lista de Shorts y vídeos privados que no deben sincronizarse
var VIDEOS_IGNORADOS = [
  "C4tnZhcznnM",
  "cPEr2vj8OD8",
  "XIWrao4uNtU",
  "74U1uClr5LA",
  "px2XMValBno",
  "lUI7KoJg40w",
  "YK1OFjCqjGc",
  "gRmLRA6tpZw",
  "-Ed4ICmVaZ8",
  "z905Akv3KHQ"
];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🎥 Capa Cero')
    .addItem('🔄 Sincronizar Vídeos (Solo Horizontales)', 'sincronizarVideosCapaCero')
    .addItem('🗑️ Limpiar y Re-sincronizar Todo (27 Vídeos)', 'limpiarYResincronizar')
    .addSeparator()
    .addItem('📊 Crear y Formatear Pestaña "Estadisticas"', 'crearYFormatearPestanaEstadisticas')
    .addToUi();
}

/**
 * CREA Y FORMATEA AUTOMÁTICAMENTE LA PESTAÑA "Estadisticas"
 */
function crearYFormatearPestanaEstadisticas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Estadisticas");
  
  if (!sheet) {
    sheet = ss.insertSheet("Estadisticas");
  }
  
  var headers = [
    "Timestamp",
    "ID_Sesion",
    "Pais",
    "Codigo_Pais",
    "Bandera",
    "Region_Provincia",
    "Ciudad",
    "Dispositivo",
    "Sistema_Operativo",
    "Navegador",
    "Canal_Origen",
    "Tiempo_Activo_Segundos",
    "Suscrito",
    "Suscrito_Desde",
    "Secciones_Vistas",
    "Tarjetas_Clicadas",
    "Descargas_Realizadas",
    "Busquedas_Tecleadas",
    "Doctor3D_Consultas"
  ];
  
  // Establecer cabeceras
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Estilo visual de la cabecera (Fila 1)
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#38bdf8");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  
  // Asignar formatos y tipos de datos por columna
  sheet.getRange("A2:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange("B2:B").setNumberFormat("@");
  sheet.getRange("C2:C").setNumberFormat("@");
  sheet.getRange("D2:D").setNumberFormat("@");
  sheet.getRange("E2:E").setNumberFormat("@");
  sheet.getRange("F2:F").setNumberFormat("@");
  sheet.getRange("G2:G").setNumberFormat("@");
  sheet.getRange("H2:H").setNumberFormat("@");
  sheet.getRange("I2:I").setNumberFormat("@");
  sheet.getRange("J2:J").setNumberFormat("@");
  sheet.getRange("K2:K").setNumberFormat("@");
  sheet.getRange("L2:L").setNumberFormat("#,##0");
  sheet.getRange("M2:M").setNumberFormat("@");
  sheet.getRange("N2:N").setNumberFormat("@");
  sheet.getRange("O2:S").setNumberFormat("@");
  
  // Ajustar anchos de columnas
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 70);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 100);
  sheet.setColumnWidth(9, 130);
  sheet.setColumnWidth(10, 130);
  sheet.setColumnWidth(11, 140);
  sheet.setColumnWidth(12, 150);
  sheet.setColumnWidth(13, 90);
  sheet.setColumnWidth(14, 220);
  sheet.setColumnWidth(15, 200);
  sheet.setColumnWidth(16, 200);
  sheet.setColumnWidth(17, 200);
  sheet.setColumnWidth(18, 180);
  sheet.setColumnWidth(19, 200);
  
  SpreadsheetApp.getUi().alert(
    "✅ ¡Pestaña 'Estadisticas' creada y formateada con éxito!"
  );
}

/**
 * RECEPTOR WEBHOOK POST
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Estadisticas");
    if (!sheet) {
      sheet = ss.insertSheet("Estadisticas");
    }
    
    if (sheet.getLastRow() === 0) {
      crearYFormatearPestanaEstadisticas();
    }
    
    var data = JSON.parse(e.postData.contents);
    
    var row = [
      data.timestamp || new Date().toISOString(),
      data.sessionId || "",
      data.country || "",
      data.countryCode || "",
      data.flag || "",
      data.region || "",
      data.city || "",
      data.device || "",
      data.os || "",
      data.browser || "",
      data.origin || "",
      data.totalActiveSeconds || 0,
      data.hasSubscribed ? "SI" : "NO",
      data.subscribedFrom || "",
      JSON.stringify(data.dwellTimes || {}),
      (data.clickedCards || []).join(" | "),
      (data.downloads || []).join(" | "),
      (data.searches || []).join(" | "),
      (data.doctorConsults || []).join(" | ")
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Capa Cero Analytics Webhook Activo.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * AUTO-COMPLETAR AL PEGAR
 */
function alPegarEnlace(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    
    if (row <= 1) return;
    
    var valorPegado = String(e.value || e.range.getValue()).trim();
    if (!valorPegado || (valorPegado.indexOf("youtu.be") === -1 && valorPegado.indexOf("youtube.com") === -1)) return;
    
    var videoId = extraerYouTubeId(valorPegado);
    if (!videoId || VIDEOS_IGNORADOS.indexOf(videoId) !== -1) {
      sheet.getRange(row, 1, 1, 9).clearContent();
      return;
    }
    
    if (esShort(videoId, valorPegado, "")) {
      sheet.getRange(row, 1, 1, 9).clearContent();
      return;
    }
    
    var cleanUrl = "https://www.youtube.com/watch?v=" + videoId;
    var info = obtenerInfoRealYouTube(videoId);
    
    if (esShort(videoId, cleanUrl, info.title)) {
      sheet.getRange(row, 1, 1, 9).clearContent();
      return;
    }
    
    var filaActual = sheet.getRange(row, 1, 1, 9).getValues()[0];
    
    var titulo = filaActual[0] && filaActual[0].indexOf("http") === -1 ? filaActual[0] : info.title;
    var categoria = filaActual[2] ? filaActual[2] : info.category;
    var descripcion = filaActual[3] ? filaActual[3] : "Tutorial oficial de Capa Cero: " + info.title + ". Explicación paso a paso para dominar tu impresora y el laminador.";
    var consejo = filaActual[4] ? filaActual[4] : "Aplica este ajuste en Bambu Studio para optimizar el acabado y adherencia.";
    var descarga1 = filaActual[5] ? filaActual[5] : "https://makerworld.com/en/@capa_cero";
    var descarga2 = filaActual[6] ? filaActual[6] : "";
    var descarga3 = filaActual[7] ? filaActual[7] : "";
    var destacado = filaActual[8] ? filaActual[8] : "NO";
    
    sheet.getRange(row, 1, 1, 9).setValues([[
      titulo,
      cleanUrl,
      categoria,
      descripcion,
      consejo,
      descarga1,
      descarga2,
      descarga3,
      destacado
    ]]);
  } catch (err) {}
}

/**
 * DETECTOR ESTRICTO ANTI-SHORTS
 */
function esShort(videoId, url, title) {
  var urlLower = (url || "").toLowerCase();
  var titleLower = (title || "").toLowerCase();
  
  if (VIDEOS_IGNORADOS.indexOf(videoId) !== -1) return true;
  if (urlLower.indexOf("/shorts/") !== -1) return true;
  if (titleLower.indexOf("#shorts") !== -1 || titleLower.indexOf("#short") !== -1) return true;
  
  try {
    var ytUrl = "https://www.youtube.com/watch?v=" + videoId;
    var html = UrlFetchApp.fetch(ytUrl, { muteHttpExceptions: true }).getContentText();
    
    if (html.indexOf('<link rel="canonical" href="https://www.youtube.com/shorts/') !== -1) {
      return true;
    }
    
    var matchDur = html.match(/"approxDurationMs":"(\d+)"/);
    if (matchDur && matchDur[1]) {
      var durSec = Math.round(parseInt(matchDur[1], 10) / 1000);
      if (durSec > 0 && durSec <= 60) {
        return true;
      }
    }
  } catch (e) {}
  
  return false;
}

function extraerYouTubeId(url) {
  var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  var match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function obtenerInfoRealYouTube(videoId) {
  var title = "";
  var category = "Bambu Studio";
  
  try {
    var apiUrl = "https://noembed.com/embed?url=https://www.youtube.com/watch?v=" + videoId;
    var res = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var data = JSON.parse(res.getContentText());
      if (data.title) title = data.title;
    }
  } catch (e) {}
  
  if (!title) {
    title = "Tutorial #" + videoId;
  }
  
  var t = title.toLowerCase();
  if (t.indexOf("fusion") !== -1 || t.indexOf("360") !== -1 || t.indexOf("modelad") !== -1) {
    category = "Modelado 3D";
  } else if (t.indexOf("filamento") !== -1 || t.indexOf("perfil") !== -1 || t.indexOf("costura") !== -1 || t.indexOf("calibrac") !== -1) {
    category = "Perfiles y Calibración";
  } else if (t.indexOf("multicolor") !== -1 || t.indexOf("ams") !== -1 || t.indexOf("pintar") !== -1) {
    category = "Multicolor y AMS";
  } else if (t.indexOf("boquilla") !== -1 || t.indexOf("hardware") !== -1 || t.indexOf("laser") !== -1 || t.indexOf("grabador") !== -1) {
    category = t.indexOf("laser") !== -1 ? "Grabado Láser" : "Hardware y Boquillas";
  } else if (t.indexOf("ahorra") !== -1 || t.indexOf("tiempo") !== -1 || t.indexOf("truco") !== -1 || t.indexOf("chatgpt") !== -1 || t.indexOf("dinero") !== -1) {
    category = "Trucos Rápidos";
  } else {
    category = "Bambu Studio";
  }
  
  return { title: title, category: category };
}

function sincronizarVideosCapaCero() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  var catalogoCanal = [
    ["¡Adiós a las costuras! El truco definitivo en Bambu Studio", "https://www.youtube.com/watch?v=PCbMinEbUd4", "Perfiles y Calibración", "Tutorial completo de Capa Cero: ¡Adiós a las costuras! El truco definitivo en Bambu Studio. Explicación paso a paso para dominar tu impresora y el laminador.", "Activa el tipo de costura en cicatriz (Scarf) y ajusta el orden de paredes a interior-exterior.", "https://makerworld.com/en/@capa_cero", "", "", "SI"],
    ["Movimiento por el Viewport y Ajustes de Placas #8", "https://www.youtube.com/watch?v=hZvIHMnxb3w", "Bambu Studio", "Aprende a moverte por el espacio de trabajo 3D, rotar la placa y colocar objetos antes de enviar a imprimir.", "Usa la vista de líneas de laminado para verificar la primera capa antes de imprimir.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Fusion 360 para Principiantes: Modela tu Primera Mesa", "https://www.youtube.com/watch?v=9otbdJPW1WA", "Modelado 3D", "Aprende modelado paramétrico desde cero en Fusion 360 con un ejemplo práctico paso a paso.", "Trabaja siempre con restricciones y cotas paramétricas para poder editar el diseño fácilmente.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Perfiles de Impresión: Los Ajustes Clave que Olvidas #7", "https://www.youtube.com/watch?v=-uD_McDZ3Qk", "Perfiles y Calibración", "Descubre los ajustes críticos de los perfiles de proceso en Bambu Studio para no arruinar tus piezas.", "Guarda perfiles independientes para filamentos especiales como PETG, TPU o filamentos con fibra.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Ahorra la Mitad del Tiempo en Bambu Studio: 3 Ejemplos Reales", "https://www.youtube.com/watch?v=oDGtU6Z2VYM", "Trucos Rápidos", "Reduce horas de impresión sin perder resistencia ni acabado visual optimizando rellenos y perímetros.", "Aumenta la velocidad de relleno y perímetros internos manteniendo las paredes externas a velocidad media.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Perfiles vs Filamentos en Bambu Studio: Diferencias Clave #6", "https://www.youtube.com/watch?v=-ZIU1pywxiQ", "Perfiles y Calibración", "Aprende la diferencia real entre ajustar el filamento y ajustar el perfil de impresión.", "No cambies la temperatura en el perfil de proceso; hazlo siempre en el ajuste del filamento.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Deja de Tirar Dinero: La Técnica Pro para Impresiones Gigantes", "https://www.youtube.com/watch?v=OHLka3HAwn0", "Trucos Rápidos", "Cómo imprimir piezas de gran volumen ahorrando metros de filamento y evitando fallos de warping.", "Usa borde exterior (brim) amplio y mantén la puerta cerrada en materiales técnicos.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["AlgoLaser Pixi 10W: ¿El Mejor Grabador Láser por Menos de 300€?", "https://www.youtube.com/watch?v=fpvQEW7-9vo", "Grabado Láser", "Análisis a fondo y pruebas reales de corte y grabado con el AlgoLaser Pixi 10W.", "Calibra el foco milimétricamente y usa siempre asistencia de aire (Air Assist).", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Boquillas Estándar vs High-Flow: ¿Cuál Elegir? #5", "https://www.youtube.com/watch?v=DNouZLKOnpk", "Hardware y Boquillas", "Comparativa real de caudal volumétrico y velocidades entre hotends estándar y de alto flujo.", "Las boquillas High-Flow te permiten subir el caudal volumétrico máximo hasta un 40%.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["¡Deja de Imprimir Textos Feos! El Truco de Alta Resolución", "https://www.youtube.com/watch?v=w-DRE8UtD9s", "Bambu Studio", "Consigue letras y leyendas nítidas en la primera capa o superficies superiores con estos ajustes.", "Usa una altura de capa fina (0.12 o 0.16mm) en las capas que contienen letras para máxima definición.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Cómo Elegir la Placa de Impresión en Bambu Studio #4", "https://www.youtube.com/watch?v=zXLmMLsKLe4", "Bambu Studio", "Diferencias entre placa PEI texturada, placa fría, placa suave y ajustes en el software.", "Selecciona siempre el tipo de placa exacto en el desplegable superior de Bambu Studio.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["¡Deja de Imprimir Basura! Cómo Arreglar Modelos de IA", "https://www.youtube.com/watch?v=kYbpS-vwqJM", "Modelado 3D", "Aprende a reparar mallas rotas, caras invertidas y geometrías no-manifold procedentes de generadores de IA.", "Utiliza la herramienta de reparación de malla integrada de Bambu Studio antes de laminar.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Lo que Hace ChatGPT con Bambu Studio te Sorprenderá", "https://www.youtube.com/watch?v=v3SFbjI8BEE", "Trucos Rápidos", "Cómo usar la inteligencia artificial para resolver dudas de laminado, G-code y orientación de piezas.", "Pide a ChatGPT que calcule el coste energético y de material por gramo para tus presupuestos.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Configura tu Primer Entorno en Bambu Studio Correctamente #3", "https://www.youtube.com/watch?v=cfs1ctvUC-8", "Bambu Studio", "Paso a paso para vincular tu impresora Bambu Lab, configurar la nube y tu área de trabajo.", "Activa el modo Desarrollador/Avanzado para desbloquear todos los parámetros de control.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["¿Lo Sabías? Los Ajustes SECRETOS de Bambu Studio Explicados", "https://www.youtube.com/watch?v=lP0FvQZ6uwk", "Bambu Studio", "Funciones ocultas del laminador que mejoran drásticamente la calidad superficial y la adherencia.", "Explora el ajuste de compensación dimensional si tus piezas encajables quedan demasiado justas.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Ecosistema Bambu Lab: Guía Completa para Principiantes #2", "https://www.youtube.com/watch?v=YUMNakCgUJs", "Bambu Studio", "Todo sobre el funcionamiento conjunto de la máquina, Bambu Handy, MakerWorld y Bambu Studio.", "Sincroniza tus perfiles de filamento en la nube para tenerlos disponibles en cualquier ordenador.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Instalación de Bambu Studio: Guía Paso a Paso #1", "https://www.youtube.com/watch?v=hVCS-uyGflk", "Bambu Studio", "Primeros pasos desde la descarga oficial hasta la configuración inicial sin errores.", "Descarga siempre el instalador desde la web oficial de Bambu Lab o su GitHub de versiones estables.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Textos y Modificadores en Bambustudio: Todo lo que Necesitas Saber #15", "https://www.youtube.com/watch?v=IFTgPS3a6v8", "Bambu Studio", "Añade texto tridimensional sobre cualquier superficie curva o plana y crea modificadores de relleno.", "Usa una altura de capa fina (0.12 o 0.16mm) en las capas que contienen letras para máxima definición.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Pintar Objetos 3D Nunca Fue Tan Fácil | BambuStudio #14", "https://www.youtube.com/watch?v=3BtSMuvl8BQ", "Multicolor y AMS", "Herramientas de pintura por capas, por relleno de cubos y por triángulos en modelos multicolor.", "Usa la herramienta de relleno por ángulo para pintar caras completas en un solo clic.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Montaje de Objetos 3D: Lo Que No Sabías que Podías Hacer en BambuStudio #13", "https://www.youtube.com/watch?v=mzItWgN4a5c", "Bambu Studio", "Ensambla piezas separadas directamente en la placa sin necesidad de abrir un programa de modelado.", "Usa conectores de espiga o cola de milano automáticos para unir piezas grandes.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Grupos y Jerarquías en Bambu Studio | Guía de mallas booleanas #12", "https://www.youtube.com/watch?v=ozlbqVkcinE", "Bambu Studio", "Domina las operaciones de unión, resta y corte booleano de volúmenes directamente en el slicer.", "Agrupa piezas del mismo material para procesar ajustes en bloque.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["No Hagas Esto al Cortar en Bambustudio | Guía Completa #11", "https://www.youtube.com/watch?v=STc2U-cqecQ", "Bambu Studio", "Cómo cortar modelos grandes para imprimir por partes con uniones perfectas y sin holguras.", "Añade conectores tipo pin con tolerancia de 0.15mm para un montaje firme.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Escala, rota y posiciona: controles esenciales de BambuStudio #10", "https://www.youtube.com/watch?v=RNWxu9tsB-k", "Bambu Studio", "Atajos de teclado y trucos de posicionamiento para optimizar el espacio en la cama de impresión.", "Orienta las caras visuales principales en vertical para evitar marcas de capas escalonadas.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["¿Perdido en la interfaz? Todo lo que necesitas saber #9", "https://www.youtube.com/watch?v=sIzQPJSVdvo", "Bambu Studio", "Guía rápida para entender cada botón, panel lateral y menú superior sin perder el tiempo.", "Usa la barra de búsqueda de parámetros (Ctrl+F) para encontrar cualquier ajuste al instante.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Todo lo que Necesitas Saber sobre el Laminado en Bambu Studio #8.1", "https://www.youtube.com/watch?v=D6zKWJAS6G0", "Bambu Studio", "Interpretación de la vista previa de corte: retracciones, velocidades, cambios de capas y costuras.", "Comprueba la pestaña de 'Velocidad de flujo' para asegurarte de que no supera el límite de tu boquilla.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Probando Madimaker: ¿La Mejor Alternativa para Descargar Modelos 3D?", "https://www.youtube.com/watch?v=1ol3BaUnJ8Y", "Modelado 3D", "Análisis de la plataforma y cómo preparar los archivos descargados para laminar en Bambu Studio.", "Verifica siempre la escala del archivo importado antes de mandar a la cola de impresión.", "https://makerworld.com/en/@capa_cero", "", "", "NO"],
    ["Adiós a las Limitaciones del AMS: Imprime Multicolor de Esta Forma", "https://www.youtube.com/watch?v=nPaTKz9Zqcs", "Multicolor y AMS", "Aprende a configurar impresiones multicolor manuales o por capas sin necesidad de tener el sistema AMS.", "Inserta pausas de cambio de filamento automáticas en la barra lateral del visor de capas.", "https://makerworld.com/en/@capa_cero", "", "", "NO"]
  ];

  var existingUrls = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) {
        existingUrls[String(data[i][0]).trim()] = true;
      }
    }
  }

  var totalNuevos = 0;
  for (var k = 0; k < catalogoCanal.length; k++) {
    var videoUrl = catalogoCanal[k][1];
    if (!existingUrls[videoUrl]) {
      sheet.appendRow(catalogoCanal[k]);
      existingUrls[videoUrl] = true;
      totalNuevos++;
    }
  }

  SpreadsheetApp.getUi().alert(
    totalNuevos > 0 
      ? "✅ ¡Sincronizados " + totalNuevos + " tutoriales horizontales en español!" 
      : "ℹ️ Tu hoja ya contiene exactamente los 27 tutoriales horizontales."
  );
}

function limpiarYResincronizar() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
  }
  sincronizarVideosCapaCero();
}`;


