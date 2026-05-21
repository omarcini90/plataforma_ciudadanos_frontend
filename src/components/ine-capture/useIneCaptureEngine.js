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
  const guideRef = useRef(null);
  const loopRef = useRef(null);
  const prevSamplesRef = useRef(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false);
  const boundStreamRef = useRef(null);
  const statusMessageRef = useRef('');
  const onCapturedRef = useRef(onCaptured);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [stableProgress, setStableProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  onCapturedRef.current = onCaptured;

  const setMessage = (msg) => {
    if (statusMessageRef.current === msg) return;
    statusMessageRef.current = msg;
    setStatusMessage(msg);
  };

  const setProgress = (value) => {
    setStableProgress((prev) => (prev === value ? prev : value));
  };

  const clearAnalysisLoop = () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  };

  const getGuideFromContainer = () => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const guide = getGuideRect(rect.width, rect.height);
    guideRef.current = guide;
    return guide;
  };

  const performCapture = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    const guide = guideRef.current || getGuideFromContainer();
    if (!video || !container || !guide || capturingRef.current) return;
    if (!video.videoWidth) return;

    capturingRef.current = true;
    clearAnalysisLoop();
    setStatus('capturing');
    setMessage('Capturando…');

    try {
      const rect = container.getBoundingClientRect();
      const blob = await cropVideoFrame(video, guide, {
        width: rect.width,
        height: rect.height,
      });
      const file = blobToIneFile(blob, side);
      setStatus('captured');
      onCapturedRef.current?.(file);
    } catch (err) {
      setError(err?.message || 'Error al capturar la imagen');
      setStatus('error');
      capturingRef.current = false;
      if (streamRef.current) startAnalysisLoopRef.current?.();
    }
  }, [side]);

  const startAnalysisLoopRef = useRef(null);

  const startAnalysisLoop = useCallback(() => {
    clearAnalysisLoop();
    loopRef.current = setInterval(() => {
      const video = videoRef.current;
      const container = containerRef.current;
      const canvas = analysisCanvasRef.current;
      if (!video || !container || !canvas || !video.videoWidth || capturingRef.current) return;

      const guide = getGuideFromContainer();
      if (!guide) return;

      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, rect.width, rect.height);

      const result = analyzeGuideFrame(ctx, guide, prevSamplesRef.current);
      prevSamplesRef.current = result.samples;

      if (result.ready) {
        stableCountRef.current += 1;
        const progress = Math.min(1, stableCountRef.current / STABLE_FRAMES_REQUIRED);
        setProgress(progress);
        setMessage('Mantén estable…');
        if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
          performCapture();
        }
      } else {
        stableCountRef.current = 0;
        setProgress(0);
        if (result.brightness < 35) {
          setMessage('Poca luz — acércate a una zona iluminada');
        } else if (result.brightness > 220) {
          setMessage('Demasiada luz — evita reflejos directos');
        } else if (result.sharpness < 12) {
          setMessage('Enfoca la credencial dentro del marco');
        } else if (result.motion > 0.045) {
          setMessage('Coloca la INE dentro del marco y no la muevas');
        } else {
          setMessage('Alinea la credencial dentro del marco');
        }
      }
    }, ANALYSIS_INTERVAL_MS);
  }, [performCapture]);

  startAnalysisLoopRef.current = startAnalysisLoop;

  const attachStreamOnce = useCallback(async (stream) => {
    if (boundStreamRef.current === stream && streamRef.current === stream) {
      if (!loopRef.current && videoRef.current?.videoWidth) {
        setStatus('scanning');
        startAnalysisLoop();
      }
      return;
    }

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const video = videoRef.current;
    if (!video) throw new Error('Visor de cámara no disponible');

    streamRef.current = stream;
    boundStreamRef.current = stream;
    setError('');
    setStatus('requesting');
    setMessage('Iniciando vista previa…');

    await bindStreamToVideo(video, stream);

    setStatus('scanning');
    setMessage('Coloca la credencial dentro del marco');
    stableCountRef.current = 0;
    setProgress(0);
    prevSamplesRef.current = null;
    startAnalysisLoop();
  }, [startAnalysisLoop]);

  useEffect(() => {
    if (!enabled) {
      clearAnalysisLoop();
      boundStreamRef.current = null;
      streamRef.current = null;
      guideRef.current = null;
      capturingRef.current = false;
      setStatus('idle');
      setMessage('');
      setProgress(0);
      return undefined;
    }

    if (!mediaStream) {
      setStatus('waiting');
      setMessage('Sin flujo de cámara');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        await attachStreamOnce(mediaStream);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err?.name === 'NotAllowedError'
            ? 'Permite el acceso a la cámara en tu navegador.'
            : err?.message || 'No se pudo iniciar la cámara';
        setError(msg);
        setStatus('error');
        boundStreamRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      clearAnalysisLoop();
    };
  }, [enabled, mediaStream, attachStreamOnce]);

  const captureManual = useCallback(() => {
    stableCountRef.current = STABLE_FRAMES_REQUIRED;
    performCapture();
  }, [performCapture]);

  const retryPlay = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current || mediaStream;
    if (!video || !stream) return;
    try {
      boundStreamRef.current = null;
      setError('');
      await attachStreamOnce(stream);
    } catch (err) {
      setError(err?.message || 'No se pudo reproducir la cámara');
      setStatus('error');
    }
  }, [attachStreamOnce, mediaStream]);

  return {
    videoRef,
    containerRef,
    analysisCanvasRef,
    status,
    error,
    stableProgress,
    statusMessage,
    captureManual,
    retryPlay,
  };
}
