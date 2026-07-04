'use client';

import { useState } from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Code2,
  Link,
  Image,
  Table,
  Quote,
  Minus,
  Smile,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
} from 'lucide-react';

type InsertAction = {
  icon: React.ReactNode;
  title: string;
  id: string;
  insert: (sel: string) => { before: string; after: string; placeholder: string };
};

const COMMON_EMOJIS = ['😊', '😂', '👍', '🔥', '💡', '🚀', '📝', '✨', '⭐', '❤️', '🎉', '💻', '🤔', '⚠️', '✅', '❌'];
const FONT_COLORS = [
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Naranja', value: '#f97316' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Morado', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Gris', value: '#6b7280' },
];
const FONT_FAMILIES = [
  { name: 'Sans', value: 'sans-serif' },
  { name: 'Serif', value: 'serif' },
  { name: 'Mono', value: 'monospace' },
  { name: 'Cursive', value: 'cursive' },
  { name: 'Fantasy', value: 'fantasy' },
];

const TOOLBAR_ACTIONS: (InsertAction | 'sep')[] = [
  {
    icon: <Bold />, title: 'Negrita (Ctrl+B)', id: 'tb-bold',
    insert: () => ({ before: '**', after: '**', placeholder: 'texto en negrita' }),
  },
  {
    icon: <Italic />, title: 'Cursiva (Ctrl+I)', id: 'tb-italic',
    insert: () => ({ before: '_', after: '_', placeholder: 'texto en cursiva' }),
  },
  {
    icon: <Strikethrough />, title: 'Tachado', id: 'tb-strike',
    insert: () => ({ before: '~~', after: '~~', placeholder: 'texto tachado' }),
  },
  'sep',
  {
    icon: <Heading1 />, title: 'Encabezado 1', id: 'tb-h1',
    insert: () => ({ before: '# ', after: '', placeholder: 'Encabezado 1' }),
  },
  {
    icon: <Heading2 />, title: 'Encabezado 2', id: 'tb-h2',
    insert: () => ({ before: '## ', after: '', placeholder: 'Encabezado 2' }),
  },
  {
    icon: <Heading3 />, title: 'Encabezado 3', id: 'tb-h3',
    insert: () => ({ before: '### ', after: '', placeholder: 'Encabezado 3' }),
  },
  'sep',
  {
    icon: <List />, title: 'Lista sin orden', id: 'tb-ul',
    insert: () => ({ before: '- ', after: '', placeholder: 'elemento de lista' }),
  },
  {
    icon: <ListOrdered />, title: 'Lista ordenada', id: 'tb-ol',
    insert: () => ({ before: '1. ', after: '', placeholder: 'elemento de lista' }),
  },
  {
    icon: <ListChecks />, title: 'Lista de tareas', id: 'tb-task',
    insert: () => ({ before: '- [ ] ', after: '', placeholder: 'tarea' }),
  },
  'sep',
  {
    icon: <Code />, title: 'Código inline (Ctrl+`)', id: 'tb-code-inline',
    insert: () => ({ before: '`', after: '`', placeholder: 'código' }),
  },
  {
    icon: <Code2 />, title: 'Bloque de código', id: 'tb-code-block',
    insert: () => ({ before: '```\n', after: '\n```', placeholder: 'código aquí' }),
  },
  'sep',
  {
    icon: <Quote />, title: 'Cita', id: 'tb-quote',
    insert: () => ({ before: '> ', after: '', placeholder: 'cita' }),
  },
  {
    icon: <Link />, title: 'Enlace', id: 'tb-link',
    insert: (sel) => ({ before: '[', after: '](url)', placeholder: sel || 'texto del enlace' }),
  },
  {
    icon: <Image />, title: 'Imagen', id: 'tb-image',
    insert: () => ({ before: '![', after: '](url)', placeholder: 'descripción de imagen' }),
  },
  {
    icon: <Table />, title: 'Tabla', id: 'tb-table',
    insert: () => ({
      before: '| Col 1 | Col 2 | Col 3 |\n| --- | --- | --- |\n| ',
      after: ' | valor | valor |',
      placeholder: 'valor',
    }),
  },
  {
    icon: <Minus />, title: 'Separador horizontal', id: 'tb-hr',
    insert: () => ({ before: '\n---\n', after: '', placeholder: '' }),
  },
];

interface EditorToolbarProps {
  onInsert: (before: string, after: string, placeholder: string) => void;
}

export function EditorToolbar({ onInsert }: EditorToolbarProps) {
  const { activeFile } = useEditor();
  const [activeDropdown, setActiveDropdown] = useState<'emoji' | 'align' | 'color' | 'font' | null>(null);

  const toggleDropdown = (dropdown: 'emoji' | 'align' | 'color' | 'font') => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeDropdown = () => setActiveDropdown(null);

  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    onInsert(`<div align="${alignment}">\n`, '\n</div>', 'Texto alineado');
    closeDropdown();
  };

  const handleColor = (color: string) => {
    onInsert(`<span style="color: ${color}">`, '</span>', 'texto coloreado');
    closeDropdown();
  };

  const handleFont = (font: string) => {
    onInsert(`<span style="font-family: ${font}">`, '</span>', 'texto formateado');
    closeDropdown();
  };

  const handleEmoji = (emoji: string) => {
    onInsert('', '', emoji);
    closeDropdown();
  };

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Herramientas de formato" style={{ position: 'relative' }}>
      {TOOLBAR_ACTIONS.map((action, i) => {
        if (action === 'sep') {
          return <div key={`sep-${i}`} className="toolbar-separator" role="separator" />;
        }
        return (
          <button
            key={action.id}
            id={action.id}
            className="toolbar-btn"
            title={action.title}
            onClick={() => {
              const { before, after, placeholder } = action.insert('');
              onInsert(before, after, placeholder);
            }}
            disabled={!activeFile}
            aria-label={action.title}
          >
            {action.icon}
          </button>
        );
      })}

      <div className="toolbar-separator" role="separator" />

      {/* Emoticonos Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className={`toolbar-btn${activeDropdown === 'emoji' ? ' active' : ''}`}
          title="Insertar emoticono"
          onClick={() => toggleDropdown('emoji')}
          disabled={!activeFile}
          id="tb-dropdown-emoji"
        >
          <Smile />
        </button>
        {activeDropdown === 'emoji' && (
          <div className="toolbar-dropdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 8, width: 140 }}>
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className="dropdown-item emoji-item"
                style={{ fontSize: 16, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                onClick={() => handleEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alineacion Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className={`toolbar-btn${activeDropdown === 'align' ? ' active' : ''}`}
          title="Alineación de texto"
          onClick={() => toggleDropdown('align')}
          disabled={!activeFile}
          id="tb-dropdown-align"
        >
          <AlignCenter />
        </button>
        {activeDropdown === 'align' && (
          <div className="toolbar-dropdown" style={{ width: 150 }}>
            <button className="dropdown-row-btn" onClick={() => handleAlignment('left')}>
              <AlignLeft style={{ width: 14, height: 14 }} /> Izquierda
            </button>
            <button className="dropdown-row-btn" onClick={() => handleAlignment('center')}>
              <AlignCenter style={{ width: 14, height: 14 }} /> Centro
            </button>
            <button className="dropdown-row-btn" onClick={() => handleAlignment('right')}>
              <AlignRight style={{ width: 14, height: 14 }} /> Derecha
            </button>
            <button className="dropdown-row-btn" onClick={() => handleAlignment('justify')}>
              <AlignJustify style={{ width: 14, height: 14 }} /> Justificado
            </button>
          </div>
        )}
      </div>

      {/* Color Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className={`toolbar-btn${activeDropdown === 'color' ? ' active' : ''}`}
          title="Color del texto"
          onClick={() => toggleDropdown('color')}
          disabled={!activeFile}
          id="tb-dropdown-color"
        >
          <Palette />
        </button>
        {activeDropdown === 'color' && (
          <div className="toolbar-dropdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 8, width: 140 }}>
            {FONT_COLORS.map(color => (
              <button
                key={color.value}
                className="color-dot-btn"
                style={{ backgroundColor: color.value, width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer' }}
                title={color.name}
                onClick={() => handleColor(color.value)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fuente Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className={`toolbar-btn${activeDropdown === 'font' ? ' active' : ''}`}
          title="Tipo de fuente"
          onClick={() => toggleDropdown('font')}
          disabled={!activeFile}
          id="tb-dropdown-font"
        >
          <Type />
        </button>
        {activeDropdown === 'font' && (
          <div className="toolbar-dropdown" style={{ width: 120 }}>
            {FONT_FAMILIES.map(font => (
              <button
                key={font.value}
                className="dropdown-row-btn"
                style={{ fontFamily: font.value }}
                onClick={() => handleFont(font.value)}
              >
                {font.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
