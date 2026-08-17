import React from 'react';
import { Play, Download, Lightbulb, ExternalLink, Youtube } from 'lucide-react';
import { trackCardClick } from '../../utils/analytics';

export default function V4VideoCard({ video, onSelect }) {
  const handleSelect = () => {
    trackCardClick(video);
    if (onSelect) onSelect(video);
  };

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
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

        {/* Category Pill */}
        {video.category && (
          <div className="absolute top-3 left-3">
            <span className="bg-zinc-950/80 backdrop-blur-md text-zinc-300 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-zinc-800 shadow">
              {video.category}
            </span>
          </div>
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

        {/* Footer Actions */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handleSelect}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors py-1"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-400" />
            <span>Ver Vídeo</span>
          </button>

          {/* If there are downloads, show a direct shortcut */}
          {video.hasDownloads ? (
            <button
              onClick={handleSelect}
              className="text-[11px] font-semibold text-zinc-300 hover:text-cyan-300 flex items-center gap-1 bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/50 transition-colors"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Descargas</span>
            </button>
          ) : (
            <a
              href={video.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <span>Abrir en YT</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
