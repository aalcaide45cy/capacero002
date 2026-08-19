import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Copy, Check, Smartphone, Monitor, Link2, ShieldCheck, Sparkles, ArrowRight, Layers, Lock } from 'lucide-react';
import { generateSyncUrl, applySyncPayload, getAllStudyNotes, getAllCoursesProgress } from '../../utils/courseProgress';

export default function QRSyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' o 'paste'
  const [syncUrl, setSyncUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const url = generateSyncUrl() || window.location.href;
      setSyncUrl(url);
      setCopied(false);
      setErrorMessage(null);
      setManualCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualSync = () => {
    if (!manualCode.trim()) {
      setErrorMessage('Por favor, pega el enlace o código de sincronización.');
      return;
    }

    let payload = manualCode.trim();
    if (payload.includes('#sync=')) {
      payload = payload.split('#sync=')[1];
    }

    const res = applySyncPayload(payload);
    if (res.success) {
      if (onSyncSuccess) {
        onSyncSuccess('✅ ' + res.message);
      }
      onClose();
    } else {
      setErrorMessage(res.message || 'El código no es válido.');
    }
  };

  const allNotes = getAllStudyNotes();
  let totalNotes = 0;
  Object.values(allNotes).forEach((arr) => {
    if (Array.isArray(arr)) totalNotes += arr.length;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative text-left max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/30 border border-cyan-400/40 text-cyan-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Sincronizar Dispositivos</span>
                <span className="text-[10px] font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full uppercase">
                  Privado
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Pasa tus notas y progreso entre PC y Móvil al instante
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

        {/* Selector de Pestañas */}
        <div className="flex border-b border-zinc-900 bg-zinc-900/40 p-1.5">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>1. Escanear con Móvil</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4 text-blue-400" />
            <span>2. Enlace / Del Móvil al PC</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {activeTab === 'qr' ? (
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Tarjeta con Código QR */}
              <div className="p-4 bg-white rounded-3xl shadow-[0_0_30px_rgba(0,229,255,0.25)] border-4 border-cyan-400/40 inline-flex items-center justify-center">
                {syncUrl ? (
                  <QRCodeSVG
                    value={syncUrl}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-zinc-400">
                    Generando QR...
                  </div>
                )}
              </div>

              {/* Instrucción */}
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Apunta la cámara de tu teléfono aquí</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Abre la app Cámara de tu iPhone o Android y toca la notificación para transferir tus <strong className="text-cyan-300">{totalNotes} notas</strong> y cursos al teléfono sin registros.
                </p>
              </div>

              {/* Botón copiar enlace rápido */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 hover:border-cyan-400/60 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">¡Enlace Copiado al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>Copiar Enlace Directo de Sincronización</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">¿Cómo pasar notas del Móvil de vuelta al PC?</strong>
                  En tu móvil, entra en este mismo botón de Sincronizar, dale a <strong className="text-cyan-300">"Copiar Enlace"</strong> (o envíatelo por WhatsApp Web / AirDrop) y pégalo en este recuadro.
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  Pega aquí el enlace o código copiado:
                </label>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="https://www.capacero3d.com/#sync=..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 font-medium">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleManualSync}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
              >
                <Layers className="w-4 h-4" />
                <span>Fusionar y Sincronizar Notas Ahora</span>
              </button>
            </div>
          )}

          {/* Garantía de Fusión Inteligente */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-900 text-[11px] text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Fusión Segura:</strong> Las notas de ambos dispositivos se combinan sin borrar nada.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
