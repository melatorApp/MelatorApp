import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { getSectionStyle, typography, common, getThTd, getTableHeader, getInputStyle, getBtnStyle } from './styles';

// --- ✨ COMPONENTE MEJORADO: ANÁLISIS PREDICTIVO CON ORDENAMIENTO ✨ ---
const AnalisisPredictivo = ({ analisis, colors }) => {
    const [scoreFilter, setScoreFilter] = useState('todos');
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'descending' });
    
    const categorizedNumbers = useMemo(() => {
        if (!analisis) return {};
        const allNumbers = Object.values(analisis);
        const totalNumbers = allNumbers.length;
        if (totalNumbers === 0) return {};

        const sortedByScore = [...allNumbers].sort((a, b) => b.score - a.score);
        const top10 = sortedByScore.slice(0, 10);
        const umbralAlto = sortedByScore[Math.floor(totalNumbers * 0.3)]?.score ?? 0;
        const umbralMedio = sortedByScore[Math.floor(totalNumbers * 0.7)]?.score ?? 0;
        
        return {
            'todos': allNumbers,
            'muy-alto': top10,
            'alto': allNumbers.filter(n => n.score >= umbralAlto && !top10.includes(n)),
            'medio': allNumbers.filter(n => n.score >= umbralMedio && n.score < umbralAlto),
        };
    }, [analisis]);

    const filteredData = useMemo(() => {
        return categorizedNumbers[scoreFilter] || [];
    }, [categorizedNumbers, scoreFilter]);

    const sortedAndFilteredData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const btnStyle = getBtnStyle();
    const activeBtnStyle = { ...btnStyle };
    const inactiveBtnStyle = { ...btnStyle, background: colors.lightGray, color: colors.text, boxShadow: 'none' };
    const thTd = getThTd(colors);
    const tableHeader = {...getTableHeader(colors), cursor: 'pointer'};

    const getTendenciaStyle = (tendencia) => {
        switch(tendencia) {
            case 'En Ascenso': return { color: common.success, fontWeight: 'bold' };
            case 'En Descenso': return { color: common.danger, fontWeight: 'bold' };
            default: return { color: colors.textSecondary };
        }
    };

    return (
        <div style={{textAlign: 'left'}}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setScoreFilter('todos')} style={scoreFilter === 'todos' ? activeBtnStyle : inactiveBtnStyle}>Todos ({categorizedNumbers['todos']?.length || 0})</button>
                <button onClick={() => setScoreFilter('muy-alto')} style={scoreFilter === 'muy-alto' ? activeBtnStyle : inactiveBtnStyle}>🔥 Potencial Muy Alto ({categorizedNumbers['muy-alto']?.length || 0})</button>
                <button onClick={() => setScoreFilter('alto')} style={scoreFilter === 'alto' ? activeBtnStyle : inactiveBtnStyle}>🌶️ Potencial Alto ({categorizedNumbers['alto']?.length || 0})</button>
                <button onClick={() => setScoreFilter('medio')} style={scoreFilter === 'medio' ? activeBtnStyle : inactiveBtnStyle}>💧 Potencial Medio ({categorizedNumbers['medio']?.length || 0})</button>
            </div>

            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
                    <thead>
                        <tr>
                            <th style={tableHeader} onClick={() => requestSort('numero')}>Número{getSortIndicator('numero')}</th>
                            <th style={tableHeader} onClick={() => requestSort('score')}>Score Potencial{getSortIndicator('score')}</th>
                            <th style={{...tableHeader, minWidth: '120px'}} onClick={() => requestSort('tendencia')}>Tendencia{getSortIndicator('tendencia')}</th>
                            <th style={tableHeader} onClick={() => requestSort('sorteosSinAparecer')}>Racha Fría{getSortIndicator('sorteosSinAparecer')}</th>
                            <th style={tableHeader} onClick={() => requestSort('frecuenciaReciente')}>Frec. Reciente{getSortIndicator('frecuenciaReciente')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item, i) => (
                            <tr key={item.numero} style={{backgroundColor: i % 2 === 0 ? 'transparent' : colors.lightGray}}>
                                <td style={{...thTd, fontSize: '1.2rem', fontWeight: 'bold'}}>{item.numero}</td>
                                <td style={{...thTd, fontWeight: 'bold', color: common.primary}}>{item.score}</td>
                                <td style={{...thTd, ...getTendenciaStyle(item.tendencia)}}>{item.tendencia}</td>
                                <td style={thTd}>{item.sorteosSinAparecer} sorteos</td>
                                <td style={thTd}>{item.frecuenciaReciente} veces</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" style={thTd}>No hay números en esta categoría.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RachaFriaTabla = ({ historial, colors }) => {
  const [filtroTemp, setFiltroTemp] = useState('todos');
  const [sortConfig, setSortConfig] = useState({ key: 'sorteosSinAparecer', direction: 'descending' });

  const datosRacha = useMemo(() => {
    if (!historial || historial.length === 0) return [];
    
    return Array.from({ length: 56 }, (_, i) => {
      const numero = i + 1;
      const index = historial.findIndex(sorteo => sorteo.numeros.includes(numero));
      return {
        numero: numero,
        sorteosSinAparecer: index === -1 ? historial.length : index,
        ultimaFecha: index === -1 ? 'Nunca' : historial[index].fecha,
      };
    });
  }, [historial]);

  const datosFiltrados = useMemo(() => {
    switch (filtroTemp) {
      case 'congelados': return datosRacha.filter(d => d.sorteosSinAparecer >= 72);
      case 'muyFrios': return datosRacha.filter(d => d.sorteosSinAparecer >= 30 && d.sorteosSinAparecer < 72);
      case 'frios': return datosRacha.filter(d => d.sorteosSinAparecer >= 15 && d.sorteosSinAparecer < 30);
      case 'tibios': return datosRacha.filter(d => d.sorteosSinAparecer >= 6 && d.sorteosSinAparecer < 15);
      case 'calientes': return datosRacha.filter(d => d.sorteosSinAparecer >= 1 && d.sorteosSinAparecer < 6);
      case 'enFuego': return datosRacha.filter(d => d.sorteosSinAparecer === 0);
      default: return datosRacha;
    }
  }, [datosRacha, filtroTemp]);

  const datosOrdenados = useMemo(() => {
    const sortableItems = [...datosFiltrados];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        });
    }
    return sortableItems;
  }, [datosFiltrados, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key) => {
      if (sortConfig.key !== key) return '';
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  }

  const inputStyle = getInputStyle(colors);
  const thTd = getThTd(colors);
  const tableHeader = { ...getTableHeader(colors), cursor: 'pointer' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
        <label htmlFor="temp-filter" style={{...typography.small, color: colors.textSecondary, marginRight: '10px', fontWeight: 'bold'}}>Filtrar por Temperatura:</label>
        <select id="temp-filter" value={filtroTemp} onChange={(e) => setFiltroTemp(e.target.value)} style={inputStyle}>
          <option value="todos">Todos los Números ({datosRacha.length})</option>
          <option value="enFuego">🔥 En Fuego (Último sorteo)</option>
          <option value="calientes">🌶️ Calientes (Hace 1-5 sorteos)</option>
          <option value="tibios"> lukewarm Tibios (Hace 6-14 sorteos)</option>
          <option value="frios">💧 Fríos (Hace 15-29 sorteos)</option>
          <option value="muyFrios">🧊 Muy Fríos (Hace 30-71 sorteos)</option>
          <option value="congelados">❄️ Congelados (Hace 72+ sorteos)</option>
        </select>
      </div>

      <div style={{maxHeight: '400px', overflowY: 'auto'}}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
          <thead>
            <tr>
              <th style={tableHeader} onClick={() => requestSort('numero')}>Número{getSortIndicator('numero')}</th>
              <th style={tableHeader} onClick={() => requestSort('sorteosSinAparecer')}>Sorteos sin Aparecer{getSortIndicator('sorteosSinAparecer')}</th>
              <th style={tableHeader} onClick={() => requestSort('ultimaFecha')}>Última Fecha{getSortIndicator('ultimaFecha')}</th>
            </tr>
          </thead>
          <tbody>
            {datosOrdenados.map((item, i) => (
              <tr key={item.numero} style={{backgroundColor: i % 2 === 0 ? 'transparent' : colors.lightGray}}>
                <td style={thTd}>{item.numero}</td>
                <td style={thTd}>{item.sorteosSinAparecer}</td>
                <td style={thTd}>{item.ultimaFecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const HighlightedCombo = ({ combo, filter }) => {
    if (!filter || !combo) return combo || '';
    const filterParts = filter.split(',').map(p => p.trim()).filter(p => p);
    const comboParts = combo.split(',');
    return (
        <span>
            {comboParts.map((part, i) => {
                const trimmedPart = part.trim();
                const isMatch = filterParts.includes(trimmedPart);
                return (
                    <span key={i}>
                        {isMatch ? <strong style={{ color: common.warning, background: `${common.warning}20`, padding: '2px 4px', borderRadius: '4px' }}>{trimmedPart}</strong> : trimmedPart}
                        {i < comboParts.length - 1 ? ', ' : ''}
                    </span>
                );
            })}
        </span>
    );
};

const BuscadorCombinaciones = ({ allPairs, allTrios, colors }) => {
  const [tipoBusqueda, setTipoBusqueda] = useState('pares');
  const [numeroInput, setNumeroInput] = useState('');
  
  const datosParaBusqueda = useMemo(() => tipoBusqueda === 'pares' ? allPairs : allTrios, [tipoBusqueda, allPairs, allTrios]);

  const resultados = useMemo(() => {
    if (!numeroInput.trim()) return [];
    const numeroBuscado = numeroInput.trim();
    const keyName = tipoBusqueda === 'pares' ? 'pair' : 'trio';
    return datosParaBusqueda.filter(item => item[keyName].split('-').includes(numeroBuscado)).slice(0, 5);
  }, [numeroInput, datosParaBusqueda, tipoBusqueda]);

  const inputStyle = getInputStyle(colors);
  const thTd = getThTd(colors);
  const tableHeader = getTableHeader(colors);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{...typography.small, display: 'block', color: colors.textSecondary, marginBottom: '5px', fontWeight: 'bold'}}>Buscar por número:</label>
          <input type="number" value={numeroInput} onChange={(e) => setNumeroInput(e.target.value)} placeholder="Ej: 21" style={{...inputStyle, width: '120px'}}/>
        </div>
        <div>
          <label style={{...typography.small, display: 'block', color: colors.textSecondary, marginBottom: '5px', fontWeight: 'bold'}}>Tipo de Combinación:</label>
          <select value={tipoBusqueda} onChange={(e) => setTipoBusqueda(e.target.value)} style={inputStyle}>
            <option value="pares">Parejas frecuentes</option>
            <option value="tercias">Tercias frecuentes</option>
          </select>
        </div>
      </div>

      {numeroInput && (
        <div style={{maxHeight: '300px', overflowY: 'auto'}}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
            <thead><tr><th style={tableHeader}>{tipoBusqueda === 'pares' ? 'Pareja' : 'Tercia'}</th><th style={tableHeader}>Frecuencia</th></tr></thead>
            <tbody>
              {resultados.length > 0 ? (
                resultados.map((item, i) => (
                  <tr key={i} style={{backgroundColor: i % 2 === 0 ? 'transparent' : colors.lightGray}}>
                    <td style={thTd}>{item[tipoBusqueda === 'pares' ? 'pair' : 'trio']}</td><td style={thTd}>{item.count} veces</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" style={thTd}>No se encontraron {tipoBusqueda} para el número "{numeroInput}".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function Estadisticas({ stats }) {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    const { 
        frecuencias = [], 
        historial = [], 
        combinaciones_frecuentes = [],
        allPairs = [],
        allTrios = [],
        analisisPredictivo = {}
    } = stats || {};
    
    const [filtroCombinacion, setFiltroCombinacion] = useState('');

    const dataFreq = useMemo(() => Array.from({ length: 56 }, (_, i) => ({ numero: i + 1, frecuencia: frecuencias[i + 1] || 0 })), [frecuencias]);

    const dataSum = useMemo(() => {
        if (!historial || historial.length === 0) return [];
        const sumCounts = {};
        historial.forEach(draw => {
            if (draw.numeros && Array.isArray(draw.numeros) && draw.numeros.length > 0) {
                const sum = draw.numeros.reduce((acc, n) => acc + n, 0);
                sumCounts[sum] = (sumCounts[sum] || 0) + 1;
            }
        });
        return Object.entries(sumCounts).map(([sum, count]) => ({ sum: Number(sum), count })).sort((a, b) => a.sum - b.sum);
    }, [historial]);

    const { top5, bottom5 } = useMemo(() => {
        if (!dataFreq || dataFreq.length === 0) return { top5: [], bottom5: [] };
        const sortedFreq = [...dataFreq].sort((a, b) => b.frecuencia - a.frecuencia);
        return { top5: sortedFreq.slice(0, 5).map(x => x.numero), bottom5: sortedFreq.slice(-5).map(x => x.numero) };
    }, [dataFreq]);

    const top10Pairs = useMemo(() => allPairs.slice(0, 10), [allPairs]);

    const combosFiltrados = useMemo(() => {
        if (!filtroCombinacion) return [];
        const searchTerms = filtroCombinacion.split(',').map(n => n.trim()).filter(n => n);
        if (searchTerms.length === 0) return [];
        return (combinaciones_frecuentes || []).filter(c => {
                const comboNumbers = c.combo.split(',').map(n => n.trim());
                return searchTerms.every(term => comboNumbers.includes(term));
            }).slice(0, 50);
    }, [combinaciones_frecuentes, filtroCombinacion]);

    const sectionStyle = getSectionStyle(colors);
    const inputStyle = getInputStyle(colors);
    const thTd = getThTd(colors);
    const tableHeader = getTableHeader(colors);
    const bentoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' };

    return (
        <div>
            <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: '2rem' }}>Análisis Estadístico</h2>
            
            <div style={sectionStyle}>
                <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Análisis Predictivo y Tendencias</h3>
                <p style={{...typography.small, color: colors.textSecondary, marginBottom: '2rem'}}>Filtra y ordena los números por su "Score de Potencial" para identificar los más interesantes según las estadísticas.</p>
                <AnalisisPredictivo analisis={analisisPredictivo} colors={colors} />
            </div>

            <div style={sectionStyle}>
                <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Frecuencia por Número</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={dataFreq} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="numero" stroke={colors.textSecondary} tick={{ fill: colors.textSecondary }}/>
                            <YAxis stroke={colors.textSecondary} tick={{ fill: colors.textSecondary }}/>
                            <Tooltip cursor={{fill: `${common.primary}20`}} contentStyle={{backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px'}}/>
                            <Bar dataKey="frecuencia" fill={common.primary} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '1rem', flexWrap: 'wrap'}}>
                    <p style={{...typography.body, color: colors.text}}><strong>Top 5 más frecuentes:</strong> {top5.join(', ')}</p>
                    <p style={{...typography.body, color: colors.text}}><strong>Bottom 5 menos frecuentes:</strong> {bottom5.join(', ')}</p>
                </div>
            </div>

            <div style={sectionStyle}>
                <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Termómetro de Números (Racha)</h3>
                <p style={{...typography.small, color: colors.textSecondary}}>Analiza qué tan "fríos" o "calientes" están los números. Haz clic en los encabezados para ordenar.</p>
                <RachaFriaTabla historial={historial} colors={colors} />
            </div>
            
            <div style={bentoGridStyle}>
                <div style={sectionStyle}>
                    <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Distribución de Sumas</h3>
                     <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                          <BarChart data={dataSum} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="sum" stroke={colors.textSecondary} tick={{ fill: colors.textSecondary }}/>
                            <YAxis stroke={colors.textSecondary} tick={{ fill: colors.textSecondary }}/>
                            <Tooltip cursor={{fill: `${common.primary}20`}} contentStyle={{backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px'}}/>
                            <Bar dataKey="count" fill={common.primary} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                </div>
                <div style={sectionStyle}>
                    <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Top 10 Pares Más Comunes</h3>
                    <ul style={{textAlign: 'left', columns: 2, listStylePosition: 'inside', color: colors.text}}>
                        {top10Pairs.map((p, i) => ( <li key={i} style={typography.body}>{p.pair}: <strong>{p.count} veces</strong></li> ))}
                    </ul>
                </div>
            </div>
            
            <div style={sectionStyle}>
                <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Buscador de Pares y Tercias Frecuentes</h3>
                <p style={{...typography.small, color: colors.textSecondary, marginBottom: '2rem'}}>Escribe un número para encontrar las 5 combinaciones más frecuentes que lo contienen.</p>
                <BuscadorCombinaciones allPairs={allPairs} allTrios={allTrios} colors={colors} />
            </div>

            <div style={sectionStyle}>
                <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Buscar Combinaciones Ganadoras Repetidas</h3>
                 <p style={{...typography.small, color: colors.textSecondary}}>Escribe uno o varios números para ver si han formado parte de una combinación ganadora que se haya repetido en la historia.</p>
                <input type="text" placeholder="Buscar por número(s)... Ej: 21 o 5, 12" value={filtroCombinacion} onChange={e => setFiltroCombinacion(e.target.value)} style={{ ...inputStyle, margin: '1rem 0', width: '50%' }} />
                {filtroCombinacion && (
                    <div style={{maxHeight: '400px', overflowY: 'auto', marginTop: '1rem'}}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
                            <thead><tr><th style={tableHeader}>Combinación Repetida</th><th style={tableHeader}>Veces</th></tr></thead>
                            <tbody>
                              {combosFiltrados.length > 0 ? (
                                combosFiltrados.map((c, i) => (<tr key={i} style={{backgroundColor: i % 2 === 0 ? 'transparent' : colors.lightGray}}><td style={thTd}><HighlightedCombo combo={c.combo} filter={filtroCombinacion} /></td><td style={thTd}>{c.count}</td></tr>))
                              ) : (
                                <tr><td colSpan="2" style={thTd}>No se encontraron combinaciones repetidas con los números "{filtroCombinacion}".</td></tr>
                              )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}