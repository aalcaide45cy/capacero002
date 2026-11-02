// api/tp-rtc.js - «Saludo» WebRTC para la cámara remota del teleprompter (/tp/monitor).
//  POST { a:'create', offer }          -> { id }   el PC crea la sala con su oferta
//  GET  ?id=...                        -> { offer, answer }   el móvil lee la oferta; el PC espera la respuesta
//  POST { a:'answer', id, answer }     -> 204      el móvil responde
//  POST { a:'offer', id, offer }       -> 204      el PC pone una oferta nueva en la misma sala (reconectar sin otro QR)
//  POST { a:'ping', id }               -> 204      el PC renueva la sala mientras sigue abierto
//  POST { a:'close', id }              -> 204      cierra la sala (cerrar sesión)
// La imagen y el guion NO pasan por aquí: solo unos KB de descripción de la conexión.
import crypto from 'node:crypto';
import { createRoom, getRoom, setAnswer, deleteRoom, resetOffer, touchRoom } from './_lib/rtcStore.js';

const ORIGINS = /^https:\/\/((www\.)?capacero3d\.com|capacero002b[a-z0-9-]*\.vercel\.app)$/;
const MAX_SDP = 40000;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const newId = () => Array.from(crypto.randomBytes(10), b => ALPHABET[b % ALPHABET.length]).join('');
const validSdp = v => typeof v === 'string' && v.length > 20 && v.length <= MAX_SDP && v.includes('v=0');
// Identificador de la oferta (línea o= del SDP): la respuesta solo vale para la oferta a la que contesta
const offerId = sdp => /^o=\S+ (\d+)/m.exec(String(sdp || ''))?.[1] || '';
const validId = v => typeof v === 'string' && /^[a-z0-9]{10}$/.test(v);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const id = String(req.query?.id || '');
      if (!validId(id)) return res.status(400).json({ error: 'id' });
      const room = await getRoom(id);
      if (!room) return res.status(404).json({ error: 'caducada' });
      return res.status(200).json(room);
    }
    if (req.method !== 'POST') return res.status(405).end();
    // Solo desde nuestra propia web (en local, sin base de datos, no se comprueba)
    if (process.env.DATABASE_URL || process.env.VERCEL) {
      if (!ORIGINS.test(String(req.headers.origin || ''))) return res.status(403).end();
    }
    let b = req.body;
    if (typeof b === 'string') {
      try {
        b = JSON.parse(b);
      } catch {
        b = null;
      }
    }
    if (!b || typeof b !== 'object') return res.status(400).json({ error: 'cuerpo' });

    if (b.a === 'create') {
      if (!validSdp(b.offer)) return res.status(400).json({ error: 'oferta' });
      const id = newId();
      await createRoom(id, b.offer);
      return res.status(200).json({ id });
    }
    if (b.a === 'answer') {
      if (!validId(b.id) || !validSdp(b.answer)) return res.status(400).json({ error: 'respuesta' });
      const room = await getRoom(b.id);
      if (!room || (b.oid && String(b.oid) !== offerId(room.offer))) return res.status(409).json({ error: 'oferta antigua' });
      const ok = await setAnswer(b.id, b.answer);
      return ok ? res.status(204).end() : res.status(409).json({ error: 'sala caducada o ya usada' });
    }
    if (b.a === 'offer') {
      if (!validId(b.id) || !validSdp(b.offer)) return res.status(400).json({ error: 'oferta' });
      return (await resetOffer(b.id, b.offer)) ? res.status(204).end() : res.status(404).json({ error: 'caducada' });
    }
    if (b.a === 'ping') {
      if (!validId(b.id)) return res.status(400).json({ error: 'id' });
      return (await touchRoom(b.id)) ? res.status(204).end() : res.status(404).json({ error: 'caducada' });
    }
    if (b.a === 'close') {
      if (!validId(b.id)) return res.status(400).json({ error: 'id' });
      await deleteRoom(b.id);
      return res.status(204).end();
    }
    return res.status(400).json({ error: 'acción' });
  } catch (err) {
    console.error('tp-rtc error:', err);
    return res.status(500).json({ error: 'servidor' });
  }
}
