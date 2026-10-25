import { useEffect, useRef, useState } from 'react';
import { getAudioContext } from './audioCtx';
import { findPosition, normalizeText } from './voiceMatch';
import { recLog } from './recLog';

const percentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

// Detecta cuándo hablas midiendo el nivel del micrófono (vale en cualquier navegador).
// Se adapta al ruido de la sala: hablas si superas el ruido de fondo en «sensitivity» dB.
export function useSpeechLevel({ active, track, sensitivity, hold = 700 }) {
  const speakingRef = useRef(false);
  const rateRef = useRef(0); // sílabas por segundo (suavizado), 0 si aún no hay estimación
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const ctx = getAudioContext();
    if (!active || !track || !ctx) {
      speakingRef.current = false;
      rateRef.current = 0;
      setSpeaking(false);
      return undefined;
    }
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    const history = [];
    const env = []; // envolvente de energía (dB), una muestra cada 25 ms
    const peaks = []; // instantes de las sílabas detectadas
    const speechTicks = []; // instantes en los que se estaba hablando
    let lastSpeech = 0;
    let lastPeak = 0;
    let shown = false;
    const id = setInterval(() => {
      const now = Date.now();
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const db = 20 * Math.log10(Math.sqrt(sum / data.length) || 1e-6);
      history.push(db);
      if (history.length > 160) history.shift();
      const floor = history.length > 20 ? percentile(history, 0.1) : -60;
      const loud = db > Math.max(floor + sensitivity, -52);
      if (loud) lastSpeech = now;
      const isSpeaking = now - lastSpeech < hold;
      speakingRef.current = isSpeaking;
      if (isSpeaking !== shown) {
        shown = isSpeaking;
        setSpeaking(isSpeaking);
      }

      // Sílabas: cada vez que la energía sube y baja (pico) con voz, a un mínimo de 110 ms del anterior
      env.push(db);
      if (env.length > 8) env.shift();
      // El tiempo hablado para el ritmo no incluye la espera larga de «isSpeaking»: solo huecos cortos entre sílabas
      if (now - lastSpeech < 250) speechTicks.push(now);
      if (env.length >= 3) {
        const [p2, p1, p0] = env.slice(-3);
        const recentMin = Math.min(...env);
        if (p1 > p2 && p1 >= p0 && p1 - recentMin >= 3 && p1 > floor + sensitivity * 0.6 && now - lastPeak > 110) {
          peaks.push(now);
          lastPeak = now;
        }
      }
      while (peaks.length && now - peaks[0] > 4000) peaks.shift();
      while (speechTicks.length && now - speechTicks[0] > 4000) speechTicks.shift();
      const spokenSeconds = speechTicks.length * 0.025;
      if (spokenSeconds >= 1.2 && peaks.length >= 4) {
        const instant = peaks.length / spokenSeconds;
        rateRef.current = rateRef.current ? rateRef.current * 0.85 + instant * 0.15 : instant;
      }
    }, 25);
    return () => {
      clearInterval(id);
      source.disconnect();
      analyser.disconnect();
      speakingRef.current = false;
      rateRef.current = 0;
    };
  }, [active, track, sensitivity, hold]);

  return { speakingRef, rateRef, speaking };
}

export const speechRecognitionSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Reconocimiento de voz del navegador: coloca el texto donde vas leyendo.
export function useSpeechFollow({ active, lang, getIndex, onMatch, track }) {
  const [state, setState] = useState({ listening: false, error: '', heard: '' });
  const cursorRef = useRef(0);
  const callbacks = useRef({});
  callbacks.current = { getIndex, onMatch };
  const trackRef = useRef(null);
  trackRef.current = track || null;

  useEffect(() => {
    if (!active || !speechRecognitionSupported()) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let stopped = false;
    let rec = null;
    let restartTimer = null;
    let quickEnds = 0;
    let startedAt = 0;

    const begin = () => {
      if (stopped) return;
      rec = new SR();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
        startedAt = Date.now();
        setState(s => ({ ...s, listening: true, error: '' }));
        recLog.add('voz: reconocimiento iniciado');
      };
      rec.onresult = e => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) transcript += `${e.results[i][0].transcript} `;
        const spoken = normalizeText(transcript);
        if (!spoken.length) return;
        setState(s => ({ ...s, heard: transcript.trim().slice(-60) }));
        const index = callbacks.current.getIndex();
        if (!index?.words.length) return;
        const found = findPosition(index.words, cursorRef.current, spoken);
        if (found >= 0) {
          cursorRef.current = found;
          callbacks.current.onMatch(found, index);
        }
      };
      rec.onerror = e => {
        recLog.add(`voz: error ${e.error}`);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true;
          setState({ listening: false, error: 'El navegador no deja usar el reconocimiento de voz (permiso del micrófono).', heard: '' });
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setState(s => ({ ...s, error: `Reconocimiento: ${e.error}` }));
        }
      };
      rec.onend = () => {
        // Si se cierra enseguida varias veces seguidas, el sistema no deja usarlo (Dictado apagado, app instalada...)
        quickEnds = Date.now() - startedAt < 1200 ? quickEnds + 1 : 0;
        if (quickEnds >= 3 && !stopped) {
          stopped = true;
          recLog.add('voz: el reconocimiento se cierra solo');
          setState({ listening: false, error: 'El iPhone cierra el reconocimiento al instante (mira el diagnóstico en Ajustes → Voz).', heard: '' });
          return;
        }
        setState(s => ({ ...s, listening: false }));
        // El reconocimiento se corta solo tras unos segundos: se reinicia mientras siga activo
        if (!stopped) restartTimer = setTimeout(begin, 250);
      };
      try {
        // Con una pista de audio el reconocimiento escucha ese mismo micrófono (si el navegador lo admite)
        const t = trackRef.current;
        if (t) {
          recLog.add('voz: start(pista de audio)');
          rec.start(t);
        } else rec.start();
      } catch (err) {
        recLog.add(`voz: start falló ${err?.name} ${err?.message}`);
        restartTimer = setTimeout(begin, 500);
      }
    };
    begin();

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      if (rec) {
        rec.onend = null;
        rec.onresult = null;
        try {
          rec.abort();
        } catch {
          // ya parado
        }
      }
      setState({ listening: false, error: '', heard: '' });
    };
  }, [active, lang]);

  return { ...state, cursorRef };
}
