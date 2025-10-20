import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { typography } from './styles';
import { ref, onValue } from 'firebase/database';
import { database } from './AuthContext';

export default function UsuariosEnLinea() {
  const { currentTheme } = useTheme();
  // Si currentTheme es undefined, usamos un objeto vacío para evitar el crash
  const colors = currentTheme?.colors || {};
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const statusRef = ref(database, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const statuses = snapshot.val();
        const onlineUsers = Object.values(statuses).filter(status => status.state === 'online');
        setOnlineCount(onlineUsers.length);
      } else {
        setOnlineCount(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const style = {
    ...typography.small,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: '4px 8px',
    borderRadius: '6px',
    border: `1px solid ${colors.border || '#e0e0e0'}`
  };

  const onlineDotStyle = {
    width: '8px',
    height: '8px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    boxShadow: '0 0 5px #22c55e',
  };

  return (
    <div style={style}>
      <div style={onlineDotStyle}></div>
      <span>{onlineCount} en línea</span>
    </div>
  );
}