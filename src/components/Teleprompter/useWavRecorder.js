import { useCallback, useEffect, useRef, useState } from 'react';
import { recLog } from './recLog';

// Grabador de audio sin comprimir (WAV PCM de 16 o 24 bits, o 32 bits flotante) a la frecuencia
// de muestreo nativa del micrófono. Va en paralelo a la grabación de vídeo (que siempre comprime
// el audio a AAC/Opus) y se descarga como archivo aparte, para sincronizarlo en el editor de vídeo.

function writeString(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function wavHeader(dataBytes, sampleRate, channels, bitDepth) {
  const isFloat = bitDepth === 32;
  const bytesPerSample = bitDepth / 8;
  const header = new DataView(new ArrayBuffer(44));
  writeString(header, 0, 'RIFF');
  header.setUint32(4, 36 + dataBytes, true);
  writeString(header, 8, 'WAVE');
  writeString(header, 12, 'fmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, isFloat ? 3 : 1, true);
  header.setUint16(22, channels, true);
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * channels * bytesPerSample, true);
  header.setUint16(32, channels * bytesPerSample, true);
  header.setUint16(34, bitDepth, true);
  writeString(header, 36, 'data');
  header.setUint32(40, dataBytes, true);
  return header.buffer;
}

// Convierte un bloque de muestras (canales intercalados) al formato elegido
function encodeBlock(channelsData, bitDepth) {
  const channels = channelsData.length;
  const frames = channelsData[0].length;
  const bytesPerSample = bitDepth / 8;
  const out = new DataView(new ArrayBuffer(frames * channels * bytesPerSample));
  let o = 0;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, channelsData[c][i]));
      if (bitDepth === 32) {
        out.setFloat32(o, s, true);
      } else if (bitDepth === 24) {
        const v = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
        out.setUint8(o, v & 0xff);
        out.setUint8(o + 1, (v >> 8) & 0xff);
        out.setUint8(o + 2, (v >> 16) & 0xff);
      } else {
        out.setInt16(o, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
      }
      o += bytesPerSample;
    }
  }
  return out.buffer;
}

function fileStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function useWavRecorder(stream, bitDepth) {
  const [result, setResult] = useState(null);
  const stateRef = useRef(null);
  const supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);

  const discard = useCallback(() => {
    setResult(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const start = useCallback(() => {
    const track = stream?.getAudioTracks()[0];
    if (!supported || !track || stateRef.current) return false;
    discard();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const trackSettings = track.getSettings?.() || {};
    let ctx;
    try {
      ctx = trackSettings.sampleRate ? new Ctx({ sampleRate: trackSettings.sampleRate }) : new Ctx();
    } catch {
      ctx = new Ctx();
    }
    const channels = Math.min(2, Math.max(1, trackSettings.channelCount || 1));
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const processor = ctx.createScriptProcessor(4096, channels, channels);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    const chunks = [];
    let bytes = 0;
    processor.onaudioprocess = e => {
      const data = [];
      for (let c = 0; c < channels; c++) data.push(new Float32Array(e.inputBuffer.getChannelData(c)));
      const block = encodeBlock(data, bitDepth);
      chunks.push(block);
      bytes += block.byteLength;
    };
    source.connect(processor);
    processor.connect(mute);
    mute.connect(ctx.destination);
    ctx.resume?.().catch(() => {});
    recLog.add(`WAV: AudioContext ${ctx.sampleRate}Hz estado=${ctx.state} canales=${channels} ${bitDepth}bits`);
    ctx.onstatechange = () => recLog.add(`WAV: AudioContext estado=${ctx.state}`);
    stateRef.current = { ctx, source, processor, mute, chunks, getBytes: () => bytes, channels, bitDepth };
    return true;
  }, [stream, supported, bitDepth, discard]);

  const stop = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    stateRef.current = null;
    st.processor.onaudioprocess = null;
    st.source.disconnect();
    st.processor.disconnect();
    st.mute.disconnect();
    const sampleRate = st.ctx.sampleRate;
    st.ctx.close().catch(() => {});
    const dataBytes = st.getBytes();
    recLog.add(`WAV: parado, ${(dataBytes / 1048576).toFixed(1)} MB`);
    const blob = new Blob([wavHeader(dataBytes, sampleRate, st.channels, st.bitDepth), ...st.chunks], { type: 'audio/wav' });
    setResult({
      blob,
      url: URL.createObjectURL(blob),
      name: `teleprompter-audio-${fileStamp()}.wav`,
      sampleRate,
      channels: st.channels,
      bitDepth: st.bitDepth,
      seconds: dataBytes / (sampleRate * st.channels * (st.bitDepth / 8)),
    });
  }, []);

  useEffect(() => () => {
    const st = stateRef.current;
    if (st) {
      stateRef.current = null;
      st.processor.onaudioprocess = null;
      st.ctx.close().catch(() => {});
    }
  }, []);

  return { result, start, stop, discard, supported };
}
