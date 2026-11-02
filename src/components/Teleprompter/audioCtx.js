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

// Pitido corto de confirmación: uno para reproducir o grabar, dos más graves para parar
export function beep(kind = 'ok') {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    ctx.resume?.().catch(() => {});
    const tones = kind === 'stop' ? [[600, 0], [600, 0.2]] : [[900, 0]];
    tones.forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    });
  } catch {
    // sin audio: no pasa nada
  }
}

// Llamar siempre desde un manejador de toque o clic
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}
