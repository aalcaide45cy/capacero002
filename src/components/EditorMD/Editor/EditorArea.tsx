'use client';

import { useRef } from 'react';
import { useEditor } from '@/context/EditorContext';
import { EditorPane, EditorPaneRef } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { EditorToolbar } from './EditorToolbar';
import { WelcomeScreen } from './WelcomeScreen';

export function EditorArea() {
  const { state, activeFile } = useEditor();
  const { viewMode } = state;
  const editorRef = useRef<EditorPaneRef>(null);

  const handleInsert = (before: string, after: string, placeholder: string) => {
    editorRef.current?.insert(before, after, placeholder);
  };

  if (!activeFile) {
    return (
      <main className="editor-area">
        <WelcomeScreen />
      </main>
    );
  }

  return (
    <main className="editor-area">
      <EditorToolbar onInsert={handleInsert} />
      <div className="editor-panels">
        {(viewMode === 'editor' || viewMode === 'split') && (
          <EditorPane ref={editorRef} />
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <PreviewPane />
        )}
      </div>
    </main>
  );
}
