import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Pause, Minus, Plus, RotateCcw, ChevronUp, ChevronDown,
  FlipHorizontal2, Settings2, Camera, CameraOff, Circle, Square, Maximize, Minimize,
  Download, Share2, Trash2, Pin, PinOff, Mic, MicOff, ListOrdered, X,
} from 'lucide-react';
import ScriptView from './ScriptView';
import SettingsPanel, { MicMeter } from './SettingsPanel';
import { useCamera, useRecorder, hasMediaDevices, RESOLUTIONS, isAppleSafari } from './useMedia';
import { useSpeechLevel, useSpeechFollow, speechRecognitionSupported } from './useVoice';
import { buildContentIndex } from './domIndex';
import { useWavRecorder } from './useWavRecorder';
import { recLog, describeTrack } from './recLog';
import { unlockAudio } from './audioCtx';
import { saveRecording, deleteRecording } from './recStore';
import { loadPosition, savePosition } from './storage';

const FONT_STACKS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

// Mantiene la pantalla encendida mientras se lee (Screen Wake Lock API)
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return undefined;
    let lock = null;
    let released = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Sin soporte o batería baja: no es crítico
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

function useFullscreen() {
  const el = typeof document !== 'undefined' ? document.documentElement : null;
  const supported = !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onChange = () => setActive(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
    }
  }, [el]);
  return { supported, active, toggle };
}

function LogBox({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el portapapeles no está permitido, el texto se puede seleccionar a mano
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teleprompter-registro.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <details className="tp-log">
      <summary>Registro de la grabación (para diagnóstico)</summary>
      <textarea readOnly value={text} onFocus={e => e.target.select()} />
      <div className="tp-modal-actions">
        <button type="button" className="tp-btn" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar registro'}</button>
        <button type="button" className="tp-btn" onClick={download}>Descargar .txt</button>
      </div>
    </details>
  );
}

function RecordingResult({ result, wav, backup, onDiscard }) {
  // El tipo se limpia (sin la lista de códecs): iOS puede rechazar «video/mp4;codecs=...» al compartir
  const file = useMemo(() => new File([result.blob], result.name, { type: result.type.split(';')[0] }), [result]);
  const canShare = typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] });
  const [shareError, setShareError] = useState('');

  const share = async () => {
    setShareError('');
    recLog.add(`compartir: ${(file.size / 1048576).toFixed(1)} MB ${file.type}`);
    try {
      await navigator.share({ files: [file] });
      recLog.add('compartir: terminado');
    } catch (err) {
      recLog.add(`compartir: ${err?.name} ${err?.message}`);
      recLog.save();
      if (err?.name !== 'AbortError') setShareError(`No se pudo compartir (${err?.name || 'error'}). Usa «Descargar» y guárdalo desde Archivos.`);
    }
  };

  return (
    <div className="tp-modal-backdrop">
      <div className="tp-modal tp-result" role="dialog" aria-label="Grabación terminada">
        <h2>Grabación terminada</h2>
        <video src={result.url} controls playsInline preload="metadata" className="tp-result-video" />
        <p className="tp-hint">
          {(result.blob.size / 1048576).toFixed(1)} MB · {result.type.split(';')[0]}. El vídeo solo está en este
          dispositivo: guárdalo antes de salir.
        </p>
        {wav && (
          <p className="tp-hint">
            Audio sin comprimir: {wav.bitDepth === 32 ? '32 bits flotante' : `${wav.bitDepth} bits`} ·{' '}
            {(wav.sampleRate / 1000).toFixed(1)} kHz · {wav.channels === 2 ? 'estéreo' : 'mono'} ·{' '}
            {(wav.blob.size / 1048576).toFixed(0)} MB. Sincronízalo con el vídeo en tu editor.
          </p>
        )}
        {backup === 'ok' && <p className="tp-hint">✓ Copia de seguridad guardada en este dispositivo: si la página se recarga, la encontrarás en «Grabaciones».</p>}
        {backup === 'error' && <p className="tp-hint">No se pudo guardar la copia de seguridad en el navegador (poco espacio o modo privado).</p>}
        {shareError && <p className="tp-error">{shareError}</p>}
        {recLog.hasData() && <LogBox text={recLog.text()} />}
        {!result.hasAudio && <p className="tp-error">Esta grabación no tiene audio: no llegaba sonido del micrófono.</p>}
        <div className="tp-modal-actions">
          {canShare && (
            <button type="button" className="tp-btn tp-btn-primary" onClick={share}>
              <Share2 size={18} /> Guardar en Fotos / Compartir
            </button>
          )}
          <a className={`tp-btn${canShare ? '' : ' tp-btn-primary'}`} href={result.url} download={result.name}>
            <Download size={18} /> Descargar
          </a>
          {wav && (
            <a className="tp-btn" href={wav.url} download={wav.name}>
              <Download size={18} /> Audio WAV
            </a>
          )}
          <button
            type="button"
            className="tp-btn tp-btn-danger"
            onClick={() => {
              if (window.confirm('¿Descartar esta grabación? No se puede recuperar.')) onDiscard();
            }}
          >
            <Trash2 size={18} /> Descartar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Prompter({ script, settings, update, onExit }) {
  const stageRef = useRef(null);
  const contentRef = useRef(null);
  const videoRef = useRef(null);
  const posRef = useRef(loadPosition(script.text.length, script.id));
  const playingRef = useRef(false);
  const metricsRef = useRef({ stageH: 0, contentH: 0 });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [playing, setPlayingState] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState({ pos: 0, max: 1 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsVisibleRef = useRef(true);
  controlsVisibleRef.current = controlsVisible;
  const [now, setNow] = useState(Date.now());
  const [frozen, setFrozen] = useState(false);
  const [backupState, setBackupState] = useState('');
  const lastFrameRef = useRef(0);
  const frameCountRef = useRef(0);

  const lineH = settings.fontSize * settings.lineHeight;
  const pxPerSec = (settings.speed / 10) * settings.fontSize;
  const speedRef = useRef(pxPerSec);
  speedRef.current = pxPerSec;

  const camera = useCamera(settings, settings.cameraOn);
  const videoBps = settings.videoBitrate > 0
    ? settings.videoBitrate * 1_000_000
    : (RESOLUTIONS[settings.resolution] || RESOLUTIONS['1080']).bitrate;
  const recorder = useRecorder(camera.stream, videoBps, settings.audioBitrate * 1000);
  const wav = useWavRecorder(camera.stream, settings.wavBitDepth);
  const fullscreen = useFullscreen();
  useWakeLock();

  // ── Voz: avanzar mientras hablo / seguir mi voz ──
  const indexRef = useRef({ words: [], tops: [], headings: [], pauses: [] });
  const followTargetRef = useRef(null);
  const lastPauseRef = useRef(-1);
  const voiceModeRef = useRef('off');
  const [indexOpen, setIndexOpen] = useState(false);
  const [ownTrack, setOwnTrack] = useState(null);

  const requestedVoice = settings.voiceMode;
  const srSupported = speechRecognitionSupported();
  const srBlocked = recorder.recording && isAppleSafari();
  const wantsFollow = requestedVoice === 'follow' && srSupported && !srBlocked;
  const follow = useSpeechFollow({
    active: wantsFollow && playing,
    lang: settings.voiceLang,
    getIndex: () => indexRef.current,
    onMatch: (found, index) => {
      followTargetRef.current = index.tops[found];
    },
  });
  // Si el reconocimiento falla (permisos, sin soporte, grabando en iPhone) se usa el avance por nivel de voz
  const effectiveVoice = requestedVoice === 'follow' ? (wantsFollow && !follow.error ? 'follow' : 'talk') : requestedVoice;
  voiceModeRef.current = effectiveVoice;

  // Micrófono para medir el nivel: el de la cámara si está encendida, si no uno propio
  const needsOwnMic = effectiveVoice === 'talk' && !camera.micTrack;
  useEffect(() => {
    if (!needsOwnMic || !hasMediaDevices()) {
      setOwnTrack(null);
      return undefined;
    }
    let cancelled = false;
    let stream = null;
    const s = settingsRef.current;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: s.echoCancellation, noiseSuppression: s.noiseSuppression, autoGainControl: s.autoGainControl } })
      .then(st => {
        if (cancelled) st.getTracks().forEach(t => t.stop());
        else {
          stream = st;
          setOwnTrack(st.getAudioTracks()[0]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(t => t.stop());
      setOwnTrack(null);
    };
  }, [needsOwnMic]);
  const { speakingRef, speaking } = useSpeechLevel({
    active: effectiveVoice === 'talk',
    track: camera.micTrack || ownTrack,
    sensitivity: settings.voiceSensitivity,
  });

  // Coloca el cursor del reconocimiento en la palabra que está en la guía de lectura
  const syncCursor = useCallback(() => {
    const { tops } = indexRef.current;
    if (!tops.length) return;
    let i = tops.findIndex(t => t >= posRef.current - 2);
    if (i < 0) i = tops.length - 1;
    follow.cursorRef.current = i;
    followTargetRef.current = null;
  }, [follow.cursorRef]);
  useEffect(() => {
    if (effectiveVoice === 'follow' && playing) syncCursor();
    else followTargetRef.current = null;
  }, [effectiveVoice, playing, syncCursor]);

  const maxPos = () => {
    const s = settingsRef.current;
    return Math.max(0, metricsRef.current.contentH - s.fontSize * s.lineHeight);
  };

  const setPlaying = useCallback(value => {
    playingRef.current = value;
    setPlayingState(value);
    if (!value) savePosition(posRef.current, script.text.length, script.id);
  }, [script.text.length, script.id]);

  // ── Motor de desplazamiento: requestAnimationFrame + transform (sin re-render por fotograma) ──
  useEffect(() => {
    let raf;
    let last = performance.now();
    let lastUi = 0;
    const tick = t => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const { stageH, contentH } = metricsRef.current;
      const s = settingsRef.current;
      const lh = s.fontSize * s.lineHeight;
      const max = Math.max(0, contentH - lh);
      const vm = voiceModeRef.current;
      if (posRef.current < lastPauseRef.current - 5) lastPauseRef.current = -1;
      if (playingRef.current) {
        if (vm === 'follow') {
          const target = followTargetRef.current;
          if (target != null) {
            const diff = target - posRef.current;
            const maxStep = lh * 12 * dt;
            posRef.current += clamp(diff * (1 - Math.exp(-dt * 4)), -maxStep, maxStep);
          }
        } else if (vm !== 'talk' || speakingRef.current) {
          posRef.current += speedRef.current * dt;
        }
        // Los marcadores [PAUSA] detienen la lectura al llegar a la guía
        if (s.pauseOnMarkers && vm !== 'follow') {
          const p = indexRef.current.pauses.find(t => t > lastPauseRef.current + 2 && posRef.current >= t - 1);
          if (p !== undefined) {
            posRef.current = p;
            lastPauseRef.current = p;
            setPlaying(false);
          }
        }
        if (posRef.current >= max) {
          posRef.current = max;
          setPlaying(false);
        }
      }
      posRef.current = clamp(posRef.current, 0, max);
      if (contentRef.current) {
        const guideY = (stageH * s.guidePos) / 100;
        contentRef.current.style.transform = `translate3d(0, ${guideY - lh / 2 - posRef.current}px, 0)`;
      }
      if (t - lastUi > 250) {
        lastUi = t;
        setProgress(prev => (Math.abs(prev.pos - posRef.current) < 1 && prev.max === max ? prev : { pos: posRef.current, max }));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setPlaying, speakingRef]);

  // Medidas del escenario y del texto
  useEffect(() => {
    const measure = () => {
      metricsRef.current = {
        stageH: stageRef.current?.clientHeight || 0,
        contentH: contentRef.current?.scrollHeight || 0,
      };
    };
    let indexTimer = null;
    const rebuild = () => {
      clearTimeout(indexTimer);
      indexTimer = setTimeout(() => {
        indexRef.current = buildContentIndex(contentRef.current);
      }, 200);
    };
    const measureAndIndex = () => {
      measure();
      rebuild();
    };
    measureAndIndex();
    document.fonts?.ready.then(measureAndIndex).catch(() => {});
    const ro = new ResizeObserver(measureAndIndex);
    if (stageRef.current) ro.observe(stageRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      ro.disconnect();
      clearTimeout(indexTimer);
    };
  }, []);

  // Guardar posición al salir
  useEffect(() => () => savePosition(posRef.current, script.text.length, script.id), [script.text.length, script.id]);

  // Estado del micrófono: el sistema puede silenciarlo (llamada, otra app, Siri...)
  const [micIssue, setMicIssue] = useState('');
  useEffect(() => {
    const track = camera.stream?.getAudioTracks()[0];
    if (!camera.stream) {
      setMicIssue('');
      return undefined;
    }
    if (!track) {
      setMicIssue('No llega audio del micrófono: el vídeo se grabará sin sonido.');
      return undefined;
    }
    const check = () =>
      setMicIssue(track.readyState === 'ended' || track.muted ? 'El sistema ha silenciado el micrófono: el vídeo puede quedar sin sonido.' : '');
    check();
    track.addEventListener('mute', check);
    track.addEventListener('unmute', check);
    track.addEventListener('ended', check);
    return () => {
      track.removeEventListener('mute', check);
      track.removeEventListener('unmute', check);
      track.removeEventListener('ended', check);
    };
  }, [camera.stream]);

  // Si la cámara se apaga durante la grabación, el WAV se cierra con el vídeo
  useEffect(() => {
    if (!camera.stream) wav.stop();
  }, [camera.stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const audioTrack = camera.micTrack || camera.stream?.getAudioTracks()[0];
  const micLabel = audioTrack?.label || '';
  const micSettings = audioTrack?.getSettings?.() || {};
  const micInfo = [
    micSettings.sampleRate ? `${(micSettings.sampleRate / 1000).toFixed(1)} kHz` : '',
    micSettings.channelCount === 2 ? 'estéreo' : micSettings.channelCount === 1 ? 'mono' : '',
  ].filter(Boolean).join(' · ');

  // En lectura se oculta el banner de cookies de la web (vuelve al salir al editor)
  useEffect(() => {
    if (!settings.hideNotices) return undefined;
    document.body.classList.add('tp-reading');
    return () => document.body.classList.remove('tp-reading');
  }, [settings.hideNotices]);

  // Copia de seguridad de la grabación terminada (IndexedDB, solo en este dispositivo)
  useEffect(() => {
    const r = recorder.result;
    if (!r) {
      setBackupState('');
      return;
    }
    if (!settingsRef.current.backupRecordings) return;
    setBackupState('guardando');
    saveRecording({
      id: r.name,
      name: r.name,
      type: r.type.split(';')[0],
      video: r.blob,
      wav: wav.result?.blob || null,
      wavName: wav.result?.name,
    })
      .then(() => setBackupState('ok'))
      .catch(err => {
        recLog.add(`copia de seguridad: ERROR ${err?.name} ${err?.message}`);
        setBackupState('error');
      });
  }, [recorder.result, wav.result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vigilante de imagen: avisa si la cámara deja de entregar fotogramas mientras se graba
  useEffect(() => {
    const v = videoRef.current;
    if (!camera.preview || !v || !v.requestVideoFrameCallback) return undefined;
    let stopped = false;
    let handle;
    const onFrame = () => {
      frameCountRef.current += 1;
      lastFrameRef.current = Date.now();
      if (!stopped) handle = v.requestVideoFrameCallback(onFrame);
    };
    lastFrameRef.current = Date.now();
    handle = v.requestVideoFrameCallback(onFrame);
    return () => {
      stopped = true;
      v.cancelVideoFrameCallback?.(handle);
    };
  }, [camera.preview]);

  useEffect(() => {
    if (!recorder.recording) {
      setFrozen(false);
      return undefined;
    }
    lastFrameRef.current = Date.now();
    frameCountRef.current = 0;
    const v = videoRef.current;
    const stream = camera.stream;
    const vt = stream?.getVideoTracks()[0];
    const at = stream?.getAudioTracks()[0];
    const events = [];
    const listen = (target, name, label) => {
      if (!target) return;
      const fn = () => recLog.add(`EVENTO ${label}: ${name} | ${target.readyState ? 'estado=' + target.readyState : ''} ${target.muted !== undefined ? 'muted=' + target.muted : ''}`);
      target.addEventListener(name, fn);
      events.push(() => target.removeEventListener(name, fn));
    };
    ['mute', 'unmute', 'ended'].forEach(n => {
      listen(vt, n, 'pista vídeo');
      listen(at, n, 'pista audio');
    });
    const onVis = () => recLog.add(`EVENTO página: visibilidad=${document.visibilityState}`);
    const onHide = () => recLog.add('EVENTO página: pagehide');
    const onErr = e => recLog.add(`ERROR página: ${e.message || e.reason}`);
    const onFs = () => recLog.add(`EVENTO pantalla completa: ${!!document.fullscreenElement}`);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    document.addEventListener('fullscreenchange', onFs);
    let sec = 0;
    let lastFrames = 0;
    const id = setInterval(() => {
      sec += 1;
      const stalled = Date.now() - lastFrameRef.current > 2000;
      setFrozen(stalled);
      const q = v?.getVideoPlaybackQuality?.();
      const frames = frameCountRef.current;
      recLog.add(
        `seg ${sec}: fotogramas=${frames - lastFrames}/s${stalled ? ' ¡SIN IMAGEN!' : ''} vídeo=${vt?.readyState}${vt?.muted ? '(muted)' : ''} audio=${at?.readyState}${at?.muted ? '(muted)' : ''} ` +
          `preview t=${v ? v.currentTime.toFixed(1) : '-'} rs=${v?.readyState ?? '-'} perdidos=${q ? q.droppedVideoFrames : '-'} ` +
          `controles=${controlsVisibleRef.current ? 'visibles' : 'ocultos'} panel=${panelOpen ? 'abierto' : 'cerrado'}`
      );
      lastFrames = frames;
    }, 1000);
    return () => {
      clearInterval(id);
      events.forEach(fn => fn());
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onErr);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [recorder.recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vídeo de la cámara
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // El vídeo de la vista previa solo se reasigna si cambia la cámara, no al cambiar el audio
    if (v.srcObject !== (camera.preview || null)) v.srcObject = camera.preview || null;
    if (camera.preview) v.play?.().catch(() => {});
  }, [camera.preview, settings.cameraOn]);

  // ── Cuenta atrás y reproducción ──
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setPlaying(true);
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown, setPlaying]);

  // La cuenta atrás se usa al empezar desde el principio y al grabar; al reanudar, solo si se pide
  const start = useCallback((withCountdown = false) => {
    if (posRef.current >= maxPos() - 1) posRef.current = 0;
    const s = settingsRef.current;
    const useCountdown = withCountdown || posRef.current < 1 || s.countdownOnResume;
    if (useCountdown && s.countdown > 0) setCountdown(s.countdown);
    else setPlaying(true);
  }, [setPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    if (countdown > 0) {
      setCountdown(0);
      return;
    }
    if (playingRef.current) setPlaying(false);
    else start();
  }, [countdown, setPlaying, start]);

  const restart = useCallback(() => {
    setCountdown(0);
    setPlaying(false);
    posRef.current = 0;
    lastPauseRef.current = -1;
    followTargetRef.current = null;
  }, [setPlaying]);

  const changeSpeed = useCallback(delta => update({ speed: clamp(settingsRef.current.speed + delta, 1, 40) }), [update]);
  const changeFont = useCallback(delta => update({ fontSize: clamp(settingsRef.current.fontSize + delta, 18, 160) }), [update]);

  // Saltos entre secciones (títulos y separadores del guion)
  const jumpSection = useCallback(dir => {
    const content = contentRef.current;
    if (!content) return;
    const tops = Array.from(content.querySelectorAll('h1, h2, h3, hr')).map(el => el.offsetTop);
    const s = settingsRef.current;
    const slack = (s.fontSize * s.lineHeight) / 2;
    const pos = posRef.current;
    if (dir > 0) {
      const next = tops.find(t => t > pos + slack);
      posRef.current = next ?? maxPos();
    } else {
      const prev = tops.filter(t => t < pos - slack).pop();
      posRef.current = prev ?? 0;
    }
    followTargetRef.current = null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Se cierra el panel (y su medidor de audio) antes de grabar: en iPhone, tener Web Audio
  // escuchando el micrófono a la vez que MediaRecorder puede dejar el vídeo sin sonido
  const startRecording = useCallback(() => {
    unlockAudio();
    setPanelOpen(false);
    setTimeout(() => {
      const s = settingsRef.current;
      recLog.start('--- registro de grabación ---');
      recLog.add(`navegador: ${navigator.userAgent}`);
      recLog.add(`pantalla: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x, visibilidad=${document.visibilityState}`);
      recLog.add(`ajustes: res=${s.resolution} fps=${s.fps} cámara=${s.cameraSource} vídeoMbps=${s.videoBitrate || 'auto'} audioKbps=${s.audioBitrate} Hz=${s.audioSampleRate || 'auto'} canales=${s.audioChannels || 'auto'}`);
      recLog.add(`audio: ganancia=${s.micGain}dB agc=${s.autoGainControl} ruido=${s.noiseSuppression} eco=${s.echoCancellation} WAV=${s.wavRecord ? s.wavBitDepth + 'bits' : 'no'} medidor=${s.showMicMeter} modoLigero=${s.liteWhileRecording} velocidad=${s.speed}`);
      if (recorder.start()) {
        if (s.wavRecord) {
          const ok = wav.start();
          recLog.add(`WAV iniciado: ${ok}`);
        }
        start(true);
      }
    }, 250);
  }, [recorder, wav, start]);

  const stopRecording = useCallback(() => {
    recLog.add('el usuario pulsa parar');
    recorder.stop();
    wav.stop();
    setCountdown(0);
    setPlaying(false);
  }, [recorder, wav, setPlaying]);

  const exit = useCallback(() => {
    if (recorder.recording && !window.confirm('Se está grabando. ¿Parar la grabación y salir?')) return;
    if (recorder.result && !window.confirm('Tienes una grabación sin guardar. ¿Salir y descartarla?')) return;
    wav.stop();
    recorder.stop();
    wav.discard();
    recorder.discard();
    setPlaying(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onExit();
  }, [recorder, wav, setPlaying, onExit]);

  // ── Teclado (también pedales y mandos Bluetooth, que envían teclas) ──
  useEffect(() => {
    const onKey = e => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case ' ':
        case 'Enter':
        case 'k':
          togglePlay();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          changeSpeed(1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          changeSpeed(-1);
          break;
        case 'PageDown':
          jumpSection(1);
          break;
        case 'PageUp':
          jumpSection(-1);
          break;
        case 'Home':
          restart();
          break;
        case '+':
        case '=':
          changeFont(4);
          break;
        case '-':
        case '_':
          changeFont(-4);
          break;
        case 'm':
          update({ mirrorH: !settingsRef.current.mirrorH });
          break;
        case 'Escape':
          if (panelOpen) setPanelOpen(false);
          else if (!document.fullscreenElement) exit();
          return;
        default:
          return;
      }
      e.preventDefault();
      setControlsVisible(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, changeSpeed, jumpSection, restart, changeFont, update, exit, panelOpen]);

  // Controles que se ocultan solos mientras se lee
  useEffect(() => {
    if (!playing || panelOpen || settings.controlsPinned) {
      setControlsVisible(true);
      return undefined;
    }
    if (!controlsVisible) return undefined;
    const id = setTimeout(() => setControlsVisible(false), settings.controlsHideDelay * 1000);
    return () => clearTimeout(id);
  }, [playing, panelOpen, controlsVisible, settings.controlsPinned, settings.controlsHideDelay]);

  // Reloj de la grabación
  useEffect(() => {
    if (!recorder.recording) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [recorder.recording]);

  // ── Arrastre y rueda para mover el texto a mano; un toque pausa o reanuda ──
  const dragRef = useRef(null);
  const onPointerDown = e => {
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = { y: e.clientY, startPos: posRef.current, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = e => {
    const drag = dragRef.current;
    if (!drag) {
      if (e.pointerType === 'mouse') setControlsVisible(true);
      return;
    }
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 6) drag.moved = true;
    if (drag.moved) {
      const sign = settingsRef.current.mirrorV ? -1 : 1;
      posRef.current = clamp(drag.startPos - dy * sign, 0, maxPos());
    }
  };
  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.moved) {
      lastPauseRef.current = -1;
      syncCursor();
    }
    if (drag && !drag.moved) {
      // Con la barra oculta, el primer toque solo la muestra; el segundo pausa o reanuda
      if (!controlsVisibleRef.current && settingsRef.current.tapWakesControls) {
        setControlsVisible(true);
        return;
      }
      setControlsVisible(true);
      togglePlay();
    }
  };
  const onWheel = e => {
    const sign = settingsRef.current.mirrorV ? -1 : 1;
    posRef.current = clamp(posRef.current + e.deltaY * sign, 0, maxPos());
  };

  const remaining = (progress.max - progress.pos) / pxPerSec;
  const pct = progress.max > 0 ? (progress.pos / progress.max) * 100 : 0;
  const guideTop = `calc(${settings.guidePos}% - ${lineH / 2}px)`;
  const cameraActive = settings.cameraOn && !!camera.stream;

  const stageStyle = {
    '--tp-text': settings.textColor,
    backgroundColor: cameraActive ? 'transparent' : settings.bgColor,
  };
  const mirrorStyle = {
    transform: `scale(${settings.mirrorH ? -1 : 1}, ${settings.mirrorV ? -1 : 1})`,
  };
  if (settings.fadeRead) {
    const g = `${settings.guidePos}%`;
    const mask = `linear-gradient(to bottom, rgba(0,0,0,.28) 0, rgba(0,0,0,.28) calc(${g} - ${lineH * 1.2}px), #000 calc(${g} - ${lineH * 0.5}px), #000 100%)`;
    mirrorStyle.WebkitMaskImage = mask;
    mirrorStyle.maskImage = mask;
  }
  const contentStyle = {
    width: `${settings.width}%`,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
    textAlign: settings.align,
    color: settings.textColor,
    textTransform: settings.uppercase ? 'uppercase' : 'none',
    textShadow: settings.textShadow ? '0 2px 4px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.6)' : 'none',
  };

  return (
    <div
      className={`tp-prompter${controlsVisible ? '' : ' is-idle'}${recorder.recording && settings.liteWhileRecording ? ' is-lite' : ''}`}
      style={stageStyle}
    >
      {settings.cameraOn && (
        <div className="tp-camera">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              transform: settings.cameraMirror ? 'scaleX(-1)' : 'none',
              objectFit: settings.cameraFit === 'contain' ? 'contain' : 'cover',
            }}
          />
          <div className="tp-camera-dim" style={{ opacity: settings.cameraDim }} />
        </div>
      )}

      <div
        className="tp-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
        onWheel={onWheel}
      >
        <div className="tp-mirror" style={mirrorStyle}>
          <div className="tp-content" ref={contentRef} style={contentStyle}>
            <ScriptView text={script.text} format={script.format} />
            <div className="tp-end">— Fin —</div>
          </div>
          {settings.guideStyle === 'band' && <div className="tp-guide-band" style={{ top: guideTop, height: lineH }} />}
          {settings.guideStyle === 'line' && (
            <div className="tp-guide-arrows" style={{ top: guideTop, height: lineH }}>
              <span className="tp-arrow-left" />
              <span className="tp-arrow-right" />
            </div>
          )}
        </div>
      </div>

      <div className="tp-progress" aria-hidden="true">
        <div className="tp-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      {countdown > 0 && <div className="tp-countdown" aria-live="assertive">{countdown}</div>}

      {settings.cameraOn && !panelOpen && (camera.error || micIssue) && !(settings.hideNotices && (playing || recorder.recording || countdown > 0)) && (
        <div className="tp-toast">{camera.error || micIssue}</div>
      )}

      <div className="tp-bottom">
        {(cameraActive || requestedVoice !== 'off') && (
          <div className="tp-status" aria-live="polite">
            {recorder.recording && (
              <span className="tp-rec-badge">
                <span className="tp-rec-dot" /> REC {formatTime((now - recorder.startedAt) / 1000)}
              </span>
            )}
            {cameraActive && settings.showMicMeter && camera.stream && (
              <span className="tp-status-meter">
                <MicMeter stream={camera.stream} />
              </span>
            )}
            {frozen && <span className="tp-status-warn">⚠ La cámara no entrega imagen: para y baja resolución o fps</span>}
            {requestedVoice !== 'off' && (
              <span className="tp-status-voice">
                {effectiveVoice === 'follow' ? (follow.listening ? '🎤 siguiendo' : '🎤 esperando') : speaking ? '🎤 hablando' : '🎤 en silencio'}
                {requestedVoice === 'follow' && effectiveVoice === 'talk' ? ' (modo avance)' : ''}
              </span>
            )}
            {cameraActive && <span className="tp-status-mic" title={micInfo}>{micLabel ? `🎙 ${micLabel}` : '🎙 sin micrófono'}</span>}
          </div>
        )}
        <div className="tp-controls" role="toolbar" aria-label="Controles del teleprompter">
        <div className="tp-controls-group">
          <button type="button" className="tp-ctrl" onClick={exit} aria-label="Volver al editor" title="Volver al editor (Esc)">
            <ArrowLeft size={22} />
          </button>
          <button type="button" className="tp-ctrl" onClick={restart} aria-label="Volver al inicio" title="Al inicio (Inicio)">
            <RotateCcw size={20} />
          </button>
          <button type="button" className="tp-ctrl" onClick={() => jumpSection(-1)} aria-label="Sección anterior" title="Sección anterior (RePág)">
            <ChevronUp size={22} />
          </button>
          <button type="button" className="tp-ctrl tp-ctrl-play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} title="Reproducir / pausar (espacio)">
            {playing || countdown > 0 ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button type="button" className="tp-ctrl" onClick={() => jumpSection(1)} aria-label="Sección siguiente" title="Sección siguiente (AvPág)">
            <ChevronDown size={22} />
          </button>
          <button type="button" className={`tp-ctrl${indexOpen ? ' is-on' : ''}`} onClick={() => setIndexOpen(o => !o)} aria-label="Índice de secciones" title="Índice de secciones">
            <ListOrdered size={20} />
          </button>
        </div>

        <div className="tp-controls-group">
          <div className="tp-stepper" title="Velocidad (flechas arriba y abajo)">
            <button type="button" className="tp-ctrl" onClick={() => changeSpeed(-1)} aria-label="Más lento"><Minus size={18} /></button>
            <span className="tp-stepper-value"><small>Vel.</small>{settings.speed}</span>
            <button type="button" className="tp-ctrl" onClick={() => changeSpeed(1)} aria-label="Más rápido"><Plus size={18} /></button>
          </div>
          <div className="tp-stepper" title="Tamaño de letra (+ y −)">
            <button type="button" className="tp-ctrl" onClick={() => changeFont(-4)} aria-label="Letra más pequeña"><Minus size={18} /></button>
            <span className="tp-stepper-value"><small>Letra</small>{settings.fontSize}</span>
            <button type="button" className="tp-ctrl" onClick={() => changeFont(4)} aria-label="Letra más grande"><Plus size={18} /></button>
          </div>
          <span className="tp-time" title="Tiempo restante a esta velocidad">−{formatTime(remaining)}</span>
        </div>

        <div className="tp-controls-group">
          <button
            type="button"
            className={`tp-ctrl${requestedVoice !== 'off' ? ' is-on' : ''}`}
            onClick={() => {
              unlockAudio();
              update({ voiceMode: requestedVoice === 'off' ? settings.voiceLast || 'talk' : 'off' });
            }}
            aria-label={requestedVoice === 'off' ? 'Activar control por voz' : 'Desactivar control por voz'}
            title="Control por voz"
          >
            {requestedVoice === 'off' ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            type="button"
            className={`tp-ctrl${settings.mirrorH ? ' is-on' : ''}`}
            onClick={() => update({ mirrorH: !settings.mirrorH })}
            aria-label="Espejo horizontal"
            title="Espejo (M)"
          >
            <FlipHorizontal2 size={20} />
          </button>
          {hasMediaDevices() && (
            <button
              type="button"
              className={`tp-ctrl${settings.cameraOn ? ' is-on' : ''}`}
              onClick={() => {
                unlockAudio();
                if (!recorder.recording) update({ cameraOn: !settings.cameraOn });
              }}
              aria-label={settings.cameraOn ? 'Apagar cámara' : 'Encender cámara'}
              title="Cámara"
            >
              {settings.cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>
          )}
          {cameraActive && recorder.supported && (
            recorder.recording ? (
              <button type="button" className="tp-ctrl tp-ctrl-rec is-recording" onClick={stopRecording} aria-label="Parar grabación" title="Parar grabación">
                <Square size={18} fill="currentColor" />
              </button>
            ) : (
              <button type="button" className="tp-ctrl tp-ctrl-rec" onClick={startRecording} aria-label="Grabar" title="Grabar (empieza la cuenta atrás)">
                <Circle size={20} fill="currentColor" />
              </button>
            )
          )}
          {fullscreen.supported && (
            <button type="button" className="tp-ctrl" onClick={fullscreen.toggle} aria-label="Pantalla completa" title="Pantalla completa">
              {fullscreen.active ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          )}
          <button
            type="button"
            className={`tp-ctrl${settings.controlsPinned ? ' is-on' : ''}`}
            onClick={() => update({ controlsPinned: !settings.controlsPinned })}
            aria-label={settings.controlsPinned ? 'Soltar la barra de herramientas' : 'Fijar la barra de herramientas'}
            aria-pressed={settings.controlsPinned}
            title={settings.controlsPinned ? 'Barra fija (pulsa para que se oculte sola)' : 'Fijar la barra para que no se oculte'}
          >
            {settings.controlsPinned ? <Pin size={20} /> : <PinOff size={20} />}
          </button>
          <button type="button" className={`tp-ctrl${panelOpen ? ' is-on' : ''}`} onClick={() => setPanelOpen(o => !o)} aria-label="Ajustes" title="Ajustes">
            <Settings2 size={20} />
          </button>
        </div>
      </div>
      </div>

      {indexOpen && (
        <div className="tp-index" role="dialog" aria-label="Índice de secciones">
          <header className="tp-panel-header">
            <h2>Secciones</h2>
            <button type="button" className="tp-icon-btn" onClick={() => setIndexOpen(false)} aria-label="Cerrar índice"><X size={18} /></button>
          </header>
          {indexRef.current.headings.length === 0 && <p className="tp-hint" style={{ padding: 12 }}>Añade títulos con # o ## para tener un índice.</p>}
          <ul>
            {indexRef.current.headings.map((h, i) => (
              <li key={i} style={{ paddingLeft: (h.level - 1) * 14 }}>
                <button
                  type="button"
                  onClick={() => {
                    posRef.current = h.top;
                    lastPauseRef.current = -1;
                    followTargetRef.current = null;
                    syncCursor();
                    setIndexOpen(false);
                  }}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {panelOpen && (
        <SettingsPanel
          settings={settings}
          update={update}
          onClose={() => setPanelOpen(false)}
          camera={hasMediaDevices() ? camera : null}
          recording={recorder.recording}
        />
      )}

      {recorder.result && (
        <RecordingResult
          result={recorder.result}
          wav={wav.result}
          backup={backupState}
          onDiscard={() => {
            if (recorder.result) deleteRecording(recorder.result.name);
            recorder.discard();
            wav.discard();
          }}
        />
      )}
    </div>
  );
}
