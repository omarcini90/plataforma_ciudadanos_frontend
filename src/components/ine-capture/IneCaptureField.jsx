import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IconCamera, IconCheck, IconUpload } from '@tabler/icons-react';
import IneCaptureModal from './IneCaptureModal.jsx';
import { isCameraSupported, requestRearCameraStream } from './ineCaptureUtils.js';

function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

/** Sin `image/*` para que en iOS no aparezca «Tomar foto» al subir archivo (solo galería/archivos). */
const INE_GALLERY_ACCEPT =
  'application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/webp,image/heic,.jpg,.jpeg,.png';

export default function IneCaptureField({ label, file, side, onChange }) {
  const fileInputRef = useRef(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [openingCamera, setOpeningCamera] = useState(false);
  const streamRef = useRef(null);
  const cameraOk = isCameraSupported();

  const closeCapture = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setMediaStream(null);
    setCaptureOpen(false);
  };

  const openCapture = async () => {
    setOpeningCamera(true);
    try {
      stopStream(streamRef.current);
      const stream = await requestRearCameraStream();
      streamRef.current = stream;
      setMediaStream(stream);
      setCaptureOpen(true);
    } catch (err) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permite el acceso a la cámara en Ajustes del navegador.'
          : err?.message || 'No se pudo abrir la cámara';
      toast.error(msg);
    } finally {
      setOpeningCamera(false);
    }
  };

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
        <>
          <p className="text-xs text-slate-500 lg:hidden">Sin imagen. Usa la cámara o sube un archivo.</p>
          <p className="text-xs text-slate-500 hidden lg:block">Sin imagen. Sube un archivo.</p>
        </>
      )}

      <div className="flex flex-col sm:flex-row lg:block gap-2">
        {cameraOk && (
          <button
            type="button"
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2 touch-manipulation lg:hidden"
            disabled={openingCamera}
            onClick={openCapture}
          >
            <IconCamera size={18} stroke={1.75} aria-hidden />
            {openingCamera ? 'Abriendo cámara…' : 'Capturar con cámara'}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary lg:btn-primary flex-1 w-full inline-flex items-center justify-center gap-2 touch-manipulation"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload size={18} stroke={1.75} aria-hidden />
          Subir archivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={INE_GALLERY_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            onChange(e.target.files?.[0] || null);
            e.target.value = '';
          }}
        />
      </div>

      {!cameraOk && (
        <p className="text-xs text-amber-700 lg:hidden">
          La cámara no está disponible en este navegador. Usa «Subir archivo».
        </p>
      )}

      <IneCaptureModal
        open={captureOpen}
        side={side}
        mediaStream={mediaStream}
        onClose={closeCapture}
        onCaptured={(f) => {
          onChange(f);
          closeCapture();
        }}
      />
    </div>
  );
}
