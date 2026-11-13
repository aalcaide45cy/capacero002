import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Sun, ShoppingBasket, LineChart, Settings2, Check, Repeat2, ChevronLeft, ChevronRight, Clock, Lock, LockOpen, Undo2, ChevronDown, Search, Printer, LogOut, Download } from 'lucide-react';
import { NUTRIENTS, computeItems, sumResults, checkRestrictions, packInfo, aggregateShopping, addDays, weekStart } from '../../../api/_lib/dieta/nutrition.js';
import { Card, H2, Btn, Input, Field, inputCls, Val, MacroLine, Ring, Bar, Sheet, SLOTS, uid, fmtDate, dowOf, longDate, nf, eur, norm, qty } from './ui.jsx';
import SwapSheet from './SwapSheet.jsx';

async function api(path, body) {
  const opt = { credentials: 'same-origin', headers: { 'X-Requested-With': 'dieta' } };
  if (body !== undefined) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(`/api/dieta/${path}`, opt);
  let json = {};
  try { json = await res.json(); } catch { /* respuesta no JSON */ }
  if (!res.ok || json.ok === false) { const e = new Error(json.error || `Error ${res.status}`); e.status = res.status; throw e; }
  return json;
}
const NLABEL = Object.fromEntries(NUTRIENTS.map(n => [n.key, n]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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
    <main className="min-h-screen bg-[#0b0d0c] text-zinc-100 flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center mb-5"><Sun size={28} /></div>
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-1">Mi dieta</h1>
        <p className="text-[15px] text-zinc-400 mb-6">Acceso privado. Mismo email, contraseña y código que el panel.</p>
        {err && <p role="alert" className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[14px] text-red-300">{err}</p>}
        <Field label="Email"><Input type="email" required autoComplete="username" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Contraseña"><Input type="password" required autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Código de la app de autenticación"><Input inputMode="numeric" required autoComplete="one-time-code" pattern="[0-9 ]{6,7}" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} /></Field>
        <label className="flex items-center gap-3 text-[14px] text-zinc-300 mb-5"><input type="checkbox" checked={f.remember} onChange={e => setF({ ...f, remember: e.target.checked })} className="w-5 h-5 accent-emerald-400" /> Mantener sesión 30 días</label>
        <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Entrando…' : 'Entrar'}</Btn>
        <p className="text-[12px] text-zinc-500 mt-4">Sin marcar, la sesión dura 12 horas. Borrar cookies o navegar en privado la cierra.</p>
      </form>
    </main>
  );
}

// ---------- Hoy ----------
function WeekStrip({ data, date, onPick, onShift }) {
  const days = Object.keys(data.plan.data.days).sort();
  return (
    <div className="flex items-center gap-1 mb-4">
      <button type="button" aria-label="Semana anterior" onClick={() => onShift(-7)} className="w-8 h-12 text-zinc-500 flex items-center justify-center"><ChevronLeft size={20} /></button>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map(d => {
          const on = d === date; const today = d === data.today;
          const done = data.consumption.some(c => c.day === d);
          return (
            <button key={d} type="button" onClick={() => onPick(d)} aria-current={on ? 'date' : undefined} aria-label={longDate(d)}
              className={`h-14 rounded-2xl flex flex-col items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${on ? 'bg-emerald-400 text-emerald-950' : 'bg-white/[0.05] text-zinc-300'}`}>
              <span className={`text-[10px] uppercase ${on ? 'text-emerald-900' : 'text-zinc-500'}`}>{dowOf(d).slice(0, 1)}</span>
              <span className="text-[15px] font-semibold tabular-nums">{Number(d.slice(8))}</span>
              <span className={`w-1 h-1 rounded-full ${done ? (on ? 'bg-emerald-900' : 'bg-emerald-400') : today && !on ? 'bg-zinc-500' : 'bg-transparent'}`} />
            </button>);
        })}
      </div>
      <button type="button" aria-label="Semana siguiente" onClick={() => onShift(7)} className="w-8 h-12 text-zinc-500 flex items-center justify-center"><ChevronRight size={20} /></button>
    </div>
  );
}

function DaySummary({ date, data, foods }) {
  const meals = data.plan.data.days[date]?.meals || [];
  const plan = sumResults(meals.map(m => computeItems(m.items, foods)));
  const eaten = data.consumption.filter(c => c.day === date);
  const done = eaten.length ? sumResults(eaten.map(c => c.snapshot.computed)) : null;
  const v = (r) => (r ? r.value : 0);
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0"><Ring value={v(done?.kcal)} total={plan.kcal.value} />
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[17px] font-bold tabular-nums text-white leading-none">{nf(v(done?.kcal))}</span><span className="text-[10px] text-zinc-500 mt-0.5">de {nf(plan.kcal.value)}</span></div></div>
        <div className="flex-1 min-w-0">
          <Bar label="Proteína" done={v(done?.protein)} plan={plan.protein.value} unit="g" color="bg-emerald-400" />
          <Bar label="Hidratos" done={v(done?.carbs)} plan={plan.carbs.value} unit="g" color="bg-amber-400" />
          <Bar label="Grasa" done={v(done?.fat)} plan={plan.fat.value} unit="g" color="bg-sky-400" />
        </div>
      </div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-[13px] text-zinc-400">
        <span>Fibra {nf(plan.fiber.value)} g · Sal {nf(plan.salt.value, 1)} g · {eaten.length} de {meals.length} tomas registradas</span><ChevronDown size={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
          {NUTRIENTS.filter(n => n.group !== 'macro' || ['satfat', 'sugars', 'sodium', 'epadha'].includes(n.key)).map(n => (
            <div key={n.key} className="flex justify-between gap-2"><span className="text-zinc-400 truncate">{n.label}</span><span className="tabular-nums text-zinc-200"><Val r={plan[n.key]} unit={n.unit} d={n.d ?? 0} /></span></div>))}
          <p className="col-span-2 text-[11px] text-zinc-500 mt-2 leading-relaxed">Plan del día según USDA SR26. Referencias generales, no personales: sal por debajo de 5 g/día (OMS) y unos 25 g de fibra (EFSA). «—» significa que la fuente no trae el dato, no que sea cero.</p>
        </div>)}
    </Card>
  );
}

function MealCard({ meal, data, foods, recipes, onSwap, onSwapItem, onReload, setMsg }) {
  const day = meal.id.slice(0, 10);
  const slot = SLOTS[meal.slot];
  const res = useMemo(() => computeItems(meal.items, foods), [meal, foods]);
  const restr = useMemo(() => checkRestrictions(meal.items, foods, data.profile), [meal, foods, data.profile]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const eaten = data.consumption.filter(c => c.day === day && c.slot === meal.slot);
  const prep = meal.prep || recipes[meal.recipe]?.prep;
  const minutes = meal.minutes ?? recipes[meal.recipe]?.active_minutes;
  const run = async (fn) => { setBusy(true); try { await fn(); await onReload(); } catch (x) { setMsg(x.message); } finally { setBusy(false); } };
  const toggleDone = () => run(async () => {
    if (eaten.length) { for (const e of eaten) await api('row/delete', { table: 'consumption', id: e.id }); }
    else await api('consume', { day, slot: meal.slot, meal_name: meal.name, items: meal.items, client_key: uid() });
  });
  const lock = () => run(() => api('meal/lock', { week: data.week_start, day, meal_id: meal.id, version: data.plan.version }));
  return (
    <Card className={eaten.length ? 'ring-emerald-400/30' : ''}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${slot.tint}`}><slot.Icon size={21} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-zinc-500">{slot.label} · {slot.time}{minutes ? <span className="inline-flex items-center gap-1 ml-2"><Clock size={11} /> {minutes} min</span> : null}</p>
          <h3 className="text-[17px] font-semibold leading-snug text-white">{meal.name}</h3>
        </div>
        <button type="button" onClick={lock} disabled={busy} aria-label={meal.locked ? 'Desbloquear plato' : 'Bloquear plato'} className={`w-9 h-9 rounded-full flex items-center justify-center ${meal.locked ? 'text-emerald-300 bg-emerald-400/10' : 'text-zinc-600'}`}>{meal.locked ? <Lock size={16} /> : <LockOpen size={16} />}</button>
      </div>
      <ul className="mt-3 rounded-2xl bg-black/30 divide-y divide-white/[0.05]">
        {meal.items.map((it, i) => (
          <li key={i}><button type="button" disabled={meal.locked} onClick={() => onSwapItem(meal, i)} aria-label={`Cambiar ${foods[it.food]?.name}`}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-white/[0.05] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 rounded-2xl">
            <span className="flex-1 text-[14px] text-zinc-200">{foods[it.food]?.name || it.food}</span>
            <span className="text-[14px] tabular-nums text-zinc-400">{qty(it)}</span>
            {!meal.locked && <Repeat2 size={15} className="text-zinc-600" />}
          </button></li>))}
      </ul>
      <MacroLine res={res} className="mt-2" />
      {restr.violations.map((x, i) => <p key={i} className="text-[13px] text-red-300 mt-2">No compatible: {x}</p>)}
      {prep && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-[13px] text-emerald-300 inline-flex items-center gap-1">Cómo se hace <ChevronDown size={14} className={open ? 'rotate-180' : ''} /></button>}
      {open && prep && <p className="mt-1 text-[14px] leading-relaxed text-zinc-300">{prep}</p>}
      <div className="flex gap-2 mt-3">
        <Btn kind={eaten.length ? 'sec' : 'pri'} className="flex-1" disabled={busy} onClick={toggleDone}><Check size={18} /> {eaten.length ? 'Hecho' : 'Me lo he comido'}</Btn>
        <Btn kind="sec" disabled={meal.locked || busy} onClick={() => onSwap(meal)}><Repeat2 size={18} /> Cambiar</Btn>
      </div>
    </Card>
  );
}

function History({ data, onReload, setMsg }) {
  const live = data.history.filter(h => !h.undone_at).slice(0, 6);
  if (!live.length) return null;
  const undo = async (id) => { try { await api('swap/undo', { history_id: id }); setMsg('Cambio deshecho'); onReload(); } catch (x) { setMsg(x.message); } };
  return (
    <Card><H2>Últimos cambios</H2>
      {live.map(h => (
        <div key={h.id} className="flex items-center gap-3 py-2 border-t border-white/[0.05] first:border-0">
          <span className="flex-1 text-[13px] text-zinc-300">{cap(dowOf(h.day))}: {h.summary.replace(/ \[[^\]]+\]$/, '')}</span>
          <button type="button" onClick={() => undo(h.id)} className="text-[13px] text-emerald-300 inline-flex items-center gap-1 min-h-[40px]"><Undo2 size={14} /> Deshacer</button>
        </div>))}
    </Card>
  );
}

function Hoy({ data, foods, recipes, date, setDate, onReload, setMsg, openSwap }) {
  const day = data.plan.data.days[date];
  const milkUnknown = (data.profile.milk_status || 'unknown') === 'unknown';
  return (
    <>
      <p className="text-[13px] text-emerald-300 font-medium">{date === data.today ? 'Hoy' : date < data.today ? 'Día pasado' : 'Próximamente'}</p>
      <h1 className="text-[26px] font-bold tracking-tight text-white mb-4">{cap(longDate(date))}</h1>
      <WeekStrip data={data} date={date} onPick={setDate} onShift={(n) => { const d = addDays(date, n); setDate(d); onReload(d); }} />
      {!day && <p className="text-zinc-500 py-10 text-center">Cargando…</p>}
      {day && <DaySummary date={date} data={data} foods={foods} />}
      {day && milkUnknown && <Card className="!bg-sky-400/10 ring-sky-400/20"><p className="text-[14px] text-sky-100">Aún no me has dicho si lo tuyo es <b>intolerancia a la lactosa</b> o <b>alergia a la leche</b>. Indícalo en Ajustes para que los lácteos se filtren bien.</p></Card>}
      {day?.meals.map(m => <MealCard key={m.id} meal={m} data={data} foods={foods} recipes={recipes} onSwap={(meal) => openSwap(meal, null)} onSwapItem={openSwap} onReload={() => onReload(date)} setMsg={setMsg} />)}
      {day && <History data={data} onReload={() => onReload(date)} setMsg={setMsg} />}
      <p className="text-[11px] text-zinc-600 text-center mt-4 leading-relaxed">Menú orientativo para organizarte. No sustituye a tu médico ni a tu nutricionista.</p>
    </>
  );
}

// ---------- Semana ----------
function Semana({ data, foods, setDate, setTab, onReload, openSwap }) {
  const ws = data.week_start;
  const days = Object.keys(data.plan.data.days).sort();
  const week = sumResults(days.flatMap(d => data.plan.data.days[d].meals.map(m => computeItems(m.items, foods))));
  const avg = (r) => ({ ...r, value: r.value / 7 });
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Btn kind="sec" aria-label="Semana anterior" onClick={() => onReload(addDays(ws, -7))} className="!px-3"><ChevronLeft size={20} /></Btn>
        <div className="text-center"><p className="text-[13px] text-zinc-500">Semana del</p><h1 className="text-[20px] font-bold text-white">{fmtDate(ws)}</h1></div>
        <Btn kind="sec" aria-label="Semana siguiente" onClick={() => onReload(addDays(ws, 7))} className="!px-3"><ChevronRight size={20} /></Btn>
      </div>
      <Card><H2>Media diaria de la semana</H2><MacroLine res={{ kcal: avg(week.kcal), protein: avg(week.protein), carbs: avg(week.carbs), fat: avg(week.fat) }} />
        <p className="text-[13px] text-zinc-400 mt-2">Fibra {nf(week.fiber.value / 7)} g · Sal {nf(week.salt.value / 7, 1)} g · Omega 3 {nf(week.epadha.value / 7, 2)} g al día</p></Card>
      {days.map(d => (
        <Card key={d}>
          <H2 right={<button type="button" className="text-[13px] text-emerald-300 min-h-[36px]" onClick={() => { setDate(d); setTab('hoy'); }}>Ver día</button>}>{cap(dowOf(d))} {Number(d.slice(8))}{d === data.today ? ' · hoy' : ''}</H2>
          {data.plan.data.days[d].meals.map(m => {
            const S = SLOTS[m.slot];
            return (
              <button key={m.id} type="button" disabled={m.locked} onClick={() => openSwap(m, null)} className="w-full flex items-center gap-3 py-2 text-left border-t border-white/[0.05] first:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 rounded-xl">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${S.tint}`}><S.Icon size={16} /></span>
                <span className="flex-1 text-[14px] text-zinc-200 leading-snug">{m.name}</span>
                {m.locked ? <Lock size={14} className="text-emerald-300" /> : <Repeat2 size={15} className="text-zinc-600" />}
              </button>);
          })}
        </Card>))}
    </>
  );
}

// ---------- Compra ----------
function Compra({ data, foods, onReload, setMsg }) {
  const allItems = useMemo(() => Object.values(data.plan.data.days).flatMap(d => d.meals.flatMap(m => m.items)), [data]);
  const { map } = useMemo(() => aggregateShopping(allItems, foods), [allItems, foods]);
  const pantry = Object.fromEntries(data.pantry.map(p => [p.food_slug, p.grams]));
  const checks = Object.fromEntries(data.checks.map(c => [c.food_slug, c.bought]));
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const rows = Object.entries(map).map(([slug, need]) => {
    const f = foods[slug]; const have = pantry[slug] || 0; const pend = Math.max(0, need - have); const p = data.prices[slug];
    let packs = null, spend = null, left = null, used = null;
    if (p) { const pi = packInfo(p); used = need * pi.pricePerG; packs = pend > 0 ? Math.ceil(pend / pi.packG) : 0; spend = packs * pi.packPrice; left = packs * pi.packG - pend; }
    return { slug, f, need, have, pend, p, packs, spend, left, used };
  });
  const cats = [...new Set(rows.map(r => r.f.category))].sort();
  const run = async (fn) => { try { await fn(); onReload(); } catch (x) { setMsg(x.message); } };
  const priced = rows.filter(r => r.spend != null);
  const noPrice = rows.filter(r => r.p == null && r.pend > 0).length;
  const unit = (r) => (r.f.density_g_ml ? `${nf(Math.ceil(r.pend / r.f.density_g_ml / 50) * 50)} ml` : r.f.unit_g ? `${Math.ceil(r.pend / r.f.unit_g)} ud` : `${nf(Math.ceil(r.pend / 10) * 10)} g`);
  return (
    <>
      <div className="flex items-end justify-between mb-4"><div><p className="text-[13px] text-zinc-500">Semana del {fmtDate(data.week_start)}</p><h1 className="text-[26px] font-bold tracking-tight text-white">Compra</h1></div>
        <Btn kind="sec" onClick={() => window.print()} aria-label="Imprimir lista" className="!px-3"><Printer size={18} /></Btn></div>
      <Card>
        <div className="flex justify-between text-[14px]"><span className="text-zinc-400">Ticket estimado</span><span className="font-semibold text-white">{priced.length ? eur(priced.reduce((a, r) => a + r.spend, 0)) : 'sin precios'}</span></div>
        {noPrice > 0 && <p className="text-[12px] text-zinc-500 mt-1">Parcial: faltan precios de {noPrice} productos. Toca un producto para añadir precio o despensa.</p>}
        {priced.length > 0 && <p className="text-[12px] text-zinc-500 mt-1">Coste de lo que realmente comes: {eur(rows.filter(r => r.used != null).reduce((a, r) => a + r.used, 0))} (los envases enteros dejan sobrantes).</p>}
      </Card>
      {cats.map(cat => (
        <Card key={cat}><H2>{cap(cat)}</H2>
          {rows.filter(r => r.f.category === cat).sort((a, b) => a.f.name.localeCompare(b.f.name)).map(r => (
            <div key={r.slug} className="border-t border-white/[0.05] first:border-0">
              <div className="flex items-center gap-3 py-2.5">
                <button type="button" role="checkbox" aria-checked={!!checks[r.slug]} aria-label={`Comprado: ${r.f.name}`} onClick={() => run(() => api('shopping/check', { week: data.week_start, food_slug: r.slug, bought: !checks[r.slug] }))}
                  className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition ${checks[r.slug] ? 'bg-emerald-400 text-emerald-950' : 'ring-2 ring-white/20 text-transparent'}`}><Check size={16} strokeWidth={3} /></button>
                <button type="button" className="flex-1 text-left min-h-[40px]" onClick={() => { setEdit(edit === r.slug ? null : r.slug); setForm({ pantry: r.have || '', pack: '', price: '', store: '' }); }}>
                  <span className={`block text-[15px] ${checks[r.slug] ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>{r.f.name}</span>
                  <span className="block text-[12px] text-zinc-500">{r.pend > 0 ? unit(r) : 'ya lo tienes'} · {r.f.state}{r.p ? ` · ${r.packs} envase(s), ${eur(r.spend)}` : ''}</span>
                </button>
              </div>
              {edit === r.slug && (
                <div className="pb-3 pl-9 space-y-2">
                  <div className="flex gap-2"><Input type="number" inputMode="decimal" placeholder="Tengo en casa (g)" value={form.pantry} onChange={e => setForm({ ...form, pantry: e.target.value })} /><Btn kind="sec" onClick={() => run(() => api('pantry/save', { food_slug: r.slug, grams: form.pantry || 0 }))}>Guardar</Btn></div>
                  <div className="flex gap-2"><Input type="number" inputMode="decimal" placeholder="Envase (g)" value={form.pack} onChange={e => setForm({ ...form, pack: e.target.value })} /><Input type="number" inputMode="decimal" placeholder="Precio €" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                  <div className="flex gap-2"><Input placeholder="Tienda" value={form.store} onChange={e => setForm({ ...form, store: e.target.value })} /><Btn kind="sec" onClick={() => run(() => api('price/save', { food_slug: r.slug, pack_net_g: form.pack, price_eur: form.price, store: form.store }))}>Guardar</Btn></div>
                  {r.p && <p className="text-[12px] text-zinc-500">Precio del {fmtDate(r.p.price_date)}{r.p.store ? ` en ${r.p.store}` : ''}. Sobrarán {nf(r.left)} g.</p>}
                </div>)}
            </div>))}
        </Card>))}
    </>
  );
}

// ---------- Progreso ----------
function Spark({ points, label }) {
  if (points.length < 2) return <p className="text-[13px] text-zinc-500 py-6 text-center">Con dos registros o más verás aquí la evolución.</p>;
  const ys = points.map(p => p.y); const min = Math.min(...ys), max = Math.max(...ys);
  const x = (i) => 10 + (i * 280) / (points.length - 1); const y = (v) => 78 - ((v - min) / (max - min || 1)) * 62;
  const line = points.map((p, i) => `${x(i)},${y(p.y)}`).join(' ');
  return (
    <svg viewBox="0 0 300 92" className="w-full" role="img" aria-label={label}>
      <polygon fill="rgba(52,211,153,.12)" points={`10,88 ${line} 290,88`} /><polyline fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" points={line} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r="3.5" fill="#0b0d0c" stroke="#34d399" strokeWidth="2"><title>{fmtDate(p.x)}: {p.y}</title></circle>)}
    </svg>
  );
}
function Progreso({ data, onReload, setMsg }) {
  const [w, setW] = useState({ day: data.today, weight: '' });
  const [t, setT] = useState({ day: data.today, sys: '', dia: '', ctx: '' });
  const [s, setS] = useState({ day: data.today, bloating: '', pain: '', bowel: '', notes: '' });
  const run = async (fn, ok) => { try { await fn(); setMsg(ok); onReload(); } catch (x) { setMsg(x.message); } };
  const del = (table, id) => run(() => api('row/delete', { table, id }), 'Eliminado');
  const weights = data.measurements.filter(m => m.kind === 'peso');
  const tens = data.measurements.filter(m => m.kind === 'tension');
  const last = weights[weights.length - 1]; const first = weights[0];
  const Row = ({ children, onDel }) => <div className="flex items-center justify-between py-2 border-t border-white/[0.05] text-[14px] text-zinc-300"><span>{children}</span><button type="button" onClick={onDel} className="text-[12px] text-zinc-500 min-h-[36px] px-2">Borrar</button></div>;
  return (
    <>
      <h1 className="text-[26px] font-bold tracking-tight text-white mb-4">Progreso</h1>
      <Card><H2>Peso</H2>
        {last && <p className="mb-2"><span className="text-[32px] font-bold tabular-nums text-white">{nf(last.weight_kg, 1)}</span><span className="text-zinc-500"> kg</span>{first && first !== last && <span className={`ml-3 text-[14px] ${last.weight_kg <= first.weight_kg ? 'text-emerald-300' : 'text-zinc-400'}`}>{last.weight_kg - first.weight_kg > 0 ? '+' : '−'}{nf(Math.abs(last.weight_kg - first.weight_kg), 1)} kg desde el {fmtDate(first.day)}</span>}</p>}
        <Spark points={weights.map(m => ({ x: m.day, y: m.weight_kg }))} label="Evolución del peso" />
        <div className="flex gap-2 mt-3"><Input type="date" value={w.day} onChange={e => setW({ ...w, day: e.target.value })} /><Input type="number" inputMode="decimal" step="0.1" placeholder="kg" value={w.weight} onChange={e => setW({ ...w, weight: e.target.value })} /></div>
        <Btn className="mt-2 w-full" onClick={() => run(() => api('measure/save', { kind: 'peso', day: w.day, weight_kg: w.weight, client_key: uid() }), 'Peso guardado')}>Guardar peso</Btn>
        {weights.slice(-4).reverse().map(m => <Row key={m.id} onDel={() => del('measurement', m.id)}>{fmtDate(m.day)} · {nf(m.weight_kg, 1)} kg</Row>)}
      </Card>
      <Card><H2>Tensión</H2>
        <div className="flex gap-2"><Input type="number" inputMode="numeric" placeholder="Alta" value={t.sys} onChange={e => setT({ ...t, sys: e.target.value })} /><Input type="number" inputMode="numeric" placeholder="Baja" value={t.dia} onChange={e => setT({ ...t, dia: e.target.value })} /><Input type="date" value={t.day} onChange={e => setT({ ...t, day: e.target.value })} /></div>
        <Input className="mt-2" placeholder="Nota (en reposo, por la mañana…)" value={t.ctx} onChange={e => setT({ ...t, ctx: e.target.value })} />
        <Btn kind="sec" className="mt-2 w-full" onClick={() => run(() => api('measure/save', { kind: 'tension', day: t.day, systolic: t.sys, diastolic: t.dia, context: t.ctx, client_key: uid() }), 'Tensión guardada')}>Guardar tensión</Btn>
        {tens.slice(-4).reverse().map(m => <Row key={m.id} onDel={() => del('measurement', m.id)}>{fmtDate(m.day)} · {m.systolic}/{m.diastolic}{m.context ? ` · ${m.context}` : ''}</Row>)}
      </Card>
      <Card><H2>Digestión</H2>
        <div className="flex gap-2"><Input type="number" inputMode="numeric" min="0" max="10" placeholder="Hinchazón 0-10" value={s.bloating} onChange={e => setS({ ...s, bloating: e.target.value })} /><Input type="number" inputMode="numeric" min="0" max="10" placeholder="Dolor 0-10" value={s.pain} onChange={e => setS({ ...s, pain: e.target.value })} /></div>
        <Input className="mt-2" placeholder="Notas" value={s.notes} onChange={e => setS({ ...s, notes: e.target.value })} />
        <Btn kind="sec" className="mt-2 w-full" onClick={() => run(() => api('symptom/save', { ...s, client_key: uid() }), 'Guardado')}>Guardar</Btn>
        {data.symptoms.slice(-4).reverse().map(m => <Row key={m.id} onDel={() => del('symptom', m.id)}>{fmtDate(m.day)} · hinchazón {m.bloating ?? '—'} · dolor {m.pain ?? '—'}{m.notes ? ` · ${m.notes}` : ''}</Row>)}
        <p className="text-[11px] text-zinc-500 mt-3">Registro descriptivo: no diagnostica ni cambia tu medicación.</p>
      </Card>
    </>
  );
}

// ---------- Más: ajustes y alimentos ----------
function FoodSheet({ food, onClose }) {
  return (
    <Sheet title={food.name} onClose={onClose}>
      <p className="text-[13px] text-zinc-400 mb-3">Por 100 g de «{food.state}». {food.source}{food.source_id ? ` (${food.source_id})` : ''}.</p>
      {[['macro', 'Macronutrientes'], ['mineral', 'Minerales'], ['vitamina', 'Vitaminas']].map(([g, title]) => (
        <Card key={g}><H2>{title}</H2>
          {NUTRIENTS.filter(n => n.group === g).map(n => { const e = food.nutrients[n.key]; return (
            <div key={n.key} className="flex justify-between py-1.5 border-t border-white/[0.05] first:border-0 text-[14px]"><span className="text-zinc-300">{n.label}</span>
              <span className="tabular-nums text-zinc-200">{e ? `${nf(e.v, n.d ?? (e.v < 10 ? 1 : 0))} ${n.unit}` : <span className="text-zinc-600">sin dato</span>}</span></div>); })}
        </Card>))}
      <p className="text-[12px] text-zinc-500">Alérgenos: {food.allergens.length ? food.allergens.join(', ') : 'ninguno declarado'}{food.allergen_status !== 'known' ? ' (producto envasado: comprueba la etiqueta)' : ''}.</p>
    </Sheet>
  );
}

function Mas({ data, onReload, onLogout, setMsg }) {
  const p = data.profile;
  const [f, setF] = useState({ ...p, excluded: (p.excluded || []).join(', ') });
  const [q, setQ] = useState('');
  const [food, setFood] = useState(null);
  const [confirm, setConfirm] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { try { const { tolerances, ...rest } = f; await api('profile/save', { version: data.profile_version, data: rest }); setMsg('Ajustes guardados'); onReload(); } catch (x) { setMsg(x.message); } };
  const list = data.foods.filter(x => norm(x.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <h1 className="text-[26px] font-bold tracking-tight text-white mb-4">Ajustes</h1>
      <Card><H2>Mi dieta</H2>
        <Field label="Leche">
          <select className={inputCls} value={f.milk_status || 'unknown'} onChange={set('milk_status')}>
            <option value="unknown">Por aclarar</option><option value="lactose_intolerance">Intolerancia a la lactosa (puedo tomar sin lactosa)</option>
            <option value="milk_protein_allergy">Alergia a la proteína de la leche (ningún lácteo)</option><option value="none">Sin restricción</option></select></Field>
        <Field label="Alimentos que no quiero ver (separados por comas)"><Input value={f.excluded} onChange={set('excluded')} placeholder="p. ej. coliflor, mejillones" /></Field>
        <p className="text-[12px] text-zinc-500 mb-3">El kiwi está excluido siempre. El catálogo ya deja fuera embutidos, fritos, bollería, alcohol y vinagre.</p>
        <Field label="Objetivo"><select className={inputCls} value={f.goal || ''} onChange={set('goal')}><option value="">Sin definir</option><option value="organizar">Comer de forma saludable y organizada</option><option value="mantener">Mantener peso</option><option value="perder">Perder peso</option></select></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Talla (cm)"><Input type="number" inputMode="decimal" value={f.height_cm ?? ''} onChange={set('height_cm')} /></Field>
          <Field label="Peso actual (kg)"><Input type="number" inputMode="decimal" value={f.weight_kg ?? ''} onChange={set('weight_kg')} /></Field>
        </div>
        <Field label="Presupuesto semanal (€)"><Input type="number" inputMode="decimal" value={f.weekly_budget_eur ?? ''} onChange={set('weekly_budget_eur')} /></Field>
        <Btn className="w-full" onClick={save}>Guardar</Btn>
      </Card>
      <Card><H2>Alimentos ({data.foods.length})</H2>
        <div className="relative mb-2"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" /><Input className="!pl-10" placeholder="Buscar alimento…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {list.map(x => <button key={x.slug} type="button" onClick={() => setFood(x)} className="w-full flex justify-between gap-3 py-2.5 border-t border-white/[0.05] text-left"><span className="text-[14px] text-zinc-200">{x.name}</span><span className="text-[13px] tabular-nums text-zinc-500 shrink-0">{x.nutrients.kcal ? `${nf(x.nutrients.kcal.v)} kcal` : '—'}</span></button>)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">Datos por 100 g de USDA National Nutrient Database for Standard Reference, Release 26. La leche, el yogur y el queso «sin lactosa» usan los valores del mismo producto normal (estimación por alimento similar). El yodo no viene en esa fuente y aparece sin dato.</p>
      </Card>
      <Card><H2>Sesión y datos</H2>
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="sec" onClick={onLogout}><LogOut size={17} /> Salir</Btn>
          <a className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 rounded-2xl bg-white/[0.07] text-[15px] font-semibold" href="/api/dieta/export" download><Download size={17} /> Exportar</a>
          <Btn kind="sec" className="col-span-2" onClick={async () => { await api('logout-all', {}); window.location.reload(); }}>Cerrar sesión en todos los dispositivos</Btn>
        </div>
        <details className="mt-4"><summary className="text-[13px] text-zinc-500 cursor-pointer">Borrar todos mis datos de dieta</summary>
          <p className="text-[13px] text-zinc-400 my-2">Borra perfil, planes, registros y precios. No afecta al resto de la web. Escribe BORRAR MIS DATOS DE DIETA.</p>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} /><Btn kind="danger" className="mt-2 w-full" disabled={confirm !== 'BORRAR MIS DATOS DE DIETA'} onClick={async () => { try { await api('data/delete', { confirm }); setMsg('Datos borrados'); setConfirm(''); onReload(); } catch (x) { setMsg(x.message); } }}>Borrar</Btn></details>
      </Card>
      {food && <FoodSheet food={food} onClose={() => setFood(null)} />}
    </>
  );
}

// ---------- Aplicación ----------
const TABS = [['hoy', 'Hoy', Sun], ['semana', 'Semana', CalendarDays], ['compra', 'Compra', ShoppingBasket], ['progreso', 'Progreso', LineChart], ['mas', 'Ajustes', Settings2]];

export default function DietaApp() {
  const [data, setData] = useState(null);
  const [auth, setAuth] = useState('loading');
  const [tab, setTab] = useState('hoy');
  const [date, setDate] = useState(null);
  const [msg, setMsg] = useState('');
  const [swap, setSwap] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Mi dieta';
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
    m.content = 'noindex,nofollow';
    document.body.style.background = '#0b0d0c';
    return () => { document.body.style.background = ''; };
  }, []);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(''), 3500); return () => clearTimeout(t); }, [msg]);

  const load = useCallback(async (anyDate) => {
    try {
      const d = await api(`bootstrap${anyDate ? `?week=${weekStart(anyDate)}` : ''}`);
      setData(d); setAuth('in'); setDate(prev => (prev && d.plan.data.days[prev] ? prev : anyDate && d.plan.data.days[anyDate] ? anyDate : d.plan.data.days[d.today] ? d.today : d.week_start));
    } catch (x) { if (x.status === 401) setAuth('out'); else { setMsg(x.message); setAuth(a => (a === 'loading' ? 'out' : a)); } }
  }, []);
  useEffect(() => { load(); }, [load]);

  const foods = useMemo(() => (data ? Object.fromEntries(data.foods.map(f => [f.slug, f])) : {}), [data]);
  const recipes = useMemo(() => (data ? Object.fromEntries(data.recipes.map(r => [r.slug, r])) : {}), [data]);
  const logout = async () => { try { await api('logout', {}); } catch { /* ya cerrada */ } setData(null); setAuth('out'); };

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  if (auth === 'loading') return <div className="min-h-screen bg-[#0b0d0c] text-zinc-500 flex items-center justify-center">Cargando…</div>;
  if (auth === 'out') return <Login onDone={() => load()} />;
  if (!data || !date) return null;
  const reload = (d) => load(d || date);
  const pickDate = (d) => { setDate(d); if (!data.plan.data.days[d]) load(d); };
  const apply = async (cand, accept) => {
    setBusy(true);
    try {
      const day = swap.meal.id.slice(0, 10);
      await api('swap/apply', { week: data.week_start, version: data.plan.version, day, meal_id: swap.meal.id, items: cand.ingredients, name: cand.name, recipe: cand.recipe, prep: cand.prep || '', minutes: cand.active_minutes ?? null, accept_pending: accept, client_key: uid() });
      setSwap(null); setMsg('Cambio guardado'); await reload();
    } catch (x) { setMsg(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-[#0b0d0c] text-zinc-100 antialiased" style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
      <main className="max-w-xl mx-auto px-4 pt-[max(20px,env(safe-area-inset-top))] pb-28">
        {tab === 'hoy' && <Hoy data={data} foods={foods} recipes={recipes} date={date} setDate={pickDate} onReload={reload} setMsg={setMsg} openSwap={(meal, index) => setSwap({ meal, index })} />}
        {tab === 'semana' && <Semana data={data} foods={foods} setDate={pickDate} setTab={setTab} onReload={(d) => { setDate(d); load(d); }} openSwap={(meal, index) => setSwap({ meal, index })} />}
        {tab === 'compra' && <Compra data={data} foods={foods} onReload={reload} setMsg={setMsg} />}
        {tab === 'progreso' && <Progreso data={data} onReload={reload} setMsg={setMsg} />}
        {tab === 'mas' && <Mas data={data} onReload={reload} onLogout={logout} setMsg={setMsg} />}
      </main>
      <nav aria-label="Secciones" className="fixed bottom-0 inset-x-0 z-40 bg-[#0b0d0c]/95 backdrop-blur border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)] print:hidden">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {TABS.map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 ${tab === k ? 'text-emerald-300' : 'text-zinc-500'}`}>
              <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} />{l}</button>))}
        </div>
      </nav>
      {swap && <SwapSheet meal={swap.meal} itemIndex={swap.index} foods={foods} profile={data.profile} tolerances={data.tolerances} busy={busy} onClose={() => setSwap(null)} onApply={apply} />}
      {msg && <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] rounded-2xl bg-white text-zinc-900 px-4 py-3 text-[14px] font-medium shadow-2xl">{msg}</div>}
    </div>
  );
}
