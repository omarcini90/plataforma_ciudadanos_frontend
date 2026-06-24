import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';

/** Por encima de Leaflet (popups ~700) y del menú móvil (z-50). */
const PANEL_Z = 'z-[1100]';

/**
 * Panel lateral sin Ant Design (compatible con iOS Safari).
 * placement: 'left' | 'right'
 */
export default function SlidePanel({
  open,
  onClose,
  title,
  children,
  placement = 'right',
  width = 'max-w-xl',
  className = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sideClass =
    placement === 'left'
      ? 'left-0 border-r border-slate-200'
      : 'right-0 border-l border-slate-200';

  return createPortal(
    <div className={`fixed inset-0 ${PANEL_Z}`} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 cursor-default"
        aria-label="Cerrar panel"
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 h-full w-full ${width} bg-white shadow-2xl flex flex-col ${sideClass} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 font-semibold text-slate-800">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center rounded-md p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <IconX size={18} stroke={1.75} aria-hidden />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
