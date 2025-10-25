import React from 'react';
import { useTheme } from './ThemeContext';
import { common, typography } from './styles';

export default function AnalisisGauge({ label, value, min, max, idealMin, idealMax }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  const valuePercent = ((value - min) / (max - min)) * 100;
  const idealStartPercent = ((idealMin - min) / (max - min)) * 100;
  const idealWidthPercent = ((idealMax - idealMin) / (max - min)) * 100;

  const gaugeBarContainer = {
    height: '12px',
    width: '100%',
    backgroundColor: colors.lightGray,
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden',
    marginTop: '10px',
  };

  const idealRangeBar = {
    height: '100%',
    backgroundColor: `${common.success}40`, // Verde transparente
    position: 'absolute',
    left: `${idealStartPercent}%`,
    width: `${idealWidthPercent}%`,
    borderRadius: '6px',
  };

  const valueIndicator = {
    height: '18px',
    width: '4px',
    backgroundColor: colors.text,
    border: `1px solid ${colors.background}`,
    borderRadius: '2px',
    position: 'absolute',
    left: `calc(${valuePercent}% - 2px)`, // Centra el indicador
    top: '-3px',
    boxShadow: '0 0 5px rgba(0,0,0,0.5)',
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <span style={{ ...typography.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typography.h3, color: colors.text, margin: 0 }}>{value}</span>
      </div>
      <div style={gaugeBarContainer}>
        <div style={idealRangeBar}></div>
        <div style={valueIndicator}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ ...typography.small, color: colors.textSecondary, fontSize: '0.7rem' }}>{min}</span>
        <span style={{ ...typography.small, color: common.success, fontSize: '0.7rem' }}>Ideal: {idealMin}-{idealMax}</span>
        <span style={{ ...typography.small, color: colors.textSecondary, fontSize: '0.7rem' }}>{max}</span>
      </div>
    </div>
  );
}