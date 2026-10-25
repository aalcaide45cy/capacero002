import React, { useMemo, useRef, useState } from 'react';
import { FolderOpen, FileDown, FileText, Play, Settings2, Eye, PenLine, Trash2, X, Smartphone } from 'lucide-react';
import ScriptView from './ScriptView';
import SettingsPanel from './SettingsPanel';
import SavedRecordings, { useSavedRecordings } from './SavedRecordings';
import { loadEditorMdFiles } from './storage';

const ACCEPTED = '.md,.markdown,.txt,.text,text/plain,text/markdown';
const WORDS_PER_MINUTE = 150;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function formatFromName(name) {
  return /\.(txt|text)$/i.test(name) ? 'txt' : 'md';
}

function ImportEditorModal({ files, onPick, onClose }) {
  return (
    <div className="tp-modal-backdrop" onClick={onClose}>
      <div className="tp-modal" role="dialog" aria-label="Importar del Editor MD" onClick={e => e.stopPropagation()}>
        <header className="tp-panel-header">
          <h2>Importar del Editor MD</h2>
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <ul className="tp-file-list">
          {files.map((f, i) => (
            <li key={`${f.path || f.name}-${i}`}>
              <button type="button" onClick={() => onPick(f)}>
                <FileText size={18} />
                <span>{f.name || 'Sin título'}</span>
                <small>{f.content.length.toLocaleString('es-ES')} caracteres</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ScriptEditor({ script, setScript, settings, update, onStart, install }) {
  const fileInput = useRef(null);
  const [tab, setTab] = useState('write');
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [installTip, setInstallTip] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const saved = useSavedRecordings();
  const editorFiles = useMemo(() => loadEditorMdFiles(), []);

  const words = useMemo(() => (script.text.match(/[\p{L}\p{N}]+/gu) || []).length, [script.text]);
  const minutes = words / WORDS_PER_MINUTE;

  const openFile = async file => {
    if (!file) return;
    try {
      const text = await readFile(file);
      setScript({ text, format: formatFromName(file.name), name: file.name });
    } catch {
      window.alert('No se ha podido leer el archivo.');
    }
  };

  const downloadScript = () => {
    const ext = script.format === 'txt' ? 'txt' : 'md';
    const base = (script.name || 'guion').replace(/\.(md|markdown|txt|text)$/i, '');
    const blob = new Blob([script.text], { type: script.format === 'txt' ? 'text/plain' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearScript = () => {
    if (!script.text || window.confirm('¿Borrar el guion actual? Descárgalo antes si quieres conservarlo.')) {
      setScript({ text: '', format: script.format, name: '' });
    }
  };

  const onInstall = () => {
    if (install.prompt) install.prompt();
    else setInstallTip(t => !t);
  };

  return (
    <div
      className="tp-editor"
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={e => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        openFile(e.dataTransfer.files?.[0]);
      }}
    >
      <header className="tp-topbar">
        <div className="tp-brand">
          <img src="/logo-emblem.webp" alt="" width="28" height="28" />
          <div>
            <h1>Teleprompter</h1>
            <span>Capa Cero 3D · todo se guarda solo en este dispositivo</span>
          </div>
        </div>
        <div className="tp-topbar-actions">
          <button type="button" className="tp-btn" onClick={() => fileInput.current?.click()} title="Abrir .md o .txt">
            <FolderOpen size={18} /> <span>Abrir</span>
          </button>
          {editorFiles.length > 0 && (
            <button type="button" className="tp-btn" onClick={() => setImportOpen(true)} title="Importar un documento del Editor MD">
              <FileText size={18} /> <span>Editor MD</span>
            </button>
          )}
          <button type="button" className="tp-btn" onClick={downloadScript} title="Descargar el guion">
            <FileDown size={18} /> <span>Descargar</span>
          </button>
          {!install.installed && (
            <button type="button" className="tp-btn" onClick={onInstall} title="Instalar como app">
              <Smartphone size={18} /> <span>Instalar</span>
            </button>
          )}
          <button type="button" className={`tp-btn${panelOpen ? ' is-on' : ''}`} onClick={() => setPanelOpen(o => !o)} title="Ajustes">
            <Settings2 size={18} /> <span>Ajustes</span>
          </button>
          <button type="button" className="tp-btn tp-btn-primary" onClick={onStart} disabled={!script.text.trim()}>
            <Play size={18} /> Leer
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={e => {
            openFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </header>

      {saved.items.length > 0 && (
        <div className="tp-install-tip">
          <p>
            Tienes <strong>{saved.items.length}</strong> {saved.items.length === 1 ? 'grabación guardada' : 'grabaciones guardadas'} en
            este dispositivo (copia de seguridad).
          </p>
          <button type="button" className="tp-btn" onClick={() => setRecsOpen(true)}>Ver grabaciones</button>
        </div>
      )}

      {installTip && (
        <div className="tp-install-tip">
          <p>
            <strong>iPhone / iPad:</strong> en Safari pulsa <em>Compartir</em> y luego <em>Añadir a pantalla de inicio</em>.{' '}
            <strong>Android / ordenador:</strong> usa <em>Instalar aplicación</em> en el menú del navegador.
          </p>
          <button type="button" className="tp-icon-btn" onClick={() => setInstallTip(false)} aria-label="Cerrar"><X size={18} /></button>
        </div>
      )}

      <div className="tp-editor-toolbar">
        <div className="tp-segmented" role="tablist" aria-label="Vista">
          <button type="button" role="tab" aria-selected={tab === 'write'} className={tab === 'write' ? 'is-active' : ''} onClick={() => setTab('write')}>
            <PenLine size={16} /> Escribir
          </button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}>
            <Eye size={16} /> Vista previa
          </button>
        </div>
        <div className="tp-segmented" role="radiogroup" aria-label="Formato">
          <button type="button" role="radio" aria-checked={script.format === 'md'} className={script.format === 'md' ? 'is-active' : ''} onClick={() => setScript({ ...script, format: 'md' })}>
            Markdown
          </button>
          <button type="button" role="radio" aria-checked={script.format === 'txt'} className={script.format === 'txt' ? 'is-active' : ''} onClick={() => setScript({ ...script, format: 'txt' })}>
            Texto plano
          </button>
        </div>
        <span className="tp-stats">
          {script.name && <strong>{script.name} · </strong>}
          {words.toLocaleString('es-ES')} palabras · ~{minutes < 1 ? '<1' : Math.round(minutes)} min
        </span>
        <button type="button" className="tp-icon-btn" onClick={clearScript} aria-label="Borrar guion" title="Borrar guion">
          <Trash2 size={18} />
        </button>
      </div>

      <main className={`tp-editor-main is-${tab}`}>
        <textarea
          className="tp-textarea"
          value={script.text}
          onChange={e => setScript({ ...script, text: e.target.value })}
          placeholder="Pega o escribe aquí tu guion. También puedes arrastrar un archivo .md o .txt."
          spellCheck
          aria-label="Guion"
        />
        <div className="tp-preview" aria-label="Vista previa">
          <ScriptView text={script.text} format={script.format} />
        </div>
      </main>

      {dragging && <div className="tp-drop">Suelta el archivo .md o .txt</div>}

      {panelOpen && <SettingsPanel settings={settings} update={update} onClose={() => setPanelOpen(false)} />}

      {recsOpen && <SavedRecordings items={saved.items} refresh={saved.refresh} onClose={() => setRecsOpen(false)} />}

      {importOpen && (
        <ImportEditorModal
          files={editorFiles}
          onClose={() => setImportOpen(false)}
          onPick={f => {
            setScript({ text: f.content, format: formatFromName(f.name || ''), name: f.name || '' });
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}
