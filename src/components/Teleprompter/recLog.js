// Registro de diagnóstico de la grabación. Vive solo en el dispositivo: se puede copiar o descargar
// para enviarlo a quien lo necesite, y se guarda la última grabación en localStorage.

const KEY = 'capacero_tp_lastlog';
const MAX_LINES = 1500;

let lines = [];
let t0 = 0;

export const recLog = {
  start(header) {
    lines = [];
    t0 = performance.now();
    this.add(header || 'inicio');
  },
  add(message) {
    const t = ((performance.now() - t0) / 1000).toFixed(2).padStart(7, ' ');
    lines.push(`${t}s  ${message}`);
    if (lines.length > MAX_LINES) lines.splice(1, 1);
  },
  text() {
    return lines.join('\n');
  },
  hasData() {
    return lines.length > 0;
  },
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: new Date().toISOString(), text: lines.join('\n') }));
    } catch {
      // Sin espacio o almacenamiento bloqueado
    }
  },
  loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      return saved && typeof saved.text === 'string' ? saved : null;
    } catch {
      return null;
    }
  },
};

export function describeTrack(track) {
  if (!track) return 'ninguna';
  const s = track.getSettings?.() || {};
  const parts = [`${track.kind}`, `"${track.label || '?'}"`, `estado=${track.readyState}`, `muted=${track.muted}`, `enabled=${track.enabled}`];
  if (s.width) parts.push(`${s.width}x${s.height}`);
  if (s.frameRate) parts.push(`${Math.round(s.frameRate)}fps`);
  if (s.sampleRate) parts.push(`${s.sampleRate}Hz`);
  if (s.channelCount) parts.push(`${s.channelCount}ch`);
  if (s.echoCancellation !== undefined) parts.push(`eco=${s.echoCancellation}`);
  if (s.noiseSuppression !== undefined) parts.push(`ruido=${s.noiseSuppression}`);
  if (s.autoGainControl !== undefined) parts.push(`agc=${s.autoGainControl}`);
  return parts.join(' ');
}
