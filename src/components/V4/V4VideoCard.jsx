import React, { useState, useEffect } from 'react';
import { Lightbulb, ExternalLink, Eye, Heart, MessageCircle, Calendar, Clock, Play } from 'lucide-react';
import { trackCardClick } from '../../utils/analytics';
import { getVideoPlaybackTime, formatSecondsToTime } from '../../utils/courseProgress';

// Parsear duración en formato MM:SS o HH:MM:SS a segundos
function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// Función para formatear números compactos sin palabras (ej: 2719 -> 2.7k, 6882 -> 6.9k, 179 -> 179)
function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

// Acorta nombres largos de categoría para que no desborden en tarjetas estrechas
function getShortCategory(category) {
  if (!category) return '';
  const c = category.trim();
  if (/^curso/i.test(c)) {
    let name = c.replace(/^curso\s*:?\s*/i, '').trim();
    if (/^bambustudio$/i.test(name)) name = 'Bambu Studio';
    return `Curso ${name}`;
  }
  const map = {
    'Perfiles y Calibración': 'Perfiles',
    'Hardware y Boquillas': 'Hardware',
    'Multicolor y AMS': 'Multicolor',
    'Grabado Láser': 'Láser',
    'Trucos Rápidos': 'Trucos',
    'Modelado 3D': 'Modelado',
    'Bambu Studio': 'Bambu Studio'
  };
  if (map[c]) return map[c];
  if (c.length > 18) return c.substring(0, 16) + '...';
  return c;
}

export default function V4VideoCard({ video, onSelect }) {
  const [savedTime, setSavedTime] = useState(() => {
    return getVideoPlaybackTime(video.youtubeId, video.id);
  });

  useEffect(() => {
    setSavedTime(getVideoPlaybackTime(video.youtubeId, video.id));

    const handleUpdate = (e) => {
      const vId = e?.detail?.videoId;
      if (vId === video.youtubeId || vId === video.id) {
        setSavedTime(getVideoPlaybackTime(video.youtubeId, video.id));
      }
    };

    window.addEventListener('capacero-timestamp-updated', handleUpdate);
    return () => window.removeEventListener('capacero-timestamp-updated', handleUpdate);
  }, [video.youtubeId, video.id]);

  const handleSelect = () => {
    trackCardClick(video);
    if (onSelect) onSelect(video);
  };

  const handleExternalLink = (e) => {
    e.stopPropagation();
  };

  const viewsCount = formatCounter(video.views);
  const likesCount = formatCounter(video.likes);
  const commentsCount = formatCounter(video.comments);
  const shortCategory = getShortCategory(video.category);
  const videoHref = video.slug ? `/video/${video.slug}` : (video.youtubeId ? `/video/${video.youtubeId}` : '#');

  const totalSeconds = parseDurationToSeconds(video.duration);
  const progressPct = totalSeconds > 0 && savedTime > 0
    ? Math.min(100, Math.max(3, Math.round((savedTime / totalSeconds) * 100)))
    : 0;

  const handleLinkClick = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
      return;
    }
    e.preventDefault();
    handleSelect();
  };

  return (
    <div className={`group bg-zinc-950 hover:bg-zinc-900 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col h-full text-left ${
      video.isScheduled 
        ? 'border-blue-900/50 hover:border-cyan-500/60 shadow-blue-950/20' 
        : 'border-zinc-800/90 hover:border-zinc-700'
    }`}>
      
      {/* Thumbnail Area como enlace real */}
      <a
        href={videoHref}
        onClick={handleLinkClick}
        aria-label={`Ver vídeo: ${video.title}`}
        className="block relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden"
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          width="480"
          height="270"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            video.isScheduled ? 'brightness-75 grayscale-[20%]' : ''
          }`}
          onError={(e) => {
            e.target.src = '/logo-capa-cero.webp';
            e.target.className = 'w-full h-full object-contain p-6 bg-gradient-to-br from-zinc-900 via-blue-950/40 to-zinc-950';
          }}
        />

        {/* Badge Reanudar en miniatura */}
        {savedTime > 3 && !video.isScheduled && (
          <div className="absolute top-2 left-2 z-20 bg-blue-950/95 text-cyan-300 border border-cyan-400/60 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-lg flex items-center gap-1 backdrop-blur-md animate-fade-in">
            <Play className="w-2.5 h-2.5 fill-cyan-300 text-cyan-300" />
            <span>Reanudar {formatSecondsToTime(savedTime)}</span>
          </div>
        )}

        {/* Barra de progreso de reproducción guardada */}
        {savedTime > 3 && progressPct > 0 && !video.isScheduled && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-950/90 z-20">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 rounded-r-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Overlay Oscurecido + Badge "Estreno el día..." con colores de la web (Azul Eléctrico y Cyan) */}
        {video.isScheduled ? (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-3 text-center z-10">
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-xl border border-cyan-300/40 shadow-xl shadow-blue-950/80 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-cyan-200" />
              <span>{video.scheduledDateFormatted || 'Estreno Próximamente'}</span>
            </div>
          </div>
        ) : (
          /* Gradient Overlay Estándar */
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent pointer-events-none" />
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/85 text-zinc-100 text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded-md border border-zinc-700/60 shadow-md flex items-center gap-1 z-10">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{video.duration}</span>
              </div>
            )}
          </>
        )}
      </a>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        
        {/* Title como enlace semántico */}
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 cursor-pointer transition-colors line-clamp-2 leading-snug mb-2">
          <a
            href={videoHref}
            onClick={handleLinkClick}
            className="block text-inherit hover:text-inherit"
          >
            {video.title}
          </a>
        </h3>

        {/* Description (ONLY if it exists and is not empty) */}
        {video.hasDescription && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {video.description}
          </p>
        )}

        {/* Consejo Clave (ONLY if it exists and is not empty) */}
        {video.hasTip && (
          <div className="mt-auto mb-3.5 bg-blue-950/40 border border-cyan-500/20 rounded-xl p-2.5 flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-cyan-200/90 leading-tight line-clamp-2">
              <strong className="text-cyan-300 font-semibold">Tip: </strong>
              {video.consejoClave}
            </p>
          </div>
        )}

        {/* Footer Actions: 3-column Grid (Izquierda, Centro Centrado, Derecha) */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-2">
          
          {/* 1. Izquierda: Etiqueta de Categoría Compacta */}
          <div className="flex items-center justify-start min-w-0">
            {shortCategory ? (
              <span
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-1 rounded-md shrink-0 truncate max-w-[95px] sm:max-w-[110px]"
                title={video.category}
              >
                {shortCategory}
              </span>
            ) : (
              <span />
            )}
          </div>

          {/* 2. Centro: Estadísticas de YouTube Perfectamente Centradas */}
          <div className="flex items-center justify-center min-w-0">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-zinc-400 bg-zinc-950/80 border border-zinc-800/90 px-1.5 sm:px-2.5 py-1 rounded-lg shrink-0">
              {/* Reproducciones (Ojo) */}
              <span className="flex items-center gap-1 hover:text-zinc-200 transition-colors" title={`${video.views || 0} reproducciones`}>
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 shrink-0" />
                <span>{viewsCount}</span>
              </span>

              {/* Me Gusta (Corazón) */}
              <span className="flex items-center gap-1 hover:text-rose-300 transition-colors" title={`${video.likes || 0} me gusta`}>
                <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 fill-rose-500/30 shrink-0" />
                <span>{likesCount}</span>
              </span>

              {/* Comentarios (Burbuja) */}
              <span className="flex items-center gap-1 hover:text-cyan-300 transition-colors" title={`${video.comments || 0} comentarios`}>
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
                <span>{commentsCount}</span>
              </span>
            </div>
          </div>

          {/* 3. Derecha: Enlace directo al vídeo de YouTube (como en el Hero) */}
          <div className="flex items-center justify-end min-w-0">
            {video.youtubeUrl && (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleExternalLink}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 flex items-center p-1.5 transition-colors shrink-0"
                title="Abrir en YouTube"
              >
                <ExternalLink className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
              </a>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
