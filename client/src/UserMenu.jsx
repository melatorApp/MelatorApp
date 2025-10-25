import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { 
  getHamburgerBtnStyle, 
  getHamburgerIconLineStyle, 
  getDropdownMenuStyle, 
  getDropdownMenuItemStyle,
  getDropdownItemDivStyle,
  getDropdownSeparatorStyle
} from './styles'; // Importaremos los nuevos estilos
import UsuariosEnLinea from './UsuariosEnLinea';
import { motion, AnimatePresence } from 'framer-motion';

// Icono de 3 líneas reutilizable
const HamburgerIcon = () => {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const lineStyle = getHamburgerIconLineStyle(colors);
  return (
    <>
      <div style={lineStyle}></div>
      <div style={lineStyle}></div>
      <div style={lineStyle}></div>
    </>
  );
};

export default function UserMenu({ userProfile, currentUser, logout, toggleTheme, theme, onNavigate }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null); // Referencia para detectar clics fuera

  // --- ✨ 1. NUEVO ESTADO PARA LA VERSIÓN ---
  const [appVersion, setAppVersion] = useState('');

  // Efecto para cerrar el menú si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // --- ✨ 2. NUEVO EFECTO PARA OBTENER LA VERSIÓN ---
  useEffect(() => {
    window.electronAPI.getAppVersion().then(version => {
      setAppVersion(version);
    });
  }, []); // Se ejecuta solo una vez al montar

  const handleToggle = () => setIsOpen(prev => !prev);

  // Navega a la vista (ej. 'perfil') y cierra el menú
  const handleNavigate = (view) => {
    onNavigate(view);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const btnStyle = getHamburgerBtnStyle(colors);
  const menuStyle = getDropdownMenuStyle(colors);
  const itemStyle = getDropdownMenuItemStyle(colors);

  // Variantes para la animación del desplegable
  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* El Botón de 3 Líneas */}
      <button 
        onClick={handleToggle} 
        style={{...btnStyle, background: isOpen ? colors.lightGray : 'transparent' }}
        title="Menú de usuario"
      >
        <HamburgerIcon />
      </button>

      {/* Menú Desplegable con Animación */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            style={menuStyle}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={dropdownVariants}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* Saludo y Correo */}
            <div style={{...getDropdownItemDivStyle(colors), paddingLeft: '16px', paddingBottom: '8px', paddingTop: '8px'}}>
              <div style={{display: 'flex', flexDirection: 'column'}}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  {userProfile?.nombre || 'Usuario'}
                </span>
                <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div style={getDropdownSeparatorStyle(colors)}></div>

            {/* Botón de Perfil */}
            <button style={itemStyle} onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => handleNavigate('perfil')}>
              <span style={{fontSize: '1.2rem'}}>👤</span>
              <span>Mi Perfil</span>
            </button>

            {/* Botón de Tema */}
            <button style={itemStyle} onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={toggleTheme}>
              <span style={{fontSize: '1.2rem'}}>{theme === 'light' ? '🌙' : '☀️'}</span>
              <span>Tema {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
            </button>

            {/* Usuarios en línea (integrado) */}
            <div style={{...getDropdownItemDivStyle(colors), padding: '12px 16px', cursor: 'default'}} >
                <UsuariosEnLinea />
            </div>

            <div style={getDropdownSeparatorStyle(colors)}></div>

            {/* Botón de Salir */}
            <button style={itemStyle} onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={handleLogout}>
              <span style={{fontSize: '1.2rem'}}>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
            
            {/* --- ✨ 3. NUEVA SECCIÓN DE VERSIÓN --- */}
            <div style={getDropdownSeparatorStyle(colors)}></div>
            <div style={{...getDropdownItemDivStyle(colors), padding: '8px 16px', cursor: 'default', justifyContent: 'center'}}>
              <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Melator v{appVersion}
              </span>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}