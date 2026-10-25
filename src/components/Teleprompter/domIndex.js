import { normalizeWord } from './voiceMatch';

// Recorre el guion ya pintado y devuelve: las palabras (normalizadas) con su altura en el texto,
// los títulos para el índice y los marcadores [PAUSA] donde se detiene la lectura.
export function buildContentIndex(contentEl, lineH = 0) {
  const words = [];
  const tops = [];
  const starts = [];
  const headings = [];
  const pauses = [];
  if (!contentEl) return { words, tops, starts, headings, pauses };

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
  let lastBlock = null;
  let newSentence = true;
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
        // La altura se guarda como la parte de arriba de la línea ocupada, centrando el texto en ella,
        // para que quede en medio de la franja de la guía de lectura
        const center = rect.top + rect.height / 2 - base;
        const block = node.parentElement.closest('p, li, h1, h2, h3, h4, blockquote, td, th') || node.parentElement;
        if (block !== lastBlock) newSentence = true;
        lastBlock = block;
        starts.push(newSentence ? words.length : starts[words.length - 1]);
        newSentence = /[.!?…:;]["')\]»”]*$/.test(m[0]);
        words.push(word);
        tops.push(lineH ? center - lineH / 2 : rect.top - base);
      }
      m = re.exec(text);
    }
    node = walker.nextNode();
  }
  return { words, tops, starts, headings, pauses };
}
