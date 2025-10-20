import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { getSectionStyle, getBtnStyle, getInputStyle, typography } from './styles';
import toast from 'react-hot-toast';

export default function Registro({ onSwitchToLogin }) {
  const { register } = useAuth();
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const result = await register(email, password);
    
    if (result.success) {
        toast.success('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
    } else {
        toast.error(result.message || 'Error al registrar la cuenta.');
    }
    setLoading(false);
  };
  
  const sectionStyle = { ...getSectionStyle(colors), maxWidth: '400px', margin: 'auto' };
  const btnStyle = getBtnStyle();
  const inputStyle = getInputStyle(colors);
  const linkStyle = {
    background: 'none', border: 'none', color: colors.primary,
    textDecoration: 'underline', cursor: 'pointer', padding: 0,
    fontFamily: "'Inter', sans-serif",
  };
  
  const agreementStyle = {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    textAlign: 'left', marginTop: '1rem', marginBottom: '1.5rem',
  };

  return (
    <div style={sectionStyle}>
        <h2 style={{...typography.h2, color: colors.text, textAlign: 'center' }}>Crear Cuenta</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem'}}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo Electrónico" required style={inputStyle} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" required style={inputStyle} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" required style={inputStyle} />
            
            <div style={agreementStyle}>
              <input
                type="checkbox" id="agreement" checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                style={{ marginTop: '4px', cursor: 'pointer' }}
              />
              <label htmlFor="agreement" style={{...typography.small, color: colors.textSecondary, cursor: 'pointer'}}>
                Entiendo y acepto que <strong>Melator es una herramienta de uso recreativo</strong> y no garantiza ningún tipo de premio o ganancia.
              </label>
            </div>

            <button type="submit" disabled={loading || !isAgreed} style={btnStyle}>
                {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
        </form>
        <p style={{...typography.body, color: colors.textSecondary, marginTop: '2rem', textAlign: 'center'}}>
            ¿Ya tienes cuenta? <button onClick={onSwitchToLogin} style={linkStyle}>Inicia Sesión</button>
        </p>
    </div>
  );
}