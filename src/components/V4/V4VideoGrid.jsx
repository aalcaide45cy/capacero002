import React, { useState, useMemo } from 'react';
import { Search, X, Layers, Sparkles, Flame, GraduationCap, ArrowLeft, Play, BookOpen, CheckCircle, ChevronRight, Download, Eye, Heart } from 'lucide-react';
import V4VideoCard from './V4VideoCard';

function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

export default function V4VideoGrid({
  videos,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectVideo,
}) {
  // Filtros principales: 'newest' (Más Nuevos), 'popular' (Más Populares) y 'courses' (Cursos)
  const [activeSortFilter, setActiveSortFilter] = useState('newest');
  const [selectedCourseName, setSelectedCourseName] = useState(null);

  // Categorías dinámicas desde los vídeos para el filtrado temático
  const categories = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [videos]);

  // Detección y agrupación dinámica de Cursos:
  // Categorías que empiezan por 'Curso ' o 'curso ', más retrocompatibilidad con 'Bambu Studio'
  const coursesData = useMemo(() => {
    const map = {};
    videos.forEach((video) => {
      const cat = (video.category || '').trim();
      let courseName = null;

      if (/^curso\s+/i.test(cat)) {
        courseName = cat.replace(/^curso\s+/i, '').trim();
      } else if (cat.toLowerCase() === 'bambu studio') {
        courseName = 'Bambu Studio';
      }

      if (courseName) {
        if (!map[courseName]) {
          map[courseName] = {
            id: courseName.toLowerCase().replace(/\s+/g, '-'),
            name: courseName,
            title: `Curso ${courseName}`,
            videos: [],
            totalViews: 0,
            totalLikes: 0,
            thumbnail: video.thumbnail || '/logo-capa-cero-small.png'
          };
        }
        map[courseName].videos.push(video);
        map[courseName].totalViews += (video.views || 0);
        map[courseName].totalLikes += (video.likes || 0);

        if (video.chapterNumber === 1 || video.isFeatured) {
          map[courseName].thumbnail = video.thumbnail;
        }
      }
    });

    // Ordenar las lecciones dentro de cada curso en orden ascendente (Lección 1, 2, 3... 15)
    Object.values(map).forEach((course) => {
      course.videos.sort((a, b) => {
        if (a.chapterNumber !== null && b.chapterNumber !== null) {
          return a.chapterNumber - b.chapterNumber;
        }
        if (a.chapterNumber !== null) return -1;
        if (b.chapterNumber !== null) return 1;
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      });
      if (course.videos.length > 0 && (!course.thumbnail || course.thumbnail.includes('small.png'))) {
        course.thumbnail = course.videos[0].thumbnail;
      }
    });

    return map;
  }, [videos]);

  const coursesList = useMemo(() => Object.values(coursesData), [coursesData]);
  const activeCourse = selectedCourseName ? coursesData[selectedCourseName] : null;

  // Filtrado y Ordenación Inteligente para la Videoteca estándar
  const filteredVideos = useMemo(() => {
    let result = videos.filter((video) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        video.title?.toLowerCase().includes(q) ||
        video.description?.toLowerCase().includes(q) ||
        video.category?.toLowerCase().includes(q) ||
        video.consejoClave?.toLowerCase().includes(q);

      return matchesQuery;
    });

    if (activeCategory !== 'Todos') {
      result = result.filter(v => v.category?.toLowerCase() === activeCategory?.toLowerCase());
    }

    if (activeSortFilter === 'popular') {
      result = [...result].sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else {
      // 'newest': orden cronológico inverso
      result = [...result];
    }

    return result;
  }, [videos, activeCategory, searchQuery, activeSortFilter]);

  const handleSwitchFilter = (filterType) => {
    setActiveSortFilter(filterType);
    if (filterType !== 'courses') {
      setSelectedCourseName(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>
              {activeSortFilter === 'courses' 
                ? (activeCourse ? `Curso: ${activeCourse.name}` : 'Academia de Cursos Estructurados') 
                : 'Videoteca de Tutoriales y Trucos'}
            </span>
            <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full">
              {activeSortFilter === 'courses'
                ? (activeCourse ? `${activeCourse.videos.length} lecciones` : `${coursesList.length} cursos disponibles`)
                : `${filteredVideos.length} ${filteredVideos.length === 1 ? 'vídeo' : 'vídeos'}`}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {activeSortFilter === 'courses'
              ? (activeCourse 
                  ? 'Sigue el orden de lecciones paso a paso desde el nivel básico hasta experto.' 
                  : 'Rutas de aprendizaje guiadas por módulos para dominar cada herramienta desde cero.')
              : 'Explora las últimas novedades, los tutoriales más populares o filtra por categorías.'}
          </p>
        </div>

        {/* Indicador de filtro de búsqueda activo */}
        {searchQuery && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-zinc-400 font-medium">Buscando:</span>
            <span className="inline-flex items-center gap-1.5 bg-blue-950/60 border border-cyan-500/40 text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[160px]">"{searchQuery}"</span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-white text-cyan-400 ml-0.5 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ================= BOTONES PRINCIPALES: MÁS NUEVOS, MÁS POPULARES Y CURSOS ================= */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Botón 1: Más Nuevos */}
        <button
          onClick={() => handleSwitchFilter('newest')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            activeSortFilter === 'newest'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeSortFilter === 'newest' ? 'text-white' : 'text-cyan-400'}`} />
          <span>Más Nuevos</span>
        </button>

        {/* Botón 2: Más Populares */}
        <button
          onClick={() => handleSwitchFilter('popular')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            activeSortFilter === 'popular'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeSortFilter === 'popular' ? 'text-white' : 'text-amber-400'}`} />
          <span>Más Populares</span>
        </button>

        {/* Botón 3: Cursos */}
        <button
          onClick={() => handleSwitchFilter('courses')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            activeSortFilter === 'courses'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${activeSortFilter === 'courses' ? 'text-white' : 'text-emerald-400'}`} />
          <span>🎓 Cursos</span>
          <span className="text-[10px] font-extrabold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
            {coursesList.length}
          </span>
        </button>
      </div>

      {/* ================= VISTA DE CURSOS (MODO: 'courses') ================= */}
      {activeSortFilter === 'courses' ? (
        <div>
          {/* Sub-vista A: DETALLE DE UN CURSO ESPECÍFICO CON SUS LECCIONES ORDENADAS */}
          {activeCourse ? (
            <div className="space-y-6">
              {/* Botón de retorno y cabecera del curso */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-gradient-to-r from-blue-950/40 via-zinc-900/80 to-zinc-900/40 border border-cyan-500/30 rounded-2xl shadow-xl">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedCourseName(null)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-100 transition-colors w-fit cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a todos los cursos</span>
                  </button>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeCourse.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300">
                    Ruta estructurada de <strong className="text-cyan-300">{activeCourse.videos.length} lecciones</strong> ordenadas de principio a fin.
                  </p>
                </div>

                {activeCourse.videos.length > 0 && (
                  <button
                    onClick={() => onSelectVideo && onSelectVideo(activeCourse.videos[0])}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 shrink-0 cursor-pointer border border-cyan-400/40"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Empezar Lección 1</span>
                  </button>
                )}
              </div>

              {/* Grid de lecciones del curso ordenadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCourse.videos.map((video, idx) => {
                  const lessonNumber = video.chapterNumber !== null ? video.chapterNumber : idx + 1;
                  return (
                    <div
                      key={video.id}
                      onClick={() => onSelectVideo && onSelectVideo(video)}
                      className="group bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full text-left cursor-pointer relative"
                    >
                      {/* Thumbnail con Badge de Lección */}
                      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                        
                        {/* Badge de número de lección */}
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-700 to-cyan-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-md border border-cyan-300/40 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Lección #{lessonNumber}</span>
                        </div>

                        {/* Botón flotante Play */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white translate-x-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Info de la lección */}
                      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                            {video.title}
                          </h4>
                          {video.hasDescription && (
                            <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                              {video.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{formatCounter(video.views)}</span>
                          </span>
                          <span className="text-cyan-300 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            <span>Ver lección</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Sub-vista B: CATÁLOGO DE TODOS LOS CURSOS DISPONIBLES */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesList.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourseName(course.name)}
                  className="group bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 hover:border-cyan-500/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-cyan-950/30 transition-all duration-300 flex flex-col cursor-pointer text-left"
                >
                  {/* Portada del curso */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    
                    <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[11px] font-black px-2.5 py-1 rounded-md border border-cyan-400/40 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Curso Completo</span>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-black/80 text-cyan-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      {course.videos.length} {course.videos.length === 1 ? 'Lección' : 'Lecciones'}
                    </div>
                  </div>

                  {/* Contenido de la Tarjeta del Curso */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors mb-2">
                        {course.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
                        Aprende paso a paso con {course.videos.length} lecciones ordenadas y prácticas diseñadas para dominar {course.name}.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{formatCounter(course.totalViews)} vistas</span>
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 group-hover:text-white group-hover:translate-x-1 transition-all">
                        <span>Explorar Curso</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ================= VISTA ESTÁNDAR DE VIDEOTECA (MÁS NUEVOS / MÁS POPULARES) ================= */
        <div>
          {/* Categorías Temáticas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar border-b border-zinc-800/60">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mr-1 hidden sm:inline-block">
              Temas:
            </span>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-950/90 border border-cyan-400/60 text-cyan-200 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de Vídeos */}
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <V4VideoCard
                  key={video.id}
                  video={video}
                  onSelect={onSelectVideo}
                />
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center max-w-lg mx-auto">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No se encontraron tutoriales</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mb-4">
                Prueba a buscar con otras palabras clave o restablece los filtros.
              </p>
              <button
                onClick={() => {
                  setActiveSortFilter('newest');
                  onSelectCategory('Todos');
                  onSearchChange('');
                }}
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 bg-blue-950/40 border border-cyan-500/30 px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          )}
        </div>
      )}

    </section>
  );
}
