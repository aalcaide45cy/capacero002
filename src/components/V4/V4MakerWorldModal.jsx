import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ExternalLink, Download, ChevronLeft, ChevronRight, 
  Sparkles, Tag, Layers, Box, ZoomIn, Eye 
} from 'lucide-react';

export default function V4MakerWorldModal({ model, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  if (!model) return null;

  const images = Array.isArray(model.images) && model.images.length > 0 
    ? model.images 
    : ['/logo-capa-cero.webp'];

  const hasMultipleImages = images.length > 1;
  const intervalMs = model.carouselInterval || 3500;

  // Pase automático de fotos SOLO dentro del modal
  useEffect(() => {
    if (!hasMultipleImages || isPaused || intervalMs <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasMultipleImages, isPaused, intervalMs, images.length]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasMultipleImages) {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight' && hasMultipleImages) {
        setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Bloquear scroll del body
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, hasMultipleImages, images.length]);

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in">
      
      {/* Backdrop Click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-auto flex flex-col md:flex-row max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar Flotante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors border border-zinc-700/60 shadow-lg cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lado Izquierdo: Galería Carrusel en Grande */}
        <div 
          className="w-full md:w-3/5 bg-zinc-950 relative flex flex-col justify-center select-none overflow-hidden min-h-[280px] sm:min-h-[380px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div className="relative aspect-square sm:aspect-[4/3] w-full flex items-center justify-center bg-black/60">
            <img
              src={images[currentImageIndex]}
              alt={`${model.name} - Imagen ${currentImageIndex + 1}`}
              className="w-full h-full object-contain p-2 sm:p-4 transition-all duration-300"
              onError={(e) => {
                e.target.src = '/logo-capa-cero.webp';
                e.target.className = 'w-full h-full object-contain p-8 opacity-40';
              }}
            />

            {/* Badges superiores sobre la imagen */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              {model.tag && (
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{model.tag}</span>
                </span>
              )}
              {model.showPrice ? (
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md">
                  {model.price}
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-md flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{model.price || 'Gratis'}</span>
                </span>
              )}
            </div>

            {/* Flechas de Navegación */}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all border border-zinc-700/80 shadow-xl cursor-pointer active:scale-95 z-20"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all border border-zinc-700/80 shadow-xl cursor-pointer active:scale-95 z-20"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Contador de fotos */}
                <div className="absolute bottom-3 right-3 bg-black/80 border border-zinc-800 px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-300 backdrop-blur-sm z-10">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Miniaturas inferiores si hay múltiples fotos */}
          {hasMultipleImages && (
            <div className="flex items-center justify-center gap-2 p-3 bg-zinc-950 border-t border-zinc-900 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === currentImageIndex 
                      ? 'border-cyan-400 scale-105 shadow-[0_0_10px_rgba(0,229,255,0.5)]' 
                      : 'border-zinc-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lado Derecho: Información, Descripción y Botón Descarga */}
        <div className="w-full md:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-zinc-800/80 bg-zinc-950/95 text-left">
          
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
                <Box className="w-3.5 h-3.5" />
                <span>Modelo 3D Oficial</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
                {model.name}
              </h2>
            </div>

            {/* Descripción con formato y saltos de línea */}
            {model.description && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line break-words max-h-64 overflow-y-auto">
                {model.description}
              </div>
            )}
          </div>

          {/* CTA Descargar en MakerWorld */}
          <div className="pt-6 mt-6 border-t border-zinc-800/80 space-y-3">
            <a
              href={model.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm sm:text-base font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] border border-cyan-300/30 cursor-pointer"
            >
              <Download className="w-5 h-5 text-cyan-100 shrink-0" />
              <span>{model.buttonText || 'Descargar en MakerWorld'}</span>
              <ExternalLink className="w-4 h-4 text-cyan-200 opacity-80 shrink-0" />
            </a>

            <p className="text-[11px] text-zinc-500 text-center">
              Abre directamente la página de descarga y perfiles 3MF en MakerWorld
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
