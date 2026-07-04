'use client';

import { useState } from 'react';
import {
  FilePlus,
  FolderOpen,
  File,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpenIcon,
  Search,
  X,
  FileText,
} from 'lucide-react';
import { useEditor } from '@/context/EditorContext';
import { EditorFile, FolderNode } from '@/lib/types';

export function Sidebar() {
  const { state, dispatch, activeFile, openFile, openFolder, newFile, closeFile } = useEditor();
  const { sidebarOpen, files, folders, searchQuery } = state;

  const filteredFiles = searchQuery
    ? files.filter(
        f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  // Files not belonging to any folder
  const standaloneFiles = filteredFiles.filter(
    f => !folders.some(folder => folderContainsFile(folder, f.path))
  );

  return (
    <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`} aria-label="Panel de archivos">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-header-title">Archivos</span>
        <button
          className="sidebar-action-btn"
          onClick={newFile}
          title="Nuevo documento (Ctrl+N)"
          id="sidebar-btn-new"
        >
          <FilePlus />
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="sidebar-search-wrapper">
          <Search className="sidebar-search-icon" />
          <input
            className="sidebar-search-input"
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            id="sidebar-search"
            aria-label="Buscar en archivos"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="sidebar-quick-actions">
        <button
          className="sidebar-quick-btn"
          onClick={openFile}
          id="sidebar-btn-open-file"
          title="Abrir archivo .md (Ctrl+O)"
        >
          <File />
          Archivo
        </button>
        <button
          className="sidebar-quick-btn"
          onClick={openFolder}
          id="sidebar-btn-open-folder"
          title="Abrir carpeta completa (Ctrl+Shift+O)"
        >
          <FolderOpen />
          Carpeta
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {files.length === 0 ? (
          <div className="sidebar-empty">
            <FileText className="sidebar-empty-icon" />
            <p className="sidebar-empty-text">
              Abre un archivo o una carpeta para empezar a editar
            </p>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.map(folder => (
              <FolderTree
                key={folder.path}
                folder={folder}
                activeFile={activeFile}
                searchQuery={searchQuery}
                onSelect={id => dispatch({ type: 'SET_ACTIVE', payload: id })}
                onClose={closeFile}
                onToggle={path => dispatch({ type: 'TOGGLE_FOLDER', payload: path })}
              />
            ))}

            {/* Standalone files */}
            {standaloneFiles.length > 0 && (
              <>
                {folders.length > 0 && (
                  <div className="sidebar-section-label">Individuales</div>
                )}
                {standaloneFiles.map(file => (
                  <FileItem
                    key={file.id}
                    file={file}
                    isActive={activeFile?.id === file.id}
                    onSelect={() => dispatch({ type: 'SET_ACTIVE', payload: file.id })}
                    onClose={() => closeFile(file.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────
// Folder Tree Component
// ──────────────────────────────────────────────────────────

function FolderTree({
  folder,
  activeFile,
  searchQuery,
  onSelect,
  onClose,
  onToggle,
  depth = 0,
}: {
  folder: FolderNode;
  activeFile: EditorFile | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onToggle: (path: string) => void;
  depth?: number;
}) {
  const filteredFiles = searchQuery
    ? folder.files.filter(
        f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folder.files;

  return (
    <div style={{ paddingLeft: depth * 8 }}>
      <button
        className="folder-item"
        onClick={() => onToggle(folder.path)}
        id={`folder-${folder.path.replace(/\//g, '-')}`}
        aria-expanded={folder.isExpanded}
      >
        {folder.isExpanded ? (
          <ChevronDown />
        ) : (
          <ChevronRight />
        )}
        {folder.isExpanded ? (
          <FolderOpenIcon style={{ color: 'var(--yellow)', width: 14, height: 14 }} />
        ) : (
          <Folder style={{ color: 'var(--yellow)', width: 14, height: 14 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder.name}
        </span>
      </button>

      {folder.isExpanded && (
        <div className="folder-children">
          {filteredFiles.map(file => (
            <FileItem
              key={file.id}
              file={file}
              isActive={activeFile?.id === file.id}
              onSelect={() => onSelect(file.id)}
              onClose={() => onClose(file.id)}
            />
          ))}
          {folder.children.map(child => (
            <FolderTree
              key={child.path}
              folder={child}
              activeFile={activeFile}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onClose={onClose}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
          {filteredFiles.length === 0 && folder.children.length === 0 && (
            <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--overlay0)' }}>
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// File Item Component
// ──────────────────────────────────────────────────────────

function FileItem({
  file,
  isActive,
  onSelect,
  onClose,
}: {
  file: EditorFile;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`file-item${isActive ? ' active' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      id={`file-item-${file.id}`}
      aria-selected={isActive}
      aria-label={`${file.name}${file.isDirty ? ' (modificado)' : ''}`}
    >
      <FileText className="file-item-icon" />
      <div className="file-item-info">
        <div className="file-item-name">{file.name}</div>
        {file.path !== file.name && (
          <div className="file-item-path">{file.path}</div>
        )}
      </div>
      {file.isDirty && <div className="file-item-badge" title="Modificado sin guardar" />}
      <button
        className="file-item-close"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        title="Cerrar"
        aria-label={`Cerrar ${file.name}`}
        id={`btn-close-${file.id}`}
      >
        <X />
      </button>
    </div>
  );
}

function folderContainsFile(folder: FolderNode, filePath: string): boolean {
  if (folder.files.some(f => f.path === filePath)) return true;
  return folder.children.some(c => folderContainsFile(c, filePath));
}
