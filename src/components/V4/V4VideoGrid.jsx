import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Layers, Sparkles, Flame, GraduationCap, ArrowLeft, Play, BookOpen, ChevronRight, Eye, Heart, Compass, CheckCircle2, RotateCcw, Check, Download, Upload, ShieldCheck, Calendar, Clock } from 'lucide-react';
import V4VideoCard from './V4VideoCard';
import { 
  getCourseProgress, 
  getAllCoursesProgress, 
  saveCourseProgress, 
  resetCourseProgress, 
  exportProgressBackup, 
  importProgressBackup 
} from '../../utils/courseProgress';

function formatCounter(num) {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

// Extrae el nombre del curso de forma ESTRICTA:
// SOLO si la categoría empieza por la palabra "Curso" o "curso"
function extractCourseName(video) {
  if (!video) return null;
  const cat = (video.category || '').trim();

  // 1. Debe comenzar OBLIGATORIAMENTE por "Curso" o "curso"
  if (/^curso/i.test(cat)) {
    let name = cat.replace(/^curso\s*:?\s*/i, '').trim();
    if (/^bambustudio$/i.test(name)) name = 'Bambu Studio';
    if (!name) name = 'Bambu Studio';
    return name;
  }

  return null;
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
  const [progressTick, setProgressTick] = useState(0);
  const [backupMessage, setBackupMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Escuchar eventos de actualización de progreso en tiempo real
  useEffect(() => {
    const handleProgressUpdate = () => {
      setProgressTick((prev) => prev + 1);
    };
    window.addEventListener('capacero-progress-updated', handleProgressUpdate);
    return () => {
      window.removeEventListener('capacero-progress-updated', handleProgressUpdate);
    };
  }, []);

  // Categorías dinámicas desde los vídeos para el filtrado temático
  const categories = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [videos]);

  // Agrupación de Cursos
  const coursesData = useMemo(() => {
    const map = {};

    videos.forEach((video) => {
      const courseName = extractCourseName(video);

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

    // Ordenar las lecciones dentro de cada curso en orden ascendente (Lección 1 -> Lección 2 -> ... -> Lección 15)
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

  // Progreso del curso activo
  const activeCourseProgress = useMemo(() => {
    if (!activeCourse) return null;
    return getCourseProgress(activeCourse.name);
  }, [activeCourse, progressTick]);

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

    // Separar publicados y programados: los publicados van PRIMERO, los programados AL FINAL
    const published = result.filter(v => !v.isScheduled);
    const scheduled = result.filter(v => v.isScheduled);

    if (activeSortFilter === 'popular') {
      published.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
      scheduled.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else {
      // 'newest': Más nuevos publicados primero
      published.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      // Programados ordenados por fecha de estreno más próxima
      scheduled.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    }

    return [...published, ...scheduled];
  }, [videos, activeCategory, searchQuery, activeSortFilter]);

  const handleSwitchFilter = (filterType) => {
    setActiveSortFilter(filterType);
    if (filterType !== 'courses') {
      setSelectedCourseName(null);
    }
  };

  const handleGoBackToCourses = () => {
    setSelectedCourseName(null);
  };

  const handleResetCourse = (courseName) => {
    resetCourseProgress(courseName);
    setProgressTick((prev) => prev + 1);
  };

  // Manejo de Copia de Seguridad JSON
  const handleExportBackup = () => {
    exportProgressBackup();
    setBackupMessage('✅ Copia de seguridad descargada en formato JSON.');
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      const res = importProgressBackup(content);
      if (res.success) {
        setProgressTick((prev) => prev + 1);
        setBackupMessage('✅ Progreso restaurado con éxito desde el archivo JSON.');
      } else {
        setBackupMessage(`❌ ${res.message}`);
      }
      setTimeout(() => setBackupMessage(null), 4500);
    };
    reader.readAsText(file);
    e.target.value = '';
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
                ? (activeCourse ? `${activeCourse.videos.length} lecciones` : `${coursesList.length} cursos`)
                : `${filteredVideos.length} ${filteredVideos.length === 1 ? 'vídeo' : 'vídeos'}`}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {activeSortFilter === 'courses'
              ? 'Rutas de aprendizaje ordenadas paso a paso para dominar herramientas desde cero hasta nivel avanzado.'
              : 'Encuentra soluciones específicas, configuraciones optimizadas y respuestas a dudas frecuentes.'}
          </p>
        </div>
      </div>

      {/* Selector de Modos: Más Nuevos / Más Populares / 🎓 Cursos */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-8">
        {/* Botón 1: Más Nuevos */}
        <button
          onClick={() => handleSwitchFilter('newest')}
          className={`h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 border box-border ${
            activeSortFilter === 'newest'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeSortFilter === 'newest' ? 'text-white' : 'text-cyan-400'}`} />
          <span>Más Nuevos</span>
        </button>

        {/* Botón 2: Más Populares */}
        <button
          onClick={() => handleSwitchFilter('popular')}
          className={`h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 border box-border ${
            activeSortFilter === 'popular'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeSortFilter === 'popular' ? 'text-white' : 'text-amber-400'}`} />
          <span>Más Populares</span>
        </button>

        {/* Botón 3: Cursos */}
        <button
          onClick={() => handleSwitchFilter('courses')}
          className={`h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 border box-border ${
            activeSortFilter === 'courses'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border-cyan-300/50 scale-[1.02]'
              : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-800/90 hover:border-cyan-500/40'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${activeSortFilter === 'courses' ? 'text-white' : 'text-emerald-400'}`} />
          <span>🎓 Cursos</span>
          <span className="text-[10px] font-extrabold bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/40 leading-none">
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
              
              {/* BARRA DE NAVEGACIÓN SUPERIOR SUPER DESTACADA E INTUITIVA */}
              <div className="flex flex-col gap-4">
                
                {/* Barra Superior: [Volver al Catálogo + Breadcrumb] a la izquierda | [Backup Progreso + Restaurar Progreso] a la derecha */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800 p-3.5 sm:p-4 rounded-2xl">
                  {/* Grupo Izquierda: Botón Volver + Breadcrumb juntos */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleGoBackToCourses}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-900/70 to-zinc-900 hover:from-blue-700 hover:to-cyan-700 text-white border border-cyan-500/50 hover:border-cyan-400 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all duration-200 cursor-pointer active:scale-95 group"
                    >
                      <ArrowLeft className="w-4 h-4 text-cyan-300 group-hover:-translate-x-1 transition-transform" />
                      <span>← Volver al Catálogo</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-2 rounded-xl">
                      <span 
                        onClick={handleGoBackToCourses} 
                        className="hover:text-cyan-300 cursor-pointer transition-colors"
                      >
                        Cursos
                      </span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-cyan-300 font-extrabold">{activeCourse.name}</span>
                    </div>
                  </div>

                  {/* Grupo Derecha: Botones Backup y Restaurar Progreso */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportBackup}
                      className="flex items-center gap-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Guardar copia de seguridad de tu progreso y apuntes en un archivo JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Backup Progreso</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Restaurar tu progreso y notas desde un archivo JSON"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Restaurar Progreso</span>
                    </button>
                  </div>
                </div>

                {/* Nota Explicativa y Sincera de Privacidad y Backup */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 text-left">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-300/90 leading-relaxed">
                    <strong className="text-white font-bold">Tu privacidad y tu aprendizaje:</strong> Capa Cero es una web 100% estática y privada. No guardamos tus datos en ningún servidor externo ni te pedimos registros. Tus lecciones vistas, notas y minuto exacto se guardan solo en la memoria de este navegador. Usa <strong className="text-cyan-300">Backup Progreso</strong> para descargar tu archivo de respaldo por si vas a cambiar de equipo, y <strong className="text-blue-300">Restaurar Progreso</strong> para retomar tus cursos exactamente donde los dejaste.
                  </p>
                </div>

                {/* Banner de Bienvenida y Progreso al Curso */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 bg-gradient-to-r from-blue-950/60 via-zinc-900 to-cyan-950/40 border border-cyan-500/40 rounded-3xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col gap-2 max-w-2xl text-left">
                    <div className="inline-flex items-center gap-2 text-xs font-black tracking-wider text-cyan-300 uppercase bg-blue-950/80 px-3 py-1 rounded-full border border-cyan-500/40 w-fit">
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                      <span>Ruta Oficial de Aprendizaje</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {activeCourse.title}
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      Sigue el temario ordenado paso a paso con las <strong className="text-cyan-300">{activeCourse.videos.length} lecciones prácticas</strong> diseñadas para aprender desde cero y sin rodeos.
                    </p>

                    {/* Barra de progreso visual si ha comenzado */}
                    {activeCourseProgress && activeCourseProgress.completedVideoIds?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center gap-3">
                        <div className="flex-1 bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(100, Math.round((activeCourseProgress.completedVideoIds.length / activeCourse.videos.length) * 100))}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-cyan-300 whitespace-nowrap">
                          {activeCourseProgress.completedVideoIds.length} / {activeCourse.videos.length} Vistas ({Math.min(100, Math.round((activeCourseProgress.completedVideoIds.length / activeCourse.videos.length) * 100))}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción: Continuar + Reiniciar / Empezar Lección #1 */}
                  {activeCourse.videos.length > 0 && (
                    <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
                      {(() => {
                        const hasStarted = Boolean(activeCourseProgress && (activeCourseProgress.lastVideoId || activeCourseProgress.lastYoutubeId));
                        
                        if (hasStarted) {
                          // Buscar la última lección guardada o la siguiente
                          const lastIdx = activeCourse.videos.findIndex(
                            (v) => (activeCourseProgress.lastVideoId && v.id === activeCourseProgress.lastVideoId) ||
                                   (activeCourseProgress.lastYoutubeId && v.youtubeId === activeCourseProgress.lastYoutubeId)
                          );
                          const targetVideo = lastIdx !== -1 ? activeCourse.videos[lastIdx] : activeCourse.videos[0];
                          const lessonNum = targetVideo.chapterNumber !== null ? targetVideo.chapterNumber : (lastIdx !== -1 ? lastIdx + 1 : 1);

                          return (
                            <>
                              {/* Botón Continuar */}
                              <button
                                onClick={() => {
                                  saveCourseProgress(activeCourse.name, targetVideo);
                                  onSelectVideo && onSelectVideo(targetVideo);
                                }}
                                className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                              >
                                <Play className="w-4 h-4 fill-white translate-x-0.5" />
                                <span>Continuar (Lección #{lessonNum})</span>
                              </button>

                              {/* Botón Reiniciar Curso */}
                              <button
                                onClick={() => handleResetCourse(activeCourse.name)}
                                className="flex items-center justify-center gap-1.5 bg-zinc-900/90 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 hover:border-red-500/50 border border-zinc-700/80 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                title="Reiniciar progreso del curso para empezar desde cero"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>Reiniciar</span>
                              </button>
                            </>
                          );
                        }

                        // Si NO ha comenzado: mostrar únicamente "Empezar desde la Lección #1"
                        return (
                          <button
                            onClick={() => {
                              const firstVideo = activeCourse.videos[0];
                              saveCourseProgress(activeCourse.name, firstVideo);
                              onSelectVideo && onSelectVideo(firstVideo);
                            }}
                            className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer border border-cyan-300/40"
                          >
                            <Play className="w-4 h-4 fill-white translate-x-0.5" />
                            <span>Empezar desde la Lección #1</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>

              {/* Grid de lecciones del curso ordenadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCourse.videos.map((video, idx) => {
                  const lessonNumber = video.chapterNumber !== null ? video.chapterNumber : idx + 1;
                  const isCompleted = activeCourseProgress?.completedVideoIds?.includes(video.id) || 
                                      activeCourseProgress?.completedVideoIds?.includes(video.youtubeId);
                  const isCurrent = activeCourseProgress && (
                    (activeCourseProgress.lastVideoId && video.id === activeCourseProgress.lastVideoId) ||
                    (activeCourseProgress.lastYoutubeId && video.youtubeId === activeCourseProgress.lastYoutubeId)
                  );

                  return (
                    <div
                      key={video.id}
                      onClick={() => {
                        saveCourseProgress(activeCourse.name, video);
                        onSelectVideo && onSelectVideo(video);
                      }}
                      className={`group bg-zinc-900/80 hover:bg-zinc-900 border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full text-left cursor-pointer relative ${
                        isCurrent
                          ? 'border-cyan-400/80 ring-2 ring-cyan-500/30 shadow-cyan-950/50'
                          : 'border-zinc-800/80 hover:border-cyan-500/50'
                      }`}
                    >
                      {/* Thumbnail con Badges de Estado */}
                      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                            video.isScheduled ? 'brightness-75 grayscale-[20%]' : ''
                          }`}
                        />

                        {/* Overlay Oscurecido + Badge "Estreno el día..." con colores de la web (Azul Eléctrico y Cyan) */}
                        {video.isScheduled ? (
                          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-3 text-center z-10">
                            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white text-[10px] sm:text-[11px] font-black px-3.5 py-1.5 rounded-xl border border-cyan-300/40 shadow-xl shadow-blue-950/80 flex items-center gap-1.5 uppercase tracking-wider">
                              <Calendar className="w-3.5 h-3.5 text-cyan-200" />
                              <span>{video.scheduledDateFormatted || 'Estreno Próximamente'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                        )}
                        
                        {/* Badge de número de lección */}
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-700 to-cyan-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-md border border-cyan-300/40 flex items-center gap-1.5 z-20">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Lección #{lessonNumber}</span>
                        </div>

                        {/* Badges de Progreso (En Curso / Completada) */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                          {isCurrent && (
                            <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-400/60 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md animate-pulse">
                              <Play className="w-2.5 h-2.5 fill-cyan-300" />
                              <span>En Curso</span>
                            </span>
                          )}
                          {isCompleted && !isCurrent && (
                            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Vista</span>
                            </span>
                          )}
                        </div>

                        {/* Botón flotante Play */}
                        {!video.isScheduled && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
                            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-white translate-x-0.5" />
                            </div>
                          </div>
                        )}
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
                            <span>{isCurrent ? 'Continuar lección' : 'Ver lección'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón Inferior para Volver a los Cursos al final de la página */}
              <div className="pt-8 pb-4 flex justify-center">
                <button
                  onClick={handleGoBackToCourses}
                  className="inline-flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                  <span>Volver a la Lista de Cursos</span>
                </button>
              </div>

            </div>
          ) : (
            /* Sub-vista B: CATÁLOGO DE TODOS LOS CURSOS DISPONIBLES */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesList.map((course) => {
                  const progress = getCourseProgress(course.name);
                  const completedCount = progress?.completedVideoIds?.length || 0;
                  const totalCount = course.videos.length;
                  const hasStarted = Boolean(progress && (progress.lastVideoId || progress.lastYoutubeId));

                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourseName(course.name);
                      }}
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
                        
                        <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[11px] font-black px-2.5 py-1 rounded-md border border-cyan-400/40 uppercase tracking-wider flex items-center gap-1.5 shadow-md">
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

                          {/* Mini barra de progreso si tiene lecciones vistas */}
                          {completedCount > 0 && (
                            <div className="mb-4 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 mb-1.5">
                                <span className="text-cyan-300 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Progreso guardado</span>
                                </span>
                                <span>{completedCount} de {totalCount}</span>
                              </div>
                              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-cyan-400 h-full rounded-full" 
                                  style={{ width: `${Math.min(100, Math.round((completedCount / totalCount) * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{formatCounter(course.totalViews)} vistas</span>
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 group-hover:text-white group-hover:translate-x-1 transition-all">
                            <span>{hasStarted ? 'Continuar Curso' : 'Explorar Curso'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ================= BARRA DE COPIA DE SEGURIDAD Y RESTAURACIÓN JSON ================= */}
              <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800 p-4 sm:p-5 rounded-2xl">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-white">Tu Progreso y Apuntes están 100% en tu poder</h5>
                    <p className="text-[11px] sm:text-xs text-zinc-400">Web 100% estática y privada sin registros. Tu avance se guarda solo en este navegador. Descarga o carga tu archivo de respaldo cuando quieras.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Descargar copia de seguridad en archivo .json"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Backup Progreso</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 hover:border-cyan-500/50 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Restaurar progreso y notas desde un archivo .json"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Restaurar Progreso</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Mensaje de confirmación de Backup */}
              {backupMessage && (
                <div className="p-3 bg-blue-950/80 border border-cyan-500/50 text-cyan-200 text-xs font-bold rounded-xl text-center animate-fade-in">
                  {backupMessage}
                </div>
              )}

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
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de vídeos estándar */}
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
            <div className="py-16 text-center bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8">
              <Compass className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No se encontraron vídeos</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No hay resultados con el término de búsqueda o categoría seleccionada.
              </p>
            </div>
          )}
        </div>
      )}

    </section>
  );
}
