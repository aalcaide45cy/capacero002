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
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Videoteca de Tutoriales y Trucos</span>
            <span className="text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'vídeo' : 'vídeos'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Filtra por categoría o busca cualquier ajuste de Bambu Studio o problema de impresión.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por truco, fallo o filamento..."
            className="w-full bg-zinc-900/90 text-sm text-white placeholder-zinc-500 rounded-xl pl-10 pr-9 py-2.5 border border-zinc-800 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
