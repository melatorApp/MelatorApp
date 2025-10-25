const { contextBridge, ipcRenderer } = require('electron');

// --- ✨ LOG DE INICIO ---
console.log("--- Ejecutando preload.js ---"); 
// --- ---

contextBridge.exposeInMainWorld('electronAPI', {
  // --- ✨ AÑADIDO: Obtener versión de la App ---
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // --- Función de Estadísticas ---
  obtenerEstadisticas: () => ipcRenderer.invoke('obtener-estadisticas'),

  // --- Función para crear documento de usuario ---
  createUserDocument: (userData) => ipcRenderer.invoke('create-user-document', userData),
  
  // --- Funciones de Jugadas ---
  guardarJugada: (data) => ipcRenderer.invoke('guardar-jugada', data),
  obtenerJugadas: (userId) => ipcRenderer.invoke('obtener-jugadas', userId),
  eliminarJugada: (data) => ipcRenderer.invoke('eliminar-jugada', data),
  verificarJugadas: (data) => ipcRenderer.invoke('verificar-jugadas', data),

  // --- Funciones de Pulso Comunitario ---
  registrarPulso: (data) => ipcRenderer.invoke('registrar-pulso', data),
  obtenerPulso: () => ipcRenderer.invoke('obtener-pulso'),
  
  // --- Función Cuadro de Honor ---
  obtenerCuadroDeHonor: () => ipcRenderer.invoke('obtener-cuadro-de-honor'),

  // --- Funciones para Compartir y Enlaces ---
  // Asegúrate que el handle en main.js se llama 'compartir-jugada' si usas invoke
  // Si solo copia al portapapeles en main.js, puede ser invoke o send.
  // La implementación anterior usaba invoke y devolvía success/message
  compartirJugada: (data) => ipcRenderer.invoke('compartir-jugada', data), 
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url), // invoke es correcto si main.js usa handle
  
  // --- Funciones para la Presencia ---
  userSignedIn: (data) => ipcRenderer.send('user-signed-in', data), // send es correcto
  userSignedOut: () => ipcRenderer.send('user-signed-out'), // send es correcto

  // --- Funciones para el Actualizador ---
  restartApp: () => ipcRenderer.send('restart_app'), // send es correcto
  // Para listeners, necesitamos funciones que registren el callback
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', (_event, ...args) => callback(...args)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', (_event, ...args) => callback(...args)),
  // (Opcional) Añadir función para quitar listeners si es necesario
  // offUpdateAvailable: () => ipcRenderer.removeAllListeners('update_available'),
  // offUpdateDownloaded: () => ipcRenderer.removeAllListeners('update_downloaded'),
  
  // --- ✨ AÑADIDO: Listener para actualización de resultados CSV ---
  onResultsUpdated: (callback) => ipcRenderer.on('results-updated', (_event, ...args) => callback(...args)),
  // (Opcional) offResultsUpdated: () => ipcRenderer.removeAllListeners('results-updated'),

  // --- Funciones de Perfil ---
  obtenerPerfilUsuario: (uid) => ipcRenderer.invoke('obtener-perfil-usuario', uid),
  actualizarPerfilUsuario: (data) => ipcRenderer.invoke('actualizar-perfil-usuario', data),

  // --- NUEVO: Función de Suscripción ---
  // Exponemos la función que simulará la activación del pago
  actualizarSuscripcionPago: (data) => ipcRenderer.invoke('actualizar-suscripcion-pago', data)
});

// --- ✨ LOG DE FIN ---
console.log("--- preload.js finalizado, API expuesta ---");
// --- ---