import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { useAuth } from './AuthContext';
import { getSectionStyle, getBtnStyle, getInputStyle, common, typography, getThTd, getTableHeader } from './styles';

// --- FUNCIONES AUXILIARES ---
function k_combinations(set, k) {
    if (k > set.length || k <= 0) return [];
    if (k === set.length) return [set];
    if (k === 1) return set.map(item => [item]);
    const combs = [];
    let head, tailcombs;
    for (let i = 0; i <= set.length - k; i++) {
        head = set.slice(i, i + 1);
        tailcombs = k_combinations(set.slice(i + 1), k - 1);
        for (let j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}
const combinacionesPorJugada = { 6: 1, 7: 7, 8: 28, 9: 84, 10: 210 };
const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const esDiaDeSorteoValido = (fechaStr) => {
    if (!fechaStr) return false;
    const parts = fechaStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const fechaSeleccionada = new Date(Date.UTC(year, month, day));
    const diaDeSemana = fechaSeleccionada.getUTCDay();
    return [0, 3, 5].includes(diaDeSemana);
};

export default function Generador({ stats, ultimoSorteo, onJugadaGuardada, onPulseUpdate, persistentState, setPersistentState }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { currentUser } = useAuth();

  if (!stats || !stats.analisisAvanzado) {
      const sectionStyle = getSectionStyle(colors);
      return (
          <div style={sectionStyle}>
              <h3 style={{...typography.h3, color: colors.text}}>Cargando datos del generador...</h3>
              <p style={{...typography.body, color: colors.textSecondary}}>
                  Un momento, por favor. Estamos procesando las estadísticas avanzadas.
              </p>
          </div>
      );
  }

  const sectionStyle = getSectionStyle(colors);
  const btnStyle = getBtnStyle();
  const inputStyle = getInputStyle(colors);
  const thTd = getThTd(colors);
  const tableHeader = getTableHeader(colors);
  const analysisRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: `1px solid ${colors.border}` };
  const verdictStyle = (verdict) => {
    const verdictColors = { 'Estadísticamente Fuerte': common.success, 'Balanceada': common.warning, 'Arriesgada (Atípica)': common.danger, 'Ideal': common.success, 'Aceptable': common.warning, 'Atípico': common.danger, 'Muy Común': common.success, 'Común': common.warning, 'Poco Común': '#fd7e14' };
    return { fontWeight: 'bold', color: verdictColors[verdict] || colors.textSecondary, padding: '4px 8px', borderRadius: '6px', backgroundColor: `${verdictColors[verdict] || colors.textSecondary}20`, fontSize: '0.9rem' };
  };
  const labelStyle = { ...typography.small, color: colors.textSecondary, fontWeight: 'bold', marginBottom: '8px' };
  const criteriaGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', textAlign: 'left' };
  const criteriaItemStyle = { display: 'flex', flexDirection: 'column' };

  const { combinacion, analisis, histCoincidencias, tipoJugada, inputValue, criterios } = persistentState;
  
  const setPersistentValue = (key, value) => {
    setPersistentState(prev => ({...prev, [key]: value}));
  };
  const setNestedPersistentValue = (key, subKey, value) => {
    setPersistentState(prev => ({...prev, [key]: {...prev[key], [subKey]: value}}));
  };
  
  const [excludeValue, setExcludeValue] = useState('');
  const [excludedDecenas, setExcludedDecenas] = useState({
      '0': false, '1': false, '2': false, '3': false, '4': false, '5': false,
  });

  const [filterAciertos, setFilterAciertos] = useState('todos');
  const [fechaParaGuardar, setFechaParaGuardar] = useState('');

  const { historial, analisisAvanzado } = stats;

  useEffect(() => {
    if (ultimoSorteo?.fecha && !fechaParaGuardar) {
      const proximaFecha = estimarProximaFecha(ultimoSorteo.fecha);
      setFechaParaGuardar(formatDateForInput(proximaFecha));
    }
  }, [ultimoSorteo, fechaParaGuardar]);

  const weightedPool = useMemo(() => {
    if (!stats?.frecuencias || !analisisAvanzado?.frecuenciasRecientes) return [];
    let pool = [];
    for (let i = 1; i <= 56; i++) {
      const frecHist = stats.frecuencias[i] || 0;
      const frecReciente = analisisAvanzado.frecuenciasRecientes[i] || 0;
      const score = Math.round(frecHist + (frecReciente * 1.5));
      for (let j = 0; j < score; j++) { pool.push(i); }
    }
    return pool;
  }, [stats]);

  const estimarProximaFecha = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== 'string') return new Date();
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return new Date();
    const date = new Date(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    const dayOfWeek = date.getDay();
    let diasAAgregar = 2;
    if (dayOfWeek === 0) diasAAgregar = 3;
    if (dayOfWeek === 3) diasAAgregar = 2;
    date.setDate(date.getDate() + diasAAgregar);
    return date;
  };
  
  const analizarCombinacion = (combo) => {
    if (!analisisAvanzado || !combo || combo.length !== 6) return null;
    const { statsSuma, distribucionParImpar, distribucionBajosAltos, statsGaps, distribucionesDecenasComunes } = analisisAvanzado;
    let puntajeGeneral = 0;
    const suma = combo.reduce((a, b) => a + b, 0);
    let veredictoSuma;
    if (statsSuma?.rangoIdeal && suma >= statsSuma.rangoIdeal[0] && suma <= statsSuma.rangoIdeal[1]) { veredictoSuma = 'Ideal'; puntajeGeneral += 3; }
    else if (statsSuma?.rangoIdeal && suma >= statsSuma.rangoIdeal[0] - statsSuma.desviacionEstandar && suma <= statsSuma.rangoIdeal[1] + statsSuma.desviacionEstandar) { veredictoSuma = 'Aceptable'; puntajeGeneral += 1; }
    else { veredictoSuma = 'Atípico'; }
    const pares = combo.filter(n => n % 2 === 0).length;
    const keyParImpar = `${pares}P-${6 - pares}I`;
    const porcParImpar = distribucionParImpar?.[keyParImpar] || 0;
    let veredictoParImpar;
    if (porcParImpar > 25) { veredictoParImpar = 'Muy Común'; puntajeGeneral += 2; }
    else if (porcParImpar > 10) { veredictoParImpar = 'Común'; puntajeGeneral += 1; }
    else { veredictoParImpar = 'Poco Común'; }
    const bajos = combo.filter(n => n <= 28).length;
    const keyBajosAltos = `${bajos}B-${6 - bajos}A`;
    const porcBajosAltos = distribucionBajosAltos?.[keyBajosAltos] || 0;
    let veredictoBajosAltos;
    if (porcBajosAltos > 25) { veredictoBajosAltos = 'Muy Común'; puntajeGeneral += 2; }
    else if (porcBajosAltos > 10) { veredictoBajosAltos = 'Común'; puntajeGeneral += 1; }
    else { veredictoBajosAltos = 'Poco Común'; }
    const decades = [0, 0, 0, 0, 0, 0];
    combo.forEach(n => { const decadeIndex = Math.floor((n - 1) / 10); if (decadeIndex < 6) decades[decadeIndex]++; });
    const keyDecenas = decades.join('-');
    let veredictoDecenas;
    if (distribucionesDecenasComunes?.includes(keyDecenas)) { veredictoDecenas = 'Muy Común'; puntajeGeneral += 2; }
    else { veredictoDecenas = 'Poco Común'; }
    const sortedCombo = [...combo].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sortedCombo.length; i++) { gaps.push(sortedCombo[i] - sortedCombo[i-1]); }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let veredictoGaps;
    if (statsGaps?.rangoIdeal && avgGap >= parseFloat(statsGaps.rangoIdeal[0]) && avgGap <= parseFloat(statsGaps.rangoIdeal[1])) { veredictoGaps = 'Ideal'; puntajeGeneral += 2; }
    else { veredictoGaps = 'Atípico'; }
    let recomendacionGeneral;
    if (puntajeGeneral >= 9) recomendacionGeneral = 'Estadísticamente Fuerte';
    else if (puntajeGeneral >= 6) recomendacionGeneral = 'Balanceada';
    else recomendacionGeneral = 'Arriesgada (Atípica)';
    return { suma: { valor: suma, rango: statsSuma?.rangoIdeal?.join(' - ') || 'N/A', veredicto: veredictoSuma }, parImpar: { valor: keyParImpar, porc: porcParImpar, veredicto: veredictoParImpar }, bajosAltos: { valor: keyBajosAltos, porc: porcBajosAltos, veredicto: veredictoBajosAltos }, decenas: { valor: keyDecenas, veredicto: veredictoDecenas }, gaps: { valor: avgGap.toFixed(1), rango: statsGaps?.rangoIdeal?.join(' - ') || 'N/A', veredicto: veredictoGaps }, recomendacionGeneral };
  };

  const generarCombinacion = () => {
    const numerosIncluidos = inputValue.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 56);
    const numerosExcluidosManual = excludeValue.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 56);
    const numerosExcluidosDecenas = Object.entries(excludedDecenas)
        .filter(([, isExcluded]) => isExcluded)
        .flatMap(([decenaIndex]) => {
            const min = parseInt(decenaIndex, 10) * 10;
            const max = min + 9;
            const nums = [];
            for (let i = (min === 0 ? 1 : min); i <= (max > 56 ? 56 : max); i++) { nums.push(i); }
            return nums;
        });
    const exclusionSet = new Set([...numerosExcluidosManual, ...numerosExcluidosDecenas]);
    const conflicto = numerosIncluidos.find(n => exclusionSet.has(n));
    if (conflicto) {
        toast.error(`Error: El número ${conflicto} no puede estar en la lista de números base y en la de exclusiones al mismo tiempo.`);
        return;
    }
    if (numerosIncluidos.length > tipoJugada) {
        toast.error(`Para una jugada de ${tipoJugada}, puedes incluir un máximo de ${tipoJugada} números base.`);
        return;
    }
    
    let comboEncontrado = null;
    let intentos = 0;
    const MAX_INTENTOS = 150000;
    while (intentos < MAX_INTENTOS) {
      intentos++;
      let candidato = [...new Set(numerosIncluidos)];
      let currentPool = [...weightedPool].filter(n => !candidato.includes(n) && !exclusionSet.has(n));
      
      if(currentPool.length < tipoJugada - candidato.length) {
        toast.error('No hay suficientes números disponibles para generar una combinación con las exclusiones seleccionadas.');
        return;
      }
      while (candidato.length < tipoJugada && currentPool.length > 0) {
        const idx = Math.floor(Math.random() * currentPool.length);
        const n = currentPool.splice(idx, 1)[0];
        if (!candidato.includes(n)) { candidato.push(n); }
      }
      if (candidato.length < tipoJugada) continue;
      if (tipoJugada === 6) {
        candidato.sort((a, b) => a - b);
        let esValido = true;
        const sumaMin = parseInt(criterios.sumaMin, 10) || 0;
        const sumaMax = parseInt(criterios.sumaMax, 10) || Infinity;
        const sumaCandidato = candidato.reduce((a, b) => a + b, 0);
        if (sumaMin > 0 && (sumaCandidato < sumaMin || sumaCandidato > sumaMax)) esValido = false;
        if (esValido && criterios.parImpar !== 'any') { const pares = candidato.filter(n => n % 2 === 0).length; if (`${pares}P-${6 - pares}I` !== criterios.parImpar) esValido = false; }
        if (esValido && criterios.bajosAltos !== 'any') { const bajos = candidato.filter(n => n <= 28).length; if (`${bajos}B-${6 - bajos}A` !== criterios.bajosAltos) esValido = false; }
        if (esValido && criterios.decenas !== 'any') { const decadesSet = new Set(candidato.map(n => Math.floor((n-1) / 10))); if (criterios.decenas === 'balanceada' && decadesSet.size < 4) esValido = false; if (criterios.decenas === 'concentrada' && decadesSet.size > 3) esValido = false; }
        if (esValido && criterios.gaps !== 'any' && analisisAvanzado.statsGaps?.rangoIdeal) { const gaps = []; for (let i = 1; i < candidato.length; i++) { gaps.push(candidato[i] - candidato[i-1]); } const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length; const [minIdeal, maxIdeal] = analisisAvanzado.statsGaps.rangoIdeal; if (criterios.gaps === 'ideal' && (avgGap < parseFloat(minIdeal) || avgGap > parseFloat(maxIdeal))) esValido = false; if (criterios.gaps === 'juntos' && avgGap > parseFloat(minIdeal)) esValido = false; if (criterios.gaps === 'separados' && avgGap < parseFloat(maxIdeal)) esValido = false; }
        if (esValido) { comboEncontrado = candidato; break; }
      } else { comboEncontrado = candidato; break; }
    }
    if (comboEncontrado) {
      comboEncontrado.sort((a,b)=>a-b);
      setPersistentValue('combinacion', comboEncontrado);
      window.electronAPI.registrarPulso({ numeros: comboEncontrado });
      onPulseUpdate();
      if (tipoJugada === 6) {
          setPersistentValue('analisis', { tipo: 'sencilla', data: analizarCombinacion(comboEncontrado) });
          if (!historial) { setPersistentValue('histCoincidencias', []); return; }
          const hits = historial.map(draw => {
            const naturalesAcertadosArr = draw.numeros?.filter(n => comboEncontrado.includes(n)) || [];
            const adicionalAcertado = comboEncontrado.filter(n => !naturalesAcertadosArr.includes(n)).includes(draw.adicional);
            const revanchaAcertadosArr = draw.numeros_revancha ? comboEncontrado.filter(n => draw.numeros_revancha.includes(n)) : [];
            const revanchitaAcertadosArr = draw.numeros_revanchita ? comboEncontrado.filter(n => draw.numeros_revanchita.includes(n)) : [];
            if (naturalesAcertadosArr.length > 0 || adicionalAcertado || revanchaAcertadosArr.length > 0 || revanchitaAcertadosArr.length > 0) {
              return { fecha: draw.fecha, concurso: draw.concurso, melate: { display: `${naturalesAcertadosArr.length}${adicionalAcertado ? '+1' : ''}`, aciertos: naturalesAcertadosArr, adicional: adicionalAcertado ? draw.adicional : null }, revancha: { aciertos: revanchaAcertadosArr }, revanchita: { aciertos: revanchitaAcertadosArr } };
            }
            return null;
          }).filter(Boolean);
          setPersistentValue('histCoincidencias', hits);
          setFilterAciertos('todos');
      } else {
          const todasLasCombos = k_combinations(comboEncontrado, 6);
          const resumenAnalisis = { 'Estadísticamente Fuerte': 0, 'Balanceada': 0, 'Arriesgada (Atípica)': 0 };
          todasLasCombos.forEach(combo => { const analisisIndividual = analizarCombinacion(combo); if (analisisIndividual && resumenAnalisis[analisisIndividual.recomendacionGeneral] !== undefined) { resumenAnalisis[analisisIndividual.recomendacionGeneral]++; } });
          setPersistentValue('analisis', { tipo: 'multiple', data: resumenAnalisis, total: todasLasCombos.length });
          setPersistentValue('histCoincidencias', []);
      }
    } else {
      toast.error(`No se pudo encontrar una combinación que cumpla con todos los criterios después de ${MAX_INTENTOS} intentos. Por favor, relaja tus filtros.`);
    }
  };
  
  const handleCriterioChange = (e) => setNestedPersistentValue('criterios', e.target.name, e.target.value);
  const handleInputChange = (e) => setPersistentValue('inputValue', e.target.value);
  const handleExcludeChange = (e) => setExcludeValue(e.target.value);
  const handleDecenaExcludeChange = (e) => {
    const { name, checked } = e.target;
    setExcludedDecenas(prev => ({...prev, [name]: checked}));
  };
  const filteredHistorial = histCoincidencias.filter(h => filterAciertos === 'todos' || h.melate.display === filterAciertos);
  
  const handleGuardarJugada = async () => {
    if (!esDiaDeSorteoValido(fechaParaGuardar)) {
        toast.error('Día inválido. Por favor, selecciona una fecha que sea domingo, miércoles o viernes.');
        return;
    }
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    const fechaDeHoyString = hoy.toISOString().split('T')[0];
    if (fechaParaGuardar < fechaDeHoyString) {
        const confirmacion = window.confirm("La fecha que seleccionaste ya pasó. ¿Estás seguro de que quieres registrar una jugada para un sorteo anterior?");
        if (!confirmacion) {
            return;
        }
    }
    if (!combinacion.length || combinacion.length !== 6 || !analisis || analisis.tipo !== 'sencilla') {
        toast.error('Solo se pueden guardar jugadas sencillas (de 6 números) que hayan sido analizadas.');
        return;
    }
    if (!currentUser) {
        toast.error('Debes iniciar sesión para guardar una jugada.');
        return;
    }
    const [y, m, d] = fechaParaGuardar.split('-');
    const fechaFormateada = `${d}/${m}/${y}`;
    const jugada = { fecha: fechaFormateada, combinacion, analisis: analisis.data };
    const resultado = await window.electronAPI.guardarJugada({ jugada, userId: currentUser.uid });
    if (resultado.success) {
      toast.success(`¡Combinación guardada para el sorteo del ${fechaFormateada} con éxito!`);
      onJugadaGuardada();
    } else { 
      toast.error(`Error al guardar la combinación: ${resultado.message}`); 
    }
  };

  const renderAnalisis = () => {
    if (!analisis) return null;
    if (analisis.tipo === 'sencilla') {
        const data = analisis.data;
        if (!data) return null;
        return (
          <div style={sectionStyle}>
            <h3 style={{...typography.h3, marginBottom: '20px', color: colors.text }}>Análisis de la Combinación</h3>
            <div style={{textAlign: 'left'}}>
                <div style={analysisRowStyle}> <div style={{color: colors.text}}><strong>Suma Total:</strong> {data.suma.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Rango ideal: {data.suma.rango}</small></div> <span style={verdictStyle(data.suma.veredicto)}>{data.suma.veredicto}</span> </div>
                <div style={analysisRowStyle}> <div style={{color: colors.text}}><strong>Balance Par-Impar:</strong> {data.parImpar.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Ocurre en el {data.parImpar.porc}%</small></div> <span style={verdictStyle(data.parImpar.veredicto)}>{data.parImpar.veredicto}</span> </div>
                <div style={analysisRowStyle}> <div style={{color: colors.text}}><strong>Balance Bajos-Altos:</strong> {data.bajosAltos.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Ocurre en el {data.bajosAltos.porc}%</small></div> <span style={verdictStyle(data.bajosAltos.veredicto)}>{data.bajosAltos.veredicto}</span> </div>
                <div style={analysisRowStyle}> <div style={{color: colors.text}}><strong>Distribución por Decenas:</strong> {data.decenas.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Compara con patrones comunes</small></div> <span style={verdictStyle(data.decenas.veredicto)}>{data.decenas.veredicto}</span> </div>
                <div style={{...analysisRowStyle, borderBottom: 'none'}}> <div style={{color: colors.text}}><strong>Dispersión (Gap Promedio):</strong> {data.gaps.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Rango ideal: {data.gaps.rango}</small></div> <span style={verdictStyle(data.gaps.veredicto)}>{data.gaps.veredicto}</span> </div>
            </div>
            <div style={{ marginTop: '25px', padding: '15px', borderRadius: '8px', backgroundColor: colors.lightGray, color: colors.text }}> <strong>Recomendación General:</strong> <p style={{ ...typography.h4, margin: '8px 0 0 0' }}>{data.recomendacionGeneral}</p> </div>
          </div>
        );
    }
    if (analisis.tipo === 'multiple') {
        const { data, total } = analisis;
        return (
            <div style={sectionStyle}>
                <h3 style={{...typography.h3, marginBottom: '20px', color: colors.text }}>Análisis de Jugada Múltiple</h3>
                <p style={{...typography.body, color: colors.textSecondary}}>De las <strong>{total}</strong> combinaciones generadas:</p>
                <div style={{textAlign: 'left', maxWidth: '400px', margin: 'auto'}}>
                    <div style={analysisRowStyle}><strong style={{color: colors.text}}>Estadísticamente Fuertes:</strong> <span style={verdictStyle('Estadísticamente Fuerte')}>{data['Estadísticamente Fuerte']}</span></div>
                    <div style={analysisRowStyle}><strong style={{color: colors.text}}>Balanceadas:</strong> <span style={verdictStyle('Balanceada')}>{data['Balanceada']}</span></div>
                    <div style={{...analysisRowStyle, borderBottom: 'none'}}><strong style={{color: colors.text}}>Arriesgadas (Atípicas):</strong> <span style={verdictStyle('Arriesgada (Atípica)')}>{data['Arriesgada (Atípica)']}</span></div>
                </div>
            </div>
        );
    }
    return null;
  };
  
  const handleTipoJugadaChange = (num) => {
    const defaultCriterios = { sumaMin: '', sumaMax: '', parImpar: 'any', bajosAltos: 'any', decenas: 'any', gaps: 'any' };
    setPersistentState(prev => ({
        ...prev,
        tipoJugada: num,
        combinacion: [],
        analisis: null,
        histCoincidencias: [],
        inputValue: '',
        criterios: defaultCriterios,
    }));
    setExcludeValue('');
    setExcludedDecenas({'0':false,'1':false,'2':false,'3':false,'4':false,'5':false});
  };
  
  const minDate = useMemo(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  }, []);

  return (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: '2rem' }}>Generador Inteligente</h2>
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso 1: Elige tu tipo de jugada</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
          {[6, 7, 8, 9, 10].map(num => (
            <button key={num} onClick={() => handleTipoJugadaChange(num)} style={{...btnStyle, background: tipoJugada === num ? common.primaryGradient : colors.lightGray, color: tipoJugada === num ? '#fff' : colors.text}}>
              {num === 6 ? 'Sencilla' : 'Múltiple'} ({num} números)
            </button>
          ))}
        </div>
      </div>
      
      {tipoJugada === 6 && (
        <div style={sectionStyle}>
            <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso 2: Define Criterios (Opcional)</h3>
            <div style={criteriaGridStyle}>
               <div style={{...criteriaItemStyle}}><label style={labelStyle} htmlFor="sumaMin">Rango de Suma</label><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <input type="number" name="sumaMin" id="sumaMin" value={criterios.sumaMin} onChange={handleCriterioChange} placeholder={analisisAvanzado.statsSuma?.rangoIdeal?.[0] ?? ''} style={{ ...inputStyle, width: '100%' }} />
                   <span>-</span>
                   <input type="number" name="sumaMax" value={criterios.sumaMax} onChange={handleCriterioChange} placeholder={analisisAvanzado.statsSuma?.rangoIdeal?.[1] ?? ''} style={{ ...inputStyle, width: '100%' }} />
                </div></div>
               <div style={{...criteriaItemStyle}}><label style={labelStyle} htmlFor="parImpar">Balance Par/Impar</label><select name="parImpar" id="parImpar" value={criterios.parImpar} onChange={handleCriterioChange} style={inputStyle}><option value="any">Cualquiera</option>{analisisAvanzado.distribucionParImpar && Object.keys(analisisAvanzado.distribucionParImpar).sort().map(key => (<option key={key} value={key}>{key} ({analisisAvanzado.distribucionParImpar[key]}%)</option>))}</select></div>
               <div style={{...criteriaItemStyle}}><label style={labelStyle} htmlFor="bajosAltos">Balance Bajos/Altos</label><select name="bajosAltos" id="bajosAltos" value={criterios.bajosAltos} onChange={handleCriterioChange} style={inputStyle}><option value="any">Cualquiera</option>{analisisAvanzado.distribucionBajosAltos && Object.keys(analisisAvanzado.distribucionBajosAltos).sort().map(key => (<option key={key} value={key}>{key} ({analisisAvanzado.distribucionBajosAltos[key]}%)</option>))}</select></div>
               <div style={{...criteriaItemStyle}}><label style={labelStyle} htmlFor="decenas">Distribución por Decenas</label><select name="decenas" id="decenas" value={criterios.decenas} onChange={handleCriterioChange} style={inputStyle}><option value="any">Cualquiera</option><option value="balanceada">Balanceada (en 4+ decenas)</option><option value="concentrada">Concentrada (en 3 o menos)</option></select></div>
               <div style={{...criteriaItemStyle}}><label style={labelStyle} htmlFor="gaps">Dispersión (Gaps)</label><select name="gaps" id="gaps" value={criterios.gaps} onChange={handleCriterioChange} style={inputStyle}><option value="any">Cualquiera</option><option value="ideal">Balanceada (Gap ideal)</option><option value="juntos">Agrupada (Números juntos)</option><option value="separados">Dispersa (Números separados)</option></select></div>
            </div>
        </div>
      )}

      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '3' : '2'}: Ingresa Números Base (Opcional)</h3>
        <p style={{ ...typography.body, ...typography.small, color: colors.textSecondary, margin: '1rem 0' }}>
            Incluye hasta {tipoJugada} números fijos, separados por comas.
        </p>
        <div><input type="text" placeholder="Ej: 5, 12, 45" value={inputValue} onChange={handleInputChange} style={{ ...inputStyle, width: '60%' }}/></div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '4' : '3'}: Excluye Números (Opcional)</h3>
        <div style={{...criteriaGridStyle, gridTemplateColumns: '1fr', gap: '25px'}}>
            <div>
                <label style={labelStyle}>Excluir números específicos (separados por coma)</label>
                <input type="text" placeholder="Ej: 7, 22, 50" value={excludeValue} onChange={handleExcludeChange} style={{ ...inputStyle, width: '100%' }}/>
            </div>
            <div>
                <label style={labelStyle}>Excluir decenas completas</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center'}}>
                    {['1-9','10-19','20-29','30-39','40-49','50-56'].map((label, index) => (
                        <div key={index} style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <input type="checkbox" id={`decena-${index}`} name={String(index)} checked={excludedDecenas[String(index)]} onChange={handleDecenaExcludeChange} />
                            <label htmlFor={`decena-${index}`} style={{color: colors.text}}>{label}</label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '5' : '4'}: Genera y Analiza</h3>
        <button onClick={generarCombinacion} style={{...btnStyle, padding: '12px 24px', marginTop: '1rem'}}>
            Generar Combinación de {tipoJugada}
        </button>
      </div>

      {combinacion.length > 0 && (
        <div style={{ ...sectionStyle, background: colors.lightGray, borderColor: common.primary }}>
          <h3 style={{ ...typography.h3, color: colors.text }}>Combinación Generada</h3>
          <p style={{...typography.h2, letterSpacing: '3px', color: common.primary, fontWeight: 'bold'}}>{combinacion.join(' - ')}</p>
          {tipoJugada > 6 && (
              <p style={{...typography.body, color: colors.textSecondary, marginTop: '1rem'}}>
                ℹ️ Tu jugada múltiple de <strong>{tipoJugada} números</strong> genera <strong>{combinacionesPorJugada[tipoJugada]} combinaciones</strong> de 6.
              </p>
          )}
          {tipoJugada === 6 && analisis?.tipo === 'sencilla' && (
            <div style={{ marginTop: '25px', padding: '15px', borderRadius: '8px', backgroundColor: colors.surface }}>
              <strong style={{...typography.body, color: colors.text}}>¿Quieres registrar esta jugada?</strong>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label htmlFor="fecha-guardar" style={{ ...typography.small, fontWeight: 'bold', color: colors.textSecondary }}>Fecha del Sorteo:</label>
                <input id="fecha-guardar" type="date" value={fechaParaGuardar} onChange={(e) => setFechaParaGuardar(e.target.value)} style={inputStyle} min={minDate} />
                <button onClick={handleGuardarJugada} style={btnStyle}>Guardar Jugada</button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {renderAnalisis()}
      
      {tipoJugada === 6 && histCoincidencias.length > 0 && (
        <div style={sectionStyle}>
            <h3 style={{...typography.h3, color: colors.text}}>Rendimiento Histórico</h3>
            <div style={{ margin: '1rem 0' }}>
                <label htmlFor="filtro-aciertos" style={{...labelStyle, marginRight: '10px'}}>Filtrar por aciertos en Melate:</label>
                <select id="filtro-aciertos" value={filterAciertos} onChange={(e) => setFilterAciertos(e.target.value)} style={inputStyle}>
                    <option value="todos">Todos ({histCoincidencias.length})</option>
                    {[...new Set(histCoincidencias.map(h => h.melate.display))].sort((a,b) => parseFloat(b.replace('+1', '.5')) - parseFloat(a.replace('+1', '.5'))).map(acierto => (<option key={acierto} value={acierto}> {acierto} aciertos ({histCoincidencias.filter(h => h.melate.display === acierto).length})</option>))}
                </select>
            </div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table style={{ width:'100%', borderCollapse:'collapse', marginTop: '1rem', color: colors.text }}>
                <thead>
                    <tr>
                        <th style={tableHeader}>Concurso / Fecha</th>
                        <th style={tableHeader}>Aciertos Totales</th>
                        <th style={{...tableHeader, width: '50%'}}>Números Acertados</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredHistorial.map((h, i) => (
                        <tr key={i} style={{backgroundColor: i % 2 === 0 ? 'transparent' : colors.lightGray}}>
                            <td style={thTd}><strong>{h.concurso}</strong><br/><small style={{...typography.small, color: colors.textSecondary}}>{h.fecha}</small></td>
                            <td style={{...thTd, textAlign: 'left', lineHeight: '1.6'}}>
                                { (h.melate.aciertos.length > 0 || h.melate.adicional) && <div><strong>Melate:</strong> {h.melate.display}</div> }
                                { h.revancha && h.revancha.aciertos.length > 0 && <div><strong>Revancha:</strong> {h.revancha.aciertos.length}</div> }
                                { h.revanchita && h.revanchita.aciertos.length > 0 && <div><strong>Revanchita:</strong> {h.revanchita.aciertos.length}</div> }
                            </td>
                            <td style={{...thTd, textAlign: 'left', lineHeight: '1.6'}}>
                                { (h.melate.aciertos.length > 0 || h.melate.adicional) && <div style={{padding: '2px 0'}}><strong>Melate:</strong><span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.melate.aciertos.join(' - ')}</span>{h.melate.adicional && <span style={{color: common.primary, fontWeight: 'bold'}}> + {h.melate.adicional} (Adicional)</span>}</div> }
                                { h.revancha && h.revancha.aciertos.length > 0 && <div style={{padding: '2px 0', borderTop: `1px solid ${colors.border}`}}><strong>Revancha:</strong><span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.revancha.aciertos.join(' - ')}</span></div> }
                                { h.revanchita && h.revanchita.aciertos.length > 0 && <div style={{padding: '2px 0', borderTop: `1px solid ${colors.border}`}}><strong>Revanchita:</strong><span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.revanchita.aciertos.join(' - ')}</span></div> }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
      )}
    </div>
  );
}