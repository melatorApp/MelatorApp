import React from 'react';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { getSectionStyle, getBtnStyle, typography, common } from './styles';
import toast from 'react-hot-toast';

// Un encabezado simple para mantener la marca
const SimpleHeader = ({ colors }) => (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ ...typography.h1, fontFamily: "'Righteous', cursive", color: colors.text, fontSize: '3.5rem', fontWeight: 400, margin: '10px 0' }}>
            Melator
        </h1>
        <p style={{ ...typography.body, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.8rem' }}>
            Acceso Pro
        </p>
    </div>
);

export default function PantallaDePago() {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { currentUser, logout } = useAuth();

  // Estilos del componente
  const mainContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '2rem',
    backgroundColor: colors.background,
    transition: 'background-color 0.3s ease'
  };

  const contentBoxStyle = {
    ...getSectionStyle(colors),
    width: '100%',
    maxWidth: '500px',
    textAlign: 'center'
  };
  
  const btnStyle = getBtnStyle();
  const logoutBtnStyle = { 
    ...btnStyle, 
    background: colors.lightGray, 
    color: colors.text, 
    boxShadow: 'none', 
    marginTop: '1.5rem',
    fontSize: '0.9rem'
  };

  /**
   * Esta función abre el navegador externo del usuario y lo dirige
   * a tu página de checkout (Stripe, Mercado Pago, etc.)
   */
  const handlePagar = () => {
    if (!currentUser || !currentUser.uid) {
      toast.error('Error: No se pudo identificar al usuario. Por favor, reinicia la app.');
      return;
    }
    
    // --- ¡IMPORTANTE! ---
    // Esta es la URL de tu "Payment Link" de Stripe.
    // Le añadimos el "?client_reference_id=" para que Stripe sepa
    // qué usuario está pagando.
    // --- CORRECCIÓN AQUÍ ---
    const paymentUrl = `https://buy.stripe.com/test_9B6aEQ9Ykb8LdRY1LW1RC00?client_reference_id=${currentUser.uid}`;
    // ---------------------------------------------

    try {
      window.electronAPI.openExternalUrl(paymentUrl);
      toast.success('Abriendo portal de pago en tu navegador...');
    } catch (error) {
      toast.error('No se pudo abrir el navegador.');
      console.error("Error al abrir URL externa:", error);
    }
  };

  return (
    <div style={mainContainerStyle}>
      <SimpleHeader colors={colors} />
      <div style={contentBoxStyle}>
        
        <h2 style={{ ...typography.h2, color: colors.text, marginTop: 0 }}>
          Tu acceso ha expirado
        </h2>
        
        <p style={{ ...typography.body, color: colors.textSecondary, lineHeight: 1.6 }}>
          ¡Gracias por probar Melator! Tu periodo de prueba de 7 días ha terminado o tu suscripción mensual ha vencido.
        </p>
        
        <p style={{ ...typography.body, color: colors.text, lineHeight: 1.6, marginTop: '20px' }}>
          Para continuar analizando y generando jugadas inteligentes, por favor activa tu suscripción Pro.
        </p>

        {/* Sección de Precio */}
        <div style={{ margin: '2.5rem 0' }}>
          <span style={{ ...typography.h1, color: common.primary, fontSize: '3rem', fontWeight: 600 }}>
            $39
          </span>
          <span style={{ ...typography.body, color: colors.textSecondary, marginLeft: '8px' }}>
            MXN / mes
          </span>
        </div>

        {/* Botón de Pago */}
        <button onClick={handlePagar} style={{ ...btnStyle, width: '100%', padding: '15px 10px', fontSize: '1.1rem' }}>
          Suscribirme Ahora
        </button>
        
        {/* Instrucción CRÍTICA */}
        <p style={{ ...typography.small, color: colors.textSecondary, marginTop: '1.5rem', fontStyle: 'italic', lineHeight: 1.5 }}>
          Serás redirigido a nuestro portal de pago seguro.
          <br/>
          <strong>Después de pagar, por favor reinicia la aplicación</strong> para activar tu acceso.
        </p>
        
        {/* Botón de Salida */}
        <button onClick={logout} style={logoutBtnStyle}>
          Cerrar Sesión
        </button>
        
      </div>
    </div>
  );
}