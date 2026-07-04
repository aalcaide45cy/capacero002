'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { EditorState, EditorAction, EditorFile, ViewMode, FolderNode } from '@/lib/types';
import { createFile, createNewFile, updateFileStats } from '@/lib/utils';

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

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_FILE': {
      // Only deduplicate files that have a real disk handle (opened from filesystem)
      // New in-memory files can be created freely (no handle = no path dedup)
      if (action.payload.handle) {
        const existing = state.files.find(f => f.path === action.payload.path);
        if (existing) {
          return { ...state, activeFileId: existing.id };
        }
      }
      return {
        ...state,
        files: [...state.files, action.payload],
        activeFileId: action.payload.id,
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
  closeFile: (fileId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  hasUnsavedChanges: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const activeFile = state.files.find(f => f.id === state.activeFileId) ?? null;
  const hasUnsavedChanges = state.files.some(f => f.isDirty);

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
        const newFile = createFile(handle.name, content, handle.name, handle);
        dispatch({ type: 'ADD_FILE', payload: newFile });
      } else {
        // Fallback: input[type=file]
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.markdown,.txt';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const content = await file.text();
          const newFile = createFile(file.name, content, file.name);
          dispatch({ type: 'ADD_FILE', payload: newFile });
        };
        input.click();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Error opening file:', err);
    }
  }, []);

  const openFolder = useCallback(async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        const folderNode = await buildFolderTree(dirHandle, dirHandle.name);
        dispatch({ type: 'ADD_FOLDER', payload: folderNode });
      } else {
        // Fallback: input with webkitdirectory
        const input = document.createElement('input');
        input.type = 'file';
        (input as any).webkitdirectory = true;
        input.multiple = true;
        input.onchange = async () => {
          const files = Array.from(input.files || []).filter(f =>
            f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
          );
          const editorFiles: EditorFile[] = await Promise.all(
            files.map(async f => {
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
        };
        input.click();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Error opening folder:', err);
    }
  }, []);

  const saveFile = useCallback(async (fileId?: string) => {
    const file = state.files.find(f => f.id === (fileId ?? state.activeFileId));
    if (!file) return;

    try {
      if (file.handle) {
        // Write directly back
        const writable = await (file.handle as any).createWritable();
        await writable.write(file.content);
        await writable.close();
        dispatch({ type: 'MARK_SAVED', payload: file.id });
      } else {
        // No handle → save as
        await saveFileAs(file.id);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Error saving file:', err);
    }
  }, [state.files, state.activeFileId]);

  const saveFileAs = useCallback(async (fileId?: string) => {
    const file = state.files.find(f => f.id === (fileId ?? state.activeFileId));
    if (!file) return;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: file.name,
          types: [
            {
              description: 'Markdown file',
              accept: { 'text/markdown': ['.md'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(file.content);
        await writable.close();
        dispatch({ type: 'UPDATE_HANDLE', payload: { id: file.id, handle } });
        dispatch({ type: 'MARK_SAVED', payload: file.id });
      } else {
        // Fallback: download
        const blob = new Blob([file.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        dispatch({ type: 'MARK_SAVED', payload: file.id });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Error saving file as:', err);
    }
  }, [state.files, state.activeFileId]);

  const newFile = useCallback(() => {
    const file = createNewFile(state.files);
    dispatch({ type: 'ADD_FILE', payload: file });
  }, [state.files]);

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
        closeFile,
        setViewMode,
        hasUnsavedChanges,
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
