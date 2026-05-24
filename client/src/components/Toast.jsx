import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

export default function Toast() {
  // Access context directly to avoid circular dependency
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts } = context;

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.message}
        </div>
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9999;
        }
        .toast-icon {
          font-weight: 800;
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
}
