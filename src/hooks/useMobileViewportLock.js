import { useEffect } from 'react';

const MOBILE_MQ = '(max-width: 1023px)';
const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1.0';
const VIEWPORT_LOCKED =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover';

/** En móvil bloquea zoom por pinch/doble toque vía meta viewport. */
export function useMobileViewportLock() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return undefined;

    const media = window.matchMedia(MOBILE_MQ);
    const apply = () => {
      meta.setAttribute('content', media.matches ? VIEWPORT_LOCKED : VIEWPORT_DEFAULT);
      document.documentElement.classList.toggle('mobile-no-zoom', media.matches);
    };

    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
      meta.setAttribute('content', VIEWPORT_DEFAULT);
      document.documentElement.classList.remove('mobile-no-zoom');
    };
  }, []);
}
