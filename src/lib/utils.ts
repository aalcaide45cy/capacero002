import { EditorFile } from './types';

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function getLanguageFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    md: 'markdown',
    markdown: 'markdown',
    txt: 'text',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
  };
  return map[ext || ''] || 'markdown';
}

export function createFile(
  name: string,
  content: string,
  path: string = name,
  handle?: FileSystemFileHandle
): EditorFile {
  const words = countWords(content);
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    path,
    content,
    originalContent: content,
    handle,
    isDirty: false,
    language: getLanguageFromName(name),
    createdAt: Date.now(),
    wordCount: words,
    charCount: content.length,
    lineCount: content.split('\n').length,
  };
}

export function createNewFile(existingFiles?: EditorFile[]): EditorFile {
  // Find next available "Sin título N.md" name
  let n = 1;
  if (existingFiles && existingFiles.length > 0) {
    const untitledNames = new Set(existingFiles.map(f => f.name));
    while (untitledNames.has(n === 1 ? 'Sin título.md' : `Sin título ${n}.md`)) {
      n++;
    }
  }
  const name = n === 1 ? 'Sin título.md' : `Sin título ${n}.md`;
  return createFile(name, '', name);
}

export function updateFileStats(file: EditorFile, newContent: string): Partial<EditorFile> {
  return {
    wordCount: countWords(newContent),
    charCount: newContent.length,
    lineCount: newContent.split('\n').length,
  };
}
