import React, { useState, useEffect } from 'react';
import { Youtube, X, Bell } from 'lucide-react';

export default function V4StickySubscribe() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-fade-in">
      <div className="bg-zinc-950/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-left ring-1 ring-red-500/20">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/30">
            <Youtube className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
              Aprende Bambu Studio en YouTube
            </h4>
            <p className="text-[11px] text-zinc-400">
              Trucos semanales y perfiles listos para usar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            Suscribirme
          </a>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
