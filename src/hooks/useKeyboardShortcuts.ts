'use client';

import { useEffect } from 'react';
import { useEditor } from '@/context/EditorContext';

export function useKeyboardShortcuts() {
  const { openFile, openFolder, saveFile, saveFileAs, newFile, state, dispatch } = useEditor();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      switch (e.key.toLowerCase()) {
        case 'o':
          if (e.shiftKey) {
            e.preventDefault();
            openFolder();
          } else {
            e.preventDefault();
            openFile();
          }
          break;
        case 's':
          e.preventDefault();
          if (e.shiftKey) {
            saveFileAs();
          } else {
            saveFile();
          }
          break;
        case 'n':
          e.preventDefault();
          newFile();
          break;
        case '\\':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_SIDEBAR' });
          break;
        // View modes
        case '1':
          if (e.altKey) { e.preventDefault(); dispatch({ type: 'SET_VIEW_MODE', payload: 'editor' }); }
          break;
        case '2':
          if (e.altKey) { e.preventDefault(); dispatch({ type: 'SET_VIEW_MODE', payload: 'split' }); }
          break;
        case '3':
          if (e.altKey) { e.preventDefault(); dispatch({ type: 'SET_VIEW_MODE', payload: 'preview' }); }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFile, openFolder, saveFile, saveFileAs, newFile, dispatch]);
}
