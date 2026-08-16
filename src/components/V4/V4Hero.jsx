import React from 'react';
import { Play, Download, Sparkles, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';

export default function V4Hero({ featuredVideo, onSelectVideo, onOpenTab }) {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <section className="relative overflow-hidden pt-8 pb-12 md:py-16 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Value Proposition & Subscribe Engine */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Canal Oficial de Capa Cero 3D</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
              Domina <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-amber-400">Bambu Studio</span> y la Impresión 3D sin perder tiempo
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed mb-6 max-w-2xl">
              Tutoriales paso a paso, perfiles de laminado optimizados y solución de errores en tu máquina. Todo directo al grano, sin rodeos ni relleno.
            </p>

            {/* Conversion CTA Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-8">
              <a
                href={subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xl shadow-red-600/25 hover:shadow-red-600/40 transition-all duration-200 active:scale-[0.98]"
              >
                <YouTubeIcon className="w-5 h-5 text-white" />
                <span>Suscribirme a Capa Cero</span>
                <span className="text-xs bg-red-800/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-red-100">
                  Gratis
                </span>
              </a>

              <button
                onClick={() => onOpenTab('videos')}
                className="flex items-center justify-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-semibold text-sm px-5 py-3.5 rounded-xl border border-zinc-800 transition-all active:scale-[0.98]"
              >
                <span>Explorar Videoteca</span>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Highlights Pillars */}
            <div className="grid grid-cols-3 gap-3 w-full border-t border-zinc-800/80 pt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ahorro de Tiempo</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Solución de Errores</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Perfiles .3MF Listos</span>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Video Showcase */}
          <div className="lg:col-span-5 w-full">
            {featuredVideo ? (
              <div className="relative group bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-zinc-700">
                
                {/* Thumbnail Container */}
                <div
                  onClick={() => onSelectVideo(featuredVideo)}
                  className="relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden"
                >
                  <img
                    src={featuredVideo.thumbnail}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = '/logo-capa-cero-small.png';
                      e.target.className = 'w-full h-full object-contain p-8 bg-zinc-950 opacity-40';
                    }}
                  />
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all duration-300 group-hover:scale-110">
                      <Play className="w-6 h-6 fill-white translate-x-0.5" />
                    </div>
                  </div>

                  {/* Top Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow">
                      ⭐ Destacado
                    </span>
                    <span className="bg-zinc-950/80 backdrop-blur-md text-zinc-300 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-800">
                      {featuredVideo.category}
                    </span>
                  </div>
                </div>

                {/* Info Block */}
                <div className="p-4 sm:p-5 text-left">
                  <h3
                    onClick={() => onSelectVideo(featuredVideo)}
                    className="text-base sm:text-lg font-bold text-white line-clamp-2 hover:text-red-400 cursor-pointer transition-colors mb-2"
                  >
                    {featuredVideo.title}
                  </h3>

                  {featuredVideo.hasDescription && (
                    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 mb-3">
                      {featuredVideo.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                    <button
                      onClick={() => onSelectVideo(featuredVideo)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-red-400" />
                      <span>Ver tutorial completo</span>
                    </button>

                    {featuredVideo.hasDownloads && (
                      <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                        📥 {featuredVideo.downloads.length} {featuredVideo.downloads.length === 1 ? 'Recurso' : 'Recursos'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full bg-zinc-900/90 rounded-2xl border border-dashed border-zinc-700 flex flex-col items-center justify-center p-6 text-center">
                <YouTubeIcon className="w-12 h-12 text-red-500 mb-3" />
                <p className="text-sm font-bold text-white">Google Sheet Conectado</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Tu hoja <strong>Capacero3d V4</strong> está vinculada. Añade tus vídeos para que aparezcan aquí automáticamente.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
