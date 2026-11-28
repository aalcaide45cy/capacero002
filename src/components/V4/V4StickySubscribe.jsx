import React, { useState, useEffect, useRef } from 'react';
import { YouTubeIcon } from './YouTubeIcon';
import { PatreonIcon } from './PatreonIcon';
import { MakerWorldIcon } from './MakerWorldIcon';
import { EnvelopeIcon } from './EnvelopeIcon';
import { trackSubscribe } from '../../utils/analytics';

// Poner a true para volver a mostrar los botones de Patreon
const SHOW_PATREON = false;

// Tiempo que se muestran grandes al aparecer, antes de encogerse a iconos
const EXPANDED_MS = 2000;

const patreonUrl = "https://www.patreon.com/Capacero3d";
const makerWorldUrl = "https://makerworld.com/@capa_cero";
const subscribeUrl = "https://www.youtube.com/@CapaCero0?sub_confirmation=1";

export default function V4StickySubscribe({ isSticky = false, onOpenCollaboration }) {
  // Grandes unos 2 s al aparecer (scroll) y luego se encogen a iconos.
  const [expanded, setExpanded] = useState(true);
  // Escritorio: icono concreto expandido por ratón / foco / toque.
  const [activeId, setActiveId] = useState(null);
  const timerRef = useRef(null);
  const prevStickyRef = useRef(false);
  const desktopRef = useRef(null);

  useEffect(() => {
    if (isSticky && !prevStickyRef.current) {
      setExpanded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setExpanded(false), EXPANDED_MS);
    } else if (!isSticky && prevStickyRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveId(null);
      // Tras el desvanecimiento, se reinicia a expandido en segundo plano invisible.
      timerRef.current = setTimeout(() => setExpanded(true), 700);
    }
    prevStickyRef.current = isSticky;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSticky]);

  // Táctil: tocar fuera encoge el icono expandido
  useEffect(() => {
    if (!activeId) return undefined;
    const onDown = (e) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target)) setActiveId(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [activeId]);

  // Orden (arriba -> abajo): Colaboraciones, YouTube, MakerWorld (y Patreon si se activa)
  const items = [
    {
      id: 'collab',
      title: 'Colaboraciones & Marcas',
      desc: '¿Tienes una marca o producto? Llega a miles de makers y apasionados de la impresión 3D.',
      cta: 'Contactar',
      label: 'COLABORACIONES',
      aria: 'Contactar para Colaboraciones',
      onClick: () => onOpenCollaboration && onOpenCollaboration(),
      icon: <EnvelopeIcon className="w-5 h-5 text-white drop-shadow" />,
      circle: 'bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 border-cyan-300/70 shadow-[0_0_18px_rgba(37,117,196,0.75)]',
      card: 'ring-cyan-500/40 shadow-blue-950/40',
      button: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border-cyan-300/40',
    },
    {
      id: 'youtube',
      title: 'Canal Oficial Capa Cero 3D',
      desc: 'Domina Bambu Studio y Fusion 360 con tutoriales claros, directos al grano y sin rodeos.',
      cta: 'Suscribirme',
      label: 'IR AL CANAL',
      aria: 'Ir al canal de YouTube',
      href: subscribeUrl,
      track: 'Botón Flotante YouTube',
      icon: <YouTubeIcon className="w-5 h-5 text-white drop-shadow" />,
      circle: 'bg-[#ff0000] border-red-300/80 shadow-[0_0_18px_rgba(255,0,0,0.6)]',
      card: 'ring-red-500/40 shadow-red-950/40',
      button: 'bg-[#ff0000] hover:bg-[#e60000] border-red-300/50',
    },
    {
      id: 'makerworld',
      title: 'MakerWorld Capa Cero 3D',
      desc: 'Descarga gratis mis diseños 3D oficiales, perfiles de impresión afinados y proyectos 3MF.',
      cta: 'Ver Diseños',
      label: 'MAKERWORLD',
      aria: 'Ir a MakerWorld',
      href: makerWorldUrl,
      icon: <MakerWorldIcon className="w-5 h-5 text-white fill-current drop-shadow" />,
      circle: 'bg-gradient-to-tr from-[#00c853] via-[#00ae42] to-[#008f37] border-emerald-300/70 shadow-[0_0_18px_rgba(0,174,66,0.65)]',
      card: 'ring-emerald-500/40 shadow-emerald-950/40',
      button: 'bg-gradient-to-r from-[#00c853] via-[#00ae42] to-[#008f37] hover:from-[#00df5d] hover:to-[#00a33e] border-emerald-300/50',
    },
  ];
  if (SHOW_PATREON) {
    items.push({
      id: 'patreon',
      title: 'Patreon & Licencia Comercial',
      desc: 'Descarga modelos 3D exclusivos y obtén tu licencia oficial para vender las impresiones.',
      cta: 'Unirme',
      label: 'IR A PATREON',
      aria: 'Ir a Patreon',
      href: patreonUrl,
      icon: <PatreonIcon className="w-5 h-5 text-white fill-current drop-shadow" />,
      circle: 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 border-amber-300/70 shadow-[0_0_18px_rgba(245,158,11,0.65)]',
      card: 'ring-amber-500/40 shadow-amber-950/40',
      button: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-amber-300/50',
    });
  }

  const isTouchOnly = () =>
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches;

  // Contenido interactivo común (enlace o botón)
  const renderAction = (item, className, children, extra = {}) =>
    item.href ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => item.track && trackSubscribe && trackSubscribe(item.track)}
        className={className}
        {...extra}
      >
        {children}
      </a>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          item.onClick && item.onClick();
        }}
        className={className}
        {...extra}
      >
        {children}
      </button>
    );

  return (
    <>
      {/* MÓVIL: pastillas con texto durante 2 s y luego círculos con icono */}
      <div
        className={`fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2.5 md:hidden transform transition-all duration-500 ease-out ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {items.map((item) => (
          <React.Fragment key={item.id}>
          {renderAction(
            item,
            `h-11 rounded-full text-white flex items-center border-2 active:scale-95 transition-all duration-500 ease-in-out overflow-hidden cursor-pointer shrink-0 ${item.circle}`,
            <>
              <div className="w-11 h-11 flex items-center justify-center shrink-0">{item.icon}</div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center transition-[max-width,padding] ease-in-out ${
                  expanded ? 'max-w-[160px] pr-3.5 duration-300' : 'max-w-0 pr-0 duration-300 delay-100'
                }`}
              >
                <span
                  className={`font-black text-[11px] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity ${
                    expanded ? 'opacity-100 duration-200 delay-150' : 'opacity-0 duration-100'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </>,
            { title: item.aria, 'aria-label': item.aria }
          )}
          </React.Fragment>
        ))}
      </div>

      {/* ESCRITORIO: tarjetas grandes 2 s y luego iconos; al pasar el ratón se expande solo ese */}
      <div
        ref={desktopRef}
        className={`hidden md:flex fixed bottom-5 right-6 z-40 flex-col items-end gap-2.5 transform transition-all duration-700 ease-out ${
          isSticky ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {items.map((item) => {
          const open = expanded || activeId === item.id;
          return (
            <div
              key={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              onMouseLeave={() => setActiveId((cur) => (cur === item.id ? null : cur))}
              onFocus={() => setActiveId(item.id)}
              onBlur={() => setActiveId((cur) => (cur === item.id ? null : cur))}
              className={`flex items-center overflow-hidden transition-all duration-500 ease-in-out ${
                open
                  ? `w-[410px] max-w-[calc(100vw-3rem)] h-[88px] px-3 rounded-2xl bg-zinc-950/95 backdrop-blur-md ring-1 shadow-2xl ${item.card}`
                  : 'w-11 h-11 px-0 rounded-full ring-0 shadow-none'
              }`}
            >
              {renderAction(
                item,
                `shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-white cursor-pointer transition-transform duration-200 ${item.circle} ${
                  open ? '' : 'hover:scale-110 active:scale-95'
                }`,
                item.icon,
                {
                  title: item.aria,
                  'aria-label': item.aria,
                  onClickCapture: (e) => {
                    // En pantallas táctiles el primer toque solo expande
                    if (!open && isTouchOnly()) {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveId(item.id);
                    }
                  },
                }
              )}
              <div
                className={`ml-3 w-[230px] shrink-0 text-left transition-opacity ${
                  open ? 'opacity-100 duration-300 delay-150' : 'opacity-0 duration-100'
                }`}
                aria-hidden={!open}
              >
                <h4 className="text-xs font-black text-white leading-tight">{item.title}</h4>
                <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">{item.desc}</p>
              </div>
              {renderAction(
                item,
                `ml-3 shrink-0 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-md border transition-all active:scale-95 whitespace-nowrap cursor-pointer ${item.button} ${
                  open ? 'opacity-100 duration-300 delay-150' : 'opacity-0 pointer-events-none duration-100'
                }`,
                item.cta,
                { tabIndex: open ? 0 : -1 }
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
