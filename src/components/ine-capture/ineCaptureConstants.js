/** Proporción estándar credencial INE (ancho / alto en horizontal). */
export const INE_ASPECT = 1.586;

/** Frames consecutivos estables para disparar auto-captura (~1.2 s a 12 fps de análisis). */
export const STABLE_FRAMES_REQUIRED = 14;

/** Intervalo de análisis en ms. */
export const ANALYSIS_INTERVAL_MS = 85;

export const CAPTURE_CONFIG = {
  minSharpness: 12,
  maxMotion: 0.045,
  minBrightness: 35,
  maxBrightness: 220,
};

export const SIDE_META = {
  front: {
    title: 'Frente de la INE',
    hint: 'Coloca el frente de la credencial dentro del marco',
    filePrefix: 'ine-frente',
  },
  back: {
    title: 'Reverso de la INE',
    hint: 'Coloca el reverso de la credencial dentro del marco',
    filePrefix: 'ine-reverso',
  },
};
