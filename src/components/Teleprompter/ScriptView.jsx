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

// Renderiza el guion como Markdown (con estilos) o como texto plano.
// Memorizado: el teleprompter se re-renderiza a menudo y el Markdown no debe recalcularse.
function ScriptView({ text, format }) {
  if (format === 'txt') {
    return <div className="tp-script tp-script-txt">{text}</div>;
  }
  return (
    <div className="tp-script tp-script-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(ScriptView);
