'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  highlightActiveLine,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEditor } from '@/context/EditorContext';

export interface EditorPaneRef {
  insert: (before: string, after: string, placeholder: string) => void;
  focus: () => void;
}

// Lazy-load turndown to avoid SSR issues
let getTurndown: () => Promise<any>;
if (typeof window !== 'undefined') {
  getTurndown = () =>
    import('turndown').then(m => {
      const TurndownService = m.default;
      const td = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        strongDelimiter: '**',
        emDelimiter: '_',
      });
      // GFM: task list items
      td.addRule('taskListItem', {
        filter(node: HTMLElement) {
          return (
            (node as HTMLInputElement).type === 'checkbox' &&
            node.parentNode?.nodeName === 'LI'
          );
        },
        replacement(_content: string, node: HTMLElement) {
          return (node as HTMLInputElement).checked ? '[x] ' : '[ ] ';
        },
      });
      return td;
    });
}

export const EditorPane = forwardRef<EditorPaneRef, {}>(function EditorPane(_props, ref) {
  const { activeFile, dispatch } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const activeFileIdRef = useRef<string | null>(null);
  const isUpdatingRef = useRef(false);

  // ── Imperative API ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    insert(before: string, after: string, placeholder: string) {
      const view = viewRef.current;
      if (!view) return;
      const { state } = view;
      const { from, to } = state.selection.main;
      const selectedText = state.doc.sliceString(from, to);
      const insertText = selectedText || placeholder;
      const newText = before + insertText + after;
      const cursorPos = from + before.length + insertText.length + after.length;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: cursorPos },
      });
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  // ── Build the editor ────────────────────────────────────
  const initEditor = useCallback((content: string) => {
    if (!containerRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged && !isUpdatingRef.current && activeFileIdRef.current) {
        const newContent = update.state.doc.toString();
        dispatch({
          type: 'UPDATE_CONTENT',
          payload: { id: activeFileIdRef.current, content: newContent },
        });
      }
    });

    // HTML→Markdown paste handler
    const pasteExtension = EditorView.domEventHandlers({
      paste(event, view) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const html = clipboardData.getData('text/html');
        if (html && getTurndown) {
          event.preventDefault();
          // Process HTML→Markdown asynchronously, then insert
          getTurndown()
            .then((td: any) => {
              const cleanHtml = html.replace(
                /<html[^>]*>|<\/html>|<head>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi,
                ''
              );
              const mdText = td.turndown(cleanHtml);
              const { from, to } = view.state.selection.main;
              view.dispatch({
                changes: { from, to, insert: mdText },
                selection: { anchor: from + mdText.length },
              });
            })
            .catch(() => {
              // If turndown fails, insert plain text as fallback
              const plain = clipboardData.getData('text/plain');
              if (plain) {
                const { from, to } = view.state.selection.main;
                view.dispatch({
                  changes: { from, to, insert: plain },
                  selection: { anchor: from + plain.length },
                });
              }
            });
          return true;
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        rectangularSelection(),
        highlightActiveLine(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        updateListener,
        pasteExtension,
        // In-editor keyboard shortcuts
        keymap.of([
          {
            key: 'Ctrl-b',
            run(view) {
              insertAround(view, '**', '**', 'texto en negrita');
              return true;
            },
          },
          {
            key: 'Ctrl-i',
            run(view) {
              insertAround(view, '_', '_', 'texto en cursiva');
              return true;
            },
          },
          {
            key: 'Ctrl-`',
            run(view) {
              insertAround(view, '`', '`', 'código');
              return true;
            },
          },
        ]),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
  }, [dispatch]);

  // ── Sync active file → editor ───────────────────────────
  useEffect(() => {
    if (!activeFile) {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      activeFileIdRef.current = null;
      return;
    }

    // New file opened: rebuild editor
    if (activeFile.id !== activeFileIdRef.current) {
      activeFileIdRef.current = activeFile.id;
      initEditor(activeFile.content);
      return;
    }

    // Content changed externally (e.g. restored from localStorage)
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== activeFile.content) {
      isUpdatingRef.current = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: activeFile.content },
      });
      isUpdatingRef.current = false;
    }
  }, [activeFile?.id, activeFile?.content, initEditor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="editor-pane"
      style={{ overflow: 'hidden' }}
      aria-label="Editor de texto Markdown"
    />
  );
});

function insertAround(view: EditorView, before: string, after: string, placeholder: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to) || placeholder;
  const newText = before + selected + after;
  view.dispatch({
    changes: { from, to, insert: newText },
    selection: { anchor: from + before.length + selected.length + after.length },
  });
}
