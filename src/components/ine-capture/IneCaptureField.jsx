import { useState } from 'react';
import { IconCamera, IconCheck, IconUpload } from '@tabler/icons-react';
import IneCaptureModal from './IneCaptureModal.jsx';
import { isCameraSupported } from './ineCaptureUtils.js';

export default function IneCaptureField({ label, file, side, accept, onChange }) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const cameraOk = isCameraSupported();

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <label className="label mb-0">{label}</label>

      {file ? (
        <div className="flex items-start gap-3 rounded-md bg-white ring-1 ring-emerald-200/80 p-3">
          <IconCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">
              {file.size ? `${Math.round(file.size / 1024)} KB` : ''} · Listo para OCR
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-brand-700 hover:underline shrink-0 touch-manipulation"
            onClick={() => onChange(null)}
          >
            Quitar
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Sin imagen. Usa la cámara o sube un archivo.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {cameraOk && (
          <button
            type="button"
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2 touch-manipulation"
            onClick={() => setCaptureOpen(true)}
          >
            <IconCamera size={18} stroke={1.75} aria-hidden />
            Capturar con cámara
          </button>
        )}
        <label className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 cursor-pointer touch-manipulation">
          <IconUpload size={18} stroke={1.75} aria-hidden />
          Subir archivo
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {!cameraOk && (
        <p className="text-xs text-amber-700">
          La cámara no está disponible en este navegador. Usa «Subir archivo».
        </p>
      )}

      <IneCaptureModal
        open={captureOpen}
        side={side}
        onClose={() => setCaptureOpen(false)}
        onCaptured={(f) => onChange(f)}
      />
    </div>
  );
}
