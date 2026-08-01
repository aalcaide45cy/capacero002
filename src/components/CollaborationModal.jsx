import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Send, CheckCircle2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

const SHEETS_COLLAB_URL = "https://script.google.com/macros/s/AKfycbMbJyogz6b4FlxrvJRFx1p1qp1a4RG5FYlw93omOJfEsuu8mFNonN-3F0h2AMf4pBY/exec";

export default function CollaborationModal({ onClose }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [tipo, setTipo] = useState('Review de producto');
    const [mensaje, setMensaje] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);
    const [honeypot, setHoneypot] = useState(''); // Campo tramposo para spambots

    // Generar números aleatorios para la pregunta matemática anti-spam
    const captchaChallenge = useMemo(() => {
        const n1 = Math.floor(Math.random() * 8) + 2; // entre 2 y 9
        const n2 = Math.floor(Math.random() * 8) + 1; // entre 1 y 9
        return { n1, n2, answer: n1 + n2 };
    }, []);

    // Cerrar al pulsar Escape y bloquear scroll del body sin provocar desajustes de pantalla
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        const originalBodyOverflow = document.body.style.overflow;
        const originalDocOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalDocOverflow;
        };
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCaptchaError(false);

        // 1. Detección Honeypot: Si un bot ha rellenado el campo oculto, simulamos éxito y abortamos
        if (honeypot.trim() !== '') {
            setStatus('success');
            return;
        }

        // 2. Validación de respuesta al Captcha matemático
        if (parseInt(captchaInput.trim(), 10) !== captchaChallenge.answer) {
            setCaptchaError(true);
            return;
        }

        if (!nombre.trim() || !email.trim() || !mensaje.trim()) return;

        setStatus('submitting');
        try {
            const payload = {
                nombre: nombre.trim(),
                email: email.trim(),
                tipo: tipo,
                mensaje: mensaje.trim()
            };

            await fetch(SHEETS_COLLAB_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            setStatus('success');
        } catch (err) {
            console.error('Error al enviar mensaje de colaboración:', err);
            setStatus('success');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-x-hidden">
            {/* Overlay oscurecido */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Contenedor del Modal Responsivo */}
            <div className="relative w-[94vw] max-w-md sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-7 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in zoom-in duration-200 z-10 box-border">
                
                {/* Botón de Cerrar */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-10 sm:h-10 bg-zinc-800/80 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-20"
                    aria-label="Cerrar modal"
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Cabecera del Modal */}
                <div className="flex items-center gap-3 mb-1 sm:mb-2 pr-8">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-capaBlue/10 border border-capaBlue/30 rounded-xl sm:rounded-2xl text-capaBlue flex-shrink-0">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">Colaboraciones</h2>
                        <p className="text-[11px] sm:text-sm text-zinc-400">Marcas, creadores y proyectos 3D / Electrónica</p>
                    </div>
                </div>

                {status === 'success' ? (
                    <div className="my-4 sm:my-6 text-center py-6 px-3 sm:py-8 sm:px-4 bg-zinc-950/60 border border-emerald-500/30 rounded-2xl animate-in fade-in duration-300">
                        <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-400 mx-auto mb-3 sm:mb-4 animate-bounce" />
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">¡Mensaje Enviado!</h3>
                        <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto mb-5 leading-relaxed">
                            Muchas gracias por tu interés. Hemos recibido tu propuesta y te responderemos lo antes posible a <strong className="text-capaBlue break-all">{email}</strong>.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3.5 sm:space-y-4 max-w-full">
                        {/* Campo Honeypot totalmente oculto para Spambots (Sin posicionamiento negativo que expanda viewport) */}
                        <div className="hidden" aria-hidden="true">
                            <input
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Nombre o Empresa <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej. Bambu Lab / Pedro García"
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Email de contacto <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tuemail@ejemplo.com"
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Tipo de Colaboración
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            >
                                <option value="Review de producto">Review / Análisis de producto</option>
                                <option value="Patrocinio">Patrocinio o Sponsor</option>
                                <option value="Envío de material/filamento">Envío de filamento / componentes</option>
                                <option value="Proyecto conjunto">Proyecto o contenido conjunto</option>
                                <option value="Otro">Otro asunto</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Tu mensaje <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                rows={3}
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                placeholder="Cuéntanos brevemente de qué trata tu propuesta..."
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors resize-none"
                            ></textarea>
                        </div>

                        {/* Desafío Captcha Anti-Spam Humano */}
                        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex flex-row items-center justify-between gap-2 max-w-full">
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-zinc-300">
                                <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                <span>Seguridad: ¿Cuánto es <strong>{captchaChallenge.n1} + {captchaChallenge.n2}</strong>?</span>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                required
                                value={captchaInput}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setCaptchaInput(val);
                                    if (captchaError) setCaptchaError(false);
                                }}
                                placeholder="?"
                                className="w-16 sm:w-20 bg-zinc-900 border border-zinc-700 text-white text-center text-xs sm:text-sm font-bold rounded-lg px-2 py-1 focus:border-cyan-400 focus:outline-none transition-colors flex-shrink-0"
                            />
                        </div>

                        {captchaError && (
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Resultado incorrecto. Inténtalo de nuevo.</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full relative flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-xs sm:text-sm rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.5)] uppercase tracking-wide cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
                        >
                            {status === 'submitting' ? (
                                <>
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                    <span>Verificando y enviando...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Enviar propuesta</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
