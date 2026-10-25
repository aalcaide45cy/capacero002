import { normalizeWord } from './voiceMatch';

// Recorre el guion ya pintado y devuelve: las palabras (normalizadas) con su altura en el texto,
// los títulos para el índice y los marcadores [PAUSA] donde se detiene la lectura.
export function buildContentIndex(contentEl) {
  const words = [];
  const tops = [];
  const headings = [];
  const pauses = [];
  if (!contentEl) return { words, tops, headings, pauses };

  const base = contentEl.getBoundingClientRect().top;

  contentEl.querySelectorAll('h1, h2, h3').forEach(el => {
    headings.push({ text: el.textContent.trim(), top: el.getBoundingClientRect().top - base, level: Number(el.tagName[1]) });
  });
  contentEl.querySelectorAll('.tp-marker[data-pause]').forEach(el => {
    pauses.push(el.getBoundingClientRect().top - base);
  });
  pauses.sort((a, b) => a - b);

  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.tp-end, .tp-marker')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const range = document.createRange();
  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue;
    const re = /\S+/g;
    let m = re.exec(text);
    while (m) {
      const word = normalizeWord(m[0]);
      if (word) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const rect = range.getClientRects()[0] || range.getBoundingClientRect();
        words.push(word);
        tops.push(rect.top - base);
      }
      m = re.exec(text);
    }
    node = walker.nextNode();
  }
  return { words, tops, headings, pauses };
}
