import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { X, QrCode, Copy, Check, Smartphone, Camera, Link2, ShieldCheck, Sparkles, ArrowRight, Layers, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateSyncUrl, applySyncPayload, getAllStudyNotes } from '../../utils/courseProgress';

export default function QRSyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'camera' | 'paste'
  const [syncUrl, setSyncUrl] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const url = generateSyncUrl() || window.location.href;
      setSyncUrl(url);
      setCopied(false);
      setErrorMessage(null);
      setManualCode('');
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Detener la cámara al desmontar o cambiar de pestaña
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
    } else {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no permite acceso a la cámara o requiere HTTPS.');
      }

      // Intentar primero con cámara trasera (si es móvil) o webcam (si es PC)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanQRCode();
      }
    } catch (err) {
      console.warn('Error accediendo a la cámara:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara o el permiso fue denegado.');
      setCameraActive(false);
    }
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width && height) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          let payload = code.data;
          if (payload.includes('#sync=')) {
            payload = payload.split('#sync=')[1];
          }

          const res = applySyncPayload(payload);
          if (res.success) {
            stopCamera();
            if (onSyncSuccess) {
              onSyncSuccess('✅ ' + res.message);
            }
            onClose();
            return;
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanQRCode);
  };

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
                Transfiere notas y progreso entre tu PC y tu iPhone en ambos sentidos
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de 3 Pestañas */}
        <div className="flex border-b border-zinc-900 bg-zinc-900/40 p-1.5 gap-1">
          {/* Pestaña 1: Mostrar QR */}
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Mostrar QR</span>
          </button>

          {/* Pestaña 2: Escanear con Cámara */}
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Escanear QR</span>
          </button>

          {/* Pestaña 3: Pegar Enlace */}
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-400" />
            <span>3. Pegar Enlace</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* ================= 1. PESTAÑA: MOSTRAR QR ================= */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-4">
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

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Para pasar datos al otro dispositivo</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Apunta con la cámara de tu iPhone, o dale a <strong>"Escanear QR"</strong> en el otro dispositivo para transferir tus <strong className="text-cyan-300">{totalNotes} notas</strong> y avance de inmediato.
                </p>
              </div>

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
          )}

          {/* ================= 2. PESTAÑA: ESCANEAR CON CÁMARA / WEBCAM ================= */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-full aspect-video max-w-sm bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/40 flex items-center justify-center shadow-lg">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Guía visual de escaneo y láser animado */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-44 h-44 border-2 border-dashed border-cyan-400/90 rounded-2xl relative">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                    </div>
                    <span className="text-[11px] font-bold text-white bg-black/75 px-3 py-1 rounded-full mt-3 backdrop-blur-sm border border-zinc-700">
                      Enfoca el código QR de tu iPhone aquí
                    </span>
                  </div>
                )}

                {/* Error de cámara */}
                {cameraError && (
                  <div className="absolute inset-0 bg-zinc-950 p-5 flex flex-col items-center justify-center text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-zinc-300 font-medium max-w-xs">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reintentar</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Abre <strong>Sincronizar QR</strong> en tu iPhone (Pestaña 1) y <strong>muestra la pantalla de tu móvil delante de la webcam de tu PC</strong>. Se escaneará en 1 segundo automáticamente.
              </div>
            </div>
          )}

          {/* ================= 3. PESTAÑA: PEGAR ENLACE ================= */}
          {activeTab === 'paste' && (
            <div className="space-y-4 text-left">
              <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">Pegar Enlace Directo</strong>
                  Si no deseas usar la cámara, dale a <strong className="text-cyan-300">"Copiar Enlace"</strong> en tu móvil, envíatelo por WhatsApp Web o AirDrop y pégalo aquí.
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
