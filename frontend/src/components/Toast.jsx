import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={20} color="#10b981" />,
    error: <AlertCircle size={20} color="#ef4444" />,
    info: <Info size={20} color="#3b82f6" />
  };

  return (
    <div className={`toast toast-${type}`}>
      {icons[type] || icons.info}
      <div style={{ flex: 1, fontSize: '0.9rem', color: '#fff' }}>
        {message}
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Toast;
