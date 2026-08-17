import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ScaleProvider } from '@/context/ScaleContext';
import { EditorProvider } from '@/context/EditorContext';
import { AppShell } from './AppShell';

export default function EditorEntry() {
  return (
    <ThemeProvider>
      <ScaleProvider>
        <EditorProvider>
          <AppShell />
        </EditorProvider>
      </ScaleProvider>
    </ThemeProvider>
  );
}
