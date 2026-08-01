import React, { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';

const SHEETS_COLLAB_URL = "https://script.google.com/macros/s/AKfycbxMbJyogz6b4FlxrvJRFx1p1qp1a4RG5FYlw93omOJfEsuu8mFNonN-3F0h2AMf4pBY/exec";

export default function CollaborationModal({ onClose }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [tipo, setTipo] = useState('Review de producto');
    const [mensaje, setMensaje] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'

    // Cerrar al pulsar Escape y bloquear scroll del body
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay oscurecido */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Contenedor del Modal */}
            <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-300 z-10">
                
                {/* Botón de Cerrar */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 w-10 h-10 bg-zinc-800/80 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    aria-label="Cerrar modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Cabecera del Modal */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-12 h-12 bg-capaBlue/10 border border-capaBlue/30 rounded-2xl text-capaBlue">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Colaboraciones</h2>
                        <p className="text-xs sm:text-sm text-zinc-400">Marcas, creadores y proyectos 3D / Electrónica</p>
                    </div>
                </div>

                {status === 'success' ? (
                    <div className="my-8 text-center py-8 px-4 bg-zinc-950/60 border border-emerald-500/30 rounded-2xl animate-in fade-in duration-300">
                        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-xl font-bold text-white mb-2">¡Mensaje Enviado!</h3>
                        <p className="text-sm text-zinc-300 max-w-sm mx-auto mb-6">
                            Muchas gracias por tu interés. Hemos recibido tu propuesta y te responderemos lo antes posible a <strong className="text-capaBlue">{email}</strong>.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-full transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Nombre o Empresa <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej. Bambu Lab / Pedro García"
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Email de contacto <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tuemail@ejemplo.com"
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Tipo de Colaboración
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:border-capaBlue focus:outline-none transition-colors"
                            >
                                <option value="Review de producto">Review / Análisis de producto</option>
                                <option value="Patrocinio">Patrocinio o Sponsor</option>
                                <option value="Envío de material/filamento">Envío de filamento / componentes</option>
                                <option value="Proyecto conjunto">Proyecto o contenido conjunto</option>
                                <option value="Otro">Otro asunto</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Tu mensaje <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                placeholder="Cuéntanos brevemente de qué trata tu propuesta..."
                                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:border-capaBlue focus:outline-none transition-colors resize-none"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full relative flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 text-white font-black text-sm rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.5)] uppercase tracking-wide cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            {status === 'submitting' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Enviando propuesta...</span>
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
