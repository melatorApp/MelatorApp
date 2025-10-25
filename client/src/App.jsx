import React, { useEffect, useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeContext, useTheme } from './ThemeContext';
import Estadisticas from './Estadisticas';
import Generador from './Generador';
import ExploradorSorteos from './ExploradorSorteos';
import MisJugadas from './MisJugadas';
import Login from './Login';
import Registro from './Registro';
import Comunidad from './Comunidad';
import Perfil from './Perfil';
import VerificarEmail from './VerificarEmail';
import LoadingSpinner from './LoadingSpinner';
import UsuariosEnLinea from './UsuariosEnLinea';
import PantallaDePago from './PantallaDePago';
import UserMenu from './UserMenu'; // <-- 1. IMPORTAR EL NUEVO COMPONENTE
import { themes, common, typography, getBtnStyle } from './styles';

// --- COMPONENTE ENVOLTORIO ---
const AppWrapper = () => {
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('melator-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    const currentHour = new Date().getHours();
    if (currentHour < 7 || currentHour >= 19) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const currentTheme = themes[theme];

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('melator-theme', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, currentTheme }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

// --- COMPONENTES AUXILIARES ---
const HeaderMarca = () => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    const wordmarkStyle = { fontFamily: "'Righteous', cursive", fontSize: '3.5rem', fontWeight: 400, color: colors.text, margin: '10px 0 5px 0', transition: 'color 0.3s ease' };
    const sloganStyle = { ...typography.body, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.8rem', transition: 'color 0.3s ease' };
    const LogoConector = () => (
      <svg width="60" height="50" viewBox="0 0 60 50">
        <defs><linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor: '#3b82f6'}} /><stop offset="100%" style={{stopColor: '#818cf8'}} /></linearGradient></defs>
        <line x1="5" y1="45" x2="15" y2="5" stroke="url(#logoGradient)" strokeWidth="3" /><line x1="15" y1="5" x2="30" y2="30" stroke="url(#logoGradient)" strokeWidth="3" /><line x1="30" y1="30" x2="45" y2="5" stroke="url(#logoGradient)" strokeWidth="3" /><line x1="45" y1="5" x2="55" y2="45" stroke="url(#logoGradient)" strokeWidth="3" />
        <circle cx="5" cy="45" r="4" fill={colors.surface} stroke="url(#logoGradient)" strokeWidth="2"/><circle cx="15" cy="5" r="4" fill={colors.surface} stroke="url(#logoGradient)" strokeWidth="2"/><circle cx="30" cy="30" r="4" fill={colors.surface} stroke="url(#logoGradient)" strokeWidth="2"/><circle cx="45" cy="5" r="4" fill={colors.surface} stroke="url(#logoGradient)" strokeWidth="2"/><circle cx="55" cy="45" r="4" fill={colors.surface} stroke="url(#logoGradient)" strokeWidth="2"/>
      </svg>
    );
    return (<div style={{ textAlign: 'center', marginBottom: '2rem' }}><LogoConector /><h1 style={wordmarkStyle}>Melator</h1><p style={sloganStyle}>Transforma tu vida</p></div>);
};

const EstadoActualizacion = ({ ultimoSorteo, colors }) => {
    if (!ultimoSorteo) return null;
    const parseDate = (dateStr) => { const [day, month, year] = dateStr.split('/'); return new Date(year, month - 1, day); };
    const hoy = new Date();
    const fechaSorteo = parseDate(ultimoSorteo.fecha);
    const diffTime = Math.abs(hoy - fechaSorteo);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let estado = { emoji: '🟢', texto: 'Actualizado' };
    if (diffDays > 7) { estado = { emoji: '🔴', texto: 'Datos desactualizados' }; } else if (diffDays > 4) { estado = { emoji: '🟡', texto: 'Actualización pendiente' }; }
    const dia = fechaSorteo.getDate().toString().padStart(2, '0');
    const mes = fechaSorteo.toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
    const anio = fechaSorteo.getFullYear();
    const fechaFormateada = `${dia} ${mes} ${anio}`;
    const estiloContenedor = { ...typography.small, color: colors.textSecondary, position: 'fixed', top: '20px', left: '20px', backgroundColor: colors.surface, padding: '8px 15px', borderRadius: '8px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1001, transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease' };
    return (<div style={estiloContenedor}><span>{estado.emoji}</span><span>{estado.texto}:</span><strong>Sorteo #{ultimoSorteo.concurso} | {fechaFormateada}</strong></div>);
};


const firestoreTimestampToDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  const seconds = timestamp.seconds !== undefined ? timestamp.seconds : timestamp._seconds;
  const nanoseconds = timestamp.nanoseconds !== undefined ? timestamp.nanoseconds : timestamp._nanoseconds;

  if (typeof seconds === 'number' && typeof nanoseconds === 'number') {
    return new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  console.warn("No se pudo convertir el timestamp:", timestamp);
  return null;
};


function checkSubscriptionStatus(profile) {
  
  const createdAtDate = firestoreTimestampToDate(profile?.createdAt);
  const subscriptionEndDateDate = firestoreTimestampToDate(profile?.subscriptionEndDate);

  if (!profile || !createdAtDate) {
    return { status: 'expired', daysRemaining: 0 }; 
  }

  const { subscriptionStatus } = profile;
  const now = new Date();
  
  if (subscriptionStatus === 'active' && subscriptionEndDateDate) {
    if (now < subscriptionEndDateDate) {
      const diffTime = subscriptionEndDateDate.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { status: 'active', daysRemaining: days };
    }
    return { status: 'expired', daysRemaining: 0 };
  }

  if (subscriptionStatus === 'trial') {
    const trialEndDate = new Date(createdAtDate.getTime());
    trialEndDate.setDate(trialEndDate.getDate() + 7); // Añade 7 días

    if (now < trialEndDate) {
      const diffTime = trialEndDate.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { status: 'trial', daysRemaining: days };
    }
    return { status: 'expired', daysRemaining: 0 };
  }

  return { status: 'expired', daysRemaining: 0 };
}


function App() {
  const { 
    currentUser, 
    userProfile, 
    loading: authLoading, 
    loadingProfile, 
    logout 
  } = useAuth();
  
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { colors } = currentTheme;

  const [stats, setStats] = useState(null);
  const [view, setView] = useState('generador');
  const [authView, setAuthView] = useState('login');
  const [jugadas, setJugadas] = useState([]);
  const [isLoadingJugadas, setIsLoadingJugadas] = useState(true);
  const [pulseTrigger, setPulseTrigger] = useState(0); 
  const [generadorState, setGeneradorState] = useState({
    combinacion: [],
    analisis: null,
    histCoincidencias: [],
    tipoJugada: 6,
    inputValue: '',
    criterios: { sumaMin: '', sumaMax: '', parImpar: 'any', bajosAltos: 'any', decenas: 'any', gaps: 'any' }
  });

  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    window.electronAPI.onUpdateAvailable(() => {
      toast('¡Nueva versión encontrada! Descargando en segundo plano...');
    });
    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateReady(true);
      toast.success('¡Actualización lista para instalar!');
    });
  }, []);

  const appContainerStyle = { fontFamily: "'Inter', sans-serif", backgroundColor: colors.background, color: colors.text, minHeight: '100vh', transition: 'background-color 0.3s ease, color 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const btnStyle = getBtnStyle();
  const menuBtn = active => ({...btnStyle, background: active ? common.primaryGradient : colors.lightGray, color: active ? '#fff' : colors.text, boxShadow: active ? btnStyle.boxShadow : 'none'});

  const handlePulseUpdate = () => {
    setPulseTrigger(prev => prev + 1);
  };

  const fetchJugadas = useCallback(async () => {
    if (currentUser) {
      setIsLoadingJugadas(true);
      const userPlays = await window.electronAPI.obtenerJugadas(currentUser.uid);
      
      const sortedPlays = userPlays.sort((a, b) => {
        const aEsPendiente = a.status === 'pendiente';
        const bEsPendiente = b.status === 'pendiente';
        if (aEsPendiente && !bEsPendiente) return -1;
        if (!aEsPendiente && bEsPendiente) return 1;
        if (aEsPendiente && bEsPendiente) return b.id - a.id;
        const concursoA = parseInt(a.concurso);
        const concursoB = parseInt(b.concurso);
        if (concursoA !== concursoB) return concursoB - concursoA;
        return b.id - a.id;
      });

      setJugadas(sortedPlays);
      setIsLoadingJugadas(false);
    }
  }, [currentUser]);

  useEffect(() => {
    window.electronAPI.obtenerEstadisticas().then(data => {
        if (data) {
            setStats(data);
        } else {
            console.error("No se pudieron cargar las estadísticas desde el backend.");
        }
    });
    
    if (currentUser) {
      fetchJugadas();
    }
  }, [currentUser, fetchJugadas]);

  if (authLoading || loadingProfile || !stats) {
    const loadingText = (authLoading || loadingProfile) ? "Iniciando Melator..." : "Cargando estadísticas...";
    return <div style={{...appContainerStyle, justifyContent: 'center'}}><LoadingSpinner text={loadingText} /></div>;
  }

  if (!currentUser) {
    return (
      <div style={{...appContainerStyle, justifyContent: 'center'}}>
        <Toaster />
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button onClick={toggleTheme} title="Cambiar Tema" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <HeaderMarca />
        {authView === 'login' 
          ? <Login onSwitchToRegister={() => setAuthView('register')} /> 
          : <Registro onSwitchToLogin={() => setAuthView('login')} />
        }
      </div>
    );
  }
  
  if (!currentUser.emailVerified) {
    return (
      <div style={{...appContainerStyle, justifyContent: 'center'}}>
        <Toaster />
        <HeaderMarca />
        <VerificarEmail />
      </div>
    );
  }

  // --- LÓGICA DE PAYWALL (Ahora segura) ---
  const subscription = checkSubscriptionStatus(userProfile);

  if (subscription.status === 'expired') {
    return (
      <div style={{...appContainerStyle, justifyContent: 'center'}}>
        <Toaster />
        <PantallaDePago />
      </div>
    );
  }
  
  const ultimoSorteo = stats.historial ? stats.historial[0] : null;
  const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };
  const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.4 };
  const diasStr = subscription.daysRemaining === 1 ? 'día' : 'días';

  return (
    <div style={{...appContainerStyle, justifyContent: 'flex-start', padding: '2rem'}}>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={{width: '100%', maxWidth: '1200px', flex: 1, position: 'relative'}}>
        
        {updateReady && (
          <div style={{padding: '10px', background: common.success, color: 'white', textAlign: 'center', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>¡Una nueva versión de Melator está lista!</span>
            <button 
              onClick={() => window.electronAPI.restartApp()}
              style={{...btnStyle, background: 'white', color: common.success, boxShadow: 'none', marginLeft: '20px'}}
            >
              Reiniciar y Actualizar
            </button>
          </div>
        )}

        <div style={{
          ...typography.small, 
          color: subscription.status === 'trial' ? common.warning : colors.textSecondary, 
          textAlign: 'center', 
          marginBottom: '1rem', 
          fontWeight: 'bold',
          padding: '8px',
          borderRadius: '6px',
          background: subscription.status === 'trial' ? `${common.warning}20` : `${colors.lightGray}`
        }}>
          {subscription.status === 'trial' 
            ? `MODO DE PRUEBA: Te quedan ${subscription.daysRemaining} ${diasStr}.`
            : `Suscripción activa. Vence en ${subscription.daysRemaining} ${diasStr}.`
          }
        </div>

        {/* --- INICIO DE LA SECCIÓN MODIFICADA --- */}
        <div style={{ position: 'absolute', top: updateReady ? '60px' : 0, right: 0, display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1001 }}>
          
          {/* Le pasamos setView (la función para cambiar de vista) para que el botón "Perfil" funcione */}
          <UserMenu
            userProfile={userProfile}
            currentUser={currentUser}
            logout={logout}
            toggleTheme={toggleTheme}
            theme={theme}
            onNavigate={setView}
          />

        </div>
        {/* --- FIN DE LA SECCIÓN MODIFICADA --- */}
        
        <HeaderMarca />

        {/* --- ✨ INICIO BLOQUE CORREGIDO ✨ --- */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '1.5rem 0', flexWrap: 'wrap' }}>
          <button onClick={() => setView('generador')} style={menuBtn(view === 'generador')}>Generador</button>
          <button onClick={() => setView('jugadas')} style={menuBtn(view === 'jugadas')}>Mis Jugadas</button>
          <button onClick={() => setView('comunidad')} style={menuBtn(view === 'comunidad')}>Comunidad</button>
          <button onClick={() => setView('explorador')} style={menuBtn(view === 'explorador')}>Explorador</button>
          <button onClick={() => setView('estadisticas')} style={menuBtn(view === 'estadisticas')}>Estadísticas</button>
        </div>
        {/* --- ✨ FIN BLOQUE CORREGIDO ✨ --- */}

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{width: '100%', margin: '2rem auto'}}
          >
            {view === 'estadisticas' && <Estadisticas stats={stats} />}
            {view === 'generador' && <Generador 
                                        stats={stats} 
                                        ultimoSorteo={ultimoSorteo} 
                                        onJugadaGuardada={fetchJugadas} 
                                        onPulseUpdate={handlePulseUpdate}
                                        persistentState={generadorState}
                                        setPersistentState={setGeneradorState}
                                      />}
            {view === 'explorador' && <ExploradorSorteos stats={stats} />}
            {view === 'jugadas' && <MisJugadas stats={stats} jugadas={jugadas} isLoading={isLoadingJugadas} onRefresh={fetchJugadas} />}
            {view === 'comunidad' && <Comunidad pulseTrigger={pulseTrigger} stats={stats} />}
            {view === 'perfil' && <Perfil />}
          </motion.div>
        </AnimatePresence>
        
        {ultimoSorteo && <EstadoActualizacion ultimoSorteo={ultimoSorteo} colors={colors} />}
      </div>
    </div>
  );
}

export default AppWrapper;