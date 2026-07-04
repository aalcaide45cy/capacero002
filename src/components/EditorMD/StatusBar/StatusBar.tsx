'use client';

import { AlertTriangle, Sun, Moon, ZoomIn, ZoomOut } from 'lucide-react';
import { useEditor } from '@/context/EditorContext';
import { useTheme } from '@/context/ThemeContext';
import { useScale } from '@/context/ScaleContext';

export function StatusBar() {
  const { activeFile } = useEditor();
  const { theme, toggleTheme } = useTheme();
  const { scale, increaseScale, decreaseScale, resetScale, canIncrease, canDecrease } = useScale();
  const hasFSA = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  return (
    <footer className="statusbar" aria-label="Barra de estado">
      {activeFile ? (
        <>
          <span className="statusbar-item">
            <strong>{activeFile.wordCount.toLocaleString()}</strong>&nbsp;palabras
          </span>
          <span className="statusbar-item">
            <strong>{activeFile.charCount.toLocaleString()}</strong>&nbsp;chars
          </span>
          <span className="statusbar-item">
            Ln&nbsp;<strong>{activeFile.lineCount}</strong>
          </span>
          <span className="statusbar-item">
            Markdown
          </span>
          {activeFile.isDirty && (
            <span className="statusbar-item" style={{ color: 'var(--peach)' }}>
              ● Sin guardar
            </span>
          )}
        </>
      ) : (
        <span className="statusbar-item" style={{ color: 'var(--overlay0)' }}>
          Sin archivo — Ctrl+O para abrir, Ctrl+N para nuevo
        </span>
      )}

      <div className="statusbar-spacer" />

      {/* LocalStorage indicator */}
      <span
        className="ls-indicator statusbar-item"
        title="Los archivos abiertos se guardan temporalmente en localStorage de tu navegador para no perder cambios al recargar. No se envía nada al servidor."
      >
        <AlertTriangle />
        Caché local
      </span>

      {!hasFSA && (
        <span className="statusbar-warning statusbar-item" title="Tu navegador no soporta File System Access API. El guardado usará descarga de archivos.">
          <AlertTriangle />
          FS API no disponible
        </span>
      )}

      {/* Scale mini-controls in statusbar */}
      <span className="statusbar-item" style={{ gap: 2 }}>
        <button
          onClick={decreaseScale}
          disabled={!canDecrease}
          style={{
            background: 'none', border: 'none', cursor: canDecrease ? 'pointer' : 'not-allowed',
            color: canDecrease ? 'var(--overlay1)' : 'var(--surface2)',
            padding: '0 2px', fontSize: 11, fontFamily: 'var(--ui-font)', fontWeight: 700,
          }}
          title="Reducir escala"
          aria-label="Reducir escala"
          id="statusbar-scale-down"
        >
          A−
        </button>
        <button
          onClick={resetScale}
          style={{
            background: 'none', border: 'none', cursor: scale !== 100 ? 'pointer' : 'default',
            color: 'var(--overlay0)', padding: '0 1px', fontSize: 10,
            fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--ui-font)',
          }}
          title="Restablecer escala"
          aria-label="Restablecer escala al 100%"
          id="statusbar-scale-reset"
        >
          {scale}%
        </button>
        <button
          onClick={increaseScale}
          disabled={!canIncrease}
          style={{
            background: 'none', border: 'none', cursor: canIncrease ? 'pointer' : 'not-allowed',
            color: canIncrease ? 'var(--overlay1)' : 'var(--surface2)',
            padding: '0 2px', fontSize: 11, fontFamily: 'var(--ui-font)', fontWeight: 700,
          }}
          title="Aumentar escala"
          aria-label="Aumentar escala"
          id="statusbar-scale-up"
        >
          A+
        </button>
      </span>

      {/* Theme toggle in statusbar */}
      <button
        onClick={toggleTheme}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--overlay1)', display: 'flex', alignItems: 'center',
          padding: '0 4px', borderRadius: 4,
          transition: 'color var(--transition)',
        }}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        id="statusbar-theme-toggle"
      >
        {theme === 'dark'
          ? <Sun style={{ width: 12, height: 12 }} />
          : <Moon style={{ width: 12, height: 12 }} />
        }
      </button>

      <span className="statusbar-item" style={{ color: 'var(--overlay0)' }}>
        EditorMD
      </span>
    </footer>
  );
}
