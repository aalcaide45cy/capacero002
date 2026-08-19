import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { importProgressBackup } from '../../utils/courseProgress';

export default function RestoreModal({ isOpen, onClose, onRestoreSuccess }) {
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleProcessFile = (file) => {
    if (!file) return;
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        const res = importProgressBackup(content);
        if (res.success) {
          if (onRestoreSuccess) {
            onRestoreSuccess('✅ Progreso y notas restaurados con éxito desde el archivo JSON.');
          }
          onClose();
        } else {
          setErrorMessage(res.message || 'El archivo seleccionado no tiene el formato correcto.');
        }
      } catch (err) {
        setErrorMessage('Error al leer el archivo JSON seleccionado.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleProcessFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleProcessFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,text/json"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Restaurar Copia de Seguridad
              </h3>
              <p className="text-xs text-zinc-400">
                Importa tus notas y avance desde un archivo JSON previo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Explicativo y Zona de Carga */}
        <div className="p-5 sm:p-6 space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p className="text-xs sm:text-sm text-zinc-300">
            Selecciona el archivo <strong className="text-white">.JSON</strong> de respaldo que descargaste previamente de Capa Cero 3D.
          </p>

          <p className="text-xs sm:text-sm text-zinc-400">
            Al cargarlo, se sincronizarán en este navegador todas tus notas de estudio con sus minutos exactos y las lecciones que completaste.
          </p>

          {/* Zona de Arrastrar / Clic */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-700 hover:border-cyan-400/80 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center gap-2.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileJson className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-white block group-hover:text-cyan-300 transition-colors">
                Haz clic para seleccionar o arrastra tu archivo JSON aquí
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Formato admitido: Archivos .json exportados desde Capa Cero 3D
              </span>
            </div>
          </div>

          {/* Mensaje de error si falla */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-zinc-900 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
          >
            <Upload className="w-4 h-4" />
            <span>Seleccionar Archivo JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
