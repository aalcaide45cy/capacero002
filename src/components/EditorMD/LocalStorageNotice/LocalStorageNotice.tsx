'use client';

import { useState, useEffect } from 'react';
import { Database, X } from 'lucide-react';

export function LocalStorageNotice() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show the notice only once per browser session
    const alreadyShown = sessionStorage.getItem('editormd_ls_notice_shown');
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem('editormd_ls_notice_shown', '1');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-hide after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || dismissed) return null;

  return (
    <div
      className="ls-notice"
      role="status"
      aria-live="polite"
      aria-label="Aviso: uso de caché local"
    >
      <Database />
      <span>
        Los documentos abiertos se guardan en <strong>caché local</strong> del navegador.
        Ningún dato se envía al servidor.
      </span>
      <button
        className="ls-notice-close"
        onClick={() => { setVisible(false); setDismissed(true); }}
        aria-label="Cerrar aviso"
        id="btn-close-ls-notice"
      >
        <X />
      </button>
    </div>
  );
}
