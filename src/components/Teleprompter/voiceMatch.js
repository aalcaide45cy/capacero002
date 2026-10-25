// Alineación entre lo que dices (reconocimiento de voz) y el guion.

export function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');
}

export function normalizeText(text) {
  return text.split(/\s+/).map(normalizeWord).filter(Boolean);
}

function levenshtein1(a, b) {
  // ¿Distancia de edición ≤ 1?
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function similar(a, b) {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  if (min >= 5 && levenshtein1(a, b)) return true;
  // Palabras a medias del reconocimiento («prompt» por «prompter»)
  if (min >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

/**
 * Busca dónde del guion vas, a partir de las últimas palabras reconocidas.
 * @param scriptWords palabras normalizadas del guion
 * @param cursor índice de la última palabra encontrada
 * @param spoken palabras normalizadas reconocidas (las últimas)
 * @returns nuevo índice (palabra donde acabas de llegar) o -1 si no hay coincidencia fiable
 */
export function findPosition(scriptWords, cursor, spoken, { back = 6, ahead = 80 } = {}) {
  const tail = spoken.slice(-6);
  const k = tail.length;
  if (k < 2) return -1;
  const start = Math.max(k - 1, cursor - back);
  const end = Math.min(scriptWords.length - 1, cursor + ahead);
  let best = -1;
  let bestScore = 0;
  for (let e = start; e <= end; e++) {
    let hits = 0;
    // El tramo del guion que termina en e se compara con lo dicho, de atrás hacia delante
    for (let i = 0; i < k; i++) {
      const sw = scriptWords[e - i];
      const w = tail[k - 1 - i];
      if (sw !== undefined && w && similar(sw, w)) hits++;
    }
    const score = hits / k;
    // Se exige que la última palabra dicha coincida, para no saltar por palabras sueltas
    if (!similar(scriptWords[e], tail[k - 1])) continue;
    const distancePenalty = Math.abs(e - cursor) / 400;
    const adjusted = score - distancePenalty;
    if (score >= 0.6 && adjusted > bestScore) {
      bestScore = adjusted;
      best = e;
    }
  }
  return best;
}
