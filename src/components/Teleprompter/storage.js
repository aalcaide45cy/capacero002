// Persistencia local del Teleprompter (/tp).
// Todo vive en localStorage del navegador con prefijo propio: nada se envía a la web.

export const TP_KEYS = {
  script: 'capacero_tp_script',
  settings: 'capacero_tp_settings',
  position: 'capacero_tp_position',
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
  cameraMirror: true,
  cameraDim: 0.35,
  micId: 'default',
  voiceProcessing: true,
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

export function loadSettings() {
  const saved = loadJSON(TP_KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function loadScript() {
  const saved = loadJSON(TP_KEYS.script, null);
  if (saved && typeof saved.text === 'string') {
    return { text: saved.text, format: saved.format === 'txt' ? 'txt' : 'md', name: saved.name || '' };
  }
  return { text: SAMPLE_SCRIPT, format: 'md', name: '' };
}

// La posición de lectura solo se recupera si el guion no ha cambiado de longitud
export function loadPosition(textLength) {
  const saved = loadJSON(TP_KEYS.position, null);
  if (saved && saved.len === textLength && typeof saved.pos === 'number') return saved.pos;
  return 0;
}

export function savePosition(pos, textLength) {
  saveJSON(TP_KEYS.position, { pos: Math.max(0, Math.round(pos)), len: textLength });
}

// Documentos abiertos en el Editor MD (/editor), solo lectura
export function loadEditorMdFiles() {
  const saved = loadJSON('editormd_session', null);
  const files = saved && Array.isArray(saved.files) ? saved.files : [];
  return files.filter(f => f && typeof f.content === 'string' && f.content.trim());
}
