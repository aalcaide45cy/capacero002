import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { RESOLUTIONS, hasMediaDevices, isIOS, isChromeIOS, isStandalone, permissionHelp } from './useMedia';
import { speechRecognitionSupported } from './useVoice';
import { recLog } from './recLog';
import { getAudioContext, unlockAudio } from './audioCtx';

function Range({ label, value, min, max, step = 1, onChange, format }) {
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

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={`tp-toggle${disabled ? ' is-disabled' : ''}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="tp-switch" aria-hidden="true" />
    </label>
  );
}

function Select({ label, value, onChange, options, disabled }) {
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

function Segmented({ label, value, onChange, options }) {
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
function VoiceTest() {
  const [state, setState] = useState({ running: false, heard: '', error: '', started: false });

  const run = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    unlockAudio();
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
    rec.onend = () => setState(s => ({ ...s, running: false, error: s.error || (got ? '' : s.started ? 'no-speech' : 'cerrado-al-instante') }));
    try {
      rec.start();
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
      <button type="button" className="tp-btn" onClick={run} disabled={!supported || state.running} style={{ marginBottom: 8 }}>
        {state.running ? 'Escuchando 7 s… di una frase' : 'Probar el reconocimiento de voz'}
      </button>
      {state.heard && <p className="tp-hint">He oído: «{state.heard}» ✓</p>}
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

function CameraSection({ settings, update, camera, recording }) {
  const { stream, devices, error } = camera;
  const videoTrack = stream?.getVideoTracks()[0];
  const audioTrack = camera.micTrack || stream?.getAudioTracks()[0];
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

  const autoMbps = (RESOLUTIONS[settings.resolution] || RESOLUTIONS['1080']).bitrate / 1_000_000;
  const mbps = settings.videoBitrate > 0 ? settings.videoBitrate : autoMbps;
  const audioSettings = audioTrack?.getSettings?.() || {};
  const wavPerMin = Math.round(
    ((audioSettings.sampleRate || 48000) * (audioSettings.channelCount === 2 ? 2 : 1) * (settings.wavBitDepth / 8) * 60) / 1_048_576
  );
  const sizePerMin = Math.round(((mbps * 1_000_000 + settings.audioBitrate * 1000) * 60) / 8 / 1_048_576);

  const cameraOptions = [
    { value: 'user', label: 'Frontal' },
    { value: 'environment', label: 'Trasera' },
    ...devices.video.map((d, i) => ({ value: d.deviceId, label: d.label || `Cámara ${i + 1}` })),
  ];
  const micOptions = [
    { value: 'default', label: 'Predeterminado del sistema' },
    ...devices.audio
      .filter(d => d.deviceId !== 'default')
      .map((d, i) => ({ value: d.deviceId, label: d.label || `Micrófono ${i + 1}` })),
  ];

  return (
    <section className="tp-panel-section">
      <h3>Cámara y grabación</h3>
      <PermissionsHelper />
      <Toggle label="Cámara de fondo" checked={settings.cameraOn} disabled={recording} onChange={v => update({ cameraOn: v })} />
      {error && <p className="tp-error">{error}</p>}
      {settings.cameraOn && (
        <>
          <Select label="Cámara" value={settings.cameraSource} disabled={recording} options={cameraOptions} onChange={v => update({ cameraSource: v })} />
          <Segmented
            label="Resolución"
            value={settings.resolution}
            onChange={v => !recording && update({ resolution: v })}
            options={Object.entries(RESOLUTIONS).map(([value, r]) => ({ value, label: r.label }))}
          />
          <Segmented
            label="Fotogramas por segundo"
            value={settings.fps}
            onChange={v => !recording && update({ fps: v })}
            options={[{ value: 24, label: '24' }, { value: 30, label: '30' }, { value: 60, label: '60' }]}
          />
          <Select
            label="Calidad de vídeo (bitrate)"
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
            value={String(settings.audioBitrate)}
            disabled={recording}
            onChange={v => update({ audioBitrate: Number(v) })}
            options={[64, 96, 128, 160, 192, 256, 320].map(k => ({
              value: String(k),
              label: `${k} kbps${k === 320 ? ' · máximo' : k === 128 ? ' · normal' : ''}`,
            }))}
          />
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
          {audioTrack && (
            <p className="tp-hint">
              Micrófono entregando: {audioSettings.sampleRate ? `${(audioSettings.sampleRate / 1000).toFixed(1)} kHz` : '—'} ·{' '}
              {audioSettings.channelCount === 2 ? 'estéreo' : audioSettings.channelCount === 1 ? 'mono' : '—'}.
              El navegador puede ignorar lo que pidas si el micro no lo ofrece.
            </p>
          )}
          <Toggle
            label="Modo ligero al grabar (menos efectos)"
            checked={settings.liteWhileRecording}
            disabled={recording}
            onChange={v => update({ liteWhileRecording: v })}
          />
          <p className="tp-hint">
            Mientras grabas quita el degradado del texto leído, las sombras grandes y los desenfoques para dejar más
            potencia al teléfono y que el vídeo no se congele. Si grabas en 4K o a 60 fps, mejor déjalo activado.
          </p>
          <Toggle
            label="Ocultar avisos mientras leo o grabo"
            checked={settings.hideNotices}
            onChange={v => update({ hideNotices: v })}
          />
          <p className="tp-hint">
            Oculta los avisos de la app y el banner de cookies de la web mientras estás en la pantalla de lectura. Las
            notificaciones del iPhone (de otras apps o de esta web) no las controla la web: usa «No molestar» o un Foco.
          </p>
          <Toggle
            label="Guardar copia de la grabación en este dispositivo"
            checked={settings.backupRecordings}
            onChange={v => update({ backupRecordings: v })}
          />
          <p className="tp-hint">
            Evita perder el vídeo si la página se recarga al guardarlo. Se queda solo en este navegador hasta que
            pulses «Descartar» o la borres en «Grabaciones».
          </p>
          <Toggle
            label="Mostrar el nivel del micrófono en pantalla"
            checked={settings.showMicMeter}
            onChange={v => update({ showMicMeter: v })}
          />
          <Toggle
            label="Grabar también audio sin comprimir (WAV)"
            checked={settings.wavRecord}
            disabled={recording}
            onChange={v => update({ wavRecord: v })}
          />
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
          <p className="tp-hint">
            Tamaño aproximado del vídeo: {sizePerMin} MB por minuto.
            {settings.wavRecord && ` Más ${wavPerMin} MB por minuto del WAV, que se guarda aparte.`} El audio del
            vídeo siempre va comprimido (AAC): para conservar la calidad de tu micro, activa el WAV y sincronízalo
            en tu editor. El WAV se guarda en la memoria del dispositivo hasta que lo descargues: en grabaciones
            largas, mejor 16 o 24 bits. Cierra el panel antes de grabar. Si en tu iPhone el vídeo se graba sin
            sonido, desactiva el nivel del micrófono y el WAV.
          </p>
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
            <p className="tp-hint">
              En uso: {videoTrack.label || 'cámara'}
              {trackSettings.width ? ` · ${trackSettings.width}×${trackSettings.height}` : ''}
              {trackSettings.frameRate ? ` · ${Math.round(trackSettings.frameRate)} fps` : ''}
            </p>
          )}
          <Toggle label="Ver la cámara en espejo" checked={settings.cameraMirror} onChange={v => update({ cameraMirror: v })} />
          <Segmented
            label="Vista de la cámara"
            value={settings.cameraFit}
            onChange={v => update({ cameraFit: v })}
            options={[{ value: 'cover', label: 'Llenar pantalla' }, { value: 'contain', label: 'Imagen completa' }]}
          />
          <p className="tp-hint">
            «Llenar pantalla» recorta los bordes de la imagen para cubrir la pantalla. «Imagen completa» muestra el encuadre
            entero que se graba, con franjas negras si hace falta.
          </p>
          <Range
            label="Oscurecer la imagen"
            value={settings.cameraDim}
            min={0}
            max={0.9}
            step={0.05}
            format={v => `${Math.round(v * 100)} %`}
            onChange={v => update({ cameraDim: v })}
          />
          <Select label="Micrófono" value={settings.micId} disabled={recording} options={micOptions} onChange={v => update({ micId: v })} />
          {stream && !audioTrack && (
            <p className="tp-error">
              No llega audio. Comprueba el permiso del micrófono en los ajustes de Safari para esta web y vuelve a
              encender la cámara.
            </p>
          )}
          {audioTrack && (
            <>
              <MicMeter stream={stream} />
              <p className="tp-hint">En uso: {audioTrack.label || 'micrófono'}</p>
            </>
          )}
          <Range
            label="Ganancia de entrada (por software)"
            value={settings.micGain}
            min={0}
            max={24}
            step={1}
            format={v => (v === 0 ? 'Sin ganancia' : `+${v} dB`)}
            onChange={v => update({ micGain: v })}
          />
          <Toggle
            label="Compresor de voz suave (volumen más uniforme)"
            checked={settings.micCompressor}
            disabled={recording}
            onChange={v => update({ micCompressor: v })}
          />
          <GainState active={settings.micGain > 0 || settings.micCompressor} />
          <AutoGain micTrack={camera.micTrack} update={update} disabled={recording} />
          <p className="tp-hint">
            El medidor muestra el nivel en decibelios: la barra debe llegar a la zona amarilla al hablar (≈ −15 dB de media),
            sin tocar el rojo. Si apenas se mueve, sube la ganancia.
          </p>
          <Toggle label="Control automático de ganancia" checked={settings.autoGainControl} disabled={recording} onChange={v => update({ autoGainControl: v })} />
          <Toggle label="Reducción de ruido" checked={settings.noiseSuppression} disabled={recording} onChange={v => update({ noiseSuppression: v })} />
          <Toggle label="Cancelación de eco" checked={settings.echoCancellation} disabled={recording} onChange={v => update({ echoCancellation: v })} />
          <p className="tp-hint">
            Si la voz se graba baja con todo apagado, sube la ganancia de entrada (con limitador contra saturación)
            o activa el control automático de ganancia. Con un micro externo suele sonar mejor sin reducción de
            ruido ni eco. La ganancia por software puede dejar el vídeo mudo en algunos iPhone: si pasa, ponla en 0.
          </p>
        </>
      )}
      <MicTest settings={settings} update={update} recording={recording} />
    </section>
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

// La posición de desplazamiento se recuerda entre aperturas del panel
let savedScroll = 0;

export default function SettingsPanel({ settings, update, onClose, camera, recording }) {
  const bodyRef = useRef(null);
  const restoringUntil = useRef(0);

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

  return (
    <aside className="tp-panel" aria-label="Ajustes del teleprompter">
      <header className="tp-panel-header">
        <h2>Ajustes</h2>
        <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar ajustes">
          <X size={20} />
        </button>
      </header>

      <div
        className="tp-panel-body"
        ref={bodyRef}
        onScroll={e => {
          if (Date.now() > restoringUntil.current) savedScroll = e.currentTarget.scrollTop;
        }}
      >
        <section className="tp-panel-section">
          <h3>Desplazamiento</h3>
          <Range label="Velocidad" value={settings.speed} min={1} max={40} onChange={v => update({ speed: v })} />
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
          <p className="tp-hint">Siempre hay cuenta atrás al empezar desde el principio y al pulsar grabar.</p>
          <Range
            label="Altura de la guía de lectura"
            value={settings.guidePos}
            min={10}
            max={80}
            format={v => `${v} %`}
            onChange={v => update({ guidePos: v })}
          />
          <Segmented
            label="Guía de lectura"
            value={settings.guideStyle}
            onChange={v => update({ guideStyle: v })}
            options={[{ value: 'none', label: 'Ninguna' }, { value: 'line', label: 'Flechas' }, { value: 'band', label: 'Franja' }]}
          />
          <Toggle label="Atenuar el texto ya leído" checked={settings.fadeRead} onChange={v => update({ fadeRead: v })} />
        </section>

        <section className="tp-panel-section">
          <h3>Voz y marcadores</h3>
          <Segmented
            label="Control por voz"
            value={settings.voiceMode}
            onChange={v => update({ voiceMode: v, ...(v !== 'off' ? { voiceLast: v } : {}) })}
            options={[
              { value: 'off', label: 'No' },
              { value: 'talk', label: 'Avanza si hablo' },
              { value: 'follow', label: 'Sigue mi voz' },
            ]}
          />
          <p className="tp-hint">
            <strong>Avanza si hablo:</strong> el texto avanza a tu velocidad mientras hablas y se detiene cuando callas.
            Funciona en cualquier navegador y no envía nada. <strong>Sigue mi voz:</strong> escucha lo que lees y pone el
            texto en la palabra en la que vas; si te saltas una frase, te sigue. Usa el reconocimiento de voz del navegador
            (en Chrome lo procesa Google). En iPhone no puede usarse a la vez que grabas vídeo: al grabar pasa solo a «Avanza
            si hablo».
          </p>
          <VoiceTest />
          {settings.voiceMode !== 'off' && (
            <Range
              label="Sensibilidad al hablar"
              value={settings.voiceSensitivity}
              min={4}
              max={24}
              format={v => `${v} dB sobre el ruido`}
              onChange={v => update({ voiceSensitivity: v })}
            />
          )}
          {settings.voiceMode === 'follow' && (
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
          )}
          <Toggle label="Pausar en los marcadores [PAUSA]" checked={settings.pauseOnMarkers} onChange={v => update({ pauseOnMarkers: v })} />
          <p className="tp-hint">
            Escribe notas de dirección en mayúsculas entre corchetes, por ejemplo [PAUSA], [MIRA A CÁMARA] o [B-ROLL]. Se
            ven como etiquetas de color, no se leen, y [PAUSA] detiene el texto hasta que lo reanudes.
          </p>
        </section>

        <section className="tp-panel-section">
          <h3>Barra de herramientas</h3>
          <Toggle label="Fijar la barra (no se oculta)" checked={settings.controlsPinned} onChange={v => update({ controlsPinned: v })} />
          <Range
            label="Ocultar tras"
            value={settings.controlsHideDelay}
            min={1}
            max={15}
            format={v => `${v} s`}
            onChange={v => update({ controlsHideDelay: v })}
          />
          <Toggle
            label="Con la barra oculta, el primer toque solo la muestra"
            checked={settings.tapWakesControls}
            onChange={v => update({ tapWakesControls: v })}
          />
          <p className="tp-hint">Así no pausas sin querer: toca una vez para ver la barra y otra para pausar o reanudar.</p>
        </section>

        <section className="tp-panel-section">
          <h3>Texto</h3>
          <Range label="Tamaño de letra" value={settings.fontSize} min={18} max={160} format={v => `${v} px`} onChange={v => update({ fontSize: v })} />
          <Range label="Interlineado" value={settings.lineHeight} min={1} max={2.2} step={0.05} format={v => v.toFixed(2)} onChange={v => update({ lineHeight: v })} />
          <Range label="Ancho de columna" value={settings.width} min={40} max={100} format={v => `${v} %`} onChange={v => update({ width: v })} />
          <Segmented
            label="Alineación"
            value={settings.align}
            onChange={v => update({ align: v })}
            options={[{ value: 'left', label: 'Izquierda' }, { value: 'center', label: 'Centro' }]}
          />
          <Segmented
            label="Tipografía"
            value={settings.fontFamily}
            onChange={v => update({ fontFamily: v })}
            options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]}
          />
          <Toggle label="Mayúsculas" checked={settings.uppercase} onChange={v => update({ uppercase: v })} />
          <Toggle label="Sombra del texto" checked={settings.textShadow} onChange={v => update({ textShadow: v })} />
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
        </section>

        <section className="tp-panel-section">
          <h3>Atajos de teclado, pedal y mando</h3>
          <p className="tp-hint">
            Los pedales y mandos Bluetooth de fotos o presentaciones envían estas teclas, así que sirven sin configurar nada:
          </p>
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
        </section>

        <section className="tp-panel-section">
          <h3>Espejo</h3>
          <Toggle label="Espejo horizontal" checked={settings.mirrorH} onChange={v => update({ mirrorH: v })} />
          <Toggle label="Espejo vertical" checked={settings.mirrorV} onChange={v => update({ mirrorV: v })} />
          <p className="tp-hint">Para cristales de teleprompter, que reflejan el texto al revés.</p>
        </section>

        {camera && <CameraSection settings={settings} update={update} camera={camera} recording={recording} />}
        {camera && <LastLog />}
        {camera === null && !hasMediaDevices() && (
          <section className="tp-panel-section">
            <h3>Cámara y grabación</h3>
            <p className="tp-error">
              Este navegador no da acceso a la cámara ni al micrófono a las webs{isChromeIOS() ? ' (Chrome en iPhone lo limita)' : ''}. Abre capacero3d.com/tp
              en Safari para grabar. {permissionHelp()}
            </p>
          </section>
        )}
      </div>
    </aside>
  );
}
