// --- src/styles.js ---

const lightColors = {
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#212529',
  textSecondary: '#6c757d',
  border: '#dee2e6',
  lightGray: '#e9ecef'
};

const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#e0e0e0',
  textSecondary: '#888888',
  border: '#333333',
  lightGray: '#2c2c2c'
};

export const themes = {
  light: { colors: lightColors },
  dark: { colors: darkColors }
};

export const common = {
  primary: '#0d6efd',
  primaryGradient: 'linear-gradient(90deg, #3b82f6, #6366f1)',
  success: '#198754',
  danger: '#dc3545',
  warning: '#ffc107',
};

export const typography = {
  fontFamily: "'Inter', sans-serif",
  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
  h3: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 },
  h4: { fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.3 },
  body: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
  small: { fontSize: '0.875rem' },
};

export const getSectionStyle = (colors) => ({
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: '12px',
  padding: '25px',
  marginBottom: '30px',
  textAlign: 'center',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
});

export const getBtnStyle = () => ({
  fontFamily: typography.fontFamily,
  fontWeight: 500,
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  color: '#fff',
  background: common.primaryGradient,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
});

export const getInputStyle = (colors) => ({
  fontFamily: typography.fontFamily,
  fontSize: '1rem',
  padding: '10px 14px',
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text,
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease, color 0.3s ease',
});

export const getThTd = (colors) => ({
  border: `1px solid ${colors.border}`,
  padding: '12px',
  textAlign: 'center',
  verticalAlign: 'middle'
});

export const getTableHeader = (colors) => ({
  ...getThTd(colors),
  backgroundColor: colors.lightGray,
  color: colors.text,
  fontWeight: 'bold',
});

// --- ✨ CÓDIGO NUEVO AÑADIDO AL FINAL ---

export const getHamburgerBtnStyle = (colors) => ({
  background: 'none',
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  width: '40px',
  height: '40px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  alignItems: 'center',
  padding: '8px 6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
});

export const getHamburgerIconLineStyle = (colors) => ({
  width: '20px',
  height: '2px',
  backgroundColor: colors.text,
  borderRadius: '1px',
});

export const getDropdownMenuStyle = (colors) => ({
  position: 'absolute',
  top: 'calc(100% + 10px)', // 10px debajo del botón
  right: 0,
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: '12px',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
  zIndex: 1010,
  width: '250px',
  overflow: 'hidden',
  padding: '8px 0',
});

// Estilo para items clickeables (botones)
export const getDropdownMenuItemStyle = (colors) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'none',
  border: 'none',
  width: '100%',
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.95rem',
  color: colors.text,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
});

// Estilo para items no clickeables (divs)
export const getDropdownItemDivStyle = (colors) => ({
    ...getDropdownMenuItemStyle(colors),
    cursor: 'default',
});

// Estilo para la línea separadora
export const getDropdownSeparatorStyle = (colors) => ({
    height: '1px',
    background: colors.border,
    margin: '8px 0',
});