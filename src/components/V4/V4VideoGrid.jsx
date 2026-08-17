import React, { useState, useMemo } from 'react';
import { Search, X, Layers, Sparkles, Flame, Download, GraduationCap, Zap } from 'lucide-react';
import V4VideoCard from './V4VideoCard';

const FILTER_PRESETS = [
  { id: 'newest', label: 'Más Nuevos', icon: Sparkles, desc: 'Últimos publicados' },
  { id: 'popular', label: 'Más Populares', icon: Flame, desc: 'Tutoriales top' },
  { id: 'downloads', label: 'Con Descargas .3MF', icon: Download, desc: 'Perfiles listos' },
  { id: 'course', label: 'Curso Bambu Studio', icon: GraduationCap, desc: 'Ordenado #1 al #15' },
  { id: 'tips', label: 'Trucos Rápidos', icon: Zap, desc: 'Ajustes express' }
];

export default function V4VideoGrid({
  videos,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectVideo,
}) {
  const [activeSortFilter, setActiveSortFilter] = useState('newest');

  // Categorías dinámicas desde los vídeos
  const categories = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [videos]);

  // Filtrado y Ordenación Inteligente
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

    // Filtro por categoría temática (si no es 'Todos')
    if (activeCategory !== 'Todos') {
      result = result.filter(v => v.category?.toLowerCase() === activeCategory?.toLowerCase());
    }

    // Filtro por botón de acceso rápido
    if (activeSortFilter === 'popular') {
      result = [...result].sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return 0;
      });
    } else if (activeSortFilter === 'downloads') {
      result = result.filter(v => v.hasDownloads);
    } else if (activeSortFilter === 'course') {
      // Filtrar y ordenar serie de Bambu Studio de forma didáctica (#1, #2, #3...)
      const courseVideos = result.filter(v => v.chapterNumber !== null || (v.category && v.category.toLowerCase().includes('bambu')));
      result = [...(courseVideos.length > 0 ? courseVideos : result)].sort((a, b) => {
        if (a.chapterNumber !== null && b.chapterNumber !== null) {
          return a.chapterNumber - b.chapterNumber;
        }
        if (a.chapterNumber !== null) return -1;
        if (b.chapterNumber !== null) return 1;
        return 0;
      });
    } else if (activeSortFilter === 'tips') {
      result = result.filter(v => v.category === 'Trucos Rápidos' || v.hasTip);
    }
    // 'newest' mantiene el orden cronológico por defecto (el más reciente publicado primero)

    return result;
  }, [videos, activeCategory, searchQuery, activeSortFilter]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Videoteca de Tutoriales y Trucos</span>
            <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'vídeo' : 'vídeos'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Filtra por novedades, popularidad, descargas o explora por categorías temáticas.
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
                className="hover:text-white text-cyan-400 ml-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ================= BOTONES DE FILTRO RÁPIDO ================= */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {FILTER_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activeSortFilter === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setActiveSortFilter(preset.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 border border-cyan-300/50 scale-[1.02]'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/90 hover:border-cyan-500/40 shadow-sm'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= CATEGORÍAS TEMÁTICAS ================= */}
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

      {/* ================= VIDEO GRID ================= */}
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

    </section>
  );
}
