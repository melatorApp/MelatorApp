import React from 'react';
import { useTheme } from './ThemeContext';
import { common, typography } from './styles';

// Componente individual para una bola
const Ball = ({ num, ballType, isHit }) => {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  let baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    boxShadow: 'inset -3px -3px 5px rgba(0,0,0,0.2)',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
  };

  switch (ballType) {
    case 'melate':
      baseStyle.background = `linear-gradient(135deg, ${common.danger} 20%, #c53030 100%)`; // Roja
      if (isHit) {
        baseStyle.background = common.success;
        baseStyle.boxShadow = '0 0 10px 3px #0f0';
        baseStyle.borderColor = '#fff';
      }
      break;
    case 'adicional':
      baseStyle.background = common.primary; // Azul
      if (isHit) {
        baseStyle.boxShadow = '0 0 10px 3px #0ff';
        baseStyle.borderColor = '#fff';
      }
      break;
    case 'revancha':
      baseStyle.background = `linear-gradient(135deg, ${common.success} 20%, #2f855a 100%)`; // Verde
      if (isHit) {
        baseStyle.background = `linear-gradient(135deg, ${common.success} 20%, #2f855a 100%)`;
        baseStyle.boxShadow = '0 0 10px 3px #0f0'; // Resplandor verde
        baseStyle.borderColor = '#fff';
      }
      break;
    case 'revanchita':
      baseStyle.background = `linear-gradient(135deg, ${common.warning} 20%, #d69e2e 100%)`; // Amarilla
      baseStyle.color = '#1A202C'; // Texto oscuro para bola amarilla
      if (isHit) {
        baseStyle.background = `linear-gradient(135deg, ${common.warning} 20%, #d69e2e 100%)`;
        baseStyle.boxShadow = '0 0 10px 3px #ff0'; // Resplandor amarillo
        baseStyle.borderColor = '#fff';
      }
      break;
    default:
      baseStyle.background = colors.lightGray;
  }

  return <div style={baseStyle}>{num}</div>;
};

// Componente principal que renderiza los sets de bolas
export default function BolasSorteo({ sorteo, userNumeros }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  
  const { 
    numeros: melateNums = [], 
    adicional: melateAdicional, 
    numeros_revancha: revanchaNums = [], 
    numeros_revanchita: revanchitaNums = [] 
  } = sorteo;

  const titleStyle = {
    ...typography.h4,
    color: colors.text,
    margin: '15px 0 10px 0',
    textAlign: 'center',
    fontSize: '1.1rem'
  };

  const ballContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    paddingBottom: '15px',
    borderBottom: `1px solid ${colors.border}`,
  };

  return (
    <div style={{ width: '100%' }}>
      {/* --- MELATE --- */}
      <h4 style={{...titleStyle, marginTop: 0, color: common.danger}}>Melate</h4>
      <div style={{...ballContainerStyle, paddingBottom: '20px'}}>
        {melateNums.map((num) => (
          <Ball key={`mel-${num}`} num={num} ballType="melate" isHit={userNumeros.includes(num)} />
        ))}
        <div style={{width: '15px', textAlign: 'center', fontSize: '1.2rem', color: colors.textSecondary}}>|</div>
        {melateAdicional && (
          <Ball num={melateAdicional} ballType="adicional" isHit={userNumeros.includes(melateAdicional)} />
        )}
      </div>
      
      {/* --- REVANCHA --- */}
      {revanchaNums && revanchaNums.length === 6 && (
        <>
          <h4 style={{...titleStyle, color: common.success}}>Revancha</h4>
          <div style={ballContainerStyle}>
            {revanchaNums.map((num) => (
              <Ball key={`rev-${num}`} num={num} ballType="revancha" isHit={userNumeros.includes(num)} />
            ))}
          </div>
        </>
      )}

      {/* --- REVANCHITA --- */}
      {revanchitaNums && revanchitaNums.length === 6 && (
        <>
          <h4 style={{...titleStyle, color: common.warning}}>Revanchita</h4>
          <div style={{...ballContainerStyle, borderBottom: 'none', paddingBottom: 0}}>
            {revanchitaNums.map((num) => (
              <Ball key={`rch-${num}`} num={num} ballType="revanchita" isHit={userNumeros.includes(num)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}