import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ExternalLink, Download, ChevronLeft, ChevronRight, 
  Tag, Layers, Box 
} from 'lucide-react';

export default function V4MakerWorldModal({ model, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const timerRef = useRef(null);

  if (!model) return null;

  const images = Array.isArray(model.images) && model.images.length > 0 
    ? model.images 
    : ['/logo-capa-cero.webp'];

  const hasMultipleImages = images.length > 1;
  // Intervalo seguro calibrado: mínimo 2500ms (2.5s)
  const intervalMs = Math.max(model.carouselInterval || 3500, 2500);

  // Pase continuo suave de fotos sin pausas molestas
  useEffect(() => {
    if (!hasMultipleImages || intervalMs <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasMultipleImages, intervalMs, images.length]);

  // Atajos de teclado (Escape para cerrar, flechas para fotos)
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
    
    // Bloquear scroll del fondo
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-3 lg:p-4 overflow-y-auto bg-black/90 backdrop-blur-md animate-fade-in">
      
      {/* Backdrop Click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container: Pantalla Completa en PC (96vw / 95vh) */}
      <div 
        className="relative w-full h-full md:h-[95vh] md:max-h-[95vh] md:w-[96vw] lg:w-[96vw] max-w-none bg-zinc-950 border-0 md:border md:border-zinc-800/90 rounded-none md:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= BARRA SUPERIOR (HEADER) ================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-950 md:bg-zinc-900/60 shrink-0">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo-emblem.webp" 
              alt="Capa Cero Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain shadow-md"
              onError={(e) => { e.target.src = '/logo-capa-cero.webp'; }}
            />
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-base text-white tracking-tight leading-tight">
                Capa Cero 3D
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                Catálogo MakerWorld Oficial
              </span>
            </div>

            {model.tag && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-xl ml-2">
                <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{model.tag}</span>
              </span>
            )}
          </div>

          {/* Botones Cabecera: Descargar + Cerrar */}
          <div className="flex items-center gap-2">
            <a
              href={model.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 border border-cyan-400/30 cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-100 shrink-0" />
              <span>{model.buttonText || 'IR A DISEÑO'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
            </a>

            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 md:bg-zinc-800/90 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors border border-zinc-700/80 shadow-md cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CONTENIDO PRINCIPAL: DUAL COLUMN EN DESKTOP / VERTICAL EN MÓVIL ================= */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-zinc-950">
          
          {/* COLUMNA IZQUIERDA (Desktop: 7 columnas): VISOR DE IMÁGENES GIGANTE CON CARRUSEL */}
          <div className="md:col-span-7 lg:col-span-7 xl:col-span-8 bg-black flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800/80 relative select-none">
            
            {/* Viewport Principal de la Imagen */}
            <div className="relative w-full flex-1 min-h-[300px] sm:min-h-[420px] md:min-h-0 flex items-center justify-center p-4 sm:p-6 bg-black overflow-hidden">
              <img
                key={images[currentImageIndex]}
                src={images[currentImageIndex]}
                alt={`${model.name} - Imagen ${currentImageIndex + 1}`}
                className="w-full h-full object-contain max-h-[60vh] md:max-h-[70vh] transition-all duration-500 ease-out"
                onError={(e) => {
                  e.target.src = '/logo-capa-cero.webp';
                  e.target.className = 'w-full h-full object-contain p-8 opacity-40';
                }}
              />

              {/* Flechas de Navegación Grandes */}
              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-black/80 hover:bg-black/95 text-white flex items-center justify-center transition-all border border-zinc-700/80 shadow-2xl cursor-pointer active:scale-95 z-20"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-black/80 hover:bg-black/95 text-white flex items-center justify-center transition-all border border-zinc-700/80 shadow-2xl cursor-pointer active:scale-95 z-20"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>

                  {/* Contador Flotante de Fotos */}
                  <div className="absolute bottom-4 right-4 bg-black/80 border border-zinc-700/80 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-200 backdrop-blur-md z-10 flex items-center gap-1.5 shadow-lg">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>{currentImageIndex + 1} / {images.length}</span>
                  </div>
                </>
              )}
            </div>

            {/* Tira de Miniaturas Inferior */}
            {hasMultipleImages && (
              <div className="flex items-center justify-center gap-2.5 px-4 py-3 bg-zinc-950/90 border-t border-zinc-900 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-black ${
                      idx === currentImageIndex 
                        ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(0,229,255,0.7)]' 
                        : 'border-zinc-800 opacity-40 hover:opacity-100 hover:border-zinc-600'
                    }`}
                    aria-label={`Seleccionar foto ${idx + 1}`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA (Desktop: 5 columnas): DESCRIPCIÓN CON MÁXIMO APROVECHAMIENTO VERTICAL */}
          <div className="md:col-span-5 lg:col-span-5 xl:col-span-4 p-6 sm:p-7 flex flex-col h-full bg-zinc-950 text-left overflow-hidden">
            
            {/* Cabecera / Título / Etiquetas */}
            <div className="shrink-0 space-y-3 mb-3.5">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-3 py-1 rounded-lg uppercase tracking-wider">
                <Box className="w-4 h-4" />
                <span>Modelo 3D Oficial para Imprimir</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
                {model.name}
              </h1>

              {/* Información de formato y perfil */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-400">
                <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                  📦 Formato: <strong>Archivos 3MF / STL</strong>
                </span>
                <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                  🖨️ Perfil: <strong>Bambu Lab Optimizado</strong>
                </span>
              </div>
            </div>

            {/* Caja de Descripción con Flex-1: Se expande de forma óptima hasta la línea inferior */}
            {model.description && (
              <div className="flex-1 overflow-y-auto bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line break-words shadow-inner mb-3.5 min-h-[140px]">
                {model.description}
              </div>
            )}

            {/* CTA Final de Descarga en MakerWorld */}
            <div className="shrink-0 pt-3.5 border-t border-zinc-800/80 space-y-2">
              <a
                href={model.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white text-sm sm:text-base font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] border border-cyan-300/40 cursor-pointer"
              >
                <Download className="w-5 h-5 text-white shrink-0" />
                <span>{model.buttonText || 'IR A DISEÑO'}</span>
                <ExternalLink className="w-4 h-4 text-cyan-100 opacity-90 shrink-0" />
              </a>

              <p className="text-[10.5px] text-zinc-500 text-center">
                Descarga segura con perfiles de impresión certificados desde la plataforma oficial de Bambu Lab.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
