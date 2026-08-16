import React from 'react';
import { Download, ExternalLink, Play, Sparkles, FileText, CheckCircle } from 'lucide-react';
import { trackDownload } from '../../utils/analytics';

export default function V4Downloads({ videos, onSelectVideo }) {
  const downloadVideos = videos.filter((v) => v.hasDownloads);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-3">
          <Download className="w-3.5 h-3.5" />
          <span>Recursos Oficiales de Capa Cero</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          📥 Perfiles de Laminado y Archivos .3MF
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Descarga perfiles optimizados para Bambu Studio, modelos de calibración y presets listos para imprimir.
        </p>
      </div>

      {downloadVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {downloadVideos.map((video) => (
            <div
              key={video.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg text-left"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                    {video.category}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-semibold">
                    {video.downloads.length} {video.downloads.length === 1 ? 'Recurso' : 'Recursos'}
                  </span>
                </div>

                <h3
                  onClick={() => onSelectVideo(video)}
                  className="text-base font-bold text-white hover:text-cyan-400 cursor-pointer transition-colors line-clamp-2 mb-2"
                >
                  {video.title}
                </h3>

                {video.hasDescription && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-4">
                    {video.description}
                  </p>
                )}
              </div>

              {/* Download Buttons List */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                {video.downloads.map((dl, idx) => (
                  <a
                    key={dl.id || idx}
                    href={dl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload(dl, video)}
                    className="flex items-center justify-between gap-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/60 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{dl.label}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                ))}

                <button
                  onClick={() => onSelectVideo(video)}
                  className="w-full text-center text-xs font-bold text-red-400 hover:text-red-300 pt-2 flex items-center justify-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-red-400" />
                  <span>Ver tutorial del perfil</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto">
          <Download className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Próximas descargas disponibles</h3>
          <p className="text-xs text-zinc-400">
            Los perfiles y archivos .3MF de los tutoriales estarán disponibles muy pronto en esta sección.
          </p>
        </div>
      )}

    </section>
  );
}
