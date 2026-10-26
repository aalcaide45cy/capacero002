// Modo karaoke: resalta la palabra (o línea, o frase) que estás leyendo usando la API de resaltado de CSS
// (CSS Custom Highlight API). No toca el texto ni lo vuelve a pintar: solo marca rangos, así que es ligero.

export const karaokeSupported = () =>
  typeof CSS !== 'undefined' && !!CSS.highlights && typeof Highlight !== 'undefined';

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
  const read =
    s.karaokeRead === 'color' ? s.karaokeReadColor : `color-mix(in srgb, ${s.textColor} 40%, transparent)`;
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

export function createKaraoke() {
  const cur = new Highlight();
  const read = new Highlight();
  CSS.highlights.set('tp-current', cur);
  CSS.highlights.set('tp-read', read);
  let last = '';

  const spanRange = (index, from, to) => {
    const a = index.ranges[from];
    const b = index.ranges[to];
    if (!a || !b) return null;
    const r = document.createRange();
    r.setStart(a.startContainer, a.startOffset);
    r.setEnd(b.endContainer, b.endOffset);
    return r;
  };

  return {
    update(index, i, unit, showRead) {
      if (!index.ranges || i < 0 || i >= index.ranges.length) return;
      const key = `${i}|${unit}|${showRead}|${index.ranges.length}`;
      if (key === last) return;
      last = key;
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
      cur.clear();
      read.clear();
      const now = spanRange(index, from, to);
      if (now) cur.add(now);
      if (showRead && from > 0) {
        const before = spanRange(index, 0, from - 1);
        if (before) read.add(before);
      }
    },
    clear() {
      cur.clear();
      read.clear();
      last = '';
    },
    destroy() {
      CSS.highlights.delete('tp-current');
      CSS.highlights.delete('tp-read');
    },
  };
}
