// Conexión WebRTC entre el móvil (cámara y teleprompter) y el PC (monitor y mando).
// El «saludo» inicial pasa por /api/tp-rtc (la web propia); la imagen y los datos van directos entre los dos aparatos.

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const CHUNK = 14000;
// Calidad de la imagen que ve el PC: lado largo máximo (px), bitrate y fotogramas
export const QUALITY = {
  baja: { side: 854, bitrate: 800_000, fps: 24 },
  media: { side: 1280, bitrate: 2_500_000, fps: 30 },
  alta: { side: 1920, bitrate: 6_000_000, fps: 30 },
  maxima: { side: 0, bitrate: 12_000_000, fps: 30 },
};

async function apiPost(body) {
  const res = await fetch('/api/tp-rtc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    const err = new Error(`api ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

async function apiGet(id) {
  const res = await fetch(`/api/tp-rtc?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`api ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Espera a que el navegador reúna las direcciones de red (en la misma wifi basta con las locales)
function waitIce(pc, ms = 2500) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    const timer = setTimeout(finish, ms);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

// Canal de datos con mensajes JSON; los grandes (el guion) se parten en trozos
function wrapChannel(dc, onMessage) {
  const partial = new Map();
  dc.onmessage = e => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (m.t === 'chunk') {
      const entry = partial.get(m.id) || { parts: [], n: m.n };
      entry.parts[m.i] = m.d;
      partial.set(m.id, entry);
      if (entry.parts.filter(p => p !== undefined).length === entry.n) {
        partial.delete(m.id);
        try {
          onMessage(JSON.parse(entry.parts.join('')));
        } catch {
          // mensaje dañado
        }
      }
      return;
    }
    onMessage(m);
  };
  return {
    send(obj) {
      if (dc.readyState !== 'open') return false;
      const s = JSON.stringify(obj);
      if (s.length <= CHUNK) {
        dc.send(s);
        return true;
      }
      const id = Math.random().toString(36).slice(2, 8);
      const n = Math.ceil(s.length / CHUNK);
      for (let i = 0; i < n; i++) dc.send(JSON.stringify({ t: 'chunk', id, i, n, d: s.slice(i * CHUNK, (i + 1) * CHUNK) }));
      return true;
    },
  };
}

// ── PC (monitor): crea la sala, enseña el QR y espera al móvil ──
// La sala (y el QR) dura mientras este monitor siga abierto: si el móvil se desconecta (apaga la cámara, pierde la wifi…)
// el PC prepara una oferta nueva en la misma sala y el móvil vuelve a conectarse solo, sin otro QR.
export async function startMonitor({ resumeId = null, onStream, onMessage, onStatus }) {
  let closed = false;
  let roomId = resumeId;
  let first = true;
  let round = 0;
  let pc = null;
  let channel = null;
  let pollTimer = null;
  let pingTimer = null;

  const makeRound = async () => {
    const my = ++round;
    clearInterval(pollTimer);
    try {
      pc?.close();
    } catch {
      // ya cerrada
    }
    const p = new RTCPeerConnection(ICE);
    pc = p;
    p.addTransceiver('video', { direction: 'recvonly' });
    const dc = p.createDataChannel('tp', { ordered: true });
    channel = wrapChannel(dc, onMessage);
    const stream = new MediaStream();
    const live = () => !closed && round === my;
    let lost = false;
    const lose = () => {
      if (!live() || lost) return;
      lost = true;
      onStatus('cerrado');
      setTimeout(() => {
        if (live()) makeRound().catch(err => live() && onStatus(err?.status === 404 ? 'caducado' : 'error'));
      }, 600);
    };
    p.ontrack = e => {
      if (!live()) return;
      stream.addTrack(e.track);
      onStream(stream);
    };
    dc.onopen = () => live() && onStatus('conectado');
    dc.onclose = lose;
    p.onconnectionstatechange = () => {
      if (!live()) return;
      if (p.connectionState === 'failed' || p.connectionState === 'closed') lose();
      else if (p.connectionState === 'disconnected') setTimeout(() => live() && p.connectionState !== 'connected' && lose(), 4000);
    };

    const offer = await p.createOffer();
    await p.setLocalDescription(offer);
    await waitIce(p);
    if (!live()) return;
    if (roomId) {
      try {
        await apiPost({ a: 'offer', id: roomId, offer: p.localDescription.sdp });
      } catch (err) {
        // Al retomar una sala guardada que ya no existe, se crea otra
        if (!(first && resumeId && err?.status === 404)) throw err;
        roomId = null;
      }
    }
    if (!roomId) roomId = (await apiPost({ a: 'create', offer: p.localDescription.sdp })).id;
    first = false;
    if (!live()) return;

    // Espera la respuesta del móvil
    pollTimer = setInterval(async () => {
      if (!live()) {
        clearInterval(pollTimer);
        return;
      }
      try {
        const room = await apiGet(roomId);
        if (room.answer && live()) {
          clearInterval(pollTimer);
          onStatus('conectando');
          await p.setRemoteDescription({ type: 'answer', sdp: room.answer });
        }
      } catch (err) {
        if (err.status === 404) {
          clearInterval(pollTimer);
          onStatus('caducado');
        }
      }
    }, 1000);
  };

  await makeRound();
  pingTimer = setInterval(() => {
    if (roomId) apiPost({ a: 'ping', id: roomId }).catch(err => err?.status === 404 && onStatus('caducado'));
  }, 2 * 60 * 1000);

  return {
    id: roomId,
    send: obj => (channel ? channel.send(obj) : false),
    // keep: solo deja de usar la sala (el QR sigue valiendo); sin keep, cierra la sesión y la borra
    close({ keep = false } = {}) {
      closed = true;
      clearInterval(pollTimer);
      clearInterval(pingTimer);
      try {
        pc?.close();
      } catch {
        // ya cerrada
      }
      if (roomId && !keep) apiPost({ a: 'close', id: roomId }).catch(() => {});
    },
  };
}

// ── Móvil (cámara): lee la oferta del QR, responde y manda la imagen ──
export async function connectCamera({ id, track, onMessage, onStatus, isCancelled = () => false }) {
  // Si el PC aún tiene la oferta de la conexión anterior (ya contestada), espera a que prepare la nueva
  let room = await apiGet(id);
  while (room.answer) {
    await new Promise(r => setTimeout(r, 1500));
    if (isCancelled()) throw new Error('cancelado');
    room = await apiGet(id);
  }
  const pc = new RTCPeerConnection(ICE);
  let channel = null;
  let closed = false;

  const ready = new Promise(resolve => {
    pc.ondatachannel = e => {
      channel = wrapChannel(e.channel, onMessage);
      e.channel.onopen = () => {
        onStatus('conectado');
        resolve();
      };
      e.channel.onclose = () => !closed && onStatus('cerrado');
    };
  });
  pc.onconnectionstatechange = () => {
    if (closed) return;
    if (pc.connectionState === 'failed') onStatus('error');
    else if (pc.connectionState === 'disconnected') onStatus('cerrado');
  };

  await pc.setRemoteDescription({ type: 'offer', sdp: room.offer });
  const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
  if (transceiver) {
    // Siempre «solo enviar»: la cámara puede estar apagada ahora y encenderse (o cambiar) después
    transceiver.direction = 'sendonly';
    if (track) await transceiver.sender.replaceTrack(track);
  }
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIce(pc);
  onStatus('conectando');
  await apiPost({ a: 'answer', id, answer: pc.localDescription.sdp, oid: /^o=\S+ (\d+)/m.exec(room.offer)?.[1] });

  // La copia que ve el PC es una vista previa: ~720p y poco bitrate para no cargar al móvil mientras graba
  let current = track;
  let level = 'media';
  let mbps = 0;
  const limitQuality = async () => {
    try {
      if (!transceiver) return;
      const p = transceiver.sender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      const w = current?.getSettings?.().width || 1280;
      const h = current?.getSettings?.().height || 720;
      const longSide = Math.max(w, h);
      const q = QUALITY[level] || QUALITY.media;
      p.encodings[0].maxBitrate = mbps > 0 ? Math.round(mbps * 1_000_000) : q.bitrate;
      p.encodings[0].maxFramerate = q.fps;
      p.encodings[0].scaleResolutionDownBy = q.side ? Math.max(1, longSide / q.side) : 1;
      await transceiver.sender.setParameters(p);
    } catch {
      // Safari antiguo: se manda con la calidad por defecto
    }
  };
  ready.then(limitQuality);

  return {
    send: obj => (channel ? channel.send(obj) : false),
    // El PC elige con qué calidad le llega la imagen (la grabación del móvil no cambia)
    // mbps > 0 fija el límite de Mbps; 0 usa el de la calidad elegida
    setQuality: (l, m = 0) => {
      if (QUALITY[l]) {
        level = l;
        mbps = Number(m) > 0 && Number(m) <= 50 ? Number(m) : 0;
        limitQuality();
      }
    },
    // Otra cámara (o apagada): se cambia la imagen que se manda sin cortar la conexión
    replaceTrack: async t => {
      current = t;
      await transceiver?.sender.replaceTrack(t).catch(() => {});
      if (t) limitQuality();
    },
    close() {
      closed = true;
      try {
        pc.close();
      } catch {
        // ya cerrada
      }
    },
  };
}
