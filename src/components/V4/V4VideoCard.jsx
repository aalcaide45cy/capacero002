import React from 'react';
import { Play, Download, Lightbulb, ExternalLink, Eye, Heart, MessageCircle } from 'lucide-react';
import { trackCardClick, trackDownload } from '../../utils/analytics';

// Función para formatear números compactos sin palabras (ej: 2719 -> 2.7k, 6882 -> 6.9k, 179 -> 179)
function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
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

  return (
    <div className="group bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full text-left">
      
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
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = '/logo-capa-cero-small.png';
            e.target.className = 'w-full h-full object-contain p-8 bg-zinc-950 opacity-40';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent pointer-events-none" />
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

        {/* Footer Actions */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          
          {/* Etiqueta de Categoría (Ubicada abajo a la izquierda en lugar de Ver Vídeo) */}
          {video.category ? (
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-1 rounded-md shrink-0 truncate max-w-[130px] sm:max-w-[150px]">
              {video.category}
            </span>
          ) : (
            <span />
          )}

          {/* Estadísticas de YouTube + Botón Descargas */}
          <div className="flex items-center gap-2">
            {/* Contadores con Iconos Bonitos sin palabras */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 bg-zinc-950/70 border border-zinc-800/90 px-2 py-1 rounded-lg">
              {/* Reproducciones (Ojo) */}
              <span className="flex items-center gap-1 hover:text-zinc-200 transition-colors" title={`${video.views || 0} reproducciones`}>
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>{viewsCount}</span>
              </span>

              {/* Me Gusta (Corazón) */}
              <span className="flex items-center gap-1 hover:text-rose-300 transition-colors" title={`${video.likes || 0} me gusta`}>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                <span>{likesCount}</span>
              </span>

              {/* Comentarios (Burbuja) */}
              <span className="flex items-center gap-1 hover:text-cyan-300 transition-colors" title={`${video.comments || 0} comentarios`}>
                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>{commentsCount}</span>
              </span>
            </div>

            {/* Botón Descargas directo a la URL del recurso */}
            {video.hasDownloads ? (
              <button
                type="button"
                onClick={handleDirectDownload}
                className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900/80 px-2.5 py-1 rounded-lg border border-cyan-500/50 hover:border-cyan-400 transition-all shadow-sm hover:shadow-cyan-500/30 shrink-0 cursor-pointer"
                title="Abrir enlace de descarga directamente"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Descargas</span>
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
