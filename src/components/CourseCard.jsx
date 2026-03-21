import React, { useState } from 'react';
import { ExternalLink, PlayCircle, Users, CheckCircle } from 'lucide-react';
import CourseLeadForm from './CourseLeadForm';

export default function CourseCard({ course, layout = "grid" }) {
    const [showForm, setShowForm] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    // Limpieza de datos y control de símbolos "#" vacíos
    const discountStr = course.discount_price ? String(course.discount_price).trim() : "";
    const hasDiscount = discountStr !== "" && discountStr !== "0";
    
    const udemyLink = course.udemy_link ? String(course.udemy_link).trim() : "";
    const isAvailable = udemyLink.length > 5 && !udemyLink.includes('#');

    const videoUrl = course.video_url ? String(course.video_url).trim() : "";
    const hasVideo = videoUrl.length > 5 && !videoUrl.includes('#');

    const imageUrl = course.image_url && !course.image_url.includes('#') 
        ? course.image_url 
        : "https://images.unsplash.com/photo-1633526543814-9718c8922b7a?q=80&w=1000&auto=format&fit=crop";

    // Formateo automático de links de YouTube para incrustar iframe
    let embedUrl = "";
    if (hasVideo) {
        if (videoUrl.includes("youtube.com/watch?v=")) {
            embedUrl = videoUrl.replace("watch?v=", "embed/");
        } else if (videoUrl.includes("youtu.be/")) {
            embedUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
        } else {
            embedUrl = videoUrl;
        }
    }

    const isHero = layout === "hero";

    return (
        <div className={`bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col hover:border-blue-500/50 transition-all duration-300 ${isHero ? 'md:flex-row max-w-5xl mx-auto' : ''}`}>
            {/* Selector de Imagen / Video */}
            <div className={`relative bg-zinc-950 group ${isHero ? 'w-full md:w-[50%] min-h-[300px]' : 'aspect-video'}`}>
                {showVideo && hasVideo ? (
                    <iframe 
                        src={embedUrl} 
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <>
                        <img 
                            src={imageUrl} 
                            alt={course.name} 
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        {hasVideo && (
                            <button 
                                onClick={() => setShowVideo(true)}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-all group-hover:scale-105 backdrop-blur-[2px]"
                            >
                                <PlayCircle className={`${isHero ? 'w-20 h-20' : 'w-16 h-16'} text-white opacity-90 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]`} />
                            </button>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent pointer-events-none" />
                    </>
                )}
                
                {/* Tag Decorativo */}
                {course.tag && (
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg border border-blue-400/30">
                        {course.tag}
                    </div>
                )}
            </div>

            {/* Contenido (Textos y Botones) */}
            <div className={`p-6 flex-1 flex flex-col justify-center ${isHero ? 'md:p-10 md:w-[50%]' : ''}`}>
                <h3 className={`${isHero ? 'text-3xl md:text-4xl' : 'text-xl'} font-extrabold text-white mb-3 tracking-tight line-clamp-2`}>{course.name}</h3>
                
                <p className={`text-gray-400 ${isHero ? 'text-base md:text-lg mb-8' : 'text-sm mb-4 line-clamp-3'} flex-1 leading-relaxed`}>
                    {course.description}
                </p>

                {/* Viñetas de Beneficios (Solo visibles en modo gigante) */}
                {isHero && !showForm && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-sm text-gray-300 font-medium">
                         <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" /> Acceso de por vida</div>
                         <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" /> Proyectos Reales</div>
                         <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" /> Soporte en nuestra comunidad</div>
                         <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" /> Contenido actualizado</div>
                     </div>
                )}

                {/* Precios y Botones */}
                <div className={`flex ${isHero ? 'flex-col sm:flex-row sm:items-center gap-6' : 'items-end justify-between min-h-[4rem] border-t border-zinc-800 pt-4'}`}>
                    <div>
                        {hasDiscount ? (
                            <div className="flex flex-col">
                                <span className="text-gray-500 line-through text-sm font-medium">{course.price} €</span>
                                <span className={`${isHero ? 'text-4xl' : 'text-3xl'} font-bold text-blue-400 drop-shadow-md`}>{course.discount_price} €</span>
                            </div>
                        ) : (
                            <span className={`${isHero ? 'text-4xl' : 'text-3xl'} font-bold text-white`}>{course.price} {course.price && '€'}</span>
                        )}
                    </div>
                    
                    <div className={isHero ? 'flex-1' : ''}>
                        {isAvailable ? (
                            <a 
                                href={udemyLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] ${isHero ? 'w-full py-4 px-8 rounded-xl text-lg' : 'px-5 py-2.5 rounded-lg'}`}
                            >
                                <span>Comprar Curso</span>
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        ) : (
                            <button 
                                onClick={() => setShowForm(!showForm)}
                                className={`flex justify-center items-center gap-2 font-bold transition-all w-full ${
                                    showForm 
                                    ? 'bg-zinc-800 text-gray-300 border border-zinc-700 hover:bg-zinc-700' 
                                    : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                                } ${isHero ? 'py-4 px-8 rounded-xl text-lg' : 'px-5 py-2.5 rounded-lg'}`}
                            >
                                <Users className={isHero ? 'w-6 h-6' : 'w-5 h-5'} />
                                <span>{showForm ? 'Ocultar Formulario' : '¡Quiero Apuntarme!'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Formulario Extensible Animado */}
                {showForm && !isAvailable && (
                    <div className={`${isHero ? 'mt-8' : 'mt-6'} pt-6 border-t border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300`}>
                        <CourseLeadForm />
                    </div>
                )}
            </div>
        </div>
    );
}
