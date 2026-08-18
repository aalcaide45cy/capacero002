/**
 * Capa Cero - Gestor de Progreso de Cursos en LocalStorage
 */

const PROGRESS_STORAGE_KEY = 'CAPACERO_COURSE_PROGRESS_V1';

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
 * Obtiene todo el mapa de progreso de todos los cursos
 */
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

/**
 * Obtiene el progreso de un curso específico
 */
export function getCourseProgress(courseName) {
  const slug = normalizeCourseSlug(courseName);
  const all = getAllCoursesProgress();
  return all[slug] || null;
}

/**
 * Guarda el progreso actual de una lección
 */
export function saveCourseProgress(courseName, video) {
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
    // Disparar evento personalizado para sincronización reactiva inmediata entre componentes
    window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { slug, progress: all[slug] } }));
  } catch (e) {
    console.warn('Error guardando progreso en localStorage:', e);
  }
}

/**
 * Reinicia el progreso de un curso específico
 */
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

/**
 * Exporta una copia de seguridad en archivo .json descargable
 */
export function exportProgressBackup() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    courseProgress: getAllCoursesProgress(),
    system: 'Capa Cero 3D Academy'
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `capacero-progreso-${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restaura una copia de seguridad a partir de un texto JSON o archivo
 */
export function importProgressBackup(jsonContent) {
  try {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    if (data && typeof data === 'object' && data.courseProgress) {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data.courseProgress));
      window.dispatchEvent(new CustomEvent('capacero-progress-updated', { detail: { all: data.courseProgress } }));
      return { success: true, message: 'Progreso restaurado correctamente' };
    }
    return { success: false, message: 'El archivo no tiene una estructura válida de Capa Cero' };
  } catch (e) {
    return { success: false, message: 'Error procesando el archivo JSON' };
  }
}
