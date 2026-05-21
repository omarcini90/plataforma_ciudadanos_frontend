import { IconCamera, IconRefresh, IconX } from '@tabler/icons-react';
import { SIDE_META } from './ineCaptureConstants.js';
import { useIneCaptureEngine } from './useIneCaptureEngine.js';

function GuideOverlay({ guide, stableProgress, maskId }) {
  if (!guide) return null;
  const { x, y, width, height } = guide;
  const pct = Math.round(stableProgress * 100);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx="12"
              ry="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15,23,42,0.62)"
          mask={`url(#${maskId})`}
        />
      </svg>

      <div
        className="absolute rounded-xl border-2 border-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
        style={{ left: x, top: y, width, height }}
      >
        <span className="absolute -left-0.5 -top-0.5 h-7 w-7 border-l-[3px] border-t-[3px] border-accent-400 rounded-tl-lg" />
        <span className="absolute -right-0.5 -top-0.5 h-7 w-7 border-r-[3px] border-t-[3px] border-accent-400 rounded-tr-lg" />
        <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 border-b-[3px] border-l-[3px] border-accent-400 rounded-bl-lg" />
        <span className="absolute -bottom-0.5 -right-0.5 h-7 w-7 border-b-[3px] border-r-[3px] border-accent-400 rounded-br-lg" />

        {stableProgress > 0 && (
          <div className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-accent-400 transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function IneCaptureModal({ open, side, onClose, onCaptured }) {
  const meta = SIDE_META[side] || SIDE_META.front;

  const {
    videoRef,
    containerRef,
    analysisCanvasRef,
    status,
    error,
    guide,
    stableProgress,
    statusMessage,
    captureManual,
    retry,
  } = useIneCaptureEngine({
    side,
    enabled: open,
    onCaptured: (file) => {
      onCaptured(file);
      onClose();
    },
  });

  if (!open) return null;

  const scanning = status === 'scanning' || status === 'requesting';

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ine-capture-title"
    >
      <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 safe-area-top bg-slate-950/90">
        <div className="min-w-0">
          <h2 id="ine-capture-title" className="text-base font-semibold truncate">
            {meta.title}
          </h2>
          <p className="text-xs text-slate-300 truncate">{meta.hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 inline-flex items-center justify-center rounded-full p-2 bg-white/10 hover:bg-white/20 touch-manipulation"
          aria-label="Cerrar captura"
        >
          <IconX size={20} stroke={1.75} aria-hidden />
        </button>
      </header>

      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />
        <GuideOverlay
          guide={guide}
          stableProgress={stableProgress}
          maskId={`ine-guide-mask-${side}`}
        />
        <canvas ref={analysisCanvasRef} className="hidden" aria-hidden />

        <div className="absolute inset-x-0 top-3 z-20 flex justify-center px-4">
          <p className="rounded-full bg-slate-900/75 px-4 py-2 text-sm text-center text-slate-100 backdrop-blur-sm max-w-md">
            {error || statusMessage || meta.hint}
          </p>
        </div>
      </div>

      <footer className="relative z-20 flex flex-col gap-3 px-4 py-4 bg-slate-950/95 border-t border-white/10 safe-area-bottom">
        {error ? (
          <button type="button" className="btn-primary w-full" onClick={retry}>
            <IconRefresh size={18} stroke={1.75} className="mr-2 inline" aria-hidden />
            Reintentar cámara
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary w-full touch-manipulation"
            disabled={!scanning || status === 'capturing'}
            onClick={captureManual}
          >
            <IconCamera size={18} stroke={1.75} className="mr-2 inline" aria-hidden />
            {status === 'capturing' ? 'Procesando…' : 'Capturar ahora'}
          </button>
        )}
        <p className="text-center text-[11px] text-slate-400">
          La captura es automática cuando la credencial está alineada y estable. El OCR se ejecuta
          después con el botón del formulario (Mindee).
        </p>
      </footer>
    </div>
  );
}
