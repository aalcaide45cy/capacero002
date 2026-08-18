import React from 'react';

/**
 * V4CircuitBackground
 * Fondo decorativo futurista con líneas de placa de circuito (PCB), pistas a 45° y pulsos de energía cian.
 * Inspirado en la identidad visual y logo oficial de Capa Cero 3D.
 * 100% acelerado por hardware, ultra ligero y optimizado para no interferir en la lectura.
 */
export default function V4CircuitBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-40 md:opacity-55 transition-opacity duration-1000"
      aria-hidden="true"
    >
      {/* SVG de Circuitos Laterales Izquierdo y Derecho */}
      <svg 
        className="w-full h-full object-cover" 
        viewBox="0 0 1920 1080" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Filtro de Resplandor Neón Cian */}
          <filter id="circuit-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Filtro de Resplandor Intenso para Nodos */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradientes Lineales de Neón */}
          <linearGradient id="trace-grad-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#00B0FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2979FF" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="trace-grad-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#00B0FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2979FF" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="pulse-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ================= PISTAS DE CIRCUITO: LADO IZQUIERDO ================= */}
        <g opacity="0.85">
          {/* Pista 1: Superior Izquierda */}
          <path
            d="M -50 180 L 220 180 L 340 300 L 520 300 L 580 360 L 720 360"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Pulso animado Pista 1 */}
          <path
            d="M -50 180 L 220 180 L 340 300 L 520 300 L 580 360 L 720 360"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 2: Media Izquierda con derivación */}
          <path
            d="M -50 420 L 160 420 L 260 320 L 460 320 L 540 400 L 780 400"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 420 L 160 420 L 260 320 L 460 320 L 540 400 L 780 400"
            stroke="#00B0FF"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 3: Inferior Izquierda */}
          <path
            d="M -50 680 L 180 680 L 300 560 L 490 560 L 560 630 L 700 630"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 680 L 180 680 L 300 560 L 490 560 L 560 630 L 700 630"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pistas secundarias finas */}
          <path
            d="M 40 100 L 140 100 L 220 180 L 280 180"
            stroke="rgba(0, 229, 255, 0.2)"
            strokeWidth="1"
          />
          <path
            d="M 120 780 L 260 780 L 340 700 L 480 700"
            stroke="rgba(0, 229, 255, 0.2)"
            strokeWidth="1"
          />

          {/* Nodos de circuito (Conectores luminosos) */}
          <circle cx="220" cy="180" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="340" cy="300" r="2.5" fill="#00B0FF" />
          <circle cx="520" cy="300" r="2.5" fill="#00E5FF" />
          <circle cx="720" cy="360" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />
          
          <circle cx="160" cy="420" r="2.5" fill="#00E5FF" />
          <circle cx="460" cy="320" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="780" cy="400" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="180" cy="680" r="2.5" fill="#00E5FF" />
          <circle cx="300" cy="560" r="3" fill="#00B0FF" />
          <circle cx="700" cy="630" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />
        </g>

        {/* ================= PISTAS DE CIRCUITO: LADO DERECHO ================= */}
        <g opacity="0.85">
          {/* Pista 1: Superior Derecha */}
          <path
            d="M 1970 180 L 1700 180 L 1580 300 L 1400 300 L 1340 360 L 1200 360"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Pulso animado Pista 1 */}
          <path
            d="M 1970 180 L 1700 180 L 1580 300 L 1400 300 L 1340 360 L 1200 360"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 2: Media Derecha */}
          <path
            d="M 1970 420 L 1760 420 L 1660 320 L 1460 320 L 1380 400 L 1140 400"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 420 L 1760 420 L 1660 320 L 1460 320 L 1380 400 L 1140 400"
            stroke="#00B0FF"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 3: Inferior Derecha */}
          <path
            d="M 1970 680 L 1740 680 L 1620 560 L 1430 560 L 1360 630 L 1220 630"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 680 L 1740 680 L 1620 560 L 1430 560 L 1360 630 L 1220 630"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pistas secundarias finas */}
          <path
            d="M 1880 100 L 1780 100 L 1700 180 L 1640 180"
            stroke="rgba(0, 229, 255, 0.2)"
            strokeWidth="1"
          />
          <path
            d="M 1800 780 L 1660 780 L 1580 700 L 1440 700"
            stroke="rgba(0, 229, 255, 0.2)"
            strokeWidth="1"
          />

          {/* Nodos de circuito (Conectores luminosos) */}
          <circle cx="1700" cy="180" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="1580" cy="300" r="2.5" fill="#00B0FF" />
          <circle cx="1400" cy="300" r="2.5" fill="#00E5FF" />
          <circle cx="1200" cy="360" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1760" cy="420" r="2.5" fill="#00E5FF" />
          <circle cx="1460" cy="320" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="1140" cy="400" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1740" cy="680" r="2.5" fill="#00E5FF" />
          <circle cx="1620" cy="560" r="3" fill="#00B0FF" />
          <circle cx="1220" cy="630" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />
        </g>

        {/* Haces de luz horizontales súper sutiles */}
        <line 
          x1="0" y1="240" x2="600" y2="240" 
          stroke="url(#trace-grad-left)" 
          strokeWidth="0.8" 
          strokeDasharray="4 8"
        />
        <line 
          x1="1320" y1="240" x2="1920" y2="240" 
          stroke="url(#trace-grad-right)" 
          strokeWidth="0.8" 
          strokeDasharray="4 8"
        />
      </svg>

      {/* Degradado Radial Oscuro para que el centro permanezca limpio para el contenido */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_25%,_black_85%)]" 
        aria-hidden="true"
      />
    </div>
  );
}
