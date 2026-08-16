import React, { useMemo } from 'react';
import { Search, X, Layers, Sparkles } from 'lucide-react';
import V4VideoCard from './V4VideoCard';

export default function V4VideoGrid({
  videos,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectVideo,
}) {
  // Derive categories dynamically from videos
  const categories = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [videos]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesCat =
        activeCategory === 'Todos' ||
        video.category?.toLowerCase() === activeCategory?.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        video.title?.toLowerCase().includes(q) ||
        video.description?.toLowerCase().includes(q) ||
        video.category?.toLowerCase().includes(q) ||
        video.consejoClave?.toLowerCase().includes(q);

      return matchesCat && matchesQuery;
    });
  }, [videos, activeCategory, searchQuery]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Controls (Limpio, sin buscador redundante) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Videoteca de Tutoriales y Trucos</span>
            <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'vídeo' : 'vídeos'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Explora por categoría o utiliza el buscador superior para encontrar soluciones exactas.
          </p>
        </div>

        {/* Indicador de filtro de búsqueda activo (si se ha buscado algo) */}
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

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 border border-cyan-300/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80 hover:border-cyan-500/30'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Video Grid */}
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
            Prueba a buscar con otras palabras clave o restablece los filtros de categoría.
          </p>
          <button
            onClick={() => {
              onSelectCategory('Todos');
              onSearchChange('');
            }}
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 bg-blue-950/40 border border-cyan-500/30 px-4 py-2 rounded-xl transition-colors"
          >
            Restablecer Filtros
          </button>
        </div>
      )}

    </section>
  );
}
