import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANALYSIS_INTERVAL_MS,
  STABLE_FRAMES_REQUIRED,
} from './ineCaptureConstants.js';
import {
  analyzeGuideFrame,
  bindStreamToVideo,
  blobToIneFile,
  cropVideoFrame,
  getGuideRect,
} from './ineCaptureUtils.js';

export function useIneCaptureEngine({ side, onCaptured, enabled, mediaStream }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const ownsStreamRef = useRef(false);
  const loopRef = useRef(null);
  const prevSamplesRef = useRef(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false);
  const bindGenerationRef = useRef(0);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [guide, setGuide] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stableProgress, setStableProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const stopCamera = useCallback((stopTracks = true) => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (stopTracks && streamRef.current && ownsStreamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    ownsStreamRef.current = false;
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
      stopCamera(false);
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
        const progress = Math.min(1, stableCountRef.current / STABLE_FRAMES_REQUIRED);
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

  const bindStream = useCallback(
    async (stream) => {
      const generation = ++bindGenerationRef.current;
      setError('');
      setStatus('requesting');
      setStatusMessage('Iniciando vista previa…');

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const video = videoRef.current;
      if (!video) {
        throw new Error('Visor de cámara no disponible');
      }

      streamRef.current = stream;
      await bindStreamToVideo(video, stream);

      if (generation !== bindGenerationRef.current) return;

      setStatus('scanning');
      setStatusMessage('Coloca la credencial dentro del marco');
      startAnalysisLoop();
    },
    [startAnalysisLoop],
  );

  useEffect(() => {
    if (!enabled) {
      bindGenerationRef.current += 1;
      stopCamera(false);
      setStatus('idle');
      setStatusMessage('');
      return undefined;
    }

    if (!mediaStream) {
      setStatus('waiting');
      setStatusMessage('Sin flujo de cámara');
      return undefined;
    }

    let cancelled = false;
    ownsStreamRef.current = false;

    (async () => {
      try {
        await bindStream(mediaStream);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err?.name === 'NotAllowedError'
            ? 'Permite el acceso a la cámara en tu navegador.'
            : err?.message || 'No se pudo iniciar la cámara';
        setError(msg);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      bindGenerationRef.current += 1;
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [enabled, mediaStream, bindStream, stopCamera]);

  const captureManual = useCallback(() => {
    stableCountRef.current = STABLE_FRAMES_REQUIRED;
    performCapture();
  }, [performCapture]);

  const retryPlay = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current || mediaStream;
    if (!video || !stream) return;
    try {
      setError('');
      await bindStreamToVideo(video, stream);
      setStatus('scanning');
      setStatusMessage('Coloca la credencial dentro del marco');
      startAnalysisLoop();
    } catch (err) {
      setError(err?.message || 'No se pudo reproducir la cámara');
      setStatus('error');
    }
  }, [mediaStream, startAnalysisLoop]);

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
    retryPlay,
  };
}
