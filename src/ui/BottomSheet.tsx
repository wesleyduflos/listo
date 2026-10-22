import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, label, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={ref}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startY.current = ref.current?.scrollTop === 0 ? e.touches[0].clientY : null;
        }}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80)
            onClose();
          startY.current = null;
        }}
      >
        <button type="button" className={styles.handle} aria-label="Fermer" onClick={onClose} />
        {title && <div className={styles.title}>{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
