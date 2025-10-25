// Importaciones para Cloud Functions v2
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions"); // Usar el logger v2
const { defineString } = require('firebase-functions/params'); // Para parámetros de entorno v2

// Importaciones estándar
const admin = require("firebase-admin");
const { TwitterApi } = require("twitter-api-v2");
const FB = require("fb");
// Usar variable de entorno (definida abajo o en .env) o fallback
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "process.env.STRIPE_SECRET_KEY");

// --- Variables de Entorno Definidas ---
const xApiKey = defineString('X_APIKEY');
const xApiSecret = defineString('X_APISECRET');
const xAccessToken = defineString('X_ACCESSTOKEN');
const xAccessSecret = defineString('X_ACCESSSECRET');
const facebookPageToken = defineString('FACEBOOK_PAGETOKEN');
const facebookPageId = defineString('FACEBOOK_PAGEID');
// const stripeSecretKey = defineString('STRIPE_SECRET_KEY'); // Definir si usas .env
// const stripeWebhookSecret = defineString('STRIPE_WEBHOOK_SECRET'); // Definir si usas .env y verificación

// Inicializar Firebase Admin SDK (SOLO UNA VEZ)
admin.initializeApp();
const db = admin.firestore();

// --- Configuración Clientes API (Intentar inicializar) ---
let twitterReadWriteClient;
let fbApiInitialized = false;

try {
    if (xApiKey.value() && xApiSecret.value() && xAccessToken.value() && xAccessSecret.value()) {
        const twitterClient = new TwitterApi({
          appKey: xApiKey.value(),
          appSecret: xApiSecret.value(),
          accessToken: xAccessToken.value(),
          accessSecret: xAccessSecret.value(),
        });
        twitterReadWriteClient = twitterClient.readWrite;
        logger.info("Cliente de Twitter inicializado.");
    } else {
        logger.warn("Configuración de Twitter incompleta (variables de entorno).");
    }
} catch (e) {
    logger.error("Error EXCEPCIONAL al intentar inicializar Twitter:", e);
}

try {
    if (facebookPageToken.value() && facebookPageId.value()) {
        FB.setAccessToken(facebookPageToken.value());
        fbApiInitialized = true;
        logger.info("Cliente de Facebook inicializado.");
    } else {
        logger.warn("Configuración de Facebook incompleta (variables de entorno).");
    }
} catch (e) {
    logger.error("Error EXCEPCIONAL al intentar inicializar Facebook:", e);
}


// --- FUNCIÓN 1: Stripe Webhook (Sintaxis v2 - SIN secrets) ---
exports.stripeWebhookV2 = onRequest(
    // ✨ ELIMINAMOS la línea 'secrets' de aquí
    { region: 'us-central1' },
    async (req, res) => {
        logger.info("Webhook de Stripe recibido...");
        // --- Verificación de Firma (Opcional pero recomendado) ---
        // const sig = req.headers['stripe-signature'];
        // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Cargar desde .env
        // let event;
        // try {
        //   event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        //   logger.info("Firma de Webhook verificada.");
        // } catch (err) {
        //   logger.error(`⚠️ Falló la verificación de firma del Webhook.`, err.message);
        //   res.status(400).send(`Webhook Error: ${err.message}`);
        //   return;
        // }
        // --- Fin Verificación ---

        const event = req.body; // Usar sin verificación por ahora

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.client_reference_id;
            logger.info(`Checkout completado para User ID: ${userId}`);

            if (!userId) {
                logger.error("¡Error! No se encontró client_reference_id (userId) en Stripe.");
                res.status(400).send("Error: No se encontró el UID del usuario.");
                return;
            }
            try {
                const newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + 30);
                const updateData = {
                    subscriptionStatus: "active",
                    subscriptionEndDate: admin.firestore.Timestamp.fromDate(newEndDate),
                };
                await db.collection("users").doc(userId).update(updateData);
                logger.info(`¡Éxito! Suscripción activada para el usuario: ${userId}`);
                res.status(200).json({ received: true, message: "Suscripción activada con éxito." });
                return;
            } catch (error) {
                logger.error(`Error al actualizar Firestore para ${userId}:`, error);
                res.status(500).send("Error interno al actualizar suscripción.");
                return;
            }
        }
        logger.info(`Evento Stripe ${event.type} recibido, no procesado.`);
        res.status(200).json({ received: true });
});


// --- FUNCIÓN 2: Publicar Victoria (Sintaxis v2) ---
exports.publicarVictoriaV2 = onDocumentCreated(
    {
        document: 'cuadroDeHonor/{victoriaId}',
        region: 'us-central1',
        // No necesitamos 'secrets' aquí tampoco si las claves ya están cargadas arriba
    },
    async (event) => {
        const snap = event.data;
        if (!snap) {
            logger.error("Evento de creación sin datos (snapshot). Abortando.");
            return;
        }
        const victoriaData = snap.data();
        const victoriaId = event.params.victoriaId;
        logger.info(`Nueva victoria detectada (${victoriaId}):`, JSON.stringify(victoriaData));

        if (!victoriaData || !victoriaData.premio || !victoriaData.concurso || !victoriaData.combinacion || !Array.isArray(victoriaData.combinacion)) {
            logger.error(`(${victoriaId}) Datos de victoria incompletos o inválidos. Abortando.`);
            return;
        }

        try {
            const combinacionStr = victoriaData.combinacion.join(' - ');
            const mensaje = `¡Felicidades! Un usuario de Melator ganó el ${victoriaData.premio} en el sorteo #${victoriaData.concurso} (${victoriaData.fecha}) con la combinación ${combinacionStr}. 🎉\n\n¡Genera tus jugadas inteligentes con Melator!\n#Melate #Lotería #Suerte #MelatorApp #Ganador`;
            logger.info(`(${victoriaId}) Mensaje formateado: ${mensaje}`);

            // Publicar en X
            if (twitterReadWriteClient) {
                logger.info(`(${victoriaId}) Intentando publicar en X...`);
                try {
                    const tweetResult = await twitterReadWriteClient.v2.tweet(mensaje);
                    logger.info(`(${victoriaId}) Publicado exitosamente en X. ID del Tweet: ${tweetResult.data.id}`);
                } catch (error) {
                    logger.error(`(${victoriaId}) Error al publicar en X:`, error);
                }
            } else {
                logger.warn(`(${victoriaId}) Cliente de Twitter no inicializado. Saltando publicación.`);
            }

            // Publicar en Facebook
            const currentPageId = facebookPageId.value();
            if (fbApiInitialized && currentPageId) {
                logger.info(`(${victoriaId}) Intentando publicar en Facebook (Página ID: ${currentPageId})...`);
                try {
                    // No es necesario re-establecer token en V2 si ya se hizo al inicio
                    const fbResponse = await FB.api(`/${currentPageId}/feed`, 'post', { message: mensaje });
                    logger.info(`(${victoriaId}) Publicado exitosamente en Facebook. ID de publicación: ${fbResponse.id}`);
                } catch (error) {
                    logger.error(`(${victoriaId}) Error al publicar en Facebook:`, error.response ? error.response.error : error);
                }
            } else {
                logger.warn(`(${victoriaId}) Configuración de Facebook incompleta (token, pageId o inicialización). Saltando publicación.`);
            }

        } catch (formatError) {
            logger.error(`(${victoriaId}) Error al formatear el mensaje:`, formatError);
            return;
        }
        return; // Terminar la función
    });