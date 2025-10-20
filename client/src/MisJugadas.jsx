import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { getSectionStyle, common, typography, getBtnStyle } from './styles';
import LoadingSpinner from './LoadingSpinner';
import useConfirm from './useConfirm.jsx';

const HighlightedNumbers = ({ userCombination, winningNumbers, winningAdicional }) => {
  const { currentTheme } = useTheme();
  const colors = currentTheme?.colors || {};
  const numberStyle = {
    display: 'inline-block',
    padding: '4px 6px',
    margin: '0 2px',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '28px',
    textAlign: 'center',
  };
  const defaultStyle = { ...numberStyle, color: colors.textSecondary };
  const winningStyle = { ...numberStyle, color: '#fff', backgroundColor: common.success };
  const adicionalStyle = { ...numberStyle, color: '#fff', backgroundColor: common.primary };
  return (
    <div>
      {userCombination.map((num, index) => {
        let style = defaultStyle;
        if (winningNumbers?.includes(num)) {
          style = winningStyle;
        } else if (winningAdicional === num) {
          style = adicionalStyle;
        }
        return <span key={index} style={style}>{num}</span>;
      })}
    </div>
  );
};

const premiosMap = { /* ... (código sin cambios) ... */ };
const getPremioGanado = (resultado) => { /* ... (código sin cambios) ... */ };

export default function MisJugadas({ stats, jugadas, isLoading, onRefresh }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { confirm, ConfirmationComponent } = useConfirm();
  
  const historialMap = new Map(stats?.historial?.map(s => [s.concurso, s]));

  if (!stats || !stats.historial) {
      return (
          <div style={getSectionStyle(colors)}>
              <LoadingSpinner text="Cargando datos..." />
          </div>
      );
  }
  
  const { currentUser } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [shareMenuOpenFor, setShareMenuOpenFor] = useState(null);
  
  const cardStyle = { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' };
  const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', marginBottom: '15px' };
  const statusStyle = (status) => {
    const statusColors = { pendiente: colors.textSecondary, ganador: common.success, sin_premio: common.danger };
    return { ...typography.small, fontWeight: 'bold', color: statusColors[status] || colors.textSecondary, padding: '4px 10px', borderRadius: '6px', backgroundColor: `${statusColors[status] || colors.textSecondary}20` };
  };
  const analysisRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: '0.9rem', borderBottom: `1px solid ${colors.lightGray}` };
  const verdictStyle = (verdict) => {
    const verdictColors = { 'Estadísticamente Fuerte': common.success, 'Balanceada': common.warning, 'Arriesgada (Atípica)': common.danger };
    return { fontWeight: 'bold', color: verdictColors[verdict] || colors.textSecondary };
  };
  const btnStyle = getBtnStyle();
  const resultRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.lightGray}` };

  const renderStatus = (jugada) => {
    if (jugada.status === 'pendiente') return <span style={statusStyle('pendiente')}>🕒 Pendiente</span>;
    if (jugada.status === 'ganador') return <span style={statusStyle('ganador')}>🏆 ¡Ganador!</span>;
    return <span style={statusStyle('sin_premio')}>❌ Sin Premio</span>;
  };

  useEffect(() => {
    if (currentUser && stats.historial && stats.historial.length > 0) {
        window.electronAPI.verificarJugadas({ userId: currentUser.uid, historial: stats.historial })
            .then(result => {
                if (result.updated) onRefresh();
            });
    }
  }, [currentUser, stats.historial, onRefresh]);

  const handleEliminar = async (docId) => {
    const confirmed = await confirm({ title: 'Confirmar Eliminación', message: '¿Estás seguro?', confirmText: 'Sí, eliminar', confirmVariant: 'danger' });
    if (confirmed) {
      const resultado = await window.electronAPI.eliminarJugada({ userId: currentUser.uid, docId });
      if (resultado.success) {
        toast.success('Jugada eliminada.');
        onRefresh();
      } else {
        toast.error(`Error al eliminar.`);
      }
    }
  };
  
  const handleShare = (platform, jugada) => { /* ... (código sin cambios) ... */ };
  const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };

  if (isLoading) {
    return <div style={getSectionStyle(colors)}><LoadingSpinner text="Cargando tus jugadas..." /></div>;
  }
  
  const shareMenuStyle = { /* ... (código sin cambios) ... */ };
  const shareBtnStyle = { /* ... (código sin cambios) ... */ };

  return (
    <>
      <ConfirmationComponent />
      <div style={{...getSectionStyle(colors), textAlign: 'left'}}>
        <h2 style={{...typography.h2, color: colors.text, textAlign: 'center'}}>Mis Jugadas Guardadas</h2>
        {jugadas.length === 0 ? (
          <p style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '2rem' }}>
            Aún no tienes jugadas. Ve al <strong>Generador</strong> para crear y guardar tu primera combinación.
          </p>
        ) : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '1.5rem'}}>
              {jugadas.map((jugada) => {
                const sorteoGanador = historialMap.get(jugada.concurso);
                return (
                  <div key={jugada.docId} style={{...cardStyle, transform: expandedId === jugada.docId ? 'scale(1.02)' : 'scale(1)'}}>
                    <div>
                      <div style={cardHeaderStyle}>
                        <div>
                          <h4 style={{...typography.h4, color: colors.text, margin: 0}}>Sorteo {jugada.concurso || '??'}</h4>
                          <small style={{...typography.small, color: colors.textSecondary}}>{jugada.fecha}</small>
                        </div>
                        {renderStatus(jugada)}
                      </div>
                      {jugada.status === 'ganador' && ( <div style={{textAlign: 'center', margin: '10px 0', padding: '8px', borderRadius: '6px', background: `${common.success}20`}}><strong style={{color: common.success}}>{getPremioGanado(jugada.resultado)}</strong></div> )}
                      
                      {jugada.status !== 'pendiente' ? (
                        <div style={{ margin: '1rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {/* ... (código para mostrar resultados detallados sin cambios) ... */}
                        </div>
                      ) : (
                         <h3 style={{textAlign: 'center', letterSpacing: '2px', color: common.primary, fontWeight: 'bold'}}>{jugada.combinacion?.join(' - ')}</h3>
                      )}
                    </div>
                    <div style={{borderTop: `1px solid ${colors.border}`, paddingTop: '10px', marginTop: '10px'}}>
                      {expandedId === jugada.docId && jugada.analisis && (
                        <div style={{marginBottom: '15px'}}>
                          {/* ... (código de análisis expandido sin cambios) ... */}
                        </div>
                      )}
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <button onClick={() => toggleExpand(jugada.docId)} style={{...btnStyle, padding: '6px 12px', fontSize: '0.9rem', background: colors.textSecondary}}>
                          {expandedId === jugada.docId ? '🔼 Ocultar' : '👁️ Ver Análisis'}
                        </button>
                        
                        {/* --- ✨ LÍNEA REINTRODUCIDA Y CORREGIDA --- */}
                        <small style={{...typography.small, color: colors.textSecondary}}>
                          {jugada.id && !isNaN(jugada.id) ? `Reg: ${new Date(jugada.id).toLocaleString()}` : ''}
                        </small>
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', position: 'relative'}}>
                          {/* ... (botones de compartir y eliminar sin cambios) ... */}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </>
  );
}