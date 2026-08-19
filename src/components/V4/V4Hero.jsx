import React from 'react';
import { Play, Download, Eye, Heart, MessageCircle, Sparkles, Zap, ShieldCheck, ArrowRight, Youtube, Instagram, Mail, Smartphone, Bell } from 'lucide-react';
import { trackSocialClick, trackSubscribe, trackVideoOpen, trackDownload } from '../../utils/analytics';

function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

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

// TikTok icon SVG component
const TikTokIcon = ({ color = "currentColor" }) => (
  <svg
    className="w-5 h-5 sm:w-6 sm:h-6"
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

export default function V4Hero({
  featuredVideo,
  onSelectVideo,
  onOpenTab,
  onOpenCollaboration,
  onOpenInstall,
  onOpenNotification,
  isSearching = false,
  children
}) {
  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkStandalone = () => {
        const standalone = 
          window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true ||
          document.referrer.includes('android-app://');
        setIsStandalone(Boolean(standalone));
      };
      checkStandalone();
      window.addEventListener('appinstalled', () => setIsStandalone(true));
    }
  }, []);

  return (
    <section className={`relative overflow-hidden transition-all duration-500 ease-in-out border-b border-zinc-900/80 bg-transparent ${
      isSearching ? 'pt-2 pb-2' : 'pt-2 pb-6 md:pt-3 md:pb-8'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ================= TOP BRAND SHOWCASE (PROMINENT LOGO & CTA) ================= */}
        <div className={`flex flex-col items-center justify-center text-center transition-all duration-500 ${
          isSearching ? 'mb-1' : 'mb-2 sm:mb-3'
        }`}>
          {/* Logo Principal Integrado Sin Cortes Ni Marcos */}
          <div className={`relative transition-all duration-500 select-none pointer-events-none w-full flex justify-center ${
            isSearching ? 'mb-1 scale-90 sm:scale-95' : 'mb-2 scale-100'
          }`}>
            <img
              src="/logo-capa-cero.webp"
              alt="Capa Cero 3D"
              width="720"
              height="350"
              fetchpriority="high"
              draggable="false"
              className="w-full max-w-[340px] sm:max-w-[480px] md:max-w-[620px] lg:max-w-[720px] h-auto mx-auto object-contain pointer-events-none select-none transition-all duration-300"
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserDrag: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none'
              }}
            />
          </div>

          {/* Redes Sociales Circulares (Azul Eléctrico) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
            {/* YouTube */}
            <a
              href="https://www.youtube.com/@CapaCero0"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSocialClick && trackSocialClick('YouTube')}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-black border-2 border-[#2575c4] rounded-full transition-all duration-300 hover:scale-110 shadow-[0_0_15px_rgba(37,117,196,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.7)] group flex-shrink-0"
              aria-label="YouTube"
            >
              <Youtube className="w-5 h-5 sm:w-6 sm:h-6 text-[#2575c4] group-hover:text-red-500 transition-colors" />
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@capacero"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSocialClick && trackSocialClick('TikTok')}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-black border-2 border-[#2575c4] rounded-full transition-all duration-300 hover:scale-110 shadow-[0_0_15px_rgba(37,117,196,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.7)] group flex-shrink-0"
              aria-label="TikTok"
            >
              <span className="text-[#2575c4] group-hover:text-white transition-colors">
                <TikTokIcon color="currentColor" />
              </span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/capa.cero_3d/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSocialClick && trackSocialClick('Instagram')}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-black border-2 border-[#2575c4] rounded-full transition-all duration-300 hover:scale-110 shadow-[0_0_15px_rgba(37,117,196,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.7)] group flex-shrink-0"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-[#2575c4] group-hover:text-pink-500 transition-colors" />
            </a>
          </div>

          {/* Grupo de Acciones: Instalar App, Avisos Push y Colaboraciones */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-2">
            
            {/* Botón: Instalar App PWA (Oculto automáticamente si ya está instalada / abierta como App) */}
            {!isStandalone && (
              <button
                onClick={(e) => { e.preventDefault(); onOpenInstall && onOpenInstall(); }}
                className="flex items-center justify-center gap-2 h-11 px-4 sm:px-5 bg-zinc-950/90 hover:bg-zinc-900 text-cyan-300 hover:text-white font-extrabold text-xs sm:text-sm rounded-full border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)] transition-all duration-300 active:scale-95 cursor-pointer"
                title="Instalar App Capa Cero 3D en pantalla de inicio"
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Instalar App</span>
              </button>
            )}

            {/* Botón: Notificaciones Push */}
            <button
              onClick={(e) => { e.preventDefault(); onOpenNotification && onOpenNotification(); }}
              className="flex items-center justify-center gap-2 h-11 px-4 sm:px-5 bg-zinc-950/90 hover:bg-zinc-900 text-cyan-300 hover:text-white font-extrabold text-xs sm:text-sm rounded-full border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)] transition-all duration-300 active:scale-95 cursor-pointer"
              title="Activar notificaciones de nuevos vídeos y directos"
            >
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Avisos</span>
            </button>

            {/* Botón Destacado: COLABORACIONES */}
            <button
              onClick={(e) => { e.preventDefault(); onOpenCollaboration && onOpenCollaboration(); }}
              className="relative flex items-center justify-center h-11 px-6 sm:px-7 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-xs sm:text-sm rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.6)] uppercase tracking-wide whitespace-nowrap border border-cyan-300/50 group overflow-hidden cursor-pointer active:scale-95"
              title="Contactar para Colaboraciones"
            >
              <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                <Mail className="w-4 h-4 text-cyan-200" />
                COLABORACIONES
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:transition-all group-hover:duration-700 group-hover:translate-x-[150%] pointer-events-none"></div>
            </button>

          </div>

          {/* Buscador animado (Justo debajo de Acciones) */}
          <div className="w-full mt-2">
            {children}
          </div>
        </div>

        {/* ================= VALUE PROP & FEATURED VIDEO (Colapsable al buscar) ================= */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isSearching ? 'max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-[1400px] opacity-100 mt-6'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              
              {/* Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4 shadow-[0_0_12px_rgba(37,117,196,0.2)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Aprende Impresión 3D y Bambu Studio</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
                Imprime Mejor, Más Rápido y Sin Fallos en <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">Bambu Studio</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed mb-6 max-w-2xl">
                Descubre los trucos, ajustes secretos y soluciones a problemas reales para exprimir tu impresora al máximo y conseguir acabados profesionales. Directo al grano y paso a paso.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-8">
                <a
                  href={subscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSubscribe('Hero Principal (Cabecera)')}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 active:scale-[0.98] border border-cyan-400/30"
                >
                  <Youtube className="w-5 h-5 text-white" />
                  <span>Suscribirme al Canal</span>
                  <span className="text-xs bg-blue-950/80 border border-cyan-400/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-cyan-200">
                    Gratis
                  </span>
                </a>
              </div>

              {/* Highlights Pillars */}
              <div className="grid grid-cols-3 gap-3 w-full border-t border-zinc-800/80 pt-6">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Ahorra Tiempo y Filamento</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Solución a Fallos Reales</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Ajustes Paso a Paso</span>
                </div>
              </div>
            </div>

            {/* Right Column: Featured Video Showcase */}
            <div className="lg:col-span-5 w-full">
              {featuredVideo ? (
                <div className="relative group bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-cyan-500/50 shadow-blue-950/40 hover:shadow-cyan-500/10">
                  
                  {/* Thumbnail Container */}
                  <div
                    onClick={() => onSelectVideo(featuredVideo)}
                    className="relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={featuredVideo.thumbnail}
                      alt={featuredVideo.title}
                      width="480"
                      height="270"
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = '/logo-capa-cero.webp';
                        e.target.className = 'w-full h-full object-contain p-8 bg-zinc-950 opacity-40';
                      }}
                    />
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
                  </div>

                  {/* Info Block */}
                  <div className="p-4 sm:p-5 text-left">
                    <h2
                      onClick={() => onSelectVideo(featuredVideo)}
                      className="text-base sm:text-lg font-bold text-white line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors mb-2"
                    >
                      {featuredVideo.title}
                    </h2>

                    {featuredVideo.hasDescription && (
                      <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 mb-3">
                        {featuredVideo.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-zinc-800/80">
                      {/* Etiqueta de categoría a la izquierda */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {featuredVideo.category && (
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-md shadow-sm">
                            {getShortCategory(featuredVideo.category)}
                          </span>
                        )}
                      </div>

                      {/* YouTube Stats + Botón Descargas */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2.5 text-[11px] font-medium text-zinc-400 bg-zinc-950/70 border border-zinc-800/90 px-2.5 py-1 rounded-lg">
                          <span className="flex items-center gap-1 hover:text-zinc-200 transition-colors" title={`${featuredVideo.views || 0} reproducciones`}>
                            <Eye className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{formatCounter(featuredVideo.views)}</span>
                          </span>
                          <span className="flex items-center gap-1 hover:text-rose-300 transition-colors" title={`${featuredVideo.likes || 0} me gusta`}>
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                            <span>{formatCounter(featuredVideo.likes)}</span>
                          </span>
                          <span className="flex items-center gap-1 hover:text-cyan-300 transition-colors" title={`${featuredVideo.comments || 0} comentarios`}>
                            <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{formatCounter(featuredVideo.comments)}</span>
                          </span>
                        </div>

                        {featuredVideo.hasDownloads && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (featuredVideo.downloads?.[0]) {
                                trackDownload(featuredVideo.downloads[0], featuredVideo);
                                window.open(featuredVideo.downloads[0].url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="text-[11px] font-bold text-cyan-300 hover:text-white flex items-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 px-3 py-1 rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                            title="Abrir enlace de descarga directamente"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Descargas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                  <Youtube className="w-12 h-12 text-[#2575c4] mb-3" />
                  <p className="text-sm font-bold text-white">Canal Oficial Capa Cero 3D</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Tutoriales de Bambu Studio y trucos de impresión 3D sin complicaciones.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
