/**
 * Utilidad compartida de filtrado tolerante para la Videoteca de Capa Cero 3D.
 * Maneja equivalencias de términos clave, elimina tildes/mayúsculas y busca en
 * título, descripción, categoría y consejo clave.
 */

export function normalizeSearchString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar tildes y diacríticos
    .replace(/#\d+/g, ' ') // ignorar números de episodio con hashtag
    .replace(/[^\w\s]/g, ' ') // reemplazar signos de puntuación por espacios
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expande o normaliza un token de búsqueda con equivalencias técnicas conocidas
 */
function getEquivalentTerms(token) {
  const norm = normalizeSearchString(token);
  if (!norm) return [];

  const equivalents = new Set([norm]);

  // Equivalencias Bambu Studio / BambuLab
  if (norm === 'bambustudio' || norm === 'bambu' || norm === 'studio' || norm === 'bambulab') {
    equivalents.add('bambu');
    equivalents.add('studio');
    equivalents.add('bambustudio');
    equivalents.add('bambulab');
  }

  // Equivalencias Fusion / Fusion 360 / CAD
  if (norm === 'fusion' || norm === 'fusion360' || norm === '360') {
    equivalents.add('fusion');
    equivalents.add('360');
    equivalents.add('fusion 360');
    equivalents.add('fusion360');
  }

  // Equivalencias AMS / Multicolor / Filamentos
  if (norm === 'ams' || norm === 'multicolor' || norm === 'multi') {
    equivalents.add('ams');
    equivalents.add('multicolor');
  }

  // Scarf / Costuras
  if (norm === 'scarf' || norm === 'costura' || norm === 'costuras') {
    equivalents.add('scarf');
    equivalents.add('costura');
    equivalents.add('costuras');
  }

  // PEI / Adherencia / Cama / Placa
  if (norm === 'pei' || norm === 'placa' || norm === 'adherencia' || norm === 'warping') {
    equivalents.add('pei');
    equivalents.add('placa');
    equivalents.add('adherencia');
    equivalents.add('warping');
  }

  return Array.from(equivalents);
}

/**
 * Filtra los vídeos de forma tolerante y opcionalmente por categoría y criterio de orden.
 */
export function filterVideos(videos = [], {
  searchQuery = '',
  activeCategory = 'Todos',
  activeSortFilter = 'newest'
} = {}) {
  if (!Array.isArray(videos)) return [];

  const rawQuery = (searchQuery || '').trim();
  const normQuery = normalizeSearchString(rawQuery);
  const queryTokens = normQuery ? normQuery.split(' ').filter(Boolean) : [];

  let result = videos.filter((video) => {
    if (!normQuery || queryTokens.length === 0) return true;

    // Corpus searchable del vídeo: título, descripción, consejo clave, categoría, slug
    const corpus = normalizeSearchString(
      `${video.title || ''} ${video.description || ''} ${video.category || ''} ${video.consejoClave || ''} ${video.slug || ''}`
    );

    // 1. Coincidencia directa completa de la frase
    if (corpus.includes(normQuery)) return true;

    // 2. Coincidencia de todos los tokens con expansión de equivalencias
    const allTokensMatch = queryTokens.every((token) => {
      const equivalents = getEquivalentTerms(token);
      return equivalents.some((eq) => corpus.includes(eq));
    });

    return allTokensMatch;
  });

  // Filtrado por categoría
  if (activeCategory && activeCategory !== 'Todos') {
    const normCategory = normalizeSearchString(activeCategory);
    result = result.filter((v) => normalizeSearchString(v.category) === normCategory);
  }

  // Separar publicados y programados: los publicados van PRIMERO, los programados AL FINAL
  const published = result.filter((v) => !v.isScheduled);
  const scheduled = result.filter((v) => v.isScheduled);

  if (activeSortFilter === 'popular') {
    published.sort((a, b) => ((b.views || 0) - (a.views || 0)) || ((b.likes || 0) - (a.likes || 0)));
    scheduled.sort((a, b) => ((b.views || 0) - (a.views || 0)) || ((b.likes || 0) - (a.likes || 0)));
  } else {
    // 'newest': Más nuevos publicados primero
    published.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    scheduled.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  }

  return [...published, ...scheduled];
}

/**
 * Calcula el número exacto de resultados para una búsqueda
 */
export function countSearchResults(videos = [], searchQuery = '') {
  if (!searchQuery || !searchQuery.trim()) return videos.length;
  return filterVideos(videos, { searchQuery, activeCategory: 'Todos' }).length;
}
