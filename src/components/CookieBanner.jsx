import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent_CapaCero');
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent_CapaCero', 'accepted');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full z-50 p-4 md:p-6 bg-zinc-950 border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4 text-gray-300">
                    <Cookie className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <p className="text-sm md:text-base leading-relaxed">
                        Utilizamos cookies propias y de terceros para analizar el tráfico de la web, mejorar la experiencia de usuario y ofrecerte contenido relevante. 
                        Si continúas navegando, consideraremos que aceptas plenamente su uso. 
                        Puedes consultar los detalles en nuestra <a href="/politica-privacidad" className="text-blue-500 font-bold hover:underline">Política de Privacidad y Cookies</a>.
                    </p>
                </div>
                <div className="flex w-full md:w-auto gap-4 flex-shrink-0">
                    <button 
                        onClick={handleAccept}
                        className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                    >
                        Entendido y Aceptar
                    </button>
                    <button 
                        onClick={() => setShowBanner(false)}
                        className="p-3 text-gray-400 hover:text-white transition-colors cursor-pointer bg-zinc-900 md:bg-transparent rounded-lg md:rounded-none border border-zinc-800 md:border-transparent flex items-center justify-center"
                        aria-label="Cerrar temporalmente"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
