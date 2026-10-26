import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, Pencil, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { DEFAULT_SETTINGS } from './storage';
import {
  createPreset, exportPresets, loadPresets, parseImport, sanitize, savePresets, snapshot,
} from './presets';

// Guardar, aplicar, actualizar, renombrar, borrar, exportar e importar presets de ajustes
export default function PresetsView({ groups, settings, update, recording, onBack }) {
  const [list, setList] = useState(loadPresets);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(() => groups.map(g => g.id));
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const validKeys = groups.flatMap(g => g.keys);

  const commit = next => {
    setList(next);
    savePresets(next);
  };
  const toggle = id => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg('Escribe un nombre para el preset.');
      return;
    }
    if (!selected.length) {
      setMsg('Elige al menos un grupo.');
      return;
    }
    commit([createPreset(trimmed.slice(0, 60), settings, groups, selected), ...list]);
    setName('');
    setMsg(`Preset «${trimmed}» guardado.`);
  };

  const apply = p => {
    update(sanitize(p.values, validKeys));
    setMsg(`Aplicado «${p.name}».`);
  };

  const overwrite = p => {
    if (!window.confirm(`¿Sustituir los valores de «${p.name}» por los ajustes actuales?`)) return;
    commit(list.map(x => (x.id === p.id ? { ...x, values: snapshot(settings, groups, x.groups), updatedAt: Date.now() } : x)));
    setMsg(`«${p.name}» actualizado con los ajustes actuales.`);
  };

  const rename = p => {
    const next = window.prompt('Nombre del preset', p.name);
    if (next && next.trim()) commit(list.map(x => (x.id === p.id ? { ...x, name: next.trim().slice(0, 60) } : x)));
  };

  const remove = p => {
    if (window.confirm(`¿Borrar el preset «${p.name}»?`)) commit(list.filter(x => x.id !== p.id));
  };

  const exportAll = () => {
    const blob = new Blob([exportPresets(list)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teleprompter-presets.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async file => {
    if (!file) return;
    try {
      const incoming = parseImport(await file.text());
      commit([...incoming, ...list]);
      setMsg(`${incoming.length} preset(s) importados.`);
    } catch (err) {
      setMsg(`No se ha podido importar: ${err.message}`);
    }
  };

  const factoryReset = () => {
    if (!window.confirm('¿Volver TODOS los ajustes a los valores de fábrica? Tus presets guardados no se tocan.')) return;
    update(sanitize(DEFAULT_SETTINGS, validKeys));
    setMsg('Ajustes restablecidos.');
  };

  return (
    <div className="tp-presets">
      <button type="button" className="tp-back" onClick={onBack}>
        <ArrowLeft size={16} /> Volver a los ajustes
      </button>

      <section className="tp-preset-new">
        <h3>Guardar los ajustes actuales</h3>
        <label className="tp-preset-name">
          <input
            type="text"
            value={name}
            maxLength={60}
            placeholder="Nombre, p. ej. «Grabar con iPhone»"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
        </label>
        <p className="tp-hint">Elige qué grupos incluye (al aplicarlo solo se cambian esos):</p>
        <div className="tp-preset-groups">
          {groups.map(g => {
            const Icon = g.icon;
            const on = selected.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                className={`tp-chip${on ? ' is-on' : ''}`}
                style={{ '--g': g.color, '--g-soft': g.soft }}
                onClick={() => toggle(g.id)}
              >
                <Icon size={14} /> {g.label}
              </button>
            );
          })}
        </div>
        <button type="button" className="tp-btn tp-btn-primary" onClick={save}>
          <Save size={16} /> Guardar preset
        </button>
      </section>

      {msg && <p className="tp-hint tp-preset-msg" role="status">{msg}</p>}

      <h3 className="tp-preset-title">Mis presets ({list.length})</h3>
      {list.length === 0 && <p className="tp-hint">Todavía no tienes ninguno. Ajusta lo que quieras y guárdalo arriba.</p>}
      <ul className="tp-preset-list">
        {list.map(p => (
          <li key={p.id}>
            <div className="tp-preset-info">
              <strong>{p.name}</strong>
              <div className="tp-preset-groups">
                {groups.filter(g => p.groups.includes(g.id)).map(g => {
                  const Icon = g.icon;
                  return (
                    <span key={g.id} className="tp-chip is-on is-small" style={{ '--g': g.color, '--g-soft': g.soft }} title={g.label}>
                      <Icon size={12} />
                    </span>
                  );
                })}
              </div>
              <small>{new Date(p.updatedAt).toLocaleString('es-ES')}</small>
            </div>
            <div className="tp-modal-actions">
              <button type="button" className="tp-btn tp-btn-primary" disabled={recording} onClick={() => apply(p)}>Aplicar</button>
              <button type="button" className="tp-btn" onClick={() => overwrite(p)} title="Guardar los ajustes actuales en este preset"><RefreshCw size={15} /></button>
              <button type="button" className="tp-btn" onClick={() => rename(p)} title="Cambiar el nombre"><Pencil size={15} /></button>
              <button type="button" className="tp-btn tp-btn-danger" onClick={() => remove(p)} title="Borrar"><Trash2 size={15} /></button>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="tp-preset-title">Copias y restablecer</h3>
      <div className="tp-modal-actions">
        <button type="button" className="tp-btn" onClick={exportAll} disabled={!list.length}><Download size={15} /> Exportar presets</button>
        <button type="button" className="tp-btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Importar presets</button>
        <button type="button" className="tp-btn tp-btn-danger" onClick={factoryReset}>Valores de fábrica</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={e => {
          importFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <p className="tp-hint">
        Exportar crea un archivo para pasar tus presets a otro dispositivo (por ejemplo del ordenador al iPhone) e
        importarlos allí. Los presets se guardan solo en este navegador.
      </p>
    </div>
  );
}
