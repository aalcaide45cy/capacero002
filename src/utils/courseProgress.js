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

      if (data.courseProgress) {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data.courseProgress));
        restoredCount++;
      }
      if (data.videoTimestamps) {
        localStorage.setItem(TIMESTAMPS_STORAGE_KEY, JSON.stringify(data.videoTimestamps));
        restoredCount++;
      }
      if (data.studyNotes) {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data.studyNotes));
        restoredCount++;
      }

      if (restoredCount > 0) {
        window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { all: data.courseProgress } }));
        window.dispatchEvent(new CustomEvent('capacero-notes-updated', { detail: { all: data.studyNotes } }));
        return { 
          success: true, 
          message: '¡Copia restaurada con éxito! Progreso, tiempos y notas recuperados.' 
        };
      }
    }
    return { success: false, message: 'El archivo JSON no tiene un formato válido de Capa Cero.' };
  } catch (e) {
    return { success: false, message: 'Error al leer el archivo JSON.' };
  }
}
