// Modo karaoke: resalta la palabra (o línea, o frase) que estás leyendo.

export const karaokeSupported = () => true;

export const KARAOKE_STYLES = [
  { value: 'marcador', label: 'Marcador' },
  { value: 'color', label: 'Color' },
  { value: 'subrayado', label: 'Subrayado' },
  { value: 'neon', label: 'Neón' },
];

export const KARAOKE_UNITS = [
  { value: 'palabra', label: 'Palabra' },
  { value: 'linea', label: 'Línea' },
  { value: 'frase', label: 'Frase' },
];

// Variables CSS que usan ::highlight(tp-current) y ::highlight(tp-read)
export function karaokeVars(s) {
  const c = s.karaokeColor;
  let color = c;
  let bg = 'transparent';
  let deco = 'none';
  let shadow = 'none';
  if (s.karaokeStyle === 'marcador') {
    color = s.karaokeText;
    bg = c;
  } else if (s.karaokeStyle === 'subrayado') {
    deco = `underline solid ${c} 0.12em`;
  } else if (s.karaokeStyle === 'neon') {
    shadow = `0 0 0.25em ${c}, 0 0 0.6em ${c}`;
  }
  // «Atenuadas»: el color del texto con transparencia (sin color-mix, para iOS antiguos)
  const hex = /^#([0-9a-f]{6})$/i.exec(s.textColor);
  const dim = hex
    ? `rgba(${parseInt(hex[1].slice(0, 2), 16)}, ${parseInt(hex[1].slice(2, 4), 16)}, ${parseInt(hex[1].slice(4, 6), 16)}, 0.4)`
    : 'rgba(255, 255, 255, 0.4)';
  const read = s.karaokeRead === 'color' ? s.karaokeReadColor : dim;
  return { '--kc': color, '--kb': bg, '--kd': deco, '--kts': shadow, '--kr': read };
}

// Palabra que corresponde a la posición de desplazamiento: dentro de cada línea el resaltado avanza
// de izquierda a derecha al ritmo con el que la línea pasa por la guía
export function wordAtPos(index, pos, lineH) {
  const lines = index.lines;
  if (!lines || !lines.length) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  const target = pos + lineH * 0.5;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].top <= target) lo = mid;
    else hi = mid - 1;
  }
  const line = lines[lo];
  const frac = Math.min(0.999, Math.max(0, (pos - line.top) / lineH + 0.5));
  return line.start + Math.floor(frac * (line.end - line.start + 1));
}

// Marca las palabras con clases CSS normales (is-cur / is-read) sobre los <span class="tp-w"> que pinta ScriptView.
// Se hizo así porque la API de resaltado de CSS no se ve bien en Safari de iPhone; las clases funcionan en todos.
export function createKaraoke() {
  let prev = { from: -1, to: -1, readTo: 0, els: null };

  const mark = (els, from, to, cls, on) => {
    for (let k = from; k <= to; k++) els[k]?.classList[on ? 'add' : 'remove'](cls);
  };

  const reset = () => {
    if (prev.els) {
      mark(prev.els, 0, prev.els.length - 1, 'is-cur', false);
      mark(prev.els, 0, prev.els.length - 1, 'is-read', false);
    }
    prev = { from: -1, to: -1, readTo: 0, els: null };
  };

  return {
    update(index, i, unit, showRead) {
      const els = index.els;
      if (!els || !els.length || i < 0 || i >= els.length) return;
      if (prev.els !== els) reset();
      let from = i;
      let to = i;
      if (unit === 'linea') {
        const line = index.lines.find(l => i >= l.start && i <= l.end);
        if (line) {
          from = line.start;
          to = line.end;
        }
      } else if (unit === 'frase') {
        from = index.starts[i];
        to = index.sentEnd[i];
      }
      const readTo = showRead ? from : 0; // palabras [0, readTo) ya leídas
      if (prev.els === els && from === prev.from && to === prev.to && readTo === prev.readTo) return;

      if (prev.els === els) mark(els, prev.from, prev.to, 'is-cur', false);
      mark(els, from, to, 'is-cur', true);

      if (prev.els !== els) {
        mark(els, 0, readTo - 1, 'is-read', true);
      } else if (readTo > prev.readTo) {
        mark(els, prev.readTo, readTo - 1, 'is-read', true);
      } else if (readTo < prev.readTo) {
        mark(els, readTo, prev.readTo - 1, 'is-read', false);
      }
      prev = { from, to, readTo, els };
    },
    clear: reset,
    destroy: reset,
  };
}
