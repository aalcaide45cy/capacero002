import React from 'react';
import { Download, Lightbulb, ExternalLink, Eye, Heart, MessageCircle, Calendar, Clock } from 'lucide-react';
import { trackCardClick, trackDownload } from '../../utils/analytics';

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
  const handleSelect = () => {
    trackCardClick(video);
    if (onSelect) onSelect(video);
  };

  const handleDirectDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (video.downloads && video.downloads.length > 0) {
      const dl = video.downloads[0];
      trackDownload(dl, video);
      window.open(dl.url, '_blank', 'noopener,noreferrer');
    } else if (onSelect) {
      onSelect(video);
    }
  };

  const handleExternalLink = (e) => {
    e.stopPropagation();
  };

  const viewsCount = formatCounter(video.views);
  const likesCount = formatCounter(video.likes);
  const commentsCount = formatCounter(video.comments);
  const shortCategory = getShortCategory(video.category);

  return (
    <div className={`group bg-zinc-950 hover:bg-zinc-900 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col h-full text-left ${
      video.isScheduled 
        ? 'border-blue-900/50 hover:border-cyan-500/60 shadow-blue-950/20' 
        : 'border-zinc-800/90 hover:border-zinc-700'
    }`}>
      
      {/* Thumbnail Area */}
      <div
        onClick={handleSelect}
        className="relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden"
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
            e.target.src = '/logo-capa-cero-small.png';
            e.target.className = 'w-full h-full object-contain p-8 bg-zinc-950 opacity-40';
          }}
        />

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
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        
        {/* Title */}
        <h3
          onClick={handleSelect}
          className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 cursor-pointer transition-colors line-clamp-2 leading-snug mb-2"
        >
          {video.title}
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

          {/* 3. Derecha: Botón Descargas o Enlace a YouTube */}
          <div className="flex items-center justify-end min-w-0">
            {video.hasDownloads ? (
              <button
                type="button"
                onClick={handleDirectDownload}
                className="text-[10px] sm:text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900/80 px-2 sm:px-2.5 py-1 rounded-lg border border-cyan-500/50 hover:border-cyan-400 transition-all shadow-sm hover:shadow-cyan-500/30 shrink-0 cursor-pointer whitespace-nowrap"
                title="Descargar recursos y perfiles .3MF"
              >
                <Download className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Descargas</span>
              </button>
            ) : (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleExternalLink}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 flex items-center p-1 transition-colors shrink-0"
                title="Abrir en YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
