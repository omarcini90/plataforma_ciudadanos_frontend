import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { IconCheck, IconX } from '@tabler/icons-react';

/**
 * Recorta un área de la imagen a JPEG (cuadrado por defecto).
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {number} [maxEdge=1024]
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, maxEdge = 1024) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const edge = Math.min(maxEdge, Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    edge,
    edge,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

/**
 * Modal: preview + pan/zoom/crop antes de confirmar la foto.
 */
export default function PhotoCropModal({
  open,
  imageSrc,
  title = 'Ajustar foto',
  confirmLabel = 'Usar esta foto',
  saving = false,
  onCancel,
  onConfirm,
  aspect = 1,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!open || !imageSrc) return null;

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    await onConfirm(file);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrastra para mover · usa el zoom · confirma el recorte
            </p>
          </div>
          <button
            type="button"
            title="Cerrar"
            aria-label="Cerrar"
            disabled={saving}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg p-1.5 ring-1 ring-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <IconX size={18} stroke={1.75} aria-hidden />
          </button>
        </div>

        <div className="relative h-72 bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
          />
        </div>

        <div className="px-4 py-3 space-y-3 border-t border-slate-200">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-1 w-full accent-brand-700"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !croppedAreaPixels}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
              onClick={() => {
                handleConfirm().catch(() => {
                  /* toast lo maneja el caller / interceptor */
                });
              }}
            >
              <IconCheck size={18} stroke={1.75} aria-hidden />
              {saving ? 'Guardando…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
