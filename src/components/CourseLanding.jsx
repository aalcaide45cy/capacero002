import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, ChevronRight, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import CourseLeadForm from './CourseLeadForm';

export default function CourseLanding({ course }) {
    const [showVideo, setShowVideo] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    
    // Disponibilidad
    const isAvailable = course.tag && course.tag.includes('abierto');

    // Video Youtube Logic adaptado a Excel ('Url_Imagen/Video' o 'video_url')
    const rawVideoUrl = course["Url_Imagen/Video"] ? String(course["Url_Imagen/Video"]).trim() : (course.video_url ? String(course.video_url).trim() : "");
    const hasVideo = rawVideoUrl.length > 5 && !rawVideoUrl.includes('#') && (rawVideoUrl.toLowerCase().includes('youtu') || rawVideoUrl.toLowerCase().includes('vimeo'));

    let embedUrl = "";
    if (hasVideo) {
        if (rawVideoUrl.includes("youtube.com/watch?v=")) embedUrl = rawVideoUrl.replace("watch?v=", "embed/");
        else if (rawVideoUrl.includes("youtu.be/")) embedUrl = rawVideoUrl.replace("youtu.be/", "youtube.com/embed/");
        else embedUrl = rawVideoUrl;
    }

    const scrollToForm = () => {
        const el = document.getElementById('enroll-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    // ====== PARSER DINÁMICO DESDE EXCEL ====== //
    
    // Módulos
    const modules = [];
    for (let i = 1; i <= 10; i++) {
        if (course[`Modulo_${i}_Titulo`]) {
            const items = [];
            for (let j = 1; j <= 10; j++) {
                const arg = course[`Argumento${j}_Modulo${i}`];
                if (arg) items.push(arg);
            }
            modules.push({
                header: course[`Modulo_${i}_Titulo`],
                subheader: course[`Modulo_${i}_Sub_titulo`] || "",
                items: items
            });
        }
    }

    // Características
    const featureItems = [];
    for (let i = 1; i <= 10; i++) {
        const feat = course[`Argumento${i}_Caracteristicas`];
        if (feat) featureItems.push(feat);
    }

    // FAQs
    const faqs = [];
    for (let i = 1; i <= 10; i++) {
        const q = course[`Pregunta_${i}`];
        const a = course[`Respuesta_${i}`];
        if (q && a) faqs.push({ q: q, a: a });
    }

    return (
        <div className="w-full bg-black min-h-screen text-white font-sans mt-[-80px] selection:bg-blue-600/30">
            
            {/* ====== 1. HERO SECTION ====== */}
            <div className="relative pt-2 pb-24 px-4 overflow-hidden border-b border-zinc-900">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-[100%] blur-[150px]"></div>
                </div>

                <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col items-center pt-2">
                    <div className="text-center max-w-4xl mx-auto mb-12">
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight lg:leading-[1.1] bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 drop-shadow-sm">
                            {course.Titulo_Web || course.name}
                        </h1>
                    </div>
                    
                    {(course.Subtitulo_Web || course.description) && (
                        <p className="text-xl md:text-2xl lg:text-[26px] text-blue-400 font-medium mb-6 max-w-4xl leading-relaxed drop-shadow-sm text-center">
                            {course.description}
                        </p>
                    )}

                    {/* ✅ Ventajas Rápidas Hero */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-12 w-full">
                        {course["Texto_adicional_Subtitulo 1"] && (
                            <div className="flex items-center gap-3 text-gray-200 font-semibold text-[17px] bg-zinc-900 hover:bg-zinc-800 transition-colors px-6 py-2.5 rounded-full border border-zinc-700 shadow-lg">
                                <div className="bg-green-500 rounded text-black p-0.5 flex-shrink-0"><Check className="w-5 h-5 stroke-[4]" /></div>
                                <span>{String(course["Texto_adicional_Subtitulo 1"]).replace('✅ ', '')}</span>
                            </div>
                        )}
                        {course["Texto_adicional_Subtitulo 2"] && (
                            <div className="flex items-center gap-3 text-gray-200 font-semibold text-[17px] bg-zinc-900 hover:bg-zinc-800 transition-colors px-6 py-2.5 rounded-full border border-zinc-700 shadow-lg">
                                <div className="bg-green-500 rounded text-black p-0.5 flex-shrink-0"><Check className="w-5 h-5 stroke-[4]" /></div>
                                <span>{String(course["Texto_adicional_Subtitulo 2"]).replace('✅ ', '')}</span>
                            </div>
                        )}
                    </div>

                    {/* El Gran Video Central */}
                    <div className="w-full relative aspect-video rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800 bg-zinc-950 group">
                        {showVideo && hasVideo ? (
                            <iframe 
                                src={embedUrl} 
                                className="absolute inset-0 w-full h-full border-0"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <>
                                <img 
                                    src={course.image_url && course.image_url.length > 5 ? course.image_url : "https://images.unsplash.com/photo-1633526543814-9718c8922b7a?q=80"} 
                                    alt={course.name}
                                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                                />
                                {hasVideo && (
                                    <button 
                                        onClick={() => setShowVideo(true)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-all pointer-events-auto"
                                    >
                                        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center pl-2 shadow-[0_0_40px_rgba(59,130,246,0.6)] group-hover:scale-110 transition-transform">
                                            <PlayCircle className="w-12 h-12 text-white" />
                                        </div>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-12 w-full max-w-sm">
                        <button 
                            onClick={scrollToForm}
                            className="w-full px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3 active:scale-95"
                        >
                            <span>{course.Texto_Boton || "Apuntarme"}</span>
                            {isAvailable ? <ExternalLink className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ====== 2. MODULOS ====== */}
            {modules.length > 0 && (
                <div className="py-10 md:py-16 bg-zinc-950 border-y border-zinc-900">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-12 md:mb-16 px-4">
                            <div className="inline-block bg-blue-600 text-white font-black px-6 py-2 rounded-full uppercase tracking-widest text-sm mb-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                {course.Tag_Seccion_Modulos || "EL PROGRAMA"}
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold max-w-4xl mx-auto leading-tight md:leading-[1.1] text-white tracking-tight">
                                {course.Subtitulo_Web || "El camino directo al dominio absoluto."}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                            {modules.map((mod, idx) => (
                                <div key={idx} className="bg-zinc-900 border-2 border-zinc-800 px-8 py-10 rounded-[2rem] hover:border-blue-500/40 transition-all flex flex-col h-full shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
                                    
                                    <div className="text-center relative z-10 min-h-[130px]">
                                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">{mod.header}</h3>
                                        <h4 className="text-xl font-bold mb-8 text-blue-400 leading-tight">{mod.subheader}</h4>
                                    </div>
                                    
                                    <ul className="space-y-4 flex-1 relative z-10">
                                        {mod.items.map((item, itemIdx) => (
                                            <li key={itemIdx} className="flex items-start gap-4">
                                                <div className="mt-0.5 flex-shrink-0"><CheckCircle2 className="w-5 h-5 text-blue-500" strokeWidth={3} /></div>
                                                <span className="text-[17px] text-gray-300 font-medium leading-snug">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== 3. CARACTERÍSTICAS ====== */}
            {featureItems.length > 0 && (
                <div className="py-10 md:py-16 bg-black border-b border-zinc-900">
                    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                        <div className="order-2 md:order-1">
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-10 leading-tight md:leading-[1.15]">
                                {course.Titulo_Caracteristicas || "Soporte y Garantías."}
                            </h2>
                            <ul className="space-y-5">
                                {featureItems.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-lg md:text-[19px] text-gray-300 leading-snug font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="order-1 md:order-2 bg-zinc-900 p-8 md:p-10 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[40px]"></div>
                            <img 
                                src={course.image_url && course.image_url.length > 5 ? course.image_url : "https://images.unsplash.com/photo-1633526543814-9718c8922b7a"} 
                                alt="Comunidad" className="w-full rounded-2xl object-cover aspect-video mb-8 border border-zinc-800 opacity-80" 
                            />
                            <p className="text-gray-400 italic text-center text-lg md:text-xl max-w-sm mx-auto font-medium">
                                {course.ArgumentoBox}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== PREGUNTAS FRECUENTES ====== */}
            {faqs.length > 0 && (
                <div className="py-10 md:py-16 bg-zinc-950 relative z-10 border-b border-zinc-900">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="text-center mb-12">
                            <div className="inline-block bg-blue-600 text-white font-black px-6 py-2 rounded-full tracking-widest text-sm mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                {course.Tag_Preguntas || "PREGUNTAS"}
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold text-white mb-6 tracking-tight leading-tight">
                                {course.Titulo_Preguntas || "Preguntas Frecuentes"}
                            </h2>
                            <p className="text-xl md:text-2xl text-gray-400 font-medium">{course.Subtitulo_Preguntas}</p>
                        </div>
                        
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                            {faqs.map((faq, index) => (
                                <div key={index} className="border-b border-zinc-800 last:border-0 transition-colors">
                                    <button 
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className={`w-full px-6 py-6 md:px-8 md:py-8 text-left flex justify-between items-center bg-transparent cursor-pointer transition-colors ${openFaq === index ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/20'}`}
                                    >
                                        <span className="font-bold text-white text-lg md:text-xl pr-8">{faq.q}</span>
                                        <span className="text-gray-400 text-3xl font-light w-8 h-8 flex items-center justify-center flex-shrink-0">
                                            {openFaq === index ? '−' : '+'}
                                        </span>
                                    </button>
                                    {openFaq === index && (
                                        <div className="px-6 pb-6 md:px-8 md:pb-8 text-gray-300 text-lg md:text-xl leading-relaxed bg-zinc-800/10">
                                            <p>{faq.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== 4. ENROLLMENT / CTA FINAL ====== */}
            <div id="enroll-section" className="py-12 md:py-20 relative overflow-hidden bg-black">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] max-w-2xl bg-blue-600/20 rounded-[100%] blur-[120px] pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                        {course.Titulo_Formulario_Box || "Accede antes que nadie."}
                    </h2>
                    <p className="text-xl text-gray-400 mb-10">
                        {course.SubTitulo_Formulario_Box || ""}
                    </p>

                    <div className="w-full mx-auto filter drop-shadow-2xl">
                        {isAvailable ? (
                             <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl">
                                {/* Zona Pago Directo (Plazas Abiertas) */}
                                <div className="mb-2 text-sm text-blue-400 font-bold uppercase tracking-wider">Acceso Inmediato</div>
                                <a 
                                    href={course.udemy_link} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <span>Ir a la Pasarela de Pago</span>
                                    <ExternalLink size={24} />
                                </a>
                             </div>
                        ) : (
                            <div className="text-left bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl">
                                <CourseLeadForm course={course} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
        </div>
    );
}
