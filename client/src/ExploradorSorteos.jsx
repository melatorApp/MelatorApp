import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from './ThemeContext';
import { getSectionStyle, getInputStyle, getBtnStyle, typography, common } from './styles';
import toast from 'react-hot-toast';
import BolasSorteo from './BolasSorteo';
import AnalisisGauge from './AnalisisGauge';
import LoadingSpinner from './LoadingSpinner';

const ITEMS_PER_PAGE = 10;

// --- Lógica de Premios (Melate) ---
const premiosMapMelate = {
  '6': '1er Lugar (Melate)',
  '5+1': '2do Lugar',
  '5': '3er Lugar',
  '4+1': '4to Lugar',
  '4': '5to Lugar',
  '3+1': '6to Lugar',
  '3': '7to Lugar',
  '2+1': '8to Lugar',
  '2': '9to Lugar',
};

const getPremioMelate = (naturales, adicional) => {
  const usaAdicional = adicional && (naturales >= 2 && naturales <= 5);
  const key = naturales + (usaAdicional ? '+1' : '');
  return {
    lugar: premiosMapMelate[key] || 'Sin Premio',
    aciertos: `${naturales} Naturales` + (usaAdicional ? ' + 1 Adicional' : '')
  };
};

// --- Lógica de Premios (Revancha y Revanchita) ---
const getPremioRevancha = (naturales) => {
  if (naturales === 6) return '1er Lugar (Revancha)';
  return 'Sin Premio';
};

const getPremioRevanchita = (naturales) => {
  if (naturales === 6) return '1er Lugar (Revanchita)';
  return 'Sin Premio';
};

// --- Helper de Fecha ---
const formatInputDate = (dateString) => { // Convierte YYYY-MM-DD a DD/MM/YYYY
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};


export default function ExploradorSorteos({ stats }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const sectionStyle = getSectionStyle(colors);
  const inputStyle = getInputStyle(colors);
  const btnStyle = getBtnStyle();

  const [sorteoSeleccionado, setSorteoSeleccionado] = useState(null);
  const [jugadaUsuario, setJugadaUsuario] = useState(Array(6).fill(''));
  const [concursoInput, setConcursoInput] = useState('');

  const [filtroConcurso, setFiltroConcurso] = useState('');
  const [filtroNumero, setFiltroNumero] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const historial = stats?.historial || [];
  const analisisAvanzado = stats?.analisisAvanzado || {};

  useEffect(() => {
    if (historial.length > 0) {
      setSorteoSeleccionado(historial[0]);
    }
  }, [historial]);

  // --- Lógica de Verificación ---
  const handleJugadaInputChange = (index, value) => {
    if (/^\d*$/.test(value) && value.length <= 2) {
      const nuevaJugada = [...jugadaUsuario];
      nuevaJugada[index] = value;
      setJugadaUsuario(nuevaJugada);
    }
  };

  const handleVerificarConcurso = () => {
    if (!concursoInput) {
      setSorteoSeleccionado(historial[0]);
      return;
    }
    const encontrado = historial.find(s => s.concurso === concursoInput);
    if (encontrado) {
      setSorteoSeleccionado(encontrado);
      toast.success(`Mostrando análisis del sorteo #${concursoInput}`);
    } else {
      toast.error(`Sorteo #${concursoInput} no encontrado.`);
    }
  };

  // --- Lógica de Historial ---
  const sorteosFiltrados = useMemo(() => {
    const fechaFormateada = formatInputDate(filtroFecha);
    return historial.filter(sorteo => {
      const matchConcurso = filtroConcurso ? sorteo.concurso.includes(filtroConcurso) : true;
      // Ahora revisa los 3 sets de números
      const numBuscado = parseInt(filtroNumero, 10);
      const matchNumero = filtroNumero ? (
           (sorteo.numeros && sorteo.numeros.includes(numBuscado))
        || (sorteo.numeros_revancha && sorteo.numeros_revancha.includes(numBuscado))
        || (sorteo.numeros_revanchita && sorteo.numeros_revanchita.includes(numBuscado))
      ) : true;
      const matchFecha = fechaFormateada ? sorteo.fecha === fechaFormateada : true;
      return matchConcurso && matchNumero && matchFecha;
    });
  }, [historial, filtroConcurso, filtroNumero, filtroFecha]);

  const totalPaginas = Math.ceil(sorteosFiltrados.length / ITEMS_PER_PAGE);
  const sorteosPaginados = sorteosFiltrados.slice(
    (paginaActual - 1) * ITEMS_PER_PAGE,
    paginaActual * ITEMS_PER_PAGE
  );

  const handleSelectSorteo = (sorteo) => {
    setSorteoSeleccionado(sorteo);
    window.scrollTo(0, 0); 
  };

  // --- Datos para Análisis de Melate ---
  const analisisSorteo = useMemo(() => {
    if (!sorteoSeleccionado) return null;
    const { numeros } = sorteoSeleccionado; // Análisis estadístico solo sobre Melate
    if (!numeros || numeros.length === 0) return { suma: 0, pares: 0, bajos: 0 };
    const suma = numeros.reduce((a, b) => a + b, 0);
    const pares = numeros.filter(n => n % 2 === 0).length;
    const bajos = numeros.filter(n => n <= 28).length;
    return {
      suma,
      pares,
      bajos,
    };
  }, [sorteoSeleccionado]);

  const jugadaUsuarioNum = jugadaUsuario.map(n => parseInt(n, 10)).filter(n => n > 0 && n <= 56);

  // --- Cálculo de TODOS los premios ---
  const resultadoJugada = useMemo(() => {
    if (jugadaUsuarioNum.length !== 6 || !sorteoSeleccionado) {
      return { melate: null, revancha: null, revanchita: null };
    }
    
    const { 
      numeros: ganadoresMelate = [], 
      adicional: adicionalMelate, 
      numeros_revancha: ganadoresRevancha = [],
      numeros_revanchita: ganadoresRevanchita = []
    } = sorteoSeleccionado;
    
    // Melate
    const naturalesMelate = jugadaUsuarioNum.filter(n => ganadoresMelate.includes(n)).length;
    const adicionalAcertado = jugadaUsuarioNum.includes(adicionalMelate) && !ganadoresMelate.includes(adicionalMelate);
    const premioMelate = getPremioMelate(naturalesMelate, adicionalAcertado);
    
    // Revancha
    const naturalesRevancha = ganadoresRevancha.length > 0 
        ? jugadaUsuarioNum.filter(n => ganadoresRevancha.includes(n)).length 
        : 0;
    const premioRevancha = getPremioRevancha(naturalesRevancha);

    // Revanchita
    const naturalesRevanchita = ganadoresRevanchita.length > 0
        ? jugadaUsuarioNum.filter(n => ganadoresRevanchita.includes(n)).length
        : 0;
    const premioRevanchita = getPremioRevanchita(naturalesRevanchita);
    
    return { 
      melate: premioMelate, 
      revancha: { lugar: premioRevancha, aciertos: `${naturalesRevancha} Naturales` }, 
      revanchita: { lugar: premioRevanchita, aciertos: `${naturalesRevanchita} Naturales` }
    };
    
  }, [jugadaUsuarioNum, sorteoSeleccionado]);

  if (!stats || !sorteoSeleccionado) {
    return <div style={sectionStyle}><LoadingSpinner text="Cargando explorador..." /></div>;
  }
  
  const { rangoIdeal: sumaIdeal } = analisisAvanzado.statsSuma || { rangoIdeal: [140, 200] };

  // --- Componente de renderizado de premio ---
  const PremioDisplay = ({ juego, resultado, color }) => {
    if (!resultado || jugadaUsuarioNum.length !== 6) return null;
    
    const esGanador = resultado.lugar !== 'Sin Premio';
    const bgColor = esGanador ? color : `${common.danger}20`;
    const textColor = esGanador ? color : common.danger;

    return (
      <div style={{textAlign: 'center', padding: '12px', borderRadius: '8px', background: `${bgColor}${esGanador ? '20' : ''}`}}>
        <strong style={{...typography.h4, color: textColor, margin: 0, fontSize: '1.1rem'}}>
          {esGanador ? `🏆 ${resultado.lugar}` : `Sin Premio (${juego})`}
        </strong>
        <p style={{...typography.body, color: colors.text, margin: '5px 0 0 0', fontSize: '0.9rem'}}>
          {resultado.aciertos}
        </p>
      </div>
    );
  };

  return (
    <div style={{...sectionStyle, padding: 0, background: 'none', boxShadow: 'none'}}>
      <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center' }}>Explorador de Sorteos</h2>
      
      {/* --- SECCIÓN 1: VERIFICACIÓN --- */}
      <div style={{...sectionStyle, marginBottom: '2rem'}}>
        <h3 style={{...typography.h3, color: colors.text, textAlign: 'center', marginTop: 0}}>Verifica tu Jugada</h3>
        <p style={{...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '-10px', marginBottom: '25px'}}>
          Introduce tus 6 números y un concurso para ver tu resultado al instante.
        </p>
        <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px'}}>
          {jugadaUsuario.map((val, i) => (
            <input
              key={i}
              type="tel"
              value={val}
              onChange={(e) => handleJugadaInputChange(i, e.target.value)}
              maxLength="2"
              style={{...inputStyle, width: '50px', textAlign: 'center', fontSize: '1.4rem', padding: '10px 5px'}}
            />
          ))}
        </div>
        <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
          <input
            type="tel"
            value={concursoInput}
            onChange={(e) => setConcursoInput(e.target.value)}
            placeholder={`Ej: ${historial[0].concurso}`}
            style={{...inputStyle, width: '180px'}}
          />
          <button onClick={handleVerificarConcurso} style={btnStyle}>Verificar</button>
        </div>
      </div>

      {/* --- SECCIÓN 2: ANÁLISIS VISUAL A FONDO --- */}
      <div style={{...sectionStyle, marginBottom: '2rem'}}>
        <h3 style={{...typography.h3, color: colors.text, textAlign: 'center', marginTop: 0}}>
          Sorteo a Fondo: #{sorteoSeleccionado.concurso}
        </h3>
        <p style={{...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '-10px', marginBottom: '25px'}}>
          Fecha del sorteo: {sorteoSeleccionado.fecha}
        </p>
        
        {/* --- ✨ MODIFICADO --- */}
        <BolasSorteo 
          sorteo={sorteoSeleccionado}
          userNumeros={jugadaUsuarioNum}
        />

        {/* --- ✨ MODIFICADO: Mostrar resultados de premios --- */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px', marginBottom: '10px'}}>
          <PremioDisplay juego="Melate" resultado={resultadoJugada.melate} color={common.danger} />
          {sorteoSeleccionado.numeros_revancha?.length === 6 && (
            <PremioDisplay juego="Revancha" resultado={resultadoJugada.revancha} color={common.success} />
          )}
          {sorteoSeleccionado.numeros_revanchita?.length === 6 && (
            <PremioDisplay juego="Revanchita" resultado={resultadoJugada.revanchita} color={common.warning} />
          )}
        </div>
        
        {/* --- Análisis Estadístico (solo de Melate) --- */}
        {analisisSorteo && analisisSorteo.suma > 0 && (
          <div style={{marginTop: '30px'}}>
            <h4 style={{...typography.h4, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px'}}>Análisis Estadístico (Solo Melate)</h4>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', justifyContent: 'center'}}>
              <AnalisisGauge
                label="Suma Total"
                value={analisisSorteo.suma}
                min={sumaIdeal[0] - 30}
                max={sumaIdeal[1] + 30}
                idealMin={sumaIdeal[0]}
                idealMax={sumaIdeal[1]}
              />
              <AnalisisGauge
                label="Pares"
                value={analisisSorteo.pares}
                min={0} max={6}
                idealMin={2} idealMax={4}
              />
              <AnalisisGauge
                label="Bajos (1-28)"
                value={analisisSorteo.bajos}
                min={0} max={6}
                idealMin={2} idealMax={4}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- SECCIÓN 3: HISTORIAL DE SORTEOS --- */}
      <div style={sectionStyle}>
        <h3 style={{...typography.h3, color: colors.text, textAlign: 'center', marginTop: 0}}>Historial de Sorteos</h3>
        <div style={{display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
          <input
            type="tel"
            value={filtroConcurso}
            onChange={(e) => setFiltroConcurso(e.target.value)}
            placeholder="Buscar por concurso..."
            style={inputStyle}
          />
          <input
            type="tel"
            value={filtroNumero}
            onChange={(e) => setFiltroNumero(e.target.value)}
            placeholder="Contiene el número..."
            style={{...inputStyle, width: '180px'}}
          />
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            style={{...inputStyle, width: '180px', colorScheme: currentTheme.theme === 'dark' ? 'dark' : 'light'}}
          />
        </div>

        {/* --- Lista de Sorteos (Solo muestra Melate para simpleza) --- */}
        <div style={{overflowX: 'auto', marginBottom: '20px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: `2px solid ${colors.border}`}}>
                <th style={{padding: '12px', color: colors.textSecondary, textAlign: 'left'}}>Concurso</th>
                <th style={{padding: '12px', color: colors.textSecondary, textAlign: 'left'}}>Fecha</th>
                <th style={{padding: '12px', color: colors.textSecondary, textAlign: 'left'}}>Números (Melate)</th>
              </tr>
            </thead>
            <tbody>
              {sorteosPaginados.map(sorteo => (
                <tr 
                  key={sorteo.concurso} 
                  onClick={() => handleSelectSorteo(sorteo)}
                  style={{borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', background: sorteo.concurso === sorteoSeleccionado.concurso ? `${common.primary}20` : 'transparent'}}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = `${common.primary}15`}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = sorteo.concurso === sorteoSeleccionado.concurso ? `${common.primary}20` : 'transparent'}
                >
                  <td style={{padding: '12px 10px', fontWeight: 'bold'}}>{sorteo.concurso}</td>
                  <td style={{padding: '12px 10px', color: colors.textSecondary, fontSize: '0.9rem'}}>{sorteo.fecha}</td>
                  <td style={{padding: '12px 10px', letterSpacing: '1px', fontWeight: '500'}}>
                    {/* Aseguramos que sorteo.numeros exista */}
                    {sorteo.numeros?.join(' - ') || 'N/A'}
                    <span style={{color: common.primary, fontWeight: 'bold'}}> | {sorteo.adicional || 'N/A'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Paginación --- */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
          <button style={btnStyle} onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>Anterior</button>
          <span style={{...typography.small, color: colors.textSecondary}}>
            Página {paginaActual} de {totalPaginas}
          </span>
          <button style={btnStyle} onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}