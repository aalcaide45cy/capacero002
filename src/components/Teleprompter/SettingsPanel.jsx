import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { RESOLUTIONS } from './useMedia';

function Range({ label, value, min, max, step = 1, onChange, format }) {
  return (
    <label className="tp-field">
      <span className="tp-field-label">
        {label}
        <span className="tp-field-value">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={`tp-toggle${disabled ? ' is-disabled' : ''}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="tp-switch" aria-hidden="true" />
    </label>
  );
}

function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="tp-field">
      <span className="tp-field-label">{label}</span>
      <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="tp-field">
      <span className="tp-field-label">{label}</span>
      <div className="tp-segmented" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Medidor de nivel del micrófono (Web Audio, todo local)
export function MicMeter({ stream }) {
  const barRef = useRef(null);
  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!track || !Ctx) return undefined;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
      if (barRef.current) barRef.current.style.transform = `scaleX(${level})`;
      raf = requestAnimationFrame(tick);
    };
    ctx.resume?.().catch(() => {});
    tick();
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div className="tp-meter" aria-label="Nivel del micrófono">
      <div className="tp-meter-bar" ref={barRef} />
    </div>
  );
}

const VIDEO_LEVELS = [2, 4, 6, 8, 12, 16, 20, 25, 35, 50, 80, 100];
const videoLevelName = m => (m <= 4 ? 'ligero' : m <= 8 ? 'buena' : m <= 16 ? 'alta' : m <= 35 ? 'muy alta' : 'máxima, archivos enormes');

function CameraSection({ settings, update, camera, recording }) {
  const { stream, devices, error } = camera;
  const videoTrack = stream?.getVideoTracks()[0];
  const audioTrack = camera.micTrack || stream?.getAudioTracks()[0];
  const trackSettings = videoTrack?.getSettings?.() || {};
  const caps = videoTrack?.getCapabilities?.() || {};
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    setZoom(videoTrack?.getSettings?.().zoom ?? null);
  }, [videoTrack]);

  const applyZoom = v => {
    setZoom(v);
    videoTrack?.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
  };

  const autoMbps = (RESOLUTIONS[settings.resolution] || RESOLUTIONS['1080']).bitrate / 1_000_000;
  const mbps = settings.videoBitrate > 0 ? settings.videoBitrate : autoMbps;
  const audioSettings = audioTrack?.getSettings?.() || {};
  const wavPerMin = Math.round(
    ((audioSettings.sampleRate || 48000) * (audioSettings.channelCount === 2 ? 2 : 1) * (settings.wavBitDepth / 8) * 60) / 1_048_576
  );
  const sizePerMin = Math.round(((mbps * 1_000_000 + settings.audioBitrate * 1000) * 60) / 8 / 1_048_576);

  const cameraOptions = [
    { value: 'user', label: 'Frontal' },
    { value: 'environment', label: 'Trasera' },
    ...devices.video.map((d, i) => ({ value: d.deviceId, label: d.label || `Cámara ${i + 1}` })),
  ];
  const micOptions = [
    { value: 'default', label: 'Predeterminado del sistema' },
    ...devices.audio
      .filter(d => d.deviceId !== 'default')
      .map((d, i) => ({ value: d.deviceId, label: d.label || `Micrófono ${i + 1}` })),
  ];

  return (
    <section className="tp-panel-section">
      <h3>Cámara y grabación</h3>
      <Toggle label="Cámara de fondo" checked={settings.cameraOn} disabled={recording} onChange={v => update({ cameraOn: v })} />
      {error && <p className="tp-error">{error}</p>}
      {settings.cameraOn && (
        <>
          <Select label="Cámara" value={settings.cameraSource} disabled={recording} options={cameraOptions} onChange={v => update({ cameraSource: v })} />
          <Segmented
            label="Resolución"
            value={settings.resolution}
            onChange={v => !recording && update({ resolution: v })}
            options={Object.entries(RESOLUTIONS).map(([value, r]) => ({ value, label: r.label }))}
          />
          <Segmented
            label="Fotogramas por segundo"
            value={settings.fps}
            onChange={v => !recording && update({ fps: v })}
            options={[{ value: 24, label: '24' }, { value: 30, label: '30' }, { value: 60, label: '60' }]}
          />
          <Select
            label="Calidad de vídeo (bitrate)"
            value={String(settings.videoBitrate)}
            disabled={recording}
            onChange={v => update({ videoBitrate: Number(v) })}
            options={[
              { value: '0', label: `Automático · ${autoMbps} Mbps` },
              ...VIDEO_LEVELS.map(m => ({ value: String(m), label: `${m} Mbps · ${videoLevelName(m)}` })),
            ]}
          />
          <Select
            label="Audio del vídeo (AAC)"
            value={String(settings.audioBitrate)}
            disabled={recording}
            onChange={v => update({ audioBitrate: Number(v) })}
            options={[64, 96, 128, 160, 192, 256, 320].map(k => ({
              value: String(k),
              label: `${k} kbps${k === 320 ? ' · máximo' : k === 128 ? ' · normal' : ''}`,
            }))}
          />
          <Select
            label="Frecuencia de muestreo (Hz)"
            value={String(settings.audioSampleRate)}
            disabled={recording}
            onChange={v => update({ audioSampleRate: Number(v) })}
            options={[
              { value: '0', label: 'Automática del micrófono' },
              { value: '44100', label: '44.100 Hz' },
              { value: '48000', label: '48.000 Hz · estándar de vídeo' },
            ]}
          />
          <Select
            label="Canales"
            value={String(settings.audioChannels)}
            disabled={recording}
            onChange={v => update({ audioChannels: Number(v) })}
            options={[
              { value: '0', label: 'Automático' },
              { value: '1', label: 'Mono' },
              { value: '2', label: 'Estéreo' },
            ]}
          />
          {audioTrack && (
            <p className="tp-hint">
              Micrófono entregando: {audioSettings.sampleRate ? `${(audioSettings.sampleRate / 1000).toFixed(1)} kHz` : '—'} ·{' '}
              {audioSettings.channelCount === 2 ? 'estéreo' : audioSettings.channelCount === 1 ? 'mono' : '—'}.
              El navegador puede ignorar lo que pidas si el micro no lo ofrece.
            </p>
          )}
          <Toggle
            label="Mostrar el nivel del micrófono en pantalla"
            checked={settings.showMicMeter}
            onChange={v => update({ showMicMeter: v })}
          />
          <Toggle
            label="Grabar también audio sin comprimir (WAV)"
            checked={settings.wavRecord}
            disabled={recording}
            onChange={v => update({ wavRecord: v })}
          />
          {settings.wavRecord && (
            <Select
              label="Profundidad de bits del WAV"
              value={String(settings.wavBitDepth)}
              disabled={recording}
              onChange={v => update({ wavBitDepth: Number(v) })}
              options={[
                { value: '16', label: '16 bits (calidad CD)' },
                { value: '24', label: '24 bits (profesional)' },
                { value: '32', label: '32 bits flotante (máxima)' },
              ]}
            />
          )}
          <p className="tp-hint">
            Tamaño aproximado del vídeo: {sizePerMin} MB por minuto.
            {settings.wavRecord && ` Más ${wavPerMin} MB por minuto del WAV, que se guarda aparte.`} El audio del
            vídeo siempre va comprimido (AAC): para conservar la calidad de tu micro, activa el WAV y sincronízalo
            en tu editor. El WAV se guarda en la memoria del dispositivo hasta que lo descargues: en grabaciones
            largas, mejor 16 o 24 bits. Cierra el panel antes de grabar. Si en tu iPhone el vídeo se graba sin
            sonido, desactiva el nivel del micrófono y el WAV.
          </p>
          {caps.zoom && zoom != null && (
            <Range
              label="Zoom"
              value={zoom}
              min={caps.zoom.min}
              max={caps.zoom.max}
              step={caps.zoom.step || 0.1}
              format={v => `${Number(v).toFixed(1)}×`}
              onChange={applyZoom}
            />
          )}
          {videoTrack && (
            <p className="tp-hint">
              En uso: {videoTrack.label || 'cámara'}
              {trackSettings.width ? ` · ${trackSettings.width}×${trackSettings.height}` : ''}
              {trackSettings.frameRate ? ` · ${Math.round(trackSettings.frameRate)} fps` : ''}
            </p>
          )}
          <Toggle label="Ver la cámara en espejo" checked={settings.cameraMirror} onChange={v => update({ cameraMirror: v })} />
          <Segmented
            label="Vista de la cámara"
            value={settings.cameraFit}
            onChange={v => update({ cameraFit: v })}
            options={[{ value: 'cover', label: 'Llenar pantalla' }, { value: 'contain', label: 'Imagen completa' }]}
          />
          <p className="tp-hint">
            «Llenar pantalla» recorta los bordes de la imagen para cubrir la pantalla. «Imagen completa» muestra el encuadre
            entero que se graba, con franjas negras si hace falta.
          </p>
          <Range
            label="Oscurecer la imagen"
            value={settings.cameraDim}
            min={0}
            max={0.9}
            step={0.05}
            format={v => `${Math.round(v * 100)} %`}
            onChange={v => update({ cameraDim: v })}
          />
          <Select label="Micrófono" value={settings.micId} disabled={recording} options={micOptions} onChange={v => update({ micId: v })} />
          {stream && !audioTrack && (
            <p className="tp-error">
              No llega audio. Comprueba el permiso del micrófono en los ajustes de Safari para esta web y vuelve a
              encender la cámara.
            </p>
          )}
          {audioTrack && (
            <>
              <MicMeter stream={stream} />
              <p className="tp-hint">En uso: {audioTrack.label || 'micrófono'}</p>
            </>
          )}
          <Range
            label="Ganancia de entrada (por software)"
            value={settings.micGain}
            min={0}
            max={24}
            step={1}
            format={v => (v === 0 ? 'Sin ganancia' : `+${v} dB`)}
            onChange={v => update({ micGain: v })}
          />
          <Toggle label="Control automático de ganancia" checked={settings.autoGainControl} disabled={recording} onChange={v => update({ autoGainControl: v })} />
          <Toggle label="Reducción de ruido" checked={settings.noiseSuppression} disabled={recording} onChange={v => update({ noiseSuppression: v })} />
          <Toggle label="Cancelación de eco" checked={settings.echoCancellation} disabled={recording} onChange={v => update({ echoCancellation: v })} />
          <p className="tp-hint">
            Si la voz se graba baja con todo apagado, sube la ganancia de entrada (con limitador contra saturación)
            o activa el control automático de ganancia. Con un micro externo suele sonar mejor sin reducción de
            ruido ni eco. La ganancia por software puede dejar el vídeo mudo en algunos iPhone: si pasa, ponla en 0.
          </p>
        </>
      )}
    </section>
  );
}

export default function SettingsPanel({ settings, update, onClose, camera, recording }) {
  return (
    <aside className="tp-panel" aria-label="Ajustes del teleprompter">
      <header className="tp-panel-header">
        <h2>Ajustes</h2>
        <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Cerrar ajustes">
          <X size={20} />
        </button>
      </header>

      <div className="tp-panel-body">
        <section className="tp-panel-section">
          <h3>Desplazamiento</h3>
          <Range label="Velocidad" value={settings.speed} min={1} max={40} onChange={v => update({ speed: v })} />
          <Range
            label="Cuenta atrás"
            value={settings.countdown}
            min={0}
            max={10}
            format={v => (v ? `${v} s` : 'No')}
            onChange={v => update({ countdown: v })}
          />
          <Toggle
            label="Cuenta atrás también al reanudar"
            checked={settings.countdownOnResume}
            disabled={!settings.countdown}
            onChange={v => update({ countdownOnResume: v })}
          />
          <p className="tp-hint">Siempre hay cuenta atrás al empezar desde el principio y al pulsar grabar.</p>
          <Range
            label="Altura de la guía de lectura"
            value={settings.guidePos}
            min={10}
            max={80}
            format={v => `${v} %`}
            onChange={v => update({ guidePos: v })}
          />
          <Segmented
            label="Guía de lectura"
            value={settings.guideStyle}
            onChange={v => update({ guideStyle: v })}
            options={[{ value: 'none', label: 'Ninguna' }, { value: 'line', label: 'Flechas' }, { value: 'band', label: 'Franja' }]}
          />
          <Toggle label="Atenuar el texto ya leído" checked={settings.fadeRead} onChange={v => update({ fadeRead: v })} />
        </section>

        <section className="tp-panel-section">
          <h3>Barra de herramientas</h3>
          <Toggle label="Fijar la barra (no se oculta)" checked={settings.controlsPinned} onChange={v => update({ controlsPinned: v })} />
          <Range
            label="Ocultar tras"
            value={settings.controlsHideDelay}
            min={1}
            max={15}
            format={v => `${v} s`}
            onChange={v => update({ controlsHideDelay: v })}
          />
          <Toggle
            label="Con la barra oculta, el primer toque solo la muestra"
            checked={settings.tapWakesControls}
            onChange={v => update({ tapWakesControls: v })}
          />
          <p className="tp-hint">Así no pausas sin querer: toca una vez para ver la barra y otra para pausar o reanudar.</p>
        </section>

        <section className="tp-panel-section">
          <h3>Texto</h3>
          <Range label="Tamaño de letra" value={settings.fontSize} min={18} max={160} format={v => `${v} px`} onChange={v => update({ fontSize: v })} />
          <Range label="Interlineado" value={settings.lineHeight} min={1} max={2.2} step={0.05} format={v => v.toFixed(2)} onChange={v => update({ lineHeight: v })} />
          <Range label="Ancho de columna" value={settings.width} min={40} max={100} format={v => `${v} %`} onChange={v => update({ width: v })} />
          <Segmented
            label="Alineación"
            value={settings.align}
            onChange={v => update({ align: v })}
            options={[{ value: 'left', label: 'Izquierda' }, { value: 'center', label: 'Centro' }]}
          />
          <Segmented
            label="Tipografía"
            value={settings.fontFamily}
            onChange={v => update({ fontFamily: v })}
            options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]}
          />
          <Toggle label="Mayúsculas" checked={settings.uppercase} onChange={v => update({ uppercase: v })} />
          <Toggle label="Sombra del texto" checked={settings.textShadow} onChange={v => update({ textShadow: v })} />
          <div className="tp-colors">
            <label>
              Texto
              <input type="color" value={settings.textColor} onChange={e => update({ textColor: e.target.value })} />
            </label>
            <label>
              Fondo
              <input type="color" value={settings.bgColor} onChange={e => update({ bgColor: e.target.value })} />
            </label>
          </div>
        </section>

        <section className="tp-panel-section">
          <h3>Espejo</h3>
          <Toggle label="Espejo horizontal" checked={settings.mirrorH} onChange={v => update({ mirrorH: v })} />
          <Toggle label="Espejo vertical" checked={settings.mirrorV} onChange={v => update({ mirrorV: v })} />
          <p className="tp-hint">Para cristales de teleprompter, que reflejan el texto al revés.</p>
        </section>

        {camera && <CameraSection settings={settings} update={update} camera={camera} recording={recording} />}
      </div>
    </aside>
  );
}
