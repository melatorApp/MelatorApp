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
    return [0, 3, 5].includes(diaDeSemana); // Domingo=0, Miércoles=3, Viernes=5 (UTC)
};

export default function Generador({ stats, ultimoSorteo, onJugadaGuardada, onPulseUpdate, persistentState, setPersistentState }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { currentUser } = useAuth();

  // Estado de carga inicial si stats no está listo
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

  // Estilos
  const sectionStyle = getSectionStyle(colors);
  const btnStyle = getBtnStyle();
  const inputStyle = getInputStyle(colors);
  const thTd = getThTd(colors);
  const tableHeader = getTableHeader(colors);
  const analysisRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: `1px solid ${colors.border}` };
  const verdictStyle = (verdict) => {
    const verdictColors = { 'Estadísticamente Fuerte': common.success, 'Balanceada': common.warning, 'Arriesgada (Atípica)': common.danger, 'Ideal': common.success, 'Aceptable': common.warning, 'Atípico': common.danger, 'Muy Común': common.success, 'Común': common.warning, 'Poco Común': '#fd7e14' }; // Naranja para Poco Común
    return { fontWeight: 'bold', color: verdictColors[verdict] || colors.textSecondary, padding: '4px 8px', borderRadius: '6px', backgroundColor: `${verdictColors[verdict] || colors.textSecondary}20`, fontSize: '0.9rem' };
  };
  const labelStyle = { ...typography.small, color: colors.textSecondary, fontWeight: 'bold', marginBottom: '8px', display: 'block' }; // display: block
  const criteriaGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', textAlign: 'left' };
  const criteriaItemStyle = { display: 'flex', flexDirection: 'column' };

  // --- CORRECCIÓN: Añadir valores por defecto robustos ---
  const {
    combinacion = [],
    analisis = null,
    histCoincidencias = [],
    tipoJugada = 6,
    inputValue = '',
    criterios = {
        sumaMin: '', sumaMax: '', parImpar: 'any', bajosAltos: 'any', decenas: 'any', gaps: 'any'
    }
  } = persistentState || {}; // <= || {} previene error si persistentState es undefined/null
  // --- FIN CORRECCIÓN ---

  // Funciones para actualizar el estado persistente
  const setPersistentValue = (key, value) => {
    setPersistentState(prev => ({...prev, [key]: value}));
  };
  const setNestedPersistentValue = (key, subKey, value) => {
    setPersistentState(prev => ({...prev, [key]: {...prev[key], [subKey]: value}}));
  };

  // Estados locales para exclusiones
  const [excludeValue, setExcludeValue] = useState('');
  const [excludedDecenas, setExcludedDecenas] = useState({
      '0': false, '1': false, '2': false, '3': false, '4': false, '5': false,
  });

  // Estado local para filtro de historial y fecha de guardado
  const [filterAciertos, setFilterAciertos] = useState('todos');
  const [fechaParaGuardar, setFechaParaGuardar] = useState('');

  // Datos de stats
  const { historial, analisisAvanzado } = stats;

  // Efecto para establecer la fecha inicial para guardar
  useEffect(() => {
    if (ultimoSorteo?.fecha && !fechaParaGuardar) {
      const proximaFecha = estimarProximaFecha(ultimoSorteo.fecha);
      setFechaParaGuardar(formatDateForInput(proximaFecha));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimoSorteo]); // Quitar fechaParaGuardar para que no se resetee si el usuario la cambia

  // Pool ponderado para generación
  const weightedPool = useMemo(() => {
    if (!stats?.frecuencias || !analisisAvanzado?.frecuenciasRecientes) return [];
    let pool = [];
    for (let i = 1; i <= 56; i++) {
      const frecHist = stats.frecuencias[i] || 0;
      const frecReciente = analisisAvanzado.frecuenciasRecientes[i] || 0;
      // Ponderación: Histórico cuenta 1, Reciente cuenta 1.5
      const score = Math.max(1, Math.round(frecHist + (frecReciente * 1.5))); // Asegurar al menos 1 aparición
      for (let j = 0; j < score; j++) { pool.push(i); }
    }
    return pool;
  }, [stats, analisisAvanzado]);

  // Estimar próxima fecha de sorteo
  const estimarProximaFecha = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== 'string') return new Date();
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return new Date();
    // Usar UTC para evitar problemas de zona horaria al calcular día de semana
    const date = new Date(Date.UTC(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
    const dayOfWeekUTC = date.getUTCDay(); // 0=Domingo, 3=Miércoles, 5=Viernes
    let diasAAgregar = 2; // Default (Viernes a Domingo)
    if (dayOfWeekUTC === 0) diasAAgregar = 3; // Domingo a Miércoles
    if (dayOfWeekUTC === 3) diasAAgregar = 2; // Miércoles a Viernes
    date.setUTCDate(date.getUTCDate() + diasAAgregar);
    // Devolver como objeto Date local para el input type="date"
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };

  // Analizar una combinación de 6 números
  const analizarCombinacion = (combo) => {
    if (!analisisAvanzado || !combo || combo.length !== 6) return null;
    const { statsSuma, distribucionParImpar, distribucionBajosAltos, statsGaps, distribucionesDecenasComunes } = analisisAvanzado;
    let puntajeGeneral = 0;

    // Suma
    const suma = combo.reduce((a, b) => a + b, 0);
    let veredictoSuma;
    if (statsSuma?.rangoIdeal && suma >= statsSuma.rangoIdeal[0] && suma <= statsSuma.rangoIdeal[1]) { veredictoSuma = 'Ideal'; puntajeGeneral += 3; }
    else if (statsSuma?.rangoIdeal && suma >= statsSuma.rangoIdeal[0] - statsSuma.desviacionEstandar && suma <= statsSuma.rangoIdeal[1] + statsSuma.desviacionEstandar) { veredictoSuma = 'Aceptable'; puntajeGeneral += 1; }
    else { veredictoSuma = 'Atípico'; }

    // Pares/Impares
    const pares = combo.filter(n => n % 2 === 0).length;
    const keyParImpar = `${pares}P-${6 - pares}I`;
    const porcParImpar = distribucionParImpar?.[keyParImpar] || 0;
    let veredictoParImpar;
    if (porcParImpar > 25) { veredictoParImpar = 'Muy Común'; puntajeGeneral += 2; }
    else if (porcParImpar > 10) { veredictoParImpar = 'Común'; puntajeGeneral += 1; }
    else { veredictoParImpar = 'Poco Común'; }

    // Bajos/Altos
    const bajos = combo.filter(n => n <= 28).length;
    const keyBajosAltos = `${bajos}B-${6 - bajos}A`;
    const porcBajosAltos = distribucionBajosAltos?.[keyBajosAltos] || 0;
    let veredictoBajosAltos;
    if (porcBajosAltos > 25) { veredictoBajosAltos = 'Muy Común'; puntajeGeneral += 2; }
    else if (porcBajosAltos > 10) { veredictoBajosAltos = 'Común'; puntajeGeneral += 1; }
    else { veredictoBajosAltos = 'Poco Común'; }

    // Decenas
    const decades = [0, 0, 0, 0, 0, 0];
    combo.forEach(n => { const decadeIndex = Math.floor((n - 1) / 10); if (decadeIndex < 6) decades[decadeIndex]++; });
    const keyDecenas = decades.join('-');
    let veredictoDecenas;
    if (distribucionesDecenasComunes?.includes(keyDecenas)) { veredictoDecenas = 'Muy Común'; puntajeGeneral += 2; }
    else { veredictoDecenas = 'Poco Común'; }

    // Gaps
    const sortedCombo = [...combo].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sortedCombo.length; i++) { gaps.push(sortedCombo[i] - sortedCombo[i-1]); }
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0; // Evitar división por cero
    let veredictoGaps;
    if (statsGaps?.rangoIdeal && avgGap >= parseFloat(statsGaps.rangoIdeal[0]) && avgGap <= parseFloat(statsGaps.rangoIdeal[1])) { veredictoGaps = 'Ideal'; puntajeGeneral += 2; }
    else { veredictoGaps = 'Atípico'; }

    // Recomendación General
    let recomendacionGeneral;
    if (puntajeGeneral >= 9) recomendacionGeneral = 'Estadísticamente Fuerte';
    else if (puntajeGeneral >= 6) recomendacionGeneral = 'Balanceada';
    else recomendacionGeneral = 'Arriesgada (Atípica)';

    return {
        suma: { valor: suma, rango: statsSuma?.rangoIdeal?.join(' - ') || 'N/A', veredicto: veredictoSuma },
        parImpar: { valor: keyParImpar, porc: porcParImpar, veredicto: veredictoParImpar },
        bajosAltos: { valor: keyBajosAltos, porc: porcBajosAltos, veredicto: veredictoBajosAltos },
        decenas: { valor: keyDecenas, veredicto: veredictoDecenas },
        gaps: { valor: avgGap.toFixed(1), rango: statsGaps?.rangoIdeal?.join(' - ') || 'N/A', veredicto: veredictoGaps },
        recomendacionGeneral
    };
  };

  // Generar combinación principal
  const generarCombinacion = () => {
    // Parsear números incluidos y excluidos
    const numerosIncluidos = inputValue.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 56);
    const numerosExcluidosManual = excludeValue.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 56);
    const numerosExcluidosDecenas = Object.entries(excludedDecenas)
        .filter(([, isExcluded]) => isExcluded)
        .flatMap(([decenaIndex]) => {
            const min = parseInt(decenaIndex, 10) * 10;
            const max = min + 9;
            const nums = [];
            // Ajuste para decenas: 0 es 1-9, 1 es 10-19, etc.
            for (let i = (min === 0 ? 1 : min); i <= Math.min(max, 56); i++) { nums.push(i); }
            return nums;
        });
    const exclusionSet = new Set([...numerosExcluidosManual, ...numerosExcluidosDecenas]);

    // Validar conflictos y tamaño
    const conflicto = numerosIncluidos.find(n => exclusionSet.has(n));
    if (conflicto) {
        toast.error(`Error: El número ${conflicto} no puede estar incluido y excluido.`);
        return;
    }
    if (numerosIncluidos.length > tipoJugada) {
        toast.error(`Para una jugada de ${tipoJugada}, puedes incluir máximo ${tipoJugada} números base.`);
        return;
    }

    let comboEncontrado = null;
    let intentos = 0;
    const MAX_INTENTOS = 150000; // Aumentado por si acaso

    // Bucle de intentos para encontrar combinación válida
    while (intentos < MAX_INTENTOS) {
      intentos++;
      let candidato = [...new Set(numerosIncluidos)]; // Empezar con números base únicos
      // Filtrar pool ponderado: quitar números base y excluidos
      let currentPool = weightedPool.filter(n => !candidato.includes(n) && !exclusionSet.has(n));

      // Verificar si hay suficientes números disponibles
      if (currentPool.length < tipoJugada - candidato.length) {
        // Solo mostrar error si es el primer intento
        if (intentos === 1) toast.error('No hay suficientes números disponibles con las exclusiones.');
        return; // Salir si no hay suficientes números
      }

      // Completar la combinación hasta 'tipoJugada'
      while (candidato.length < tipoJugada && currentPool.length > 0) {
        const idx = Math.floor(Math.random() * currentPool.length);
        const n = currentPool.splice(idx, 1)[0]; // Tomar y quitar del pool
        if (!candidato.includes(n)) { candidato.push(n); } // Añadir si no está ya (importante para múltiples)
      }

      // Si no se completó la combinación (improbable con la validación anterior)
      if (candidato.length < tipoJugada) continue;

      // Ordenar y validar criterios solo para jugada sencilla (tipoJugada === 6)
      candidato.sort((a, b) => a - b);
      if (tipoJugada === 6) {
        let esValido = true;
        const sumaMin = parseInt(criterios.sumaMin, 10) || 0;
        const sumaMax = parseInt(criterios.sumaMax, 10) || Infinity;
        const sumaCandidato = candidato.reduce((a, b) => a + b, 0);

        // Validar Suma
        if (sumaMin > 0 && (sumaCandidato < sumaMin || sumaCandidato > sumaMax)) esValido = false;
        // Validar Par/Impar
        if (esValido && criterios.parImpar !== 'any') { const pares = candidato.filter(n => n % 2 === 0).length; if (`${pares}P-${6 - pares}I` !== criterios.parImpar) esValido = false; }
        // Validar Bajos/Altos
        if (esValido && criterios.bajosAltos !== 'any') { const bajos = candidato.filter(n => n <= 28).length; if (`${bajos}B-${6 - bajos}A` !== criterios.bajosAltos) esValido = false; }
        // Validar Decenas
        if (esValido && criterios.decenas !== 'any') { const decadesSet = new Set(candidato.map(n => Math.floor((n-1) / 10))); if (criterios.decenas === 'balanceada' && decadesSet.size < 4) esValido = false; if (criterios.decenas === 'concentrada' && decadesSet.size >= 4) esValido = false; } // Corregido >= 4 para concentrada
        // Validar Gaps
        if (esValido && criterios.gaps !== 'any' && analisisAvanzado.statsGaps?.rangoIdeal) {
            const gaps = []; for (let i = 1; i < candidato.length; i++) { gaps.push(candidato[i] - candidato[i-1]); }
            const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
            const [minIdeal, maxIdeal] = analisisAvanzado.statsGaps.rangoIdeal;
            if (criterios.gaps === 'ideal' && (avgGap < parseFloat(minIdeal) || avgGap > parseFloat(maxIdeal))) esValido = false;
            if (criterios.gaps === 'juntos' && avgGap >= parseFloat(minIdeal)) esValido = false; // Corregido >=
            if (criterios.gaps === 'separados' && avgGap <= parseFloat(maxIdeal)) esValido = false; // Corregido <=
        }

        // Si pasó todos los filtros, usar este candidato
        if (esValido) { comboEncontrado = candidato; break; }
      } else {
        // Para jugadas múltiples, cualquier combinación completa es válida
        comboEncontrado = candidato; break;
      }
    } // Fin while intentos

    // Procesar el resultado
    if (comboEncontrado) {
      setPersistentValue('combinacion', comboEncontrado);
      // Registrar pulso y actualizar UI
      window.electronAPI.registrarPulso({ numeros: comboEncontrado });
      onPulseUpdate();

      // Analizar si es jugada sencilla
      if (tipoJugada === 6) {
          setPersistentValue('analisis', { tipo: 'sencilla', data: analizarCombinacion(comboEncontrado) });
          // Buscar coincidencias históricas
          if (!historial) { setPersistentValue('histCoincidencias', []); return; }
          const hits = historial.map(draw => {
            if (!draw || !Array.isArray(draw.numeros)) return null; // Validación extra
            const comboActual = comboEncontrado; // Usar la combinación encontrada
            const naturalesAcertadosArr = draw.numeros.filter(n => comboActual.includes(n));
            const adicionalAcertado = draw.adicional != null && !naturalesAcertadosArr.includes(draw.adicional) && comboActual.includes(draw.adicional);
            const revanchaAcertadosArr = draw.numeros_revancha ? comboActual.filter(n => draw.numeros_revancha.includes(n)) : [];
            const revanchitaAcertadosArr = draw.numeros_revanchita ? comboActual.filter(n => draw.numeros_revanchita.includes(n)) : [];

            // Contar aciertos totales para filtrar
            const aciertosTotales = naturalesAcertadosArr.length + (adicionalAcertado ? 1 : 0) + revanchaAcertadosArr.length + revanchitaAcertadosArr.length;

            if (aciertosTotales > 0) {
              return {
                  fecha: draw.fecha, concurso: draw.concurso,
                  melate: { display: `${naturalesAcertadosArr.length}${adicionalAcertado ? '+1' : ''}`, aciertos: naturalesAcertadosArr, adicional: adicionalAcertado ? draw.adicional : null },
                  revancha: { aciertos: revanchaAcertadosArr },
                  revanchita: { aciertos: revanchitaAcertadosArr }
              };
            }
            return null;
          }).filter(Boolean); // Quitar nulos
          setPersistentValue('histCoincidencias', hits);
          setFilterAciertos('todos'); // Resetear filtro
      } else {
          // Analizar jugada múltiple
          const todasLasCombos = k_combinations(comboEncontrado, 6);
          const resumenAnalisis = { 'Estadísticamente Fuerte': 0, 'Balanceada': 0, 'Arriesgada (Atípica)': 0 };
          todasLasCombos.forEach(combo => {
              const analisisIndividual = analizarCombinacion(combo);
              if (analisisIndividual && resumenAnalisis[analisisIndividual.recomendacionGeneral] !== undefined) {
                  resumenAnalisis[analisisIndividual.recomendacionGeneral]++;
              }
          });
          setPersistentValue('analisis', { tipo: 'multiple', data: resumenAnalisis, total: todasLasCombos.length });
          setPersistentValue('histCoincidencias', []); // Limpiar historial para múltiples
      }
    } else {
      toast.error(`No se encontró combinación válida tras ${MAX_INTENTOS} intentos. Intenta relajar los filtros.`);
    }
  };

  // Handlers de cambio (sin cambios)
  const handleCriterioChange = (e) => setNestedPersistentValue('criterios', e.target.name, e.target.value);
  const handleInputChange = (e) => setPersistentValue('inputValue', e.target.value);
  const handleExcludeChange = (e) => setExcludeValue(e.target.value);
  const handleDecenaExcludeChange = (e) => {
    const { name, checked } = e.target;
    setExcludedDecenas(prev => ({...prev, [name]: checked}));
  };

  // Filtrar historial de coincidencias
  const filteredHistorial = histCoincidencias.filter(h => {
      if (!h || !h.melate) return false; // Validación extra
      return filterAciertos === 'todos' || h.melate.display === filterAciertos;
  });

  // Guardar jugada
  const handleGuardarJugada = async () => {
    if (!esDiaDeSorteoValido(fechaParaGuardar)) {
        toast.error('Fecha inválida. Selecciona un domingo, miércoles o viernes.');
        return;
    }
    // Convertir fecha a UTC para comparar sin zona horaria
    const hoyUTC = new Date();
    hoyUTC.setUTCHours(0, 0, 0, 0); // Poner a medianoche UTC
    const [y, m, d] = fechaParaGuardar.split('-');
    const fechaSeleccionadaUTC = new Date(Date.UTC(y, m - 1, d));

    if (fechaSeleccionadaUTC < hoyUTC) {
        // Usar confirmación nativa de Electron si es posible, o window.confirm
        const confirmacion = window.confirm("La fecha seleccionada ya pasó. ¿Registrar para sorteo anterior?");
        if (!confirmacion) return;
    }

    if (!combinacion || combinacion.length !== 6 || !analisis || analisis.tipo !== 'sencilla' || !analisis.data) { // Validar analisis.data
        toast.error('Solo se pueden guardar jugadas sencillas (6 números) analizadas.');
        return;
    }
    if (!currentUser) {
        toast.error('Debes iniciar sesión para guardar.');
        return;
    }

    const fechaFormateada = `${d}/${m}/${y}`; // DD/MM/YYYY
    const jugada = { fecha: fechaFormateada, combinacion, analisis: analisis.data };
    const resultado = await window.electronAPI.guardarJugada({ jugada, userId: currentUser.uid });
    if (resultado.success) {
      toast.success(`Jugada guardada para el ${fechaFormateada}`);
      onJugadaGuardada(); // Callback para refrescar lista
    } else {
      toast.error(`Error al guardar: ${resultado.message || 'Error desconocido'}`);
    }
  };

  // Renderizar sección de análisis
  const renderAnalisis = () => {
    if (!analisis) return null;
    // Renderizar análisis para jugada sencilla
    if (analisis.tipo === 'sencilla') {
        const data = analisis.data;
        if (!data) return null; // Si no hay datos de análisis
        return (
          <div style={sectionStyle}>
            <h3 style={{...typography.h3, marginBottom: '20px', color: colors.text }}>Análisis de la Combinación</h3>
            <div style={{textAlign: 'left'}}>
                {/* Filas de análisis (Suma, Par/Impar, etc.) */}
                <div style={analysisRowStyle}>
                    <div style={{color: colors.text}}><strong>Suma Total:</strong> {data.suma.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Rango ideal: {data.suma.rango}</small></div>
                    <span style={verdictStyle(data.suma.veredicto)}>{data.suma.veredicto}</span>
                </div>
                <div style={analysisRowStyle}>
                    <div style={{color: colors.text}}><strong>Balance Par-Impar:</strong> {data.parImpar.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Ocurre en el {data.parImpar.porc}%</small></div>
                    <span style={verdictStyle(data.parImpar.veredicto)}>{data.parImpar.veredicto}</span>
                </div>
                <div style={analysisRowStyle}>
                    <div style={{color: colors.text}}><strong>Balance Bajos-Altos:</strong> {data.bajosAltos.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Ocurre en el {data.bajosAltos.porc}%</small></div>
                    <span style={verdictStyle(data.bajosAltos.veredicto)}>{data.bajosAltos.veredicto}</span>
                </div>
                <div style={analysisRowStyle}>
                    <div style={{color: colors.text}}><strong>Distribución por Decenas:</strong> {data.decenas.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Compara con patrones comunes</small></div>
                    <span style={verdictStyle(data.decenas.veredicto)}>{data.decenas.veredicto}</span>
                </div>
                <div style={{...analysisRowStyle, borderBottom: 'none'}}>
                    <div style={{color: colors.text}}><strong>Dispersión (Gap Promedio):</strong> {data.gaps.valor}<br/><small style={{...typography.small, color: colors.textSecondary}}>Rango ideal: {data.gaps.rango}</small></div>
                    <span style={verdictStyle(data.gaps.veredicto)}>{data.gaps.veredicto}</span>
                </div>
            </div>
            {/* Recomendación General */}
            <div style={{ marginTop: '25px', padding: '15px', borderRadius: '8px', backgroundColor: colors.lightGray || '#f0f0f0', color: colors.text }}>
                <strong>Recomendación General:</strong>
                <p style={{ ...typography.h4, margin: '8px 0 0 0', color: verdictStyle(data.recomendacionGeneral).color }}> {/* Usar color del veredicto */}
                    {data.recomendacionGeneral}
                </p>
            </div>
          </div>
        );
    }
    // Renderizar análisis para jugada múltiple
    if (analisis.tipo === 'multiple') {
        const { data, total } = analisis;
        if (!data) return null; // Si no hay datos
        return (
            <div style={sectionStyle}>
                <h3 style={{...typography.h3, marginBottom: '20px', color: colors.text }}>Análisis de Jugada Múltiple</h3>
                <p style={{...typography.body, color: colors.textSecondary}}>De las <strong>{total}</strong> combinaciones sencillas generadas:</p>
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

  // Cambiar tipo de jugada (resetear estado)
  const handleTipoJugadaChange = (num) => {
    const defaultCriterios = { sumaMin: '', sumaMax: '', parImpar: 'any', bajosAltos: 'any', decenas: 'any', gaps: 'any' };
    setPersistentState(prev => ({
        ...prev,
        tipoJugada: num,
        combinacion: [], // Resetear combinación
        analisis: null, // Resetear análisis
        histCoincidencias: [], // Resetear historial
        inputValue: '', // Resetear input
        criterios: defaultCriterios, // Resetear criterios
    }));
    // Resetear exclusiones locales
    setExcludeValue('');
    setExcludedDecenas({'0':false,'1':false,'2':false,'3':false,'4':false,'5':false});
  };

  // Fecha mínima para el input date (hoy)
  const minDate = useMemo(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); // Ajustar a zona horaria local
    return today.toISOString().split('T')[0];
  }, []);

  // --- Renderizado principal del componente ---
  return (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: '2rem' }}>Generador Inteligente</h2>

      {/* --- PASO 1: TIPO DE JUGADA --- */}
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso 1: Elige tu tipo de jugada</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
          {[6, 7, 8, 9, 10].map(num => (
            <button
              key={num}
              onClick={() => handleTipoJugadaChange(num)}
              style={{
                ...btnStyle,
                background: tipoJugada === num ? common.primaryGradient : (colors.lightGray || '#f0f0f0'), // Fallback
                color: tipoJugada === num ? '#fff' : (colors.text || '#000'), // Fallback
                boxShadow: tipoJugada === num ? btnStyle.boxShadow : 'none' // Quitar sombra si no está activo
              }}
            >
              {num === 6 ? 'Sencilla' : 'Múltiple'} ({num} números)
            </button>
          ))}
        </div>
      </div>

      {/* --- PASO 2: CRITERIOS (Solo para jugada sencilla) --- */}
      {tipoJugada === 6 && (
        <div style={sectionStyle}>
            <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso 2: Define Criterios (Opcional)</h3>
            <div style={criteriaGridStyle}>
               {/* Rango de Suma */}
               <div style={criteriaItemStyle}>
                   <label style={labelStyle} htmlFor="sumaMin">Rango de Suma</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <input type="number" name="sumaMin" id="sumaMin" value={criterios.sumaMin} onChange={handleCriterioChange} placeholder={analisisAvanzado.statsSuma?.rangoIdeal?.[0] ?? ''} style={{ ...inputStyle, width: '100%' }} />
                       <span>-</span>
                       <input type="number" name="sumaMax" value={criterios.sumaMax} onChange={handleCriterioChange} placeholder={analisisAvanzado.statsSuma?.rangoIdeal?.[1] ?? ''} style={{ ...inputStyle, width: '100%' }} />
                   </div>
               </div>
               {/* Balance Par/Impar */}
               <div style={criteriaItemStyle}>
                   <label style={labelStyle} htmlFor="parImpar">Balance Par/Impar</label>
                   <select name="parImpar" id="parImpar" value={criterios.parImpar} onChange={handleCriterioChange} style={inputStyle}>
                       <option value="any">Cualquiera</option>
                       {analisisAvanzado.distribucionParImpar && Object.keys(analisisAvanzado.distribucionParImpar).sort().map(key => (
                           <option key={key} value={key}>{key} ({analisisAvanzado.distribucionParImpar[key]}%)</option>
                       ))}
                   </select>
               </div>
               {/* Balance Bajos/Altos */}
               <div style={criteriaItemStyle}>
                   <label style={labelStyle} htmlFor="bajosAltos">Balance Bajos/Altos</label>
                   <select name="bajosAltos" id="bajosAltos" value={criterios.bajosAltos} onChange={handleCriterioChange} style={inputStyle}>
                       <option value="any">Cualquiera</option>
                       {analisisAvanzado.distribucionBajosAltos && Object.keys(analisisAvanzado.distribucionBajosAltos).sort().map(key => (
                           <option key={key} value={key}>{key} ({analisisAvanzado.distribucionBajosAltos[key]}%)</option>
                       ))}
                   </select>
               </div>
               {/* Distribución por Decenas */}
               <div style={criteriaItemStyle}>
                   <label style={labelStyle} htmlFor="decenas">Distribución por Decenas</label>
                   <select name="decenas" id="decenas" value={criterios.decenas} onChange={handleCriterioChange} style={inputStyle}>
                       <option value="any">Cualquiera</option>
                       <option value="balanceada">Balanceada (en 4+ decenas)</option>
                       <option value="concentrada">Concentrada (en 3 o menos)</option>
                   </select>
               </div>
               {/* Dispersión (Gaps) */}
               <div style={criteriaItemStyle}>
                   <label style={labelStyle} htmlFor="gaps">Dispersión (Gaps)</label>
                   <select name="gaps" id="gaps" value={criterios.gaps} onChange={handleCriterioChange} style={inputStyle}>
                       <option value="any">Cualquiera</option>
                       <option value="ideal">Balanceada (Gap ideal)</option>
                       <option value="juntos">Agrupada (Números juntos)</option>
                       <option value="separados">Dispersa (Números separados)</option>
                   </select>
               </div>
            </div>
        </div>
      )}

      {/* --- PASO 3/2: NÚMEROS BASE --- */}
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '3' : '2'}: Ingresa Números Base (Opcional)</h3>
        <p style={{ ...typography.body, ...typography.small, color: colors.textSecondary, margin: '1rem 0' }}>
            Incluye hasta {tipoJugada} números fijos, separados por comas.
        </p>
        <div>
            <input
              type="text"
              placeholder="Ej: 5, 12, 45"
              value={inputValue}
              onChange={handleInputChange}
              style={{ ...inputStyle, width: '60%' }}
            />
        </div>
      </div>

      {/* --- PASO 4/3: EXCLUIR NÚMEROS --- */}
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '4' : '3'}: Excluye Números (Opcional)</h3>
        <div style={{...criteriaGridStyle, gridTemplateColumns: '1fr', gap: '25px'}}>
            {/* Excluir específicos */}
            <div>
                <label style={labelStyle}>Excluir números específicos (separados por coma)</label>
                <input
                  type="text"
                  placeholder="Ej: 7, 22, 50"
                  value={excludeValue}
                  onChange={handleExcludeChange}
                  style={{ ...inputStyle, width: '100%' }}
                />
            </div>
            {/* Excluir decenas */}
            <div>
                <label style={labelStyle}>Excluir decenas completas</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center'}}>
                    {['1-9','10-19','20-29','30-39','40-49','50-56'].map((label, index) => (
                        <div key={index} style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <input
                              type="checkbox"
                              id={`decena-${index}`}
                              name={String(index)}
                              checked={excludedDecenas[String(index)]}
                              onChange={handleDecenaExcludeChange}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }} // Estilo checkbox
                            />
                            <label htmlFor={`decena-${index}`} style={{color: colors.text, cursor: 'pointer'}}>{label}</label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- PASO 5/4: GENERAR --- */}
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, marginTop: 0, color: colors.text }}>Paso {tipoJugada === 6 ? '5' : '4'}: Genera y Analiza</h3>
        <button onClick={generarCombinacion} style={{...btnStyle, padding: '12px 24px', marginTop: '1rem'}}>
            Generar Combinación de {tipoJugada}
        </button>
      </div>

      {/* --- RESULTADO: COMBINACIÓN GENERADA --- */}
      {combinacion.length > 0 && (
        <div style={{ ...sectionStyle, background: colors.lightGray || '#f0f0f0', borderColor: common.primary }}>
          <h3 style={{ ...typography.h3, color: colors.text }}>Combinación Generada</h3>
          <p style={{...typography.h2, letterSpacing: '3px', color: common.primary, fontWeight: 'bold'}}>
              {combinacion.join(' - ')}
          </p>
          {/* Info para jugada múltiple */}
          {tipoJugada > 6 && (
              <p style={{...typography.body, color: colors.textSecondary, marginTop: '1rem'}}>
                ℹ️ Tu jugada múltiple de <strong>{tipoJugada} números</strong> genera <strong>{combinacionesPorJugada[tipoJugada]} combinaciones</strong> de 6.
              </p>
          )}
          {/* Opción para guardar jugada sencilla */}
          {tipoJugada === 6 && analisis?.tipo === 'sencilla' && (
            <div style={{ marginTop: '25px', padding: '15px', borderRadius: '8px', backgroundColor: colors.surface || '#fff' }}>
              <strong style={{...typography.body, color: colors.text}}>¿Quieres registrar esta jugada?</strong>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label htmlFor="fecha-guardar" style={{ ...typography.small, fontWeight: 'bold', color: colors.textSecondary }}>Fecha del Sorteo:</label>
                <input
                  id="fecha-guardar"
                  type="date"
                  value={fechaParaGuardar}
                  onChange={(e) => setFechaParaGuardar(e.target.value)}
                  style={inputStyle}
                  min={minDate} // Asegurar que no se seleccionen fechas anteriores a hoy
                />
                <button onClick={handleGuardarJugada} style={btnStyle}>Guardar Jugada</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- RESULTADO: ANÁLISIS --- */}
      {renderAnalisis()}

      {/* --- RESULTADO: HISTORIAL DE COINCIDENCIAS (Solo para jugada sencilla) --- */}
      {tipoJugada === 6 && histCoincidencias.length > 0 && (
        <div style={sectionStyle}>
            <h3 style={{...typography.h3, color: colors.text}}>Rendimiento Histórico</h3>
            {/* Filtro de Aciertos */}
            <div style={{ margin: '1rem 0' }}>
                <label htmlFor="filtro-aciertos" style={{...labelStyle, marginRight: '10px'}}>Filtrar por aciertos en Melate:</label>
                <select id="filtro-aciertos" value={filterAciertos} onChange={(e) => setFilterAciertos(e.target.value)} style={inputStyle}>
                    <option value="todos">Todos ({histCoincidencias.length})</option>
                    {/* Opciones generadas dinámicamente */}
                    {[...new Set(histCoincidencias.map(h => h?.melate?.display).filter(Boolean))] // Filtrar nulos/undefined
                      .sort((a,b) => parseFloat(b.replace('+1', '.5')) - parseFloat(a.replace('+1', '.5'))) // Ordenar
                      .map(acierto => (
                          <option key={acierto} value={acierto}>
                              {acierto} aciertos ({histCoincidencias.filter(h => h?.melate?.display === acierto).length})
                          </option>
                      ))
                    }
                </select>
            </div>
            {/* Tabla de Historial */}
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
                    {filteredHistorial.map((h, i) => ( // Usar filteredHistorial
                        <tr key={i} style={{backgroundColor: i % 2 === 0 ? 'transparent' : (colors.lightGray || '#f0f0f0')}}>
                            {/* Columna Concurso/Fecha */}
                            <td style={thTd}>
                                <strong>{h.concurso}</strong><br/>
                                <small style={{...typography.small, color: colors.textSecondary}}>{h.fecha}</small>
                            </td>
                            {/* Columna Aciertos Totales */}
                            <td style={{...thTd, textAlign: 'left', lineHeight: '1.6'}}>
                                { (h.melate?.aciertos?.length > 0 || h.melate?.adicional != null) && <div><strong>Melate:</strong> {h.melate.display}</div> }
                                { h.revancha?.aciertos?.length > 0 && <div><strong>Revancha:</strong> {h.revancha.aciertos.length}</div> }
                                { h.revanchita?.aciertos?.length > 0 && <div><strong>Revanchita:</strong> {h.revanchita.aciertos.length}</div> }
                            </td>
                            {/* Columna Números Acertados */}
                            <td style={{...thTd, textAlign: 'left', lineHeight: '1.6'}}>
                                {/* Melate */}
                                { (h.melate?.aciertos?.length > 0 || h.melate?.adicional != null) && (
                                    <div style={{padding: '2px 0'}}>
                                        <strong>Melate:</strong>
                                        {h.melate.aciertos.length > 0 && <span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.melate.aciertos.join(' - ')}</span>}
                                        {h.melate.adicional != null && <span style={{color: common.primary, fontWeight: 'bold'}}> + {h.melate.adicional} (Adicional)</span>}
                                    </div>
                                )}
                                {/* Revancha */}
                                { h.revancha?.aciertos?.length > 0 && (
                                    <div style={{padding: '2px 0', borderTop: `1px solid ${colors.border || '#ccc'}`}}>
                                        <strong>Revancha:</strong>
                                        <span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.revancha.aciertos.join(' - ')}</span>
                                    </div>
                                )}
                                {/* Revanchita */}
                                { h.revanchita?.aciertos?.length > 0 && (
                                    <div style={{padding: '2px 0', borderTop: `1px solid ${colors.border || '#ccc'}`}}>
                                        <strong>Revanchita:</strong>
                                        <span style={{color: common.success, marginLeft: '10px', fontWeight: 'bold'}}>{h.revanchita.aciertos.join(' - ')}</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {/* Mensaje si no hay resultados filtrados */}
                    {filteredHistorial.length === 0 && (
                        <tr><td colSpan="3" style={{...thTd, textAlign: 'center', fontStyle: 'italic', color: colors.textSecondary}}>No hay coincidencias históricas para este filtro.</td></tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
      )}
    </div>
  );
}