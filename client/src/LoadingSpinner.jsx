import React from 'react';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { typography } from './styles';

export default function LoadingSpinner({ text = 'Cargando...' }) {
  const { currentTheme } = useTheme();
  // Si currentTheme es undefined, usamos un objeto vacío para evitar el crash
  const colors = currentTheme?.colors || {};

  const spinnerStyle = {
    width: '50px',
    height: '50px',
    border: `5px solid ${colors.lightGray || '#f0f0f0'}`,
    borderTop: `5px solid ${colors.primary || '#3b82f6'}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px auto',
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  };

  const textStyle = {
    ...typography.h3,
    color: colors.text || '#000',
    marginTop: '1rem',
  };

  const keyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{keyframes}</style>
      <div style={spinnerStyle}></div>
      <h3 style={textStyle}>{text}</h3>
    </div>
  );
}