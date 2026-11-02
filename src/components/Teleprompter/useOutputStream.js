import { useEffect, useRef, useState } from 'react';
import { recLog } from './recLog';

// Formato del vídeo grabado distinto al de la cámara: p. ej. iPhone en vertical pero vídeo horizontal.
//  - 'crop': recorta una franja 16:9 del encuadre vertical (se puede subir o bajar con «cropY»)
//  - 'bars': el encuadre completo en un fondo 16:9 con barras negras a los lados
// Se dibuja el vídeo de la cámara en un canvas y se graba el canvas junto al audio original.

export const canvasOutputSupported = () =>
  typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;

const even = n => Math.max(2, Math.round(n / 2) * 2);

// Rectángulo de origen y tamaño de salida para un fotograma de vw × vh
export function outputGeometry(format, vw, vh, cropY, scale) {
  const target = 16 / 9;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  let ow;
  let oh;
  let dx = 0;
  let dy = 0;
  let dw;
  let dh;
  if (format === 'crop') {
    if (vw / vh > target) {
      sh = vh;
      sw = Math.round(vh * target);
      sx = Math.round((vw - sw) / 2);
    } else {
      sw = vw;
      sh = Math.round(vw / target);
      sy = Math.round((vh - sh) * (cropY / 100));
    }
    ow = sw;
    oh = sh;
    dw = ow;
    dh = oh;
  } else {
    // barras: el encuadre completo, centrado, en un lienzo 16:9
    if (vw / vh >= target) {
      ow = vw;
      oh = Math.round(vw / target);
    } else {
      oh = vh;
      ow = Math.round(vh * target);
    }
    dw = vw;
    dh = vh;
    dx = Math.round((ow - dw) / 2);
    dy = Math.round((oh - dh) / 2);
  }
  if (scale === '1080') {
    const k = 1920 / ow;
    ow = 1920;
    oh = 1080;
    dx = Math.round(dx * k);
    dy = Math.round(dy * k);
    dw = Math.round(dw * k);
    dh = Math.round(dh * k);
  } else if (scale === '2160') {
    const k = 3840 / ow;
    ow = 3840;
    oh = 2160;
    dx = Math.round(dx * k);
    dy = Math.round(dy * k);
    dw = Math.round(dw * k);
    dh = Math.round(dh * k);
  }
  return { sx, sy, sw, sh, ow: even(ow), oh: even(oh), dx, dy, dw, dh };
}

export function useOutputStream({ stream, videoRef, format, cropY, scale, fps }) {
  const [out, setOut] = useState(null);
  const ctxRef = useRef(null);
  const settingsRef = useRef({});
  settingsRef.current = { format, cropY, scale };

  useEffect(() => {
    if (format === 'normal' || !stream || !canvasOutputSupported()) {
      setOut(null);
      return undefined;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const canvasStream = canvas.captureStream(fps || 30);
    ctxRef.current = { canvas, ctx };
    const composed = new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()]);
    setOut(composed);
    recLog.add(`salida en canvas: formato=${format} (${canvasStream.getVideoTracks().length} pista de vídeo)`);

    // Bucle de dibujo: un fotograma por cada fotograma nuevo de la cámara
    const v = videoRef.current;
    let stopped = false;
    let handle = 0;
    let usingRvfc = false;
    let lastDims = '';
    const draw = () => {
      if (stopped) return;
      const el = videoRef.current || v;
      if (el && el.videoWidth && el.videoHeight) {
        const s = settingsRef.current;
        const g = outputGeometry(s.format, el.videoWidth, el.videoHeight, s.cropY, s.scale);
        if (canvas.width !== g.ow || canvas.height !== g.oh) {
          canvas.width = g.ow;
          canvas.height = g.oh;
        }
        const key = `${g.ow}x${g.oh}`;
        if (key !== lastDims) {
          lastDims = key;
          recLog.add(`salida: ${g.ow}×${g.oh} desde ${el.videoWidth}×${el.videoHeight}`);
        }
        if (s.format === 'bars') {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, g.ow, g.oh);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(el, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);
      }
      schedule();
    };
    const schedule = () => {
      const el = videoRef.current || v;
      if (el && el.requestVideoFrameCallback) {
        usingRvfc = true;
        handle = el.requestVideoFrameCallback(draw);
      } else {
        usingRvfc = false;
        handle = requestAnimationFrame(draw);
      }
    };
    schedule();

    return () => {
      stopped = true;
      const el = videoRef.current || v;
      if (usingRvfc && el?.cancelVideoFrameCallback) el.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      canvasStream.getTracks().forEach(t => t.stop());
      ctxRef.current = null;
      setOut(null);
    };
  }, [format, stream, fps, videoRef]);

  return out;
}
