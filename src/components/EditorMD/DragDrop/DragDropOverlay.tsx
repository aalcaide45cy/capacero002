'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useEditor } from '@/context/EditorContext';
import { createFile } from '@/lib/utils';

export function DragDropOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const { dispatch } = useEditor();

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if ((e.target as Element) === document.body || !(e.currentTarget as Element).contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    const mdFiles = files.filter(f =>
      f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
    );
    for (const file of mdFiles) {
      const content = await file.text();
      const newFile = createFile(file.name, content, file.name);
      dispatch({ type: 'ADD_FILE', payload: newFile });
    }
  }, [dispatch]);

  useEffect(() => {
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  if (!isDragging) return null;

  return (
    <div className="drop-overlay" aria-live="assertive" role="status">
      <Upload className="drop-overlay-icon" />
      <span className="drop-overlay-text">Suelta los archivos .md aquí</span>
    </div>
  );
}
