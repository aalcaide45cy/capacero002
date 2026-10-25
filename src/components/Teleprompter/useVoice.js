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
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const ctx = getAudioContext();
    if (!active || !track || !ctx) {
      speakingRef.current = false;
      setSpeaking(false);
      return undefined;
    }
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    const history = [];
    let lastSpeech = 0;
    let shown = false;
    const id = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const db = 20 * Math.log10(Math.sqrt(sum / data.length) || 1e-6);
      history.push(db);
      if (history.length > 80) history.shift();
      const floor = history.length > 10 ? percentile(history, 0.1) : -60;
      if (db > Math.max(floor + sensitivity, -52)) lastSpeech = Date.now();
      const now = Date.now() - lastSpeech < hold;
      speakingRef.current = now;
      if (now !== shown) {
        shown = now;
        setSpeaking(now);
      }
    }, 50);
    return () => {
      clearInterval(id);
      source.disconnect();
      analyser.disconnect();
      speakingRef.current = false;
    };
  }, [active, track, sensitivity, hold]);

  return { speakingRef, speaking };
}

export const speechRecognitionSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Reconocimiento de voz del navegador: coloca el texto donde vas leyendo.
export function useSpeechFollow({ active, lang, getIndex, onMatch }) {
  const [state, setState] = useState({ listening: false, error: '', heard: '' });
  const cursorRef = useRef(0);
  const callbacks = useRef({});
  callbacks.current = { getIndex, onMatch };

  useEffect(() => {
    if (!active || !speechRecognitionSupported()) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let stopped = false;
    let rec = null;
    let restartTimer = null;

    const begin = () => {
      if (stopped) return;
      rec = new SR();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
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
        setState(s => ({ ...s, listening: false }));
        // El reconocimiento se corta solo tras unos segundos: se reinicia mientras siga activo
        if (!stopped) restartTimer = setTimeout(begin, 250);
      };
      try {
        rec.start();
      } catch {
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
