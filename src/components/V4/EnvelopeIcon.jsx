import React from 'react';

/**
 * Sobre de correo macizo: cuatro piezas rellenas (solapa, laterales y base)
 * separadas por huecos finos. Usa currentColor, así que se tiñe con text-white.
 */
export function EnvelopeIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Solapa superior */}
      <path d="M3.4 0.6h17.2c.5 0 .9.2 1.2.5L13.1 7.3c-.7.5-1.5.5-2.2 0L2.2 1.1c.3-.3.7-.5 1.2-.5z" />
      {/* Lateral izquierdo */}
      <path d="M0.8 2.7l8.1 5.8-8.1 6.2c-.2-.3-.3-.6-.3-1V3.7c0-.4.1-.7.3-1z" />
      {/* Lateral derecho */}
      <path d="M23.2 2.7c.2.3.3.6.3 1v10c0 .4-.1.7-.3 1l-8.1-6.2 8.1-5.8z" />
      {/* Base */}
      <path d="M10.2 9.7c1 .7 2.6.7 3.6 0l8.2 6.3c-.4.9-1.1 1.4-2.1 1.4H4.1c-1 0-1.7-.5-2.1-1.4l8.2-6.3z" />
    </svg>
  );
}
