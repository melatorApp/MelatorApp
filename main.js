const { app, BrowserWindow, ipcMain, clipboard, shell, Menu } = require('electron'); // <-- Importar Menu
const https = require('https');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios'); // Asegúrate que está en package.json
const admin = require('firebase-admin');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- CONFIGURACIÓN DEL REGISTRADOR ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('Aplicación iniciándose...');

// --- CONFIGURACIÓN PARA ACTUALIZACIÓN DE CSV ---
// --- URL RAW INSERTADA ---
const REMOTE_CSV_URL = 'https://raw.githubusercontent.com/melatorApp/MelatorApp/refs/heads/master/Sorteos/resultados_melate.csv';
// --- URL API GITHUB PARA VERIFICAR ---
const GITHUB_API_URL = 'https://api.github.com/repos/melatorApp/MelatorApp/commits?path=Sorteos/resultados_melate.csv&page=1&per_page=1'; // URL para VERIFICAR fecha
const LOCAL_CSV_FILENAME = 'resultados_melate_latest.csv';
const userDataPath = app.getPath('userData');
const localCsvPath = path.join(userDataPath, LOCAL_CSV_FILENAME);
const packagedCsvPath = path.join(__dirname, 'resultados_melate.csv'); // Respaldo
// ---------------------------------------------

// --- Carga de Firebase Admin SDK ---
const serviceAccount = require(path.join(__dirname, 'melator-app-firebase-adminsdk.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://melatorapp-default-rtdb.firebaseio.com"
});
const firestoreDb = admin.firestore();
const realtimeDb = admin.database();

let currentUserId = null;
let mainWindow;
let statsPromise = null;

// --- FUNCIÓN getWeekId ---
const getWeekId = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfWeekCorrected = (now.getDay() === 0) ? 6 : now.getDay() - 1; // Lunes = 0, Domingo = 6
  const thursday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeekCorrected + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + (3 - (firstThursday.getDay() + 6) % 7));
  const weekNumber = Math.ceil((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

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

// --- FUNCIÓN: Descargar CSV ---
function downloadLatestCSV() {
  return new Promise((resolve, reject) => {
    if (!REMOTE_CSV_URL || REMOTE_CSV_URL === 'URL_RAW_DE_TU_CSV_EN_GITHUB_AQUI') { // Fallback check
        log.error('URL remota del CSV no configurada.');
        return reject(new Error('URL remota no configurada.'));
    }
    log.info(`Intentando descargar CSV desde: ${REMOTE_CSV_URL}`);
    const request = https.get(REMOTE_CSV_URL, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        log.info(`Redirección detectada a: ${response.headers.location}`);
        https.get(response.headers.location, (redirectedResponse) => {
            handleResponse(redirectedResponse, resolve, reject);
        }).on('error', (err) => { log.error('Error descarga (redirect):', err); reject(err); });
      } else {
        handleResponse(response, resolve, reject);
      }
    });
    request.on('error', (err) => { log.error('Error inicial descarga CSV:', err); reject(err); });
  });
}

// Función helper para manejar la respuesta de descarga
function handleResponse(response, resolve, reject) {
    if (response.statusCode !== 200) {
        log.error(`Error descarga CSV: Status ${response.statusCode}`);
        return reject(new Error(`Status Code: ${response.statusCode}`));
    }
    const fileStream = fs.createWriteStream(localCsvPath);
    response.pipe(fileStream);
    fileStream.on('finish', () => {
        fileStream.close((closeErr) => {
            if(closeErr) {
                 log.error('Error al cerrar filestream:', closeErr);
                 fs.unlink(localCsvPath, () => {});
                 return reject(closeErr);
            }
            log.info(`CSV descargado en: ${localCsvPath}`);
            const lastModifiedHeader = response.headers['last-modified']; // Intentar usar Last-Modified si está
            let fileDate = new Date(); // Usar fecha actual como fallback
            if (lastModifiedHeader) {
                const parsedDate = new Date(lastModifiedHeader);
                if (!isNaN(parsedDate)) {
                    fileDate = parsedDate;
                } else {
                    log.warn('Fecha Last-Modified inválida recibida, usando fecha actual para el archivo.');
                }
            } else {
                 log.warn('No Last-Modified header en respuesta de descarga, usando fecha actual para el archivo.');
            }

            try {
                fs.utimesSync(localCsvPath, fileDate, fileDate);
                log.info(`Fecha local establecida: ${fileDate.toISOString()}`);
            } catch (err) { log.error('Error al establecer fecha local:', err); }

            resolve(localCsvPath);
        });
    });
    fileStream.on('error', (err) => {
        log.error('Error al escribir CSV:', err);
        fs.unlink(localCsvPath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                 log.error('Error al borrar CSV incompleto:', unlinkErr);
            }
        });
        reject(err);
    });
}

// --- FUNCIÓN: Verificar Actualización (USA GITHUB API) ---
async function checkForCSVUpdate() {
  return new Promise((resolve) => {
    log.info(`Verificando actualizaciones CSV vía API: ${GITHUB_API_URL}`);
    try {
        const url = new URL(GITHUB_API_URL);
        const options = {
            method: 'GET', host: url.hostname, path: url.pathname + url.search,
            headers: { 'User-Agent': 'MelatorApp-UpdateChecker', 'Accept': 'application/vnd.github.v3+json' }
        };

        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              if (response.statusCode !== 200) {
                log.error(`Error API GitHub (Status: ${response.statusCode}): ${data}`);
                return resolve(false);
              }
              const commits = JSON.parse(data);
              if (!Array.isArray(commits) || commits.length === 0 || !commits[0].commit?.committer?.date) {
                log.error('Respuesta inesperada de la API de GitHub:', commits);
                return resolve(false);
              }

              const lastCommitDateStr = commits[0].commit.committer.date;
              const remoteDate = new Date(lastCommitDateStr);
              if (isNaN(remoteDate)) {
                 log.error(`Fecha de commit inválida recibida: ${lastCommitDateStr}`);
                 return resolve(false);
              }
              log.info(`Fecha último commit del CSV: ${remoteDate.toISOString()}`);

              if (fs.existsSync(localCsvPath)) {
                  const stats = fs.statSync(localCsvPath);
                  const localDate = stats.mtime;
                  log.info(`Fecha local CSV: ${localDate.toISOString()}`);
                  resolve(remoteDate > localDate);
              } else {
                  log.info('No CSV local. Descargando...');
                  resolve(true);
              }
            } catch (parseError) {
              log.error('Error al parsear respuesta API GitHub:', parseError, data);
              resolve(false);
            }
          });
        });
        request.on('error', (err) => { log.error('Error en solicitud a API GitHub:', err); resolve(false); });
        request.end();
    } catch (urlError) {
        log.error(`URL API inválida: ${GITHUB_API_URL}`, urlError);
        resolve(false);
    }
  });
}

// --- FUNCIÓN `loadAndProcessData` (COMPLETA) ---
async function loadAndProcessData(csvPathToLoad) {
  log.info(`[loadData] Iniciando lectura desde: ${csvPathToLoad}`);
  return new Promise((resolve, reject) => {
      const sorteosMap = new Map();
      let rowCount = 0;
      fs.createReadStream(csvPathToLoad)
        .on('error', (err) => {
            log.error(`[loadData] Error al leer ${csvPathToLoad}:`, err.message);
            if (csvPathToLoad !== packagedCsvPath) {
                log.warn(`[loadData] Fallo ${csvPathToLoad}, intentando ${packagedCsvPath}`);
                return loadAndProcessData(packagedCsvPath).then(resolve).catch(reject);
            } else { return reject(err); }
        })
        .pipe(csv())
        .on('data', (row) => {
            rowCount++;
            try {
                const concursoId = row.CONCURSO;
                if (!concursoId) { log.warn(`[loadData] Fila ${rowCount} omitida: Sin CONCURSO`); return; }
                let sorteo = sorteosMap.get(concursoId);
                if (!sorteo) {
                  sorteo = { concurso: concursoId, fecha: row.FECHA || 'N/A', numeros: [], adicional: null, numeros_revancha: [], numeros_revanchita: [] };
                  sorteosMap.set(concursoId, sorteo);
                }
                const numeros = [ parseInt(row.R1), parseInt(row.R2), parseInt(row.R3), parseInt(row.R4), parseInt(row.R5), parseInt(row.R6) ].filter(n => !isNaN(n) && n >= 1 && n <= 56);
                const tipoSorteo = row.TIPO ? row.TIPO.trim().toUpperCase() : '';
                if (numeros.length === 6) {
                    switch (tipoSorteo) {
                        case 'MELATE':
                          sorteo.numeros = numeros; const R7 = parseInt(row.R7); sorteo.adicional = (!isNaN(R7) && R7 >=1 && R7 <= 56) ? R7 : null; break;
                        case 'REVANCHA': sorteo.numeros_revancha = numeros; break;
                        case 'REVANCHITA': sorteo.numeros_revanchita = numeros; break;
                    }
                }
            } catch (rowError) { log.error(`[loadData] Error procesando fila ${rowCount}: ${rowError.message}`, row); }
         })
        .on('end', () => {
            log.info(`[loadData] Lectura de ${rowCount} filas completada. Procesando ${sorteosMap.size} sorteos.`);
            try {
              const historial = Array.from(sorteosMap.values()).filter(s => s.numeros && s.numeros.length === 6 && s.fecha).sort((a, b) => parseInt(b.concurso) - parseInt(a.concurso));
              if (historial.length === 0) { log.error("[loadData] No Melate data after filtering."); return reject(new Error("No Melate data found.")); }
              log.info(`[loadData] Procesando ${historial.length} sorteos válidos.`);

              log.info("[loadData] Calculando frecuencias...");
              const frecuencias = Array(57).fill(0); const allPairs = {}; const allTrios = {}; const combinaciones_frecuentes_map = {};
              const distribucionParImpar = {}; const distribucionBajosAltos = {}; const distribucionDecenas = {};
              const todasLasSumas = []; const avgGapsPerDraw = [];

              for (const sorteo of historial) {
                  if (!Array.isArray(sorteo.numeros)) continue;
                  const numeros = sorteo.numeros; const sorted = [...numeros].sort((a,b) => a-b);
                  numeros.forEach(n => { if (n >= 1 && n <= 56) frecuencias[n]++; });
                  if(sorted.length === 6) {
                      combinaciones_frecuentes_map[sorted.join(',')] = (combinaciones_frecuentes_map[sorted.join(',')] || 0) + 1;
                      todasLasSumas.push(numeros.reduce((a,b) => a + b, 0));
                      const pares = numeros.filter(n => n % 2 === 0).length; distribucionParImpar[`${pares}P-${6-pares}I`] = (distribucionParImpar[`${pares}P-${6-pares}I`] || 0) + 1;
                      const bajos = numeros.filter(n => n <= 28).length; distribucionBajosAltos[`${bajos}B-${6-bajos}A`] = (distribucionBajosAltos[`${bajos}B-${6-bajos}A`] || 0) + 1;
                      const decades = [0,0,0,0,0,0]; sorted.forEach(n => { const d = Math.floor((n-1)/10); if(d<6) decades[d]++; }); distribucionDecenas[decades.join('-')] = (distribucionDecenas[decades.join('-')] || 0) + 1;
                      const gaps = []; for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i-1]); if (gaps.length > 0) avgGapsPerDraw.push(gaps.reduce((a, b) => a + b, 0) / gaps.length);
                      for (let i = 0; i < sorted.length; i++) {
                        for (let j = i + 1; j < sorted.length; j++) {
                          allPairs[`${sorted[i]}-${sorted[j]}`] = (allPairs[`${sorted[i]}-${sorted[j]}`] || 0) + 1;
                          for (let k = j + 1; k < sorted.length; k++) { allTrios[`${sorted[i]}-${sorted[j]}-${sorted[k]}`] = (allTrios[`${sorted[i]}-${sorted[j]}-${sorted[k]}`] || 0) + 1; }
                        }
                      }
                  } else { log.warn(`[loadData] Sorteo ${sorteo.concurso} omitido (no 6 números).`); }
              }

              log.info("[loadData] Calculando stats avanzadas...");
              const totalSorteos = historial.length;
              const mediaSuma = todasLasSumas.length > 0 ? todasLasSumas.reduce((a, b) => a + b, 0) / todasLasSumas.length : 0;
              const desviacionEstandarSuma = todasLasSumas.length > 0 ? Math.sqrt(todasLasSumas.map(s => Math.pow(s - mediaSuma, 2)).reduce((a, b) => a + b, 0) / todasLasSumas.length) : 0;
              const mediaAvgGaps = avgGapsPerDraw.length > 0 ? avgGapsPerDraw.reduce((a,b) => a+b, 0) / avgGapsPerDraw.length : 0;
              const calcularPendiente = (datos) => { const n = datos.length; if (n < 2) return 0; const sum_x = datos.reduce((acc, _, i) => acc + i, 0); const sum_y = datos.reduce((acc, y) => acc + y, 0); const sum_xy = datos.reduce((acc, y, i) => acc + i * y, 0); const sum_xx = datos.reduce((acc, _, i) => acc + i * i, 0); return (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) || 0; };
              const analisisPredictivo = {}; const historialRecienteParaTendencia = historial.slice(0, 100).reverse();
              for (let numero = 1; numero <= 56; numero++) {
                  const racha = historial.findIndex(sorteo => sorteo.numeros.includes(numero)); const sorteosSinAparecer = racha === -1 ? historial.length : racha;
                  const aparicionesEnTendencia = historialRecienteParaTendencia.map(s => s.numeros.includes(numero) ? 1 : 0); const frecuenciaReciente = aparicionesEnTendencia.reduce((acc, val) => acc + val, 0);
                  const pendiente = calcularPendiente(aparicionesEnTendencia); let tendencia = (pendiente > 0.015) ? 'En Ascenso' : (pendiente < -0.015) ? 'En Descenso' : 'Estable';
                  const score = (frecuenciaReciente * 0.5) + (pendiente * 20) + (sorteosSinAparecer * 0.25);
                  analisisPredictivo[numero] = { numero, sorteosSinAparecer, frecuenciaReciente, tendencia, score: Math.round(score * 10) };
              }
              const historialReciente = historial.slice(0, 100); const frecuenciasRecientes = {};
              historialReciente.forEach(s => { s.numeros.forEach(n => { frecuenciasRecientes[n] = (frecuenciasRecientes[n] || 0) + 1; }); });
              const analisisAvanzado = {
                  frecuenciasRecientes, statsSuma: { media: mediaSuma, desviacionEstandar: desviacionEstandarSuma, rangoIdeal: [Math.round(mediaSuma - desviacionEstandarSuma), Math.round(mediaSuma + desviacionEstandarSuma)] },
                  distribucionParImpar: Object.fromEntries(Object.entries(distribucionParImpar).map(([k,v]) => [k, (v/totalSorteos * 100).toFixed(2)])),
                  distribucionBajosAltos: Object.fromEntries(Object.entries(distribucionBajosAltos).map(([k,v]) => [k, (v/totalSorteos * 100).toFixed(2)])),
                  statsGaps: { mediaGeneral: mediaAvgGaps, rangoIdeal: [(mediaAvgGaps - 2).toFixed(1), (mediaAvgGaps + 2).toFixed(1)] },
                  distribucionesDecenasComunes: Object.entries(distribucionDecenas).sort(([,a],[,b]) => b-a).slice(0,5).map(([key])=>key)
              };

              log.info("[loadData] Procesamiento completado.");
              resolve({ historial, frecuencias, allPairs: Object.entries(allPairs).map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count), allTrios: Object.entries(allTrios).map(([trio, count]) => ({ trio, count })).sort((a, b) => b.count - a.count), combinaciones_frecuentes: Object.entries(combinaciones_frecuentes_map).map(([combo, count]) => ({ combo, count })).sort((a, b) => b.count - a.count), analisisPredictivo, analisisAvanzado });
            } catch (error) { log.error("[loadData] Error procesando stats:", error); reject(error); }
        });
  });
}

// --- Función Crear Ventana ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        // autoHideMenuBar: true, // <-- Eliminamos esta línea
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
    });

    // --- ✨ CORRECCIÓN APLICADA AQUÍ ---
    mainWindow.setMenu(null);
    // --- ---

    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
    }
}

// --- FUNCIÓN `app.whenReady` ---
app.whenReady().then(async () => {
  let finalCsvPath = packagedCsvPath;
  if (app.isPackaged) {
    log.info('App empaquetada, buscando actualizaciones CSV...');
    try {
      const needsUpdate = await checkForCSVUpdate();
      if (needsUpdate) {
        log.info('Actualización CSV requerida, descargando...');
        try {
            await downloadLatestCSV();
            finalCsvPath = localCsvPath;
            log.info('Descarga CSV completada.');
            if (mainWindow) { mainWindow.webContents.send('results-updated', { requiresRestart: false }); }
        } catch (downloadErr) {
            log.error('Fallo descarga CSV:', downloadErr.message);
            if (fs.existsSync(localCsvPath)) { log.warn('Usando local tras fallo descarga.'); finalCsvPath = localCsvPath; }
            else { log.warn('Usando empaquetado tras fallo descarga.'); finalCsvPath = packagedCsvPath; }
        }
      } else {
        if (fs.existsSync(localCsvPath)) { log.info('Usando CSV local (actualizado).'); finalCsvPath = localCsvPath; }
        else { log.info('No CSV local, usando empaquetado.'); finalCsvPath = packagedCsvPath; }
      }
    } catch (checkErr) { // Captura errores de checkForCSVUpdate si rechaza
      log.error('Fallo verificación CSV:', checkErr.message);
      if (fs.existsSync(localCsvPath)) { log.warn('Usando local tras fallo verificación.'); finalCsvPath = localCsvPath; }
      else { log.warn('Usando empaquetado tras fallo verificación.'); finalCsvPath = packagedCsvPath; }
    }
  } else {
    log.info('Modo desarrollo, usando CSV empaquetado.');
    finalCsvPath = packagedCsvPath;
  }

  log.info(`Cargando stats desde: ${finalCsvPath}`);
  statsPromise = loadAndProcessData(finalCsvPath).catch(err => {
      log.error(`¡¡ERROR FATAL al cargar/procesar ${finalCsvPath}: ${err.message}`);
      console.error("Error detallado loadAndProcessData:", err);
      return null;
  });

  createWindow();

  if (app.isPackaged) {
    log.info('Buscando actualizaciones de APP...');
    autoUpdater.checkForUpdates();
  }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

// --- Eventos Auto-Actualizador APP ---
autoUpdater.on('checking-for-update', () => { log.info('Buscando update app...'); });
autoUpdater.on('update-available', (info) => { log.info('Update app disponible.', info); mainWindow.webContents.send('update_available'); });
autoUpdater.on('update-not-available', (info) => { log.info('Update app no disponible.', info); });
autoUpdater.on('error', (err) => { log.error('Error auto-updater app: ' + err.message); });
autoUpdater.on('download-progress', (progressObj) => { log.info(`Descargando app: ${progressObj.percent}%`); });
autoUpdater.on('update-downloaded', (info) => { log.info('Update app descargada.', info); mainWindow.webContents.send('update_downloaded'); });
ipcMain.on('restart_app', () => { autoUpdater.quitAndInstall(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- Todos los ipcMain.handle ---
ipcMain.handle('obtener-estadisticas', async () => {
  try {
    const stats = await statsPromise;
    if (stats === null) { log.error("statsPromise resolvió a null."); }
    return stats;
  } catch (error) {
    log.error("Error await statsPromise en handle:", error.message);
    console.error("Error await statsPromise:", error);
    return null;
  }
});

// --- NUEVO HANDLER PARA OBTENER VERSIÓN ---
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
// --- ---

// --- MODIFICADO: Ya no se incluye 'permiteReporteAnonimo' al crear ---
ipcMain.handle('create-user-document', async (event, { uid, email, nombre, apellidoPaterno, apellidoMaterno }) => {
  try {
    const newUserDocument = {
      email,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionStatus: 'trial',
      subscriptionEndDate: null
    };
    await firestoreDb.collection('users').doc(uid).set(newUserDocument);
    return { success: true };
  }
  catch (error) { console.error('Error create user doc:', error); return { success: false, message: error.message }; }
});

ipcMain.handle('obtener-perfil-usuario', async (event, uid) => {
  if (!uid) return null;
  try { const userDoc = await firestoreDb.collection('users').doc(uid).get(); return userDoc.exists ? userDoc.data() : null; }
  catch (error) { console.error('Error obtener perfil:', error); return null; }
});

// --- MODIFICADO: Ya no se recibe 'permiteReporteAnonimo' al actualizar ---
ipcMain.handle('actualizar-perfil-usuario', async (event, { uid, nombre, apellidoPaterno, apellidoMaterno }) => {
  if (!uid) return { success: false, message: 'No UID' };
  try {
    await firestoreDb.collection('users').doc(uid).update({
      nombre,
      apellidoPaterno,
      apellidoMaterno,
    });
    return { success: true };
  }
  catch (error) { console.error('Error actualizar perfil:', error); return { success: false, message: error.message }; }
});

ipcMain.handle('actualizar-suscripcion-pago', async (event, { uid }) => {
  if (!uid) {
    log.error('Intento de actualizar suscripción sin UID');
    return { success: false, message: 'No se proporcionó UID' };
  }
  try {
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 30);

    const updateData = {
      subscriptionStatus: 'active',
      subscriptionEndDate: admin.firestore.Timestamp.fromDate(newEndDate)
    };

    await firestoreDb.collection('users').doc(uid).update(updateData);
    log.info(`Suscripción actualizada para ${uid}. Nueva fecha: ${newEndDate.toISOString()}`);
    return { success: true, newEndDate: newEndDate.toISOString() };
  } catch (error) {
    console.error(`Error al actualizar suscripción para ${uid}:`, error);
    log.error(`Error al actualizar suscripción para ${uid}:`, error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('obtener-jugadas', async (event, userId) => {
  try { const snapshot = await firestoreDb.collection('users').doc(userId).collection('jugadas').orderBy('id', 'desc').get(); return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })); }
  catch (error) { console.error('Error obtener jugadas:', error); return []; }
});
ipcMain.handle('guardar-jugada', async (event, { jugada, userId }) => {
  if (!userId) return { success: false, message: 'No auth' };
  try { const jugadaConId = { id: Date.now(), ...jugada, status: 'pendiente' }; await firestoreDb.collection('users').doc(userId).collection('jugadas').add(jugadaConId); return { success: true }; }
  catch (error) { console.error('Error guardar jugada:', error); return { success: false, message: error.message }; }
});
ipcMain.handle('eliminar-jugada', async (event, { userId, docId }) => {
  try { await firestoreDb.collection('users').doc(userId).collection('jugadas').doc(docId).delete(); return { success: true }; }
  catch (error) { console.error('Error eliminar jugada:', error); return { success: false, message: error.message }; }
});

// --- MODIFICADO: 'verificar-jugadas' ya no consulta el perfil ---
ipcMain.handle('verificar-jugadas', async (event, { userId, historial }) => {
  if (!userId || !historial) return { success: false };
  try {
      const jugadasRef = firestoreDb.collection('users').doc(userId).collection('jugadas');
      const jugadasPendientesSnapshot = await jugadasRef.where('status', '==', 'pendiente').get();
      if (jugadasPendientesSnapshot.empty) return { success: true, updated: false };

      const historialMap = new Map(historial.map(s => [s.fecha, s]));
      const batch = firestoreDb.batch();
      let seActualizoAlgo = false;
      const premiosMapReporte = { '6': '1er Lugar (Melate)', '5+1': '2do Lugar', '5': '3er Lugar', '4+1': '4to Lugar', '4': '5to Lugar', '3+1': '6to Lugar', '3': '7mo Lugar', '2+1': '8vo Lugar', '2': '9no Lugar', };
      const getPremioMelateReporte = (n, a) => { const k=`${n}${a && n>=2 && n<=5 ?'+1':''}`; return premiosMapReporte[k]||null; };

      jugadasPendientesSnapshot.forEach(doc => {
          const jugada = doc.data();
          if (historialMap.has(jugada.fecha)) {
              seActualizoAlgo = true;
              const sorteoOficial = historialMap.get(jugada.fecha);
              if (!sorteoOficial || !jugada.combinacion) {
                  log.warn(`Saltando verificación para jugada ${doc.id} - datos incompletos.`);
                  return;
              }
              const { combinacion } = jugada;
              const natArr = sorteoOficial.numeros?.filter(n => combinacion.includes(n)) || [];
              const adAcertado = sorteoOficial.adicional != null && combinacion.filter(n => !(sorteoOficial.numeros || []).includes(n)).includes(sorteoOficial.adicional);
              const revArr = sorteoOficial.numeros_revancha?.filter(n => combinacion.includes(n)) || [];
              const rchArr = sorteoOficial.numeros_revanchita?.filter(n => combinacion.includes(n)) || [];
              const esGanador = (natArr.length >= 2) || (revArr.length === 6) || (rchArr.length === 6);

              // --- MODIFICADO: Reporta siempre que sea ganador ---
              if (esGanador) {
                  let premioReportado = null;
                  if (rchArr.length === 6) premioReportado = '1er Lugar (Revanchita)';
                  else if (revArr.length === 6) premioReportado = '1er Lugar (Revancha)';
                  else premioReportado = getPremioMelateReporte(natArr.length, adAcertado);

                  if (premioReportado) {
                      const honorRef = firestoreDb.collection('cuadroDeHonor').doc();
                      batch.set(honorRef, {
                        concurso: sorteoOficial.concurso,
                        premio: premioReportado,
                        fecha: jugada.fecha,
                        combinacion: jugada.combinacion,
                        reportadoEn: admin.firestore.FieldValue.serverTimestamp()
                      });
                  }
              }

              batch.update(jugadasRef.doc(doc.id), {
                  status: esGanador ? 'ganador' : 'sin_premio',
                  concurso: sorteoOficial.concurso || jugada.concurso || 'N/A',
                  resultado: { melate: `${natArr.length}${adAcertado ? '+1' : ''}`, revancha: revArr.length, revanchita: rchArr.length }
              });
          }
      });
      if (seActualizoAlgo) await batch.commit();
      return { success: true, updated: seActualizoAlgo };
  } catch (error) { console.error('Error verificar jugadas:', error); log.error('Error verificar jugadas:', error); return { success: false, message: error.message }; }
});

ipcMain.handle('registrar-pulso', async (event, { numeros }) => {
  if (!numeros || numeros.length === 0) return { success: false };
  const weekId = getWeekId();
  log.info(`Registrando pulso para la semana: ${weekId}`);
  if (!weekId) { log.error('getWeekId() devolvió inválido.'); return { success: false, message: 'No se pudo determinar la semana.'}; }
  const pulseRef = firestoreDb.collection('communityPulse').doc(weekId);
  try {
      await firestoreDb.runTransaction(async (t) => { const d = await t.get(pulseRef); let c = d.exists && d.data().counts ? d.data().counts : {}; numeros.forEach(n => c[n] = (c[n] || 0) + 1); t.set(pulseRef, {counts: c}, {merge: true}); });
      return { success: true };
  } catch (error) { console.error("Error registrar pulso:", error); log.error("Error registrar pulso:", error); return { success: false, message: error.message }; }
});
ipcMain.handle('obtener-pulso', async () => {
  const weekId = getWeekId();
  log.info(`Obteniendo pulso para la semana: ${weekId}`);
  if (!weekId) { log.error('getWeekId() devolvió inválido.'); return []; }
  const pulseRef = firestoreDb.collection('communityPulse').doc(weekId);
  try {
      const doc = await pulseRef.get(); if (!doc.exists || !doc.data().counts) return []; const counts = doc.data().counts;
      return Object.entries(counts).map(([n, c]) => ({numero: parseInt(n), count: c})).sort((a,b)=>b.count-a.count);
  } catch (error) { console.error("Error obtener pulso:", error); log.error("Error obtener pulso:", error); return []; }
});
ipcMain.handle('obtener-cuadro-de-honor', async () => {
  try { const snapshot = await firestoreDb.collection('cuadroDeHonor').orderBy('reportadoEn', 'desc').limit(30).get(); return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }
  catch (error) { console.error("Error obtener honor:", error); log.error("Error obtener honor:", error); return []; }
});
ipcMain.handle('compartir-jugada', (event, data) => { // Para copiar al portapapeles
  try { if(data.texto) clipboard.writeText(data.texto); return { success: true, message: 'Copiado al portapapeles' }; }
  catch (e) { log.error("Error al copiar al portapapeles:", e); return { success: false, message: 'Error al copiar' }; }
});
ipcMain.handle('open-external-url', (event, url) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
        shell.openExternal(url);
    } else {
        log.warn(`Intento de abrir URL inválida: ${url}`);
    }
});