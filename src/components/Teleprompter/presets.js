import { DEFAULT_SETTINGS, loadJSON, saveJSON } from './storage';

// Presets de ajustes guardados en este navegador. Cada preset recuerda qué grupos incluye.
const KEY = 'capacero_tp_presets';
const FORMAT = 'capacero-tp-presets';

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function loadPresets() {
  const saved = loadJSON(KEY, []);
  return Array.isArray(saved) ? saved.filter(p => p && p.id && p.name && p.values && Array.isArray(p.groups)) : [];
}

export function savePresets(list) {
  saveJSON(KEY, list);
}

// Solo se guardan las claves de los grupos elegidos
export function snapshot(settings, groups, selectedIds) {
  const keys = groups.filter(g => selectedIds.includes(g.id)).flatMap(g => g.keys);
  const values = {};
  keys.forEach(k => {
    if (k in settings) values[k] = settings[k];
  });
  return values;
}

// Solo se aplican valores de claves conocidas y del mismo tipo que el valor de fábrica
export function sanitize(values, validKeys) {
  const out = {};
  Object.entries(values || {}).forEach(([k, v]) => {
    if (validKeys.includes(k) && typeof v === typeof DEFAULT_SETTINGS[k]) out[k] = v;
  });
  return out;
}

export function createPreset(name, settings, groups, selectedIds) {
  return { id: newId(), name, groups: selectedIds, values: snapshot(settings, groups, selectedIds), updatedAt: Date.now() };
}

export function exportPresets(list) {
  return JSON.stringify({ format: FORMAT, version: 1, presets: list }, null, 2);
}

export function parseImport(text) {
  const data = JSON.parse(text);
  if (data?.format !== FORMAT || !Array.isArray(data.presets)) throw new Error('El archivo no es una lista de presets de este teleprompter');
  return data.presets
    .filter(p => p && p.name && p.values && Array.isArray(p.groups))
    .map(p => ({ id: newId(), name: String(p.name).slice(0, 60), groups: p.groups, values: p.values, updatedAt: Date.now() }));
}
