import React, { useEffect, useState, useMemo, useRef } from 'react';
import { X, Download, Lightbulb, ExternalLink, Check, Heart, Youtube, MessageCircle, Play, ChevronRight, Sparkles, BookOpen, FastForward, RotateCcw } from 'lucide-react';
import { trackVideoOpen, trackDownload, trackSubscribe, trackSocialClick } from '../../utils/analytics';
import { saveCourseProgress } from '../../utils/courseProgress';

// Función para normalizar la clave de curso
function extractCourseKey(category) {
  if (!category) return null;
  const c = category.trim();
  if (/^curso/i.test(c)) {
    let name = c.replace(/^curso\s*:?\s*/i, '').trim().toLowerCase();
    if (name === 'bambustudio') name = 'bambu studio';
    return name;
  }
  return null;
}

export default function V4VideoModal({ video, allVideos = [], onSelectVideo, onClose }) {
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [showSubReminder, setShowSubReminder] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null); // 5, 4, 3, 2, 1, 0 o null
  
  const scrollContainerRef = useRef(null);
  const nextVideoRef = useRef(null);
  const onSelectVideoRef = useRef(onSelectVideo);
  const hasTriggeredRef = useRef(false);
  const countdownTimerRef = useRef(null);

  // Mantener las referencias actualizadas
  useEffect(() => {
    onSelectVideoRef.current = onSelectVideo;
  }, [onSelectVideo]);

  // Cálculo inteligente de la Siguiente Lección o Siguiente Vídeo Recomendado
  const { nextVideo, relatedVideos, isCourseLesson, currentLessonIndex, totalCourseLessons } = useMemo(() => {
    if (!video || !Array.isArray(allVideos) || allVideos.length === 0) {
      return { nextVideo: null, relatedVideos: [], isCourseLesson: false, currentLessonIndex: 0, totalCourseLessons: 0 };
    }

    const courseKey = extractCourseKey(video.category);
    const otherVideos = allVideos.filter(v => v.id !== video.id && v.youtubeId !== video.youtubeId);

    let next = null;
    let isCourse = false;
    let lessonIdx = 0;
    let totalLessons = 0;

    // 1. SI ES UN CURSO: Obtener toda la secuencia del curso ordenada de forma ascendente
    if (courseKey) {
      isCourse = true;
      const courseVideos = allVideos.filter(v => extractCourseKey(v.category) === courseKey);
      
      // Ordenar lecciones cronológicamente por capítulo (1 -> 2 -> ... -> 15)
      courseVideos.sort((a, b) => {
        if (a.chapterNumber !== null && b.chapterNumber !== null) {
          return a.chapterNumber - b.chapterNumber;
        }
        if (a.chapterNumber !== null) return -1;
        if (b.chapterNumber !== null) return 1;
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      });

      totalLessons = courseVideos.length;
      const foundIdx = courseVideos.findIndex(v => v.id === video.id || v.youtubeId === video.youtubeId);
      
      if (foundIdx !== -1) {
        lessonIdx = foundIdx + 1;
        if (foundIdx < courseVideos.length - 1) {
          next = courseVideos[foundIdx + 1];
        }
      }
    }

    // 2. Si NO es curso (o si es el último del curso), buscar en la misma categoría
    if (!next && !isCourse) {
      const sameCat = otherVideos.filter(v => (v.category || '').toLowerCase().trim() === (video.category || '').toLowerCase().trim());
      if (sameCat.length > 0) {
        next = sameCat[0];
      }
    }

    // 3. Fallback general para cualquier tutorial: pasar al siguiente más popular
    if (!next && otherVideos.length > 0) {
      const sortedByPopularity = [...otherVideos].sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
      next = sortedByPopularity[0];
    }

    // 4. Vídeos relacionados adicionales
    const remaining = otherVideos.filter(v => !next || v.id !== next.id);
    const sameCatRemaining = remaining.filter(v => (v.category || '').toLowerCase().trim() === (video.category || '').toLowerCase().trim());
    const related = sameCatRemaining.length >= 2 
      ? sameCatRemaining.slice(0, 2) 
      : [...sameCatRemaining, ...remaining.filter(v => !sameCatRemaining.includes(v))].slice(0, 2);

    return {
      nextVideo: next,
      relatedVideos: related,
      isCourseLesson: isCourse,
      currentLessonIndex: lessonIdx,
      totalCourseLessons: totalLessons
    };
  }, [video, allVideos]);

  // Actualizar ref del siguiente vídeo y resetear estados al cambiar de vídeo
  useEffect(() => {
    nextVideoRef.current = nextVideo;
    hasTriggeredRef.current = false;
    setCountdownSeconds(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, [video?.youtubeId, nextVideo]);

  useEffect(() => {
    if (video) {
      trackVideoOpen(video);
      const courseKey = extractCourseKey(video.category);
      if (courseKey) {
        saveCourseProgress(courseKey, video);
      }
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

  // ================= TEMPORIZADOR DE 5 SEGUNDOS =================
  useEffect(() => {
    if (countdownSeconds === null) return;

    if (countdownSeconds === 0) {
      // Tiempo cumplido: saltar al siguiente vídeo
      const target = nextVideoRef.current;
      const onSelect = onSelectVideoRef.current;
      setCountdownSeconds(null);
      if (target && onSelect) {
        onSelect(target);
      }
      return;
    }

    countdownTimerRef.current = setTimeout(() => {
      setCountdownSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdownSeconds]);

  const handleCancelCountdown = () => {
    setCountdownSeconds(null);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
  };

  const handleImmediateSkip = () => {
    setCountdownSeconds(null);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
    const target = nextVideoRef.current;
    const onSelect = onSelectVideoRef.current;
    if (target && onSelect) {
      onSelect(target);
    }
  };

  // ================= CAPTURA DE FIN DE VÍDEO CON YOUTUBE API & POSTMESSAGE =================
  useEffect(() => {
    const startCountdown = () => {
      if (hasTriggeredRef.current) return;
      if (!nextVideoRef.current) return;
      hasTriggeredRef.current = true;
      setCountdownSeconds(5);
    };

    // 1. Escuchar eventos postMessage de YouTube Player Iframe (State 0 = ENDED)
    const handleWindowMessage = (event) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
        if (payload) {
          if (payload.event === 'onStateChange' && (payload.info === 0 || payload.data === 0)) {
            startCountdown();
          } else if (payload.info === 0 && payload.event !== 'infoDelivery') {
            startCountdown();
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);

    // 2. Inicializar YouTube IFrame Player API oficial
    let ytPlayer = null;
    const playerId = `yt-iframe-${video?.youtubeId}`;

    function setupYTPlayer() {
      if (window.YT && window.YT.Player && document.getElementById(playerId)) {
        try {
          ytPlayer = new window.YT.Player(playerId, {
            events: {
              onStateChange: (e) => {
                if (e && e.data === 0) {
                  startCountdown();
                }
              }
            }
          });
        } catch (err) {}
      }
    }

    if (window.YT && window.YT.Player) {
      setupYTPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        setupYTPlayer();
      };
    }

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch (e) {}
      }
    };
  }, [video?.youtubeId]);

  if (!video) return null;

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";
  
  // URL limpia y compatible universalmente sin problemas de sandbox o pantalla en negro
  const embedUrl = video.youtubeId
    ? `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`
    : null;

  const handleDownloadClick = (dl) => {
    setDownloadedCount((prev) => prev + 1);
    setShowSubReminder(true);
    trackDownload(dl, video);
    window.open(dl.url, '_blank');
  };

  const handleSelectSuggestedVideo = (targetVideo) => {
    handleCancelCountdown();
    if (onSelectVideo) {
      onSelectVideo(targetVideo);
    }
  };

  // SVG Ring calculation: Radius 32, Circumference = 2 * PI * 32 = 201.06
  const circleRadius = 32;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = countdownSeconds !== null 
    ? circleCircumference - ((5 - countdownSeconds) / 5) * circleCircumference
    : circleCircumference;

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
            {isCourseLesson && totalCourseLessons > 0 && (
              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/40 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lección {currentLessonIndex} de {totalCourseLessons}</span>
              </span>
            )}
            {video.chapterNumber !== null && !isCourseLesson && (
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
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player & Countdown Overlay */}
        <div className="relative aspect-video w-full bg-black">
          {embedUrl ? (
            <>
              {/* key={video.youtubeId} garantiza el desmontaje limpio */}
              <iframe
                key={video.youtubeId}
                id={`yt-iframe-${video.youtubeId}`}
                src={embedUrl}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* ================= OVERLAY ANIMADO CON ANILLO DE 5 SEGUNDOS ================= */}
              {countdownSeconds !== null && nextVideo && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
                  
                  {/* Anillo de cuenta regresiva SVG */}
                  <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      {/* Círculo de fondo */}
                      <circle
                        cx="40"
                        cy="40"
                        r={circleRadius}
                        className="stroke-zinc-800"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      {/* Círculo de progreso que se va completando */}
                      <circle
                        cx="40"
                        cy="40"
                        r={circleRadius}
                        className="stroke-cyan-400 transition-all duration-1000 ease-linear"
                        strokeWidth="6"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={circleOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    
                    {/* Número central de segundos */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white leading-none">
                        {countdownSeconds}
                      </span>
                      <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider mt-0.5">
                        seg
                      </span>
                    </div>
                  </div>

                  {/* Textos Informativos */}
                  <h4 className="text-base sm:text-lg font-black text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>{isCourseLesson ? '¡Lección Completada!' : '¡Vídeo Completado!'}</span>
                  </h4>
                  
                  <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-md line-clamp-1 mb-5">
                    Siguiente: <strong className="text-cyan-300">{nextVideo.title}</strong>
                  </p>

                  {/* Botones de Control: Saltar ahora / Cancelar */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleImmediateSkip}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Saltar Ahora</span>
                    </button>

                    <button
                      onClick={handleCancelCountdown}
                      className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  </div>

                </div>
              )}
            </>
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
            <span className="font-medium text-zinc-300">Reproducción continua automática activada</span>
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

          {/* Downloads Section (SOLO APARECE SI TIENE ENLACES REALES EN GOOGLE SHEETS) */}
          {Boolean(video.hasDownloads && Array.isArray(video.downloads) && video.downloads.length > 0) && (
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
