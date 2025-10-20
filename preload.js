const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  obtenerEstadisticas: () => ipcRenderer.invoke('obtener-estadisticas'),
  createUserDocument: (userData) => ipcRenderer.invoke('create-user-document', userData),
  guardarJugada: (data) => ipcRenderer.invoke('guardar-jugada', data),
  obtenerJugadas: (userId) => ipcRenderer.invoke('obtener-jugadas', userId),
  eliminarJugada: (data) => ipcRenderer.invoke('eliminar-jugada', data),
  verificarJugadas: (data) => ipcRenderer.invoke('verificar-jugadas', data),
  registrarPulso: (data) => ipcRenderer.invoke('registrar-pulso', data),
  obtenerPulso: () => ipcRenderer.invoke('obtener-pulso'),
  compartirJugada: (data) => ipcRenderer.invoke('compartir-jugada', data),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  userSignedIn: (data) => ipcRenderer.send('user-signed-in', data),
  userSignedOut: () => ipcRenderer.send('user-signed-out'),
  
  // --- ✨ AÑADIDO PARA EL ACTUALIZADOR ---
  restartApp: () => ipcRenderer.send('restart_app'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', () => callback()),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', () => callback()),
});