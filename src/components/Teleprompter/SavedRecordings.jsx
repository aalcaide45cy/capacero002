import React, { useCallback, useEffect, useState } from 'react';
import { Download, Share2, Trash2, X } from 'lucide-react';
import { listRecordings, getRecordingBlobs, deleteRecording } from './recStore';

const mb = bytes => (bytes / 1048576).toFixed(1);
const cleanType = type => (type || 'video/mp4').split(';')[0];

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Hook para saber cuántas grabaciones hay guardadas en el navegador
export function useSavedRecordings() {
  const [items, setItems] = useState([]);
  const refresh = useCallback(async () => setItems(await listRecordings()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { items, refresh };
}

export default function SavedRecordings({ items, refresh, onClose }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const withBlobs = async (id, fn) => {
    setBusy(id);
    setError('');
    try {
      const data = await getRecordingBlobs(id);
      if (!data) throw new Error('La copia ya no está disponible');
      await fn(data);
    } catch (err) {
      if (err?.name !== 'AbortError') setError(`${err?.name || 'Error'}: ${err?.message || err}`);
    } finally {
      setBusy('');
    }
  };

  const share = item =>
    withBlobs(item.id, async data => {
      const file = new File([data.video], item.name, { type: cleanType(item.type) });
      await navigator.share({ files: [file] });
    });

  const download = item => withBlobs(item.id, async data => triggerDownload(data.video, item.name));
  const downloadWav = item => withBlobs(item.id, async data => data.wav && triggerDownload(data.wav, item.wavName));

  const remove = async item => {
    if (!window.confirm(`¿Borrar «${item.name}» de este dispositivo? No se puede recuperar.`)) return;
    await deleteRecording(item.id);
    refresh();
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="tp-modal-backdrop" onClick={onClose}>
      <div className="tp-modal" role="dialog" aria-label="Grabaciones guardadas" onClick={e => e.stopPropagation()}>
        <header className="tp-panel-header">
          <h2>Grabaciones en este dispositivo</h2>
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <div style={{ padding: 16 }}>
          <p className="tp-hint">
            Copias de seguridad guardadas solo en este navegador, por si la página se recarga al guardar el vídeo. No se
            suben a ningún sitio. Bórralas cuando ya las tengas guardadas.
          </p>
          {error && <p className="tp-error">{error}</p>}
          {items.length === 0 && <p className="tp-hint">No hay grabaciones guardadas.</p>}
          <ul className="tp-saved-list">
            {items.map(item => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {new Date(item.savedAt).toLocaleString('es-ES')} · {mb(item.size)} MB
                    {item.wavName ? ` + WAV ${mb(item.wavSize)} MB` : ''}
                  </small>
                </div>
                <div className="tp-modal-actions">
                  {canShare && (
                    <button type="button" className="tp-btn" disabled={busy === item.id} onClick={() => share(item)}>
                      <Share2 size={16} /> Compartir
                    </button>
                  )}
                  <button type="button" className="tp-btn" disabled={busy === item.id} onClick={() => download(item)}>
                    <Download size={16} /> Vídeo
                  </button>
                  {item.wavName && (
                    <button type="button" className="tp-btn" disabled={busy === item.id} onClick={() => downloadWav(item)}>
                      <Download size={16} /> WAV
                    </button>
                  )}
                  <button type="button" className="tp-btn tp-btn-danger" onClick={() => remove(item)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
