import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  X, Download, Lightbulb, ExternalLink, Check, Heart, Youtube, MessageCircle, 
  Play, ChevronRight, Sparkles, BookOpen, FastForward, RotateCcw, 
  Bookmark, FileText, Trash2, Clock, Plus, ShieldCheck, Upload, Calendar, Edit3, AlertCircle,
  ChevronLeft, MoreHorizontal, ChevronDown, ChevronUp, Share2, Layers, Zap
} from 'lucide-react';
import { trackVideoOpen, trackDownload, trackSubscribe, trackSocialClick } from '../../utils/analytics';
import { 
  saveCourseProgress, 
  getVideoPlaybackTime, 
  saveVideoPlaybackTime, 
  getVideoNotes, 
  addVideoNote, 
  deleteVideoNote, 
  updateVideoNote,
  formatSecondsToTime,
  getVaultId
} from '../../utils/courseProgress';

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

export default function V4VideoModal({ video, onClose, onSelectVideo, nextVideo: propNextVideo, allVideos = [] }) {
  if (!video) return null;

  const [activeTab, setActiveTab] = useState('lesson'); // 'lesson' | 'notes'
  const [showSubReminder, setShowSubReminder] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null); // 5, 4, 3, 2, 1, 0 o null
  const [showShareToast, setShowShareToast] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Estados para reanudación de tiempo y notas
  const [resumeNotice, setResumeNotice] = useState(null);
  const [currentLiveSeconds, setCurrentLiveSeconds] = useState(0);
  const [noteInputText, setNoteInputText] = useState('');
  const [notesTick, setNotesTick] = useState(0);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => {
    const vId = getVaultId();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return !isOnline ? 'offline' : (vId ? 'synced' : 'unlinked');
  });

  const scrollContainerRef = useRef(null);
  const nextVideoRef = useRef(null);
  const onSelectVideoRef = useRef(onSelectVideo);
  const hasTriggeredRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const playbackTrackerRef = useRef(null);

  // Mantener las referencias actualizadas
  useEffect(() => {
    onSelectVideoRef.current = onSelectVideo;
  }, [onSelectVideo]);

  // Escuchar actualizaciones de notas y sincronización en tiempo real
  useEffect(() => {
    const handleNotesUpdate = () => {
      setNotesTick((prev) => prev + 1);
    };
    const handleSyncStatus = (e) => {
      if (e.detail) {
        setCloudSyncStatus(e.detail.status);
      }
    };

    window.addEventListener('capacero-notes-updated', handleNotesUpdate);
    window.addEventListener('capacero-sync-status', handleSyncStatus);
    return () => {
      window.removeEventListener('capacero-notes-updated', handleNotesUpdate);
      window.removeEventListener('capacero-sync-status', handleSyncStatus);
    };
  }, []);

  // Notas asociadas al vídeo actual
  const currentVideoNotes = useMemo(() => {
    if (!video) return [];
    return getVideoNotes(video.youtubeId || video.id);
  }, [video, notesTick]);

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

  // Cálculo del segundo de inicio exacto para reanudar o saltar a la nota (-5 segundos si es reanudación)
  const initialStartSecond = useMemo(() => {
    if (!video) return 0;
    if (typeof video.startTimestamp === 'number' && video.startTimestamp >= 0) {
      return Math.max(0, Math.floor(video.startTimestamp));
    }
    const saved = getVideoPlaybackTime(video.youtubeId || video.id);
    if (saved > 10) {
      return Math.max(0, Math.floor(saved - 5));
    }
    return 0;
  }, [video?.youtubeId, video?.id, video?.startTimestamp]);

  // Actualizar ref del siguiente vídeo y resetear estados al cambiar de vídeo
  useEffect(() => {
    nextVideoRef.current = nextVideo;
    hasTriggeredRef.current = false;
    setCountdownSeconds(null);
    setNoteInputText('');
    
    if (initialStartSecond > 0) {
      setResumeNotice(`Reanudando desde el min ${formatSecondsToTime(initialStartSecond)} (-5s)`);
      const timer = setTimeout(() => setResumeNotice(null), 5000);
      return () => clearTimeout(timer);
    } else {
      setResumeNotice(null);
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, [video?.youtubeId, nextVideo, initialStartSecond]);

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

  // ================= SEGUIMIENTO DE REPRODUCCIÓN EN TIEMPO REAL & YOUTUBE API =================
  useEffect(() => {
    const startCountdown = () => {
      if (hasTriggeredRef.current) return;
      if (!nextVideoRef.current) return;
      hasTriggeredRef.current = true;
      setCountdownSeconds(5);
    };

    // 1. Escuchar eventos postMessage de YouTube Player Iframe
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

    // 2. Inicializar YouTube IFrame Player API oficial y rastreador de segundos
    const playerId = `yt-iframe-${video?.youtubeId}`;

    function setupYTPlayer() {
      if (window.YT && window.YT.Player && document.getElementById(playerId)) {
        try {
          ytPlayerRef.current = new window.YT.Player(playerId, {
            events: {
              onReady: () => {
                if (playbackTrackerRef.current) clearInterval(playbackTrackerRef.current);
                playbackTrackerRef.current = setInterval(() => {
                  if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                    try {
                      const cur = ytPlayerRef.current.getCurrentTime();
                      if (cur && !isNaN(cur)) {
                        setCurrentLiveSeconds(Math.floor(cur));
                        const state = ytPlayerRef.current.getPlayerState();
                        // State 1 = PLAYING
                        if (state === 1) {
                          const courseKey = extractCourseKey(video?.category);
                          saveVideoPlaybackTime(video?.youtubeId || video?.id, cur, courseKey);
                        }
                      }
                    } catch (err) {}
                  }
                }, 1000);
              },
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
      if (playbackTrackerRef.current) {
        clearInterval(playbackTrackerRef.current);
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [video?.youtubeId]);

  if (!video) return null;

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";
  
  // URL con parámetro de inicio exacto si existe reanudación
  const embedUrl = video.youtubeId
    ? `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1${initialStartSecond > 0 ? `&start=${initialStartSecond}` : ''}`
    : null;

  const handleDownloadClick = (dl) => {
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

  // Salto a timestamp específico
  const handleSeekToTimestamp = (sec) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(sec, true);
      if (typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      }
    }
  };

  // Guardar nuevo apunte con el segundo actual
  const handleCreateNote = (e) => {
    e.preventDefault();
    if (!noteInputText.trim()) return;

    const courseKey = extractCourseKey(video.category) || '';
    addVideoNote(video.youtubeId || video.id, currentLiveSeconds, noteInputText, courseKey, video.title);
    setNoteInputText('');
    setNotesTick((prev) => prev + 1);
  };

  const handleStartEdit = (e, note) => {
    if (e) e.stopPropagation();
    setNoteToEdit({
      id: note.id,
      text: note.text,
      timeFormatted: note.timeFormatted || '00:00',
      timestamp: note.timestamp,
      videoTitle: video.title
    });
  };

  const handleSaveEditModal = () => {
    if (!noteToEdit || !noteToEdit.text.trim()) return;
    updateVideoNote(video.youtubeId || video.id, noteToEdit.id, noteToEdit.text, noteToEdit.timeFormatted);
    setNoteToEdit(null);
    setNotesTick((prev) => prev + 1);
  };

  const handleCancelEditModal = () => {
    setNoteToEdit(null);
  };

  const handlePromptDelete = (e, note) => {
    if (e) e.stopPropagation();
    setNoteToDelete({
      ...note,
      videoTitle: video.title
    });
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    deleteVideoNote(video.youtubeId || video.id, noteToDelete.id);
    setNoteToDelete(null);
    setNotesTick((prev) => prev + 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Aprende con Capa Cero 3D: ${video.title}`,
        url: video.youtubeUrl || window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(video.youtubeUrl || window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
    setShowMoreMenu(false);
  };

  // SVG Ring calculation: Radius 32, Circumference = 2 * PI * 32 = 201.06
  const circleRadius = 32;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = countdownSeconds !== null 
    ? circleCircumference - ((5 - countdownSeconds) / 5) * circleCircumference
    : circleCircumference;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/90 md:bg-black/85 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        {/* Modal Container: Fullscreen on mobile, centered card on desktop */}
        <div className="relative w-full h-full md:h-auto md:max-h-[92vh] md:max-w-5xl lg:max-w-6xl bg-zinc-950 border-0 md:border md:border-zinc-800/90 rounded-none md:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col text-left">
          
          {/* ================= TOP HEADER BAR ================= */}
          <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-zinc-800/80 bg-zinc-950 md:bg-zinc-900/60 shrink-0">
            
            {/* Left: Back / Channel Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900 md:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                aria-label="Cerrar reproductor"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <img 
                  src="/logo-emblem.webp" 
                  alt="Capa Cero Logo" 
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-contain"
                  onError={(e) => { e.target.src = '/logo-capa-cero-small.png'; }}
                />
                <span className="font-black text-sm sm:text-base text-white tracking-tight">
                  CapaCero3D
                </span>
              </div>
            </div>

            {/* Badges (Visible on larger screens) */}
            <div className="hidden lg:flex items-center gap-2">
              {video.category && (
                <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {video.category}
                </span>
              )}
              {isCourseLesson && totalCourseLessons > 0 && (
                <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/40 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lección {currentLessonIndex} de {totalCourseLessons}</span>
                </span>
              )}
            </div>

            {/* Right: Actions (Bookmark, More / Close) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab(prev => prev === 'notes' ? 'lesson' : 'notes')}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  activeTab === 'notes' 
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300' 
                    : 'bg-zinc-900 md:bg-zinc-800/90 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Ver apuntes y notas"
                aria-label="Apuntes"
              >
                <Bookmark className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {currentVideoNotes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {currentVideoNotes.length}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(prev => !prev)}
                  className="p-2 rounded-xl bg-zinc-900 md:bg-zinc-800/90 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                  title="Más opciones"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                {/* Dropdown Menu */}
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in text-xs">
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <Youtube className="w-4 h-4 text-red-500" />
                      <span>Ver en YouTube</span>
                    </a>
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors text-left"
                    >
                      <Share2 className="w-4 h-4 text-cyan-400" />
                      <span>Compartir lección</span>
                    </button>
                    <a
                      href={subscribeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span>Suscribirme</span>
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="hidden md:flex p-2 rounded-xl bg-zinc-800/90 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer ml-1"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
          </div>

          {/* Share Toast */}
          {showShareToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-cyan-950 text-cyan-200 border border-cyan-400/60 text-xs font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-cyan-400" />
              <span>¡Enlace copiado al portapapeles!</span>
            </div>
          )}

          {/* ================= MAIN SCROLLABLE CONTENT BODY ================= */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth"
          >
            
            {/* MOBILE ONLY: Lesson Title Header (Clean and bold at top) */}
            <div className="md:hidden px-4 pt-3.5 pb-2">
              <h2 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
                {video.title}
              </h2>
            </div>

            {/* ================= DESKTOP & MOBILE GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 p-0 md:p-6 flex-1">
              
              {/* LEFT COLUMN: Player & Lesson Core Info */}
              <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-4">
                
                {/* Video Player Box */}
                <div className="relative aspect-video w-full bg-black md:rounded-2xl overflow-hidden border-b md:border border-zinc-800 shadow-2xl">
                  {embedUrl ? (
                    <>
                      <iframe
                        key={`${video.youtubeId}-${initialStartSecond}`}
                        id={`yt-iframe-${video.youtubeId}`}
                        src={embedUrl}
                        title={video.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />

                      {/* Floating Resume Notification */}
                      {resumeNotice && (
                        <div className="absolute top-3 left-3 z-20 bg-blue-950/90 text-cyan-200 border border-cyan-400/60 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 animate-fade-in backdrop-blur-sm">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{resumeNotice}</span>
                        </div>
                      )}

                      {/* 5s Countdown Ring Overlay */}
                      {countdownSeconds !== null && nextVideo && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-3 sm:mb-4">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                              <circle
                                cx="40"
                                cy="40"
                                r={circleRadius}
                                className="stroke-zinc-800"
                                strokeWidth="6"
                                fill="transparent"
                              />
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
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl sm:text-2xl font-black text-white leading-none">
                                {countdownSeconds}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-bold text-cyan-300 uppercase tracking-wider mt-0.5">
                                seg
                              </span>
                            </div>
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-white mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span>{isCourseLesson ? '¡Lección Completada!' : '¡Tutorial Completado!'}</span>
                          </h4>
                          
                          <p className="text-xs text-zinc-300 font-medium max-w-md line-clamp-1 mb-4">
                            Siguiente: <strong className="text-cyan-300">{nextVideo.title}</strong>
                          </p>

                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={handleImmediateSkip}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                            >
                              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                              <span>Saltar Ahora</span>
                            </button>

                            <button
                              onClick={handleCancelCountdown}
                              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <Youtube className="w-14 h-14 text-cyan-500 mb-2" />
                      <h3 className="text-sm font-bold text-white mb-2">{video.title}</h3>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg"
                      >
                        <span>Ver en YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* DESKTOP ONLY: Lesson Title & Metabar */}
                <div className="hidden md:flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {video.category && (
                      <span className="font-semibold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                        {video.category}
                      </span>
                    )}
                    {isCourseLesson && (
                      <span className="font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/40">
                        Lección {currentLessonIndex} de {totalCourseLessons}
                      </span>
                    )}
                    {video.views && (
                      <span className="text-zinc-500 font-medium">
                        {video.views} visualizaciones
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">
                    {video.title}
                  </h2>
                </div>

                {/* DESKTOP ONLY: Consejo Clave & Description Box on Left */}
                <div className="hidden md:flex flex-col gap-4">
                  {/* Consejo Clave */}
                  {video.hasTip && (
                    <div className="bg-gradient-to-br from-cyan-950/40 via-zinc-900/60 to-blue-950/40 border border-cyan-500/40 rounded-2xl p-4 flex items-start gap-3.5 shadow-lg shadow-cyan-950/20">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                        <Lightbulb className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
                        <strong className="text-cyan-400 font-bold block mb-1 text-sm">
                          Consejo clave de Capa Cero
                        </strong>
                        <p className="text-zinc-200">
                          {video.consejoClave}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Description Box */}
                  {video.hasDescription && (
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                      {video.description}
                    </div>
                  )}

                  {/* Downloads if present */}
                  {Boolean(video.hasDownloads && Array.isArray(video.downloads) && video.downloads.length > 0) && (
                    <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                            Archivos y Recursos Descargables
                          </h4>
                        </div>
                        <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                          {video.downloads.length} {video.downloads.length === 1 ? 'Archivo' : 'Archivos'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {video.downloads.map((dl, idx) => (
                          <button
                            key={dl.id || idx}
                            onClick={() => handleDownloadClick(dl)}
                            className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{dl.label}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Community & YouTube comments */}
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackSocialClick && trackSocialClick('YouTube Video Direct Comment Link', video.title)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/40 transition-all text-xs font-bold text-zinc-300 hover:text-white group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base group-hover:scale-110 transition-transform">💬</span>
                      <span>¿Tienes dudas? Deja un comentario o dale Like en YouTube</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>

              </div>

              {/* RIGHT COLUMN: Mobile Tabs / Desktop Navigation & Notes */}
              <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-4">
                
                {/* TAB SWITCHER HEADER (Segmented Bar) */}
                <div className="flex items-center border-b border-zinc-800 bg-zinc-950 px-4 md:px-0 pt-2 md:pt-0">
                  <button
                    onClick={() => setActiveTab('lesson')}
                    className={`flex-1 py-3 px-2 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                      activeTab === 'lesson'
                        ? 'border-cyan-400 text-cyan-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Lección</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 py-3 px-2 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer relative ${
                      activeTab === 'notes'
                        ? 'border-cyan-400 text-cyan-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Apuntes</span>
                    {currentVideoNotes.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                        {currentVideoNotes.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB CONTENT: LECCIÓN */}
                {activeTab === 'lesson' && (
                  <div className="flex flex-col gap-3.5 px-4 md:px-0 pb-6 animate-fade-in">
                    
                    {/* MOBILE ONLY: Description Card */}
                    {video.hasDescription && (
                      <div className="md:hidden bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                        {video.description}
                      </div>
                    )}

                    {/* MOBILE ONLY: Consejo Clave */}
                    {video.hasTip && (
                      <div className="md:hidden bg-gradient-to-br from-cyan-950/40 via-zinc-900/60 to-blue-950/40 border border-cyan-500/40 rounded-2xl p-4 flex items-start gap-3.5 shadow-lg shadow-cyan-950/20">
                        <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                          <Lightbulb className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
                          <strong className="text-cyan-400 font-bold block mb-1 text-sm">
                            Consejo clave de Capa Cero
                          </strong>
                          <p className="text-zinc-200">
                            {video.consejoClave}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* MOBILE ONLY: Downloads if present */}
                    {Boolean(video.hasDownloads && Array.isArray(video.downloads) && video.downloads.length > 0) && (
                      <div className="md:hidden border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-cyan-400" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Descargas de la lección
                            </h4>
                          </div>
                          <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                            {video.downloads.length} {video.downloads.length === 1 ? 'Archivo' : 'Archivos'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {video.downloads.map((dl, idx) => (
                            <button
                              key={dl.id || idx}
                              onClick={() => handleDownloadClick(dl)}
                              className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{dl.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CONTINUAR VIENDO / SIGUIENTE VÍDEO (Hero Card) */}
                    {nextVideo && onSelectVideo && (
                      <div className="border border-zinc-800/90 bg-zinc-900/70 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                              Continuar viendo
                            </h4>
                          </div>
                          {isCourseLesson && (
                            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                              Siguiente Lección
                            </span>
                          )}
                        </div>

                        {/* Next video card */}
                        <div 
                          onClick={() => handleSelectSuggestedVideo(nextVideo)}
                          className="group/next flex items-center gap-3.5 bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800/80 hover:border-cyan-500/50 p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-md active:scale-[0.99]"
                        >
                          <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden shrink-0 bg-black">
                            <img
                              src={nextVideo.thumbnail}
                              alt={nextVideo.title}
                              className="w-full h-full object-cover group-hover/next:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover/next:bg-black/20 flex items-center justify-center transition-colors">
                              <div className="w-7 h-7 rounded-full bg-blue-600/95 text-white flex items-center justify-center shadow-lg group-hover/next:scale-110 transition-transform">
                                <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                              </div>
                            </div>
                            {nextVideo.chapterNumber !== null && (
                              <span className="absolute bottom-1 left-1 text-[9px] font-extrabold bg-black/80 text-cyan-300 px-1.5 py-0.2 rounded">
                                #{nextVideo.chapterNumber}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block mb-0.5 truncate">
                              {nextVideo.category}
                            </span>
                            <h5 className="text-xs sm:text-sm font-bold text-white group-hover/next:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                              {nextVideo.title}
                            </h5>
                            <span className="text-[11px] text-zinc-400 block mt-1">
                              {nextVideo.views ? `${nextVideo.views} visualizaciones` : 'Tutorial oficial'}
                            </span>
                          </div>
                        </div>

                        {/* Related secondary videos */}
                        {relatedVideos.length > 0 && (
                          <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Otros tutoriales relacionados:
                            </span>
                            <div className="space-y-1.5">
                              {relatedVideos.map((rv) => (
                                <div
                                  key={rv.id}
                                  onClick={() => handleSelectSuggestedVideo(rv)}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800/60 hover:border-zinc-700 cursor-pointer transition-all group/rel"
                                >
                                  <div className="relative w-14 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                                    <img src={rv.thumbnail} alt={rv.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/rel:bg-black/10">
                                      <Play className="w-2.5 h-2.5 fill-white text-white" />
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-zinc-300 group-hover/rel:text-cyan-300 line-clamp-1 transition-colors flex-1">
                                    {rv.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CTA BUTTON: Abrir Apuntes */}
                    <button
                      onClick={() => setActiveTab('notes')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <BookOpen className="w-4.5 h-4.5" />
                      <span>Abrir apuntes</span>
                    </button>

                  </div>
                )}

                {/* TAB CONTENT: APUNTES */}
                {activeTab === 'notes' && (
                  <div className="flex flex-col gap-3.5 px-4 md:px-0 pb-6 animate-fade-in">
                    
                    {/* Header & Sync Status */}
                    <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                            Tus Apuntes de esta Lección
                          </h4>
                        </div>

                        {/* Indicador de Sincronización */}
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border">
                          {cloudSyncStatus === 'synced' && (
                            <span className="text-emerald-400 bg-emerald-950/80 border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Nube Sincronizada</span>
                            </span>
                          )}
                          {cloudSyncStatus === 'syncing' && (
                            <span className="text-cyan-300 bg-cyan-950/80 border-cyan-500/30 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>Sincronizando...</span>
                            </span>
                          )}
                          {cloudSyncStatus === 'unlinked' && (
                            <span className="text-zinc-400 bg-zinc-900 border-zinc-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              <span>Solo Local</span>
                            </span>
                          )}
                          {(cloudSyncStatus === 'offline' || cloudSyncStatus === 'error') && (
                            <span className="text-rose-400 bg-rose-950/80 border-rose-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Local</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Helper Note */}
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Anota trucos o parámetros clave mientras ves el vídeo. Al hacer clic en el minuto, el reproductor saltará directo a ese instante.
                      </p>

                      {/* Formulario de entrada */}
                      <form onSubmit={handleCreateNote} className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                        <input
                          type="text"
                          value={noteInputText}
                          onChange={(e) => setNoteInputText(e.target.value)}
                          placeholder={`Escribe apunte en min ${formatSecondsToTime(currentLiveSeconds)}...`}
                          className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={!noteInputText.trim()}
                          className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Marcar [{formatSecondsToTime(currentLiveSeconds)}]</span>
                        </button>
                      </form>
                    </div>

                    {/* Notes List */}
                    {currentVideoNotes.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                        {currentVideoNotes.map((note) => (
                          <div
                            key={note.id}
                            className="flex items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 hover:border-cyan-500/40 rounded-2xl transition-colors group/note"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleSeekToTimestamp(note.timestamp)}
                                className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                                title="Hacer clic para saltar a este momento del vídeo"
                              >
                                <Play className="w-2.5 h-2.5 fill-cyan-300" />
                                <span>{note.timeFormatted}</span>
                              </button>

                              <p className="text-xs text-zinc-200 font-medium leading-relaxed break-words flex-1">
                                {note.text}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleStartEdit(e, note)}
                                className="text-zinc-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Editar apunte"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handlePromptDelete(e, note)}
                                className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Eliminar apunte"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 text-center space-y-2">
                        <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                        <p className="text-xs text-zinc-400 font-medium">
                          Aún no tienes notas en esta lección.
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Escribe en el campo superior durante la reproducción para guardar apuntes sincronizados.
                        </p>
                      </div>
                    )}

                    {/* Back to Lesson CTA */}
                    <button
                      onClick={() => setActiveTab('lesson')}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Volver al resumen de la lección</span>
                    </button>

                  </div>
                )}

              </div>

            </div>

          </div>

          {/* ================= MOBILE BOTTOM PEEK BAR ("Tus apuntes") ================= */}
          <div 
            onClick={() => setActiveTab(prev => prev === 'notes' ? 'lesson' : 'notes')}
            className="md:hidden flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/95 cursor-pointer hover:bg-zinc-900 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                Tus apuntes {currentVideoNotes.length > 0 && `(${currentVideoNotes.length})`}
              </span>
            </div>
            {activeTab === 'notes' ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            )}
          </div>

        </div>
      </div>

      {/* ================= MODAL EDITAR APUNTE (Z-[100]) ================= */}
      {noteToEdit && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border-2 border-cyan-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Editar Apunte</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[260px]">
                    {noteToEdit.videoTitle || video.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEditModal}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Minuto */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Minuto:</span>
                </span>
                <input
                  type="text"
                  value={noteToEdit.timeFormatted}
                  onChange={(e) => setNoteToEdit({ ...noteToEdit, timeFormatted: e.target.value })}
                  placeholder="MM:SS"
                  className="bg-zinc-900 border border-zinc-700 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono font-bold w-20 text-center focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setNoteToEdit({ ...noteToEdit, timeFormatted: formatSecondsToTime(currentLiveSeconds) })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Usar minuto actual ({formatSecondsToTime(currentLiveSeconds)})</span>
              </button>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Texto del apunte:</label>
              <textarea
                value={noteToEdit.text}
                onChange={(e) => setNoteToEdit({ ...noteToEdit, text: e.target.value })}
                rows={4}
                className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-cyan-400 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none resize-none leading-relaxed"
                placeholder="Escribe el contenido del apunte..."
                autoFocus
              />
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelEditModal}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                disabled={!noteToEdit.text.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 shadow-lg shadow-cyan-950 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ELIMINAR APUNTE (Z-[100]) ================= */}
      {noteToDelete && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">¿Eliminar este apunte?</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Esta acción no se puede deshacer y se sincronizará con tus otros dispositivos.
                </p>
              </div>
            </div>

            {/* Previsualización del apunte */}
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-300 truncate max-w-[200px]">
                  {noteToDelete.videoTitle || video.title}
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {noteToDelete.timeFormatted || '00:00'}
                </span>
              </div>
              <p className="text-xs text-zinc-200 italic line-clamp-3">
                "{noteToDelete.text}"
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Apunte</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
