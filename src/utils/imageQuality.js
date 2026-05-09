/**
 * Validación rápida en el navegador (sin red): tipo, tamaño, resolución y proporción.
 * Devuelve { passed, errors, warnings, info }.
 */

const MIN_WIDTH = 1200;
const RECOMMENDED_WIDTH = 1500;
const MAX_BYTES = 12 * 1024 * 1024;
const MIN_BYTES = 30 * 1024;
const MIN_ASPECT = 1.25;
const MAX_ASPECT = 2.1;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export async function validateImageClient(file) {
  const errors = [];
  const warnings = [];
  const info = { name: file.name, size: file.size, type: file.type };

  if (!ALLOWED_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
    errors.push(`Formato no soportado: ${file.type || 'desconocido'}. Usa JPEG, PNG o PDF.`);
  }

  if (file.size > MAX_BYTES) {
    errors.push(
      `Archivo muy grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Máximo 12 MB.`,
    );
  } else if (file.size < MIN_BYTES) {
    warnings.push(
      `Archivo muy pequeño (${(file.size / 1024).toFixed(0)} KB). Probablemente está demasiado comprimido.`,
    );
  }

  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return { passed: errors.length === 0, errors, warnings, info };
  }

  try {
    const dims = await readImageDimensions(file);
    info.width = dims.width;
    info.height = dims.height;

    if (dims.width < MIN_WIDTH) {
      errors.push(
        `Resolución muy baja: ${dims.width}×${dims.height} px. Mínimo ${MIN_WIDTH} px de ancho.`,
      );
    } else if (dims.width < RECOMMENDED_WIDTH) {
      warnings.push(
        `Resolución apenas suficiente: ${dims.width}×${dims.height} px. Recomendado ≥ ${RECOMMENDED_WIDTH}.`,
      );
    }

    const aspect = dims.width / Math.max(dims.height, 1);
    if (aspect && (aspect < MIN_ASPECT || aspect > MAX_ASPECT)) {
      warnings.push(
        `Proporción inusual (${aspect.toFixed(2)}:1). La INE debería medir aprox. 1.58:1 horizontal.`,
      );
    }
  } catch (err) {
    errors.push(`No se pudo leer la imagen: ${err?.message || err}`);
  }

  return { passed: errors.length === 0, errors, warnings, info };
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagen inválida'));
    };
    img.src = url;
  });
}
