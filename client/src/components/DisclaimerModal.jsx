import React from 'react'

function DisclaimerModal({ onAccept }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', padding: 20, borderRadius: 8, maxWidth: 500
      }}>
        <h2>Aviso Legal</h2>
        <p>Esta aplicación es solo con fines estadísticos y recreativos. No garantiza premios ni sustituye asesoría profesional.</p>
        <button onClick={onAccept}>Aceptar</button>
      </div>
    </div>
  )
}

export default DisclaimerModal