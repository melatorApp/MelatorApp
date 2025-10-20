import React from 'react';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { common, typography, getBtnStyle } from './styles';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', confirmVariant = 'primary' }) {
  const { currentTheme } = useTheme();
  const colors = currentTheme?.colors || {};

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    background: colors.surface,
    padding: '25px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.border || '#e0e0e0'}`,
    textAlign: 'center',
  };

  const btnStyle = getBtnStyle();
  const confirmBtnStyle = {
    ...btnStyle,
    background: confirmVariant === 'danger' ? common.danger : common.primary,
    color: '#fff',
  };
  const cancelBtnStyle = {
    ...btnStyle,
    background: colors.lightGray,
    color: colors.text,
    boxShadow: 'none',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ ...typography.h3, color: colors.text, marginTop: 0 }}>{title}</h3>
        <p style={{ ...typography.body, color: colors.textSecondary, margin: '1rem 0 2rem 0' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={onConfirm} style={confirmBtnStyle}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}