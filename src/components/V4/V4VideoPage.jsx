import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Download, Lightbulb, ExternalLink, Heart, Eye, MessageCircle, 
  Play, ChevronRight, Sparkles, BookOpen, Clock, Calendar, AlertCircle, Youtube, X, RotateCcw
} from 'lucide-react';
import { getInitialV4Videos, loadV4Videos } from '../../utils/loadV4Videos';
import { trackVideoStart, trackVideoProgress, trackVideoComplete, trackSocialClick } from '../../utils/analytics';
import { 
  getVideoPlaybackTime, 
  saveVideoPlaybackTime, 
  saveCourseProgress, 
  formatSecondsToTime 
} from '../../utils/courseProgress';
import V4CircuitBackground from './V4CircuitBackground';
import V4Footer from './V4Footer';

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

function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

function formatPublishedDate(dateStr) {
  if (!dateStr) return 'Reciente';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Reciente';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

export default function V4VideoPage() {
  const [videos, setVideos] = useState(() => getInitialV4Videos());
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null);
  const [resumeNotice, setResumeNotice] = useState(null);
  const [savedTimestamp, setSavedTimestamp] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const countdownTimerRef = useRef(null);
  const progressMilestonesRef = useRef(new Set());
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const lastCurrentTimeRef = useRef(0);
  const lastSavedTimeRef = useRef(0);
  const ytPlayerRef = useRef(null);
  const playbackTrackerRef = useRef(null);

  // Extraer slug de la URL actual: /video/<slug>
  const pathSlug = typeof window !== 'undefined'
    ? window.location.pathname.replace(/^\/video\/?/, '').replace(/\/$/, '').toLowerCase()
    : '';

  useEffect(() => {
    let isMounted = true;
    loadV4Videos().then((fresh) => {
      if (isMounted && Array.isArray(fresh) && fresh.length > 0) {
        setVideos(fresh);
      }
    }).catch(() => {});

    const handleStatsUpdated = (e) => {
      const { id, views, likes, comments, duration } = e.detail || {};
      if (!id || !isMounted) return;
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.youtubeId === id
            ? {
                ...v,
                views: views !== undefined && views > 0 ? views : v.views,
                likes: likes !== undefined && likes > 0 ? likes : v.likes,
                comments: comments !== undefined ? comments : v.comments,
                duration: duration || v.duration
              }
            : v
        )
      );
    };

    window.addEventListener('capacero:video-stats-updated', handleStatsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('capacero:video-stats-updated', handleStatsUpdated);
    };
  }, []);


  const video = useMemo(() => {
    if (!videos || videos.length === 0 || !pathSlug) return null;
    return videos.find((v) => {
      if (v.slug && v.slug.toLowerCase() === pathSlug) return true;
      if (v.youtubeId && v.youtubeId === pathSlug) return true;
      return false;
    }) || null;
  }, [videos, pathSlug]);

  // Actualizar título y metadatos en cliente
  useEffect(() => {
    if (video) {
      document.title = `${video.title} | Capa Cero 3D`;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta && video.description) {
        descMeta.setAttribute('content', video.description.slice(0, 160));
      }
    } else {
      document.title = 'Vídeo no encontrado | Capa Cero 3D';
    }
  }, [video]);

  // Vídeos recomendados de la misma categoría
  const relatedVideos = useMemo(() => {
    if (!video || !videos) return [];
    return videos
      .filter((v) => v.youtubeId !== video.youtubeId && v.category === video.category && !v.isScheduled)
      .slice(0, 4);
  }, [video, videos]);

  // Siguiente vídeo
  const nextVideo = useMemo(() => {
    if (!video || !videos) return null;
    const idx = videos.findIndex((v) => v.youtubeId === video.youtubeId);
    if (idx !== -1 && idx + 1 < videos.length) {
      return videos[idx + 1];
    }
    return null;
  }, [video, videos]);

  const initialStartSecond = useMemo(() => {
    if (!video) return 0;
    const saved = getVideoPlaybackTime(video.youtubeId, video.id);
    if (saved > 10) {
      return Math.floor(saved - 5);
    }
    if (saved > 0) {
      return Math.floor(saved);
    }
    return 0;
  }, [video?.youtubeId, video?.id]);

  const [activeStartSecond, setActiveStartSecond] = useState(initialStartSecond);

  useEffect(() => {
    setIsPlaying(false);
    setCountdownSeconds(null);
    progressMilestonesRef.current.clear();
    hasStartedRef.current = false;
    hasEndedRef.current = false;
    lastCurrentTimeRef.current = initialStartSecond;
    lastSavedTimeRef.current = initialStartSecond;
    setActiveStartSecond(initialStartSecond);

    const saved = getVideoPlaybackTime(video?.youtubeId, video?.id);
    setSavedTimestamp(saved);
    setShowResumeBanner(saved > 0);

    if (initialStartSecond > 0) {
      setResumeNotice(`Reanudando desde el min ${formatSecondsToTime(initialStartSecond)} (-5s)`);
      const timer = setTimeout(() => setResumeNotice(null), 5000);
      return () => clearTimeout(timer);
    } else {
      setResumeNotice(null);
    }
  }, [video?.youtubeId, video?.id, initialStartSecond]);

  // Temporizador de cuenta atrás de 8s para siguiente lección
  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds === 0) {
      setCountdownSeconds(null);
      if (nextVideo) {
        window.location.href = `/video/${nextVideo.slug || nextVideo.id}`;
      }
      return;
    }
    countdownTimerRef.current = setTimeout(() => {
      setCountdownSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [countdownSeconds, nextVideo]);

  const handleCancelCountdown = () => {
    setCountdownSeconds(null);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
  };

  const playerId = `yt-iframe-page-${video?.youtubeId}`;

  // Salto a timestamp específico
  const handleSeekToTimestamp = (sec) => {
    const targetSec = Math.max(0, Math.floor(sec || 0));
    lastCurrentTimeRef.current = targetSec;
    setActiveStartSecond(targetSec);
    if (!isPlaying) {
      setIsPlaying(true);
    }
    const courseKey = extractCourseKey(video?.category);
    if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, targetSec, courseKey);
    if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, targetSec, courseKey);
    if (courseKey) saveCourseProgress(courseKey, video, targetSec);

    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(targetSec, true);
        if (typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        }
        return;
      } catch (e) {}
    }
    const iframe = document.getElementById(playerId);
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [targetSec, true]
        }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }), '*');
      } catch (e) {}
    }
  };

  // IFrame API de YouTube y Telemetría GA4 + Guardado de progreso
  useEffect(() => {
    if (!isPlaying || !video?.youtubeId) return;

    const handleEnded = () => {
      hasEndedRef.current = true;
      trackVideoComplete(video);
      const courseKey = extractCourseKey(video?.category);
      if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, 0, courseKey);
      if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, 0, courseKey);
      if (courseKey) {
        saveCourseProgress(courseKey, video, 0);
      }
      setSavedTimestamp(0);
      setShowResumeBanner(false);
      if (nextVideo) {
        setCountdownSeconds(8);
      }
    };

    const savePlayback = (seconds, force = false) => {
      if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return;
      const sec = Math.floor(seconds);

      // PREVENCIÓN CRÍTICA: Durante la inicialización del iframe, YouTube emite 'currentTime: 0'
      // antes de posicionarse en el timestamp guardado (&start=).
      if (sec === 0 && (lastSavedTimeRef.current > 5 || initialStartSecond > 5) && !force && !hasEndedRef.current) {
        return;
      }

      lastCurrentTimeRef.current = sec;
      if (sec === 0 && !force) return;

      const courseKey = extractCourseKey(video?.category);
      if (Math.abs(sec - lastSavedTimeRef.current) >= 2 || force) {
        lastSavedTimeRef.current = sec;
        if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, sec, courseKey);
        if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, sec, courseKey);
        if (courseKey) {
          saveCourseProgress(courseKey, video, sec);
        }
      }
    };

    const flushCurrentProgress = () => {
      try {
        const p = ytPlayerRef.current || (window.YT && typeof window.YT.get === 'function' ? window.YT.get(playerId) : null);
        if (p && typeof p.getCurrentTime === 'function') {
          const cur = p.getCurrentTime();
          if (typeof cur === 'number' && !isNaN(cur) && cur > 0) {
            lastCurrentTimeRef.current = Math.floor(cur);
          }
        }
      } catch (e) {}
      if (lastCurrentTimeRef.current > 0 && !hasEndedRef.current) {
        const courseKey = extractCourseKey(video?.category);
        if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, lastCurrentTimeRef.current, courseKey);
        if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, lastCurrentTimeRef.current, courseKey);
        if (courseKey) {
          saveCourseProgress(courseKey, video, lastCurrentTimeRef.current);
        }
      }
    };

    const handleWindowMessage = (event) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
        if (payload) {
          if (payload.event === 'infoDelivery' && payload.info) {
            if (typeof payload.info.currentTime === 'number') {
              savePlayback(payload.info.currentTime);
            }
            if (payload.info.playerState === 1) {
              if (!hasStartedRef.current) {
                hasStartedRef.current = true;
                trackVideoStart(video);
              }
            } else if (payload.info.playerState === 2) {
              flushCurrentProgress();
            } else if (payload.info.playerState === 0) {
              handleEnded();
            }
          }
          if (payload.event === 'onStateChange') {
            const state = payload.info !== undefined ? payload.info : payload.data;
            if (state === 1) {
              if (!hasStartedRef.current) {
                hasStartedRef.current = true;
                trackVideoStart(video);
              }
            } else if (state === 2) {
              flushCurrentProgress();
            } else if (state === 0) {
              handleEnded();
            }
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCurrentProgress();
      }
    };

    window.addEventListener('beforeunload', flushCurrentProgress);
    window.addEventListener('pagehide', flushCurrentProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat periódico con comando postMessage directo y YT.Player
    if (playbackTrackerRef.current) clearInterval(playbackTrackerRef.current);
    playbackTrackerRef.current = setInterval(() => {
      const iframe = document.getElementById(playerId);
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'getCurrentTime',
            args: []
          }), '*');
        } catch (e) {}
      }

      const p = ytPlayerRef.current || (window.YT && typeof window.YT.get === 'function' ? window.YT.get(playerId) : null);
      if (p && typeof p.getCurrentTime === 'function') {
        try {
          const cur = p.getCurrentTime();
          const dur = typeof p.getDuration === 'function' ? p.getDuration() : 0;
          if (typeof cur === 'number' && !isNaN(cur) && cur > 0) {
            savePlayback(cur);
          }
          if (dur && cur && dur > 0) {
            const percent = Math.floor((cur / dur) * 100);
            [25, 50, 75].forEach(milestone => {
              if (percent >= milestone && !progressMilestonesRef.current.has(milestone)) {
                progressMilestonesRef.current.add(milestone);
                trackVideoProgress(video, milestone);
              }
            });
          }
        } catch (e) {}
      }
    }, 1000);

    function setupYT() {
      if (window.YT && window.YT.Player && document.getElementById(playerId)) {
        try {
          ytPlayerRef.current = new window.YT.Player(playerId, {
            events: {
              onReady: () => {
                try {
                  if (activeStartSecond > 0 && typeof ytPlayerRef.current.seekTo === 'function') {
                    ytPlayerRef.current.seekTo(activeStartSecond, true);
                  }
                } catch (e) {}
              },
              onStateChange: (e) => {
                if (e && e.data === 1) { // PLAYING
                  if (!hasStartedRef.current) {
                    hasStartedRef.current = true;
                    trackVideoStart(video);
                  }
                } else if (e && e.data === 2) { // PAUSED
                  flushCurrentProgress();
                } else if (e && e.data === 0) { // ENDED
                  handleEnded();
                }
              }
            }
          });
        } catch (e) {}
      }
    }

    if (window.YT && window.YT.Player) {
      setupYT();
    } else {
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCb === 'function') prevCb();
        setupYT();
      };
    }

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('beforeunload', flushCurrentProgress);
      window.removeEventListener('pagehide', flushCurrentProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (playbackTrackerRef.current) clearInterval(playbackTrackerRef.current);
      flushCurrentProgress();
      ytPlayerRef.current = null;
    };
  }, [isPlaying, video?.youtubeId, nextVideo]);

  // --- RENDER 404 (SLUG NO ENCONTRADO) ---
  if (!video) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans relative selection:bg-[#2575c4] selection:text-white">
        <V4CircuitBackground />
        <header className="p-6 border-b border-zinc-900 flex items-center justify-between z-10">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 text-cyan-400" /> Volver a la Videoteca
          </a>
          <a href="/">
            <img src="/logo-capa-cero.webp" alt="Capa Cero 3D" className="h-8 w-auto" />
          </a>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="bg-zinc-950 p-8 sm:p-12 rounded-3xl max-w-lg w-full border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-cyan-500" />
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded-full mb-3 inline-block">
              Error 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
              Vídeo no encontrado
            </h1>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              El tutorial que buscas no existe o ha sido reubicado. Tienes todos los tutoriales actualizados y cursos paso a paso en la videoteca principal.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm"
            >
              Explorar Videoteca Completa
            </a>
          </div>
        </main>

        <V4Footer />
      </div>
    );
  }

  // --- RENDER VIDEO PAGE ---
  const resumeSec = savedTimestamp > 10 ? Math.floor(savedTimestamp - 5) : Math.floor(savedTimestamp);
  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://www.capacero3d.com')}${activeStartSecond > 0 ? `&start=${activeStartSecond}` : ''}`;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans relative selection:bg-[#2575c4] selection:text-white">
      <V4CircuitBackground />

      {/* Header de navegación con logo y breadcrumb */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Videoteca Principal</span>
          </a>

          <div className="flex items-center gap-2.5">
            {savedTimestamp > 0 && (
              <button
                onClick={() => {
                  handleSeekToTimestamp(resumeSec);
                  setResumeNotice(`Reanudando desde ${formatSecondsToTime(resumeSec)}`);
                  setShowResumeBanner(false);
                  setTimeout(() => setResumeNotice(null), 3500);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/25 border border-cyan-300/40 shrink-0 animate-fade-in"
                title={`Reanudar desde ${formatSecondsToTime(resumeSec)}`}
              >
                <Play className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                <span>Reanudar ({formatSecondsToTime(resumeSec)})</span>
              </button>
            )}

            <a href="/" className="flex items-center gap-2">
              <img src="/logo-capa-cero.webp" alt="Capa Cero 3D" className="h-7 w-auto" />
            </a>
          </div>
        </div>
      </header>

      {/* Contenido principal de la página del vídeo */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 z-10 space-y-6">
        
        {/* Breadcrumb semántico */}
        <nav aria-label="Migas de pan" className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
          <a href="/" className="hover:text-cyan-400 transition-colors">Inicio</a>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-300 font-medium">{video.category || 'Tutoriales'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-cyan-400 font-semibold truncate max-w-xs">{video.title}</span>
        </nav>

        {/* Banner de Reanudación de Vídeo */}
        {savedTimestamp > 0 && showResumeBanner && (
          <div className="bg-gradient-to-r from-blue-950/95 via-zinc-900/90 to-cyan-950/90 border border-cyan-500/50 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-cyan-950/40 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>Progreso guardado:</span>
                  <span className="text-cyan-300 font-mono font-black">{formatSecondsToTime(savedTimestamp)}</span>
                  <span className="text-[11px] text-zinc-400 font-normal">(-5s de cortesía)</span>
                </p>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  ¿Deseas continuar donde lo dejaste o empezar la lección desde el principio?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleSeekToTimestamp(resumeSec);
                  setResumeNotice(`Reanudando en ${formatSecondsToTime(resumeSec)}`);
                  setShowResumeBanner(false);
                  setTimeout(() => setResumeNotice(null), 3500);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                title={`Reanudar desde ${formatSecondsToTime(resumeSec)}`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Reanudar ({formatSecondsToTime(resumeSec)})</span>
              </button>

              <button
                onClick={() => {
                  handleSeekToTimestamp(0);
                  if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, 0);
                  if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, 0);
                  setSavedTimestamp(0);
                  setShowResumeBanner(false);
                  setResumeNotice("Reproduciendo desde el inicio (00:00)");
                  setTimeout(() => setResumeNotice(null), 3000);
                }}
                className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                title="Empezar desde el segundo 00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desde el inicio</span>
                <span className="sm:hidden">00:00</span>
              </button>

              <button
                onClick={() => setShowResumeBanner(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Cerrar aviso de reanudación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Reproductor de vídeo con Facade (mínimo 480x270 en escritorio, ancho completo en móvil) */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="relative aspect-video w-full md:min-w-[480px] md:min-h-[270px] bg-black min-h-[270px]">
            {!isPlaying ? (
              <div 
                onClick={() => setIsPlaying(true)}
                className="relative w-full h-full cursor-pointer group flex items-center justify-center overflow-hidden"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  width="480"
                  height="270"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-cyan-500/50 group-hover:scale-110 active:scale-95 transition-transform">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                key={`${video.youtubeId}-${activeStartSecond}`}
                id={playerId}
                src={embedUrl}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}

            {/* Floating Resume Quick-Action on Player */}
            {savedTimestamp > 0 && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSeekToTimestamp(resumeSec);
                    setResumeNotice(`Reanudando en ${formatSecondsToTime(resumeSec)}`);
                    setShowResumeBanner(false);
                    setTimeout(() => setResumeNotice(null), 3500);
                  }}
                  className="bg-blue-950/90 hover:bg-blue-900 text-cyan-200 hover:text-white border border-cyan-400/60 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer animate-fade-in"
                  title={`Reanudar desde ${formatSecondsToTime(resumeSec)}`}
                >
                  <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                  <span>Reanudar ({formatSecondsToTime(resumeSec)})</span>
                </button>
              </div>
            )}

            {/* Aviso de reanudación automática */}
            {resumeNotice && (
              <div className="absolute top-3 left-3 z-20 bg-blue-950/90 text-cyan-200 border border-cyan-400/60 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 animate-fade-in backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{resumeNotice}</span>
              </div>
            )}

            {/* Cuenta atrás cancelable de 8s al terminar el vídeo */}
            {countdownSeconds !== null && nextVideo && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-3">
                  <span className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">{countdownSeconds}</span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Reproduciendo siguiente lección en {countdownSeconds}s...</p>
                <p className="text-xs text-zinc-300 font-medium max-w-md line-clamp-1 mb-4">
                  Siguiente: <strong className="text-cyan-300">{nextVideo.title}</strong>
                </p>
                <div className="flex items-center gap-2.5">
                  <a
                    href={`/video/${nextVideo.slug || nextVideo.id}`}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Saltar Ahora</span>
                  </a>
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
          </div>
        </section>

        {/* Barra Interactiva de Reanudación de Vídeo */}
        {savedTimestamp > 3 && showResumeBanner && (
          <div className="bg-gradient-to-r from-blue-950/95 via-zinc-900/90 to-cyan-950/90 border border-cyan-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-cyan-950/40 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>Progreso guardado:</span>
                  <span className="text-cyan-300 font-mono font-black">{formatSecondsToTime(savedTimestamp)}</span>
                  <span className="text-[11px] text-zinc-400 font-normal">(-5s de cortesía)</span>
                </p>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  Puedes continuar desde donde lo dejaste o empezar la lección desde el principio.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Botón Reanudar */}
              <button
                onClick={() => {
                  const seekSec = Math.max(0, savedTimestamp - 5);
                  handleSeekToTimestamp(seekSec);
                  setResumeNotice(`Reanudando en ${formatSecondsToTime(seekSec)}`);
                  setTimeout(() => setResumeNotice(null), 3500);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md shadow-blue-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                title={`Reanudar desde ${formatSecondsToTime(Math.max(0, savedTimestamp - 5))}`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Reanudar ({formatSecondsToTime(Math.max(0, savedTimestamp - 5))})</span>
              </button>

              {/* Botón Desde el inicio */}
              <button
                onClick={() => {
                  handleSeekToTimestamp(0);
                  if (video?.youtubeId) saveVideoPlaybackTime(video.youtubeId, 0);
                  if (video?.id && video.id !== video.youtubeId) saveVideoPlaybackTime(video.id, 0);
                  setSavedTimestamp(0);
                  setShowResumeBanner(false);
                  setResumeNotice("Reproduciendo desde el inicio (00:00)");
                  setTimeout(() => setResumeNotice(null), 3000);
                }}
                className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                title="Empezar desde el segundo 00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desde el inicio</span>
                <span className="sm:hidden">00:00</span>
              </button>

              {/* Botón Cerrar Banner */}
              <button
                onClick={() => setShowResumeBanner(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Cerrar aviso de reanudación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Título y metadatos */}
        <section className="space-y-4 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {video.category && (
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded-full">
                {video.category}
              </span>
            )}
            {video.chapterNumber && (
              <span className="text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                Capítulo #{video.chapterNumber}
              </span>
            )}
            <span className="text-xs text-zinc-400 flex items-center gap-1 ml-auto">
              <Calendar className="w-3.5 h-3.5" /> {formatPublishedDate(video.publishedAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-zinc-400 pt-2 border-t border-zinc-900">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-zinc-500" />
                <span>{formatCounter(video.views)} visualizaciones</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>{formatCounter(video.likes)} me gusta</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span>{formatCounter(video.comments)} comentarios</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick && trackSocialClick('YouTube Button (Page)', video.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white text-xs font-bold transition-all shadow-md"
              >
                <Youtube className="w-4 h-4 text-red-400" />
                <span>Ver en YouTube</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {video.playlistId && (
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}&list=${video.playlistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick && trackSocialClick('YouTube Playlist Button (Page)', video.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 hover:text-white text-xs font-bold transition-all shadow-md"
                >
                  <Youtube className="w-4 h-4 text-cyan-400" />
                  <span>Ver la lista completa en YouTube</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Consejo Clave si existe */}
        {video.consejoClave && (
          <section className="bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-zinc-950 border border-cyan-500/30 rounded-2xl p-5 text-left flex items-start gap-3.5 shadow-lg">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shrink-0 text-cyan-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-cyan-300 mb-1">Consejo Clave del Experto</h2>
              <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
                {video.consejoClave}
              </p>
            </div>
          </section>
        )}

        {/* Descripción detallada */}
        {video.description && (
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-left space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Resumen y Notas del Tutorial</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
              {video.description}
            </div>
          </section>
        )}

        {/* Descargas asociadas si existen */}
        {video.downloads && video.downloads.length > 0 && (
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-left space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Archivos y Enlaces de Descarga</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {video.downloads.map((dl, idx) => (
                <a
                  key={idx}
                  href={dl.url || dl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors"
                >
                  <span className="truncate">{dl.title || dl.name || 'Descargar Recurso'}</span>
                  <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Siguiente vídeo recomendado */}
        {nextVideo && (
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Siguiente lección</span>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{nextVideo.title}</h3>
            </div>
            <a
              href={`/video/${nextVideo.slug || nextVideo.youtubeId}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shrink-0 hover:from-blue-500 hover:to-cyan-400 transition-all"
            >
              <span>Ver Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </section>
        )}

        {/* Vídeos relacionados */}
        {relatedVideos.length > 0 && (
          <section className="space-y-4 text-left pt-4">
            <h2 className="text-lg font-bold text-white">Más tutoriales de {video.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedVideos.map((rv) => (
                <a
                  key={rv.id || rv.youtubeId}
                  href={`/video/${rv.slug || rv.youtubeId}`}
                  className="group bg-zinc-950 border border-zinc-800/90 hover:border-cyan-500/50 rounded-xl overflow-hidden shadow flex flex-col transition-all"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <img
                      src={rv.thumbnail}
                      alt={rv.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-cyan-400 line-clamp-2 transition-colors">
                      {rv.title}
                    </h4>
                    <span className="text-[10px] text-zinc-500 mt-auto pt-2">{formatPublishedDate(rv.publishedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

      </main>

      <V4Footer />
    </div>
  );
}
