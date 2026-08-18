import React from 'react';

/**
 * V4CircuitBackground
 * Fondo decorativo futurista de alta densidad con líneas de placa de circuito impreso (PCB),
 * pistas en ángulo de 45°, buses de datos paralelos, nodos iluminados y pulsos de energía cian.
 * Inspirado directamente en el logotipo oficial y la identidad de Capa Cero 3D.
 */
export default function V4CircuitBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-60 md:opacity-75 transition-opacity duration-1000"
      aria-hidden="true"
    >
      {/* SVG Vectorial con Múltiples Pistas de Circuito */}
      <svg 
        className="w-full h-full object-cover" 
        viewBox="0 0 1920 1080" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Filtro de Resplandor Neón Cian */}
          <filter id="circuit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Filtro de Resplandor Intenso para Nodos y Conectores */}
          <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradientes Lineales para Pistas */}
          <linearGradient id="trace-grad-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#00B0FF" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#2575C4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="trace-grad-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#00B0FF" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#2575C4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="trace-dim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#0091EA" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* ========================================================================= */}
        {/* LADO IZQUIERDO: CONJUNTO DE PISTAS PRINCIPALES Y SECUNDARIAS               */}
        {/* ========================================================================= */}
        <g opacity="0.9">
          
          {/* Pista 1: Superior Extrema */}
          <path
            d="M -50 80 L 180 80 L 260 160 L 440 160 L 500 220 L 680 220"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 80 L 180 80 L 260 160 L 440 160 L 500 220 L 680 220"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 2: Superior Paralela (Bus Dual) */}
          <path
            d="M -50 110 L 165 110 L 245 190 L 425 190 L 485 250 L 650 250"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Pista 3: Media Superior */}
          <path
            d="M -50 260 L 220 260 L 320 360 L 540 360 L 600 420 L 820 420"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M -50 260 L 220 260 L 320 360 L 540 360 L 600 420 L 820 420"
            stroke="#00E5FF"
            strokeWidth="2.8"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 4: Media Central */}
          <path
            d="M -50 480 L 190 480 L 310 360 L 450 360 L 520 430 L 760 430"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 480 L 190 480 L 310 360 L 450 360 L 520 430 L 760 430"
            stroke="#00B0FF"
            strokeWidth="2.2"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pista 5: Media Inferior */}
          <path
            d="M -50 620 L 240 620 L 340 520 L 520 520 L 590 590 L 790 590"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 620 L 240 620 L 340 520 L 520 520 L 590 590 L 790 590"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 6: Inferior (Bus Dual) */}
          <path
            d="M -50 780 L 200 780 L 320 660 L 480 660 L 550 730 L 720 730"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 810 L 185 810 L 305 690 L 465 690 L 535 760 L 690 760"
            stroke="url(#trace-grad-left)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M -50 780 L 200 780 L 320 660 L 480 660 L 550 730 L 720 730"
            stroke="#00B0FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 7: Inferior Extrema */}
          <path
            d="M -50 940 L 160 940 L 280 820 L 460 820 L 530 890 L 680 890"
            stroke="url(#trace-grad-left)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -50 940 L 160 940 L 280 820 L 460 820 L 530 890 L 680 890"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pistas Finas de Conexión Adicionales */}
          <path d="M 80 40 L 180 40 L 260 120 L 360 120" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 120 540 L 200 540 L 280 460 L 380 460" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 60 700 L 150 700 L 230 620 L 330 620" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 140 880 L 220 880 L 300 800 L 410 800" stroke="url(#trace-dim)" strokeWidth="1" />

          {/* Nodos Luminosos Izquierda */}
          <circle cx="260" cy="160" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="440" cy="160" r="2.5" fill="#00B0FF" />
          <circle cx="680" cy="220" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="220" cy="260" r="2.5" fill="#00E5FF" />
          <circle cx="540" cy="360" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="820" cy="420" r="4" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="190" cy="480" r="2.5" fill="#00E5FF" />
          <circle cx="450" cy="360" r="3" fill="#00B0FF" />
          <circle cx="760" cy="430" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="240" cy="620" r="2.5" fill="#00E5FF" />
          <circle cx="520" cy="520" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="790" cy="590" r="4" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="200" cy="780" r="2.5" fill="#00E5FF" />
          <circle cx="480" cy="660" r="3" fill="#00B0FF" />
          <circle cx="720" cy="730" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="280" cy="820" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="680" cy="890" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />
        </g>

        {/* ========================================================================= */}
        {/* LADO DERECHO: CONJUNTO DE PISTAS PRINCIPALES Y SECUNDARIAS                */}
        {/* ========================================================================= */}
        <g opacity="0.9">
          
          {/* Pista 1: Superior Extrema */}
          <path
            d="M 1970 80 L 1740 80 L 1660 160 L 1480 160 L 1420 220 L 1240 220"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 80 L 1740 80 L 1660 160 L 1480 160 L 1420 220 L 1240 220"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 2: Superior Paralela (Bus Dual) */}
          <path
            d="M 1970 110 L 1755 110 L 1675 190 L 1495 190 L 1435 250 L 1270 250"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Pista 3: Media Superior */}
          <path
            d="M 1970 260 L 1700 260 L 1600 360 L 1380 360 L 1320 420 L 1100 420"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 1970 260 L 1700 260 L 1600 360 L 1380 360 L 1320 420 L 1100 420"
            stroke="#00E5FF"
            strokeWidth="2.8"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 4: Media Central */}
          <path
            d="M 1970 480 L 1730 480 L 1610 360 L 1470 360 L 1400 430 L 1160 430"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 480 L 1730 480 L 1610 360 L 1470 360 L 1400 430 L 1160 430"
            stroke="#00B0FF"
            strokeWidth="2.2"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pista 5: Media Inferior */}
          <path
            d="M 1970 620 L 1680 620 L 1580 520 L 1400 520 L 1330 590 L 1130 590"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 620 L 1680 620 L 1580 520 L 1400 520 L 1330 590 L 1130 590"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-1"
          />

          {/* Pista 6: Inferior (Bus Dual) */}
          <path
            d="M 1970 780 L 1720 780 L 1600 660 L 1440 660 L 1370 730 L 1200 730"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 810 L 1735 810 L 1615 690 L 1455 690 L 1385 760 L 1230 760"
            stroke="url(#trace-grad-right)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M 1970 780 L 1720 780 L 1600 660 L 1440 660 L 1370 730 L 1200 730"
            stroke="#00B0FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-2"
          />

          {/* Pista 7: Inferior Extrema */}
          <path
            d="M 1970 940 L 1760 940 L 1640 820 L 1460 820 L 1390 890 L 1240 890"
            stroke="url(#trace-grad-right)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1970 940 L 1760 940 L 1640 820 L 1460 820 L 1390 890 L 1240 890"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#circuit-glow)"
            className="animate-circuit-pulse-3"
          />

          {/* Pistas Finas de Conexión Adicionales */}
          <path d="M 1840 40 L 1740 40 L 1660 120 L 1560 120" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 1800 540 L 1720 540 L 1640 460 L 1540 460" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 1860 700 L 1770 700 L 1690 620 L 1590 620" stroke="url(#trace-dim)" strokeWidth="1" />
          <path d="M 1780 880 L 1700 880 L 1620 800 L 1510 800" stroke="url(#trace-dim)" strokeWidth="1" />

          {/* Nodos Luminosos Derecha */}
          <circle cx="1660" cy="160" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="1480" cy="160" r="2.5" fill="#00B0FF" />
          <circle cx="1240" cy="220" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1700" cy="260" r="2.5" fill="#00E5FF" />
          <circle cx="1380" cy="360" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="1100" cy="420" r="4" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1730" cy="480" r="2.5" fill="#00E5FF" />
          <circle cx="1470" cy="360" r="3" fill="#00B0FF" />
          <circle cx="1160" cy="430" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1680" cy="620" r="2.5" fill="#00E5FF" />
          <circle cx="1400" cy="520" r="3" fill="#00B0FF" filter="url(#node-glow)" />
          <circle cx="1130" cy="590" r="4" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1720" cy="780" r="2.5" fill="#00E5FF" />
          <circle cx="1440" cy="660" r="3" fill="#00B0FF" />
          <circle cx="1200" cy="730" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />

          <circle cx="1640" cy="820" r="3" fill="#00E5FF" filter="url(#node-glow)" />
          <circle cx="1240" cy="890" r="3.5" fill="#00E5FF" filter="url(#node-glow)" className="animate-pulse" />
        </g>

        {/* Haces de luz horizontales súper sutiles */}
        <line x1="0" y1="200" x2="700" y2="200" stroke="url(#trace-dim)" strokeWidth="0.8" strokeDasharray="6 12" />
        <line x1="1220" y1="200" x2="1920" y2="200" stroke="url(#trace-dim)" strokeWidth="0.8" strokeDasharray="6 12" />
        <line x1="0" y1="560" x2="650" y2="560" stroke="url(#trace-dim)" strokeWidth="0.8" strokeDasharray="6 12" />
        <line x1="1270" y1="560" x2="1920" y2="560" stroke="url(#trace-dim)" strokeWidth="0.8" strokeDasharray="6 12" />
      </svg>

      {/* Viñeteado suave en el centro para máxima legibilidad */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_black_90%)]" 
        aria-hidden="true"
      />
    </div>
  );
}
