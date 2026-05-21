import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANALYSIS_INTERVAL_MS,
  STABLE_FRAMES_REQUIRED,
} from './ineCaptureConstants.js';
import {
  analyzeGuideFrame,
  blobToIneFile,
  cropVideoFrame,
  getGuideRect,
} from './ineCaptureUtils.js';

export function useIneCaptureEngine({ side, onCaptured, enabled }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const prevSamplesRef = useRef(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [guide, setGuide] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stableProgress, setStableProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevSamplesRef.current = null;
    stableCountRef.current = 0;
    capturingRef.current = false;
  }, []);

  const performCapture = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !guide || capturingRef.current) return;
    if (!video.videoWidth) return;

    capturingRef.current = true;
    setStatus('capturing');
    setStatusMessage('Capturando…');

    try {
      const rect = container.getBoundingClientRect();
      const blob = await cropVideoFrame(video, guide, {
        width: rect.width,
        height: rect.height,
      });
      const file = blobToIneFile(blob, side);
      stopCamera();
      setStatus('captured');
      onCaptured?.(file);
    } catch (err) {
      setError(err?.message || 'Error al capturar la imagen');
      setStatus('error');
      capturingRef.current = false;
    }
  }, [guide, onCaptured, side, stopCamera]);

  const startAnalysisLoop = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(() => {
      const video = videoRef.current;
      const container = containerRef.current;
      const canvas = analysisCanvasRef.current;
      if (!video || !container || !canvas || !video.videoWidth || capturingRef.current) return;

      const rect = container.getBoundingClientRect();
      const nextGuide = getGuideRect(rect.width, rect.height);
      setGuide(nextGuide);

      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, rect.width, rect.height);

      const result = analyzeGuideFrame(ctx, nextGuide, prevSamplesRef.current);
      prevSamplesRef.current = result.samples;
      setMetrics(result);

      if (result.ready) {
        stableCountRef.current += 1;
        const progress = Math.min(
          1,
          stableCountRef.current / STABLE_FRAMES_REQUIRED,
        );
        setStableProgress(progress);
        setStatusMessage('Mantén estable…');
        if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
          performCapture();
        }
      } else {
        stableCountRef.current = 0;
        setStableProgress(0);
        if (result.brightness < 35) {
          setStatusMessage('Poca luz — acércate a una zona iluminada');
        } else if (result.brightness > 220) {
          setStatusMessage('Demasiada luz — evita reflejos directos');
        } else if (result.sharpness < 12) {
          setStatusMessage('Enfoca la credencial dentro del marco');
        } else if (result.motion > 0.045) {
          setStatusMessage('Coloca la INE dentro del marco y no la muevas');
        } else {
          setStatusMessage('Alinea la credencial dentro del marco');
        }
      }
    }, ANALYSIS_INTERVAL_MS);
  }, [performCapture]);

  const startCamera = useCallback(async () => {
    setError('');
    setStatus('requesting');
    setStatusMessage('Activando cámara…');
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Visor de cámara no disponible');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      setStatus('scanning');
      setStatusMessage('Coloca la credencial dentro del marco');
      startAnalysisLoop();
    } catch (err) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permite el acceso a la cámara en tu navegador.'
          : err?.message || 'No se pudo abrir la cámara';
      setError(msg);
      setStatus('error');
      stopCamera();
    }
  }, [startAnalysisLoop, stopCamera]);

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
      setStatus('idle');
    }
    return () => stopCamera();
  }, [enabled, startCamera, stopCamera]);

  const captureManual = useCallback(() => {
    stableCountRef.current = STABLE_FRAMES_REQUIRED;
    performCapture();
  }, [performCapture]);

  return {
    videoRef,
    containerRef,
    analysisCanvasRef,
    status,
    error,
    guide,
    metrics,
    stableProgress,
    statusMessage,
    captureManual,
    retry: startCamera,
  };
}
