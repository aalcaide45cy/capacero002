import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, BookOpen, Clock, Trash2, Play, Sparkles, GraduationCap, ArrowRight, RefreshCw, QrCode, Cloud, CloudOff, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck, Edit3, Check } from 'lucide-react';
import { getAllStudyNotes, deleteVideoNote, updateVideoNote, getVaultId, getLastSyncTime, syncVaultPull, syncVaultPush } from '../../utils/courseProgress';

export default function NotesSearchModal({ isOpen, onClose, onSelectNote, onOpenQRSync, allVideos = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notesTick, setNotesTick] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingTime, setEditingTime] = useState('00:00');
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [syncState, setSyncState] = useState({
    vaultId: null,
    status: 'unlinked', // 'synced' | 'syncing' | 'unlinked' | 'offline' | 'error'
    lastSync: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Escuchar estado de sincronización y notas en tiempo real
  useEffect(() => {
    const updateLocalSyncState = () => {
      const vId = getVaultId();
      const last = getLastSyncTime();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setSyncState({
        vaultId: vId,
        status: !isOnline ? 'offline' : (vId ? 'synced' : 'unlinked'),
        lastSync: last
      });
    };

    updateLocalSyncState();
    if (isOpen && getVaultId()) {
      syncVaultPull();
    }

    const handleSyncStatus = (e) => {
      if (e.detail) {
        setSyncState({
          vaultId: e.detail.vaultId || getVaultId(),
          status: e.detail.status,
          lastSync: e.detail.lastSync || getLastSyncTime()
        });
      }
    };

    const handleNotesUpdate = () => {
      setNotesTick((prev) => prev + 1);
    };

    window.addEventListener('capacero-sync-status', handleSyncStatus);
    window.addEventListener('capacero-notes-updated', handleNotesUpdate);

    return () => {
      window.removeEventListener('capacero-sync-status', handleSyncStatus);
      window.removeEventListener('capacero-notes-updated', handleNotesUpdate);
    };
  }, [isOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await syncVaultPull();
    setTimeout(() => setIsRefreshing(false), 800);
  };

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

  const handleStartEdit = (e, note) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditingText(note.text);
    setEditingTime(note.timeFormatted || '00:00');
  };

  const handleSaveEdit = (e, note) => {
    e.stopPropagation();
    if (!editingText.trim()) return;
    updateVideoNote(note.videoId, note.id, editingText, editingTime);
    setEditingNoteId(null);
    setEditingText('');
    setEditingTime('00:00');
    setNotesTick((prev) => prev + 1);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingNoteId(null);
    setEditingText('');
    setEditingTime('00:00');
  };

  const handlePromptDelete = (e, note) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    deleteVideoNote(noteToDelete.videoId, noteToDelete.id);
    setNoteToDelete(null);
    setNotesTick((prev) => prev + 1);
  };

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative text-left cursor-default"
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

        {/* Banner de Estado de Sincronización Activa */}
        <div className="px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          {syncState.status === 'synced' && syncState.vaultId && (
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-white">Sincronización activa:</strong> Notas al día en todos tus dispositivos.
              </span>
            </div>
          )}

          {syncState.status === 'syncing' && (
            <div className="flex items-center gap-2 text-cyan-300 font-medium animate-pulse">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span>Sincronizando notas en segundo plano...</span>
            </div>
          )}

          {syncState.status === 'unlinked' && (
            <div className="flex items-center justify-between w-full gap-2 text-amber-300 font-medium">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-white">Modo Local:</strong> Notas guardadas en este equipo.
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenQRSync) onOpenQRSync();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/40 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                title="Vincular con tu móvil mediante código QR"
              >
                <QrCode className="w-3 h-3 text-cyan-400" />
                <span>Vincular con QR</span>
              </button>
            </div>
          )}

          {(syncState.status === 'offline' || syncState.status === 'error') && (
            <div className="flex items-center gap-2 text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong className="text-white">Sin Conexión:</strong> Tus notas siguen 100% a salvo en local.
              </span>
            </div>
          )}
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar overscroll-contain">
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

                {/* Texto del apunte o Editor en vivo con ajuste de tiempo */}
                {editingNoteId === note.id ? (
                  <div className="space-y-2.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Minuto exacto:</span>
                        </span>
                        <input
                          type="text"
                          value={editingTime}
                          onChange={(e) => setEditingTime(e.target.value)}
                          placeholder="MM:SS"
                          className="bg-zinc-900 border border-zinc-700 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono font-bold w-24 text-center focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 italic">
                        (ej: 03:45 o 1:12:30)
                      </span>
                    </div>

                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-950 border-2 border-cyan-500 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none resize-none leading-relaxed"
                      placeholder="Escribe el contenido del apunte..."
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSaveEdit(e, note)}
                        disabled={!editingText.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Guardar cambios</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    "{note.text}"
                  </p>
                )}

                {/* Pie de tarjeta de nota */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>

                  {editingNoteId !== note.id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(e, note)}
                        className="text-zinc-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800/80 flex items-center gap-1 cursor-pointer"
                        title="Editar este apunte"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handlePromptDelete(e, note)}
                        className="text-zinc-400 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800/80 flex items-center gap-1 cursor-pointer"
                        title="Eliminar este apunte"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Eliminar</span>
                      </button>
                    </div>
                  )}
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

        {/* Modal Grande de Confirmación para Eliminar Apunte */}
        {noteToDelete && (
          <div 
            className="absolute inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up text-left">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">¿Eliminar este apunte?</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Esta acción no se puede deshacer y se sincronizará con tus otros dispositivos.
                  </p>
                </div>
              </div>

              {/* Previsualización del apunte */}
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-300 truncate max-w-[200px]">
                    {noteToDelete.videoTitle || 'Tutorial'}
                  </span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {noteToDelete.timeFormatted || '00:00'}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 italic line-clamp-3">
                  "{noteToDelete.text}"
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sí, Eliminar Apunte</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
