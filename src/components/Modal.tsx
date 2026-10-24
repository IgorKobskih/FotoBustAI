import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in safe-area-top" onClick={onClose}>
      <div
        className={cn('w-full bg-bg-cream rounded-2xl shadow-large animate-slide-up max-h-[90dvh] flex flex-col', sizeClass)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-bg flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-ink-secondary" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Подтвердить', cancelLabel = 'Отмена',
  onConfirm, onCancel, danger
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-ink-secondary leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-secondary btn-sm" onClick={onCancel}>{cancelLabel}</button>
        <button
          className={cn('btn btn-sm text-white px-5 py-1.5', danger ? 'bg-error hover:bg-error/90' : 'bg-brand hover:bg-brand-dark')}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
