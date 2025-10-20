import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { getSectionStyle, getBtnStyle, typography } from './styles';

export default function VerificarEmail() {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { currentUser, logout } = useAuth();
  const [message, setMessage] = useState('Esperando verificación...');

  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentUser) {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          clearInterval(interval);
          window.location.reload();
        } else {
          setMessage('Aún no has verificado tu correo. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).');
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const sectionStyle = getSectionStyle(colors);
  const btnStyle = getBtnStyle();

  return (
    <div style={{...sectionStyle, maxWidth: '600px', textAlign: 'center'}}>
        <h2 style={{...typography.h2, color: colors.text, marginTop: 0}}>Verificación Requerida</h2>
        <p style={{...typography.body, color: colors.textSecondary}}>
            ¡Gracias por registrarte! Hemos enviado un enlace de verificación a <strong>{currentUser?.email}</strong>.
        </p>
        <p style={{...typography.body, color: colors.text, fontWeight: 'bold', minHeight: '50px'}}>
            {message}
        </p>
        <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem'}}>
            <button onClick={logout} style={{...btnStyle, background: colors.lightGray, color: colors.text}}>
                Cerrar Sesión
            </button>
        </div>
    </div>
  );
}