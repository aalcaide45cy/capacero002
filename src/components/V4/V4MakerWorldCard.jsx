import React, { useState } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight, Download, Sparkles, Tag, Layers } from 'lucide-react';

export default function V4MakerWorldCard({ model }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!model) return null;

  const images = Array.isArray(model.images) && model.images.length > 0 
    ? model.images 
    : ['/logo-capa-cero.webp'];

  const hasMultipleImages = images.length > 1;

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDotClick = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(idx);
  };

  return (
    <div className="group bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/90 hover:border-cyan-500/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-cyan-950/30 transition-all duration-300 flex flex-col h-full text-left">
      
      {/* Visual / Image Area (Carousel) */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden select-none">
        <img
          src={images[currentImageIndex]}
          alt={`${model.name} - Imagen ${currentImageIndex + 1}`}
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

        {/* Carousel Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer z-20 border border-zinc-700/60 shadow-lg active:scale-95"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer z-20 border border-zinc-700/60 shadow-lg active:scale-95"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentImageIndex 
                      ? 'w-5 bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]' 
                      : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Ver foto ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Model Information & CTA */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2">
            {model.name}
          </h3>

          {model.description && (
            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed whitespace-pre-line break-words mb-2 font-normal">
              {model.description}
            </p>
          )}
        </div>

        {/* CTA Button Link */}
        <div className="pt-3 border-t border-zinc-800/80">
          <a
            href={model.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-blue-950/40 hover:shadow-cyan-500/25 transition-all active:scale-[0.98] border border-cyan-300/30"
          >
            <Download className="w-4 h-4 text-cyan-100 shrink-0" />
            <span className="truncate">{model.buttonText || 'Descargar en MakerWorld'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-200 opacity-70 shrink-0" />
          </a>
        </div>
      </div>

    </div>
  );
}
