'use client';

import { useEffect, useState } from 'react';
import styles from './toast.module.css';

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  autoDismiss?: boolean;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.autoDismiss) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 200);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.autoDismiss, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon}>
        {toast.type === 'success' ? '✓' : '✗'}
      </span>
      <span className={styles.message}>{toast.message}</span>
      {!toast.autoDismiss && (
        <button
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showSuccess = (message: string) => {
    return addToast({ type: 'success', message, autoDismiss: true });
  };

  const showError = (message: string) => {
    return addToast({ type: 'error', message, autoDismiss: false });
  };

  return { toasts, addToast, dismissToast, showSuccess, showError };
}
