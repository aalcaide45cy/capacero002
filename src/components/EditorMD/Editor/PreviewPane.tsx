'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { useEditor } from '@/context/EditorContext';

export function PreviewPane() {
  const { activeFile } = useEditor();

  if (!activeFile) return null;

  return (
    <div className="preview-pane" aria-label="Vista previa del documento">
      <div className="preview-content">
        <article className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[
              rehypeSlug,
              rehypeHighlight,
              rehypeKatex,
              rehypeRaw,
            ]}
            components={{
              // Checkbox support for task lists
              input({ node, ...props }) {
                if (props.type === 'checkbox') {
                  return (
                    <input
                      {...props}
                      type="checkbox"
                      className="task-list-item-checkbox"
                      readOnly
                      style={{ cursor: 'default', accentColor: 'var(--accent)' }}
                    />
                  );
                }
                return <input {...props} />;
              },
              // Open links in new tab
              a({ node, href, children, ...props }) {
                const isExternal = href?.startsWith('http');
                return (
                  <a
                    href={href}
                    {...props}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                  >
                    {children}
                  </a>
                );
              },
              // Code blocks with language label
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isBlock = !!match;
                if (!isBlock) {
                  return <code className={className} {...props}>{children}</code>;
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {activeFile.content || '*Documento vacío. Empieza a escribir en el editor.*'}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
