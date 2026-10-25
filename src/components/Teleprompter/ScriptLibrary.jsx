import React from 'react';
import { Copy, FilePlus2, Pencil, Trash2, X } from 'lucide-react';

const wordCount = text => (text.match(/[\p{L}\p{N}]+/gu) || []).length;

// Lista de guiones guardados en este navegador
export default function ScriptLibrary({ items, currentId, onOpen, onNew, onRename, onDuplicate, onDelete, onClose }) {
  return (
    <div className="tp-modal-backdrop" onClick={onClose}>
      <div className="tp-modal" role="dialog" aria-label="Mis guiones" onClick={e => e.stopPropagation()}>
        <header className="tp-panel-header">
          <h2>Mis guiones</h2>
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <div style={{ padding: 16 }}>
          <button type="button" className="tp-btn tp-btn-primary" onClick={onNew} style={{ marginBottom: 12 }}>
            <FilePlus2 size={18} /> Nuevo guion
          </button>
          <ul className="tp-saved-list">
            {items.map(item => (
              <li key={item.id} className={item.id === currentId ? 'is-current' : ''}>
                <div>
                  <strong>{item.name || 'Sin título'}{item.id === currentId ? ' · abierto' : ''}</strong>
                  <small>
                    {wordCount(item.text).toLocaleString('es-ES')} palabras · ~{Math.max(1, Math.round(wordCount(item.text) / 150))} min ·{' '}
                    {new Date(item.updatedAt).toLocaleString('es-ES')} · {item.format === 'txt' ? 'texto' : 'Markdown'}
                  </small>
                </div>
                <div className="tp-modal-actions">
                  {item.id !== currentId && (
                    <button type="button" className="tp-btn tp-btn-primary" onClick={() => onOpen(item.id)}>Abrir</button>
                  )}
                  <button type="button" className="tp-btn" onClick={() => onRename(item.id)} title="Cambiar el nombre"><Pencil size={16} /></button>
                  <button type="button" className="tp-btn" onClick={() => onDuplicate(item.id)} title="Duplicar"><Copy size={16} /></button>
                  <button type="button" className="tp-btn tp-btn-danger" onClick={() => onDelete(item.id)} title="Borrar"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
          <p className="tp-hint">Los guiones se guardan solo en este navegador. Descárgalos con «Descargar» si quieres una copia.</p>
        </div>
      </div>
    </div>
  );
}
