import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from './ThemeContext';
import { getSectionStyle, typography, common } from './styles';
import LoadingSpinner from './LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Componente ResultadoBall (Completo y correcto) ---
const ResultadoBall = ({ num, ballType, isHit }) => {
  const themeContext = useTheme();
  // Validación robusta del tema
  const currentTheme = themeContext?.currentTheme;
  const colors = currentTheme?.colors || {};
  if (!currentTheme) {
      console.error("ThemeContext no disponible en ResultadoBall");
      // Fallback visual simple si el tema no está listo
      return <div style={{display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%', background: '#eee', margin: '2px', textAlign: 'center', lineHeight: '28px', fontSize: '0.9rem'}}>{num}</div>;
  }

  let background = colors.surface || '#fff';
  let color = colors.text || '#000';
  let border = `1px solid ${colors.border || '#ccc'}`;
  let boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.1)';

  if (isHit) {
    color = '#fff';
    border = `2px solid ${colors.surface || '#fff'}`;
    boxShadow = `inset -2px -2px 3px rgba(0,0,0,0.3), 0 0 5px 1px ${colors.surface || '#fff'}`;
    switch (ballType) {
      case 'melate': background = `linear-gradient(135deg, ${common.danger} 20%, #c53030 100%)`; break;
      case 'adicional': background = common.primary; break;
      case 'revancha': background = `linear-gradient(135deg, ${common.success} 20%, #2f855a 100%)`; break;
      case 'revanchita': background = `linear-gradient(135deg, ${common.warning} 20%, #d69e2e 100%)`; color = '#1A202C'; break;
      default: background = colors.textSecondary || '#666';
    }
  }
  const ballStyle = {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '28px', height: '28px', borderRadius: '50%', fontSize: '0.9rem',
      fontWeight: 'bold', margin: '2px', lineHeight: '1', background: background,
      color: color, border: border, boxShadow: boxShadow, transition: 'all 0.2s ease',
      verticalAlign: 'middle',
   };
   return <div style={ballStyle}>{num}</div>;
};

// --- Sub-componente: Pulso ---
const VistaPulso = ({ pulseTrigger }) => {
    const { currentTheme } = useTheme();
    const colors = currentTheme?.colors || {};
    const [pulse, setPulse] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setIsLoading(true);
      const fetchPulse = async () => {
        try {
            const pulseData = await window.electronAPI.obtenerPulso();
            setPulse(Array.isArray(pulseData) ? pulseData.slice(0, 10) : []);
        } catch (error) {
            console.error("Error fetching Pulso:", error);
            setPulse([]);
        } finally {
            setIsLoading(false);
        }
      };
      fetchPulse();
    }, [pulseTrigger]);

    const itemStyle = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 15px', borderBottom: `1px solid ${colors.border || '#e0e0e0'}`,
        color: colors.text || '#000',
    };

    return (
      <div>
        <p style={{...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '0', marginBottom: '20px'}}>
          Estos son los 10 números más generados por los usuarios de Melator esta semana.
        </p>
        {isLoading ? ( <LoadingSpinner text="Cargando el pulso..." /> ) :
         pulse.length > 0 ? (
          <div> {pulse.map((item, index) => (
              <div key={item.numero} style={{...itemStyle, backgroundColor: index % 2 === 0 ? 'transparent' : (colors.lightGray || '#f0f0f0')}}>
                <span style={{fontSize: '1.2rem'}}>
                  <strong style={{color: common.primary}}>{index + 1}.</strong> El número <strong>{item.numero}</strong>
                </span>
                <span style={{...typography.small, fontWeight: 'bold', color: colors.textSecondary}}>{item.count} veces</span>
              </div> ))}
          </div> ) : ( <p style={{textAlign: 'center', color: colors.textSecondary}}>Aún no hay datos esta semana...</p> )
        }
      </div>
    );
};

// --- Sub-componente: CuadroDeHonor (Lógica de Carga/Renderizado CORREGIDA) ---
const VistaCuadroDeHonor = ({ historialMap }) => {
  const { currentTheme } = useTheme();
  const colors = currentTheme?.colors || {};
  const [victorias, setVictorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Solo para cargar victorias
  const [errorLoading, setErrorLoading] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorLoading(null);
    const fetchVictorias = async () => {
      try {
        const data = await window.electronAPI.obtenerCuadroDeHonor();
        setVictorias(
          Array.isArray(data) ? data.filter(v => v && v.combinacion && Array.isArray(v.combinacion) && v.combinacion.length === 6) : []
        );
      } catch (error) {
        console.error("Error fetching Cuadro de Honor:", error);
        setErrorLoading("No se pudo cargar el Cuadro de Honor.");
        setVictorias([]);
      } finally {
        setIsLoading(false); // isLoading solo se refiere a la carga de victorias
      }
    };
    fetchVictorias();
  }, []);

  // isHistorialReady solo indica si podemos *intentar* resaltar
  const isHistorialReady = historialMap && historialMap.size > 0;

  return (
    <div>
      <p style={{...typography.body, color: colors.textSecondary || '#666', textAlign: 'center', marginTop: '0', marginBottom: '20px'}}>
        ¡Victorias recientes obtenidas con combinaciones generadas en Melator!
      </p>
      {/* Condición de carga solo usa isLoading */}
      {isLoading ? (
        <LoadingSpinner text={"Cargando victorias..."} />
      ) : errorLoading ? (
         <p style={{textAlign: 'center', color: common.danger}}>{errorLoading}</p>
      ) : victorias.length > 0 ? (
        <div> {victorias.map((item) => {
            // Validaciones básicas del item
            if (!item || !item.concurso || !item.combinacion) return null;

            // Intentar buscar el sorteo SOLO si el historial está listo
            let sorteoOficial = null;
            if (isHistorialReady) {
                sorteoOficial = historialMap.get(item.concurso);
                if (!sorteoOficial) {
                    // Ya no mostramos warning aquí para evitar spam si stats tarda
                    // console.warn(`Sorteo oficial no encontrado para concurso ${item.concurso}. Mostrando sin resaltar.`);
                }
            }

            const userCombination = item.combinacion;
            const melateNums = sorteoOficial?.numeros || [];
            const adicional = sorteoOficial?.adicional;
            const revanchaNums = sorteoOficial?.numeros_revancha || [];
            const revanchitaNums = sorteoOficial?.numeros_revanchita || [];

            const prizeColor = item.premio.includes('Melate') ? common.danger :
                               item.premio.includes('Revancha') ? common.success :
                               item.premio.includes('Revanchita') ? common.warning :
                               common.primary;

            return (
              <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    backgroundColor: colors.surface || '#fff',
                    borderLeft: `5px solid ${prizeColor}`,
                    borderRadius: '8px', padding: '15px 20px', marginBottom: '15px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
                  }}
              >
                {/* Sección Superior */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '2rem', color: colors.textSecondary || '#666' }}>📈</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ ...typography.body, color: colors.text || '#000', margin: '0 0 5px 0', fontSize: '1rem' }}>
                      ¡Éxito! Combinación generada obtuvo:
                    </p>
                    <h4 style={{ ...typography.h4, color: prizeColor, margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {item.premio}
                    </h4>
                    <p style={{ ...typography.small, color: colors.textSecondary || '#666', margin: 0 }}>
                      Sorteo #{item.concurso} ({item.fecha})
                    </p>
                  </div>
                </div>
                {/* Sección Inferior Bolas */}
                <div style={{ borderTop: `1px dashed ${colors.border || '#ccc'}`, paddingTop: '10px', marginTop: '10px' }}>
                  <p style={{...typography.small, fontWeight: 'bold', color: colors.textSecondary || '#666', marginBottom: '5px'}}>
                    Combinación Jugada:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {userCombination.map(num => {
                      if (typeof num !== 'number') return null;
                      let isHit = false;
                      let ballType = 'default';
                      // Calcular hit SOLO si encontramos el sorteo
                      if (sorteoOficial) {
                          if (melateNums.includes(num)) { isHit = true; ballType = 'melate'; }
                          else if (num === adicional && !melateNums.includes(num)) { isHit = true; ballType = 'adicional'; }
                          else if (revanchaNums.includes(num)) { isHit = true; ballType = 'revancha'; }
                          else if (revanchitaNums.includes(num)) { isHit = true; ballType = 'revanchita'; }
                      }
                      // Si no hay sorteoOficial, isHit será false y las bolas serán blancas
                      return <ResultadoBall key={`${item.id}-${num}`} num={num} ballType={ballType} isHit={isHit} />;
                    })}
                  </div>
                </div>
              </motion.div> );
          })}
        </div> ) : ( <p style={{textAlign: 'center', color: colors.textSecondary || '#666'}}>Aún no se han reportado victorias...</p> )
      }
    </div> );
};

// --- Componente Principal: Comunidad ---
// Calcula historialMap aquí
export default function Comunidad({ pulseTrigger, stats }) {
  const { currentTheme } = useTheme();
  const colors = currentTheme?.colors || {};
  const [view, setView] = useState('honor');

  // Mover useMemo aquí
  const historialMap = useMemo(() => {
    if (!stats || !Array.isArray(stats.historial)) {
      // Ya no mostramos warning aquí, el subcomponente manejará el estado de carga
      return new Map();
    }
    try {
      // Asegurarse que cada sorteo tenga un 'concurso' antes de mapear
      const validHistorial = stats.historial.filter(s => s && s.concurso);
      return new Map(validHistorial.map(s => [s.concurso, s]));
    } catch (error) {
      console.error("Error creando historialMap en Comunidad:", error);
      return new Map();
    }
  }, [stats]); // Depende solo de stats

  const sectionStyle = getSectionStyle(colors);

  const tabStyle = (active) => ({
      ...typography.h3, fontSize: '1.2rem',
      color: active ? common.primary : (colors.textSecondary || '#666'),
      padding: '10px 20px', margin: 0, border: 'none', background: 'none', cursor: 'pointer',
      borderBottom: active ? `3px solid ${common.primary}` : `3px solid transparent`,
      transition: 'all 0.2s ease-in-out',
  });

  const pageVariants = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
  const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.3 };

  return (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text || '#000', textAlign: 'center', marginBottom: '2rem' }}>Comunidad Melator</h2>
      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', borderBottom: `1px solid ${colors.border || '#e0e0e0'}`, marginBottom: '2rem' }}>
        <button onClick={() => setView('pulso')} style={tabStyle(view === 'pulso')}>🔥 Pulso</button>
        <button onClick={() => setView('honor')} style={tabStyle(view === 'honor')}>🏆 Cuadro de Honor</button>
      </div>
      <div style={{...sectionStyle, textAlign: 'left'}}>
        <AnimatePresence mode="wait">
          <motion.div
              key={view}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
          >
            {view === 'pulso' && <VistaPulso pulseTrigger={pulseTrigger} />}
            {/* Pasamos historialMap en lugar de stats */}
            {view === 'honor' && <VistaCuadroDeHonor historialMap={historialMap} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}