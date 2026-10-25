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

function buildConstraints({ cameraSource, resolution, fps, micId, voiceProcessing }, useDeviceIds) {
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
  const audio = {
    echoCancellation: voiceProcessing,
    noiseSuppression: voiceProcessing,
    autoGainControl: voiceProcessing,
  };
  if (useDeviceIds && micId && micId !== 'default') audio.deviceId = { exact: micId };
  return { video, audio };
}

// Abre la cámara y el micrófono elegidos y mantiene la lista de dispositivos
export function useCamera(settings, enabled) {
  const [stream, setStream] = useState(null);
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

  const { cameraSource, resolution, fps, micId, voiceProcessing } = settings;

  useEffect(() => {
    if (!enabled || !hasMediaDevices()) return undefined;
    let cancelled = false;
    let current = null;
    const opts = { cameraSource, resolution, fps, micId, voiceProcessing };

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
        current = s;
        setStream(s);
        setError('');
        refreshDevices();
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();

    return () => {
      cancelled = true;
      stopStream(current);
      setStream(null);
    };
  }, [enabled, cameraSource, resolution, fps, micId, voiceProcessing, refreshDevices]);

  useEffect(() => {
    if (!hasMediaDevices()) return undefined;
    refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  return { stream, error, devices };
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
export function useRecorder(stream, bitrate) {
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
    const options = { videoBitsPerSecond: bitrate };
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
  }, [stream, bitrate, discard]);

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
