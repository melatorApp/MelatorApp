import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from './ThemeContext'; // Corregido
import { useAuth } from './AuthContext';
import { getSectionStyle, common, typography, getBtnStyle } from './styles';
import LoadingSpinner from './LoadingSpinner'; 
import useConfirm from './useConfirm.jsx'; 

// --- Componente ResultadoBall (Bolas Blancas + Color Hit) ---
const ResultadoBall = ({ num, ballType, isHit }) => {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  // Estilo Base (Blanco/Gris Claro por defecto)
  let background = colors.surface;
  let color = colors.text;
  let border = `1px solid ${colors.border}`;
  let boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.1)';

  // Aplicar Colores SOLO SI ES ACIERTO (isHit)
  if (isHit) {
    color = '#fff'; 
    border = `2px solid ${colors.surface}`; 
    boxShadow = `inset -2px -2px 3px rgba(0,0,0,0.3), 0 0 5px 1px ${colors.surface}`; 

    switch (ballType) {
      case 'melate': background = `linear-gradient(135deg, ${common.danger} 20%, #c53030 100%)`; break;
      case 'adicional': background = common.primary; break;
      case 'revancha': background = `linear-gradient(135deg, ${common.success} 20%, #2f855a 100%)`; break;
      case 'revanchita':
        background = `linear-gradient(135deg, ${common.warning} 20%, #d69e2e 100%)`;
        color = '#1A202C'; break; 
      default: background = colors.textSecondary;
    }
  }

  const ballStyle = {
    display: 'inline-flex', 
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',          
    height: '32px',         
    borderRadius: '50%',
    fontSize: '1rem',
    fontWeight: 'bold',
    margin: '2px',          
    lineHeight: '1',        
    background: background,
    color: color,
    border: border,
    boxShadow: boxShadow,
    transition: 'all 0.2s ease',
    verticalAlign: 'middle', 
  };

  return <div style={ballStyle}>{num}</div>;
};

// --- Componente ResultadosCompletos ---
const ResultadosCompletos = ({ userCombination, sorteo }) => {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { numeros: melateNums = [], adicional, numeros_revancha: revanchaNums = [], numeros_revanchita: revanchitaNums = [] } = sorteo || {};

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${colors.border}`,
  };
  const lastRowStyle = {...rowStyle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0};
  const labelStyle = {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginRight: '10px',
    width: '80px', 
    textAlign: 'right',
    flexShrink: 0, 
  };
  const ballsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px', 
  };

  return (
    <div style={{ marginTop: '1rem', borderTop: `1px dashed ${colors.border}`, paddingTop: '1rem' }}>
      {/* Melate */}
      {melateNums.length > 0 && (
        <div style={rowStyle}>
          <span style={{...labelStyle, color: common.danger}}>Melate:</span>
          <div style={ballsContainerStyle}>
            {melateNums.map(n => <ResultadoBall key={`m-${n}`} num={n} ballType="melate" isHit={userCombination.includes(n)} />)}
            {adicional != null && !isNaN(adicional) && (
              <>
                <span style={{ margin: '0 5px', color: colors.textSecondary }}>|</span>
                <ResultadoBall num={adicional} ballType="adicional" isHit={userCombination.includes(adicional)} />
              </>
            )}
          </div>
        </div>
      )}
      {/* Revancha */}
      {revanchaNums.length > 0 && (
        <div style={rowStyle}>
          <span style={{...labelStyle, color: common.success}}>Revancha:</span>
          <div style={ballsContainerStyle}>
            {revanchaNums.map(n => <ResultadoBall key={`rv-${n}`} num={n} ballType="revancha" isHit={userCombination.includes(n)} />)}
          </div>
        </div>
      )}
      {/* Revanchita */}
      {revanchitaNums.length > 0 && (
        <div style={lastRowStyle}>
           <span style={{...labelStyle, color: common.warning}}>Revanchita:</span>
           <div style={ballsContainerStyle}>
            {revanchitaNums.map(n => <ResultadoBall key={`rc-${n}`} num={n} ballType="revanchita" isHit={userCombination.includes(n)} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// --- premiosMap y getPremioGanado (Asegúrate que coincidan con tu lógica) ---
const premiosMap = {
  melate: {
    '6': '1er Lugar', '5+1': '2do Lugar', '5': '3er Lugar',
    '4+1': '4to Lugar', '4': '5to Lugar', '3+1': '6to Lugar',
    '3': '7mo Lugar', '2+1': '8vo Lugar', '2': '9no Lugar'
  },
  revancha: { '6': '1er Lugar' },
  revanchita: { '6': 'Premio Único' }
};

const getPremioGanado = (resultado) => {
  if (!resultado) return null;
  const premiosGanados = [];
  const premioMelate = premiosMap.melate[resultado.melate];
  if (premioMelate) premiosGanados.push(`${premioMelate} (Melate)`);
  const premioRevancha = premiosMap.revancha[String(resultado.revancha)]; 
  if (premioRevancha) premiosGanados.push(`${premioRevancha} (Revancha)`);
  const premioRevanchita = premiosMap.revanchita[String(resultado.revanchita)];
  if (premioRevanchita) premiosGanados.push(`${premioRevanchita} (Revanchita)`);
  
  if (premiosGanados.length > 0) return premiosGanados.join(', ');
  return null; 
};

export default function MisJugadas({ stats, jugadas, isLoading, onRefresh }) {
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;
  const { confirm, ConfirmationComponent } = useConfirm();
  
  const historialMap = new Map(stats?.historial?.map(s => [s.concurso, s]));

  if (!stats || !stats.historial) {
      return (
          <div style={getSectionStyle(colors)}>
              {isLoading ? <LoadingSpinner text="Cargando datos..." /> : <p style={{color: colors.textSecondary, textAlign: 'center'}}>Error al cargar estadísticas.</p>}
          </div>
      );
  }
  
  const { currentUser } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [shareMenuOpenFor, setShareMenuOpenFor] = useState(null); 
  
  // --- Estilos ---
  const cardStyle = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '20px',
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'space-between', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    minHeight: '250px' 
  };
  const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', marginBottom: '15px' };
  const statusStyle = (status) => {
    const statusColors = { pendiente: colors.textSecondary, ganador: common.success, sin_premio: common.danger };
    return { ...typography.small, fontWeight: 'bold', color: statusColors[status] || colors.textSecondary, padding: '4px 10px', borderRadius: '6px', backgroundColor: `${statusColors[status] || colors.textSecondary}20` };
  };
  const analysisSectionStyle = {marginBottom: '15px', borderBottom: `1px dashed ${colors.border}`, paddingBottom: '10px'};
  const analysisTitleStyle = {...typography.h5, color: colors.textSecondary, margin: '0 0 10px 0', textAlign: 'center'};
  const analysisRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '0.85rem', borderBottom: `1px solid ${colors.lightGray}` };
  const lastAnalysisRowStyle = {...analysisRowStyle, borderBottom: 'none'}; 
  const verdictContainerStyle = { ...analysisRowStyle, justifyContent: 'center', borderBottom: `1px solid ${colors.lightGray}`, paddingBottom: '10px', marginBottom: '5px' }; 
  const verdictTextStyle = (verdict) => {
    const verdictColors = { 
        'Estadísticamente Fuerte': common.success, 
        'Balanceada': common.warning, 
        'Arriesgada (Atípica)': common.danger, 
        // Añadir otros posibles veredictos si los tienes
    };
    return { fontWeight: 'bold', color: verdictColors[verdict] || colors.textSecondary, fontSize: '1rem' }; 
  };
  const btnStyle = getBtnStyle();
  const actionButtonStyle = {...btnStyle, padding: '6px 12px', fontSize: '0.9rem', background: colors.lightGray, color: colors.text, boxShadow: 'none'};
  const deleteButtonStyle = {...actionButtonStyle, background: common.danger + '20', color: common.danger, fontSize: '1.2rem', padding: '6px 10px'}; 
  const shareButtonStyle = {...actionButtonStyle, background: 'none', color: colors.text, fontSize: '1.2rem', padding: '6px 10px'}; 
  const shareMenuStyle = { 
    position: 'absolute', 
    bottom: 'calc(100% + 5px)', 
    right: 0, 
    backgroundColor: colors.surface, 
    border: `1px solid ${colors.border}`, 
    borderRadius: '8px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
    zIndex: 10,
    overflow: 'hidden',
    width: '150px' 
  };
  const shareMenuItemStyle = {
    display: 'block', width: '100%',
    padding: '10px 15px', backgroundColor: 'transparent',
    border: 'none', borderBottom: `1px solid ${colors.lightGray}`,
    textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem',
    color: colors.text, whiteSpace: 'nowrap',
  };
  const lastShareMenuItemStyle = {...shareMenuItemStyle, borderBottom: 'none'};
  
  const renderStatus = (jugada) => {
    if (jugada.status === 'pendiente') return <span style={statusStyle('pendiente')}>🕒 Pendiente</span>;
    if (jugada.status === 'ganador') return <span style={statusStyle('ganador')}>🏆 ¡Ganador!</span>;
    return <span style={statusStyle('sin_premio')}>❌ Sin Premio</span>;
  };

  useEffect(() => {
    if (currentUser && stats?.historial && stats.historial.length > 0) {
        window.electronAPI.verificarJugadas({ userId: currentUser.uid, historial: stats.historial })
            .then(result => {
                if (result.updated) onRefresh();
            });
    }
  }, [currentUser, stats?.historial, onRefresh]); 
  
  const handleEliminar = async (docId) => {
    const confirmed = await confirm({ title: 'Confirmar Eliminación', message: '¿Estás seguro?', confirmText: 'Sí, eliminar', confirmVariant: 'danger' });
    if (confirmed) {
      if (!currentUser) return;
      const resultado = await window.electronAPI.eliminarJugada({ userId: currentUser.uid, docId });
      if (resultado.success) {
        toast.success('Jugada eliminada.');
        onRefresh();
      } else {
        toast.error(`Error al eliminar: ${resultado.message || 'Error desconocido'}`);
      }
    }
  };
  
  const handleShare = (platform, jugada) => {
    if (!jugada || !jugada.combinacion) {
      toast.error('No se puede compartir esta jugada.');
      setShareMenuOpenFor(null);
      return;
    }
    const rawText = `¡Mi jugada de Melator para el sorteo ${jugada.concurso || '??'} (${jugada.fecha})!\n\nCombinación: ${jugada.combinacion.join(' - ')}\n\n¡Generada con la app Melator!`;
    const encodedText = encodeURIComponent(rawText);
    let url;
    try {
        switch (platform) {
        case 'whatsapp': url = `https://api.whatsapp.com/send?text=${encodedText}`; break;
        case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodedText}`; break;
        case 'email': url = `mailto:?subject=Mi%20Jugada%20de%20Melator&body=${encodedText}`; break;
        case 'facebook':
            const fallbackUrl = encodeURIComponent("https://www.pronosticos.gob.mx/Melate");
            url = `https://www.facebook.com/sharer/sharer.php?u=${fallbackUrl}&quote=${encodedText}`;
            break;
        case 'copy':
            window.electronAPI.compartirJugada({ texto: rawText })
              .then(res => {
                  if(res.success) toast.success(res.message || 'Copiado al portapapeles');
                  else toast.error(res.message || 'Error al copiar');
              })
              .catch(err => toast.error('Error al copiar'));
            setShareMenuOpenFor(null);
            return; 
        default: 
            setShareMenuOpenFor(null);
            return; 
        }
        window.electronAPI.openExternalUrl(url);
        setShareMenuOpenFor(null);
    } catch (error) {
        console.error("Error en handleShare:", error);
        toast.error('Ocurrió un error al intentar compartir.');
        setShareMenuOpenFor(null);
    }
  };
  
  const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };
  const toggleShareMenu = (id) => { setShareMenuOpenFor(shareMenuOpenFor === id ? null : id); }; 

  if (isLoading) {
    return <div style={getSectionStyle(colors)}><LoadingSpinner text="Cargando tus jugadas..." /></div>;
  }
  
  return (
    <>
      <ConfirmationComponent />
      <div style={{...getSectionStyle(colors), textAlign: 'left'}}>
        <h2 style={{...typography.h2, color: colors.text, textAlign: 'center'}}>Mis Jugadas Registradas</h2>
        {jugadas.length === 0 ? ( 
          <p style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: '2rem' }}>
            Aún no tienes jugadas. Ve al <strong>Generador</strong> para crear y guardar tu primera combinación.
          </p>
         ) : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '1.5rem'}}>
              {jugadas.map((jugada) => {
                const sorteoGanador = historialMap.get(jugada.concurso);
                return (
                  <div key={jugada.docId} style={cardStyle}>
                    {/* Contenido Superior */}
                    <div> 
                      <div style={cardHeaderStyle}>
                        <div>
                          <h4 style={{...typography.h4, color: colors.text, margin: 0}}>Sorteo {jugada.concurso || '??'}</h4>
                          <small style={{...typography.small, color: colors.textSecondary}}>{jugada.fecha}</small>
                        </div>
                        {renderStatus(jugada)}
                      </div>
                      {jugada.status === 'ganador' && ( 
                        <div style={{textAlign: 'center', margin: '10px 0', padding: '8px', borderRadius: '6px', background: `${common.success}20`}}>
                          <strong style={{color: common.success, ...typography.h4, margin: 0, lineHeight: 1.4}}>{getPremioGanado(jugada.resultado)}</strong>
                        </div> 
                      )}
                      <h3 style={{ textAlign: 'center', letterSpacing: '2px', color: jugada.status === 'pendiente' ? common.primary : colors.text, fontWeight: 'bold', marginBottom: '1rem' }}>
                        {jugada.combinacion?.join(' - ')}
                      </h3>
                      {/* --- Mostrar Resultados Completos --- */}
                      {jugada.status !== 'pendiente' && sorteoGanador && (
                        <ResultadosCompletos
                          userCombination={jugada.combinacion}
                          sorteo={sorteoGanador} 
                        />
                      )}
                    </div>

                    {/* Pie de la Tarjeta */}
                    <div style={{borderTop: `1px solid ${colors.border}`, paddingTop: '10px', marginTop: 'auto'}}> 
                      {/* Análisis Expandido */}
                      {expandedId === jugada.docId && jugada.analisis && (
                        <div style={analysisSectionStyle}>
                          <h5 style={analysisTitleStyle}>Análisis Estadístico</h5>
                          {/* Veredicto */}
                          {jugada.analisis.veredicto && (
                             <div style={verdictContainerStyle}> 
                               <strong style={verdictTextStyle(jugada.analisis.veredicto)}>{jugada.analisis.veredicto}</strong>
                             </div>
                          )}
                          {/* Resto del análisis */}
                          <div style={analysisRowStyle}><span>Suma Total:</span> <strong>{jugada.analisis.suma?.valor ?? 'N/A'}</strong></div>
                          <div style={analysisRowStyle}><span>Pares/Impares:</span> <strong>{jugada.analisis.parImpar?.valor ?? 'N/A'}</strong></div>
                          <div style={analysisRowStyle}><span>Bajos/Altos:</span> <strong>{jugada.analisis.bajosAltos?.valor ?? 'N/A'}</strong></div>
                          <div style={analysisRowStyle}><span>Decenas:</span> <strong>{jugada.analisis.decenas?.valor ?? 'N/A'}</strong></div>
                          <div style={lastAnalysisRowStyle}> 
                            <span>Prom. Gaps:</span> 
                            <strong>{jugada.analisis.gaps?.valor ?? 'N/A'}</strong>
                          </div>
                        </div>
                      )}
                      
                      {/* Botones */}
                      {jugada.analisis ? (
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          {/* Botón Ver Análisis */}
                          <button onClick={() => toggleExpand(jugada.docId)} style={actionButtonStyle}> 
                              {expandedId === jugada.docId ? '🔼 Ocultar' : '👁️ Ver Análisis'}
                          </button>
                          {/* Fecha Registro */}
                          <small style={{...typography.small, color: colors.textSecondary}}>
                            {jugada.id && !isNaN(jugada.id) ? `Reg: ${new Date(jugada.id).toLocaleString()}` : ''}
                          </small>
                          {/* Botones Acción (Compartir/Eliminar) */}
                          <div style={{display: 'flex', alignItems: 'center', gap: '5px', position: 'relative'}}>
                            {/* Botón Compartir */}
                            <button onClick={() => toggleShareMenu(jugada.docId)} title="Compartir Jugada" style={shareButtonStyle}>🔗</button>
                            {/* Botón Eliminar */}
                            <button onClick={() => handleEliminar(jugada.docId)} title="Eliminar Jugada" style={deleteButtonStyle}>🗑️</button>
                            {/* Menú Compartir */}
                            {shareMenuOpenFor === jugada.docId && (
                              <div style={shareMenuStyle}>
                                <button style={shareMenuItemStyle} onMouseEnter={e => e.target.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'} onClick={() => handleShare('whatsapp', jugada)}>WhatsApp</button>
                                <button style={shareMenuItemStyle} onMouseEnter={e => e.target.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'} onClick={() => handleShare('twitter', jugada)}>X / Twitter</button>
                                <button style={shareMenuItemStyle} onMouseEnter={e => e.target.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'} onClick={() => handleShare('facebook', jugada)}>Facebook</button>
                                <button style={shareMenuItemStyle} onMouseEnter={e => e.target.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'} onClick={() => handleShare('email', jugada)}>Email</button>
                                <button style={lastShareMenuItemStyle} onMouseEnter={e => e.target.style.backgroundColor = colors.lightGray} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'} onClick={() => handleShare('copy', jugada)}>Copiar Texto</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <small style={{...typography.small, color: colors.textSecondary, display: 'block', textAlign: 'center'}}>No hay datos de análisis para esta jugada.</small>
                      )}
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