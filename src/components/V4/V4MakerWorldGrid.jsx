import React, { useState, useEffect, useMemo } from 'react';
import { Box, Sparkles, Search, ExternalLink, Download, Layers, Tag, RefreshCw } from 'lucide-react';
import V4MakerWorldCard from './V4MakerWorldCard';
import V4MakerWorldModal from './V4MakerWorldModal';
import { loadMakerWorldModels } from '../../utils/loadMakerWorldModels';

export default function V4MakerWorldGrid({ searchQuery = '', onSearchChange }) {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('Todos');
  const [selectedModelModal, setSelectedModelModal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    loadMakerWorldModels()
      .then((data) => {
        if (isMounted) {
          setModels(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Obtener tags únicos
  const availableTags = useMemo(() => {
    const set = new Set();
    models.forEach((m) => {
      if (m.tag) set.add(m.tag);
    });
    return ['Todos', ...Array.from(set)];
  }, [models]);

  // Filtrado por búsqueda y tag
  const filteredModels = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return models.filter((m) => {
      const matchesSearch = !q || 
        m.name?.toLowerCase().includes(q) || 
        m.description?.toLowerCase().includes(q) ||
        m.tag?.toLowerCase().includes(q);
      
      const matchesTag = selectedTag === 'Todos' || m.tag?.toLowerCase() === selectedTag.toLowerCase();
      return matchesSearch && matchesTag;
    });
  }, [models, searchQuery, selectedTag]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-zinc-950/90 border border-cyan-500/40 rounded-3xl shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-300 bg-blue-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/40 mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Modelos 3D Listos para Imprimir</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Catálogo Oficial de Modelos MakerWorld
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Descarga piezas funcionales, accesorios de calibración y diseños exclusivos optimizados para Bambu Lab.
            </p>
          </div>
        </div>

        {/* CTA Profile MakerWorld */}
        <a
          href="https://makerworld.com/en/@capa_cero"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-white border border-zinc-700 hover:border-cyan-500/50 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <span>Ver Perfil en MakerWorld</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      {/* Tag Filter Pills (si hay tags) */}
      {availableTags.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                selectedTag === tag
                  ? 'bg-blue-950 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950'
                  : 'bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 h-72 animate-pulse flex flex-col justify-between">
              <div className="w-full h-40 bg-zinc-900 rounded-xl" />
              <div className="h-4 bg-zinc-900 rounded w-3/4" />
              <div className="h-8 bg-zinc-900 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <V4MakerWorldCard 
              key={model.id} 
              model={model} 
              onSelect={(m) => setSelectedModelModal(m)} 
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg">
            <Box className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white mb-1">
              {searchQuery ? 'No se encontraron modelos con esa búsqueda' : 'Nuevos modelos próximamente'}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              {searchQuery 
                ? 'Prueba a buscar con otras palabras o limpia los filtros de búsqueda.'
                : 'Estamos añadiendo nuevos modelos 3D a la colección. Puedes consultar todos los diseños disponibles directamente en nuestro perfil oficial de MakerWorld.'}
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://makerworld.com/en/@capa_cero"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Explorar perfil en MakerWorld</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      )}

      {/* Modal en Grande de Modelo 3D con Carrusel Automático */}
      {selectedModelModal && (
        <V4MakerWorldModal
          model={selectedModelModal}
          onClose={() => setSelectedModelModal(null)}
        />
      )}

    </div>
  );
}
