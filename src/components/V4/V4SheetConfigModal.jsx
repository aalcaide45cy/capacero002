import React, { useState } from 'react';
import { X, Table, Check, ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function V4SheetConfigModal({ isOpen, onClose, onSaveUrl, currentUrl }) {
  const [urlInput, setUrlInput] = useState(currentUrl || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sampleHeaders = "Titulo\tURL_Youtube\tCategoria\tDescripcion\tConsejo_Clave\tEnlace_Descarga\tEnlace_Descarga2\tEnlace_Descarga3\tDestacado";

  const handleCopyHeaders = () => {
    navigator.clipboard.writeText(sampleHeaders);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveUrl(urlInput.trim());
    onClose();
  };

  const handleReset = () => {
    setUrlInput('');
    onSaveUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 my-auto text-left">
        
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Vincular Google Sheet en Vivo
              </h3>
              <p className="text-xs text-zinc-400">
                Añade o edita tus vídeos en tu hoja y se actualizarán en la web.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Guide */}
        <div className="py-4 space-y-3.5 text-xs text-zinc-300">
          
          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
            <span className="font-bold text-white block mb-1">
              1. Estructura de tu Google Sheet (Encabezados):
            </span>
            <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-nowrap mb-2">
              Titulo | URL_Youtube | Categoria | Descripcion | Consejo_Clave | Enlace_Descarga | Enlace_Descarga2 | Enlace_Descarga3 | Destacado
            </div>
            <button
              type="button"
              onClick={handleCopyHeaders}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Encabezados copiados al portapapeles!' : 'Copiar encabezados para pegar en Google Sheets'}</span>
            </button>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
            <span className="font-bold text-white block mb-1">
              2. Cómo obtener el enlace CSV de tu hoja:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400">
              <li>En tu Google Sheet, ve a: <strong className="text-zinc-200">Archivo → Compartir → Publicar en la web</strong>.</li>
              <li>En el menú desplegable, selecciona tu hoja <strong className="text-zinc-200">Capacero3d V4</strong> y formato <strong className="text-emerald-400 font-semibold">Valores separados por comas (.csv)</strong>.</li>
              <li>Haz clic en <strong className="text-zinc-200">Publicar</strong> y copia el enlace generado.</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="pt-2">
            <label className="block text-xs font-bold text-zinc-200 mb-1.5">
              Pega aquí la URL de publicación CSV:
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"
              className="w-full bg-zinc-900 text-xs sm:text-sm text-white placeholder-zinc-500 rounded-xl px-3.5 py-3 border border-zinc-700 focus:outline-none focus:border-red-500 font-mono mb-4"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Restablecer datos por defecto
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow transition-all active:scale-95"
                >
                  Guardar y Sincronizar
                </button>
              </div>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
