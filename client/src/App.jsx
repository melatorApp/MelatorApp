import React, { useEffect, useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeContext, useTheme } from './ThemeContext';
import Estadisticas from './Estadisticas';
import Generador from './Generador';
import Comprobador from './Comprobador';
import MisJugadas from './MisJugadas';
import Login from './Login';
import Registro from './Registro';
import PulsoMelator from './PulsoMelator';
import VerificarEmail from './VerificarEmail';
import LoadingSpinner from './LoadingSpinner';
import UsuariosEnLinea from './UsuariosEnLinea';
import { themes, common, typography, getBtnStyle } from './styles';

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

function App() {
  const { currentUser, loading: authLoading, logout } = useAuth();
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
      setJugadas(userPlays);
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

  if (authLoading || !stats) {
    return <div style={{...appContainerStyle, justifyContent: 'center'}}><LoadingSpinner text={authLoading ? "Iniciando Melator..." : "Cargando estadísticas..."} /></div>;
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}><h1>Melator v1.0.2</h1></div>
        {authView === 'login' 
          ? <Login onSwitchToRegister={() => setAuthView('register')} /> 
          : <Registro onSwitchToLogin={() => setAuthView('login')} />
        }
      </div>
    );
  }
  
  const ultimoSorteo = stats.historial ? stats.historial[0] : null;
  const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };
  const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.4 };

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

        <div style={{ position: 'absolute', top: updateReady ? '60px' : 0, right: 0, display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1001 }}>
          <UsuariosEnLinea />
          <span style={{...typography.small, color: colors.textSecondary}}>Hola, {currentUser.email}</span>
          <button onClick={logout} title="Cerrar Sesión" style={{...btnStyle, padding: '8px 15px', background: colors.lightGray, color: colors.text, boxShadow: 'none'}}>Salir 🚪</button>
          <button onClick={toggleTheme} title="Cambiar Tema" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}><h1>Melator</h1></div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
          <button onClick={() => setView('generador')} style={menuBtn(view === 'generador')}>Generador</button>
          <button onClick={() => setView('jugadas')} style={menuBtn(view === 'jugadas')}>Mis Jugadas</button>
          <button onClick={() => setView('pulso')} style={menuBtn(view === 'pulso')}>🔥 Pulso</button>
          <button onClick={() => setView('comprobador')} style={menuBtn(view === 'comprobador')}>Verificador</button>
          <button onClick={() => setView('estadisticas')} style={menuBtn(view === 'estadisticas')}>Estadísticas</button>
        </div>

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
            {view === 'comprobador' && <Comprobador stats={stats} />}
            {view === 'jugadas' && <MisJugadas stats={stats} jugadas={jugadas} isLoading={isLoadingJugadas} onRefresh={fetchJugadas} />}
            {view === 'pulso' && <PulsoMelator pulseTrigger={pulseTrigger} />}
          </motion.div>
        </AnimatePresence>
        
      </div>
    </div>
  );
}

export default AppWrapper;