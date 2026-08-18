import React, { useEffect, useState, useMemo, useRef } from 'react';
import { X, Download, Lightbulb, ExternalLink, Check, Heart, Youtube, MessageCircle, Play, ChevronRight, Sparkles, BookOpen } from 'lucide-react';
import { trackVideoOpen, trackDownload, trackSubscribe, trackSocialClick } from '../../utils/analytics';

export default function V4VideoModal({ video, allVideos = [], onSelectVideo, onClose }) {
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [showSubReminder, setShowSubReminder] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (video) {
      trackVideoOpen(video);
      // Reset scroll position when switching to another video
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [video]);

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

  // Cálculo inteligente de la Siguiente Lección o Siguiente Vídeo Recomendado
  const { nextVideo, relatedVideos, isCourseLesson } = useMemo(() => {
    if (!video || !Array.isArray(allVideos) || allVideos.length === 0) {
      return { nextVideo: null, relatedVideos: [], isCourseLesson: false };
    }

    const currentCat = (video.category || '').toLowerCase().trim();
    const isCourse = currentCat.startsWith('curso') || currentCat === 'bambu studio';
    const otherVideos = allVideos.filter(v => v.id !== video.id && v.youtubeId !== video.youtubeId);

    let next = null;

    // 1. Si tiene número de capítulo (ej: #1, #2, #8, #8.1, #9), buscar el capítulo inmediatamente superior
    if (video.chapterNumber !== null && typeof video.chapterNumber === 'number') {
      const sameCategoryChapters = otherVideos
        .filter(v => {
          const vCat = (v.category || '').toLowerCase().trim();
          return (vCat === currentCat || isCourse) && typeof v.chapterNumber === 'number' && v.chapterNumber > video.chapterNumber;
        })
        .sort((a, b) => a.chapterNumber - b.chapterNumber);

      if (sameCategoryChapters.length > 0) {
        next = sameCategoryChapters[0];
      }
    }

    // 2. Si no encontró siguiente por capítulo, buscar el siguiente de la misma categoría
    if (!next) {
      const sameCat = otherVideos.filter(v => (v.category || '').toLowerCase().trim() === currentCat);
      if (sameCat.length > 0) {
        next = sameCat[0];
      }
    }

    // 3. Si aún no hay, tomar el vídeo más popular
    if (!next && otherVideos.length > 0) {
      next = [...otherVideos].sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))[0];
    }

    // 4. Seleccionar 2 vídeos relacionados adicionales (excluyendo el actual y el 'next')
    const remaining = otherVideos.filter(v => !next || v.id !== next.id);
    const sameCatRemaining = remaining.filter(v => (v.category || '').toLowerCase().trim() === currentCat);
    const related = sameCatRemaining.length >= 2 
      ? sameCatRemaining.slice(0, 2) 
      : [...sameCatRemaining, ...remaining.filter(v => !sameCatRemaining.includes(v))].slice(0, 2);

    return {
      nextVideo: next,
      relatedVideos: related,
      isCourseLesson: Boolean(isCourse && video.chapterNumber !== null)
    };
  }, [video, allVideos]);

  if (!video) return null;

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";
  const embedUrl = video.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`
    : null;

  const handleDownloadClick = (dl) => {
    setDownloadedCount((prev) => prev + 1);
    setShowSubReminder(true);
    trackDownload(dl, video);
    window.open(dl.url, '_blank');
  };

  const handleSelectSuggestedVideo = (targetVideo) => {
    if (onSelectVideo) {
      onSelectVideo(targetVideo);
    }
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
            {video.chapterNumber !== null && (
              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/40">
                Capítulo #{video.chapterNumber}
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
              <Youtube className="w-16 h-16 text-[#2575c4] mb-3" />
              <h3 className="text-base font-bold text-white mb-2">{video.title}</h3>
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/30"
              >
                <span>Ver directamente en YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Enlace Permanente a YouTube para Comentarios y Likes */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-zinc-300">Reproductor Oficial Capa Cero</span>
          </div>

          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick && trackSocialClick('YouTube Video Direct Comment Link', video.title)}
            className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 px-3.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 group cursor-pointer"
            title="Abrir en YouTube para dejar un comentario, duda o dar Me Gusta"
          >
            <span className="text-sm group-hover:scale-110 transition-transform">💬</span>
            <span>Ver comentarios o dejar una duda en YouTube</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-colors" />
          </a>
        </div>

        {/* Body Content */}
        <div 
          ref={scrollContainerRef}
          className="p-4 sm:p-6 sm:pb-8 flex flex-col gap-5 max-h-[50vh] overflow-y-auto scroll-smooth"
        >
          
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
            <div className="bg-blue-950/40 border border-cyan-500/30 rounded-xl p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
                <strong className="text-cyan-300 font-bold block mb-0.5">
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
                    onClick={() => handleDownloadClick(dl)}
                    className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
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

          {/* ================= ENCADENADO DE VÍDEOS: SIGUIENTE VÍDEO SUGERIDO ================= */}
          {nextVideo && onSelectVideo && (
            <div className="border border-zinc-800 bg-zinc-900/60 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {isCourseLesson ? (
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    {isCourseLesson ? 'Siguiente Lección del Curso' : 'Siguiente Tutorial Recomendado'}
                  </h4>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  Continuar Viendo
                </span>
              </div>

              {/* Tarjeta Principal del Siguiente Vídeo */}
              <div 
                onClick={() => handleSelectSuggestedVideo(nextVideo)}
                className="group/next flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 p-3 rounded-xl cursor-pointer transition-all duration-300 shadow-md"
              >
                {/* Minia con icono Play */}
                <div className="relative w-full sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                  <img
                    src={nextVideo.thumbnail}
                    alt={nextVideo.title}
                    className="w-full h-full object-cover group-hover/next:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover/next:bg-black/20 flex items-center justify-center transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover/next:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    </div>
                  </div>
                  {nextVideo.chapterNumber !== null && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-extrabold bg-black/80 text-cyan-300 px-1.5 py-0.5 rounded">
                      #{nextVideo.chapterNumber}
                    </span>
                  )}
                </div>

                {/* Info y botón */}
                <div className="flex-1 flex flex-col justify-between w-full">
                  <div>
                    <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide block mb-1">
                      {nextVideo.category}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-white group-hover/next:text-cyan-300 transition-colors line-clamp-2">
                      {nextVideo.title}
                    </h5>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">
                      {nextVideo.views ? `${nextVideo.views} visualizaciones` : 'Tutorial oficial'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 group-hover/next:translate-x-1 transition-transform">
                      <span>Reproducir ahora</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Vídeos Relacionados Secundarios */}
              {relatedVideos.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-zinc-800/80">
                  <span className="text-[11px] font-semibold text-zinc-400 block mb-2">
                    Otros tutoriales relacionados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relatedVideos.map((rv) => (
                      <div
                        key={rv.id}
                        onClick={() => handleSelectSuggestedVideo(rv)}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800/60 hover:border-zinc-700 cursor-pointer transition-all group/rel"
                      >
                        <div className="relative w-16 aspect-video rounded overflow-hidden shrink-0 bg-black">
                          <img src={rv.thumbnail} alt={rv.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/rel:bg-black/10">
                            <Play className="w-3 h-3 fill-white text-white" />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-zinc-300 group-hover/rel:text-cyan-300 line-clamp-1 transition-colors">
                          {rv.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversion Subscribe Banner */}
          <div className="bg-gradient-to-r from-blue-950/50 via-zinc-900 to-cyan-950/50 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-cyan-400 fill-cyan-400/30" />
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
              onClick={() => trackSubscribe(`Modal Vídeo: ${video.title}`, video)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 shrink-0 border border-cyan-400/30 cursor-pointer"
            >
              <Youtube className="w-4 h-4 text-white" />
              <span>Suscribirme al Canal</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
