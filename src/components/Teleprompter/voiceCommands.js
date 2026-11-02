import { normalizeText } from './voiceMatch';

// Órdenes de voz: «Reproducir», «Grabar» y «Parar parar parar» (con sinónimos).
//  - Con todo parado valen «reproducir» y «grabar», pero solo si la frase es corta (1 o 2 palabras), para que
//    no salten dentro de una conversación.
//  - Leyendo o grabando solo vale parar, y hay que decirlo 3 veces seguidas: así un «para» suelto del guion no para nada.
const PLAY = new Set(['reproducir', 'reproduce', 'reproduzca', 'play', 'empieza', 'empezar', 'comienza', 'comenzar']);
const RECORD = new Set(['grabar', 'graba', 'graben', 'record', 'rec']);
const STOP = new Set(['parar', 'para', 'pare', 'stop', 'estop', 'stob', 'detener', 'detente', 'alto']);

/**
 * @param text frase reconocida (la última, no todo lo dicho)
 * @param busy true si se está reproduciendo, grabando o en cuenta atrás
 * @returns 'play' | 'record' | 'stop' | null
 */
export function parseVoiceCommand(text, { busy }) {
  const words = normalizeText(text);
  if (words.length >= 3 && words.slice(-3).every(w => STOP.has(w))) return busy ? 'stop' : null;
  if (busy) return null;
  if (words.length >= 1 && words.length <= 2) {
    if (words.some(w => RECORD.has(w))) return 'record';
    if (words.some(w => PLAY.has(w))) return 'play';
  }
  return null;
}
