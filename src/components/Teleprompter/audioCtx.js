import { recLog } from './recLog';

// Un único AudioContext para toda la app (medidor, ganancia, WAV y pruebas).
// iOS arranca los AudioContext «suspendidos» hasta que se reanudan dentro de un toque del usuario, y limita
// cuántos puede haber: por eso se crea una vez y se reanuda con unlockAudio() desde los botones.

let shared = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!shared || shared.state === 'closed') {
    shared = new Ctx();
    shared.onstatechange = () => recLog.add(`AudioContext compartido: estado=${shared.state} ${shared.sampleRate}Hz`);
  }
  return shared;
}

// Llamar siempre desde un manejador de toque o clic
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}
