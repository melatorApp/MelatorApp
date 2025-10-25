import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { getSectionStyle, getBtnStyle, getInputStyle, typography } from './styles';
import toast from 'react-hot-toast';

export default function Perfil() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNombre(userProfile.nombre || '');
      setApellidoPaterno(userProfile.apellidoPaterno || '');
      setApellidoMaterno(userProfile.apellidoMaterno || '');
      // --- MODIFICADO: Ya no se maneja 'permiteReporte' ---
    }
  }, [userProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // --- MODIFICADO: Ya no se envía 'permiteReporteAnonimo' ---
    const result = await window.electronAPI.actualizarPerfilUsuario({
        uid: currentUser.uid,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
    });

    if (result.success) {
        await refreshUserProfile();
        toast.success('¡Perfil actualizado correctamente!');
    } else {
        toast.error(result.message || 'Error al actualizar el perfil.');
    }
    setLoading(false);
  };

  const sectionStyle = { ...getSectionStyle(colors), maxWidth: '500px', margin: 'auto' };
  const btnStyle = getBtnStyle();
  const inputStyle = getInputStyle(colors);

  return (
    <div style={sectionStyle}>
        <h2 style={{...typography.h2, color: colors.text, textAlign: 'center' }}>Mi Perfil</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem'}}>

            <label style={{...typography.small, color: colors.textSecondary, marginBottom: '-10px'}}>Correo Electrónico (No se puede cambiar)</label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              style={{...inputStyle, backgroundColor: colors.lightGray, cursor: 'not-allowed'}}
            />
            <label style={{...typography.small, color: colors.textSecondary, marginBottom: '-10px'}}>Nombre(s)</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre(s)"
              required
              style={inputStyle}
            />
            <label style={{...typography.small, color: colors.textSecondary, marginBottom: '-10px'}}>Apellido Paterno</label>
            <input
              type="text"
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value)}
              placeholder="Apellido Paterno"
              required
              style={inputStyle}
            />
            <label style={{...typography.small, color: colors.textSecondary, marginBottom: '-10px'}}>Apellido Materno</label>
            <input
              type="text"
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(e.target.value)}
              placeholder="Apellido Materno"
              required
              style={inputStyle}
            />

            {/* --- MODIFICADO: Checkbox eliminado --- */}

            <button type="submit" disabled={loading} style={{...btnStyle, marginTop: '1rem'}}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </form>
    </div>
  );
}