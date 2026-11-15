'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { EditorState, EditorAction, EditorFile, ViewMode, FolderNode } from '@/lib/types';
import { createFile, createNewFile, updateFileStats, getLanguageFromName } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// State & Reducer
// ──────────────────────────────────────────────────────────

const initialState: EditorState = {
  files: [],
  activeFileId: null,
  viewMode: 'split',
  sidebarOpen: true,
  folders: [],
  searchQuery: '',
};

function updateNodeFiles(nodes: FolderNode[], fileId: string, finalName: string): FolderNode[] {
  return nodes.map(folder => ({
    ...folder,
    files: folder.files.map(f => {
      if (f.id !== fileId) return f;
      const pathParts = f.path.split('/');
      pathParts[pathParts.length - 1] = finalName;
      return {
        ...f,
        name: finalName,
        path: pathParts.join('/'),
        language: getLanguageFromName(finalName),
      };
    }),
    children: updateNodeFiles(folder.children, fileId, finalName),
  }));
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_FILE': {
      return {
        ...state,
        files: [...state.files, action.payload],
        activeFileId: action.payload.id,
      };
    }

    case 'RELOAD_FILE': {
      // Reemplaza el contenido de un archivo ya abierto con lo leído de disco
      const { id, content, handle } = action.payload;
      return {
        ...state,
        files: state.files.map(f =>
          f.id === id
            ? {
                ...f,
                content,
                originalContent: content,
                isDirty: false,
                handle: handle ?? f.handle,
                ...updateFileStats(f, content),
              }
            : f
        ),
        activeFileId: id,
      };
    }

    case 'REMOVE_FILE': {
      const newFiles = state.files.filter(f => f.id !== action.payload);
      let newActiveId = state.activeFileId;
      if (state.activeFileId === action.payload) {
        const idx = state.files.findIndex(f => f.id === action.payload);
        newActiveId =
          newFiles[idx]?.id || newFiles[idx - 1]?.id || newFiles[0]?.id || null;
      }
      return { ...state, files: newFiles, activeFileId: newActiveId };
    }

    case 'SET_ACTIVE':
      return { ...state, activeFileId: action.payload };

    case 'UPDATE_CONTENT': {
      return {
        ...state,
        files: state.files.map(f => {
          if (f.id !== action.payload.id) return f;
          const stats = updateFileStats(f, action.payload.content);
          return {
            ...f,
            content: action.payload.content,
            isDirty: action.payload.content !== f.originalContent,
            ...stats,
          };
        }),
      };
    }

    case 'RENAME_FILE': {
      const { id, name } = action.payload;
      const trimmed = name.trim();
      if (!trimmed) return state;
      const finalName = trimmed.includes('.') ? trimmed : `${trimmed}.md`;
      return {
        ...state,
        files: state.files.map(f => {
          if (f.id !== id) return f;
          const pathParts = f.path.split('/');
          pathParts[pathParts.length - 1] = finalName;
          return {
            ...f,
            name: finalName,
            path: pathParts.join('/'),
            language: getLanguageFromName(finalName),
          };
        }),
        folders: updateNodeFiles(state.folders, id, finalName),
      };
    }

    case 'MARK_SAVED':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.payload
            ? { ...f, isDirty: false, originalContent: f.content }
            : f
        ),
      };

    case 'UPDATE_HANDLE':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.payload.id ? { ...f, handle: action.payload.handle } : f
        ),
      };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'ADD_FOLDER': {
      const existing = state.folders.find(f => f.path === action.payload.path);
      if (existing) return state;
      // Also add all folder files to the files list
      const flatFiles = flattenFolderFiles(action.payload);
      const newFiles = [...state.files];
      for (const f of flatFiles) {
        if (!newFiles.find(existing => existing.path === f.path)) {
          newFiles.push(f);
        }
      }
      const firstNew = flatFiles.find(f => !state.files.find(e => e.path === f.path));
      return {
        ...state,
        folders: [...state.folders, action.payload],
        files: newFiles,
        activeFileId: firstNew?.id ?? state.activeFileId,
      };
    }

    case 'TOGGLE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f =>
          f.path === action.payload ? { ...f, isExpanded: !f.isExpanded } : f
        ),
      };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };

    case 'RESTORE_STATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

function flattenFolderFiles(folder: FolderNode): EditorFile[] {
  return [
    ...folder.files,
    ...folder.children.flatMap(c => flattenFolderFiles(c)),
  ];
}

const TEXT_FILE_RE = /\.(md|markdown|txt)$/i;
const ACCEPT_ATTR = '.md,.markdown,.txt,text/markdown,text/plain';

/**
 * Selector de archivos para navegadores sin File System Access API (Firefox, Safari...).
 * El <input> debe estar dentro del DOM: un input suelto puede ser recogido por el
 * recolector de basura antes de que se dispare 'change' y entonces el archivo elegido
 * nunca se carga.
 */
function pickFilesFallback(opts: { multiple?: boolean; directory?: boolean }): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    if (!opts.directory) input.accept = ACCEPT_ATTR;
    input.multiple = !!opts.multiple || !!opts.directory;
    if (opts.directory) (input as any).webkitdirectory = true;
    input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(input);
    let done = false;
    const finish = (files: File[]) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files || [])));
    input.addEventListener('cancel', () => finish([]));
    input.click();
  });
}

/** Descarga un texto como archivo (fallback de «Guardar» sin File System Access API). */
function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  // El enlace debe estar en el DOM para que Firefox lance la descarga
  document.body.appendChild(a);
  a.click();
  // No revocar la URL enseguida: la descarga puede no haber empezado todavía
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 10000);
}

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  activeFile: EditorFile | null;
  openFile: () => Promise<void>;
  openFolder: () => Promise<void>;
  saveFile: (fileId?: string) => Promise<void>;
  saveFileAs: (fileId?: string) => Promise<void>;
  newFile: () => void;
  renameFile: (fileId: string, newName: string) => void;
  closeFile: (fileId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  hasUnsavedChanges: boolean;
  editedFilesCount: number;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const activeFile = state.files.find(f => f.id === state.activeFileId) ?? null;
  const hasUnsavedChanges = state.files.some(f => f.isDirty);
  const filesRef = useRef(state.files);
  filesRef.current = state.files;

  const [editedFilesCount, setEditedFilesCount] = useState(0);

  // Fetch initial global edited files count
  useEffect(() => {
    fetch('/api/counter')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setEditedFilesCount(data.count);
        }
      })
      .catch(err => console.error('Error fetching counter:', err));
  }, []);

  const incrementGlobalCounter = useCallback(() => {
    fetch('/api/counter', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setEditedFilesCount(data.count);
        }
      })
      .catch(err => console.error('Error incrementing counter:', err));
  }, []);

  // ── LocalStorage cache ──────────────────────────────────
  const isRestoring = useRef(false);

  // Restore light session state (view mode, sidebar, last content without handles)
  useEffect(() => {
    if (isRestoring.current) return;
    isRestoring.current = true;
    try {
      const raw = localStorage.getItem('editormd_session');
      if (raw) {
        const saved = JSON.parse(raw) as {
          viewMode?: ViewMode;
          sidebarOpen?: boolean;
          files?: Array<{ name: string; path: string; content: string }>;
          activeFilePath?: string;
        };
        const restoredFiles: EditorFile[] = (saved.files || []).map(f =>
          createFile(f.name, f.content, f.path)
        );
        const activeId = restoredFiles.find(f => f.path === saved.activeFilePath)?.id ?? restoredFiles[0]?.id ?? null;
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            viewMode: saved.viewMode || 'split',
            sidebarOpen: saved.sidebarOpen ?? true,
            files: restoredFiles,
            activeFileId: activeId,
          },
        });
      }
    } catch {
      // Ignore corrupted session
    }
  }, []);

  // Save session state to localStorage (debounced)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        const sessionData = {
          viewMode: state.viewMode,
          sidebarOpen: state.sidebarOpen,
          files: state.files.map(f => ({
            name: f.name,
            path: f.path,
            content: f.content,
          })),
          activeFilePath: activeFile?.path ?? null,
        };
        localStorage.setItem('editormd_session', JSON.stringify(sessionData));
      } catch {
        // Ignore quota errors
      }
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state.files, state.viewMode, state.sidebarOpen, activeFile]);

  // ── File System Access API ──────────────────────────────

  const openFile = useCallback(async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Markdown & Text files',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.txt'],
              },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        const content = await file.text();

        // ¿Es exactamente el mismo archivo de disco que ya está abierto? (no basta el nombre:
        // dos archivos de carpetas distintas pueden llamarse igual)
        let existing: EditorFile | undefined;
        for (const f of filesRef.current) {
          if (!f.handle) continue;
          try {
            if (await (f.handle as any).isSameEntry(handle)) {
              existing = f;
              break;
            }
          } catch {
            // ignorar
          }
        }
        if (existing) {
          if (existing.isDirty) {
            // No pisar cambios sin guardar: solo activarlo
            dispatch({ type: 'SET_ACTIVE', payload: existing.id });
          } else {
            dispatch({ type: 'RELOAD_FILE', payload: { id: existing.id, content, handle } });
          }
        } else {
          dispatch({ type: 'ADD_FILE', payload: createFile(handle.name, content, handle.name, handle) });
        }
      } else {
        const picked = await pickFilesFallback({ multiple: true });
        for (const file of picked) {
          const content = await file.text();
          dispatch({ type: 'ADD_FILE', payload: createFile(file.name, content, file.name) });
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error opening file:', err);
        window.alert('No se pudo abrir el archivo: ' + (err?.message || err));
      }
    }
  }, []);

  const openFolder = useCallback(async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        const folderNode = await buildFolderTree(dirHandle, dirHandle.name);
        dispatch({ type: 'ADD_FOLDER', payload: folderNode });
      } else {
        const picked = (await pickFilesFallback({ directory: true })).filter(f => TEXT_FILE_RE.test(f.name));
        if (picked.length === 0) return;
        const editorFiles: EditorFile[] = await Promise.all(
          picked.map(async f => {
            const content = await f.text();
            return createFile(f.name, content, f.webkitRelativePath || f.name);
          })
        );
        const folderName = editorFiles[0]?.path.split('/')[0] || 'Carpeta';
        const folderNode: FolderNode = {
          name: folderName,
          path: folderName,
          files: editorFiles,
          children: [],
          isExpanded: true,
        };
        dispatch({ type: 'ADD_FOLDER', payload: folderNode });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error opening folder:', err);
        window.alert('No se pudo abrir la carpeta: ' + (err?.message || err));
      }
    }
  }, []);

  const saveFileAs = useCallback(async (fileId?: string) => {
    const file = state.files.find(f => f.id === (fileId ?? state.activeFileId));
    if (!file) return;

    const fileName = TEXT_FILE_RE.test(file.name) ? file.name : `${file.name}.md`;
    const download = () => {
      downloadTextFile(fileName, file.content);
      dispatch({ type: 'MARK_SAVED', payload: file.id });
      incrementGlobalCounter();
    };

    if (!('showSaveFilePicker' in window)) {
      download();
      return;
    }
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Archivo Markdown (*.md)',
            accept: { 'text/markdown': ['.md'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(file.content);
      await writable.close();
      dispatch({ type: 'UPDATE_HANDLE', payload: { id: file.id, handle } });
      dispatch({ type: 'MARK_SAVED', payload: file.id });
      incrementGlobalCounter();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error saving file as:', err);
      // El selector falló (permisos, iframe, política del navegador...): descargar como alternativa
      try {
        download();
      } catch (e: any) {
        window.alert('No se pudo guardar el archivo: ' + (e?.message || e));
      }
    }
  }, [state.files, state.activeFileId, incrementGlobalCounter]);

  const saveFile = useCallback(async (fileId?: string) => {
    const file = state.files.find(f => f.id === (fileId ?? state.activeFileId));
    if (!file) return;

    if (!file.handle) {
      // Sin archivo en disco asociado → guardar como
      await saveFileAs(file.id);
      return;
    }
    try {
      const h = file.handle as any;
      if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await h.requestPermission?.({ mode: 'readwrite' })) !== 'granted') {
          throw new DOMException('Permiso de escritura denegado', 'NotAllowedError');
        }
      }
      const writable = await h.createWritable();
      await writable.write(file.content);
      await writable.close();
      dispatch({ type: 'MARK_SAVED', payload: file.id });
      incrementGlobalCounter();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error saving file:', err);
      // El archivo ya no es accesible: pedir ubicación nueva
      await saveFileAs(file.id);
    }
  }, [state.files, state.activeFileId, saveFileAs, incrementGlobalCounter]);

  const newFile = useCallback(() => {
    const file = createNewFile(state.files);
    dispatch({ type: 'ADD_FILE', payload: file });
  }, [state.files]);

  const renameFile = useCallback((fileId: string, newName: string) => {
    dispatch({ type: 'RENAME_FILE', payload: { id: fileId, name: newName } });
  }, []);

  const closeFile = useCallback((fileId: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: fileId });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  return (
    <EditorContext.Provider
      value={{
        state,
        dispatch,
        activeFile,
        openFile,
        openFolder,
        saveFile,
        saveFileAs,
        newFile,
        renameFile,
        closeFile,
        setViewMode,
        hasUnsavedChanges,
        editedFilesCount,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

// ──────────────────────────────────────────────────────────
// Folder tree builder
// ──────────────────────────────────────────────────────────

async function buildFolderTree(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string
): Promise<FolderNode> {
  const files: EditorFile[] = [];
  const children: FolderNode[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (handle.kind === 'file') {
      if (!name.match(/\.(md|markdown|txt)$/i)) continue;
      const file = await handle.getFile();
      const content = await file.text();
      const path = `${basePath}/${name}`;
      files.push(createFile(name, content, path, handle));
    } else if (handle.kind === 'directory') {
      const childPath = `${basePath}/${name}`;
      const child = await buildFolderTree(handle, childPath);
      if (child.files.length > 0 || child.children.length > 0) {
        children.push(child);
      }
    }
  }

  // Sort files alphabetically
  files.sort((a, b) => a.name.localeCompare(b.name));
  children.sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: dirHandle.name,
    path: basePath,
    files,
    children,
    handle: dirHandle,
    isExpanded: true,
  };
}
