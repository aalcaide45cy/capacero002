import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { X, QrCode, Copy, Check, Smartphone, Camera, Link2, ShieldCheck, Sparkles, ArrowRight, Layers, Lock, RefreshCw, AlertTriangle, Trash2, AlertCircle, Unlink, CheckCircle2 } from 'lucide-react';
import { 
  initiateQRSyncSession, 
  pollQRSyncSession, 
  completeQRExchange, 
  applySyncPayload, 
  getAllStudyNotes, 
  getAllCoursesProgress, 
  clearAllLocalDeviceData,
  getVaultId,
  clearVaultId,
  deleteCloudVault,
  syncVaultPull,
  getLastSyncTime
} from '../../utils/courseProgress';

export default function QRSyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('qr');
  const [syncUrl, setSyncUrl] = useState('');
  const [pairId, setPairId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Detectar si es móvil (iPhone/Android) o PC
  const isMobile = typeof window !== 'undefined' && (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent || '') || window.innerWidth < 768);

  // Inicializar estado según dispositivo al abrir
  useEffect(() => {
    if (isOpen) {
      // En móvil se abre por defecto en "Escanear QR" (cámara); en PC en "Mostrar QR"
      setActiveTab(isMobile ? 'camera' : 'qr');
      setCopied(false);
      setErrorMessage(null);
      setManualCode('');
      setCameraError(null);
      setIsConfirmingDelete(false);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          stopCamera();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // Iniciar sesión de emparejamiento para generar QR
      initiateQRSyncSession().then((session) => {
        if (session) {
          setSyncUrl(session.syncUrl);
          setPairId(session.pairId);

          // Iniciar polling en segundo plano
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(async () => {
            const pollRes = await pollQRSyncSession(session.pairId);
            if (pollRes && pollRes.status === 'ready' && pollRes.success) {
              clearInterval(pollIntervalRef.current);
              if (onSyncSuccess) {
                onSyncSuccess('✅ ¡Sincronización establecida!');
              }
              onClose();
            }
          }, 1200);
        }
      });

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        stopCamera();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    } else {
      stopCamera();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isOpen, isMobile]);

  // Manejo de Cámara al cambiar pestañas
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
    } else if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

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
        throw new Error('Tu navegador no permite acceso a la cámara.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
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
      setCameraError(err.message || 'No se pudo acceder a la cámara o el permiso fue denegado.');
      setCameraActive(false);
    }
  };

  const scanQRCode = async () => {
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
          const raw = code.data;
          stopCamera();

          if (raw.includes('#pair=')) {
            const pId = raw.split('#pair=')[1];
            const exRes = await completeQRExchange(pId);
            if (exRes.success) {
              if (onSyncSuccess) onSyncSuccess('✅ ' + exRes.message);
              onClose();
              return;
            }
          } else if (raw.includes('#sync=')) {
            const payload = raw.split('#sync=')[1];
            const appRes = applySyncPayload(payload);
            if (appRes.success) {
              if (onSyncSuccess) onSyncSuccess('✅ ' + appRes.message);
              onClose();
              return;
            }
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanQRCode);
  };

  const handleCopyLink = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualSync = async () => {
    if (!manualCode.trim()) {
      setErrorMessage('Por favor, introduce el código o enlace.');
      return;
    }

    let raw = manualCode.trim();
    if (raw.includes('#pair=')) {
      const pId = raw.split('#pair=')[1];
      const res = await completeQRExchange(pId);
      if (res.success) {
        if (onSyncSuccess) onSyncSuccess('✅ ' + res.message);
        onClose();
      } else {
        setErrorMessage(res.message || 'Código no válido');
      }
    } else if (raw.includes('#sync=')) {
      const payload = raw.split('#sync=')[1];
      const res = applySyncPayload(payload);
      if (res.success) {
        if (onSyncSuccess) onSyncSuccess('✅ ' + res.message);
        onClose();
      } else {
        setErrorMessage(res.message || 'Código no válido');
      }
    } else {
      const res = await completeQRExchange(raw);
      if (res.success) {
        if (onSyncSuccess) onSyncSuccess('✅ ' + res.message);
        onClose();
      } else {
        const res2 = applySyncPayload(raw);
        if (res2.success) {
          if (onSyncSuccess) onSyncSuccess('✅ ' + res2.message);
          onClose();
        } else {
          setErrorMessage('Código no reconocido.');
        }
      }
    }
  };

  const handleUnlinkDevice = () => {
    clearVaultId();
    if (onSyncSuccess) {
      onSyncSuccess('🔌 Dispositivo desvinculado de la Bóveda. Tus notas locales se conservan.');
    }
    onClose();
  };

  const handleDeleteAllLocal = () => {
    const res = clearAllLocalDeviceData();
    if (res.success) {
      if (onSyncSuccess) {
        onSyncSuccess('🗑️ Todos los datos locales de este dispositivo han sido eliminados.');
      }
      onClose();
    }
  };

  const handleDeleteLocalAndCloud = async () => {
    await deleteCloudVault();
    clearAllLocalDeviceData();
    if (onSyncSuccess) {
      onSyncSuccess('🗑️ Bóveda Cloud y datos locales eliminados por completo.');
    }
    onClose();
  };

  const handleForceSyncNow = async () => {
    const res = await syncVaultPull();
    if (onSyncSuccess) {
      onSyncSuccess(res.success ? '✅ ¡Notas actualizadas y sincronizadas desde la nube!' : '⚠️ ' + (res.error || 'No se pudo conectar'));
    }
    onClose();
  };

  const currentVaultId = getVaultId();
  const allNotes = getAllStudyNotes();
  let totalNotes = 0;
  Object.values(allNotes).forEach((arr) => {
    if (Array.isArray(arr)) totalNotes += arr.length;
  });

  const allCourses = getAllCoursesProgress();
  const totalCourses = Object.keys(allCourses).length;

  if (!isOpen) return null;

  // Definición de pestañas según dispositivo (concisas, sin números largos)
  const tabsList = isMobile
    ? [
        { id: 'camera', label: 'Escanear QR', icon: Camera, color: 'text-emerald-400' },
        { id: 'paste', label: 'Pegar Enlace', icon: Link2, color: 'text-blue-400' },
        { id: 'qr', label: 'Mostrar QR', icon: QrCode, color: 'text-cyan-400' },
        { id: 'delete', label: 'Eliminar Datos', icon: Trash2, color: 'text-rose-400' },
      ]
    : [
        { id: 'qr', label: 'Mostrar QR', icon: QrCode, color: 'text-cyan-400' },
        { id: 'camera', label: 'Escanear QR', icon: Camera, color: 'text-emerald-400' },
        { id: 'paste', label: 'Pegar Enlace', icon: Link2, color: 'text-blue-400' },
        { id: 'delete', label: 'Eliminar Datos', icon: Trash2, color: 'text-rose-400' },
      ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg sm:max-w-xl overflow-hidden shadow-2xl flex flex-col relative text-left max-h-[90vh] cursor-default"
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
                Sincroniza y fusiona notas entre PC y Móvil al instante
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal de sincronización"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Sincronización Activa si ya está emparejado */}
        {currentVaultId && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-white">Sincronización activa</strong> ({currentVaultId})
              </span>
            </div>
            <button
              onClick={handleForceSyncNow}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer"
              title="Sincronizar ahora"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sincronizar ahora</span>
            </button>
          </div>
        )}

        {/* Botones de Pestañas en Grid 2x2 (móvil) / 4 columnas (PC) - ¡Cero Scroll! */}
        <div className="px-5 pt-4 pb-2 bg-zinc-950/90 border-b border-zinc-900">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
            {tabsList.map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setIsConfirmingDelete(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                    isSelected
                      ? 'bg-zinc-800 text-white shadow-md border border-cyan-400/40 text-cyan-200 scale-[1.02]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? t.color : 'text-zinc-400'}`} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* ================= PESTAÑA: MOSTRAR QR ================= */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative p-4 bg-white rounded-3xl shadow-[0_0_30px_rgba(0,229,255,0.25)] border-4 border-cyan-400/40 inline-flex items-center justify-center">
                {syncUrl ? (
                  <QRCodeSVG
                    value={syncUrl}
                    size={190}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[190px] h-[190px] flex items-center justify-center text-xs text-zinc-400">
                    Generando QR...
                  </div>
                )}
              </div>

              {/* Indicador de Escucha en Vivo */}
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Esperando escaneo con la cámara del móvil...</span>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Apunta con la cámara de tu teléfono</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Abre la cámara de tu iPhone / Android y enfoca este código QR. Al tocar el enlace, <strong>los datos de ambos dispositivos se sincronizarán y combinarán en los dos sentidos</strong>.
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

          {/* ================= PESTAÑA: ESCANEAR CON CÁMARA ================= */}
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

                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-44 h-44 border-2 border-dashed border-cyan-400/90 rounded-2xl relative">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                    </div>
                    <span className="text-[11px] font-bold text-white bg-black/75 px-3 py-1 rounded-full mt-3 backdrop-blur-sm border border-zinc-700">
                      Enfoca el código QR del otro dispositivo
                    </span>
                  </div>
                )}

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
                Abre <strong>Sincronizar QR</strong> en tu PC (Pestaña 1) y <strong>enfoca la pantalla de tu ordenador con esta cámara</strong> para sincronizar y combinar notas al instante.
              </div>
            </div>
          )}

          {/* ================= PESTAÑA: PEGAR ENLACE ================= */}
          {activeTab === 'paste' && (
            <div className="space-y-4 text-left">
              <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">Pegar Enlace o Código</strong>
                  Pega aquí el enlace de sincronización o código PIN para sincronizar los dos dispositivos sin usar la cámara.
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  Pega el enlace o código:
                </label>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="https://www.capacero3d.com/#pair=CP1234"
                  rows={2}
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

          {/* ================= PESTAÑA: ELIMINAR / DESVINCULAR ================= */}
          {activeTab === 'delete' && (
            <div className="space-y-4 text-left">
              {/* Opción 1: Desvincular si está emparejado */}
              {currentVaultId && (
                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Unlink className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs text-white block">Desvincular este dispositivo</strong>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Desconecta este equipo ({currentVaultId}). Tus notas y cursos locales se mantendrán intactos.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUnlinkDevice}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-500/40 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Desvincular sincronización</span>
                  </button>
                </div>
              )}

              {/* Opción 2: Eliminar datos locales */}
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Eliminar datos locales de este navegador</strong>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Restablece a cero tus notas ({totalNotes}) y cursos ({totalCourses}) exclusivamente en este navegador.
                    </p>
                  </div>
                </div>

                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-500/50 hover:border-rose-400 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Eliminar datos locales</span>
                  </button>
                ) : (
                  <div className="p-3.5 bg-rose-950/90 border-2 border-rose-500 rounded-xl space-y-3 animate-fade-in text-center">
                    <p className="text-xs text-white font-bold leading-snug">
                      ⚠️ ¿Confirmas eliminar tus notas locales?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAllLocal}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer shadow-md"
                      >
                        Solo en este PC
                      </button>
                      {currentVaultId && (
                        <button
                          onClick={handleDeleteLocalAndCloud}
                          className="px-3 py-1.5 rounded-lg text-xs font-black text-rose-200 bg-rose-900/90 hover:bg-rose-800 border border-rose-400/50 transition-all cursor-pointer"
                          title="Borrar en este equipo y también en la nube"
                        >
                          En PC y Nube
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Garantía de Fusión Inteligente y Privacidad */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-900 text-[11px] text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Fusión Segura:</strong> Ambos dispositivos comparan y combinan sus notas sin duplicados.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
