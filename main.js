const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const admin = require('firebase-admin');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- CONFIGURACIÓN DEL REGISTRADOR (CAJA NEGRA) ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('Aplicación iniciándose...');

// --- Carga de archivos de recursos ---
const serviceAccount = require(path.join(__dirname, 'melator-app-firebase-adminsdk.json'));
const csvPath = path.join(__dirname, 'resultados_melate.csv');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://melatorapp-default-rtdb.firebaseio.com"
});

const firestoreDb = admin.firestore();
const realtimeDb = admin.database();

let currentUserId = null;
let mainWindow;
let statsPromise = null;

// --- Lógica de Presencia ---
function gestionarPresenciaUsuario(uid) {
  if (!uid) return;
  currentUserId = uid;
  const userStatusRef = realtimeDb.ref('status/' + uid);
  userStatusRef.set({ state: 'online', last_changed: Date.now() });
}
ipcMain.on('user-signed-in', (event, { uid }) => gestionarPresenciaUsuario(uid));
ipcMain.on('user-signed-out', () => {
  if (currentUserId) {
    const userStatusRef = realtimeDb.ref('status/' + currentUserId);
    userStatusRef.set({ state: 'offline', last_changed: Date.now() });
    currentUserId = null;
  }
});
app.on('will-quit', () => {
  if (currentUserId) {
    const userStatusRef = realtimeDb.ref('status/' + currentUserId);
    userStatusRef.set({ state: 'offline', last_changed: Date.now() });
  }
});

async function loadAndProcessData() {
    console.log('Iniciando lectura y procesamiento del archivo CSV con lógica completa...');
    return new Promise((resolve, reject) => {
        const historial = [];
        const frecuencias = Array(57).fill(0);
        const allPairs = {};
        const allTrios = {};
        const combinaciones_frecuentes_map = {};
        const distribucionParImpar = {};
        const distribucionBajosAltos = {};
        const distribucionDecenas = {};
        const todasLasSumas = [];
        const avgGapsPerDraw = [];

        fs.createReadStream(csvPath)
          .on('error', (err) => reject(err))
          .pipe(csv())
          .on('data', (row) => {
            const numeros = [
              parseInt(row.R1), parseInt(row.R2), parseInt(row.R3),
              parseInt(row.R4), parseInt(row.R5), parseInt(row.R6)
            ].filter(n => !isNaN(n));

            if (numeros.length === 6) {
              const sorteo = {
                concurso: row.CONCURSO,
                fecha: row.FECHA,
                numeros: numeros,
                adicional: parseInt(row.R7)
              };
              historial.push(sorteo);
              
              numeros.forEach(n => frecuencias[n]++);
              
              const sorted = [...numeros].sort((a,b) => a-b);
              combinaciones_frecuentes_map[sorted.join(',')] = (combinaciones_frecuentes_map[sorted.join(',')] || 0) + 1;
              todasLasSumas.push(numeros.reduce((a,b) => a + b, 0));

              const pares = numeros.filter(n => n % 2 === 0).length;
              distribucionParImpar[`${pares}P-${6-pares}I`] = (distribucionParImpar[`${pares}P-${6-pares}I`] || 0) + 1;

              const bajos = numeros.filter(n => n <= 28).length;
              distribucionBajosAltos[`${bajos}B-${6-bajos}A`] = (distribucionBajosAltos[`${bajos}B-${6-bajos}A`] || 0) + 1;

              const decades = [0,0,0,0,0,0];
              sorted.forEach(n => { const d = Math.floor((n-1)/10); if(d<6) decades[d]++; });
              distribucionDecenas[decades.join('-')] = (distribucionDecenas[decades.join('-')] || 0) + 1;

              const gaps = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i-1]);
              avgGapsPerDraw.push(gaps.reduce((a, b) => a + b, 0) / gaps.length);

              for (let i = 0; i < sorted.length; i++) {
                for (let j = i + 1; j < sorted.length; j++) {
                  allPairs[`${sorted[i]}-${sorted[j]}`] = (allPairs[`${sorted[i]}-${sorted[j]}`] || 0) + 1;
                  for (let k = j + 1; k < sorted.length; k++) {
                    allTrios[`${sorted[i]}-${sorted[j]}-${sorted[k]}`] = (allTrios[`${sorted[i]}-${sorted[j]}-${sorted[k]}`] || 0) + 1;
                  }
                }
              }
            }
          })
          .on('end', () => {
            console.log("Procesamiento final de estadísticas avanzadas...");
            const totalSorteos = historial.length;
            const mediaSuma = todasLasSumas.reduce((a, b) => a + b, 0) / totalSorteos;
            const desviacionEstandarSuma = Math.sqrt(todasLasSumas.map(s => Math.pow(s - mediaSuma, 2)).reduce((a, b) => a + b, 0) / totalSorteos);
            const mediaAvgGaps = avgGapsPerDraw.reduce((a,b) => a+b, 0) / avgGapsPerDraw.length;
            
            const calcularPendiente = (datos) => {
              const n = datos.length;
              if (n < 2) return 0;
              const sum_x = datos.reduce((acc, _, i) => acc + i, 0);
              const sum_y = datos.reduce((acc, y) => acc + y, 0);
              const sum_xy = datos.reduce((acc, y, i) => acc + i * y, 0);
              const sum_xx = datos.reduce((acc, _, i) => acc + i * i, 0);
              return (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) || 0;
            };

            const analisisPredictivo = {};
            const historialRecienteParaTendencia = historial.slice(0, 100).reverse();
            for (let numero = 1; numero <= 56; numero++) {
                const racha = historial.findIndex(sorteo => sorteo.numeros.includes(numero));
                const sorteosSinAparecer = racha === -1 ? historial.length : racha;
                const aparicionesEnTendencia = historialRecienteParaTendencia.map(s => s.numeros.includes(numero) ? 1 : 0);
                const frecuenciaReciente = aparicionesEnTendencia.reduce((acc, val) => acc + val, 0);
                const pendiente = calcularPendiente(aparicionesEnTendencia);
                let tendencia = (pendiente > 0.015) ? 'En Ascenso' : (pendiente < -0.015) ? 'En Descenso' : 'Estable';
                const score = (frecuenciaReciente * 0.5) + (pendiente * 20) + (sorteosSinAparecer * 0.25);
                analisisPredictivo[numero] = { numero, sorteosSinAparecer, frecuenciaReciente, tendencia, score: Math.round(score * 10) };
            }

            const historialReciente = historial.slice(0, 100);
            const frecuenciasRecientes = {};
            historialReciente.forEach(s => { s.numeros.forEach(n => { frecuenciasRecientes[n] = (frecuenciasRecientes[n] || 0) + 1; }); });

            resolve({
              historial,
              frecuencias,
              allPairs: Object.entries(allPairs).map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count),
              allTrios: Object.entries(allTrios).map(([trio, count]) => ({ trio, count })).sort((a, b) => b.count - a.count),
              combinaciones_frecuentes: Object.entries(combinaciones_frecuentes_map).map(([combo, count]) => ({ combo, count })).sort((a, b) => b.count - a.count),
              analisisPredictivo,
              analisisAvanzado: {
                frecuenciasRecientes,
                statsSuma: { media: mediaSuma, desviacionEstandar: desviacionEstandarSuma, rangoIdeal: [Math.round(mediaSuma - desviacionEstandarSuma), Math.round(mediaSuma + desviacionEstandarSuma)] },
                distribucionParImpar: Object.fromEntries(Object.entries(distribucionParImpar).map(([k,v]) => [k, (v/totalSorteos * 100).toFixed(2)])),
                distribucionBajosAltos: Object.fromEntries(Object.entries(distribucionBajosAltos).map(([k,v]) => [k, (v/totalSorteos * 100).toFixed(2)])),
                statsGaps: { mediaGeneral: mediaAvgGaps, rangoIdeal: [(mediaAvgGaps - 2).toFixed(1), (mediaAvgGaps + 2).toFixed(1)] },
                distribucionesDecenasComunes: Object.entries(distribucionDecenas).sort(([,a],[,b]) => b-a).slice(0,5).map(([key])=>key)
              }
            });
          });
    });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
  }
}

app.whenReady().then(() => {
  statsPromise = loadAndProcessData();
  createWindow();

  if (app.isPackaged) {
    log.info('Modo producción: Iniciando búsqueda de actualizaciones...');
    autoUpdater.checkForUpdates();
  }
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

// --- EVENTOS DEL AUTO-ACTUALIZADOR CON LOGS DETALLADOS ---
autoUpdater.on('checking-for-update', () => {
  log.info('Buscando actualización...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Actualización disponible.', info);
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Actualización no disponible.', info);
});
autoUpdater.on('error', (err) => {
  log.error('Error en el auto-actualizador: ' + err.message);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Velocidad de descarga: ${progressObj.bytesPerSecond} B/s`;
  log_message += ` - Descargado ${progressObj.percent}%`;
  log_message += ` (${progressObj.transferred}/${progressObj.total})`;
  log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('Actualización descargada.', info);
  mainWindow.webContents.send('update_downloaded');
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- Todos los ipcMain.handle ---
ipcMain.handle('obtener-estadisticas', async () => { try { return await statsPromise; } catch (error) { return null; } });
ipcMain.handle('create-user-document', async (event, { uid, email }) => { try { await firestoreDb.collection('users').doc(uid).set({ email }); return { success: true }; } catch (error) { return { success: false }; } });
ipcMain.handle('obtener-jugadas', async (event, userId) => { try { const snapshot = await firestoreDb.collection('users').doc(userId).collection('jugadas').orderBy('id', 'desc').get(); return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })); } catch (error) { return []; } });
ipcMain.handle('guardar-jugada', async (event, { jugada, userId }) => {
  if (!userId) return { success: false, message: 'Usuario no autenticado.' };
  try {
    const jugadaConId = { id: Date.now(), ...jugada, status: 'pendiente' };
    await firestoreDb.collection('users').doc(userId).collection('jugadas').add(jugadaConId);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
ipcMain.handle('eliminar-jugada', async (event, { userId, docId }) => { try { await firestoreDb.collection('users').doc(userId).collection('jugadas').doc(docId).delete(); return { success: true }; } catch (error) { return { success: false }; } });
ipcMain.handle('verificar-jugadas', async () => ({ success: true, updated: false }));
ipcMain.handle('registrar-pulso', async () => ({ success: true }));
ipcMain.handle('obtener-pulso', async () => ([]));
ipcMain.handle('compartir-jugada', () => ({ success: true, message: 'Copiado' }));
ipcMain.handle('open-external-url', (event, url) => shell.openExternal(url));