import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from './ThemeContext'; // <-- CORRECCIÓN CLAVE
import { getSectionStyle, getBtnStyle, getInputStyle, common, typography } from './styles';

export default function Comprobador({ stats }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  const sectionStyle = getSectionStyle(colors);
  const btnStyle = getBtnStyle();
  const inputStyle = getInputStyle(colors);

  const [concursoInput, setConcursoInput] = useState('');
  const [sorteoSeleccionado, setSorteoSeleccionado] = useState(null);
  const [numerosInput, setNumerosInput] = useState('');
  const [resultado, setResultado] = useState(null);
  const { historial } = stats;

  const historialMap = useMemo(() => {
    return new Map(historial.map(s => [s.concurso, s]));
  }, [historial]);

  const premiosMelate = {
    '6': '1er Lugar (¡Premio Mayor!)', '5+1': '2do Lugar', '5': '3er Lugar',
    '4+1': '4to Lugar', '4': '5to Lugar', '3+1': '6to Lugar',
    '3': '7mo Lugar', '2+1': '8vo Lugar', '2': '9no Lugar',
  };
  const premiosRevancha = { '6': '1er Lugar' };
  const premiosRevanchita = { '6': '1er Lugar (¡Premio Único!)' };

  const handleBuscarSorteo = () => {
    setSorteoSeleccionado(null);
    setNumerosInput('');
    setResultado(null);
    const sorteoEncontrado = historialMap.get(concursoInput.trim());
    if (sorteoEncontrado) {
      setSorteoSeleccionado(sorteoEncontrado);
    } else {
      toast.error(`El sorteo N° ${concursoInput.trim()} no fue encontrado en la base de datos.`);
    }
  };

  const handleComprobarCombinacion = () => {
    const numerosUsuario = numerosInput.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 56);
    if (numerosUsuario.length !== 6) {
      toast.error('Por favor, ingresa 6 números válidos separados por comas.');
      return;
    }
    const aciertosNaturalesArr = numerosUsuario.filter(n => sorteoSeleccionado.numeros.includes(n));
    const numerosNoAcertados = numerosUsuario.filter(n => !sorteoSeleccionado.numeros.includes(n));
    const aciertoAdicional = numerosNoAcertados.includes(sorteoSeleccionado.adicional);
    const aciertosCount = aciertosNaturalesArr.length;
    const keyPremioMelate = `${aciertosCount}${aciertoAdicional ? '+1' : ''}`;
    let aciertosRevancha = sorteoSeleccionado.numeros_revancha ? numerosUsuario.filter(n => sorteoSeleccionado.numeros_revancha.includes(n)).length : 0;
    let aciertosRevanchita = sorteoSeleccionado.numeros_revanchita ? numerosUsuario.filter(n => sorteoSeleccionado.numeros_revanchita.includes(n)).length : 0;
    setResultado({
      melate: { aciertos_display: `${aciertosCount} ${aciertoAdicional ? '+ Adicional' : 'naturales'}`, premio: premiosMelate[keyPremioMelate] || 'Sin premio' },
      revancha: { aciertos_display: `${aciertosRevancha} naturales`, premio: premiosRevancha[aciertosRevancha.toString()] || 'Sin premio' },
      revanchita: { aciertos_display: `${aciertosRevanchita} naturales`, premio: premiosRevanchita[aciertosRevanchita.toString()] || 'Sin premio' }
    });
  };

  const resultBoxStyle = (premio) => ({
    ...sectionStyle,
    marginTop: '1rem',
    textAlign: 'left',
    borderColor: premio !== 'Sin premio' ? common.success : colors.border,
    backgroundColor: premio !== 'Sin premio' ? `${common.success}15` : colors.surface,
  });

  return (
    <div>
        <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: '2rem' }}>Verificador de Sorteos</h2>
      <div style={sectionStyle}>
        <h3 style={{ ...typography.h3, color: colors.text, marginTop: 0 }}>Paso 1: Busca tu Sorteo</h3>
        <p style={{ ...typography.body, color: colors.textSecondary, margin: '1rem 0' }}>Ingresa el número del sorteo que quieres comprobar.</p>
        <div>
          <input type="text" value={concursoInput} onChange={(e) => setConcursoInput(e.target.value)} placeholder="Ej: 3850" style={inputStyle} />
          <button onClick={handleBuscarSorteo} style={{...btnStyle, marginLeft: '1rem'}}>Buscar Sorteo</button>
        </div>
      </div>

      {sorteoSeleccionado && (
        <div style={sectionStyle}>
          <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Paso 2: Ingresa tu Combinación</h3>
          <div style={{textAlign: 'left', maxWidth: '400px', margin: 'auto', background: colors.lightGray, padding: '15px', borderRadius: '8px'}}>
            <p><strong>Sorteo Encontrado:</strong> N° {sorteoSeleccionado.concurso} ({sorteoSeleccionado.fecha})</p>
            <p><strong>Melate:</strong> {sorteoSeleccionado.numeros.join(' - ')} | <strong>Adicional:</strong> {sorteoSeleccionado.adicional}</p>
            {sorteoSeleccionado.numeros_revancha && <p><strong>Revancha:</strong> {sorteoSeleccionado.numeros_revancha.join(' - ')}</p>}
            {sorteoSeleccionado.numeros_revanchita && <p><strong>Revanchita:</strong> {sorteoSeleccionado.numeros_revanchita.join(' - ')}</p>}
          </div>
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: `1px solid ${colors.border}` }} />
          <p style={{ ...typography.body, color: colors.textSecondary, margin: '1rem 0' }}>Ahora, ingresa tus 6 números separados por comas:</p>
          <div>
            <input type="text" value={numerosInput} onChange={(e) => setNumerosInput(e.target.value)} placeholder="Ej: 5, 12, 23, 34, 45, 56" style={{ ...inputStyle, width: '60%', minWidth: '250px' }} />
            <button onClick={handleComprobarCombinacion} style={{...btnStyle, marginLeft: '1rem'}}>Comprobar</button>
          </div>
        </div>
      )}

      {resultado && (
        <div style={sectionStyle}>
          <h3 style={{...typography.h3, color: colors.text, marginTop: 0}}>Paso 3: ¡Revisa tus Resultados!</h3>
          
          <div style={resultBoxStyle(resultado.melate.premio)}>
            <strong style={{color: colors.text}}>Melate:</strong>
            <p style={{...typography.body, margin: '8px 0', color: colors.text}}>Tuviste {resultado.melate.aciertos_display}.</p>
            <h4 style={{...typography.h4, marginTop: '0', color: resultado.melate.premio !== 'Sin premio' ? common.success : colors.text }}>
              {resultado.melate.premio}
            </h4>
          </div>

          <div style={resultBoxStyle(resultado.revancha.premio)}>
            <strong style={{color: colors.text}}>Revancha:</strong>
            <p style={{...typography.body, margin: '8px 0', color: colors.text}}>Tuviste {resultado.revancha.aciertos_display}.</p>
            <h4 style={{...typography.h4, marginTop: '0', color: resultado.revancha.premio !== 'Sin premio' ? common.success : colors.text }}>
              {resultado.revancha.premio}
            </h4>
          </div>

          <div style={resultBoxStyle(resultado.revanchita.premio)}>
            <strong style={{color: colors.text}}>Revanchita:</strong>
            <p style={{...typography.body, margin: '8px 0', color: colors.text}}>Tuviste {resultado.revanchita.aciertos_display}.</p>
            <h4 style={{...typography.h4, marginTop: '0', color: resultado.revanchita.premio !== 'Sin premio' ? common.success : colors.text }}>
              {resultado.revanchita.premio}
            </h4>
          </div>
        </div>
      )}
    </div>
  );
}