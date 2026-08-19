import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, BookOpen, Clock, Trash2, Play, Sparkles, GraduationCap, ArrowRight } from 'lucide-react';
import { getAllStudyNotes, deleteVideoNote } from '../../utils/courseProgress';

export default function NotesSearchModal({ isOpen, onClose, onSelectNote, allVideos = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notesTick, setNotesTick] = useState(0);

  // Escuchar actualizaciones de notas en tiempo real
  useEffect(() => {
    const handleNotesUpdate = () => {
      setNotesTick((prev) => prev + 1);
    };
    window.addEventListener('capacero-notes-updated', handleNotesUpdate);
    return () => {
      window.removeEventListener('capacero-notes-updated', handleNotesUpdate);
    };
  }, []);

  // Extraer todos los apuntes guardados en localStorage
  const allNotesList = useMemo(() => {
    const rawAll = getAllStudyNotes();
    const list = [];

    Object.keys(rawAll).forEach((vidId) => {
      const vidNotes = rawAll[vidId];
      if (Array.isArray(vidNotes)) {
        vidNotes.forEach((n) => {
          list.push({
            ...n,
            videoId: vidId
          });
        });
      }
    });

    // Ordenar de más reciente a más antiguo
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [notesTick, isOpen]);

  // Filtrar notas según el término de búsqueda tecleado
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allNotesList;

    return allNotesList.filter((note) => {
      const textMatch = note.text?.toLowerCase().includes(q);
      const titleMatch = note.videoTitle?.toLowerCase().includes(q);
      const courseMatch = note.courseName?.toLowerCase().includes(q);
      return textMatch || titleMatch || courseMatch;
    });
  }, [allNotesList, searchQuery]);

  const handleDelete = (e, videoId, noteId) => {
    e.stopPropagation();
    deleteVideoNote(videoId, noteId);
    setNotesTick((prev) => prev + 1);
  };

  const handleSelectNoteItem = (note) => {
    if (!onSelectNote) return;

    // Buscar el objeto de vídeo original
    const foundVideo = allVideos.find(
      (v) => v.id === note.videoId || v.youtubeId === note.videoId
    ) || {
      id: note.videoId,
      youtubeId: note.videoId,
      title: note.videoTitle || 'Tutorial de Capa Cero 3D',
      category: note.courseName ? `Curso ${note.courseName}` : 'Bambu Studio'
    };

    onSelectNote(foundVideo, note.timestamp);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Mis Apuntes y Notas</span>
                <span className="text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                  {allNotesList.length}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Busca en tus apuntes y salta directamente al segundo exacto del vídeo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar buscador de notas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Buscador de Notas */}
        <div className="p-4 sm:p-5 border-b border-zinc-900 bg-zinc-900/40">
          <div className="relative">
            <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe para buscar entre tus notas o títulos de lección..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-2xl py-3 pl-12 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Resultados de Notas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNoteItem(note)}
                className="group p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl transition-all duration-200 cursor-pointer relative flex flex-col gap-2.5 shadow-sm"
              >
                {/* Fila superior: Curso + Título + Timestamp */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {note.courseName && (
                      <span className="text-[10px] font-extrabold bg-blue-950 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {note.courseName}
                      </span>
                    )}
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {note.videoTitle || 'Tutorial de Capa Cero'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{note.timeFormatted || '00:00'}</span>
                    <Play className="w-3 h-3 text-cyan-400 fill-cyan-400 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>

                {/* Texto del apunte */}
                <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  "{note.text}"
                </p>

                {/* Pie de tarjeta de nota */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>

                  <button
                    onClick={(e) => handleDelete(e, note.videoId, note.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-zinc-800/80 flex items-center gap-1"
                    title="Eliminar este apunte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center p-6 text-zinc-400">
              <BookOpen className="w-12 h-12 text-zinc-600 mb-3" />
              <h4 className="text-sm font-bold text-zinc-200 mb-1">
                {allNotesList.length === 0 ? 'Aún no tienes notas de estudio' : 'No se encontraron notas con esa búsqueda'}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                {allNotesList.length === 0 
                  ? 'Abre cualquier lección o vídeo y escribe tus anotaciones en la pestaña "Apuntes" para guardarlas con el segundo exacto.'
                  : 'Prueba a buscar con otra palabra clave o limpia el campo de texto.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
