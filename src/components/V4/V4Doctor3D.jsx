import React, { useState } from 'react';
import { Stethoscope, CheckCircle, Play, ArrowRight, Youtube } from 'lucide-react';
import { trackDoctorSelect } from '../../utils/analytics';

const COMMON_PROBLEMS = [
  {
    id: 'primera-capa',
    icon: '🥞',
    title: 'Primera Capa y Adherencia (Warping)',
    subtitle: 'La pieza se despega de la cama o las esquinas se levantan.',
    diagnosis: [
      'Limpia a fondo la lámina PEI con agua tibia y lavavajillas neutro (la grasa de los dedos arruina la adherencia).',
      'Sube 5°C la temperatura de la cama solo para la primera capa.',
      'Reduce la velocidad de la primera capa a 20-30 mm/s y usa un grosor de 0.24 o 0.28 mm para compensar desniveles.'
    ],
    keywordSearch: 'primera capa'
  },
  {
    id: 'stringing',
    icon: '🕸️',
    title: 'Hilos y Stringing (Pelos entre viajes)',
    subtitle: 'Aparecen telarañas finas o pelos de plástico entre desplazamientos.',
    diagnosis: [
      'Seca el filamento (el PETG y TPU absorben humedad del aire en pocas horas).',
      'Baja la temperatura de boquilla en incrementos de 5°C.',
      'En Bambu Studio, activa "Retracción en espiral" o Z-Hop para evitar arrastrar residuos fundidos.'
    ],
    keywordSearch: 'stringing'
  },
  {
    id: 'costura',
    icon: '🧵',
    title: 'Costura Visible (Z-Seam)',
    subtitle: 'Una cicatriz o granitos visibles en la superficie del modelo.',
    diagnosis: [
      'Ajusta la posición de la costura a "Trasera" o "En esquinas agudas" para ocultarla.',
      'Ajusta el parámetro de "Scarf Seam" (costura en bisel) si tu versión de slicer lo soporta.',
      'Calibra el avance de presión (Pressure Advance / K factor) para evitar sobreextrusión al final del perímetro.'
    ],
    keywordSearch: 'costura'
  },
  {
    id: 'soportes',
    icon: '🌲',
    title: 'Soportes Pegados y Difíciles de Quitar',
    subtitle: 'Los soportes se fusionan con la pieza o dejan un acabado desastroso.',
    diagnosis: [
      'Usa soportes de tipo Árbol (Tree Slim / Árbol Delgado) en lugar de lineales.',
      'Aumenta la "Distancia Z superior" a exactamente la misma altura de tu capa (0.2 mm para capas de 0.2 mm).',
      'Configura 3 capas de interfaz densas para que creen una película de apoyo fácil de despegar.'
    ],
    keywordSearch: 'soportes'
  },
  {
    id: 'tiempos',
    icon: '⚡',
    title: 'Tiempos de Impresión Eternos',
    subtitle: 'El laminador marca muchas horas para modelos medianos.',
    diagnosis: [
      'Reduce el número de paredes interiores a 2 y usa relleno tipo "Gyroid" o "Adaptive Cubic" al 10-15%.',
      'Aumenta las aceleraciones y velocidad en perímetros internos y rellenos manteniendo las paredes exteriores lentas.',
      'Agrupa piezas por color para evitar purgas innecesarias del sistema multicolor.'
    ],
    keywordSearch: 'ahorrar'
  }
];

export default function V4Doctor3D({ videos, onSelectVideo, onSearchWithQuery }) {
  const [selectedProblem, setSelectedProblem] = useState(COMMON_PROBLEMS[0]);

  // Find matching video in loaded videos
  const matchingVideo = (videos || []).find((v) => {
    const q = selectedProblem.keywordSearch.toLowerCase();
    return (
      v?.title?.toLowerCase().includes(q) ||
      v?.description?.toLowerCase().includes(q) ||
      v?.category?.toLowerCase().includes(q) ||
      v?.consejoClave?.toLowerCase().includes(q)
    );
  });

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-900"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}
    >
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3 shadow-[0_0_12px_rgba(37,117,196,0.25)]">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
          <span>Diagnóstico Express de Impresión</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          🩺 Doctor 3D: Soluciona los Fallos de tu Máquina
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 mt-2">
          Selecciona el síntoma de tu impresión para ver las 3 causas directas y el tutorial de YouTube donde lo resolvemos paso a paso.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Problem List */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {COMMON_PROBLEMS.map((prob) => {
            const isSelected = selectedProblem.id === prob.id;
            return (
              <button
                key={prob.id}
                onClick={() => {
                  setSelectedProblem(prob);
                  trackDoctorSelect(prob, false);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between gap-3 border ${
                  isSelected
                    ? 'bg-zinc-900 border-cyan-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-cyan-500/40'
                    : 'bg-zinc-950/80 hover:bg-zinc-900/60 border-zinc-800/80 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{prob.icon}</span>
                  <div>
                    <span className={`text-sm font-bold leading-snug block ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                      {prob.title}
                    </span>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                      {prob.subtitle}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : 'text-zinc-500'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Column: Diagnosis & Video Solution */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col text-left">
          
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
            <span className="text-3xl">{selectedProblem.icon}</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                {selectedProblem.title}
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                {selectedProblem.subtitle}
              </p>
            </div>
          </div>

          {/* 3 Step Quick Prescription */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>3 Pasos Clave para Solucionarlo</span>
            </h4>
            <div className="space-y-2.5">
              {selectedProblem.diagnosis.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Video Solution */}
          <div className="mt-auto pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {matchingVideo ? (
              <>
                <div className="text-xs text-zinc-300 text-center sm:text-left">
                  <span className="text-zinc-400 block">Tutorial recomendado en el canal:</span>
                  <strong className="text-white line-clamp-1">{matchingVideo.title}</strong>
                </div>
                <button
                  onClick={() => {
                    trackDoctorSelect(selectedProblem, true);
                    onSelectVideo(matchingVideo);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all shrink-0 border border-cyan-300/40"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Ver Solución en Vídeo</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onSearchWithQuery(selectedProblem.keywordSearch)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                <Youtube className="w-4 h-4 text-cyan-400" />
                <span>Buscar vídeos sobre "{selectedProblem.keywordSearch}"</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
