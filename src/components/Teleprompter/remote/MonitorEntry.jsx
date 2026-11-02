import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Play, Pause, RotateCcw, ChevronUp, ChevronDown, Minus, Plus, Circle, Square, Settings2, Maximize, Minimize, MonitorSmartphone, Flashlight, FlashlightOff, ZoomIn,
} from 'lucide-react';
import ScriptView from '../ScriptView';
import SettingsPanel from '../SettingsPanel';
import { startMonitor } from './rtc';
import { buildContentIndex } from '../domIndex';
import { createKaraoke, karaokeVars } from '../karaoke';
import { DEFAULT_SETTINGS, loadJSON, saveJSON } from '../storage';
import '../teleprompter.css';

const KEY = 'capacero_tp_monitor_settings';
const FONT_STACKS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};
const ROOM_KEY = 'capacero_tp_monitor_room';
const ROOM_KEY_OBS = 'capacero_tp_monitor_obs_room';
const QUALITY_LABELS = { baja: 'Baja (480p)', media: 'Media (720p)', alta: 'Alta (1080p)', maxima: 'Máxima (original)' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Ajustes propios del monitor (se guardan en este PC): el tamaño de pantalla es otro que el del móvil
function loadMonitorSettings(clean = false) {
  const saved = loadJSON(KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    fontSize: 64,
    width: 70,
    align: 'center',
    cameraMirror: true,
    cameraDim: 0.35,
    cameraZoom: 1,
    monitorQuality: clean ? 'alta' : 'media',
    ...(saved && typeof saved === 'object' ? saved : {}),
    // El monitor siempre enseña la imagen completa de la cámara del móvil
    cameraFit: 'contain',
    // En OBS la imagen sale como se graba, sin espejo
    ...(clean ? { cameraMirror: false, cameraZoom: 1 } : {}),
  };
}

// Posición del texto para una palabra con coordenada fraccionaria: dentro de cada línea avanza de forma continua
function posFromWordCoord(index, w, lh) {
  const lines = index?.lines;
  if (!lines || !lines.length) return 0;
  const i = clamp(Math.floor(w), 0, index.words.length - 1);
  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].start <= i) lo = mid;
    else hi = mid - 1;
  }
  const line = lines[lo];
  const len = line.end - line.start + 1;
  const x = clamp((w - line.start) / len, 0, 0.999);
  return line.top + (x - 0.5) * lh;
}

function useMonitorHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Monitor · Teleprompter Capa Cero 3D';
    let robots = document.head.querySelector('meta[name="robots"]');
    const prevRobots = robots?.getAttribute('content');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');
    document.documentElement.classList.add('tp-active');
    document.body.classList.add('tp-active');
    return () => {
      document.title = prevTitle;
      if (prevRobots != null) robots.setAttribute('content', prevRobots);
      document.documentElement.classList.remove('tp-active');
      document.body.classList.remove('tp-active');
    };
  }, []);
}

// Imagen de la cámara del móvil en su caja (cubrir/contener y zoom), compartida por el monitor y la vista limpia de OBS
function useMonitorVideo(videoRef, camBoxRef, stream, settingsRef, onPlay, deps) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    v.srcObject = stream || null;
    const onPlaying = () => onPlay(true);
    v.addEventListener('playing', onPlaying);
    v.play?.().catch(() => {});
    return () => v.removeEventListener('playing', onPlaying);
  }, [stream]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se ve la imagen completa; el zoom es solo de esta pantalla (el móvil no cambia)
  useEffect(() => {
    const v = videoRef.current;
    const box = camBoxRef.current;
    if (!v || !box) return undefined;
    const apply = () => {
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      const s0 = settingsRef.current;
      v.style.position = 'absolute';
      v.style.left = '50%';
      v.style.top = '50%';
      v.style.transform = `translate(-50%, -50%) scale(${s0.cameraZoom || 1})${s0.cameraMirror ? ' scaleX(-1)' : ''}`;
      if (!cw || !ch || !vw || !vh) {
        v.style.width = '100%';
        v.style.height = '100%';
        return;
      }
      const s = Math.min(cw / vw, ch / vh);
      v.style.objectFit = 'fill';
      v.style.width = `${Math.round(vw * s)}px`;
      v.style.height = `${Math.round(vh * s)}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(box);
    v.addEventListener('loadedmetadata', apply);
    v.addEventListener('resize', apply);
    const t = setInterval(apply, 1000);
    return () => {
      ro.disconnect();
      v.removeEventListener('loadedmetadata', apply);
      v.removeEventListener('resize', apply);
      clearInterval(t);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Pantalla de lectura del PC: la imagen de la cámara del móvil, el guion y los botones ──
function MonitorView({ stream, script, remote, settings, update, send, onNew, connected }) {
  const videoRef = useRef(null);
  const camBoxRef = useRef(null);
  const stageRef = useRef(null);
  const contentRef = useRef(null);
  const indexRef = useRef(null);
  const karaokeRef = useRef(null);
  const posRef = useRef(0);
  const settingsRef = useRef(settings);
  const remoteRef = useRef(remote);
  settingsRef.current = settings;
  remoteRef.current = remote;
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hasVideo, setHasVideo] = useState(false);

  useMonitorVideo(videoRef, camBoxRef, stream, settingsRef, setHasVideo, [settings.cameraMirror, settings.cameraZoom]);

  // Índice de palabras del guion en ESTE tamaño de pantalla
  const rebuildRef = useRef(() => {});
  useEffect(() => {
    let timer = null;
    rebuildRef.current = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = settingsRef.current;
        indexRef.current = buildContentIndex(contentRef.current, s.fontSize * s.lineHeight);
      }, 200);
    };
    rebuildRef.current();
    const ro = new ResizeObserver(() => rebuildRef.current());
    if (contentRef.current) ro.observe(contentRef.current);
    if (stageRef.current) ro.observe(stageRef.current);
    document.fonts?.ready.then(() => rebuildRef.current()).catch(() => {});
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [script?.text, settings.fontSize, settings.lineHeight, settings.width, settings.fontFamily, settings.karaokeOn]);

  // Karaoke
  useEffect(() => {
    if (!settings.karaokeOn) return undefined;
    const k = createKaraoke();
    karaokeRef.current = k;
    return () => {
      k.destroy();
      karaokeRef.current = null;
    };
  }, [settings.karaokeOn]);

  // Desplazamiento: sigue la posición que manda el móvil, con suavizado
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = t => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const s = settingsRef.current;
      const lh = s.fontSize * s.lineHeight;
      const ix = indexRef.current;
      const r = remoteRef.current;
      if (ix && ix.lines?.length && typeof r.w === 'number' && r.w >= 0) {
        const target = posFromWordCoord(ix, r.w, lh);
        posRef.current += (target - posRef.current) * (1 - Math.exp(-dt * 10));
      }
      const stage = stageRef.current;
      if (stage && contentRef.current) {
        const guideY = (stage.clientHeight * s.guidePos) / 100;
        contentRef.current.style.transform = `translate3d(0, ${guideY - lh / 2 - posRef.current}px, 0)`;
      }
      if (karaokeRef.current && s.karaokeOn && ix && typeof r.idx === 'number' && r.idx >= 0) {
        karaokeRef.current.update(ix, r.idx, s.karaokeUnit, s.karaokeRead !== 'none');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!remote.recording) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [remote.recording]);

  const cmd = useCallback((c, v) => send({ t: 'cmd', c, v }), [send]);

  useEffect(() => {
    const onKey = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const map = { ' ': 'toggle', Enter: 'toggle', ArrowDown: 'faster', ArrowRight: 'faster', ArrowUp: 'slower', ArrowLeft: 'slower', PageDown: 'next', PageUp: 'prev', Home: 'restart' };
      if (map[e.key]) {
        e.preventDefault();
        cmd(map[e.key]);
      } else if (e.key === 'r' || e.key === 'R') {
        cmd(remoteRef.current.recording ? 'stop' : 'record');
      } else if (e.key === 'Escape') {
        setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmd]);

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const lineH = settings.fontSize * settings.lineHeight;
  const playing = !!remote.playing;
  const recording = !!remote.recording;
  const mirrorStyle = { transform: `scale(${settings.mirrorH ? -1 : 1}, ${settings.mirrorV ? -1 : 1})` };
  const contentStyle = {
    width: `${settings.width}%`,
    ...(settings.width < 92 ? { paddingLeft: 0, paddingRight: 0 } : {}),
    left: `${((settings.mirrorH ? -1 : 1) * settings.textOffset / 100) * ((100 - settings.width) / 2)}%`,
    right: `${-((settings.mirrorH ? -1 : 1) * settings.textOffset / 100) * ((100 - settings.width) / 2)}%`,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
    textAlign: settings.align,
    color: settings.textColor,
    textTransform: settings.uppercase ? 'uppercase' : 'none',
    textShadow: settings.textShadow ? '0 2px 4px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.6)' : 'none',
    ...(settings.karaokeOn ? karaokeVars(settings) : {}),
  };

  return (
    <div className="tp-root" style={{ '--tp-text': settings.textColor }}>
      <div className="tp-prompter" style={{ backgroundColor: settings.bgColor, '--tp-text': settings.textColor }}>
        <div className="tp-camera" ref={camBoxRef}>
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="tp-camera-dim" style={{ opacity: settings.cameraDim }} />
        </div>

        <div className="tp-stage" ref={stageRef}>
          <div className="tp-mirror" style={mirrorStyle}>
            <div className="tp-content" ref={contentRef} style={contentStyle}>
              {script ? <ScriptView text={script.text} format={script.format} wrapWords={settings.karaokeOn} /> : null}
              <div className="tp-end">— Fin —</div>
            </div>
            {settings.guideStyle === 'band' && (
              <div className="tp-guide-band" style={{ top: `calc(${settings.guidePos}% - ${lineH / 2}px)`, height: lineH }} />
            )}
          </div>
        </div>

        <div className="tp-status">
          <span className="tp-status-voice">🖥 {connected ? 'conectado al móvil' : 'sin conexión'}</span>
          {recording && (
            <span className="tp-rec-badge">
              <span className="tp-rec-dot" /> REC {fmt(Math.max(0, (now - (remote.startedAt || now)) / 1000))}
            </span>
          )}
          {typeof remote.speed === 'number' && <span className="tp-status-mic">velocidad {remote.speed}</span>}
        </div>

        {!hasVideo && connected && <div className="tp-toast">Esperando la imagen de la cámara del móvil…</div>}
        {remote.resultOpen && <div className="tp-toast">Grabación terminada: guárdala desde el móvil.</div>}
        {!connected && (
          <div className="tp-modal-backdrop">
            <div className="tp-modal" style={{ padding: 20, textAlign: 'center' }}>
              <h2 style={{ marginTop: 0 }}>Esperando al móvil…</h2>
              <p className="tp-hint">
                El móvil se ha desconectado (por ejemplo, al apagar la cámara). Se reconectará solo en cuanto vuelva a tener la cámara
                activa, con el mismo QR. Este monitor sigue abierto hasta que cierres la sesión.
              </p>
              <button type="button" className="tp-btn" onClick={onNew}>Cerrar sesión y crear otro QR</button>
            </div>
          </div>
        )}
        {remote.countdown > 0 && <div className="tp-countdown">{remote.countdown}</div>}

        <div className="tp-bottom">
          <div className="tp-controls" role="toolbar" aria-label="Controles del monitor">
            <div className="tp-controls-group">
              <button type="button" className="tp-ctrl" onClick={() => cmd('restart')} aria-label="Volver al inicio" title="Al inicio (Inicio)"><RotateCcw size={20} /></button>
              <button type="button" className="tp-ctrl" onClick={() => cmd('prev')} aria-label="Sección anterior" title="Sección anterior (RePág)"><ChevronUp size={22} /></button>
              <button type="button" className="tp-ctrl tp-ctrl-play" onClick={() => cmd('toggle')} aria-label={playing ? 'Pausar' : 'Reproducir'} title="Reproducir o pausar (espacio)">
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button type="button" className="tp-ctrl" onClick={() => cmd('next')} aria-label="Sección siguiente" title="Sección siguiente (AvPág)"><ChevronDown size={22} /></button>
            </div>
            <div className="tp-controls-group">
              <div className="tp-stepper" title="Velocidad (flechas arriba y abajo)">
                <button type="button" className="tp-ctrl" onClick={() => cmd('slower')} aria-label="Más lento"><Minus size={18} /></button>
                <span className="tp-stepper-value"><small>Vel.</small>{remote.speed ?? '–'}</span>
                <button type="button" className="tp-ctrl" onClick={() => cmd('faster')} aria-label="Más rápido"><Plus size={18} /></button>
              </div>
              <div className="tp-stepper" title="Tamaño de letra (solo en este monitor)">
                <button type="button" className="tp-ctrl" onClick={() => update({ fontSize: clamp(settings.fontSize - 4, 18, 200) })} aria-label="Letra más pequeña"><Minus size={18} /></button>
                <span className="tp-stepper-value"><small>Letra</small>{settings.fontSize}</span>
                <button type="button" className="tp-ctrl" onClick={() => update({ fontSize: clamp(settings.fontSize + 4, 18, 200) })} aria-label="Letra más grande"><Plus size={18} /></button>
              </div>
            </div>
            <div className="tp-controls-group">
              <select
                className="tp-ctrl"
                style={{ width: 'auto', padding: '0 8px', background: 'transparent', color: 'inherit' }}
                value={settings.monitorQuality}
                onChange={e => update({ monitorQuality: e.target.value })}
                aria-label="Calidad de la imagen"
                title="Calidad con la que llega la imagen a este PC (la grabación del móvil no cambia)"
              >
                {Object.entries(QUALITY_LABELS).map(([k, l]) => <option key={k} value={k} style={{ color: '#000' }}>{l}</option>)}
              </select>
              <label className="tp-ctrl" style={{ width: 'auto', padding: '0 10px', gap: 6, display: 'flex', alignItems: 'center' }} title="Zoom solo en este monitor (digital)">
                <ZoomIn size={18} />
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={settings.cameraZoom}
                  onChange={e => update({ cameraZoom: Number(e.target.value) })}
                  onDoubleClick={() => update({ cameraZoom: 1 })}
                  aria-label="Zoom"
                  style={{ width: 90 }}
                />
                <small>{Number(settings.cameraZoom).toFixed(1)}×</small>
              </label>
              {Array.isArray(remote.cams) && remote.cams.length > 1 && (
                <select
                  className="tp-ctrl"
                  style={{ width: 'auto', maxWidth: 190, padding: '0 8px', background: 'transparent', color: 'inherit' }}
                  value={remote.cam || ''}
                  disabled={recording}
                  onChange={e => cmd('camera', e.target.value)}
                  aria-label="Cámara del móvil"
                  title={recording ? 'No se puede cambiar de cámara mientras graba' : 'Cámara que usa el móvil'}
                >
                  {remote.cams.map(([id, label]) => <option key={id} value={id} style={{ color: '#000' }}>{label}</option>)}
                </select>
              )}
              <button
                type="button"
                className={`tp-ctrl${remote.torch ? ' is-on' : ''}`}
                disabled={remote.torch == null}
                onClick={() => cmd('torch', !remote.torch)}
                aria-label="Linterna del móvil"
                title={remote.torch == null ? 'La linterna no está disponible con esta cámara o en este navegador del móvil' : 'Encender o apagar la linterna del móvil'}
              >
                {remote.torch ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
              </button>
              {recording ? (
                <button type="button" className="tp-ctrl tp-ctrl-rec is-recording" onClick={() => cmd('stop')} aria-label="Parar grabación" title="Parar la grabación (R)"><Square size={18} fill="currentColor" /></button>
              ) : (
                <button type="button" className="tp-ctrl tp-ctrl-rec" onClick={() => cmd('record')} aria-label="Grabar" title="Grabar en el móvil (R)"><Circle size={20} fill="currentColor" /></button>
              )}
              <button
                type="button"
                className="tp-ctrl"
                onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
                aria-label="Pantalla completa"
              >
                {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
              <button type="button" className={`tp-ctrl${panelOpen ? ' is-on' : ''}`} onClick={() => setPanelOpen(o => !o)} aria-label="Ajustes del monitor" title="Ajustes de este monitor">
                <Settings2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {panelOpen && (
          <SettingsPanel settings={settings} update={update} onClose={() => setPanelOpen(false)} onlyGroups={['texto', 'karaoke', 'monitor']} />
        )}
      </div>
    </div>
  );
}

// Vista limpia para OBS: solo la imagen de la cámara del móvil, sin guion ni mandos
function CleanView({ stream, settings }) {
  const videoRef = useRef(null);
  const camBoxRef = useRef(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useMonitorVideo(videoRef, camBoxRef, stream, settingsRef, () => {}, [settings.cameraMirror, settings.cameraZoom]);
  return (
    <div className="tp-root">
      <div className="tp-prompter" style={{ backgroundColor: '#000', cursor: 'none' }}>
        <div className="tp-camera" ref={camBoxRef}>
          <video ref={videoRef} autoPlay playsInline muted />
        </div>
      </div>
    </div>
  );
}

export default function MonitorEntry({ clean = false }) {
  useMonitorHead();
  const [status, setStatus] = useState('creando');
  const [roomId, setRoomId] = useState(null);
  const [stream, setStream] = useState(null);
  const [script, setScript] = useState(null);
  const [remote, setRemote] = useState({});
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(() => loadMonitorSettings(clean));
  const sessionRef = useRef(null);
  const scriptRef = useRef(null);

  const update = useCallback(partial => setSettings(prev => ({ ...prev, ...partial })), []);
  useEffect(() => {
    if (!clean) saveJSON(KEY, settings);
  }, [settings]);

  // fresh=true: cerrar sesión y crear otro QR; si no, se retoma el QR guardado en este PC
  const begin = useCallback(async (fresh = false) => {
    sessionRef.current?.close({ keep: !fresh });
    sessionRef.current = null;
    setStatus('creando');
    setRoomId(null);
    setStream(null);
    setError('');
    setRemote({});
    const roomKey = clean ? ROOM_KEY_OBS : ROOM_KEY;
    if (fresh) saveJSON(roomKey, null);
    try {
      const saved = fresh ? null : loadJSON(roomKey, null);
      const session = await startMonitor({
        resumeId: typeof saved === 'string' && /^[a-z0-9]{10}$/.test(saved) ? saved : null,
        onStream: s => setStream(new MediaStream(s.getTracks())),
        onStatus: setStatus,
        onMessage: m => {
          if (m.t === 'script') {
            scriptRef.current = m;
            setScript({ id: m.id, name: m.name, text: m.text, format: m.format });
          } else if (m.t === 'state') {
            setRemote(m);
          }
        },
      });
      sessionRef.current = session;
      saveJSON(roomKey, session.id);
      setRoomId(session.id);
      setStatus(s => (s === 'creando' ? 'esperando' : s));
    } catch (err) {
      setStatus('error');
      setError(err?.status === 500 || err?.status === 404 ? 'El servidor no ha podido crear la conexión (¿falta la tabla de la base de datos?).' : 'No se ha podido crear la conexión.');
    }
  }, []);

  useEffect(() => {
    begin(false);
    return () => sessionRef.current?.close({ keep: true });
  }, [begin]);
  const newSession = useCallback(() => begin(true), [begin]);

  const send = useCallback(obj => sessionRef.current?.send(obj), []);
  const connected = status === 'conectado';
  // El móvil manda la imagen con la calidad que se elige aquí (y se repite cada vez que se reconecta)
  useEffect(() => {
    if (connected) send({ t: 'cmd', c: 'quality', v: settings.monitorQuality });
  }, [connected, settings.monitorQuality, send]);
  const link = useMemo(() => (roomId ? `${window.location.origin}/tp?monitor=${roomId}` : ''), [roomId]);

  // Mientras no hay móvil conectado: el QR
  if (!connected && (!script || clean)) {
    return (
      <div className="tp-root">
        <div className="tp-monitor-wait">
          <MonitorSmartphone size={36} />
          <h1>Monitor del teleprompter</h1>
          {status === 'error' || status === 'caducado' ? (
            <>
              <p className="tp-error">{error || 'El código ha caducado.'}</p>
              <button type="button" className="tp-btn tp-btn-primary" onClick={newSession}>Crear un QR nuevo</button>
            </>
          ) : roomId ? (
            <>
              <div className="tp-qr">
                <QRCodeSVG value={link} size={280} level="M" marginSize={2} />
              </div>
              <p>
                {status === 'conectando' ? 'Conectando con el móvil…' : 'Escanea este QR con la cámara del iPhone.'}
              </p>
              <ol className="tp-hint" style={{ textAlign: 'left', maxWidth: 420 }}>
                <li>Abre el enlace que sale en el iPhone (Safari).</li>
                <li>Toca «Conectar con el monitor» y permite la cámara.</li>
                <li>El iPhone graba y aquí verás su imagen y el guion.</li>
              </ol>
              <p className="tp-hint" style={{ wordBreak: 'break-all' }}>{link}</p>
              <p className="tp-hint">El móvil y este ordenador deben estar en la misma red. El QR vale mientras no cierres esta página o la sesión.</p>
            </>
          ) : (
            <p>Creando la conexión…</p>
          )}
        </div>
      </div>
    );
  }

  if (clean) return <CleanView stream={stream} settings={settings} />;

  return (
    <MonitorView
      stream={stream}
      script={script}
      remote={remote}
      settings={settings}
      update={update}
      send={send}
      onNew={newSession}
      connected={connected}
    />
  );
}
