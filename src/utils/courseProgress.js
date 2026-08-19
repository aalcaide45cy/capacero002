/**
 * Capa Cero - Gestor Integral de Progreso, Tiempos de Reproducción y Apuntes/Notas en LocalStorage
 */

const PROGRESS_STORAGE_KEY = 'CAPACERO_COURSE_PROGRESS_V1';
const TIMESTAMPS_STORAGE_KEY = 'CAPACERO_VIDEO_TIMESTAMPS_V1';
const NOTES_STORAGE_KEY = 'CAPACERO_STUDY_NOTES_V1';

// Función para normalizar claves de cursos (ej: 'Bambu Studio' -> 'bambu-studio')
export function normalizeCourseSlug(name) {
  if (!name) return 'default';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/^curso\s*:?\s*/i, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Formatea segundos a formato MM:SS o HH:MM:SS
 */
export function formatSecondsToTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// ================= 1. PROGRESO DE CURSOS =================

export function getAllCoursesProgress() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Error leyendo progreso de cursos:', e);
    return {};
  }
}

export function getCourseProgress(courseName) {
  const slug = normalizeCourseSlug(courseName);
  const all = getAllCoursesProgress();
  return all[slug] || null;
}

export function saveCourseProgress(courseName, video, currentPlaybackTime = null) {
  if (!courseName || !video || typeof window === 'undefined' || !window.localStorage) return;
  const slug = normalizeCourseSlug(courseName);
  const all = getAllCoursesProgress();
  const current = all[slug] || { completedVideoIds: [] };

  const completed = Array.isArray(current.completedVideoIds) ? [...current.completedVideoIds] : [];
  if (video.id && !completed.includes(video.id)) {
    completed.push(video.id);
  }
  if (video.youtubeId && !completed.includes(video.youtubeId)) {
    completed.push(video.youtubeId);
  }

  all[slug] = {
    courseName,
    lastVideoId: video.id || video.youtubeId,
    lastYoutubeId: video.youtubeId,
    lastTitle: video.title,
    lastChapterNumber: video.chapterNumber,
    lastUpdated: new Date().toISOString(),
    completedVideoIds: completed
  };

  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { slug, progress: all[slug] } }));
  } catch (e) {
    console.warn('Error guardando progreso en localStorage:', e);
  }

  if (currentPlaybackTime !== null && currentPlaybackTime > 0) {
    saveVideoPlaybackTime(video.youtubeId || video.id, currentPlaybackTime, courseName);
  }
}

export function resetCourseProgress(courseName) {
  if (!courseName || typeof window === 'undefined' || !window.localStorage) return;
  const slug = normalizeCourseSlug(courseName);
  const all = getAllCoursesProgress();
  if (all[slug]) {
    delete all[slug];
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { slug, progress: null } }));
    } catch (e) {
      console.warn('Error reseteando progreso:', e);
    }
  }
}

// ================= 2. TIEMPOS EXACTOS DE REANUDACIÓN DE VÍDEO (-5s) =================

export function getAllVideoTimestamps() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(TIMESTAMPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getVideoPlaybackTime(videoId) {
  if (!videoId) return 0;
  const all = getAllVideoTimestamps();
  const item = all[videoId];
  return typeof item === 'object' ? item.seconds || 0 : (typeof item === 'number' ? item : 0);
}

export function saveVideoPlaybackTime(videoId, seconds, courseName = null) {
  if (!videoId || typeof window === 'undefined' || !window.localStorage) return;
  const all = getAllVideoTimestamps();
  all[videoId] = {
    seconds: Math.floor(seconds),
    courseName,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(TIMESTAMPS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {}
}

// ================= 3. APUNTES Y MARCADORES CON TIMESTAMP =================

export function getAllStudyNotes() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getVideoNotes(videoId) {
  if (!videoId) return [];
  const all = getAllStudyNotes();
  return Array.isArray(all[videoId]) ? all[videoId] : [];
}

export function addVideoNote(videoId, timestampInSeconds, noteText, courseName = '', videoTitle = '') {
  if (!videoId || !noteText || !noteText.trim() || typeof window === 'undefined' || !window.localStorage) return null;
  const all = getAllStudyNotes();
  const list = Array.isArray(all[videoId]) ? [...all[videoId]] : [];

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    videoId,
    timestamp: Math.max(0, Math.floor(timestampInSeconds || 0)),
    timeFormatted: formatSecondsToTime(timestampInSeconds || 0),
    text: noteText.trim(),
    courseName,
    videoTitle,
    createdAt: new Date().toISOString()
  };

  list.push(newNote);
  // Ordenar notas por segundo en el vídeo
  list.sort((a, b) => a.timestamp - b.timestamp);
  all[videoId] = list;

  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { videoId, notes: list } }));
    return newNote;
  } catch (e) {
    console.warn('Error guardando apunte:', e);
    return null;
  }
}

export function deleteVideoNote(videoId, noteId) {
  if (!videoId || !noteId || typeof window === 'undefined' || !window.localStorage) return;
  const all = getAllStudyNotes();
  if (Array.isArray(all[videoId])) {
    all[videoId] = all[videoId].filter(n => n.id !== noteId);
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { videoId, notes: all[videoId] } }));
    } catch (e) {}
  }
}

// ================= 4. COPIA DE SEGURIDAD Y RESTAURACIÓN INTEGRAL JSON =================

export function exportProgressBackup() {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    courseProgress: getAllCoursesProgress(),
    videoTimestamps: getAllVideoTimestamps(),
    studyNotes: getAllStudyNotes(),
    system: 'Capa Cero 3D Academy'
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `capacero-respaldo-completo-${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProgressBackup(jsonContent) {
  try {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    if (data && typeof data === 'object') {
      let restoredCount = 0;

      // 1. Progreso de Cursos (estándar, directo o legados)
      const courseProg = data.courseProgress || data.courses || data.progress || (data.lastVideoId || data.completedVideoIds ? data : null);
      if (courseProg && typeof courseProg === 'object') {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(courseProg));
        restoredCount++;
      }

      // 2. Tiempos y Minuto Exacto de Reproducción
      const timestamps = data.videoTimestamps || data.timestamps || data.times;
      if (timestamps && typeof timestamps === 'object') {
        localStorage.setItem(TIMESTAMPS_STORAGE_KEY, JSON.stringify(timestamps));
        restoredCount++;
      }

      // 3. Mis Apuntes y Marcadores
      const notes = data.studyNotes || data.notes || data.apuntes;
      if (notes && typeof notes === 'object') {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        restoredCount++;
      }

      if (restoredCount > 0) {
        window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { all: courseProg } }));
        window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { all: notes } }));
        return { 
          success: true, 
          message: '¡Progreso, minuto exacto y apuntes restaurados con éxito!' 
        };
      }
    }
    return { success: false, message: 'El archivo JSON no contiene datos reconocibles de Capa Cero.' };
  } catch (e) {
    console.error('Error importando backup:', e);
    return { success: false, message: 'Error al procesar el archivo JSON: formato no válido.' };
  }
}

// ================= 5. SINCRONIZACIÓN INSTANTÁNEA POR QR BIDIRECCIONAL =================

// Generar URL con payload comprimido para el QR
export function generateSyncUrl() {
  const data = {
    v: '2.0',
    cp: getAllCoursesProgress(),
    vt: getAllVideoTimestamps(),
    sn: getAllStudyNotes(),
    t: Date.now()
  };

  try {
    const jsonStr = JSON.stringify(data);
    // Codificación Base64 segura para UTF-8 y URLs
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
    
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://www.capacero3d.com/';
    return `${baseUrl}#sync=${encoded}`;
  } catch (e) {
    console.error('Error generando Sync URL:', e);
    return null;
  }
}

// Aplicar datos recibidos por QR con Fusión Inteligente (Smart Merge)
export function applySyncPayload(encodedPayload) {
  try {
    if (!encodedPayload) return { success: false, message: 'Código de sincronización vacío' };
    
    // Decodificar Base64 seguro
    const jsonStr = decodeURIComponent(atob(encodedPayload).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Datos de sincronización inválidos' };
    }

    const importedCourses = data.cp || data.courseProgress || {};
    const importedTimestamps = data.vt || data.videoTimestamps || {};
    const importedNotes = data.sn || data.studyNotes || {};

    // 1. Fusión de Notas (Smart Merge: se agregan las notas nuevas sin borrar las que ya tenías)
    const currentNotes = getAllStudyNotes();
    const mergedNotes = { ...currentNotes };

    Object.keys(importedNotes).forEach((vidId) => {
      const existingList = Array.isArray(mergedNotes[vidId]) ? [...mergedNotes[vidId]] : [];
      const incomingList = Array.isArray(importedNotes[vidId]) ? importedNotes[vidId] : [];

      incomingList.forEach((incomingNote) => {
        if (!incomingNote || !incomingNote.text) return;
        const normIncomingText = incomingNote.text.trim().toLowerCase();
        const normIncomingTime = Math.floor(incomingNote.timestamp || 0);

        const alreadyExists = existingList.some((ex) => {
          if (!ex) return false;
          if (ex.id && incomingNote.id && ex.id === incomingNote.id) return true;
          const normExText = (ex.text || '').trim().toLowerCase();
          const normExTime = Math.floor(ex.timestamp || 0);
          return normExTime === normIncomingTime && normExText === normIncomingText;
        });

        if (!alreadyExists) {
          existingList.push(incomingNote);
        }
      });

      existingList.sort((a, b) => a.timestamp - b.timestamp);
      mergedNotes[vidId] = existingList;
    });

    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(mergedNotes));

    // 2. Fusión de Cursos (Smart Merge: unión de todas las lecciones completadas)
    const currentCourses = getAllCoursesProgress();
    const mergedCourses = { ...currentCourses };

    Object.keys(importedCourses).forEach((courseKey) => {
      const curr = mergedCourses[courseKey] || { completedVideoIds: [], completedLessons: 0 };
      const inc = importedCourses[courseKey] || { completedVideoIds: [], completedLessons: 0 };

      const combinedIds = Array.from(new Set([...(curr.completedVideoIds || []), ...(inc.completedVideoIds || [])]));
      mergedCourses[courseKey] = {
        ...curr,
        ...inc,
        completedVideoIds: combinedIds,
        completedLessons: combinedIds.length,
        lastUpdated: new Date().toISOString()
      };
    });

    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(mergedCourses));

    // 3. Fusión de Tiempos de Reproducción
    const currentTimestamps = getAllVideoTimestamps();
    const mergedTimestamps = { ...currentTimestamps, ...importedTimestamps };
    localStorage.setItem(TIMESTAMPS_STORAGE_KEY, JSON.stringify(mergedTimestamps));

    // Notificar eventos para actualizar la UI en vivo en el navegador
    window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { all: mergedCourses } }));
    window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { all: mergedNotes } }));

    return {
      success: true,
      message: '¡Dispositivos sincronizados con éxito! Tus notas y lecciones han sido combinadas.'
    };
  } catch (e) {
    console.error('Error aplicando sincronización:', e);
    return { success: false, message: 'Error procesando el código de sincronización.' };
  }
}

// ================= 6. ENLACE EN LA NUBE ASISTIDO POR GOOGLE APPS SCRIPT (RAM CACHE) =================
const APPS_SCRIPT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg/exec";

// Obtener payload local codificado
export function getLocalSyncPayload() {
  const data = {
    v: '2.0',
    cp: getAllCoursesProgress(),
    vt: getAllVideoTimestamps(),
    sn: getAllStudyNotes(),
    t: Date.now()
  };
  const jsonStr = JSON.stringify(data);
  return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

// Iniciar sesión de enlace temporal (El PC crea el enlace y muestra el QR)
export async function initiateQRSyncSession() {
  const pairId = 'CP' + Math.floor(1000 + Math.random() * 9000);
  const payload = getLocalSyncPayload();

  try {
    fetch(APPS_SCRIPT_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'qr_sync_init',
        pairId: pairId,
        payload: payload
      })
    }).catch(() => {});
  } catch (e) {}

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://www.capacero3d.com/';
  return {
    pairId,
    syncUrl: `${baseUrl}#pair=${pairId}`
  };
}

// El PC consulta si el iPhone ya escaneó el QR y mandó sus datos
export async function pollQRSyncSession(pairId) {
  if (!pairId) return { status: 'waiting' };
  try {
    const res = await fetch(`${APPS_SCRIPT_ENDPOINT}?action=qr_sync_poll&pairId=${encodeURIComponent(pairId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ready' && data.payload) {
        const applyRes = applySyncPayload(data.payload);
        return { status: 'ready', success: true, message: applyRes.message };
      }
    }
  } catch (e) {}
  return { status: 'waiting' };
}

// El iPhone procesa el escaneo del QR del PC (#pair=CPXXXX)
export async function completeQRExchange(pairId) {
  if (!pairId) return { success: false, message: 'ID de emparejamiento no válido' };
  const phonePayload = getLocalSyncPayload();

  try {
    const res = await fetch(APPS_SCRIPT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'qr_sync_exchange',
        pairId: pairId,
        payload: phonePayload
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.sourcePayload) {
        applySyncPayload(data.sourcePayload);
        return {
          success: true,
          message: '¡Dispositivos sincronizados y combinados en ambos sentidos con éxito!'
        };
      }
    }
  } catch (e) {
    console.error('Error completando intercambio QR:', e);
  }

  return { success: false, message: 'No se pudo completar el intercambio.' };
}

// ================= 7. BORRADO LOCAL EXCLUSIVO DE ESTE DISPOSITIVO =================
export function clearAllLocalDeviceData() {
  if (typeof window === 'undefined' || !window.localStorage) return { success: false };
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(TIMESTAMPS_STORAGE_KEY);
    localStorage.removeItem(NOTES_STORAGE_KEY);

    window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { all: {} } }));
    window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { all: {} } }));

    return { 
      success: true, 
      message: 'Todos los apuntes y cursos han sido eliminados de este dispositivo.' 
    };
  } catch (e) {
    console.error('Error eliminando datos locales:', e);
    return { success: false, message: 'Error al eliminar los datos locales.' };
  }
}

