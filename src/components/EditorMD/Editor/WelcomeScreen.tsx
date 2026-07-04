'use client';

import { FileText, FolderOpen, File } from 'lucide-react';
import { useEditor } from '@/context/EditorContext';

export function WelcomeScreen() {
  const { openFile, openFolder, newFile } = useEditor();

  return (
    <div className="editor-empty" role="main" aria-label="Pantalla de bienvenida">
      <FileText className="editor-empty-icon" />
      <h1 className="editor-empty-title">EditorMD</h1>
      <p className="editor-empty-subtitle">
        Editor de Markdown elegante y serverless. Tus archivos nunca abandonan tu equipo.
      </p>

      <div className="editor-empty-actions">
        <button
          className="editor-empty-btn primary"
          onClick={newFile}
          id="welcome-btn-new"
        >
          <FileText style={{ width: 16, height: 16 }} />
          Nuevo documento
        </button>
        <button
          className="editor-empty-btn secondary"
          onClick={openFile}
          id="welcome-btn-open"
        >
          <File style={{ width: 16, height: 16 }} />
          Abrir archivo
        </button>
        <button
          className="editor-empty-btn secondary"
          onClick={openFolder}
          id="welcome-btn-folder"
        >
          <FolderOpen style={{ width: 16, height: 16 }} />
          Abrir carpeta
        </button>
      </div>

      <div className="editor-empty-shortcuts">
        <span className="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>N</kbd> Nuevo
        </span>
        <span className="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>O</kbd> Abrir archivo
        </span>
        <span className="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>O</kbd> Abrir carpeta
        </span>
        <span className="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>S</kbd> Guardar
        </span>
      </div>

      <div style={{
        marginTop: 24,
        padding: '12px 20px',
        background: 'var(--surface0)',
        borderRadius: 8,
        border: '1px dashed var(--border)',
        color: 'var(--overlay0)',
        fontSize: 12,
        textAlign: 'center',
      }}>
        💡 También puedes <strong style={{ color: 'var(--subtext0)' }}>arrastrar y soltar</strong> archivos .md directamente aquí
      </div>
    </div>
  );
}
