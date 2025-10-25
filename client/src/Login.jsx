import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
// --- MODIFICADO: Importamos 'common' de los estilos ---
import { getSectionStyle, getBtnStyle, getInputStyle, typography, common } from './styles';
import toast from 'react-hot-toast';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      toast.error(result.message || 'Error al iniciar sesión.');
    }
    setLoading(false);
  };

  const sectionStyle = { ...getSectionStyle(colors), maxWidth: '400px', margin: 'auto' };
  const inputStyle = getInputStyle(colors);
  const btnStyle = getBtnStyle();
  
  // --- MODIFICADO: Usamos 'common.primary' en lugar de 'colors.primary' ---
  const linkStyle = {
    background: 'none',
    border: 'none',
    color: common.primary, // <-- Esta es la corrección
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'Inter', sans-serif",
  };
  // --- FIN DE LA MODIFICACIÓN ---

  return (
    <div style={sectionStyle}>
      <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center' }}>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          required
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p style={{ ...typography.small, color: colors.textSecondary, marginTop: '1.5rem', textAlign: 'center' }}>
        ¿No tienes una cuenta?{' '}
        <button onClick={onSwitchToRegister} style={linkStyle}>
          Regístrate aquí
        </button>
      </p>
    </div>
  );
}