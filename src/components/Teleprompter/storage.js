// Persistencia local del Teleprompter (/tp).
// Todo vive en localStorage del navegador con prefijo propio: nada se envía a la web.

export const TP_KEYS = {
  script: 'capacero_tp_script',
  settings: 'capacero_tp_settings',
  position: 'capacero_tp_position',
  library: 'capacero_tp_library',
  current: 'capacero_tp_current',
};

function defaultFontSize() {
  if (typeof window === 'undefined') return 48;
  return Math.round(Math.min(72, Math.max(30, window.innerWidth / 14)));
}

export const DEFAULT_SETTINGS = {
  // Texto
  fontSize: defaultFontSize(),
  lineHeight: 1.35,
  width: 88,
  align: 'left',
  fontFamily: 'sans',
  textColor: '#ffffff',
  bgColor: '#000000',
  textShadow: true,
  uppercase: false,
  // Desplazamiento
  speed: 8,
  countdown: 3,
  countdownOnResume: false,
  controlsPinned: false,
  controlsHideDelay: 3,
  tapWakesControls: true,
  guidePos: 30,
  guideStyle: 'band',
  fadeRead: true,
  // Espejo
  mirrorH: false,
  mirrorV: false,
  // Cámara y grabación
  cameraOn: false,
  cameraSource: 'user',
  resolution: '1080',
  fps: 30,
  videoBitrate: 0,
  audioBitrate: 320,
  audioSampleRate: 0,
  audioChannels: 0,
  showMicMeter: true,
  hideNotices: true,
  voiceMode: 'off',
  voiceLast: 'talk',
  voiceSensitivity: 10,
  voiceLang: 'es-ES',
  voiceFollowSpeed: 8,
  voiceLookahead: 2,
  voiceAlign: 'linea',
  voiceFollowWhileRecording: false,
  voicePace: true,
  voicePaceFactor: 1,
  pauseOnMarkers: true,
  backupRecordings: true,
  liteWhileRecording: true,
  wavRecord: false,
  wavBitDepth: 24,
  cameraMirror: true,
  cameraFit: 'cover',
  cameraDim: 0.35,
  micId: 'default',
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  micGain: 0,
  micCompressor: false,
};

export const SAMPLE_SCRIPT = `# Bienvenido al Teleprompter

Pega aquí tu **guion** o abre un archivo **.md** o **.txt**.

El texto se desplaza solo a la velocidad que elijas. Pulsa la **barra espaciadora** o toca la pantalla para pausar.

## Consejos rápidos

- Usa títulos (\`#\`, \`##\`) para separar secciones y saltar entre ellas.
- Las **negritas** y la *cursiva* se ven resaltadas al leer.
- Puedes activar la **cámara** y grabarte mientras lees.

> Las citas sirven para notas de dirección, como «mira a cámara».

---

## Atajos de teclado

Flechas arriba y abajo cambian la velocidad. AvPág y RePág saltan de sección. Las teclas + y − cambian el tamaño de letra.

¡A grabar!
`;

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cuota llena o almacenamiento bloqueado: se sigue funcionando sin guardar
  }
}

// Versión 2: el procesado de voz pasa a estar desactivado por defecto (se reinicia una sola vez)
const SETTINGS_VERSION = 5;

export function loadSettings() {
  const saved = loadJSON(TP_KEYS.settings, {});
  const merged = { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
  const v = saved?.settingsVersion || 1;
  if (v < 2) merged.voiceProcessing = false;
  // Versión 5: el procesado de voz se divide en eco, ruido y ganancia automática (todo apagado)
  if (v < 5) {
    merged.echoCancellation = false;
    merged.noiseSuppression = false;
    merged.autoGainControl = false;
  }
  delete merged.voiceProcessing;
  // Versión 3: el audio del vídeo pasa a 320 kbps por defecto
  if (v < 3) merged.audioBitrate = DEFAULT_SETTINGS.audioBitrate;
  // Versión 4: se quita la opción de 96 kHz
  if (merged.audioSampleRate > 48000) merged.audioSampleRate = 0;
  merged.settingsVersion = SETTINGS_VERSION;
  return merged;
}

export function loadScript() {
  const saved = loadJSON(TP_KEYS.script, null);
  if (saved && typeof saved.text === 'string') {
    return { text: saved.text, format: saved.format === 'txt' ? 'txt' : 'md', name: saved.name || '' };
  }
  return { text: SAMPLE_SCRIPT, format: 'md', name: '' };
}

// La posición de lectura solo se recupera si el guion no ha cambiado de longitud
const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createScriptItem({ name, text, format = 'md' }) {
  return { id: newId(), name, text, format: format === 'txt' ? 'txt' : 'md', updatedAt: Date.now() };
}

// Biblioteca de guiones. La primera vez recoge el guion único de versiones anteriores.
export function loadLibrary() {
  const saved = loadJSON(TP_KEYS.library, null);
  let items = Array.isArray(saved) ? saved.filter(i => i && typeof i.text === 'string' && i.id) : [];
  if (!items.length) {
    const old = loadScript();
    items = [createScriptItem({ name: old.name || 'Guion 1', text: old.text, format: old.format })];
  }
  const currentId = loadJSON(TP_KEYS.current, null);
  return { items, currentId: items.some(i => i.id === currentId) ? currentId : items[0].id };
}

export function loadPosition(textLength, id = '') {
  const saved = loadJSON(id ? `${TP_KEYS.position}_${id}` : TP_KEYS.position, null);
  if (saved && saved.len === textLength && typeof saved.pos === 'number') return saved.pos;
  return 0;
}

export function savePosition(pos, textLength, id = '') {
  saveJSON(id ? `${TP_KEYS.position}_${id}` : TP_KEYS.position, { pos: Math.max(0, Math.round(pos)), len: textLength });
}

// Documentos abiertos en el Editor MD (/editor), solo lectura
export function loadEditorMdFiles() {
  const saved = loadJSON('editormd_session', null);
  const files = saved && Array.isArray(saved.files) ? saved.files : [];
  return files.filter(f => f && typeof f.content === 'string' && f.content.trim());
}
