import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NUTRIENTS, computeItems, sumResults, checkRestrictions, packInfo, aggregateShopping, addDays, weekStart, round
} from '../../../api/_lib/dieta/nutrition.js';
import { SLOT_LABEL, SLOT_TIME } from '../../../api/_lib/dieta/menu.js';

// ---------- Utilidades ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
const fmtDate = (ymd) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dowOf = (ymd) => DOW[new Date(ymd + 'T00:00:00Z').getUTCDay()];
const nf = (v, d = 1) => (v == null ? '—' : Number(round(v, d)).toLocaleString('es-ES', { maximumFractionDigits: d }));
const eur = (v) => `${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const CORE = NUTRIENTS.filter(n => n.core);
const NLABEL = Object.fromEntries(NUTRIENTS.map(n => [n.key, n]));
const STATUS = {
  dentro: ['Dentro de márgenes calculados', 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'],
  con_diferencias: ['Con diferencias', 'bg-amber-500/15 text-amber-300 border-amber-500/40'],
  datos_insuficientes: ['Datos insuficientes', 'bg-sky-500/15 text-sky-300 border-sky-500/40'],
  no_compatible: ['No compatible', 'bg-red-500/15 text-red-300 border-red-500/40']
};

async function api(path, body) {
  const opt = { credentials: 'same-origin', headers: { 'X-Requested-With': 'dieta' } };
  if (body !== undefined) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(`/api/dieta/${path}`, opt);
  let json = {};
  try { json = await res.json(); } catch { /* respuesta no JSON */ }
  if (!res.ok || json.ok === false) { const e = new Error(json.error || `Error ${res.status}`); e.status = res.status; throw e; }
  return json;
}

// ---------- Componentes base ----------
const Card = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 mb-4 ${className}`}>
    {title && <h2 className="text-base font-semibold text-zinc-100 mb-3">{title}</h2>}
    {children}
  </section>
);
const Btn = ({ kind = 'pri', className = '', ...p }) => (
  <button type="button" {...p} className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
    kind === 'pri' ? 'bg-cyan-500 text-black' : kind === 'danger' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'} ${className}`} />
);
const Field = ({ label, children }) => (
  <label className="block mb-3 text-sm text-zinc-300"><span className="block mb-1 text-zinc-400">{label}</span>{children}</label>
);
const inputCls = 'w-full min-h-[44px] rounded-xl bg-zinc-950 border border-zinc-700 px-3 text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400';
const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />;
const Badge = ({ status }) => <span className={`inline-block text-xs px-2 py-1 rounded-full border ${STATUS[status][1]}`}>{STATUS[status][0]}</span>;

function Nut({ label, unit, r, d = 1 }) {
  if (r.complete) return <span>{label}: <b>{nf(r.value, d)} {unit}</b></span>;
  if (r.value === 0) return <span className="text-zinc-400">{label}: sin datos</span>;
  return <span className="text-amber-300" title={`Faltan datos de ${r.missing.join(', ')}`}>{label} conocido: {nf(r.value, d)} {unit} (incompleto)</span>;
}
const MissingNote = ({ r }) => (r && !r.complete && r.missing.length ? <p className="text-xs text-zinc-500 mt-1">Faltan datos de: {r.missing.slice(0, 6).join(', ')}{r.missing.length > 6 ? '…' : ''}</p> : null);

// ---------- Acceso ----------
function Login({ onDone }) {
  const [f, setF] = useState({ email: '', password: '', code: '', remember: true });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('login', { email: f.email, password: f.password, code: f.code, remember: f.remember, remember_days: 30 }); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-bold mb-1">Dieta</h1>
        <p className="text-sm text-zinc-400 mb-4">Acceso privado del propietario. Misma contraseña y código que el panel.</p>
        {err && <p role="alert" className="mb-3 text-sm text-red-300">{err}</p>}
        <Field label="Email"><Input type="email" required autoComplete="username" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Contraseña"><Input type="password" required autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Código de la app de autenticación"><Input inputMode="numeric" required autoComplete="one-time-code" pattern="[0-9 ]{6,7}" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={f.remember} onChange={e => setF({ ...f, remember: e.target.checked })} className="w-5 h-5" /> Mantener sesión 30 días en este dispositivo</label>
        <p className="text-xs text-zinc-500 mb-4">Sin marcar, la sesión dura 12 horas. Borrar cookies o navegar en privado cierra la sesión recordada.</p>
        <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Entrando…' : 'Entrar'}</Btn>
      </form>
    </main>
  );
}

// ---------- Comida (tarjeta) ----------
function ItemsList({ items, foods }) {
  return (
    <ul className="text-sm text-zinc-300 space-y-0.5">
      {items.map((it, i) => {
        const f = foods[it.food];
        const q = it.units != null ? `${it.units} ud.` : it.ml != null ? `${it.ml} ml` : `${it.g} g`;
        return <li key={i}>{q} · {f?.name || it.food}{it.units != null && !f?.unit_g ? <span className="text-zinc-500"> (peso comestible sin documentar)</span> : null}</li>;
      })}
    </ul>
  );
}

function MealCard({ meal, data, foods, profile, recipes, onSwap, onReload, setMsg }) {
  const res = useMemo(() => computeItems(meal.items, foods), [meal, foods]);
  const restr = useMemo(() => checkRestrictions(meal.items, foods, profile), [meal, foods, profile]);
  const [edit, setEdit] = useState(null);
  const eaten = data.consumption.filter(c => c.day === meal.id.slice(0, 10) && c.slot === meal.slot);
  const recipe = recipes[meal.recipe];
  const startEdit = () => setEdit(meal.items.map(it => ({ ...it })));
  const save = async () => {
    try {
      await api('consume', { day: meal.id.slice(0, 10), slot: meal.slot, meal_name: meal.name, items: edit, client_key: uid() });
      setEdit(null); setMsg('Registrado'); onReload();
    } catch (x) { setMsg(x.message); }
  };
  const lock = async () => { try { await api('meal/lock', { week: data.week_start, day: meal.id.slice(0, 10), meal_id: meal.id, version: data.plan.version }); onReload(); } catch (x) { setMsg(x.message); } };
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{SLOT_LABEL[meal.slot]} · {SLOT_TIME[meal.slot]}</p>
          <h3 className="text-lg font-semibold text-zinc-100">{meal.name}{meal.locked ? ' 🔒' : ''}</h3>
        </div>
      </div>
      <div className="my-2"><ItemsList items={meal.items} foods={foods} /></div>
      {recipe?.prep && <p className="text-sm text-zinc-400 mb-2">{recipe.prep}{recipe.active_minutes ? ` (≈ ${recipe.active_minutes} min de trabajo)` : ''}</p>}
      <p className="text-sm text-zinc-300 flex flex-wrap gap-x-4 gap-y-1"><Nut label="Energía" unit="kcal" r={res.kcal} d={0} /><Nut label="Proteína" unit="g" r={res.protein} /><Nut label="Sodio" unit="mg" r={res.sodium} d={0} /></p>
      <MissingNote r={res.kcal} />
      {restr.violations.map((v, i) => <p key={i} className="text-sm text-red-300 mt-1">⚠ {v}</p>)}
      {restr.pending.slice(0, 3).map((v, i) => <p key={i} className="text-xs text-sky-300 mt-1">ℹ {v}</p>)}
      {eaten.length > 0 && <p className="text-sm text-emerald-300 mt-2">✓ Registrado {eaten.length > 1 ? `(${eaten.length} veces)` : ''}</p>}
      {edit && (
        <div className="mt-3 rounded-xl border border-zinc-700 p-3">
          <p className="text-sm text-zinc-300 mb-2">Cantidad real consumida</p>
          {edit.map((it, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="flex-1 text-sm text-zinc-300">{foods[it.food]?.name}</span>
              <Input type="number" inputMode="decimal" min="0" step={it.units != null ? 1 : 5} className="!w-24"
                value={it.units ?? it.ml ?? it.g} onChange={e => setEdit(edit.map((x, j) => j === i ? { ...x, [x.units != null ? 'units' : x.ml != null ? 'ml' : 'g']: Number(e.target.value) } : x))} />
              <span className="text-xs text-zinc-500 w-6">{it.units != null ? 'ud' : it.ml != null ? 'ml' : 'g'}</span>
            </div>
          ))}
          <div className="flex gap-2"><Btn onClick={save}>Guardar</Btn><Btn kind="sec" onClick={() => setEdit(null)}>Cancelar</Btn></div>
        </div>
      )}
      {!edit && (
        <div className="flex flex-wrap gap-2 mt-3">
          <Btn onClick={startEdit}>He comido esto</Btn>
          <Btn kind="sec" disabled={meal.locked} onClick={() => onSwap(meal)}>Cambiar</Btn>
          <Btn kind="sec" onClick={lock}>{meal.locked ? 'Desbloquear' : 'Bloquear'}</Btn>
        </div>
      )}
    </Card>
  );
}

// ---------- Cambiar comida ----------
const MODES = [['todas', 'Todas'], ['barato', 'Más barato'], ['rapido', 'Más rápido'], ['taper', 'Para táper'], ['despensa', 'Con lo que tengo'], ['sin-cocinar', 'Sin cocinar']];
function SwapPanel({ meal, data, foods, onClose, onDone, setMsg }) {
  const day = meal.id.slice(0, 10);
  const [mode, setMode] = useState('todas');
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [factor, setFactor] = useState(1);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true; setList(null); setSel(null);
    api('swap/candidates', { week: data.week_start, day, meal_id: meal.id, mode }).then(r => live && setList(r)).catch(e => live && setMsg(e.message));
    return () => { live = false; };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const origRes = useMemo(() => computeItems(meal.items, foods), [meal, foods]);
  const alt = sel ? sel.ingredients.map(i => i.units != null ? { ...i, units: Math.max(1, Math.round(i.units * factor)) } : i.ml != null ? { ...i, ml: Math.round(i.ml * factor / 5) * 5 } : { ...i, g: Math.max(5, Math.round(i.g * factor / (i.g >= 50 ? 10 : 5)) * (i.g >= 50 ? 10 : 5)) }) : null;
  const altRes = alt ? computeItems(alt, foods) : null;
  const apply = async () => {
    setBusy(true);
    try { await api('swap/apply', { week: data.week_start, version: data.plan.version, day, meal_id: meal.id, recipe: sel.recipe, factor, accept_pending: pending, client_key: uid() }); setMsg('Cambio aplicado. Puedes deshacerlo en el historial.'); onDone(); }
    catch (x) { setMsg(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto" role="dialog" aria-modal="true" aria-label="Cambiar comida">
      <div className="max-w-2xl mx-auto p-3">
        <Card title={`Cambiar: ${meal.name}`}>
          <div className="flex flex-wrap gap-2 mb-3">{MODES.map(([k, l]) => <Btn key={k} kind={mode === k ? 'pri' : 'sec'} onClick={() => setMode(k)}>{l}</Btn>)}</div>
          {!list && <p className="text-sm text-zinc-400">Buscando alternativas…</p>}
          {list && list.candidates.length === 0 && <p className="text-sm text-zinc-300">No hay ninguna alternativa válida para este filtro{mode === 'barato' ? ' (hacen falta precios de ambos platos)' : ''}.</p>}
          {list?.candidates.map(c => (
            <button key={c.recipe} type="button" onClick={() => { setSel(c); setFactor(1); setPending(false); }}
              className={`w-full text-left rounded-xl border p-3 mb-2 min-h-[44px] ${sel?.recipe === c.recipe ? 'border-cyan-400' : 'border-zinc-700'}`}>
              <div className="flex justify-between gap-2"><span className="font-medium text-zinc-100">{c.name}</span><Badge status={c.status} /></div>
              <p className="text-xs text-zinc-500 mt-1">{c.minutes ? `≈ ${c.minutes} min · ` : ''}{c.cost.complete ? eur(c.cost.value) : 'sin precio'}</p>
            </button>
          ))}
          {list?.excluded?.length > 0 && (
            <details className="text-sm text-zinc-400 mt-2"><summary>{list.excluded.length} opción(es) no compatible(s)</summary>
              {list.excluded.map((x, i) => <p key={i} className="mt-1">✗ {x.name}: {x.notes.join('; ')}</p>)}</details>
          )}
          {sel && alt && (
            <div className="mt-4">
              <h3 className="font-semibold text-zinc-100 mb-2">Comparación antes de guardar</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-zinc-500 text-left"><th className="py-1">Nutriente</th><th>Actual</th><th>Alternativa</th></tr></thead>
                <tbody>{CORE.map(n => (
                  <tr key={n.key} className="border-t border-zinc-800"><td className="py-1">{n.label}</td>
                    <td>{origRes[n.key].complete ? `${nf(origRes[n.key].value, n.key === 'kcal' || n.key === 'sodium' ? 0 : 1)} ${n.unit}` : <span className="text-zinc-500">sin datos</span>}</td>
                    <td>{altRes[n.key].complete ? `${nf(altRes[n.key].value, n.key === 'kcal' || n.key === 'sodium' ? 0 : 1)} ${n.unit}` : <span className="text-zinc-500">sin datos</span>}</td></tr>))}</tbody>
              </table></div>
              <p className="text-xs text-zinc-500 mt-1">Los datos sin valor no se cuentan como 0. Detalle de lo que falta: {[...new Set([...origRes.kcal.missing, ...altRes.kcal.missing])].slice(0, 4).join(', ') || 'nada'}.</p>
              <div className="mt-3"><p className="text-sm text-zinc-400 mb-1">Ración</p>
                <div className="flex flex-wrap gap-2">{[0.8, 0.9, 1, 1.1, 1.2].map(f => <Btn key={f} kind={factor === f ? 'pri' : 'sec'} onClick={() => setFactor(f)}>{Math.round(f * 100)} %</Btn>)}</div></div>
              <div className="mt-3"><ItemsList items={alt} foods={foods} /></div>
              {sel.notes.length > 0 && <ul className="mt-2 text-xs text-sky-300">{sel.notes.slice(0, 5).map((n, i) => <li key={i}>ℹ {n}</li>)}</ul>}
              {sel.notes.some(n => /lácteo|alérgenos/.test(n)) && <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" className="w-5 h-5" checked={pending} onChange={e => setPending(e.target.checked)} /> Acepto que hay datos pendientes de confirmar</label>}
              <Btn className="mt-3 w-full" disabled={busy || (sel.notes.some(n => /lácteo|alérgenos/.test(n)) && !pending)} onClick={apply}>Aplicar cambio</Btn>
            </div>
          )}
          <Btn kind="sec" className="mt-3 w-full" onClick={onClose}>Cerrar</Btn>
        </Card>
      </div>
    </div>
  );
}

// ---------- Pestañas ----------
function History({ data, onReload, setMsg }) {
  if (!data.history.length) return null;
  const undo = async (id) => { try { await api('swap/undo', { history_id: id }); setMsg('Cambio deshecho'); onReload(); } catch (x) { setMsg(x.message); } };
  return (
    <Card title="Historial de cambios">
      {data.history.map(h => (
        <div key={h.id} className="flex items-center justify-between gap-2 text-sm py-1 border-t border-zinc-800">
          <span className={h.undone_at ? 'text-zinc-600 line-through' : 'text-zinc-300'}>{fmtDate(h.day)} · {h.summary.replace(/ \[[^\]]+\]$/, '')}</span>
          {!h.undone_at && <Btn kind="sec" onClick={() => undo(h.id)}>Deshacer</Btn>}
        </div>))}
    </Card>
  );
}

function DaySummary({ date, data, foods }) {
  const meals = data.plan.data.days[date]?.meals || [];
  const planned = sumResults(meals.map(m => computeItems(m.items, foods)));
  const eaten = data.consumption.filter(c => c.day === date);
  const cons = eaten.length ? sumResults(eaten.map(c => c.snapshot.computed)) : null;
  return (
    <Card title="Planificado frente a consumido">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-zinc-500 text-left"><th className="py-1">Nutriente</th><th>Planificado</th><th>Consumido</th></tr></thead>
        <tbody>{CORE.map(n => (
          <tr key={n.key} className="border-t border-zinc-800"><td className="py-1">{n.label}</td>
            <td><Nut label="" unit={n.unit} r={planned[n.key]} d={n.key === 'kcal' || n.key === 'sodium' ? 0 : 1} /></td>
            <td>{cons ? <Nut label="" unit={n.unit} r={cons[n.key]} d={n.key === 'kcal' || n.key === 'sodium' ? 0 : 1} /> : <span className="text-zinc-600">—</span>}</td></tr>))}</tbody></table></div>
      <p className="text-xs text-zinc-500 mt-2">Sin datos no significa cubierto ni deficitario. Carga los nutrientes en la pestaña Alimentos (con su fuente).</p>
    </Card>
  );
}

function Hoy({ data, foods, recipes, onReload, setMsg }) {
  const [date, setDate] = useState(data.today);
  const [swap, setSwap] = useState(null);
  const inWeek = data.plan.data.days[date];
  useEffect(() => { if (!inWeek) onReload(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Btn kind="sec" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>‹</Btn>
        <div className="text-center"><p className="font-semibold text-zinc-100 capitalize">{dowOf(date)} {fmtDate(date)}</p>{date !== data.today && <button className="text-xs text-cyan-400 underline" onClick={() => setDate(data.today)}>Ir a hoy</button>}</div>
        <Btn kind="sec" aria-label="Día siguiente" onClick={() => setDate(addDays(date, 1))}>›</Btn>
      </div>
      <p className="text-xs text-zinc-500 mb-3">Borrador orientativo, no es un plan personalizado ni una pauta médica.</p>
      {!inWeek && <p className="text-zinc-400">Cargando…</p>}
      {inWeek?.meals.map(m => <MealCard key={m.id} meal={m} data={data} foods={foods} recipes={recipes} profile={data.profile} onSwap={setSwap} onReload={() => onReload(date)} setMsg={setMsg} />)}
      {inWeek && <DaySummary date={date} data={data} foods={foods} />}
      {swap && <SwapPanel meal={swap} data={data} foods={foods} setMsg={setMsg} onClose={() => setSwap(null)} onDone={() => { setSwap(null); onReload(date); }} />}
    </>
  );
}

function Semana({ data, foods, onReload, setMsg }) {
  const [swap, setSwap] = useState(null);
  const ws = data.week_start;
  const days = Object.keys(data.plan.data.days).sort();
  const week = sumResults(days.flatMap(d => data.plan.data.days[d].meals.map(m => computeItems(m.items, foods))));
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Btn kind="sec" aria-label="Semana anterior" onClick={() => onReload(addDays(ws, -7))}>‹</Btn>
        <p className="font-semibold text-zinc-100">Semana del {fmtDate(ws)}</p>
        <Btn kind="sec" aria-label="Semana siguiente" onClick={() => onReload(addDays(ws, 7))}>›</Btn>
      </div>
      {days.map(d => (
        <Card key={d} title={`${dowOf(d)} ${fmtDate(d)}`} className="capitalize">
          {data.plan.data.days[d].meals.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-1 border-t border-zinc-800 first:border-0 normal-case">
              <div><span className="text-xs text-zinc-500">{SLOT_LABEL[m.slot]}</span><p className="text-sm text-zinc-200">{m.name}{m.locked ? ' 🔒' : ''}</p></div>
              <Btn kind="sec" disabled={m.locked} onClick={() => setSwap(m)}>Cambiar</Btn>
            </div>))}
        </Card>))}
      <Card title="Resumen semanal">
        <p className="text-sm text-zinc-300 flex flex-wrap gap-x-4 gap-y-1">{CORE.slice(0, 4).map(n => <Nut key={n.key} label={n.label} unit={n.unit} r={week[n.key]} d={0} />)}</p>
        <MissingNote r={week.kcal} />
        <p className="text-xs text-zinc-500 mt-2">Planificación de ingesta habitual: no autoriza compensar excesos diarios ni prueba suficiencia.</p>
      </Card>
      <History data={data} onReload={() => onReload(ws)} setMsg={setMsg} />
      {swap && <SwapPanel meal={swap} data={data} foods={foods} setMsg={setMsg} onClose={() => setSwap(null)} onDone={() => { setSwap(null); onReload(ws); }} />}
    </>
  );
}

function Compra({ data, foods, onReload, setMsg }) {
  const allItems = Object.values(data.plan.data.days).flatMap(d => d.meals.flatMap(m => m.items));
  const { map, noWeight } = useMemo(() => aggregateShopping(allItems, foods), [data, foods]); // eslint-disable-line react-hooks/exhaustive-deps
  const pantry = Object.fromEntries(data.pantry.map(p => [p.food_slug, p.grams]));
  const checks = Object.fromEntries(data.checks.map(c => [c.food_slug, c.bought]));
  const rows = Object.entries(map).map(([slug, need]) => {
    const f = foods[slug]; const have = pantry[slug] || 0; const pend = Math.max(0, need - have);
    const p = data.prices[slug];
    let packs = null, spend = null, left = null, usedCost = null;
    if (p) { const pi = packInfo(p); usedCost = need * pi.pricePerG; if (pend > 0) { packs = Math.ceil(pend / pi.packG); spend = packs * pi.packPrice; left = packs * pi.packG - pend; } else { packs = 0; spend = 0; left = 0; } }
    return { slug, f, need, have, pend, p, packs, spend, left, usedCost };
  }).sort((a, b) => (a.f?.category || '').localeCompare(b.f?.category || '') || a.f.name.localeCompare(b.f.name));
  const known = rows.filter(r => r.spend != null);
  const missingPrice = rows.filter(r => r.p == null && r.pend > 0);
  const [price, setPrice] = useState({});
  const run = async (fn) => { try { await fn(); onReload(); } catch (x) { setMsg(x.message); } };
  return (
    <>
      <Card title="Lista de compra de la semana">
        <p className="text-xs text-zinc-500 mb-3">Cantidades en gramos en el estado indicado de cada alimento (seco, crudo, escurrido…). Descuenta la despensa.</p>
        {rows.map(r => (
          <div key={r.slug} className="border-t border-zinc-800 py-2">
            <label className="flex items-start gap-3"><input type="checkbox" className="w-6 h-6 mt-0.5" checked={!!checks[r.slug]} onChange={e => run(() => api('shopping/check', { week: data.week_start, food_slug: r.slug, bought: e.target.checked }))} />
              <span className="flex-1"><span className="text-sm text-zinc-100">{r.f.name}</span> <span className="text-xs text-zinc-500">({r.f.state})</span>
                <span className="block text-sm text-zinc-400">Necesario {nf(r.need, 0)} g · despensa {nf(r.have, 0)} g · comprar {nf(r.pend, 0)} g</span>
                <span className="block text-xs text-zinc-500">{r.p ? `${r.packs} envase(s) de ${nf(packInfo(r.p).packG, 0)} g · ${eur(r.spend)} · sobran ${nf(r.left, 0)} g · precio del ${fmtDate(r.p.price_date)}` : 'sin precio'}</span></span></label>
            <div className="flex gap-2 mt-2 pl-9">
              <Input type="number" inputMode="decimal" placeholder="Despensa g" className="!w-28" value={price[r.slug + 'p'] ?? ''} onChange={e => setPrice({ ...price, [r.slug + 'p']: e.target.value })} />
              <Btn kind="sec" onClick={() => run(() => api('pantry/save', { food_slug: r.slug, grams: price[r.slug + 'p'] }))}>Guardar</Btn>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 pl-9">
              <Input type="number" inputMode="decimal" placeholder="Envase g" className="!w-24" value={price[r.slug + 'g'] ?? ''} onChange={e => setPrice({ ...price, [r.slug + 'g']: e.target.value })} />
              <Input type="number" inputMode="decimal" placeholder="Precio €" className="!w-24" value={price[r.slug + 'e'] ?? ''} onChange={e => setPrice({ ...price, [r.slug + 'e']: e.target.value })} />
              <Input placeholder="Tienda" className="!w-28" value={price[r.slug + 's'] ?? ''} onChange={e => setPrice({ ...price, [r.slug + 's']: e.target.value })} />
              <Btn kind="sec" onClick={() => run(() => api('price/save', { food_slug: r.slug, pack_net_g: price[r.slug + 'g'], price_eur: price[r.slug + 'e'], store: price[r.slug + 's'] }))}>Guardar precio</Btn>
            </div>
          </div>))}
        {noWeight.length > 0 && <p className="text-xs text-sky-300 mt-3">Sin peso comestible documentado (no incluidos): {[...new Set(noWeight)].join(', ')}.</p>}
      </Card>
      <Card title="Coste">
        <p className="text-sm text-zinc-300">Dinero de la compra (envases enteros): <b>{eur(known.reduce((a, r) => a + r.spend, 0))}</b>{missingPrice.length ? <span className="text-amber-300"> · presupuesto parcial: faltan precios de {missingPrice.length} producto(s)</span> : null}</p>
        <p className="text-sm text-zinc-300 mt-1">Coste de lo que se consume (gramos usados): <b>{eur(rows.filter(r => r.usedCost != null).reduce((a, r) => a + r.usedCost, 0))}</b>{rows.some(r => r.usedCost == null) ? <span className="text-amber-300"> · incompleto (sin precio)</span> : null}</p>
        {data.profile.weekly_budget_eur ? <p className="text-xs text-zinc-500 mt-1">Presupuesto semanal: {eur(data.profile.weekly_budget_eur)}</p> : null}
        <Btn kind="sec" className="mt-3" onClick={() => window.print()}>Imprimir lista</Btn>
      </Card>
    </>
  );
}

function Spark({ points, label }) {
  if (points.length < 2) return <p className="text-sm text-zinc-500">Hacen falta al menos dos registros para dibujar el gráfico.</p>;
  const ys = points.map(p => p.y); const min = Math.min(...ys), max = Math.max(...ys);
  const x = (i) => 8 + (i * 284) / (points.length - 1); const y = (v) => 72 - ((v - min) / (max - min || 1)) * 64;
  return (
    <svg viewBox="0 0 300 80" className="w-full" role="img" aria-label={label}>
      <polyline fill="none" stroke="#22d3ee" strokeWidth="2" points={points.map((p, i) => `${x(i)},${y(p.y)}`).join(' ')} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r="3" fill="#22d3ee"><title>{fmtDate(p.x)}: {p.y}</title></circle>)}
    </svg>
  );
}

function Seguimiento({ data, onReload, setMsg }) {
  const [w, setW] = useState({ day: data.today, weight: '' });
  const [t, setT] = useState({ day: data.today, sys: '', dia: '', ctx: '' });
  const [s, setS] = useState({ day: data.today, bloating: '', pain: '', bowel: '', notes: '' });
  const run = async (fn, ok) => { try { await fn(); setMsg(ok); onReload(); } catch (x) { setMsg(x.message); } };
  const del = (table, id) => run(() => api('row/delete', { table, id }), 'Eliminado');
  const weights = data.measurements.filter(m => m.kind === 'peso');
  const tens = data.measurements.filter(m => m.kind === 'tension');
  return (
    <>
      <Card title="Peso">
        <Spark points={weights.map(m => ({ x: m.day, y: m.weight_kg }))} label="Evolución del peso" />
        <div className="flex gap-2 mt-3"><Input type="date" value={w.day} onChange={e => setW({ ...w, day: e.target.value })} /><Input type="number" inputMode="decimal" step="0.1" placeholder="kg" value={w.weight} onChange={e => setW({ ...w, weight: e.target.value })} /></div>
        <Btn className="mt-2" onClick={() => run(() => api('measure/save', { kind: 'peso', day: w.day, weight_kg: w.weight, client_key: uid() }), 'Peso guardado')}>Guardar peso</Btn>
        {weights.slice(-5).reverse().map(m => <p key={m.id} className="text-sm text-zinc-400 mt-1">{fmtDate(m.day)} · {nf(m.weight_kg)} kg <button className="text-red-300 underline ml-2" onClick={() => del('measurement', m.id)}>borrar</button></p>)}
      </Card>
      <Card title="Tensión (opcional)">
        <div className="flex gap-2"><Input type="date" value={t.day} onChange={e => setT({ ...t, day: e.target.value })} /><Input type="number" inputMode="numeric" placeholder="Sistólica" value={t.sys} onChange={e => setT({ ...t, sys: e.target.value })} /><Input type="number" inputMode="numeric" placeholder="Diastólica" value={t.dia} onChange={e => setT({ ...t, dia: e.target.value })} /></div>
        <Input className="mt-2" placeholder="Contexto (reposo, mañana…)" value={t.ctx} onChange={e => setT({ ...t, ctx: e.target.value })} />
        <Btn className="mt-2" onClick={() => run(() => api('measure/save', { kind: 'tension', day: t.day, systolic: t.sys, diastolic: t.dia, context: t.ctx, client_key: uid() }), 'Tensión guardada')}>Guardar tensión</Btn>
        {tens.slice(-5).reverse().map(m => <p key={m.id} className="text-sm text-zinc-400 mt-1">{fmtDate(m.day)} · {m.systolic}/{m.diastolic}{m.context ? ` · ${m.context}` : ''} <button className="text-red-300 underline ml-2" onClick={() => del('measurement', m.id)}>borrar</button></p>)}
        <p className="text-xs text-zinc-500 mt-2">Solo registro descriptivo. No sustituye la valoración médica ni cambia medicación.</p>
      </Card>
      <Card title="Digestión (opcional)">
        <Input type="date" value={s.day} onChange={e => setS({ ...s, day: e.target.value })} />
        <div className="flex gap-2 mt-2"><Input type="number" inputMode="numeric" min="0" max="10" placeholder="Hinchazón 0-10" value={s.bloating} onChange={e => setS({ ...s, bloating: e.target.value })} /><Input type="number" inputMode="numeric" min="0" max="10" placeholder="Dolor 0-10" value={s.pain} onChange={e => setS({ ...s, pain: e.target.value })} /></div>
        <Input className="mt-2" placeholder="Deposiciones" value={s.bowel} onChange={e => setS({ ...s, bowel: e.target.value })} />
        <Input className="mt-2" placeholder="Notas" value={s.notes} onChange={e => setS({ ...s, notes: e.target.value })} />
        <Btn className="mt-2" onClick={() => run(() => api('symptom/save', { ...s, client_key: uid() }), 'Guardado')}>Guardar</Btn>
        {data.symptoms.slice(-5).reverse().map(m => <p key={m.id} className="text-sm text-zinc-400 mt-1">{fmtDate(m.day)} · hinchazón {m.bloating ?? '—'} · dolor {m.pain ?? '—'}{m.bowel ? ` · ${m.bowel}` : ''} <button className="text-red-300 underline ml-2" onClick={() => del('symptom', m.id)}>borrar</button></p>)}
        <p className="text-xs text-zinc-500 mt-2">Los gráficos son descriptivos: no atribuyen causas ni diagnostican.</p>
      </Card>
    </>
  );
}

function Alimentos({ data, onReload, setMsg }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const list = data.foods.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
  const open = (f) => setSel({ ...f, nutrients: Object.fromEntries(NUTRIENTS.map(n => [n.key, { v: f.nutrients[n.key]?.v ?? '', q: f.nutrients[n.key]?.q ?? 'available', src: f.nutrients[n.key]?.src ?? '' }])), unit_g: f.unit_g ?? '', density_g_ml: f.density_g_ml ?? '' });
  const save = async () => {
    try { await api('food/save', { ...sel, source: sel.source || '' }); setMsg('Alimento guardado'); setSel(null); onReload(); } catch (x) { setMsg(x.message); }
  };
  if (sel) return (
    <Card title={sel.name}>
      <p className="text-xs text-zinc-500 mb-3">Valores por 100 {sel.basis === '100ml' ? 'ml' : 'g'} de «{sel.state}». Deja vacío lo desconocido (vacío no es 0). Indica la fuente (BEDCA, USDA FDC, etiqueta…) y su identificador.</p>
      <Field label="Fuente"><Input value={sel.source || ''} onChange={e => setSel({ ...sel, source: e.target.value })} /></Field>
      <div className="flex gap-2"><Field label="ID en la fuente"><Input value={sel.source_id || ''} onChange={e => setSel({ ...sel, source_id: e.target.value })} /></Field><Field label="Fecha de consulta"><Input type="date" value={(sel.consulted_on || '').slice(0, 10)} onChange={e => setSel({ ...sel, consulted_on: e.target.value })} /></Field></div>
      <div className="flex gap-2"><Field label="Peso comestible por unidad (g)"><Input type="number" inputMode="decimal" value={sel.unit_g} onChange={e => setSel({ ...sel, unit_g: e.target.value })} /></Field>
        <Field label="Densidad (g/ml)"><Input type="number" inputMode="decimal" value={sel.density_g_ml} onChange={e => setSel({ ...sel, density_g_ml: e.target.value })} /></Field></div>
      <div className="flex gap-2">
        <Field label="Lácteo"><select className={inputCls} value={sel.dairy} onChange={e => setSel({ ...sel, dairy: e.target.value })}><option value="none">No es lácteo</option><option value="lactose_free">Lácteo sin lactosa</option><option value="with_lactose">Lácteo con lactosa</option><option value="unknown">Lácteo (sin comprobar)</option></select></Field>
        <Field label="Alérgenos"><select className={inputCls} value={sel.allergen_status} onChange={e => setSel({ ...sel, allergen_status: e.target.value })}><option value="unknown">Sin comprobar</option><option value="known">Comprobados en etiqueta</option></select></Field></div>
      <Field label="Alérgenos presentes (separados por comas)"><Input value={(sel.allergens || []).join(', ')} onChange={e => setSel({ ...sel, allergens: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></Field>
      <div className="grid grid-cols-2 gap-2">{NUTRIENTS.map(n => (
        <Field key={n.key} label={`${n.label} (${n.unit})`}><Input type="number" inputMode="decimal" step="any" min="0" value={sel.nutrients[n.key].v} onChange={e => setSel({ ...sel, nutrients: { ...sel.nutrients, [n.key]: { ...sel.nutrients[n.key], v: e.target.value, src: sel.source || '' } } })} /></Field>))}</div>
      <p className="text-xs text-zinc-500 mb-3">Sodio en mg; sal equivalente = sodio × 2,5 / 1000. Vitamina A y folato: no mezcles equivalentes distintos.</p>
      <div className="flex gap-2"><Btn onClick={save}>Guardar</Btn><Btn kind="sec" onClick={() => setSel(null)}>Cancelar</Btn></div>
    </Card>
  );
  return (
    <>
      <Card title="Alimentos y fuentes">
        <p className="text-xs text-zinc-500 mb-3">El borrador inicial no trae valores nutricionales: no se inventan. Cárgalos con su procedencia y todos los totales se recalculan.</p>
        <Input placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        {list.map(f => {
          const n = Object.keys(f.nutrients).length;
          return <button key={f.slug} type="button" onClick={() => open(f)} className="w-full text-left py-2 min-h-[44px] border-t border-zinc-800 mt-1">
            <span className="text-zinc-100 text-sm">{f.name}</span><span className="block text-xs text-zinc-500">{f.state} · {n ? `${n}/${NUTRIENTS.length} nutrientes${f.source ? ` · ${f.source}` : ''}` : 'sin datos nutricionales'}</span></button>;
        })}
      </Card>
    </>
  );
}

function Ajustes({ data, onReload, onLogout, setMsg }) {
  const p = data.profile;
  const [f, setF] = useState({ ...p, excluded: (p.excluded || []).join(', '), tolerances: { ...data.tolerances } });
  const [confirm, setConfirm] = useState('');
  const [goal, setGoal] = useState({ nutrient: 'sodium', kind: 'maximo', value: '', unit: 'mg', source: '' });
  const [sessions, setSessions] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { try { await api('profile/save', { version: data.profile_version, data: f }); setMsg('Ajustes guardados'); onReload(); } catch (x) { setMsg(x.message); } };
  return (
    <>
      <Card title="Perfil actual">
        <p className="text-xs text-zinc-500 mb-3">Todo es opcional. Los datos del informe antiguo son históricos y no se usan para calcular nada.</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha de nacimiento"><Input type="date" value={f.birth_date || ''} onChange={set('birth_date')} /></Field>
          <Field label="Talla (cm)"><Input type="number" inputMode="decimal" value={f.height_cm ?? ''} onChange={set('height_cm')} /></Field>
          <Field label="Peso actual (kg)"><Input type="number" inputMode="decimal" value={f.weight_kg ?? ''} onChange={set('weight_kg')} /></Field>
          <Field label="Fecha del peso"><Input type="date" value={f.weight_date || ''} onChange={set('weight_date')} /></Field>
        </div>
        <Field label="Objetivo"><select className={inputCls} value={f.goal || ''} onChange={set('goal')}><option value="">Sin definir</option><option value="organizar">Organizar una alimentación saludable</option><option value="mantener">Mantener peso</option><option value="perder">Perder peso</option></select></Field>
        <Field label="Leche: ¿intolerancia a la lactosa o alergia a proteínas de leche?">
          <select className={inputCls} value={f.milk_status || 'unknown'} onChange={set('milk_status')}>
            <option value="unknown">Por aclarar (los lácteos quedan pendientes)</option><option value="lactose_intolerance">Intolerancia a la lactosa (vale sin lactosa)</option>
            <option value="milk_protein_allergy">Alergia a proteínas de leche (sin ningún lácteo)</option><option value="none">Sin restricción</option></select></Field>
        <Field label="Alimentos excluidos (el kiwi siempre está excluido)"><Input value={f.excluded} onChange={set('excluded')} placeholder="p. ej. cacahuete, marisco" /></Field>
        <Field label="Notas de salud relevantes (solo para ti)"><Input value={f.conditions_note || ''} onChange={set('conditions_note')} /></Field>
        <Field label="Presupuesto semanal (€, una persona)"><Input type="number" inputMode="decimal" value={f.weekly_budget_eur ?? ''} onChange={set('weekly_budget_eur')} /></Field>
        <details className="mb-3"><summary className="text-sm text-zinc-300 cursor-pointer">Tolerancias de equivalencia (propuesta de producto, no clínica)</summary>
          <div className="grid grid-cols-2 gap-2 mt-2">{[['kcalPct', 'Energía ± %'], ['proteinAbsG', 'Proteína ± g'], ['carbsPct', 'Hidratos ± %'], ['carbsAbsG', 'Hidratos ± g mín.'], ['fatPct', 'Grasa ± %'], ['fatAbsG', 'Grasa ± g mín.']].map(([k, l]) => (
            <Field key={k} label={l}><Input type="number" inputMode="decimal" value={f.tolerances[k] ?? ''} onChange={e => setF({ ...f, tolerances: { ...f.tolerances, [k]: e.target.value } })} /></Field>))}</div></details>
        <Btn onClick={save}>Guardar ajustes</Btn>
      </Card>
      <Card title="Objetivos y límites">
        <p className="text-xs text-zinc-500 mb-2">Referencias de población (p. ej. OMS &lt; 2.000 mg de sodio/día, EFSA 25 g de fibra/día) no son una pauta individual. Introduce los que te indique tu profesional.</p>
        {data.goals.map(g => <p key={g.id} className="text-sm text-zinc-300">{NLABEL[g.nutrient]?.label || g.nutrient}: {g.kind} {nf(g.value)} {g.unit}{g.source ? ` · ${g.source}` : ''} <button className="text-red-300 underline ml-2" onClick={async () => { await api('goal/delete', { id: g.id }); onReload(); }}>borrar</button></p>)}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select className={inputCls} value={goal.nutrient} onChange={e => setGoal({ ...goal, nutrient: e.target.value, unit: NLABEL[e.target.value]?.unit || 'g' })}>{NUTRIENTS.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}<option value="salt">Sal equivalente</option></select>
          <select className={inputCls} value={goal.kind} onChange={e => setGoal({ ...goal, kind: e.target.value })}><option value="objetivo">Objetivo</option><option value="minimo">Mínimo</option><option value="maximo">Máximo</option><option value="referencia">Referencia</option></select>
          <Input type="number" inputMode="decimal" placeholder="Valor" value={goal.value} onChange={e => setGoal({ ...goal, value: e.target.value })} /><Input placeholder="Fuente" value={goal.source} onChange={e => setGoal({ ...goal, source: e.target.value })} />
        </div>
        <Btn className="mt-2" onClick={async () => { try { await api('goal/save', goal); setGoal({ ...goal, value: '' }); onReload(); } catch (x) { setMsg(x.message); } }}>Añadir</Btn>
      </Card>
      <Card title="Sesiones y datos">
        <div className="flex flex-wrap gap-2">
          <Btn kind="sec" onClick={onLogout}>Cerrar sesión</Btn>
          <Btn kind="sec" onClick={async () => { await api('logout-all', {}); location.reload(); }}>Cerrar todas las sesiones</Btn>
          <Btn kind="sec" onClick={async () => setSessions((await api('sessions')).sessions)}>Ver sesiones activas</Btn>
          <a className="min-h-[44px] inline-flex items-center px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold" href="/api/dieta/export" download>Exportar mis datos</a>
        </div>
        {sessions && sessions.map(s => <p key={s.id} className="text-xs text-zinc-400 mt-1">{s.current ? 'Esta · ' : ''}caduca {new Date(s.expires_at).toLocaleDateString('es-ES')} · {String(s.user_agent || '').slice(0, 50)}</p>)}
        <div className="mt-4 border-t border-zinc-800 pt-3"><p className="text-sm text-zinc-300 mb-2">Borrar todos mis datos de dieta (perfil, planes, registros, precios y alimentos propios; no afecta al resto de la web). Escribe <b>BORRAR MIS DATOS DE DIETA</b>.</p>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} /><Btn kind="danger" className="mt-2" disabled={confirm !== 'BORRAR MIS DATOS DE DIETA'} onClick={async () => { try { await api('data/delete', { confirm }); setMsg('Datos borrados'); onReload(); } catch (x) { setMsg(x.message); } }}>Borrar mis datos</Btn></div>
      </Card>
    </>
  );
}

// ---------- Aplicación ----------
const TABS = [['hoy', 'Hoy'], ['semana', 'Semana'], ['compra', 'Compra'], ['seguimiento', 'Seguimiento'], ['alimentos', 'Alimentos'], ['ajustes', 'Ajustes']];

export default function DietaApp() {
  const [data, setData] = useState(null);
  const [auth, setAuth] = useState('loading'); // loading | out | in
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('hoy');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    document.title = 'Dieta';
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
    m.content = 'noindex,nofollow';
  }, []);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);

  const load = useCallback(async (anyDate) => {
    try {
      const d = await api(`bootstrap${anyDate ? `?week=${weekStart(anyDate)}` : ''}`);
      setData(d); setAuth('in'); setErr('');
    } catch (x) { if (x.status === 401) setAuth('out'); else { setErr(x.message); setAuth(a => (a === 'loading' ? 'out' : a)); } }
  }, []);
  useEffect(() => { load(); }, [load]);

  const foods = useMemo(() => (data ? Object.fromEntries(data.foods.map(f => [f.slug, f])) : {}), [data]);
  const recipes = useMemo(() => (data ? Object.fromEntries(data.recipes.map(r => [r.slug, r])) : {}), [data]);
  const logout = async () => { try { await api('logout', {}); } catch { /* ya cerrada */ } setData(null); setAuth('out'); };

  if (auth === 'loading') return <div className="min-h-screen bg-black text-zinc-400 flex items-center justify-center">Cargando…</div>;
  if (auth === 'out') return <Login onDone={() => load()} />;
  if (!data) return null;
  const reload = (d) => load(d || data.week_start);
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-40 bg-black/95 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-3 pt-3"><h1 className="text-lg font-bold">Dieta</h1>
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Secciones">{TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={`min-h-[44px] px-4 rounded-xl text-sm whitespace-nowrap ${tab === k ? 'bg-cyan-500 text-black font-semibold' : 'bg-zinc-900 text-zinc-300'}`}>{l}</button>))}</nav></div>
      </header>
      <main className="max-w-2xl mx-auto p-3 pb-24">
        {err && <p role="alert" className="text-red-300 mb-3">{err}</p>}
        {tab === 'hoy' && <Hoy data={data} foods={foods} recipes={recipes} onReload={reload} setMsg={setMsg} />}
        {tab === 'semana' && <Semana data={data} foods={foods} onReload={reload} setMsg={setMsg} />}
        {tab === 'compra' && <Compra data={data} foods={foods} onReload={() => reload()} setMsg={setMsg} />}
        {tab === 'seguimiento' && <Seguimiento data={data} onReload={() => reload()} setMsg={setMsg} />}
        {tab === 'alimentos' && <Alimentos data={data} onReload={() => reload()} setMsg={setMsg} />}
        {tab === 'ajustes' && <Ajustes data={data} onReload={() => reload()} onLogout={logout} setMsg={setMsg} />}
      </main>
      {msg && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-[90%] rounded-xl bg-zinc-100 text-black px-4 py-3 text-sm shadow-lg">{msg}</div>}
    </div>
  );
}
