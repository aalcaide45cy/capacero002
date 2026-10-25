import { useCallback, useEffect, useRef, useState } from 'react';

export const RESOLUTIONS = {
  '720': { label: '720p', width: 1280, height: 720, bitrate: 5_000_000 },
  '1080': { label: '1080p', width: 1920, height: 1080, bitrate: 10_000_000 },
  '2160': { label: '4K', width: 3840, height: 2160, bitrate: 35_000_000 },
};

export const hasMediaDevices = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

function stopStream(stream) {
  stream?.getTracks().forEach(t => t.stop());
}

function describeError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Permiso de cámara o micrófono denegado. Actívalo en los ajustes del navegador.';
    case 'NotFoundError':
      return 'No se ha encontrado ninguna cámara o micrófono.';
    case 'NotReadableError':
      return 'La cámara o el micrófono están en uso por otra aplicación.';
    case 'OverconstrainedError':
      return 'El dispositivo no admite esa configuración.';
    default:
      return 'No se ha podido acceder a la cámara: ' + (err?.message || err);
  }
}

function audioConstraints({ micId, echoCancellation, noiseSuppression, autoGainControl, audioSampleRate, audioChannels }, useDeviceIds) {
  const audio = { echoCancellation, noiseSuppression, autoGainControl };
  if (audioSampleRate > 0) audio.sampleRate = { ideal: audioSampleRate };
  if (audioChannels > 0) audio.channelCount = { ideal: audioChannels };
  if (useDeviceIds && micId && micId !== 'default') audio.deviceId = { exact: micId };
  return audio;
}

function buildConstraints(opts, useDeviceIds) {
  const { cameraSource, resolution, fps } = opts;
  const res = RESOLUTIONS[resolution] || RESOLUTIONS['1080'];
  const video = {
    width: { ideal: res.width },
    height: { ideal: res.height },
    frameRate: { ideal: fps },
  };
  if (cameraSource === 'user' || cameraSource === 'environment' || !useDeviceIds) {
    video.facingMode = { ideal: cameraSource === 'environment' ? 'environment' : 'user' };
  } else {
    video.deviceId = { exact: cameraSource };
  }
  return { video, audio: audioConstraints(opts, useDeviceIds) };
}

const dbToGain = db => 10 ** (db / 20);

// Ganancia de entrada por software (con limitador para no saturar). Solo se crea si la ganancia > 0 dB.
function createGainPipeline(rawTrack, gainDb) {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx || !rawTrack) return null;
  try {
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(new MediaStream([rawTrack]));
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(gainDb);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    const dest = ctx.createMediaStreamDestination();
    source.connect(gain);
    gain.connect(limiter);
    limiter.connect(dest);
    ctx.resume?.().catch(() => {});
    return {
      track: dest.stream.getAudioTracks()[0],
      setGain(db) {
        gain.gain.value = dbToGain(db);
      },
      close() {
        try {
          source.disconnect();
          limiter.disconnect();
        } catch {
          // ya desconectado
        }
        ctx.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

const audioKeyOf = o =>
  [o.micId, o.echoCancellation, o.noiseSuppression, o.autoGainControl, o.audioSampleRate, o.audioChannels, o.micGain > 0].join('|');

// Abre la cámara y el micrófono elegidos y mantiene la lista de dispositivos
export function useCamera(settings, enabled) {
  const [stream, setStream] = useState(null);
  const [micTrack, setMicTrack] = useState(null);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState({ video: [], audio: [] });

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        video: list.filter(d => d.kind === 'videoinput' && d.deviceId),
        audio: list.filter(d => d.kind === 'audioinput' && d.deviceId),
      });
    } catch {
      // Sin permisos todavía: la lista se rellena tras aceptar
    }
  }, []);

  const { cameraSource, resolution, fps } = settings;
  const streamRef = useRef(null);
  const rawAudioRef = useRef(null);
  const pipelineRef = useRef(null);
  const audioOptsRef = useRef({});
  audioOptsRef.current = {
    micId: settings.micId,
    echoCancellation: settings.echoCancellation,
    noiseSuppression: settings.noiseSuppression,
    autoGainControl: settings.autoGainControl,
    audioSampleRate: settings.audioSampleRate,
    audioChannels: settings.audioChannels,
    micGain: settings.micGain,
  };
  const audioKey = audioKeyOf(audioOptsRef.current);
  const audioKeyRef = useRef('');

  // Abre cámara y micrófono. Solo se repite si cambia la cámara, la resolución o los fps:
  // cambiar el micrófono o sus ajustes no debe tocar el vídeo (evita saltos de tamaño).
  useEffect(() => {
    if (!enabled || !hasMediaDevices()) return undefined;
    let cancelled = false;
    let raw = null;
    const opts = { cameraSource, resolution, fps, ...audioOptsRef.current };

    (async () => {
      try {
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia(buildConstraints(opts, true));
        } catch (err) {
          // Si el dispositivo elegido ya no está conectado, se usa el predeterminado
          if (err?.name !== 'OverconstrainedError' && err?.name !== 'NotFoundError') throw err;
          s = await navigator.mediaDevices.getUserMedia(buildConstraints(opts, false));
        }
        if (cancelled) {
          stopStream(s);
          return;
        }
        raw = s;
        const rawAudio = s.getAudioTracks()[0] || null;
        const pipeline = opts.micGain > 0 ? createGainPipeline(rawAudio, opts.micGain) : null;
        pipelineRef.current = pipeline;
        rawAudioRef.current = rawAudio;
        const final = pipeline ? new MediaStream([...s.getVideoTracks(), pipeline.track]) : s;
        streamRef.current = final;
        audioKeyRef.current = audioKeyOf(opts);
        setMicTrack(rawAudio);
        setStream(final);
        setError('');
        refreshDevices();
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();

    return () => {
      cancelled = true;
      pipelineRef.current?.close();
      pipelineRef.current = null;
      rawAudioRef.current = null;
      stopStream(raw);
      streamRef.current = null;
      setStream(null);
      setMicTrack(null);
    };
  }, [enabled, cameraSource, resolution, fps, refreshDevices]);

  // Cambio de micrófono, procesado o ganancia: se sustituye solo la pista de audio
  useEffect(() => {
    const base = streamRef.current;
    if (!base || audioKeyRef.current === audioKey) return undefined;
    let cancelled = false;
    (async () => {
      const o = audioOptsRef.current;
      const audio = audioConstraints(o, true);
      try {
        let a;
        try {
          a = await navigator.mediaDevices.getUserMedia({ audio });
        } catch (err) {
          if (err?.name !== 'OverconstrainedError' && err?.name !== 'NotFoundError') throw err;
          delete audio.deviceId;
          a = await navigator.mediaDevices.getUserMedia({ audio });
        }
        if (cancelled || streamRef.current !== base) {
          stopStream(a);
          return;
        }
        rawAudioRef.current?.stop();
        pipelineRef.current?.close();
        const rawAudio = a.getAudioTracks()[0] || null;
        const pipeline = o.micGain > 0 ? createGainPipeline(rawAudio, o.micGain) : null;
        pipelineRef.current = pipeline;
        rawAudioRef.current = rawAudio;
        const next = new MediaStream([...base.getVideoTracks(), ...(pipeline ? [pipeline.track] : a.getAudioTracks())]);
        streamRef.current = next;
        audioKeyRef.current = audioKey;
        setMicTrack(rawAudio);
        setStream(next);
        setError('');
        refreshDevices();
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioKey, refreshDevices]);

  // La cantidad de ganancia se aplica al instante, sin reabrir nada
  useEffect(() => {
    if (settings.micGain > 0) pipelineRef.current?.setGain(settings.micGain);
  }, [settings.micGain]);

  useEffect(() => {
    if (!hasMediaDevices()) return undefined;
    refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  return { stream, micTrack, error, devices };
}

// Safari (iPhone, iPad y Mac) tiene su propio MediaRecorder con particularidades
export const isAppleSafari = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    /^((?!chrome|chromium|crios|fxios|android|edg).)*safari/i.test(navigator.userAgent));

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  // En Safari se usa el MP4 por defecto (H.264 + AAC): forzar la lista de códecs puede dejar el audio fuera
  if (isAppleSafari()) return MediaRecorder.isTypeSupported?.('video/mp4') ? 'video/mp4' : '';
  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported?.(t)) || '';
}

function fileStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Graba el stream de la cámara con MediaRecorder; el vídeo queda solo en el dispositivo
export function useRecorder(stream, videoBps, audioBps) {
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState(null);
  const recorderRef = useRef(null);

  const discard = useCallback(() => {
    setResult(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const start = useCallback(() => {
    if (!stream || typeof MediaRecorder === 'undefined') return false;
    discard();
    const mimeType = pickMimeType();
    const options = { videoBitsPerSecond: videoBps, audioBitsPerSecond: audioBps };
    if (mimeType) options.mimeType = mimeType;
    let rec;
    try {
      rec = new MediaRecorder(stream, options);
    } catch {
      rec = new MediaRecorder(stream);
    }
    const hasAudio = stream.getAudioTracks().some(t => t.readyState === 'live');
    const chunks = [];
    rec.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        type,
        name: `teleprompter-${fileStamp()}.${ext}`,
        hasAudio,
      });
      setRecording(false);
    };
    // Safari genera mejor el MP4 de una sola pieza; el resto, por trozos de 1 s
    if (isAppleSafari()) rec.start();
    else rec.start(1000);
    recorderRef.current = rec;
    setStartedAt(Date.now());
    setRecording(true);
    return true;
  }, [stream, videoBps, audioBps, discard]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    recorderRef.current = null;
  }, []);

  // Si el stream desaparece (cámara apagada), se cierra la grabación en curso
  useEffect(() => {
    if (!stream) stop();
  }, [stream, stop]);

  useEffect(() => () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  return { recording, startedAt, result, start, stop, discard, supported: typeof MediaRecorder !== 'undefined' };
}
