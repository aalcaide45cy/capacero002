import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import CourseLeadForm from './CourseLeadForm';

export default function CourseLanding({ course }) {
    const [showVideo, setShowVideo] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    
    // Limpieza de datos
    const discountStr = course.discount_price ? String(course.discount_price).trim() : "";
    const hasDiscount = discountStr !== "" && discountStr !== "0" && discountStr !== "#";
    
    const udemyLink = course.udemy_link ? String(course.udemy_link).trim() : "";
    const isUdemyAvailable = udemyLink.length > 5 && !udemyLink.includes('#'); // Renamed to avoid conflict
    
    // New primary availability check
    const isAvailable = course.tags && course.tags.includes('abierto');

    const videoUrl = course.video_url ? String(course.video_url).trim() : "";
    const hasVideo = videoUrl.length > 5 && !videoUrl.includes('#');

    let embedUrl = "";
    if (hasVideo) {
        if (videoUrl.includes("youtube.com/watch?v=")) embedUrl = videoUrl.replace("watch?v=", "embed/");
        else if (videoUrl.includes("youtu.be/")) embedUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
        else embedUrl = videoUrl;
    }

    const scrollToForm = () => {
        const el = document.getElementById('enroll-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    // Función auxiliar para parsear listas de texto separadas por saltos de línea
    const parseList = (text) => {
        if (!text) return [];
        return text.split('\n').map(item => item.trim()).filter(item => item.length > 0);
    };

    // Recolectar módulos dinámicos
    const modules = [];
    for (let i = 1; i <= 6; i++) {
        if (course[`module_${i}_title`]) {
            modules.push({
                title: course[`module_${i}_title`],
                items: parseList(course[`module_${i}_desc`])
            });
        }
    }

    const featureItems = parseList(course.features_desc);

    const faqs = [
        {
            q: "¿Necesito tener una impresora Bambu Lab para aprovechar el curso?",
            a: "Sí, el curso está diseñado específicamente para exprimir al máximo el ecosistema nativo de Bambu Lab y su laminador líder en el sector, Bambu Studio."
        },
        {
            q: "¿Se abordan impresiones multicolores con el AMS?",
            a: "Por supuesto. Tenemos un módulo entero dedicado a dominar el pintado digital, la purga inteligente y las transiciones para rentabilizar el AMS sin malgastar material."
        },
        {
            q: "¿Es adecuado si soy totalmente principiante al laminador?",
            a: "Absolutamente sí. Empezamos desde la interfaz más básica de Bambu Studio y escalamos rápidamente hacia calibraciones avanzadas y creación de perfiles de materiales técnicos."
        },
        {
            q: "¿Cuánto tiempo tendré acceso al programa?",
            a: "El acceso es vitalicio (de por vida). Podrás entrar a repasar las lecciones y acceder a las futuras actualizaciones del software siempre que lo necesites."
        },
        {
            q: "¿Se tratan soluciones a problemas comunes?",
            a: "Toda una sección de Troubleshooting (Solución de problemas) te enseñará a diagnosticar fallos recurrentes para que no vuelvas a perder impresiones largas de muchísimas horas a ciegas."
        }
    ];

    return (
        <div className="w-full bg-black min-h-screen text-white font-sans mt-[-80px] selection:bg-blue-600/30">
            
            {/* ====== 1. HERO SECTION (Video Central) ====== */}
            <div className="relative pt-2 pb-24 px-4 overflow-hidden border-b border-zinc-900">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-[100%] blur-[150px]"></div>
                </div>

                {/* Contenedor central acortado en padding y sin margen forzado */}
                <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col items-center pt-2">
                    {/* El título sube hacia arriba al quitar el mb-8 del logo (que ahora es compactLogo) */}
                    <div className="text-center max-w-4xl mx-auto mb-12">
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight lg:leading-[1.1] bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 drop-shadow-sm">
                            {course.name}
                        </h1>
                    </div>
                    
                    {course.hero_subtitle && (
                        <p className="text-xl md:text-2xl lg:text-[26px] text-blue-400 font-medium mb-10 max-w-4xl leading-relaxed drop-shadow-sm">
                            {course.hero_subtitle}
                        </p>
                    )}

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
                                    src={course.image_url || "https://images.unsplash.com/photo-1633526543814-9718c8922b7a?q=80"} 
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
                            <span>{isAvailable ? "Acceder al Curso" : "Únete al Lanzamiento"}</span>
                            {isAvailable ? <ExternalLink className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ====== 2. MODULOS (Tarjetas por Temario) ====== */}
            {(modules.length > 0 || course.modules_title) && (
                <div className="py-24 md:py-32 bg-zinc-950 border-y border-zinc-900">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-16 md:mb-24 px-4">
                            <div className="inline-block bg-blue-600 text-white font-black px-6 py-2 rounded-full uppercase tracking-widest text-sm mb-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                EL PROGRAMA
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold max-w-4xl mx-auto leading-tight md:leading-[1.1] text-white tracking-tight">
                                {course.modules_title || course.description || "Con una ruta organizada y paso a paso con lecciones grabadas."}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                            {modules.map((mod, idx) => (
                                <div key={idx} className="bg-zinc-900 border-2 border-zinc-800 px-8 py-10 rounded-[2rem] hover:border-blue-500/40 transition-all flex flex-col h-full shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
                                    
                                    <div className="text-center md:text-left relative z-10 min-h-[130px]">
                                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">MÓDULO {idx + 1}</h3>
                                        <h4 className="text-xl font-bold mb-8 text-blue-400 leading-tight">{mod.title}</h4>
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

            {/* ====== 3. CARACTERÍSTICAS ACOMPAÑAMIENTO ====== */}
            {(featureItems.length > 0 || course.features_title) && (
                <div className="py-24 md:py-32 bg-black border-b border-zinc-900">
                    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-center">
                        <div className="order-2 md:order-1">
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-10 leading-tight md:leading-[1.15]">
                                {course.features_title || "Todo lo que necesitas para estar acompañado, en un único lugar."}
                            </h2>
                            <ul className="space-y-5">
                                {featureItems.length > 0 ? (
                                    featureItems.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-4">
                                            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-lg md:text-[19px] text-gray-300 leading-snug font-medium">{item}</span>
                                        </li>
                                    ))
                                ) : (
                                    <>
                                        <li className="flex gap-4 text-gray-300"><ShieldCheck className="w-7 h-7 text-blue-500 flex-shrink-0" /><span className="text-lg">Acceso de por vida sin cuotas mensuales.</span></li>
                                        <li className="flex gap-4 text-gray-300"><ShieldCheck className="w-7 h-7 text-blue-500 flex-shrink-0" /><span className="text-lg">Soporte directo para dudas y bloqueos.</span></li>
                                        <li className="flex gap-4 text-gray-300"><ShieldCheck className="w-7 h-7 text-blue-500 flex-shrink-0" /><span className="text-lg">Actualizaciones garantizadas.</span></li>
                                    </>
                                )}
                            </ul>
                        </div>
                        <div className="order-1 md:order-2 bg-zinc-900 p-8 md:p-10 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[40px]"></div>
                            <img src={course.image_url || "https://images.unsplash.com/photo-1633526543814-9718c8922b7a"} alt="Comunidad" className="w-full rounded-2xl object-cover aspect-video mb-8 border border-zinc-800 opacity-80" />
                            <p className="text-gray-400 italic text-center text-lg md:text-xl max-w-sm mx-auto font-medium">Únete a cientos de apasionados por la impresión 3D que ya están creando sin límites.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== PREGUNTAS FRECUENTES ====== */}
            <div className="py-24 md:py-32 bg-black relative z-10 border-t border-zinc-900 border-b">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-block bg-blue-600 text-white font-black px-6 py-2 rounded-full tracking-widest text-sm mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            PREGUNTAS
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold text-white mb-6 tracking-tight leading-tight">Preguntas Frecuentes</h2>
                        <p className="text-xl md:text-2xl text-gray-400 font-medium">Todas tus dudas resueltas en un único lugar.</p>
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

            {/* ====== 4. ENROLLMENT / CTA FINAL ====== */}
            <div id="enroll-section" className="py-24 md:py-32 relative overflow-hidden bg-black">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] max-w-2xl bg-blue-600/20 rounded-[100%] blur-[120px] pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                        {isAvailable ? "No esperes más." : "Accede antes que nadie."}
                    </h2>
                    <p className="text-xl text-gray-400 mb-10">
                        {isAvailable 
                            ? "Inscríbete hoy mismo y te enviaremos el acceso instantáneo." 
                            : "Apúntate a la lista y llévate un descuento brutal de lanzamiento. Cero spam, te puedes dar de baja cuando quieras."}
                    </p>

                    <div className="w-full mx-auto filter drop-shadow-2xl">
                        {isAvailable ? (
                            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl">
                                <div className="mb-2 text-sm text-blue-400 font-bold uppercase tracking-wider">Pago Seguro Único</div>
                                <div className="text-6xl font-bold text-white mb-2">{course.discount_price || course.price}</div>
                                {hasDiscount && <div className="text-gray-500 line-through mb-8 text-xl font-medium">{course.price}</div>}
                                <a 
                                    href={udemyLink} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <span>Ir a la Pasarela de Pago</span>
                                    <ExternalLink size={24} />
                                </a>
                                <p className="mt-6 text-sm text-gray-500 font-semibold">*Garantía de reembolso de 14 días según plataforma.</p>
                            </div>
                        ) : (
                            <div className="text-left bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl">
                                <CourseLeadForm />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
        </div>
    );
}

