import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/* ------------------------------------------------------------------ */
/*  Context types                                                      */
/* ------------------------------------------------------------------ */
interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ModalContextValue {
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
  confirmModal: (opts: ConfirmOptions) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Overlay                                                            */
/* ------------------------------------------------------------------ */
interface OverlayProps {
  children: ReactNode;
  onClose: () => void;
  center?: boolean;
}

function ModalOverlay({ children, onClose, center }: OverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className={`modal-overlay${center ? ' modal-center' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm Dialog                                                     */
/* ------------------------------------------------------------------ */
interface ConfirmDialogProps extends ConfirmOptions {
  onClose: () => void;
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onClose,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="modal-overlay modal-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);

  const openModal = useCallback((content: ReactNode) => {
    setModalContent(content);
  }, []);

  const closeModal = useCallback(() => {
    setModalContent(null);
  }, []);

  const confirmModal = useCallback((opts: ConfirmOptions) => {
    setConfirmOpts(opts);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpts(null);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal, confirmModal }}>
      {children}

      {modalContent && (
        <ModalOverlay onClose={closeModal}>{modalContent}</ModalOverlay>
      )}

      {confirmOpts && (
        <ConfirmDialog {...confirmOpts} onClose={closeConfirm} />
      )}
    </ModalContext.Provider>
  );
}
