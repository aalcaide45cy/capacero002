import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const markdownComponents = {
  // Los enlaces no deben sacar al usuario del teleprompter durante la lectura
  a({ node, href, children, ...props }) {
    return <span className="tp-md-link" {...props}>{children}</span>;
  },
  img({ node, alt }) {
    return alt ? <span className="tp-md-img">[{alt}]</span> : null;
  },
};

// Marcadores de dirección: texto en MAYÚSCULAS entre corchetes, p. ej. [PAUSA] o [MIRA A CÁMARA].
// No se leen en voz alta; [PAUSA] detiene el desplazamiento (si la opción está activa).
const MARKER = /\[([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9 .,!¡?¿\-]{1,40})\](?!\()/g;
const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isPause = tag => /^PAUSA/.test(tag.trim());

function withMarkersMd(text) {
  return text.replace(MARKER, (_, tag) => `<span class="tp-marker"${isPause(tag) ? ' data-pause="1"' : ''}>${escapeHtml(tag.trim())}</span>`);
}

function renderTxt(text) {
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(MARKER.source, 'g');
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="tp-marker" {...(isPause(m[1]) ? { 'data-pause': '1' } : {})}>
        {m[1].trim()}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Renderiza el guion como Markdown (con estilos) o como texto plano.
// Memorizado: el teleprompter se re-renderiza a menudo y el Markdown no debe recalcularse.
function ScriptView({ text, format }) {
  if (format === 'txt') {
    return <div className="tp-script tp-script-txt">{renderTxt(text)}</div>;
  }
  return (
    <div className="tp-script tp-script-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {withMarkersMd(text)}
      </ReactMarkdown>
    </div>
  );
}

export default memo(ScriptView);
