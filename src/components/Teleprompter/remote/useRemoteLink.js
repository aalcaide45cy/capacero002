import { useEffect, useRef, useState } from 'react';
import { connectCamera } from './rtc';
import { recLog } from '../recLog';

// Lado del móvil: conecta con el monitor del PC, le manda el guion y por dónde vas, y obedece sus órdenes.
//  id        código de la sala (viene en el QR)
//  track     pista de vídeo de la cámara (la vista previa)
//  api       { toggle, play, pause, record, stop, restart, faster, slower, next, prev }
//  getState  () => estado de la lectura que se manda al PC unas 5 veces por segundo
//  script    { id, name, text, format }
export function useRemoteLink({ id, track, api, getState, script }) {
  const [status, setStatus] = useState(id ? 'esperando' : 'idle');
  const connRef = useRef(null);
  const apiRef = useRef(api);
  const getStateRef = useRef(getState);
  const scriptRef = useRef(script);
  const trackRef = useRef(track);
  apiRef.current = api;
  getStateRef.current = getState;
  scriptRef.current = script;
  trackRef.current = track;
  const hasTrack = !!track;

  // La conexión se abre cuando hay cámara y se cierra al salir
  useEffect(() => {
    if (!id || !hasTrack) return undefined;
    let cancelled = false;
    let timer = null;
    let conn = null;
    let opened = false;

    const afterOpen = () => {
      if (!conn || !opened || cancelled) return;
      conn.send({ t: 'hello', v: 1 });
      sendScript();
      clearInterval(timer);
      timer = setInterval(() => conn.send({ t: 'state', ...getStateRef.current() }), 200);
    };

    const sendScript = () => {
      const s = scriptRef.current;
      conn?.send({ t: 'script', id: s.id, name: s.name, text: s.text, format: s.format });
    };

    setStatus('conectando');
    recLog.add(`monitor remoto: conectando con la sala ${id}`);
    connectCamera({
      id,
      track: trackRef.current,
      onMessage: m => {
        if (m.t === 'cmd' && apiRef.current[m.c]) {
          recLog.add(`monitor remoto: orden «${m.c}»`);
          apiRef.current[m.c]();
        } else if (m.t === 'need-script') {
          sendScript();
        }
      },
      onStatus: s => {
        if (cancelled) return;
        setStatus(s);
        if (s === 'conectado') {
          opened = true;
          afterOpen();
        }
        if (s === 'cerrado' || s === 'error') clearInterval(timer);
      },
    })
      .then(c => {
        if (cancelled) {
          c.close();
          return;
        }
        conn = c;
        connRef.current = c;
        afterOpen();
      })
      .catch(err => {
        if (cancelled) return;
        recLog.add(`monitor remoto: ERROR ${err?.message}`);
        setStatus(err?.status === 404 ? 'caducado' : 'error');
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      conn?.close();
      connRef.current = null;
    };
  }, [id, hasTrack]);

  // Si la cámara se reinicia (otra pista), se cambia la imagen que se manda sin volver a conectar
  useEffect(() => {
    if (track) connRef.current?.replaceTrack?.(track);
  }, [track]);

  return { status };
}
