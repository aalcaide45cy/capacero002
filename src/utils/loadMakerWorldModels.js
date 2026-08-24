import Papa from 'papaparse';

export const MAKERWORLD_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv&gid=1321598922";

const CACHE_KEY_DATA = 'CAPACERO_MAKERWORLD_CACHE_V2';
const CACHE_KEY_TIME = 'CAPACERO_MAKERWORLD_CACHE_TIME_V2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché inteligente (SWR)

/**
 * Normaliza una fila del Google Sheet de MakerWorld
 */
export function normalizeMakerWorldRow(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const name = String(raw.name || raw.Name || raw.nombre || raw.Titulo || raw.titulo || '').trim();
  if (!name) return null;

  const order = raw.order !== undefined && raw.order !== '' ? parseInt(raw.order, 10) : (index + 1);
  const link = String(raw.link || raw.Link || raw.url || raw.URL || 'https://makerworld.com/en/@capa_cero').trim();
  const description = String(raw.description || raw.Description || raw.descripcion || '').trim();
  const tag = String(raw.tag || raw.Tag || raw.categoria || raw.category || 'Modelo 3D').trim();
  const buttonText = String(raw.buttonText || raw.ButtonText || raw.boton || 'Descargar en MakerWorld').trim();
  
  const rawShowPrice = String(raw.showPrice || raw.show_price || raw.ShowPrice || '').trim().toLowerCase();
  const showPrice = rawShowPrice === 'true' || rawShowPrice === 'si' || rawShowPrice === 'sí' || rawShowPrice === '1';
  const price = String(raw.price || raw.Price || 'Gratis').trim();

  // Columna carouselInterval (milisegundos o segundos entre cada pase de fotos)
  const rawInterval = String(
    raw.carouselInterval || raw.carousel_interval || raw.CarouselInterval || 
    raw.interval || raw.Interval || raw.Intervalo || raw.intervalo || ''
  ).trim();
  
  let carouselInterval = 3500; // 3.5 segundos por defecto
  if (rawInterval) {
    const parsedNum = parseFloat(rawInterval.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedNum) && parsedNum > 0) {
      // Si el usuario escribe 3 o 4 (segundos), convertir a milisegundos (3000ms, 4000ms)
      carouselInterval = parsedNum < 50 ? Math.round(parsedNum * 1000) : Math.round(parsedNum);
    }
  }

  // Recoger hasta 10 imágenes (image1 a image10)
  const images = [];
  for (let i = 1; i <= 10; i++) {
    const key = `image${i}`;
    const imgUrl = String(raw[key] || raw[`Image${i}`] || raw[`imagen${i}`] || '').trim();
    if (imgUrl && imgUrl !== '-' && !imgUrl.toLowerCase().includes('vacio') && !imgUrl.toLowerCase().includes('vacío')) {
      images.push(imgUrl);
    }
  }

  // Fallback de imagen si no hay ninguna
  if (images.length === 0) {
    images.push('/logo-capa-cero.webp');
  }

  return {
    id: `model-${order || index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    order: isNaN(order) ? index + 1 : order,
    name,
    images,
    primaryImage: images[0],
    carouselInterval,
    price: price || 'Gratis',
    showPrice,
    link: link || 'https://makerworld.com/en/@capa_cero',
    description,
    tag: tag || 'MakerWorld',
    buttonText: buttonText || 'Descargar en MakerWorld'
  };
}

/**
 * Carga modelos desde Google Sheets con estrategia de Caché SWR
 */
export async function loadMakerWorldModels(forceRefresh = false) {
  const now = Date.now();

  // 1. Comprobar caché local válido
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cachedTimeStr = localStorage.getItem(CACHE_KEY_TIME);
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      const cachedTime = cachedTimeStr ? parseInt(cachedTimeStr, 10) : 0;

      if (cachedData && cachedTime && (now - cachedTime < CACHE_TTL_MS)) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché local de modelos MakerWorld:', e);
    }
  }

  // 2. Descargar CSV desde Google Sheets
  try {
    const response = await fetch(MAKERWORLD_SHEET_CSV_URL);
    if (!response.ok) {
      console.warn(`Error al conectar con hoja MakerWorld (${response.status})`);
      return [];
    }

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.data && Array.isArray(results.data) && results.data.length > 0) {
              const formatted = results.data
                .filter(row => row && typeof row === 'object')
                .map((row, idx) => normalizeMakerWorldRow(row, idx))
                .filter(Boolean);

              // Ordenar por columna order ascendente
              formatted.sort((a, b) => (a.order || 0) - (b.order || 0));

              if (formatted.length > 0 && typeof window !== 'undefined' && window.localStorage) {
                try {
                  localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(formatted));
                  localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
                } catch (err) {}
              }
              resolve(formatted);
            } else {
              resolve([]);
            }
          } catch (err) {
            console.error('Error parseando modelos MakerWorld:', err);
            resolve([]);
          }
        },
        error: (err) => {
          console.warn('Error en PapaParse MakerWorld:', err);
          resolve([]);
        }
      });
    });
  } catch (err) {
    console.warn('Fallo cargando modelos MakerWorld desde Google Sheets:', err);
    return [];
  }
}
