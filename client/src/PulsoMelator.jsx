import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { getSectionStyle, typography, common } from './styles';
import LoadingSpinner from './LoadingSpinner';

export default function PulsoMelator({ pulseTrigger }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const [pulse, setPulse] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const fetchPulse = async () => {
      const pulseData = await window.electronAPI.obtenerPulso();
      setPulse(pulseData.slice(0, 10));
      setIsLoading(false);
    };
    fetchPulse();
  }, [pulseTrigger]);

  const sectionStyle = getSectionStyle(colors);
  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
  };

  return (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: '2rem' }}>El Pulso de la Comunidad</h2>
      <div style={{...sectionStyle, textAlign: 'left'}}>
        <p style={{...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '0', marginBottom: '20px'}}>
          Estos son los 10 números más generados por los usuarios de Melator esta semana.
        </p>
        {isLoading ? (
          <LoadingSpinner text="Cargando el pulso..." />
        ) : pulse.length > 0 ? (
          <div>
            {pulse.map((item, index) => (
              <div key={item.numero} style={{...itemStyle, backgroundColor: index % 2 === 0 ? 'transparent' : colors.lightGray}}>
                <span style={{fontSize: '1.2rem'}}>
                  <strong style={{color: common.primary}}>{index + 1}.</strong> El número <strong>{item.numero}</strong>
                </span>
                <span style={{...typography.small, fontWeight: 'bold', color: colors.textSecondary}}>{item.count} veces</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{textAlign: 'center', color: colors.textSecondary}}>Aún no hay datos esta semana. ¡Sé el primero en generar un número!</p>
        )}
      </div>
    </div>
  );
}