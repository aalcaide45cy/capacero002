// Shared types for EditorMD

export interface EditorFile {
  id: string;
  name: string;
  path: string; // display path (relative if from folder)
  content: string;
  originalContent: string; // to detect unsaved changes
  handle?: FileSystemFileHandle; // for direct save-back
  isDirty: boolean;
  language: string;
  createdAt: number;
  wordCount: number;
  charCount: number;
  lineCount: number;
}

export interface FolderNode {
  name: string;
  path: string;
  files: EditorFile[];
  children: FolderNode[];
  handle?: FileSystemDirectoryHandle;
  isExpanded: boolean;
}

export type ViewMode = 'editor' | 'split' | 'preview';

export interface EditorState {
  files: EditorFile[];
  activeFileId: string | null;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  folders: FolderNode[];
  searchQuery: string;
}

export type EditorAction =
  | { type: 'ADD_FILE'; payload: EditorFile }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_ACTIVE'; payload: string }
  | { type: 'UPDATE_CONTENT'; payload: { id: string; content: string } }
  | { type: 'MARK_SAVED'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_FOLDER'; payload: FolderNode }
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'UPDATE_HANDLE'; payload: { id: string; handle: FileSystemFileHandle } }
  | { type: 'RESTORE_STATE'; payload: Partial<EditorState> };
