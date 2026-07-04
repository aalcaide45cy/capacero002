'use client';

import { useEffect } from 'react';
import { useEditor } from '@/context/EditorContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TopBar } from './TopBar/TopBar';
import { Sidebar } from './Sidebar/Sidebar';
import { EditorArea } from './Editor/EditorArea';
import { StatusBar } from './StatusBar/StatusBar';
import { LocalStorageNotice } from './LocalStorageNotice/LocalStorageNotice';
import { DragDropOverlay } from './DragDrop/DragDropOverlay';
import './editor-globals.css';

export function AppShell() {
  useKeyboardShortcuts();
  const { hasUnsavedChanges } = useEditor();

  // Warn before leaving with unsaved changes & toggle body class for styling
  useEffect(() => {
    document.documentElement.classList.add('editormd-active');
    document.body.classList.add('editormd-active');

    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      document.documentElement.classList.remove('editormd-active');
      document.body.classList.remove('editormd-active');
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="app-root">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <EditorArea />
      </div>
      <StatusBar />
      <LocalStorageNotice />
      <DragDropOverlay />
    </div>
  );
}
