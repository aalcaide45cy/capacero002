import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Download, Lightbulb, ExternalLink, Heart, Eye, MessageCircle, 
  Play, ChevronRight, Sparkles, BookOpen, Clock, Calendar, AlertCircle
} from 'lucide-react';
import { getInitialV4Videos, loadV4Videos } from '../../utils/loadV4Videos';
import V4CircuitBackground from './V4CircuitBackground';
import V4Footer from './V4Footer';

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

  // Extraer slug de la URL actual: /video/<slug>
  const pathSlug = typeof window !== 'undefined'
    ? window.location.pathname.replace(/^\/video\/?/, '').replace(/\/$/, '').toLowerCase()
    : '';

  useEffect(() => {
    loadV4Videos().then((fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setVideos(fresh);
      }
    }).catch(() => {});
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
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://www.capacero3d.com')}`;

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
          <a href="/" className="flex items-center gap-2">
            <img src="/logo-capa-cero.webp" alt="Capa Cero 3D" className="h-7 w-auto" />
          </a>
        </div>
      </header>

      {/* Contenido principal de la página del vídeo */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 z-10 space-y-8">
        
        {/* Breadcrumb semántico */}
        <nav aria-label="Migas de pan" className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
          <a href="/" className="hover:text-cyan-400 transition-colors">Inicio</a>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-300 font-medium">{video.category || 'Tutoriales'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-cyan-400 font-semibold truncate max-w-xs">{video.title}</span>
        </nav>

        {/* Reproductor de vídeo con Facade */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="relative aspect-video w-full bg-black min-h-[270px]">
            {!isPlaying ? (
              <div 
                onClick={() => setIsPlaying(true)}
                className="relative w-full h-full cursor-pointer group flex items-center justify-center overflow-hidden"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-cyan-500/50 group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                src={embedUrl}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </section>

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

          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 pt-2 border-t border-zinc-900">
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
