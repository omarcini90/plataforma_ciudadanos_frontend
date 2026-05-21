import { CAPTURE_CONFIG, INE_ASPECT } from './ineCaptureConstants.js';

/** Rectángulo guía centrado (credencial horizontal en vista vertical). */
export function getGuideRect(containerWidth, containerHeight) {
  const padX = containerWidth * 0.06;
  const padY = containerHeight * 0.14;
  const maxW = containerWidth - padX * 2;
  const maxH = containerHeight * 0.42;
  let width = maxW;
  let height = width / INE_ASPECT;
  if (height > maxH) {
    height = maxH;
    width = height * INE_ASPECT;
  }
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Mapea coordenadas del overlay (object-fit: cover) al frame real del video. */
export function mapGuideToVideo(video, guide, container) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const containerAspect = container.width / container.height;
  const videoAspect = vw / vh;

  let scale;
  let offsetX;
  let offsetY;
  if (videoAspect > containerAspect) {
    scale = container.height / vh;
    offsetX = (container.width - vw * scale) / 2;
    offsetY = 0;
  } else {
    scale = container.width / vw;
    offsetX = 0;
    offsetY = (container.height - vh * scale) / 2;
  }

  const x = Math.max(0, Math.round((guide.x - offsetX) / scale));
  const y = Math.max(0, Math.round((guide.y - offsetY) / scale));
  const width = Math.min(vw - x, Math.round(guide.width / scale));
  const height = Math.min(vh - y, Math.round(guide.height / scale));
  return { x, y, width: Math.max(1, width), height: Math.max(1, height) };
}

function sampleRegion(ctx, w, h) {
  const size = 48;
  const canvas = ctx.canvas;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const stepX = Math.max(1, Math.floor(w / size));
  const stepY = Math.max(1, Math.floor(h / size));
  const samples = [];
  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < w; x += stepX) {
      const i = (y * canvas.width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      samples.push(lum);
    }
  }
  return samples;
}

/** Varianza del Laplaciano aproximada (nitidez). */
function laplacianVariance(samples, w, h) {
  const size = Math.ceil(Math.sqrt(samples.length));
  if (size < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const c = samples[y * size + x];
      const lap =
        -4 * c +
        samples[(y - 1) * size + x] +
        samples[(y + 1) * size + x] +
        samples[y * size + (x - 1)] +
        samples[y * size + (x + 1)];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function analyzeGuideFrame(ctx, guide, previousSamples) {
  const { x, y, width, height } = guide;
  const imageData = ctx.getImageData(x, y, width, height);
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.putImageData(imageData, 0, 0);
  const samples = sampleRegion(tctx, width, height);
  const brightness =
    samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
  const sharpness = laplacianVariance(samples, width, height);

  let motion = 1;
  if (previousSamples?.length === samples.length) {
    let diff = 0;
    for (let i = 0; i < samples.length; i++) {
      diff += Math.abs(samples[i] - previousSamples[i]);
    }
    motion = diff / samples.length / 255;
  }

  const { minSharpness, maxMotion, minBrightness, maxBrightness } = CAPTURE_CONFIG;
  const ready =
    sharpness >= minSharpness &&
    motion <= maxMotion &&
    brightness >= minBrightness &&
    brightness <= maxBrightness;

  return { samples, sharpness, motion, brightness, ready };
}

export function enhanceCanvas(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const contrast = 1.08;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, d[i] * contrast + intercept));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * contrast + intercept));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * contrast + intercept));
  }
  ctx.putImageData(imageData, 0, 0);
}

export async function cropVideoFrame(video, guide, container) {
  const mapped = mapGuideToVideo(video, guide, container);
  const canvas = document.createElement('canvas');
  canvas.width = mapped.width;
  canvas.height = mapped.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    video,
    mapped.x,
    mapped.y,
    mapped.width,
    mapped.height,
    0,
    0,
    mapped.width,
    mapped.height,
  );
  enhanceCanvas(ctx, mapped.width, mapped.height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))),
      'image/jpeg',
      0.92,
    );
  });
  return blob;
}

export function blobToIneFile(blob, side) {
  const prefix = side === 'front' ? 'ine-frente' : 'ine-reverso';
  const name = `${prefix}-${Date.now()}.jpg`;
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

export function isCameraSupported() {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof document !== 'undefined'
  );
}
