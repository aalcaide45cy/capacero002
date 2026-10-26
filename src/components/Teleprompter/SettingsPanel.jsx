import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AudioLines, Bookmark, Camera, Circle, Info, Mic, Play, RotateCcw, Search, SlidersHorizontal, Sparkles, Type, X,
} from 'lucide-react';
import PresetsView from './PresetsView';
import { KARAOKE_STYLES, KARAOKE_UNITS, karaokeVars } from './karaoke';
import { RESOLUTIONS, hasMediaDevices, isIOS, isChromeIOS, isStandalone, permissionHelp } from './useMedia';
import { speechRecognitionSupported } from './useVoice';
import { recLog } from './recLog';
import { getAudioContext, unlockAudio } from './audioCtx';
import { DEFAULT_SETTINGS } from './storage';

// ─── Buscador: cada control se oculta si no coincide con lo escrito ───
const PanelCtx = createContext({ q: '' });
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function useMatch(label, keywords = '') {
  const { q } = useContext(PanelCtx);
  if (!q) return true;
  const hay = norm(`${label} ${keywords}`);
  return q.split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

function Badge({ children }) {
  return <em className="tp-badge">{children}</em>;
}

function Range({ label, value, min, max, step = 1, onChange, format, keywords }) {
  const show = useMatch(label, keywords);
  if (!show) return null;
  return (
    <label className="tp-field">
      <span className="tp-field-label">
        {label}
        <span className="tp-field-value">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled, badge, keywords }) {
  const show = useMatch(label, keywords);
  if (!show) return null;
  return (
    <label className={`tp-toggle${disabled ? ' is-disabled' : ''}`}>
      <span>
        {label}
        {badge && <Badge>{badge}</Badge>}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="tp-switch" aria-hidden="true" />
    </label>
  );
}

function Select({ label, value, onChange, options, disabled, keywords }) {
  const show = useMatch(label, keywords);
  if (!show) return null;
  return (
    <label className="tp-field">
      <span className="tp-field-label">{label}</span>
      <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ label, value, onChange, options, keywords }) {
  const show = useMatch(label, keywords);
  if (!show) return null;
  return (
    <div className="tp-field">
      <span className="tp-field-label">{label}</span>
      <div className="tp-segmented" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Bloque suelto (botones de prueba, indicadores...) que también entra en el buscador
function Row({ label, keywords, children }) {
  const show = useMatch(label, keywords);
  return show ? <div className="tp-row">{children}</div> : null;
}

// Explicación larga plegada: se abre solo si hace falta
function Help({ title = '¿Qué es esto?', children }) {
  const { q } = useContext(PanelCtx);
  if (q) return null;
  return (
    <details className="tp-help">
      <summary>
        <Info size={14} /> {title}
      </summary>
      <div>{children}</div>
    </details>
  );
}

// Opciones avanzadas o experimentales: plegadas por defecto
function Advanced({ title = 'Opciones avanzadas', children }) {
  const { q } = useContext(PanelCtx);
  if (q) return <div className="tp-advanced-flat">{children}</div>;
  return (
    <details className="tp-advanced">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

function Subtitle({ children }) {
  const { q } = useContext(PanelCtx);
  if (q) return null;
  return <h4 className="tp-subtitle">{children}</h4>;
}

// Medidor de nivel del micrófono (Web Audio, todo local)
export function MicMeter({ stream }) {
  const barRef = useRef(null);
  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    const ctx = getAudioContext();
    if (!track || !ctx) return undefined;
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf;
    let lastDraw = 0;
    const tick = t => {
      raf = requestAnimationFrame(tick);
      // El medidor se actualiza ~15 veces por segundo: menos trabajo mientras se graba
      if (t - lastDraw < 66) return;
      lastDraw = t;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      const level = Math.min(1, Math.max(0, (db + 50) / 50));
      if (barRef.current) barRef.current.style.transform = `scaleX(${level})`;
    };
    ctx.resume?.().catch(() => {});
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
    };
  }, [stream]);

  return (
    <div className="tp-meter" aria-label="Nivel del micrófono">
      <div className="tp-meter-bar" ref={barRef} />
    </div>
  );
}

const VIDEO_LEVELS = [2, 4, 6, 8, 12, 16, 20, 25, 35, 50, 80, 100];
const videoLevelName = m => (m <= 4 ? 'ligero' : m <= 8 ? 'buena' : m <= 16 ? 'alta' : m <= 35 ? 'muy alta' : 'máxima, archivos enormes');

// Mide el pico de tu voz durante unos segundos y calcula la ganancia para llegar a -6 dBFS
function AutoGain({ micTrack, update, disabled }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const ctx = unlockAudio();
    if (!micTrack || !ctx || busy) return;
    setBusy(true);
    setMsg('Habla con normalidad durante 6 segundos…');
    const source = ctx.createMediaStreamSource(new MediaStream([micTrack]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let peak = 0;
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    }, 40);
    await new Promise(r => setTimeout(r, 6000));
    clearInterval(id);
    source.disconnect();
    analyser.disconnect();
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;
    if (peakDb < -60) {
      setMsg('No se ha oído nada. Comprueba que el micrófono está encendido y habla más cerca.');
    } else {
      const gain = Math.max(0, Math.min(24, Math.round(-6 - peakDb)));
      update({ micGain: gain });
      setMsg(`Pico de tu voz: ${peakDb.toFixed(0)} dBFS → ganancia puesta en ${gain === 0 ? '0 dB (ya llega fuerte)' : `+${gain} dB`}.`);
    }
    setBusy(false);
  };

  return (
    <>
      <button type="button" className="tp-btn" onClick={run} disabled={disabled || busy || !micTrack} style={{ marginBottom: 8 }}>
        {busy ? 'Midiendo…' : 'Ajustar ganancia con mi voz'}
      </button>
      {msg && <p className="tp-hint">{msg}</p>}
    </>
  );
}

const MIC_MODES = [
  { name: 'Todo apagado', c: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } },
  { name: 'Solo eco', c: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } },
  { name: 'Solo ruido', c: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } },
  { name: 'Solo ganancia auto.', c: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } },
  { name: 'Todo activado', c: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
];

const percentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

// Mide, con cada combinación de ajustes de voz, cuánto suena tu voz y cuánto ruido de fondo hay
function MicTest({ settings, update, recording }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const ctx = unlockAudio();
    if (!ctx || busy) return;
    setBusy(true);
    setRows([]);
    const cameraWasOn = settings.cameraOn;
    // iOS no admite capturar con y sin cancelación de eco a la vez: se apaga la cámara durante la prueba
    if (cameraWasOn) {
      update({ cameraOn: false });
      await new Promise(r => setTimeout(r, 700));
    }
    const out = [];
    for (let i = 0; i < MIC_MODES.length; i++) {
      const mode = MIC_MODES[i];
      setStatus(`Prueba ${i + 1} de ${MIC_MODES.length} («${mode.name}»): lee una frase y haz pausas de un segundo durante 6 s…`);
      let stream;
      try {
        const audio = { ...mode.c };
        if (settings.micId && settings.micId !== 'default') audio.deviceId = { exact: settings.micId };
        if (settings.audioChannels > 0) audio.channelCount = { ideal: settings.audioChannels };
        stream = await navigator.mediaDevices.getUserMedia({ audio });
      } catch (err) {
        setStatus(`No se pudo abrir el micrófono: ${err?.name || err}`);
        break;
      }
      const track = stream.getAudioTracks()[0];
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const windows = [];
      let peak = 0;
      const t0 = Date.now();
      await new Promise(resolve => {
        const id = setInterval(() => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let k = 0; k < data.length; k++) {
            sum += data[k] * data[k];
            peak = Math.max(peak, Math.abs(data[k]));
          }
          // La primera décima de segundo se descarta: el sistema aún está ajustando el micrófono
          if (Date.now() - t0 > 700) windows.push(20 * Math.log10(Math.sqrt(sum / data.length) || 1e-6));
          if (Date.now() - t0 > 6000) {
            clearInterval(id);
            resolve();
          }
        }, 100);
      });
      source.disconnect();
      analyser.disconnect();
      const s = track.getSettings?.() || {};
      stream.getTracks().forEach(t => t.stop());
      const voice = percentile(windows, 0.9);
      const noise = percentile(windows, 0.1);
      out.push({
        name: mode.name,
        voice: Math.round(voice),
        noise: Math.round(noise),
        diff: Math.round(voice - noise),
        peak: Math.round(20 * Math.log10(peak || 1e-6)),
        applied: `eco ${s.echoCancellation} · ruido ${s.noiseSuppression} · ganancia ${s.autoGainControl}`,
      });
      setRows([...out]);
      await new Promise(r => setTimeout(r, 400));
    }
    if (cameraWasOn) update({ cameraOn: true });
    setStatus(out.length ? 'Listo. Interpreta la tabla debajo.' : status);
    recLog.add(`prueba de micrófono: ${JSON.stringify(out)}`);
    setBusy(false);
  };

  const best = rows.length ? [...rows].sort((a, b) => b.diff - a.diff)[0] : null;
  const loudest = rows.length ? [...rows].sort((a, b) => b.voice - a.voice)[0] : null;

  return (
    <>
      <button type="button" className="tp-btn" onClick={run} disabled={busy || recording} style={{ marginBottom: 8 }}>
        {busy ? 'Probando…' : 'Probar micrófono con 5 combinaciones'}
      </button>
      {status && <p className="tp-hint">{status}</p>}
      {rows.length > 0 && (
        <>
          <table className="tp-mic-table">
            <thead>
              <tr><th>Ajuste</th><th>Voz</th><th>Ruido</th><th>Dif.</th><th>Pico</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} title={r.applied}>
                  <td>{r.name}</td><td>{r.voice}</td><td>{r.noise}</td><td>{r.diff}</td><td>{r.peak}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tp-hint">
            Valores en dB (0 es el máximo; −20 suena fuerte, −50 muy bajo). «Dif.» es voz menos ruido: cuanto mayor,
            más limpia queda la voz. Más fuerte: <strong>{loudest.name}</strong>. Más limpia: <strong>{best.name}</strong>.
            Si los números de las filas son casi iguales entre sí, el iPhone está ignorando esos interruptores.
          </p>
        </>
      )}
    </>
  );
}

// Comprueba en este dispositivo si el reconocimiento de voz funciona y por qué no
function VoiceTest({ update }) {
  const [state, setState] = useState({ running: false, heard: '', error: '', started: false });

  const run = async (useTrack = false) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    unlockAudio();
    let micStream = null;
    let track = null;
    if (useTrack) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        track = micStream.getAudioTracks()[0];
      } catch (err) {
        setState({ running: false, heard: '', error: err?.name === 'NotAllowedError' ? 'not-allowed' : String(err?.name || err), started: false });
        return;
      }
    }
    setState({ running: true, heard: '', error: '', started: false });
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    let got = false;
    rec.onstart = () => setState(s => ({ ...s, started: true }));
    rec.onresult = e => {
      got = true;
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      setState(s => ({ ...s, heard: t.trim() }));
    };
    rec.onerror = e => setState(s => ({ ...s, error: e.error }));
    rec.onend = () => {
      micStream?.getTracks().forEach(t => t.stop());
      // Si entiende lo que dices usando la pista del micrófono, se activa para poder seguir tu voz también al grabar
      if (track && got) {
        update({ voiceUseTrack: true, voiceFollowWhileRecording: true, voiceMode: 'follow', voiceLast: 'follow' });
        setState(s => ({ ...s, activated: true }));
      }
      setState(s => ({ ...s, running: false, error: s.error || (got ? '' : s.started ? 'no-speech' : 'cerrado-al-instante') }));
    };
    try {
      if (track) rec.start(track);
      else rec.start();
    } catch (err) {
      setState({ running: false, heard: '', error: String(err?.name || err), started: false });
    }
    setTimeout(() => { try { rec.stop(); } catch { /* ya parado */ } }, 7000);
  };

  const supported = speechRecognitionSupported();
  const hints = {
    'not-allowed': 'Permiso denegado. ' + permissionHelp(),
    'service-not-allowed': 'El sistema no deja usar el reconocimiento. En iPhone: Ajustes → General → Teclado → activa «Dictado» y Ajustes → Siri → activa «Escuchar/Siri». Si usas la app instalada en pantalla de inicio, ábrelo desde Safari: iOS no permite el reconocimiento en apps web instaladas.',
    'cerrado-al-instante': 'Se cerró al instante. Causas habituales en iPhone: Dictado apagado (Ajustes → General → Teclado), o abierto desde el icono de pantalla de inicio (no lo admite).',
    'no-speech': 'Funciona, pero no te ha oído: habla más cerca o más alto.',
    'audio-capture': 'No ha podido abrir el micrófono; puede estar ocupado por la cámara.',
    network: 'Sin conexión con el servicio de reconocimiento (necesita internet).',
  };

  return (
    <>
      <p className="tp-hint">
        Reconocimiento de voz: {supported ? 'el navegador lo tiene' : 'este navegador NO lo tiene (usa Safari o Chrome)'} ·{' '}
        {isStandalone() ? 'abierto como app instalada' : 'abierto en el navegador'} · {isChromeIOS() ? 'Chrome en iPhone' : isIOS() ? 'Safari en iPhone' : 'ordenador/Android'}.
      </p>
      <button type="button" className="tp-btn" onClick={() => run(false)} disabled={!supported || state.running} style={{ marginBottom: 8 }}>
        {state.running ? 'Escuchando 7 s… di una frase' : 'Probar el reconocimiento de voz'}
      </button>
      <button type="button" className="tp-btn" onClick={() => run(true)} disabled={!supported || state.running} style={{ marginBottom: 8 }}>
        Probar sobre la pista del micrófono (experimental)
      </button>
      <p className="tp-hint">
        La segunda prueba abre tu micrófono y se lo da al reconocimiento. Si funciona en tu navegador, el reconocimiento y la
        grabación podrían compartir el micrófono.
      </p>
      {state.heard && <p className="tp-hint">He oído: «{state.heard}» ✓</p>}
      {state.activated && (
        <p className="tp-hint">
          ✓ Funciona con la pista del micrófono. He activado «Sigue mi voz» también al grabar. Si al grabar el vídeo se queda sin
          sonido, desactiva las dos opciones experimentales de abajo.
        </p>
      )}
      {state.error && (
        <p className={state.error === 'no-speech' ? 'tp-hint' : 'tp-error'}>
          {hints[state.error] || `Error: ${state.error}`}
        </p>
      )}
    </>
  );
}

// Pide el permiso de cámara y micrófono y dice qué ha pasado
function PermissionsHelper() {
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(null);
  const run = async () => {
    setMsg('');
    setOk(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      s.getTracks().forEach(t => t.stop());
      setOk(true);
      setMsg('Permisos concedidos ✓');
    } catch (err) {
      setOk(false);
      setMsg(
        err?.name === 'NotAllowedError'
          ? `Permiso denegado. ${permissionHelp()}`
          : `${err?.name || 'Error'}: ${err?.message || err}`
      );
    }
  };
  return (
    <>
      <button type="button" className="tp-btn" onClick={run} style={{ marginBottom: 8 }}>
        Dar permisos de cámara y micrófono
      </button>
      {msg && <p className={ok ? 'tp-hint' : 'tp-error'}>{msg}</p>}
    </>
  );
}

function GainState({ active }) {
  const [state, setState] = useState('');
  useEffect(() => {
    const id = setInterval(() => setState(getAudioContext()?.state || ''), 500);
    return () => clearInterval(id);
  }, []);
  if (!active) return null;
  return (
    <p className={state === 'running' ? 'tp-hint' : 'tp-error'}>
      {state === 'running'
        ? 'Ganancia por software activa.'
        : 'La ganancia por software está en pausa: iOS no deja procesar el audio hasta que toques la pantalla. Toca «Probar micrófono» o enciende la cámara de nuevo.'}
    </p>
  );
}

function LastLog() {
  const saved = recLog.loadSaved();
  const [copied, setCopied] = useState(false);
  if (!saved) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(saved.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // se puede seleccionar a mano
    }
  };
  return (
    <details className="tp-log">
      <summary>Registro de la última grabación ({new Date(saved.at).toLocaleString('es-ES')})</summary>
      <textarea readOnly value={saved.text} onFocus={e => e.target.select()} />
      <button type="button" className="tp-btn" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar registro'}</button>
    </details>
  );
}

// ─── Grupos de ajustes ───
const GROUPS = [
  {
    id: 'lectura', label: 'Lectura', icon: Play, color: '#22d3ee', soft: 'rgba(34, 211, 238, 0.16)',
    desc: 'Cómo se mueve el texto y dónde se lee',
    keys: ['speed', 'countdown', 'countdownOnResume', 'guidePos', 'guideStyle', 'fadeRead', 'pauseOnMarkers'],
  },
  {
    id: 'texto', label: 'Texto', icon: Type, color: '#a78bfa', soft: 'rgba(167, 139, 250, 0.16)',
    desc: 'Letra, colores y espejo',
    keys: ['fontSize', 'lineHeight', 'width', 'textOffset', 'guidePos', 'align', 'fontFamily', 'uppercase', 'textShadow', 'textColor', 'bgColor', 'mirrorH', 'mirrorV'],
  },
  {
    id: 'karaoke', label: 'Karaoke', icon: Sparkles, color: '#e879f9', soft: 'rgba(232, 121, 249, 0.16)',
    desc: 'Resalta lo que estás leyendo',
    keys: ['karaokeOn', 'karaokeUnit', 'karaokeStyle', 'karaokeColor', 'karaokeText', 'karaokeRead', 'karaokeReadColor'],
  },
  {
    id: 'voz', label: 'Voz', icon: Mic, color: '#4ade80', soft: 'rgba(74, 222, 128, 0.16)',
    desc: 'Que el texto te siga al hablar',
    keys: ['voiceMode', 'voiceSensitivity', 'voicePace', 'voicePaceFactor', 'voiceFollowSpeed', 'voiceLookahead', 'voiceAlign', 'voiceLang', 'voiceUseTrack', 'voiceFollowWhileRecording'],
  },
  {
    id: 'camara', label: 'Cámara', icon: Camera, color: '#fb923c', soft: 'rgba(251, 146, 60, 0.16)',
    desc: 'Imagen de fondo y encuadre',
    keys: ['cameraOn', 'cameraSource', 'resolution', 'fps', 'cameraMirror', 'cameraFit', 'cameraDim'],
  },
  {
    id: 'audio', label: 'Audio', icon: AudioLines, color: '#f472b6', soft: 'rgba(244, 114, 182, 0.16)',
    desc: 'Micrófono, volumen y limpieza',
    keys: ['micId', 'micGain', 'micCompressor', 'autoGainControl', 'noiseSuppression', 'echoCancellation', 'showMicMeter', 'audioSampleRate', 'audioChannels'],
  },
  {
    id: 'grabacion', label: 'Grabar', icon: Circle, color: '#f87171', soft: 'rgba(248, 113, 113, 0.16)',
    desc: 'Calidad, copias y rendimiento',
    keys: ['videoBitrate', 'audioBitrate', 'wavRecord', 'wavBitDepth', 'backupRecordings', 'liteWhileRecording'],
  },
  {
    id: 'interfaz', label: 'Interfaz', icon: SlidersHorizontal, color: '#fbbf24', soft: 'rgba(251, 191, 36, 0.16)',
    desc: 'Barra de herramientas, avisos y atajos',
    keys: ['controlsPinned', 'controlsHideDelay', 'tapWakesControls', 'hideNotices'],
  },
];

function Group({ def, active, onReset, children }) {
  const { q } = useContext(PanelCtx);
  if (!q && !active) return null;
  const Icon = def.icon;
  return (
    <section className="tp-group" data-g={def.id} style={{ '--g': def.color, '--g-soft': def.soft }}>
      <header className="tp-group-head">
        <span className="tp-group-icon"><Icon size={18} /></span>
        <div>
          <h3>{def.label}</h3>
          <p>{def.desc}</p>
        </div>
        {!q && onReset && (
          <button type="button" className="tp-reset" onClick={onReset} title="Volver a los valores de fábrica de este grupo">
            <RotateCcw size={14} /> Restablecer
          </button>
        )}
      </header>
      <div className="tp-group-body">{children}</div>
    </section>
  );
}

function LecturaGroup({ settings, update }) {
  return (
    <>
      <Range label="Velocidad" keywords="rapidez desplazamiento scroll" value={settings.speed} min={1} max={40} onChange={v => update({ speed: v })} />
      <Range
        label="Cuenta atrás"
        value={settings.countdown}
        min={0}
        max={10}
        format={v => (v ? `${v} s` : 'No')}
        onChange={v => update({ countdown: v })}
      />
      <Toggle
        label="Cuenta atrás también al reanudar"
        checked={settings.countdownOnResume}
        disabled={!settings.countdown}
        onChange={v => update({ countdownOnResume: v })}
      />
      <Subtitle>Guía de lectura</Subtitle>
      <Segmented
        label="Estilo de la guía"
        keywords="franja flechas línea"
        value={settings.guideStyle}
        onChange={v => update({ guideStyle: v })}
        options={[{ value: 'none', label: 'Ninguna' }, { value: 'line', label: 'Flechas' }, { value: 'band', label: 'Franja' }]}
      />
      <Range
        label="Altura de la guía"
        value={settings.guidePos}
        min={10}
        max={80}
        format={v => `${v} %`}
        onChange={v => update({ guidePos: v })}
      />
      <Toggle label="Atenuar el texto ya leído" keywords="degradado" checked={settings.fadeRead} onChange={v => update({ fadeRead: v })} />
      <Subtitle>Marcadores</Subtitle>
      <Toggle label="Pausar en los marcadores [PAUSA]" checked={settings.pauseOnMarkers} onChange={v => update({ pauseOnMarkers: v })} />
      <Help title="Cómo usar marcadores">
        Escribe notas de dirección en mayúsculas entre corchetes, por ejemplo [PAUSA], [MIRA A CÁMARA] o [B-ROLL]. Se ven
        como etiquetas de color, no se leen, y [PAUSA] detiene el texto hasta que lo reanudes.
      </Help>
      <Help title="Sobre la cuenta atrás">
        Siempre hay cuenta atrás al empezar desde el principio y al pulsar grabar. Al reanudar tras una pausa solo si activas
        la opción de arriba.
      </Help>
    </>
  );
}

function TextoGroup({ settings, update }) {
  return (
    <>
      <Range label="Tamaño de letra" keywords="fuente" value={settings.fontSize} min={18} max={160} format={v => `${v} px`} onChange={v => update({ fontSize: v })} />
      <Range label="Interlineado" value={settings.lineHeight} min={1} max={2.2} step={0.05} format={v => v.toFixed(2)} onChange={v => update({ lineHeight: v })} />
      <Range label="Ancho de columna" keywords="márgenes ajuste de línea" value={settings.width} min={10} max={100} format={v => `${v} %`} onChange={v => update({ width: v })} />
      <Range
        label="Posición horizontal del bloque"
        keywords="mover izquierda derecha centrar desplazar columna"
        value={settings.textOffset}
        min={-100}
        max={100}
        step={1}
        format={v => (settings.width >= 98 ? 'reduce el ancho para moverlo' : v === 0 ? 'centrado' : `${Math.abs(v)} % a la ${v < 0 ? 'izquierda' : 'derecha'}`)}
        onChange={v => update({ textOffset: v })}
      />
      <Row label="Mover el bloque de texto a la izquierda, centrar o a la derecha" keywords="centrar izquierda derecha desplazar">
        <div className="tp-nudge">
          <button type="button" className="tp-btn" onClick={() => update({ textOffset: Math.max(-100, settings.textOffset - 10) })} aria-label="Mover a la izquierda">◀ Izquierda</button>
          <button type="button" className={`tp-btn${settings.textOffset === 0 ? ' is-on' : ''}`} onClick={() => update({ textOffset: 0 })}>Centrar</button>
          <button type="button" className="tp-btn" onClick={() => update({ textOffset: Math.min(100, settings.textOffset + 10) })} aria-label="Mover a la derecha">Derecha ▶</button>
        </div>
      </Row>
      <Range
        label="Altura de la guía"
        keywords="guía de lectura posición vertical"
        value={settings.guidePos}
        min={10}
        max={80}
        format={v => `${v} %`}
        onChange={v => update({ guidePos: v })}
      />
      <Segmented
        label="Alineación"
        value={settings.align}
        onChange={v => update({ align: v })}
        options={[{ value: 'left', label: 'Izquierda' }, { value: 'center', label: 'Centro' }]}
      />
      <Segmented
        label="Tipografía"
        keywords="fuente letra serif"
        value={settings.fontFamily}
        onChange={v => update({ fontFamily: v })}
        options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]}
      />
      <Toggle label="Mayúsculas" checked={settings.uppercase} onChange={v => update({ uppercase: v })} />
      <Toggle label="Sombra del texto" checked={settings.textShadow} onChange={v => update({ textShadow: v })} />
      <Row label="Colores del texto y del fondo" keywords="color">
        <div className="tp-colors">
          <label>
            Texto
            <input type="color" value={settings.textColor} onChange={e => update({ textColor: e.target.value })} />
          </label>
          <label>
            Fondo
            <input type="color" value={settings.bgColor} onChange={e => update({ bgColor: e.target.value })} />
          </label>
        </div>
      </Row>
      <Subtitle>Espejo</Subtitle>
      <Toggle label="Espejo horizontal" checked={settings.mirrorH} onChange={v => update({ mirrorH: v })} />
      <Toggle label="Espejo vertical" checked={settings.mirrorV} onChange={v => update({ mirrorV: v })} />
      <Help title="Para qué sirve el espejo">Para cristales de teleprompter, que reflejan el texto al revés.</Help>
    </>
  );
}

// Vista previa del estilo elegido (con spans; en la lectura real se usa la API de resaltado del navegador)
function KaraokePreview({ settings }) {
  const v = karaokeVars(settings);
  const unit = settings.karaokeUnit;
  const words = ['Hoy', 'vamos', 'a', 'montar', 'una', 'impresora', 'desde', 'cero'];
  const current = unit === 'palabra' ? [3] : unit === 'linea' ? [3, 4, 5, 6] : [3, 4, 5, 6, 7];
  const readUpTo = current[0];
  return (
    <div className="tp-kpreview" style={{ color: settings.textColor, background: settings.bgColor }}>
      {words.map((w, i) => {
        const isCur = current.includes(i);
        const isRead = settings.karaokeRead !== 'none' && i < readUpTo;
        const style = isCur
          ? { color: v['--kc'], background: v['--kb'], textDecoration: v['--kd'] === 'none' ? 'none' : 'underline', textDecorationColor: settings.karaokeColor, textShadow: v['--kts'] }
          : isRead
            ? { color: v['--kr'] }
            : {};
        return (
          <span key={i} style={style}>
            {w}{' '}
          </span>
        );
      })}
    </div>
  );
}

function KaraokeGroup({ settings, update }) {
  return (
    <>
      <Toggle label="Activar el modo karaoke" keywords="resaltar palabra" checked={settings.karaokeOn} onChange={v => update({ karaokeOn: v })} />
      <Row label="Vista previa del karaoke">
        <KaraokePreview settings={settings} />
      </Row>
      <Segmented label="Qué resaltar" keywords="palabra línea frase" value={settings.karaokeUnit} onChange={v => update({ karaokeUnit: v })} options={KARAOKE_UNITS} />
      <Segmented label="Estilo del resaltado" keywords="marcador color subrayado neón" value={settings.karaokeStyle} onChange={v => update({ karaokeStyle: v })} options={KARAOKE_STYLES} />
      <Row label="Colores del resaltado" keywords="color fondo">
        <div className="tp-colors">
          <label>
            {settings.karaokeStyle === 'marcador' ? 'Marcador' : 'Resalte'}
            <input type="color" value={settings.karaokeColor} onChange={e => update({ karaokeColor: e.target.value })} />
          </label>
          {settings.karaokeStyle === 'marcador' && (
            <label>
              Letra
              <input type="color" value={settings.karaokeText} onChange={e => update({ karaokeText: e.target.value })} />
            </label>
          )}
        </div>
      </Row>
      <Subtitle>Lo que ya has leído</Subtitle>
      <Segmented
        label="Palabras ya leídas"
        value={settings.karaokeRead}
        onChange={v => update({ karaokeRead: v })}
        options={[{ value: 'none', label: 'Igual' }, { value: 'dim', label: 'Atenuadas' }, { value: 'color', label: 'De color' }]}
      />
      {settings.karaokeRead === 'color' && (
        <Row label="Color de las palabras leídas" keywords="color">
          <div className="tp-colors">
            <label>
              Leídas
              <input type="color" value={settings.karaokeReadColor} onChange={e => update({ karaokeReadColor: e.target.value })} />
            </label>
          </div>
        </Row>
      )}
      <Help title="Cómo sabe dónde vas">
        Con «Sigue mi voz» se resalta la última palabra que reconoce tu voz. En los demás modos, dentro de cada línea el
        resaltado avanza de izquierda a derecha a medida que la línea pasa por la guía, al ritmo del desplazamiento. «Línea» y
        «Frase» resaltan todo el tramo a la vez.
      </Help>
    </>
  );
}

function VozGroup({ settings, update }) {
  const follow = settings.voiceMode === 'follow';
  return (
    <>
      <Segmented
        label="Control por voz"
        keywords="seguir hablar reconocimiento"
        value={settings.voiceMode}
        onChange={v => update({ voiceMode: v, ...(v !== 'off' ? { voiceLast: v } : {}) })}
        options={[
          { value: 'off', label: 'No' },
          { value: 'talk', label: 'Avanza si hablo' },
          { value: 'follow', label: 'Sigue mi voz' },
        ]}
      />
      <Help title="Qué hace cada modo">
        <strong>Avanza si hablo:</strong> el texto avanza a tu ritmo mientras hablas y se detiene cuando callas. Funciona en
        cualquier navegador y no envía nada.
        <br />
        <strong>Sigue mi voz:</strong> escucha lo que lees y pone el texto en la palabra en la que vas; si te saltas una frase,
        te sigue. Usa el reconocimiento de voz del navegador (en Chrome lo procesa Google). En iPhone, para usarlo grabando hace
        falta la opción experimental de «Avanzado».
      </Help>
      <Row label="Probar el reconocimiento de voz" keywords="diagnóstico prueba dictado">
        <VoiceTest update={update} />
      </Row>
      {settings.voiceMode !== 'off' && (
        <>
          <Range
            label="Sensibilidad al hablar"
            value={settings.voiceSensitivity}
            min={4}
            max={24}
            format={v => `${v} dB sobre el ruido`}
            onChange={v => update({ voiceSensitivity: v })}
          />
          <Toggle label="Adaptar la velocidad a mi ritmo al hablar" checked={settings.voicePace} onChange={v => update({ voicePace: v })} />
          {settings.voicePace && (
            <Range
              label="Ajuste de ritmo"
              value={settings.voicePaceFactor}
              min={0.5}
              max={1.6}
              step={0.05}
              format={v => `${Math.round(v * 100)} %`}
              onChange={v => update({ voicePaceFactor: v })}
            />
          )}
          <Help title="Cómo se mide tu ritmo">
            En «Avanza si hablo» la app cuenta tus sílabas por segundo y las pasa a palabras por minuto (aproximado, se ve en
            la barra). Si va más lento o más rápido que tú, sube o baja el «ajuste de ritmo». Funciona mientras grabas.
          </Help>
        </>
      )}
      {follow && (
        <>
          <Subtitle>Seguimiento</Subtitle>
          <Select
            label="Velocidad de seguimiento"
            value={String(settings.voiceFollowSpeed)}
            onChange={v => update({ voiceFollowSpeed: Number(v) })}
            options={[
              { value: '4', label: 'Suave' },
              { value: '8', label: 'Rápida' },
              { value: '14', label: 'Muy rápida (leo deprisa)' },
            ]}
          />
          <Range
            label="Adelanto (+) o retraso (−)"
            value={settings.voiceLookahead}
            min={-10}
            max={10}
            format={v => (v === 0 ? 'justo en tu palabra' : v > 0 ? `${v} palabras por delante` : `${-v} palabras por detrás`)}
            onChange={v => update({ voiceLookahead: v })}
          />
          <Segmented
            label="Dónde colocar el texto"
            value={settings.voiceAlign}
            onChange={v => update({ voiceAlign: v })}
            options={[{ value: 'linea', label: 'Línea de mi palabra' }, { value: 'frase', label: 'Inicio de la frase' }]}
          />
          <Select
            label="Idioma del reconocimiento"
            value={settings.voiceLang}
            onChange={v => update({ voiceLang: v })}
            options={[
              { value: 'es-ES', label: 'Español (España)' },
              { value: 'es-MX', label: 'Español (México)' },
              { value: 'es-US', label: 'Español (EE. UU.)' },
              { value: 'en-US', label: 'English (US)' },
              { value: 'en-GB', label: 'English (UK)' },
              { value: 'ca-ES', label: 'Català' },
              { value: 'fr-FR', label: 'Français' },
            ]}
          />
          <Help title="Ajustar el retraso">
            El reconocimiento tarda una fracción de segundo en entender lo que dices. El «adelanto» compensa ese retraso
            poniendo en la guía unas palabras por delante de donde vas. Si lees deprisa, sube el adelanto y usa «Muy rápida».
            «Inicio de la frase» mueve el texto de frase en frase, con menos saltos.
          </Help>
          <Advanced title="Avanzado y experimental">
            <Toggle
              label="Dar al reconocimiento la pista del micrófono"
              badge="Experimental"
              checked={settings.voiceUseTrack}
              onChange={v => update({ voiceUseTrack: v })}
            />
            <Toggle
              label="Intentar «Sigue mi voz» también al grabar"
              badge="Experimental"
              checked={settings.voiceFollowWhileRecording}
              onChange={v => update({ voiceFollowWhileRecording: v })}
            />
          </Advanced>
        </>
      )}
    </>
  );
}

function NeedsReading({ what }) {
  return (
    <Row label={what}>
      <p className="tp-hint">Estos ajustes se muestran en la pantalla de lectura, con la cámara disponible.</p>
    </Row>
  );
}

function CamaraGroup({ settings, update, camera, recording }) {
  if (camera === undefined) return <NeedsReading what="Cámara" />;
  if (camera === null) {
    return (
      <Row label="Cámara no disponible">
        <p className="tp-error">
          Este navegador no da acceso a la cámara ni al micrófono a las webs{isChromeIOS() ? ' (Chrome en iPhone lo limita)' : ''}. Abre
          capacero3d.com/tp en Safari para grabar. {permissionHelp()}
        </p>
      </Row>
    );
  }
  return <CamaraBody settings={settings} update={update} camera={camera} recording={recording} />;
}

function CamaraBody({ settings, update, camera, recording }) {
  const { stream, devices, error } = camera;
  const videoTrack = stream?.getVideoTracks()[0];
  const trackSettings = videoTrack?.getSettings?.() || {};
  const caps = videoTrack?.getCapabilities?.() || {};
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    setZoom(videoTrack?.getSettings?.().zoom ?? null);
  }, [videoTrack]);

  const applyZoom = v => {
    setZoom(v);
    videoTrack?.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
  };

  const cameraOptions = [
    { value: 'user', label: 'Frontal' },
    { value: 'environment', label: 'Trasera' },
    ...devices.video.map((d, i) => ({ value: d.deviceId, label: d.label || `Cámara ${i + 1}` })),
  ];

  return (
    <>
      <Row label="Dar permisos de cámara y micrófono" keywords="permiso acceso">
        <PermissionsHelper />
      </Row>
      <Toggle label="Cámara de fondo" keywords="activar encender" checked={settings.cameraOn} disabled={recording} onChange={v => update({ cameraOn: v })} />
      {error && <Row label="Error de cámara"><p className="tp-error">{error}</p></Row>}
      {!settings.cameraOn && (
        <Row label="Enciende la cámara">
          <p className="tp-hint">Enciende la cámara de fondo para elegir cámara, resolución y encuadre.</p>
        </Row>
      )}
      {settings.cameraOn && (
        <>
          <Select label="Cámara" keywords="frontal trasera lente" value={settings.cameraSource} disabled={recording} options={cameraOptions} onChange={v => update({ cameraSource: v })} />
          <Segmented
            label="Resolución"
            keywords="720 1080 4k calidad"
            value={settings.resolution}
            onChange={v => !recording && update({ resolution: v })}
            options={Object.entries(RESOLUTIONS).map(([value, r]) => ({ value, label: r.label }))}
          />
          <Segmented
            label="Fotogramas por segundo"
            keywords="fps"
            value={settings.fps}
            onChange={v => !recording && update({ fps: v })}
            options={[{ value: 24, label: '24' }, { value: 30, label: '30' }, { value: 60, label: '60' }]}
          />
          {caps.zoom && zoom != null && (
            <Range
              label="Zoom"
              value={zoom}
              min={caps.zoom.min}
              max={caps.zoom.max}
              step={caps.zoom.step || 0.1}
              format={v => `${Number(v).toFixed(1)}×`}
              onChange={applyZoom}
            />
          )}
          {videoTrack && (
            <Row label="En uso cámara">
              <p className="tp-hint">
                En uso: {videoTrack.label || 'cámara'}
                {trackSettings.width ? ` · ${trackSettings.width}×${trackSettings.height}` : ''}
                {trackSettings.frameRate ? ` · ${Math.round(trackSettings.frameRate)} fps` : ''}
              </p>
            </Row>
          )}
          <Subtitle>Imagen en pantalla</Subtitle>
          <Toggle label="Ver la cámara en espejo" checked={settings.cameraMirror} onChange={v => update({ cameraMirror: v })} />
          <Segmented
            label="Vista de la cámara"
            keywords="encuadre recorte"
            value={settings.cameraFit}
            onChange={v => update({ cameraFit: v })}
            options={[{ value: 'cover', label: 'Llenar pantalla' }, { value: 'contain', label: 'Imagen completa' }]}
          />
          <Range
            label="Oscurecer la imagen"
            value={settings.cameraDim}
            min={0}
            max={0.9}
            step={0.05}
            format={v => `${Math.round(v * 100)} %`}
            onChange={v => update({ cameraDim: v })}
          />
          <Help title="Llenar pantalla o imagen completa">
            «Llenar pantalla» recorta los bordes de la imagen para cubrir la pantalla. «Imagen completa» muestra el encuadre
            entero que se graba, con franjas negras si hace falta.
          </Help>
        </>
      )}
    </>
  );
}

function AudioGroup({ settings, update, camera, recording }) {
  if (camera === undefined) return <NeedsReading what="Audio" />;
  if (camera === null) {
    return (
      <Row label="Audio no disponible">
        <p className="tp-error">Este navegador no da acceso al micrófono. Abre capacero3d.com/tp en Safari.</p>
      </Row>
    );
  }
  const { stream, devices } = camera;
  const audioTrack = camera.micTrack || stream?.getAudioTracks()[0];
  const audioSettings = audioTrack?.getSettings?.() || {};
  const micOptions = [
    { value: 'default', label: 'Predeterminado del sistema' },
    ...devices.audio
      .filter(d => d.deviceId !== 'default')
      .map((d, i) => ({ value: d.deviceId, label: d.label || `Micrófono ${i + 1}` })),
  ];

  return (
    <>
      <Select label="Micrófono" keywords="entrada bluetooth usb" value={settings.micId} disabled={recording} options={micOptions} onChange={v => update({ micId: v })} />
      <Row label="Nivel del micrófono medidor">
        {stream && audioTrack ? (
          <>
            <MicMeter stream={stream} />
            <p className="tp-hint">
              En uso: {audioTrack.label || 'micrófono'}
              {audioSettings.sampleRate ? ` · ${(audioSettings.sampleRate / 1000).toFixed(1)} kHz` : ''}
              {audioSettings.channelCount ? ` · ${audioSettings.channelCount === 2 ? 'estéreo' : 'mono'}` : ''}. La barra debe llegar a la zona
              amarilla al hablar, sin tocar el rojo.
            </p>
          </>
        ) : stream ? (
          <p className="tp-error">No llega audio. Comprueba el permiso del micrófono de esta web y vuelve a encender la cámara.</p>
        ) : (
          <p className="tp-hint">Enciende la cámara (grupo Cámara) para ver el nivel del micrófono.</p>
        )}
      </Row>

      <Subtitle>Volumen</Subtitle>
      <Range
        label="Ganancia de entrada"
        keywords="volumen subir bajito"
        value={settings.micGain}
        min={0}
        max={24}
        step={1}
        format={v => (v === 0 ? 'Sin ganancia' : `+${v} dB`)}
        onChange={v => update({ micGain: v })}
      />
      <Row label="Ajustar ganancia con mi voz" keywords="automático medir">
        <AutoGain micTrack={camera.micTrack} update={update} disabled={recording} />
      </Row>
      <Toggle
        label="Compresor de voz suave"
        keywords="volumen uniforme"
        checked={settings.micCompressor}
        disabled={recording}
        onChange={v => update({ micCompressor: v })}
      />
      <Row label="Estado de la ganancia">
        <GainState active={settings.micGain > 0 || settings.micCompressor} />
      </Row>

      <Subtitle>Procesado del iPhone</Subtitle>
      <Toggle label="Control automático de ganancia" checked={settings.autoGainControl} disabled={recording} onChange={v => update({ autoGainControl: v })} />
      <Toggle label="Reducción de ruido" checked={settings.noiseSuppression} disabled={recording} onChange={v => update({ noiseSuppression: v })} />
      <Toggle label="Cancelación de eco" checked={settings.echoCancellation} disabled={recording} onChange={v => update({ echoCancellation: v })} />
      <Help title="Cuándo activarlos">
        Con un micro externo suele sonar mejor con todo apagado. En iPhone, solo la cancelación de eco parece tener efecto real:
        activa el procesado de voz de Apple, que sube el volumen pero deja pasar el ruido. Si la voz se graba baja, sube la
        ganancia de entrada. La ganancia por software puede dejar el vídeo mudo en algunos iPhone: si pasa, ponla en 0.
      </Help>

      <Row label="Probar micrófono con 5 combinaciones" keywords="prueba diagnóstico tabla">
        <MicTest settings={settings} update={update} recording={recording} />
      </Row>

      <Advanced>
        <Select
          label="Frecuencia de muestreo (Hz)"
          value={String(settings.audioSampleRate)}
          disabled={recording}
          onChange={v => update({ audioSampleRate: Number(v) })}
          options={[
            { value: '0', label: 'Automática del micrófono' },
            { value: '44100', label: '44.100 Hz' },
            { value: '48000', label: '48.000 Hz · estándar de vídeo' },
          ]}
        />
        <Select
          label="Canales"
          value={String(settings.audioChannels)}
          disabled={recording}
          onChange={v => update({ audioChannels: Number(v) })}
          options={[
            { value: '0', label: 'Automático' },
            { value: '1', label: 'Mono' },
            { value: '2', label: 'Estéreo' },
          ]}
        />
        <Toggle label="Mostrar el nivel del micrófono en pantalla" checked={settings.showMicMeter} onChange={v => update({ showMicMeter: v })} />
      </Advanced>
    </>
  );
}

function GrabacionGroup({ settings, update, camera, recording }) {
  const autoMbps = (RESOLUTIONS[settings.resolution] || RESOLUTIONS['1080']).bitrate / 1_000_000;
  const mbps = settings.videoBitrate > 0 ? settings.videoBitrate : autoMbps;
  const sizePerMin = Math.round(((mbps * 1_000_000 + settings.audioBitrate * 1000) * 60) / 8 / 1_048_576);
  const audioSettings = camera?.micTrack?.getSettings?.() || {};
  const wavPerMin = Math.round(
    ((audioSettings.sampleRate || 48000) * (audioSettings.channelCount === 2 ? 2 : 1) * (settings.wavBitDepth / 8) * 60) / 1_048_576
  );
  return (
    <>
      <Select
        label="Calidad de vídeo (bitrate)"
        keywords="mbps"
        value={String(settings.videoBitrate)}
        disabled={recording}
        onChange={v => update({ videoBitrate: Number(v) })}
        options={[
          { value: '0', label: `Automático · ${autoMbps} Mbps` },
          ...VIDEO_LEVELS.map(m => ({ value: String(m), label: `${m} Mbps · ${videoLevelName(m)}` })),
        ]}
      />
      <Select
        label="Audio del vídeo (AAC)"
        keywords="kbps"
        value={String(settings.audioBitrate)}
        disabled={recording}
        onChange={v => update({ audioBitrate: Number(v) })}
        options={[64, 96, 128, 160, 192, 256, 320].map(k => ({
          value: String(k),
          label: `${k} kbps${k === 320 ? ' · máximo' : k === 128 ? ' · normal' : ''}`,
        }))}
      />
      <Row label="Tamaño aproximado por minuto">
        <p className="tp-hint">
          Tamaño aproximado del vídeo: <strong>{sizePerMin} MB por minuto</strong>
          {settings.wavRecord && <> más {wavPerMin} MB por minuto del WAV</>}.
        </p>
      </Row>
      <Subtitle>Audio sin comprimir</Subtitle>
      <Toggle label="Grabar también audio sin comprimir (WAV)" keywords="wav calidad máxima" checked={settings.wavRecord} disabled={recording} onChange={v => update({ wavRecord: v })} />
      {settings.wavRecord && (
        <Select
          label="Profundidad de bits del WAV"
          value={String(settings.wavBitDepth)}
          disabled={recording}
          onChange={v => update({ wavBitDepth: Number(v) })}
          options={[
            { value: '16', label: '16 bits (calidad CD)' },
            { value: '24', label: '24 bits (profesional)' },
            { value: '32', label: '32 bits flotante (máxima)' },
          ]}
        />
      )}
      <Help title="Sobre el WAV">
        El audio del vídeo siempre va comprimido (AAC). Para conservar la calidad de tu micro, activa el WAV: se guarda aparte y
        lo sincronizas en tu editor. Se guarda en la memoria del dispositivo hasta que lo descargues: en grabaciones largas,
        mejor 16 o 24 bits. Si en tu iPhone el vídeo se graba sin sonido, desactiva el WAV.
      </Help>
      <Subtitle>Seguridad y rendimiento</Subtitle>
      <Toggle label="Guardar copia de la grabación en este dispositivo" keywords="copia seguridad recuperar" checked={settings.backupRecordings} onChange={v => update({ backupRecordings: v })} />
      <Toggle label="Modo ligero al grabar (menos efectos)" keywords="rendimiento congela" checked={settings.liteWhileRecording} disabled={recording} onChange={v => update({ liteWhileRecording: v })} />
      <Help title="Qué hacen estas dos opciones">
        La copia evita perder el vídeo si la página se recarga al guardarlo: queda solo en este navegador hasta que pulses
        «Descartar» o la borres en «Grabaciones». El modo ligero quita el degradado del texto leído, las sombras grandes y los
        desenfoques mientras grabas, para que el vídeo no se congele. Si grabas en 4K o a 60 fps, déjalo activado.
      </Help>
      {camera && (
        <Row label="Registro de la última grabación diagnóstico">
          <LastLog />
        </Row>
      )}
    </>
  );
}

function InterfazGroup({ settings, update }) {
  return (
    <>
      <Subtitle>Barra de herramientas</Subtitle>
      <Toggle label="Fijar la barra (no se oculta)" keywords="chincheta" checked={settings.controlsPinned} onChange={v => update({ controlsPinned: v })} />
      <Range
        label="Ocultar la barra tras"
        value={settings.controlsHideDelay}
        min={1}
        max={15}
        format={v => `${v} s`}
        onChange={v => update({ controlsHideDelay: v })}
      />
      <Toggle
        label="Con la barra oculta, el primer toque solo la muestra"
        keywords="doble toque pausa"
        checked={settings.tapWakesControls}
        onChange={v => update({ tapWakesControls: v })}
      />
      <Subtitle>Avisos</Subtitle>
      <Toggle label="Ocultar avisos mientras leo o grabo" keywords="notificaciones cookies" checked={settings.hideNotices} onChange={v => update({ hideNotices: v })} />
      <Help title="Notificaciones del iPhone">
        Oculta los avisos de la app y el banner de cookies de la web en la pantalla de lectura. Las notificaciones del iPhone (de
        otras apps o de esta web) no las controla la web: usa «No molestar» o un Foco.
      </Help>
      <Subtitle>Atajos</Subtitle>
      <Row label="Atajos de teclado pedal mando" keywords="teclas bluetooth">
        <p className="tp-hint">Los pedales y mandos Bluetooth de fotos o presentaciones envían estas teclas:</p>
        <table className="tp-mic-table">
          <tbody>
            <tr><td>Espacio · Intro · K</td><td>Reproducir / pausar</td></tr>
            <tr><td>↓ → / ↑ ←</td><td>Más rápido / más lento</td></tr>
            <tr><td>AvPág / RePág</td><td>Sección siguiente / anterior</td></tr>
            <tr><td>Inicio</td><td>Volver al principio</td></tr>
            <tr><td>+ / −</td><td>Letra más grande / pequeña</td></tr>
            <tr><td>M</td><td>Espejo horizontal</td></tr>
            <tr><td>Esc</td><td>Cerrar panel o salir</td></tr>
          </tbody>
        </table>
      </Row>
    </>
  );
}

// El grupo abierto y la posición de desplazamiento se recuerdan entre aperturas del panel
let savedTab = 'lectura';
let savedScroll = 0;

export default function SettingsPanel({ settings, update, onClose, camera, recording }) {
  const bodyRef = useRef(null);
  const panelRef = useRef(null);
  const restoringUntil = useRef(0);
  const [tab, setTabState] = useState(savedTab);
  const [query, setQuery] = useState('');
  const [noResults, setNoResults] = useState(false);
  const [view, setView] = useState('groups');
  const q = norm(query.trim());

  const setTab = id => {
    savedTab = id;
    savedScroll = 0;
    setTabState(id);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    // El contenido (cámara, micrófono) termina de cargar un instante después: se reaplica unos 800 ms
    restoringUntil.current = Date.now() + 800;
    el.scrollTop = savedScroll;
    const id = setInterval(() => {
      if (Date.now() > restoringUntil.current) clearInterval(id);
      else if (Math.abs(el.scrollTop - savedScroll) > 1) el.scrollTop = savedScroll;
    }, 40);
    return () => clearInterval(id);
  }, []);

  // Con búsqueda activa se ocultan los grupos sin resultados
  useLayoutEffect(() => {
    const root = panelRef.current;
    if (!root) return;
    let any = false;
    root.querySelectorAll('.tp-group').forEach(g => {
      const has = !q || !!g.querySelector('.tp-field, .tp-toggle, .tp-row');
      g.toggleAttribute('data-empty', !has);
      if (has) any = true;
    });
    setNoResults(!!q && !any);
  }, [q, settings, camera]);

  const reset = def => {
    if (!window.confirm(`¿Restablecer los ajustes del grupo «${def.label}» a sus valores de fábrica?`)) return;
    const values = {};
    def.keys.forEach(k => {
      values[k] = DEFAULT_SETTINGS[k];
    });
    update(values);
  };

  const common = { settings, update, camera, recording };
  const bodies = {
    lectura: <LecturaGroup {...common} />,
    texto: <TextoGroup {...common} />,
    karaoke: <KaraokeGroup {...common} />,
    voz: <VozGroup {...common} />,
    camara: <CamaraGroup {...common} />,
    audio: <AudioGroup {...common} />,
    grabacion: <GrabacionGroup {...common} />,
    interfaz: <InterfazGroup {...common} />,
  };

  return (
    <aside className="tp-panel" aria-label="Ajustes del teleprompter" ref={panelRef}>
      <header className="tp-panel-header">
        <h2>{view === 'presets' ? 'Presets' : 'Ajustes'}</h2>
        <div className="tp-header-actions">
          {view === 'groups' && (
            <button type="button" className="tp-preset-btn" onClick={() => setView('presets')} aria-label="Presets de ajustes" title="Guardar y aplicar presets de ajustes">
              <Bookmark size={16} /> Presets
            </button>
          )}
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar ajustes">
            <X size={20} />
          </button>
        </div>
      </header>

      {view === 'presets' ? (
        <div className="tp-panel-body">
          <PresetsView groups={GROUPS} settings={settings} update={update} recording={recording} onBack={() => setView('groups')} />
        </div>
      ) : (
      <>

      <div className="tp-panel-nav">
        <label className="tp-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar un ajuste…"
            aria-label="Buscar un ajuste"
          />
          {query && (
            <button type="button" className="tp-search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
              <X size={14} />
            </button>
          )}
        </label>
        <div className={`tp-tabs${q ? ' is-dim' : ''}`} role="tablist" aria-label="Grupos de ajustes">
          {GROUPS.map(g => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={!q && tab === g.id}
                className={`tp-tab${!q && tab === g.id ? ' is-active' : ''}`}
                style={{ '--g': g.color, '--g-soft': g.soft }}
                onClick={() => {
                  setQuery('');
                  setTab(g.id);
                }}
              >
                <Icon size={18} />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="tp-panel-body"
        ref={bodyRef}
        onScroll={e => {
          if (Date.now() > restoringUntil.current) savedScroll = e.currentTarget.scrollTop;
        }}
      >
        <PanelCtx.Provider value={{ q }}>
          {q && <p className="tp-results-title">Resultados para «{query.trim()}»</p>}
          {GROUPS.map(g => (
            <Group key={g.id} def={g} active={tab === g.id} onReset={() => reset(g)}>
              {bodies[g.id]}
            </Group>
          ))}
          {noResults && <p className="tp-hint" style={{ padding: 16 }}>No hay ningún ajuste con ese nombre.</p>}
        </PanelCtx.Provider>
      </div>
      </>
      )}
    </aside>
  );
}
