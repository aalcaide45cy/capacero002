import React from 'react';
import { X, Download, ShieldCheck, FileJson, BookOpen, CheckCircle2, Lock } from 'lucide-react';
import { exportProgressBackup, getAllStudyNotes, getAllCoursesProgress } from '../../utils/courseProgress';

export default function BackupModal({ isOpen, onClose, onExportSuccess }) {
  React.useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allNotes = getAllStudyNotes();
  let totalNotes = 0;
  Object.values(allNotes).forEach((arr) => {
    if (Array.isArray(arr)) totalNotes += arr.length;
  });

  const allCourses = getAllCoursesProgress();
  const totalCoursesStarted = Object.keys(allCourses).length;

  const handleDownload = () => {
    exportProgressBackup();
    if (onExportSuccess) {
      onExportSuccess('✅ Copia de seguridad JSON descargada con éxito.');
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative text-left cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Copia de Seguridad de tus Notas
              </h3>
              <p className="text-xs text-zinc-400">
                Exporta tus apuntes y progreso en formato JSON local
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

        {/* Cuerpo Explicativo */}
        <div className="p-5 sm:p-6 space-y-4 text-sm text-zinc-300 leading-relaxed">
          {/* Badge de Privacidad */}
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl w-fit">
            <Lock className="w-3.5 h-3.5" />
            <span>100% Privado • Sin servidores ni registros</span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300">
            <strong className="text-white">Capa Cero 3D</strong> es una plataforma estática y privada: no recopilamos ningún dato personal ni almacenamos tus apuntes en servidores externos. Todo tu contenido se guarda de forma segura en la memoria de este navegador.
          </p>

          <p className="text-xs sm:text-sm text-zinc-400">
            Al pulsar el botón de abajo, se descargará un archivo <strong className="text-cyan-300">.JSON</strong> con todos tus apuntes, marcas de tiempo exactas y lecciones vistas. Puedes guardarlo en tu ordenador como respaldo o transferirlo a otros dispositivos cuando quieras.
          </p>

          {/* Resumen de contenido a exportar */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Notas de estudio</span>
                <strong className="text-base text-white font-black">{totalNotes}</strong>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center shrink-0">
                <FileJson className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Cursos en progreso</span>
                <strong className="text-base text-white font-black">{totalCoursesStarted}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con Botón de Descarga */}
        <div className="p-5 sm:p-6 border-t border-zinc-900 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Archivo JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
