// Piezas visuales compartidas del módulo /dieta.
import React from 'react';
import { Sunrise, Apple, UtensilsCrossed, Cookie, Moon } from 'lucide-react';
import { round } from '../../../api/_lib/dieta/nutrition.js';

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
export const fmtDate = (ymd) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const dowOf = (ymd) => DOW[new Date(`${ymd}T00:00:00Z`).getUTCDay()];
export const longDate = (ymd) => { const [, m, d] = ymd.split('-').map(Number); return `${dowOf(ymd)}, ${d} de ${MONTH[m - 1]}`; };
export const nf = (v, d = 0) => (v == null ? '—' : Number(round(v, d)).toLocaleString('es-ES', { maximumFractionDigits: d }));
export const eur = (v) => `${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const qty = (it) => (it.units != null ? `${it.units} ud` : it.ml != null ? `${it.ml} ml` : `${it.g} g`);

export const SLOTS = {
  desayuno: { label: 'Desayuno', time: '08:30', Icon: Sunrise, tint: 'bg-amber-400/15 text-amber-300' },
  mediamanana: { label: 'Media mañana', time: '11:00', Icon: Apple, tint: 'bg-rose-400/15 text-rose-300' },
  comida: { label: 'Comida', time: '14:30', Icon: UtensilsCrossed, tint: 'bg-emerald-400/15 text-emerald-300' },
  merienda: { label: 'Merienda', time: '17:30', Icon: Cookie, tint: 'bg-orange-400/15 text-orange-300' },
  cena: { label: 'Cena', time: '21:00', Icon: Moon, tint: 'bg-indigo-400/15 text-indigo-300' }
};

export const STATUS = {
  equivalente: ['Equivalente', 'bg-emerald-400/15 text-emerald-300'],
  dentro: ['Macros iguales', 'bg-teal-400/15 text-teal-300'],
  con_diferencias: ['Cambia algo', 'bg-amber-400/15 text-amber-300'],
  datos_insuficientes: ['Por confirmar', 'bg-sky-400/15 text-sky-300'],
  no_compatible: ['No compatible', 'bg-red-400/15 text-red-300']
};

export const Card = ({ children, className = '', ...p }) => (
  <section {...p} className={`rounded-3xl bg-[#151917] ring-1 ring-white/[0.06] p-4 mb-3 ${className}`}>{children}</section>
);
export const H2 = ({ children, right }) => (
  <div className="flex items-center justify-between mb-3"><h2 className="text-[15px] font-semibold tracking-tight text-white">{children}</h2>{right}</div>
);
export const Btn = ({ kind = 'pri', className = '', ...p }) => (
  <button type="button" {...p} className={`inline-flex items-center justify-center gap-2 min-h-[46px] px-4 rounded-2xl text-[15px] font-semibold transition active:scale-[.98] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
    kind === 'pri' ? 'bg-emerald-400 text-emerald-950' : kind === 'danger' ? 'bg-red-500 text-white' : kind === 'ghost' ? 'text-zinc-300' : 'bg-white/[0.07] text-zinc-100'} ${className}`} />
);
export const inputCls = 'w-full min-h-[46px] rounded-2xl bg-black/40 ring-1 ring-white/10 px-3.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400';
export const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />;
export const Field = ({ label, children }) => (
  <label className="block mb-3"><span className="block mb-1.5 text-[13px] text-zinc-400">{label}</span>{children}</label>
);
export const Pill = ({ status }) => <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS[status][1]}`}>{STATUS[status][0]}</span>;
export const Chip = ({ on, children, ...p }) => (
  <button type="button" {...p} aria-pressed={on} className={`shrink-0 min-h-[38px] px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${on ? 'bg-emerald-400 text-emerald-950' : 'bg-white/[0.06] text-zinc-300'}`}>{children}</button>
);

/** Valor de un nutriente: número, «—» si no hay datos, o subtotal marcado como parcial. */
export function Val({ r, unit, d = 0 }) {
  if (!r) return <span className="text-zinc-600">—</span>;
  if (r.complete) return <span>{nf(r.value, d)} <span className="text-zinc-500">{unit}</span></span>;
  if (r.value === 0) return <span className="text-zinc-600" title="Sin datos">—</span>;
  return <span className="text-zinc-400" title={`Parcial: faltan datos de ${r.missing.join(', ')}`}>≥ {nf(r.value, d)} <span className="text-zinc-500">{unit}</span></span>;
}

/** Línea compacta de macros de un plato. */
export function MacroLine({ res, className = '' }) {
  const cell = (label, r, unit, color) => (
    <div className="flex-1 min-w-0"><div className={`text-[15px] font-semibold tabular-nums ${color}`}>{r.complete || r.value > 0 ? nf(r.value) : '—'}<span className="text-[11px] font-normal text-zinc-500"> {unit}</span></div><div className="text-[11px] text-zinc-500">{label}</div></div>
  );
  return (
    <div className={`flex gap-2 rounded-2xl bg-black/30 px-3 py-2 ${className}`}>
      {cell('Energía', res.kcal, 'kcal', 'text-white')}{cell('Proteína', res.protein, 'g', 'text-emerald-300')}{cell('Hidratos', res.carbs, 'g', 'text-amber-300')}{cell('Grasa', res.fat, 'g', 'text-sky-300')}
    </div>
  );
}

export function Ring({ value, total, size = 92 }) {
  const r = (size - 12) / 2; const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct * 100)} % registrado`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

export const Bar = ({ label, done, plan, unit, color }) => (
  <div className="mb-2 last:mb-0">
    <div className="flex justify-between text-[12px] mb-1"><span className="text-zinc-400">{label}</span><span className="tabular-nums text-zinc-300">{nf(done)} / {nf(plan)} {unit}</span></div>
    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${plan > 0 ? Math.min(100, (done / plan) * 100) : 0}%` }} /></div>
  </div>
);

export function Sheet({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0b0d0c] flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b border-white/[0.06]">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 -ml-2 rounded-full text-zinc-300 text-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">‹</button>
        <h2 className="flex-1 text-[16px] font-semibold text-white truncate">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto"><div className="max-w-xl mx-auto p-4">{children}</div></div>
      {footer && <div className="border-t border-white/[0.06] p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><div className="max-w-xl mx-auto">{footer}</div></div>}
    </div>
  );
}
