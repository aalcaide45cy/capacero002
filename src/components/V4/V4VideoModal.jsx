import React, { useEffect, useState } from 'react';
import { X, Download, Lightbulb, ExternalLink, Check, Heart } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';

export default function V4VideoModal({ video, onClose }) {
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [showSubReminder, setShowSubReminder] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  if (!video) return null;

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";
  const embedUrl = video.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`
    : null;

  const handleDownloadClick = (url) => {
    setDownloadedCount((prev) => prev + 1);
    setShowSubReminder(true);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col text-left">
        
        {/* Top Bar with Close */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            {video.category && (
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/50">
                {video.category}
              </span>
            )}
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline-block">
              Canal Oficial Capa Cero 3D
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <YouTubeIcon className="w-16 h-16 text-red-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">{video.title}</h3>
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <span>Ver directamente en YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 sm:pb-8 flex flex-col gap-5 max-h-[45vh] overflow-y-auto">
          
          {/* Title */}
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
              {video.title}
            </h2>
          </div>

          {/* Description (ONLY if present) */}
          {video.hasDescription && (
            <div className="text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60">
              {video.description}
            </div>
          )}

          {/* Consejo Clave Box (ONLY if present) */}
          {video.hasTip && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                <strong className="text-amber-300 font-bold block mb-0.5">
                  Consejo Clave de Capa Cero:
                </strong>
                {video.consejoClave}
              </div>
            </div>
          )}

          {/* Downloads Section (ONLY if downloads exist) */}
          {video.hasDownloads && (
            <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Archivos y Recursos Descargables</h4>
                </div>
                <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                  {video.downloads.length} {video.downloads.length === 1 ? 'Archivo' : 'Archivos'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {video.downloads.map((dl, idx) => (
                  <button
                    key={dl.id || idx}
                    onClick={() => handleDownloadClick(dl.url)}
                    className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>{dl.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>

              {showSubReminder && (
                <div className="mt-3.5 pt-3 border-t border-cyan-500/20 text-xs text-cyan-200/90 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¡Descarga abierta! Si te ha servido, no olvides suscribirte al canal.</span>
                </div>
              )}
            </div>
          )}

          {/* Conversion Subscribe Banner */}
          <div className="bg-gradient-to-r from-red-950/50 via-zinc-900 to-red-950/50 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-red-400 fill-red-400/30" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">¿Te ha ayudado este vídeo?</h4>
                <p className="text-xs text-zinc-400">Suscríbete a Capa Cero para no perderte el próximo truco.</p>
              </div>
            </div>

            <a
              href={subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 shrink-0"
            >
              <YouTubeIcon className="w-4 h-4 text-white" />
              <span>Suscribirme al Canal (+1 Clic)</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
