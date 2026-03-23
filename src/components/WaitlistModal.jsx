import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import CourseLeadForm from './CourseLeadForm';

export default function WaitlistModal({ onClose }) {
    // Cerrar al pulsar Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        // Evitar scroll del body mientras está abierto
        document.body.style.overflow = 'hidden';
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    // Modelo de datos simulado para inyectar textos personalizados al componente CourseLeadForm
    const waitlistCourseData = {
        Titulo_Formulario: "Curso en Elaboración 🚧",
        Subtitulo_Formulario: "¡El Curso de Experto en Bambu Studio se está cocinando! Apúntate sin compromiso a la lista de espera para enterarte el primero y llévate un descuento exclusivo el día del lanzamiento.",
        Texto_Boton_Formulario: "Entrar a la Lista de Espera VIP"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay oscurecido (Click fuera para cerrar) */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>
            
            {/* Contenedor del Modal */}
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl transform transition-all p-1 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-300">
                
                {/* Botón de Cerrar */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 z-50 w-10 h-10 bg-zinc-800/80 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    aria-label="Cerrar modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Inyectamos el formulario reciclado */}
                <div className="p-2 sm:p-4">
                    <CourseLeadForm course={waitlistCourseData} />
                </div>
            </div>
        </div>
    );
}
