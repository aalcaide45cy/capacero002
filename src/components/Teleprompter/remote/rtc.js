// Conexión WebRTC entre el móvil (cámara y teleprompter) y el PC (monitor y mando).
// El «saludo» inicial pasa por /api/tp-rtc (la web propia); la imagen y los datos van directos entre los dos aparatos.

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const CHUNK = 14000;

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
export async function startMonitor({ onStream, onMessage, onStatus }) {
  const pc = new RTCPeerConnection(ICE);
  pc.addTransceiver('video', { direction: 'recvonly' });
  const dc = pc.createDataChannel('tp', { ordered: true });
  const channel = wrapChannel(dc, onMessage);
  const stream = new MediaStream();
  let closed = false;
  let pollTimer = null;
  let roomId = null;

  pc.ontrack = e => {
    stream.addTrack(e.track);
    onStream(stream);
  };
  dc.onopen = () => onStatus('conectado');
  dc.onclose = () => !closed && onStatus('cerrado');
  pc.onconnectionstatechange = () => {
    if (closed) return;
    if (pc.connectionState === 'failed') onStatus('error');
    else if (pc.connectionState === 'disconnected') onStatus('cerrado');
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIce(pc);
  const { id } = await apiPost({ a: 'create', offer: pc.localDescription.sdp });
  roomId = id;

  // Espera la respuesta del móvil (la sala caduca a los 15 minutos)
  const started = Date.now();
  pollTimer = setInterval(async () => {
    if (closed) return;
    if (Date.now() - started > 15 * 60 * 1000) {
      clearInterval(pollTimer);
      onStatus('caducado');
      return;
    }
    try {
      const room = await apiGet(id);
      if (room.answer) {
        clearInterval(pollTimer);
        onStatus('conectando');
        await pc.setRemoteDescription({ type: 'answer', sdp: room.answer });
      }
    } catch (err) {
      if (err.status === 404) {
        clearInterval(pollTimer);
        onStatus('caducado');
      }
    }
  }, 1000);

  return {
    id,
    send: obj => channel.send(obj),
    close() {
      closed = true;
      clearInterval(pollTimer);
      try {
        pc.close();
      } catch {
        // ya cerrada
      }
      if (roomId) apiPost({ a: 'close', id: roomId }).catch(() => {});
    },
  };
}

// ── Móvil (cámara): lee la oferta del QR, responde y manda la imagen ──
export async function connectCamera({ id, track, onMessage, onStatus }) {
  const room = await apiGet(id);
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
  if (transceiver && track) {
    transceiver.direction = 'sendonly';
    await transceiver.sender.replaceTrack(track);
  }
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIce(pc);
  onStatus('conectando');
  await apiPost({ a: 'answer', id, answer: pc.localDescription.sdp });

  // La copia que ve el PC es una vista previa: ~720p y poco bitrate para no cargar al móvil mientras graba
  const limitQuality = async () => {
    try {
      if (!transceiver) return;
      const p = transceiver.sender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      const w = track?.getSettings?.().width || 1280;
      const h = track?.getSettings?.().height || 720;
      const longSide = Math.max(w, h);
      p.encodings[0].maxBitrate = 2_500_000;
      p.encodings[0].maxFramerate = 30;
      p.encodings[0].scaleResolutionDownBy = Math.max(1, longSide / 1280);
      await transceiver.sender.setParameters(p);
    } catch {
      // Safari antiguo: se manda con la calidad por defecto
    }
  };
  ready.then(limitQuality);

  return {
    send: obj => (channel ? channel.send(obj) : false),
    replaceTrack: t => transceiver?.sender.replaceTrack(t).catch(() => {}),
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
