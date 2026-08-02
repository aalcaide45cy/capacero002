import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Mail, Send, CheckCircle2, Loader2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

const SHEETS_COLLAB_URL = "https://script.google.com/macros/s/AKfycbxMbJyogz6b4FlxrvJRFx1p1qp1a4RG5FYlw93omOJfEsuu8mFNonN-3F0h2AMf4pBY/exec";
const PENDING_STORAGE_KEY = "capacero_pending_collabs";

// Función utilitaria para enviar mensaje a Google Apps Script con reintentos y timeout
async function sendToGoogleSheets(payload, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout por intento

            await fetch(SHEETS_COLLAB_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return true; // Envío exitoso
        } catch (err) {
            console.warn(`Intento ${attempt}/${maxRetries} fallido enviando colaboración:`, err);
            lastError = err;
            if (attempt < maxRetries) {
                // Esperar 1.5 segundos antes del siguiente reintento para dar tiempo a Apps Script
                await new Promise((res) => setTimeout(res, 1500));
            }
        }
    }
    throw lastError || new Error("No se pudo conectar tras varios intentos");
}

export default function CollaborationModal({ onClose }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [tipo, setTipo] = useState('Review de producto');
    const [mensaje, setMensaje] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);
    const [honeypot, setHoneypot] = useState('');

    // Generar números aleatorios para el reto anti-spam
    const captchaChallenge = useMemo(() => {
        const n1 = Math.floor(Math.random() * 8) + 2;
        const n2 = Math.floor(Math.random() * 8) + 1;
        return { n1, n2, answer: n1 + n2 };
    }, []);

    // 1. DESPERTADOR (Pre-Warming): Enviar ping en segundo plano para despertar Apps Script nada más abrir el modal
    useEffect(() => {
        try {
            fetch(SHEETS_COLLAB_URL, { method: 'GET', mode: 'no-cors' }).catch(() => {});
        } catch (_) {}
    }, []);

    // 2. RECUPERADOR DE COLA: Intentar enviar automáticamente mensajes que se hubieran quedado pendientes previamente
    const flushPendingMessages = useCallback(async () => {
        try {
            const raw = localStorage.getItem(PENDING_STORAGE_KEY);
            if (!raw) return;
            const pendingList = JSON.parse(raw);
            if (Array.isArray(pendingList) && pendingList.length > 0) {
                const remaining = [];
                for (const item of pendingList) {
                    try {
                        await sendToGoogleSheets(item, 2);
                    } catch (_) {
                        remaining.push(item);
                    }
                }
                if (remaining.length > 0) {
                    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(remaining));
                } else {
                    localStorage.removeItem(PENDING_STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error("Error al procesar pendientes de localStorage:", e);
        }
    }, []);

    useEffect(() => {
        flushPendingMessages();
    }, [flushPendingMessages]);

    // Cerrar al pulsar Escape y bloquear scroll del body
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
        setErrorMessage('');

        // Detección Honeypot (Spambots)
        if (honeypot.trim() !== '') {
            setStatus('success');
            return;
        }

        // Validación Captcha
        if (parseInt(captchaInput.trim(), 10) !== captchaChallenge.answer) {
            setCaptchaError(true);
            return;
        }

        if (!nombre.trim() || !email.trim() || !mensaje.trim()) return;

        const payload = {
            nombre: nombre.trim(),
            email: email.trim(),
            tipo: tipo,
            mensaje: mensaje.trim(),
            timestamp: new Date().toISOString()
        };

        // Guardar respaldo de emergencia en localStorage antes de intentar enviar
        try {
            const raw = localStorage.getItem(PENDING_STORAGE_KEY);
            const pendingList = raw ? JSON.parse(raw) : [];
            pendingList.push(payload);
            localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingList));
        } catch (_) {}

        setStatus('submitting');

        try {
            // Intentar envío con 3 reintentos automáticos
            await sendToGoogleSheets(payload, 3);

            // Si tuvo éxito, eliminar de la cola de respaldo
            try {
                const raw = localStorage.getItem(PENDING_STORAGE_KEY);
                if (raw) {
                    let pendingList = JSON.parse(raw);
                    pendingList = pendingList.filter(item => item.timestamp !== payload.timestamp);
                    if (pendingList.length > 0) {
                        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingList));
                    } else {
                        localStorage.removeItem(PENDING_STORAGE_KEY);
                    }
                }
            } catch (_) {}

            setStatus('success');
        } catch (err) {
            console.error('Fallaron los 3 reintentos de envío:', err);
            setStatus('error');
            setErrorMessage('Hubo un problema de conexión temporal. Tu mensaje ha quedado guardado de forma segura en tu dispositivo. Haz clic en reintentar para volver a enviarlo.');
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
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">¡Mensaje Enviado con Éxito!</h3>
                        <div className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto mb-6 leading-relaxed">
                            <p className="mb-3">
                                Muchas gracias por tu interés. Hemos recibido tu propuesta y te responderemos lo antes posible a:
                            </p>
                            <span className="inline-block px-3.5 py-1.5 bg-zinc-900 border border-capaBlue/40 rounded-xl text-capaBlue font-bold text-sm sm:text-base break-all select-all">
                                {email}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3.5 sm:space-y-4 max-w-full">
                        {/* Campo Honeypot Oculto */}
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
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-[16px] sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
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
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-[16px] sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Tipo de Colaboración
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-[16px] sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors"
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
                                className="w-full max-w-full box-border bg-zinc-950 border border-zinc-800 text-white text-[16px] sm:text-sm rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 focus:border-capaBlue focus:outline-none transition-colors resize-none"
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
                                className="w-16 sm:w-20 bg-zinc-900 border border-zinc-700 text-white text-center text-[16px] sm:text-sm font-bold rounded-lg px-2 py-1 focus:border-cyan-400 focus:outline-none transition-colors flex-shrink-0"
                            />
                        </div>

                        {captchaError && (
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Resultado incorrecto. Inténtalo de nuevo.</span>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl animate-in fade-in">
                                <div className="flex items-center gap-2 font-semibold">
                                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
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
                                    <span>Conectando y enviando...</span>
                                </>
                            ) : status === 'error' ? (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Reintentar envío</span>
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
