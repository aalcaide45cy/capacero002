import React from 'react';
import { Eye, Sparkles, Tag, ZoomIn, Layers, Box } from 'lucide-react';

export default function V4MakerWorldCard({ model, onSelect }) {
  if (!model) return null;

  const images = Array.isArray(model.images) && model.images.length > 0 
    ? model.images 
    : ['/logo-capa-cero.webp'];

  const primaryImage = model.primaryImage || images[0];
  const hasMultipleImages = images.length > 1;

  const handleCardClick = () => {
    if (onSelect) onSelect(model);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-zinc-950 hover:bg-zinc-900/90 border border-zinc-800/90 hover:border-cyan-500/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-cyan-950/30 transition-all duration-300 flex flex-col h-full text-left cursor-pointer"
    >
      
      {/* Visual / Image Area (Foto fija con Lupita al pasar el ratón) */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden select-none">
        <img
          src={primaryImage}
          alt={model.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = '/logo-capa-cero.webp';
            e.target.className = 'w-full h-full object-contain p-8 bg-zinc-950 opacity-40';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Lupita centrada al hacer Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[2px] pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <ZoomIn className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-extrabold text-cyan-200 tracking-wide uppercase">
            Ver en grande
          </span>
        </div>

        {/* Top Badges: Tag + Price/Gratis */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
          {model.tag && (
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md flex items-center gap-1 truncate max-w-[140px]">
              <Tag className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{model.tag}</span>
            </span>
          )}

          {model.showPrice ? (
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md ml-auto">
              {model.price}
            </span>
          ) : (
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md ml-auto flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{model.price || 'Gratis'}</span>
            </span>
          )}
        </div>

        {/* Indicador discreto de múltiples fotos si hay más de 1 */}
        {hasMultipleImages && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/80 border border-zinc-700/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-zinc-300 backdrop-blur-sm flex items-center gap-1 z-10">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{images.length} fotos</span>
          </div>
        )}
      </div>

      {/* Model Information & CTA */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2">
            {model.name}
          </h3>

          {model.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed whitespace-pre-line break-words mb-2 font-normal">
              {model.description}
            </p>
          )}
        </div>

        {/* CTA Button "Ver" */}
        <div className="pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-gradient-to-r hover:from-blue-600 hover:to-cyan-500 text-zinc-200 hover:text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] border border-zinc-700/70 hover:border-cyan-400/50 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors shrink-0" />
            <span>Ver Modelo</span>
          </button>
        </div>
      </div>

    </div>
  );
}
