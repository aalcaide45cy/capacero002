// Cambiar un plato entero o un alimento suelto: lista sin límite, buscador, filtros y comparación completa antes de guardar.
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Clock, ArrowDown, Check, TriangleAlert } from 'lucide-react';
import { NUTRIENTS, computeItems, rankAlternatives, microDiff, DEFAULT_TOLERANCES } from '../../../api/_lib/dieta/nutrition.js';
import { generateMenus, substitutesFor, ROLE_LABEL, roleOf } from '../../../api/_lib/dieta/menus.js';
import { Btn, Chip, Pill, Sheet, MacroLine, nf, norm, qty, SLOTS } from './ui.jsx';

const FILTERS = [['equivalente', 'Equivalentes'], ['rápido', 'Rápidos'], ['sin-cocinar', 'Sin cocinar'], ['táper', 'Para táper'], ['carne', 'Carne'], ['pescado', 'Pescado'], ['huevo', 'Huevo'], ['vegetal', 'Vegetal'], ['sin-lácteos', 'Sin lácteos']];
const PAGE = 40;
const sign = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nf(Math.abs(v), d)}`;

function Compare({ orig, alt }) {
  const [all, setAll] = useState(false);
  const groups = [['macro', 'Macronutrientes'], ['mineral', 'Minerales'], ['vitamina', 'Vitaminas']];
  const row = (n) => {
    const o = orig[n.key], a = alt[n.key];
    const known = o.complete && a.complete;
    const diff = known ? a.value - o.value : null;
    const max = Math.max(o.value, a.value, 1e-9);
    const d = n.d ?? (n.unit === 'g' && n.key !== 'kcal' ? 1 : 0);
    const big = known && n.ref && Math.abs(diff) / n.ref >= 0.15 && Math.abs(diff) > 0.3 * o.value;
    return (
      <div key={n.key} className="py-2 border-t border-white/[0.05] first:border-0">
        <div className="flex justify-between text-[13px]"><span className="text-zinc-300">{n.label}</span>
          {known ? <span className={`tabular-nums ${big ? (diff < 0 ? 'text-amber-300 font-semibold' : 'text-emerald-300') : 'text-zinc-400'}`}>{nf(o.value, d)} → {nf(a.value, d)} {n.unit}</span>
            : <span className="text-zinc-600">sin datos en la fuente</span>}</div>
        {known && <div className="mt-1 space-y-0.5"><div className="h-1 rounded-full bg-zinc-500/60" style={{ width: `${(o.value / max) * 100}%` }} /><div className={`h-1 rounded-full ${big && diff < 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${(a.value / max) * 100}%` }} /></div>}
      </div>
    );
  };
  return (
    <div>
      {groups.map(([g, title]) => (g === 'macro' || all) && (
        <div key={g} className="mb-3"><h4 className="text-[12px] uppercase tracking-wider text-zinc-500 mb-1">{title}</h4>{NUTRIENTS.filter(n => n.group === g).map(row)}</div>))}
      <p className="text-[11px] text-zinc-500 mb-2">Barra gris: plato actual. Barra de color: alternativa.</p>
      <Btn kind="sec" className="w-full" onClick={() => setAll(!all)}>{all ? 'Ver solo macros' : 'Ver vitaminas y minerales'}</Btn>
    </div>
  );
}

function Detail({ meal, cand, foods, origRes, milkPending, busy, onBack, onApply }) {
  const altRes = useMemo(() => computeItems(cand.ingredients, foods), [cand, foods]);
  const micro = useMemo(() => microDiff(origRes, altRes), [origRes, altRes]);
  const [accept, setAccept] = useState(false);
  const needsAccept = milkPending && cand.pending.some(p => /lácteo pendiente/.test(p));
  return (
    <Sheet title="Comparar antes de guardar" onClose={onBack}
      footer={<><Btn className="w-full" disabled={busy || (needsAccept && !accept)} onClick={() => onApply(cand, accept)}><Check size={18} /> Usar este {cand.food ? 'alimento' : 'plato'}</Btn></>}>
      <div className="flex items-start justify-between gap-3 mb-1"><h3 className="text-[19px] font-semibold leading-snug text-white">{cand.name}</h3><Pill status={cand.status} /></div>
      {cand.active_minutes ? <p className="text-[13px] text-zinc-400 flex items-center gap-1.5 mb-3"><Clock size={14} /> {cand.active_minutes} min de trabajo</p> : <div className="mb-3" />}
      <MacroLine res={altRes} className="mb-3" />
      <ul className="rounded-2xl bg-black/30 divide-y divide-white/[0.05] mb-3">
        {cand.ingredients.map((it, i) => <li key={i} className="flex justify-between px-3 py-2.5 text-[14px]"><span className="text-zinc-200">{foods[it.food]?.name}</span><span className="tabular-nums text-zinc-400">{qty(it)}</span></li>)}
      </ul>
      {cand.prep && <p className="text-[14px] leading-relaxed text-zinc-300 mb-4">{cand.prep}</p>}
      {micro.drops.length > 0 && (
        <div className="rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/20 p-3 mb-3"><p className="text-[13px] font-semibold text-amber-200 flex items-center gap-1.5 mb-1"><ArrowDown size={15} /> Baja de forma apreciable</p>
          {micro.drops.map(d => <p key={d.key} className="text-[13px] text-amber-100/90">{d.label}: {nf(d.from, 1)} → {nf(d.to, 1)} {d.unit}</p>)}</div>)}
      {micro.gains.length > 0 && <p className="text-[13px] text-emerald-300 mb-3">Sube: {micro.gains.map(g => g.label).join(', ')}.</p>}
      {cand.warnings.map((w, i) => <p key={i} className="text-[13px] text-amber-200 flex items-start gap-1.5 mb-2"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> {w}. Mejor de forma ocasional.</p>)}
      {cand.pending.filter(p => /etiqueta/.test(p)).length > 0 && <p className="text-[12px] text-zinc-500 mb-3">Revisa alérgenos en la etiqueta de: {cand.pending.filter(p => /etiqueta/.test(p)).map(p => p.split(':')[0]).join(', ')}.</p>}
      <Compare orig={origRes} alt={altRes} />
      {micro.unknown.length > 0 && <p className="text-[11px] text-zinc-500 mt-3">No comparables por falta de datos: {micro.unknown.join(', ')}. No se dan por cubiertos.</p>}
      {needsAccept && <label className="flex items-start gap-3 mt-4 text-[14px] text-zinc-200"><input type="checkbox" className="w-6 h-6 mt-0.5 accent-emerald-400" checked={accept} onChange={e => setAccept(e.target.checked)} /> Lleva un lácteo y aún no has indicado en Ajustes si lo tuyo es lactosa o alergia a la leche. Lo acepto.</label>}
    </Sheet>
  );
}

export default function SwapSheet({ meal, itemIndex, foods, profile, tolerances, onClose, onApply, busy }) {
  const single = itemIndex != null;
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState([]);
  const [shown, setShown] = useState(PAGE);
  const [sel, setSel] = useState(null);
  const origRes = useMemo(() => computeItems(meal.items, foods), [meal, foods]);

  useEffect(() => {
    setList(null);
    // Se calcula tras pintar para que la pantalla aparezca al instante.
    const t = setTimeout(() => {
      const options = single ? substitutesFor(meal, itemIndex, foods) : generateMenus(meal, foods);
      const ranked = rankAlternatives({ ...meal, recipe: '__actual__' }, options, foods, profile, { ...DEFAULT_TOLERANCES, ...tolerances });
      const text = (c) => norm(`${c.name} ${c.ingredients.map(i => foods[i.food]?.name).join(' ')}`);
      setList(ranked.filter(c => c.status !== 'no_compatible').map(c => ({ ...c, active_minutes: c.minutes, text: text(c) })));
    }, 30);
    return () => clearTimeout(t);
  }, [meal, itemIndex, foods, profile, tolerances, single]);

  const filtered = useMemo(() => {
    if (!list) return [];
    const words = norm(q).split(/\s+/).filter(Boolean);
    return list.filter(c => words.every(w => c.text.includes(w)) && filters.every(f => (f === 'equivalente' ? c.status === 'equivalente' : c.tags.includes(f))));
  }, [list, q, filters]);
  const equiv = filtered.filter(c => c.status === 'equivalente').length;
  useEffect(() => { setShown(PAGE); }, [q, filters]);
  const toggle = (f) => setFilters(filters.includes(f) ? filters.filter(x => x !== f) : [...filters, f]);
  const origFood = single ? foods[meal.items[itemIndex].food] : null;
  const title = single ? `Cambiar ${origFood?.name.toLowerCase()}` : `Cambiar ${SLOTS[meal.slot].label.toLowerCase()}`;

  if (sel) return <Detail meal={meal} cand={sel} foods={foods} origRes={origRes} milkPending={(profile.milk_status || 'unknown') === 'unknown'} busy={busy} onBack={() => setSel(null)} onApply={onApply} />;

  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-[13px] text-zinc-400 mb-1">Ahora tienes</p>
      <p className="text-[16px] font-semibold text-white mb-2">{meal.name}</p>
      <MacroLine res={origRes} className="mb-4" />
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={single ? 'Buscar alimento…' : 'Buscar plato o ingrediente…'} aria-label="Buscar"
          className="w-full min-h-[48px] rounded-2xl bg-white/[0.06] pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-3 [scrollbar-width:none]">
        {(single ? FILTERS.slice(0, 1) : FILTERS.filter(([k]) => meal.slot === 'comida' || meal.slot === 'cena' || !['carne', 'pescado', 'huevo', 'vegetal'].includes(k))).map(([k, l]) => <Chip key={k} on={filters.includes(k)} onClick={() => toggle(k)}>{l}</Chip>)}
      </div>
      {!list && <p className="py-10 text-center text-zinc-500">Calculando alternativas…</p>}
      {list && <p className="text-[13px] text-zinc-400 mb-2">{nf(filtered.length)} {single ? 'alimentos' : 'platos'} compatibles{equiv ? ` · ${nf(equiv)} equivalentes` : ''}{single ? ` · ${ROLE_LABEL[roleOf(origFood)]}` : ''}</p>}
      {list && filtered.length === 0 && <p className="py-8 text-center text-zinc-500">Nada coincide con la búsqueda. Prueba con menos filtros.</p>}
      <ul className="space-y-2">
        {filtered.slice(0, shown).map(c => {
          const dk = c.kcal.complete && origRes.kcal.complete ? c.kcal.value - origRes.kcal.value : null;
          const dp = c.protein.complete && origRes.protein.complete ? c.protein.value - origRes.protein.value : null;
          return (
            <li key={c.recipe}><button type="button" onClick={() => setSel(c)} className="w-full text-left rounded-2xl bg-[#151917] ring-1 ring-white/[0.06] p-3.5 active:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
              <div className="flex items-start justify-between gap-3"><span className="text-[15px] font-medium leading-snug text-white">{single ? `${foods[c.food].name} · ${qty(c.item)}` : c.name}</span><Pill status={c.status} /></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-400 tabular-nums">
                {c.active_minutes ? <span className="inline-flex items-center gap-1"><Clock size={12} /> {c.active_minutes} min</span> : null}
                {dk != null && <span>{sign(dk)} kcal</span>}{dp != null && <span>{sign(dp, 1)} g proteína</span>}
                {c.micro.drops.length > 0 && <span className="text-amber-300 inline-flex items-center gap-1"><ArrowDown size={12} /> {c.micro.drops.slice(0, 2).map(d => d.label.replace(/ \(.*/, '')).join(', ')}{c.micro.drops.length > 2 ? '…' : ''}</span>}
                {c.warnings.length > 0 && <span className="text-amber-300">ocasional</span>}
              </div>
            </button></li>);
        })}
      </ul>
      {filtered.length > shown && <Btn kind="sec" className="w-full mt-3" onClick={() => setShown(shown + PAGE)}>Ver más ({nf(filtered.length - shown)} restantes)</Btn>}
      <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">Las cantidades ya están ajustadas para parecerse a tu plato actual. «Equivalente» significa energía, proteína, hidratos y grasa dentro de márgenes y ninguna bajada apreciable de vitaminas o minerales, según USDA SR26. Es una herramienta de organización, no una pauta médica.</p>
    </Sheet>
  );
}

