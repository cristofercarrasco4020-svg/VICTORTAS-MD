const axios = require('axios'); 
const fs = require('fs');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const ytdl = require('@distube/ytdl-core'); 
const yts = require('yt-search'); 
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, fetchLatestBaileysVersion, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require("pino");
const readline = require("readline");
const fetch = require('node-fetch'); // Necesario para XNXX y otros
const { search, download } = require('aptoide-scraper');


// ==========================================
// 👑 CONFIGURACIÓN CENTRAL (AQUÍ CAMBIAS TODO)
// ==========================================
const ownerData = {
    numero: "526633147534",  // Tu número principal
    lid: "191809682694179",  // Tu ID técnico (LID)
    nombre: "Criss",         // Tu nombre
    botName: "Crissbot"      // Nombre del Bot
};

let botActivo = true; 



// ==========================================
// ⚙️ CONFIGURACIÓN DE CONSOLA
// ==========================================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    console.log("🚀 Iniciando sistema...");

    const { state, saveCreds } = await useMultiFileAuthState('sesion_propia');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, 
        mobile: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        connectTimeoutMs: 60000, 
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false, 
        markOnlineOnConnect: true,
    });

    // ==========================================
    // 🔗 VINCULACIÓN CON CÓDIGO
    // ==========================================
    if (!sock.authState.creds.registered) {
        console.clear();
        console.log("🛠️  CONFIGURACIÓN DE VINCULACIÓN  🛠️");
        const numero = await question("\nIntroduce tu número (ej: 521...): ");
        const numeroLimpio = numero.replace(/[^0-9]/g, '');
        console.log(`\n⏳ Solicitando código para: ${numeroLimpio}...`);
        await delay(3000); 
        try {
            const code = await sock.requestPairingCode(numeroLimpio);
            console.log(`\n=============================`);
            console.log(` TU CÓDIGO:  ${code}`);
            console.log(`=============================\n`);
            console.log("⚠️  Ponlo en WhatsApp lo más rápido posible  ⚠️");
        } catch (e) {
            console.log("❌ Error al pedir código:", e.message);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    // ==========================================
    // 📡 MONITOREO DE CONEXIÓN
    // ==========================================
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexión cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) iniciarBot();
        } else if (connection === 'open') {
            console.log('✅ ¡BOT CONECTADO Y LISTO! 🤖');
        }
    });

    // ==========================================
    // 📩 MANEJADOR DE MENSAJES (EL NÚCLEO)
    // ==========================================
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            
            const from = m.key.remoteJid;
            const type = Object.keys(m.message)[0];
            const prefix = '.';
            const body = m.message.conversation || m.message[type]?.caption || m.message[type]?.text || "";
            
            // 🔧 VARIABLE GLOBAL: Sender
            const sender = m.key.participant || m.key.remoteJid; 

            const pushName = m.pushName || "Sin Nombre";
            const numeroIdentificado = from.split('@')[0];
            const horaConsola = new Date().toLocaleTimeString();
            const textoMensaje = body || "📷 [Archivo/Sticker]";


// ==========================================
// 💰 ECONOMÍA (PRIMERO CARGAMOS DATOS)
// ==========================================
const rutaBanco = './banco.json';
const rutaTitulos = './titulos.json';
const leerJSON = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const guardarJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

let banco = leerJSON(rutaBanco);
let titulos = leerJSON(rutaTitulos);
let usuarioKey = sender.split('@')[0]; // ✅ AGREGA ESTA LÍNEA EXACTAMENTE AQUÍ



            // ==========================================
            // 🧠 CEREBRO: EXTRACCIÓN AUTOMÁTICA
            // ==========================================
            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(' ').slice(1);
            const text = args.join(' ');
            
            // --- ⚠️ ZONA DE VARIABLES GLOBALES (AGREGAR ESTO) ⚠️ ---
            // Declaramos esto AQUÍ para no tener errores de "Identifier already declared"
            let userKey = sender.split('@')[0]; // Ya sabemos quién es el usuario desde el principio
            let saldo = banco[userKey] || 0;    // Ya sabemos su saldo inicial
            let quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            let msg = quoted || m.message;
            let mime = (msg.imageMessage || msg.videoMessage || msg.stickerMessage)?.mimetype || '';
            let target = ""; // Variable vacía para usar en menciones
            let amount = 0;  // Variable para dinero
            // -----------------------------------------------------

            if (isCmd) {
                console.log(`🎮 CMD: ${command} | DE: ${pushName}`);
            }




            // ==========================================
            // 🧠 CEREBRO: CARGAR CONFIGURACIÓN (NOMBRE)
            // ==========================================
            // Movemos esto AQUÍ ARRIBA para que ${BotName} funcione en la seguridad
            const rutaConfig = './config.json';
            let configBot = { nombre: "Crissbot" }; // Nombre por defecto
            try {
                if (fs.existsSync(rutaConfig)) {
                     configBot = JSON.parse(fs.readFileSync(rutaConfig));
                }
            } catch (e) {}
            const BotName = configBot.nombre; 

// 👮‍♂️ SEGURIDAD: VERIFICACIÓN CENTRALIZADA
const esOwner = m.key.fromMe || 
                sender.includes(ownerData.numero) || 
                sender.includes(ownerData.lid) || 
                (global.realOwners && global.realOwners.includes(sender));


            // ==========================================
            // 🔋 CANDADO MAESTRO (ON / OFF - ESTRICTO)
            // ==========================================

            // 1. ENCENDER (Único comando que funciona si está apagado)
            // Debe ir PRIMERO para que puedas reactivarlo
            if (body === '.bot on') {
                if (!esOwner) return; // Solo tú puedes encenderlo
                botActivo = true;
                return sock.sendMessage(from, { text: `🔥 *${ownerData.botName} ACTIVADO.*` }, { quoted: m });
            }

            // 2. APAGAR
               if (body === '.bot off') {
                if (!esOwner) return sock.sendMessage(from, { text: `❌ Solo mi creador puede apagarme.` }, { quoted: m });
                botActivo = false;
                await sock.sendMessage(from, { text: `😴 *${ownerData.botName} se ha dormido...*` }, { quoted: m });
                return; 
            }

            // 3. BLOQUEO TOTAL (EL MURO)
            // Si está apagado, el código MUERE AQUÍ para todos (incluido tú)
            if (!botActivo) {
                // Si escriben cualquier comando (que empiece con punto), responde que está dormido
                if (body.startsWith('.')) {
                    return sock.sendMessage(from, { text: `${ownerData.botName}\nesta apagado 😴` }, { quoted: m });
                }
                return; // ⛔ IMPORTANTE: Esto evita que el bot lea los comandos de abajo
            }



// ==========================================
// 🧠 MEMORIA DE XNXX (DETECTOR DE NÚMEROS)
// ==========================================
// Inicializamos la memoria si no existe
global.xnxxSession = global.xnxxSession || {};

// Si el usuario tiene una búsqueda pendiente y escribe un número...
if (global.xnxxSession[from] && !isNaN(body) && !body.startsWith('.')) {
    const session = global.xnxxSession[from];
    const n = parseInt(body.trim());

    // Verificamos si el número es válido en la lista
    if (n > 0 && n <= session.result.length) {
        try {
            await sock.sendMessage(from, { react: { text: "⬇️", key: m.key } });
            await sock.sendMessage(from, { text: `_📥 Descargando video ${n}... Por favor espera._` }, { quoted: m });

            const link = session.result[n - 1].link;
            const res = await xnxxdl(link); // Usamos la función de descarga
            const { qual, views } = res.result.info;

            const txt = `*乂 ¡${BotName} - DOWNLOAD! 乂*\n\n≡ Título : ${res.result.title}\n≡ Duración : ${res.result.duration}\n≡ Calidad : ${qual || 'N/A'}\n≡ Vistas : ${views || 'N/A'}`;
            
            const dll = res.result.files.high || res.result.files.low;
            
            // Enviamos el video
            await sock.sendMessage(from, { video: { url: dll }, caption: txt }, { quoted: m });
            await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
            
            // Borramos la sesión para que no se confunda después
            delete global.xnxxSession[from];
            return; // Detenemos aquí para que no busque otros comandos
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Error al descargar el video.' }, { quoted: m });
        }
    }
}



            const isGroup = from.endsWith('@g.us');


            // ==========================================
            // 📟 CONSOLA ULTRA PRO (RECUPERADA)
            // ==========================================


            console.log(`\n╭═══════════════════════════════════════╮`);
            console.log(`│ 👤 USUARIO:  ${pushName}`);
            console.log(`│ 📱 TEL:      +${numeroIdentificado}`);
            console.log(`│ ⏰ HORA:     ${horaConsola}`);
            console.log(`│ 💬 MENSAJE:  ${textoMensaje}`);
            console.log(`╰═══════════════════════════════════════╯`);



// ==========================================
// 🎒 BASE DE DATOS DE INVENTARIO
// ==========================================
const rutaInventario = './inventario.json';
let inventario = fs.existsSync(rutaInventario) ? JSON.parse(fs.readFileSync(rutaInventario)) : {};
const guardarInventario = () => fs.writeFileSync(rutaInventario, JSON.stringify(inventario, null, 2));

// 🛒 CATÁLOGO DE LA TIENDA (CONFIGURACIÓN)
const shopItems = {
    // 🚗 VEHÍCULOS (Status)
    'toyota':   { nombre: "Toyota Corolla", precio: 15000, emoji: "🚗", tipo: "coche" },
    'ferrari':  { nombre: "Ferrari 488", precio: 250000, emoji: "🏎️", tipo: "coche" },
    'lambo':    { nombre: "Lamborghini", precio: 500000, emoji: "🚔", tipo: "coche" },
    'bugatti':  { nombre: "Bugatti Chiron", precio: 2000000, emoji: "🚀", tipo: "coche" },
    
    // 🏰 PROPIEDADES (Status)
    'choza':    { nombre: "Choza de Tierra", precio: 5000, emoji: "⛺", tipo: "casa" },
    'apto':     { nombre: "Apartamento", precio: 50000, emoji: "🏢", tipo: "casa" },
    'mansion':  { nombre: "Mansión Lujosa", precio: 1500000, emoji: "🏰", tipo: "casa" },
    'isla':     { nombre: "Isla Privada", precio: 10000000, emoji: "🏝️", tipo: "casa" },

    // ⛏️ MINERÍA (Generan dinero con .mine)
    'gpu':      { nombre: "Nvidia RTX 3090", precio: 20000, emoji: "📼", tipo: "mineria", rate: 500 },
    'asic':     { nombre: "Antminer S19", precio: 100000, emoji: "🔌", tipo: "mineria", rate: 3000 },
    'farm':     { nombre: "Granja de Minería", precio: 1000000, emoji: "🏭", tipo: "mineria", rate: 35000 },

    // 💍 LUJO (Solo para presumir)
    'rolex':    { nombre: "Rolex de Oro", precio: 30000, emoji: "⌚", tipo: "joya" },
    'diamante': { nombre: "Diamante Puro", precio: 100000, emoji: "💎", tipo: "joya" }
};


            if (!banco[usuarioKey]) banco[usuarioKey] = 0;

// ==========================================
// ⏱️ BASE DE DATOS DE TIEMPOS (COOLDOWNS)
// ==========================================
const rutaCooldowns = './cooldowns.json';
let cooldowns = fs.existsSync(rutaCooldowns) ? JSON.parse(fs.readFileSync(rutaCooldowns)) : {};
const guardarCooldowns = () => fs.writeFileSync(rutaCooldowns, JSON.stringify(cooldowns, null, 2));

// Función para formatear tiempo (ej: "2h 30m")
const msToTime = (duration) => {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    return `${hours}h ${minutes}m ${seconds}s`;
};



            // ==========================================
            // 📜 COMANDO: MENU (DISEÑO COMPACTO)
            // ==========================================
              switch (command) {
               case 'menu': case 'help': case 'hlp':
                await sock.sendMessage(from, { react: { text: "📂", key: m.key } });

                const horaActual = new Date().getHours();
                let saludo = horaActual >= 5 && horaActual < 12 ? "🌅 Buenos días" : 
                             horaActual >= 12 && horaActual < 19 ? "☀️ Buenas tardes" : "🌙 Buenas noches";

                // Imagen o Video
                let mensajeMenu = {}; 
                const defaultUrl = 'https://files.catbox.moe/tll9q5.mp4'; 
                if (fs.existsSync('./media_menu.mp4')) {
                    mensajeMenu = { video: fs.readFileSync('./media_menu.mp4'), gifPlayback: true };
                } else if (fs.existsSync('./media_menu.jpg')) {
                    mensajeMenu = { image: fs.readFileSync('./media_menu.jpg') };
                } else {
                    mensajeMenu = { video: { url: defaultUrl }, gifPlayback: true }; 
                }

                // --- CABECERA COMPACTA ---
                let textoMenu = `✨ *${saludo} ${pushName}* ✨\n`;
                textoMenu += `👑 *Owner:* ${ownerData.nombre}\n`; 
                textoMenu += `🤖 *Bot:* ${ownerData.botName}\n`;
                textoMenu += `🎖️ *Rango:* ${titulos[usuarioKey] || "Novato"}\n`;
                textoMenu += `💰 *Banco:* $${banco[usuarioKey].toLocaleString()}\n\n`;

                // --- 💰 ECONOMÍA (Texto corto para no romper líneas) ---
                textoMenu += `╭─〔 💰 ECONOMÍA 〕\n`;
                textoMenu += `│💳 .perfil (Estado)\n`;
                textoMenu += `│🎒 .inv (Mochila)\n`;
                textoMenu += `│🏆 .baltop (Top 10)\n`;
                textoMenu += `│💸 .transfer (Pagar)\n`;
                textoMenu += `│🛍️ .shop (Tienda)\n`;
                textoMenu += `│🛒 .buy [item] (Comprar)\n`;
                textoMenu += `│🎰 .slot (Apostar)\n`;
                textoMenu += `│🔴 .ruleta (Casino)\n`;
                textoMenu += `│⛏️ .mine (Minar)\n`;
                textoMenu += `│🔨 .work (Trabajar)\n`;
                textoMenu += `│🎁 .daily (Diario)\n`;
                textoMenu += `│🔫 .rob (Crimen)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 📥 DESCARGAS ---
                textoMenu += `╭─〔 📥 MEDIA 〕\n`;
                textoMenu += `│🎵 .play (Video)\n`;
                textoMenu += `│🎵 .play2 (Audio)\n`;
                textoMenu += `│📱 .tt (TikTok)\n`;
                textoMenu += `│📌 .pin (Pinterest)\n`;
                textoMenu += `│🎧 .tomp3 (A Audio)\n`;
                textoMenu += `│🔞 .xnxx (Buscar)\n`;
                textoMenu += `│📦 .apk (Apps)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 🤖 HERRAMIENTAS ---
                textoMenu += `╭─〔 🤖 TOOLS 〕\n`;
                textoMenu += `│🧠 .ia (Chat GPT)\n`;
                textoMenu += `│🎨 .dibujar (Dall-E)\n`;
                textoMenu += `│🔎 .imagen (Fotos)\n`;
                textoMenu += `│💎 .hd (Calidad)\n`;
                textoMenu += `│🕵️ .mied (Mi ID)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 🎡 DIVERSIÓN ---
                textoMenu += `╭─〔 🎡 EXTRAS 〕\n`;
                textoMenu += `│🏳️‍🌈 .gay (Scanner)\n`;
                textoMenu += `│✂️ .ppt (Jugar)\n`;
                textoMenu += `│🔥 .penetrar (Rol)\n`;
                textoMenu += `│🔞 .tetas (Pack)\n`;
                textoMenu += `│🖼️ .s (Sticker)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 👑 OWNER ---
                textoMenu += `╭─〔 👑 OWNER 〕\n`;
                textoMenu += `│🔹 .owner / .delowner\n`;
                textoMenu += `│🔹 .bot on/off\n`;
                textoMenu += `│🔹 .setname / .setmenu\n`;
                textoMenu += `│🔹 .addcoin (Dinero)\n`;
                textoMenu += `│🔹 .reseteco (Reset)\n`;
                textoMenu += `│🔹 .actualizar\n`;
                textoMenu += `╰──────────────\n\n`;

                textoMenu += `📍 *${ownerData.botName}* | By ${ownerData.nombre}`;

                await sock.sendMessage(from, { ...mensajeMenu, caption: textoMenu }, { quoted: m });
            break;




            // ==========================================
            // 🕵️ COMANDO: MI ID (DETECTOR DE NUMERO)
            // ==========================================

                case 'mied': case 'id': case 'mi id':
                const idCompleto = sender; 
                const numeroLimpio = sender.split('@')[0]; 
                let texto = `🕵️ *DETECTOR DE IDENTIDAD*\n\n`;
                texto += `📱 *Tu Número:* ${numeroLimpio}\n`;
                texto += `🔑 *Tu ID Técnico:* ${idCompleto}\n\n`;
                texto += `⚠️ *NOTA:* Para que los comandos de Owner te reconozcan, asegúrate de que el código incluya: *"${numeroLimpio}"*`;
                await sock.sendMessage(from, { text: texto }, { quoted: m });
      break;

            // ==========================================
            // 🖼️ COMANDO: SETMENU (Dueño + Admins)
            // ==========================================
               case 'setmenu': case 'imagenmenu':
                const groupMetadata = isGroup ? await sock.groupMetadata(from) : null;
                const participants = isGroup ? groupMetadata.participants : [];
                const isAdmin = participants.find(p => p.id === sender)?.admin;
                
                // VERIFICACIÓN: ¿Es el Dueño (Criss) o es un Admin del grupo?
                const tienePermiso = sender.includes("191809682694179") || sender.includes("526633147534") || isAdmin;

                if (!tienePermiso) {
                     return sock.sendMessage(from, { text: '⛔ Solo el creador o los admins pueden usar esto.' }, { quoted: m });
                }

                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quoted) return sock.sendMessage(from, { text: '📸 Responde a una foto o video.' }, { quoted: m });

                const mime = Object.keys(quoted)[0];
                if (mime !== 'imageMessage' && mime !== 'videoMessage') return sock.sendMessage(from, { text: '⚠️ Eso no es una imagen válida.' }, { quoted: m });

                await sock.sendMessage(from, { text: '⏳ Actualizando portada del menú...' }, { quoted: m });

                try {
                    const stream = await downloadContentFromMessage(quoted[mime], mime === 'imageMessage' ? 'image' : 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    if (fs.existsSync('./media_menu.jpg')) fs.unlinkSync('./media_menu.jpg');
                    if (fs.existsSync('./media_menu.mp4')) fs.unlinkSync('./media_menu.mp4');

                    const rutaFinal = mime === 'imageMessage' ? './media_menu.jpg' : './media_menu.mp4';
                    fs.writeFileSync(rutaFinal, buffer);
                    await sock.sendMessage(from, { text: '✅ ¡Menú actualizado por un administrador!' }, { quoted: m });
                } catch (e) { console.log(e); }
           break; 





            // ==========================================
            // 🏷️ COMANDO: SETNAME (Dueño + Admins)
            // ==========================================
 case 'setname':
    if (!esOwner) return;
    const nuevoNombre = body.slice(9).trim();
    if (!nuevoNombre) return;
    
    ownerData.botName = nuevoNombre; // Actualiza el cerebro del bot
    await sock.sendMessage(from, { text: `✅ Nombre actualizado a: *${ownerData.botName}*` }, { quoted: m }); break;


// ==========================================
// 🔞 COMANDO: XNXX (BÚSQUEDA)
// ==========================================
 case 'xnxx': case'polnito':
    const text = body.slice(6).trim();
    if (!text) return sock.sendMessage(from, { text: '❀ Ingresa el nombre o link del video.' }, { quoted: m });

    const isUrl = text.includes('xnxx.com');

    // CASO 1: Es un LINK directo
    if (isUrl) {
        try {
            await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
            const res = await xnxxdl(text);
            const { qual, views } = res.result.info;
            const txt = `*乂 ¡${BotName} - DOWNLOAD! 乂*\n\n≡ Título : ${res.result.title}\n≡ Duración : ${res.result.duration}\n≡ Calidad : ${qual}\n≡ Vistas : ${views}`;
            const dll = res.result.files.high || res.result.files.low;
            await sock.sendMessage(from, { video: { url: dll }, caption: txt }, { quoted: m });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
        }
    } 
    // CASO 2: Es una BÚSQUEDA (Lo que tú querías)
    else {
        try {
            await sock.sendMessage(from, { react: { text: "🔎", key: m.key } });
            const res = await search(encodeURIComponent(text));
            if (!res.result?.length) return sock.sendMessage(from, { text: 'No encontré nada.' }, { quoted: m });

            // Creamos la lista numerada
            const list = res.result.slice(0, 10).map((v, i) => `*${i + 1}* ┃ ${v.title}`).join('\n');
            
            const caption = `*乂 ¡${BotName} - BUSQUEDA! 乂*\n\n${list}\n\n> 🔢 *Responde con el número del video que quieres descargar.*`;
            
            // Guardamos los resultados en la MEMORIA GLOBAL
            global.xnxxSession[from] = {
                result: res.result,
                timeout: setTimeout(() => { delete global.xnxxSession[from] }, 120000) // Se borra en 2 minutos
            };

            await sock.sendMessage(from, { text: caption }, { quoted: m });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Error buscando: ${e.message}` }, { quoted: m }); break;
            }
        }
    break; // 👈 ¡SÚPER IMPORTANTE! ESTE BREAK CIERRA EL COMANDO









// ==========================================
// ☁️ COMANDO: SUBIR ACTUALIZACIÓN (CENTRALIZADO)
// ==========================================
 case 'subiractu':
    // Usamos la seguridad centralizada que definimos arriba
    if (!esOwner) {
        return sock.sendMessage(from, { text: `⛔ Solo el equipo de dueños de ${ownerData.botName} puede usar esto.` }, { quoted: m });
    }

    await sock.sendMessage(from, { text: '☁️ *Subiendo cambios a GitHub...* \n_Por favor espera._' }, { quoted: m });

    // Ejecuta el proceso de subida
    exec('git add . && git commit -m "Actualización vía Bot" && git push origin main', (error, stdout, stderr) => {
        if (error) {
            return sock.sendMessage(from, { text: '❌ *Error en la subida:*\n' + error.message }, { quoted: m });
        }
        
        sock.sendMessage(from, { 
            text: `✅ *¡CÓDIGO ACTUALIZADO!* ☁️\n\nLos cambios ya están en la nube.\n\nLos demás owners ya pueden usar:\n👉 *.actualizar*` 
        }, { quoted: m });
    });
break;



// ==========================================
// 🔄 COMANDO: ACTUALIZAR (CENTRALIZADO)
// ==========================================
 case 'actualizar':
    // Validación centralizada con el sistema híbrido
    if (!esOwner) return sock.sendMessage(from, { text: `⛔ Acceso denegado.` }, { quoted: m });

    await sock.sendMessage(from, { text: '🔄 *Buscando actualizaciones...*' }, { quoted: m });

    exec('git pull origin main', (error, stdout, stderr) => {
        if (error) {
            return sock.sendMessage(from, { text: '❌ *Error al actualizar:*\n' + error.message }, { quoted: m });
        }

        if (stdout.includes('Already up to date')) {
            return sock.sendMessage(from, { text: `✅ *${ownerData.botName}* ya cuenta con la última versión.` }, { quoted: m });
        }

        sock.sendMessage(from, { text: `✅ *¡ACTUALIZACIÓN INSTALADA!*\n\n🔄 *Reiniciando ${ownerData.botName}...*` }, { quoted: m });

        // Espera 2 segundos y reinicia
        setTimeout(() => {
            process.exit(0); 
        }, 2000);
    });
break; }



                // ==========================================
                // 🔐 VERIFICACIÓN (CREADOR + LISTA)
                // ==========================================
                
                // CORRECCIÓN: Usamos 'sender' en vez de 'm.sender'
                // Y usamos ownerData para que sea centralizado
                const soyElJefe = sender.includes(ownerData.numero) || 
                                  sender.includes(ownerData.lid) || 
                                  m.key.fromMe;


                // 2. Definimos quién es un AMIGO CON PODER (Lista)
                const esOwnerRegistrado = global.realOwners && global.realOwners.includes(sender);

                // 3. LA REGLA: Pasa si es Jefe O si es Registrado
                // (Solo aplicable si usas comandos restringidos aquí abajo)



            // ==========================================
            // 👑 COMANDO: AGREGAR REAL OWNER
            // ==========================================
               switch (command) { case 'owner':
                // 1. VERIFICACIÓN CENTRALIZADA (Sin errores)
                // Usamos 'esOwner' que ya definimos arriba correctamente
                if (!esOwner) {
                    return sock.sendMessage(from, { text: `❌ Solo ${ownerData.nombre} puede usar esto.` }, { quoted: m });
                }

                // 2. OBTENER AL NUEVO OWNER
                const participante = m.message?.extendedTextMessage?.contextInfo?.participant || 
                                     m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!participante) {
                    return sock.sendMessage(from, { text: "⚠️ Responde al mensaje de la persona que quieres hacer Owner." }, { quoted: m });
                }

                // 3. GUARDAR
                global.realOwners = global.realOwners || [];
                
                if (!global.realOwners.includes(participante)) {
                    global.realOwners.push(participante);
                    await sock.sendMessage(from, { text: `✅ ¡Acceso Concedido!\n@${participante.split('@')[0]} ahora es *Real Owner*.`, mentions: [participante] }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "💡 Esa persona ya es Owner." }, { quoted: m });
}              break;


            // ==========================================
            // 🗑️ COMANDO: ELIMINAR OWNER
            // ==========================================
                case 'delowner':
                // 1. Verificación Estricta (Solo TÚ puedes borrar)
                const soyYo = sender.includes(ownerData.numero) || sender.includes(ownerData.lid) || m.key.fromMe;

                if (!soyYo) {
                    return sock.sendMessage(from, { text: "❌ Solo el Creador Principal puede eliminar owners." }, { quoted: m });
                }

                const target = m.message?.extendedTextMessage?.contextInfo?.participant || 
                               m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!target) return sock.sendMessage(from, { text: "⚠️ Responde al mensaje del Owner a eliminar." }, { quoted: m });

                if (global.realOwners && global.realOwners.includes(target)) {
                    global.realOwners = global.realOwners.filter(owner => owner !== target);
                    await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} eliminado de la lista.`, mentions: [target] }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ No es Owner." }, { quoted: m });
              break;  }
            }


// ==========================================
// 👑 COMANDO: CREADOR (CENTRALIZADO)
// ==========================================
   switch (command) { case 'creador':
    const nombreOwner = ownerData.nombre; // Usa tu nombre central
    const numeroOwner = ownerData.numero; // Usa tu número central
    const instagram = "https://www.instagram.com/_.110418._?igsh=YW41MG52M3l4OHNq";
    
    const vcard = 'BEGIN:VCARD\n' + 
                  'VERSION:3.0\n' + 
                  'FN:' + nombreOwner + '\n' + 
                  'ORG:Creador del Bot;\n' + 
                  'TEL;type=CELL;type=VOICE;waid=' + numeroOwner + ':+' + numeroOwner + '\n' + 
                  'NOTE:Puedes seguir a mi creador en Instagram: ' + instagram + '\n' + 
                  'URL:' + instagram + '\n' + 
                  'END:VCARD';

    await sock.sendMessage(from, { 
        contacts: { displayName: nombreOwner, contacts: [{ vcard }] } 
    }, { quoted: m });
break; }




// ==========================================
// 🎨 COMANDO: STICKER (FIX DEFINITIVO)
// ==========================================
   switch (command) { case 's': case 'stiker':
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const msg = quoted || m.message;
    const mime = (msg.imageMessage || msg.videoMessage || msg.stickerMessage)?.mimetype || '';

    if (/image|video|webp/.test(mime)) {
        if (msg.videoMessage && msg.videoMessage.seconds > 15) return sock.sendMessage(from, { text: '⚠️ El video no puede durar más de 15 segundos.' });

        await sock.sendMessage(from, { react: { text: '🕓', key: m.key } });

        try {
            const type = mime.split('/')[0];
            const stream = await downloadContentFromMessage(msg[Object.keys(msg)[0]], type);
            const buffer = await bufferToData(stream);

            // ✅ SOLUCIÓN: Definir nombres de archivos ANTES de usarlos
            const ext = type === 'image' ? 'jpg' : 'mp4';
            const tempFile = `./temp_stick_${Date.now()}.${ext}`;
            const tempOut = `./sticker_${Date.now()}.webp`;

            // Ahora sí guardamos el archivo
            fs.writeFileSync(tempFile, buffer);

            let ffmpegCmd = `ffmpeg -i ${tempFile} -vcodec libwebp -filter:v "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -f webp ${tempOut}`;
            if (type !== 'image') ffmpegCmd = `ffmpeg -i ${tempFile} -vcodec libwebp -filter:v "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -loop 0 -ss 00:00:00 -t 00:00:10 -preset default -an -vsync 0 -s 512:512 ${tempOut}`;

            exec(ffmpegCmd, async (err) => {
                if (err) return sock.sendMessage(from, { text: '❌ Error FFmpeg.' });
                
                await sock.sendMessage(from, { sticker: fs.readFileSync(tempOut) }, { quoted: m });
                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
            });
        } catch (e) {
            await sock.sendMessage(from, { text: '❌ Error: ' + e.message });
        }
    }
break;  }



            // ==========================================
            // 🏓 COMANDO: PING (VELOCIDAD)
            // ==========================================
              switch (command) { case 'ping':
                const velocidad = new Date().getTime() - (m.messageTimestamp * 1000);
               await sock.sendMessage(from, { text: `¡Pong! 🏓\n⚡ Velocidad: ${velocidad}ms\n✅ Estado: Online` }, { quoted: m });
           break; }

            // ==========================================
            // 🎵 COMANDO: TIKTOK DL
            // ==========================================
               switch (command) { case 'tt': case 'tiktok':
                const query = body.slice(4).trim();
                if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe qué buscar.\nEj: .tt edit polnito' }, { quoted: m });
                await sock.sendMessage(from, { text: '🔍 *Buscando tus 4 videos...*' }, { quoted: m });
                try {
                    if (query.includes('http')) {
                        const { data } = await axios.get(`https://www.tikwm.com/api/?url=${query}`);
                        if (data.code === 0) {
                            return await sock.sendMessage(from, { video: { url: data.data.play }, caption: `✅ *Video Descargado*\n🤖 By: ${BotName}\n` }, { quoted: m });
                        }
                    } else {
                        const { data } = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}`);
                        if (data.data && data.data.videos) {
                            const videos = data.data.videos.slice(0, 4); 
                            for (let i = 0; i < videos.length; i++) {
                                const v = videos[i];
                                await sock.sendMessage(from, { video: { url: v.play }, caption: `🎥 *Video ${i + 1}/4*\n📌 ${v.title}\n🤖 By: ${BotName}\n` }, { quoted: m });
                                if (i < videos.length - 1) { await new Promise(res => setTimeout(res, 2500)); }
                            }
                            await sock.sendMessage(from, { text: '✅ ¡Listo! 4 videos enviados.' }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { text: '❌ No encontré nada.' }, { quoted: m });
                        }
                    }
                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: '❌ Error al descargar.' }, { quoted: m });
                }
           break; }

            // ==========================================
            // 💎 SISTEMA DE BIENVENIDAS Y DESPEDIDAS (FULL)
            // ==========================================
            const esCmdWelcome = body.startsWith('.welcome') || body.startsWith('.setwel') || 
                                 body.startsWith('.welaudi') || body.startsWith('.delwe') || 
                                 body.startsWith('.delaudio'); // Agregamos .delaudio aquí para que lo detecte

            if (esCmdWelcome) {
                // Solo calculamos Admin si el usuario intenta configurar algo
                const groupMetadata = isGroup ? await sock.groupMetadata(from) : null;
                const isAdmin = groupMetadata ? groupMetadata.participants.find(p => p.id === sender)?.admin : false;

                // --- 1. ACTIVAR / DESACTIVAR ---
                if (body === '.welcome on' || body === '.welcome off' || body === '.welcome2 on' || body === '.welcome2 off') {
                    if (!esOwner && !isAdmin) return sock.sendMessage(from, { text: '⛔ Solo admins o mi owner.' }, { quoted: m });
                    
                    const esIn = body.includes('2'); // Si tiene "2" es Entrada, si no es Salida
                    const db = esIn ? welcome2DB : welcomeDB;
                    
                    db.status[from] = body.includes('on');
                    esIn ? guardarWelcome2() : guardarWelcome();
                    await sock.sendMessage(from, { text: `✨ Sistema de ${esIn ? 'BIENVENIDAS' : 'DESPEDIDAS'} ${body.includes('on') ? 'ACTIVADO' : 'DESACTIVADO'} con éxito.` }, { quoted: m });
                }

                // --- 2. CONFIGURAR FOTO / VIDEO (.setwel) ---
                if (body === '.setwel' || body === '.setwel2') {
                    if (!esOwner && !isAdmin) return;
                    const db = body === '.setwel' ? welcomeDB : welcome2DB;
                    if (db.files.length >= 7) return sock.sendMessage(from, { text: '⚠️ Cupos llenos (7/7).' }, { quoted: m });
                    
                    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    const mime = quoted ? Object.keys(quoted)[0] : null;
                    if (mime !== 'imageMessage' && mime !== 'videoMessage') return sock.sendMessage(from, { text: '📸 Responde a una foto o video para establecerla.' }, { quoted: m });

                    const buffer = await downloadContentFromMessage(quoted[mime], mime === 'imageMessage' ? 'image' : 'video');
                    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
                    const path = `./media_${Date.now()}.${mime === 'imageMessage' ? 'jpg' : 'mp4'}`;
                    fs.writeFileSync(path, buf);
                    db.files.push({ path, type: mime === 'imageMessage' ? 'image' : 'video' });
                    body === '.setwel' ? guardarWelcome() : guardarWelcome2();
                    await sock.sendMessage(from, { text: `✅ Archivo guardado. Cupos usados: ${db.files.length}/7` }, { quoted: m });
                }

                // --- 3. CONFIGURAR AUDIO (.welaudi) ---
                if (body === '.welaudi' || body === '.welaudi2') {
                    if (!esOwner && !isAdmin) return;
                    const db = body === '.welaudi' ? welcomeDB : welcome2DB;
                    if (db.audios.length >= 4) return sock.sendMessage(from, { text: '⚠️ Cupos de audio llenos (4/4).' }, { quoted: m });
                    
                    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted || !quoted.audioMessage) return sock.sendMessage(from, { text: '🎵 Por favor, responde a una NOTA DE VOZ o CANCIÓN.' }, { quoted: m });

                    const buffer = await downloadContentFromMessage(quoted.audioMessage, 'audio');
                    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
                    const path = `./audio_${Date.now()}.mp3`;
                    fs.writeFileSync(path, buf);
                    db.audios.push(path);
                    body === '.welaudi' ? guardarWelcome() : guardarWelcome2();
                    await sock.sendMessage(from, { text: `✅ Audio correcto guardado. Cupos: ${db.audios.length}/4` }, { quoted: m });
                }

                // --- 4. BORRAR (.delwe / .delaudio) ---
                // Aquí está la lógica exacta que pediste:
                if (body.startsWith('.delwe') || body.startsWith('.delaudio')) {
                    if (!esOwner && !isAdmin) return;
                    
                    // ¿Qué vamos a borrar?
                    const esAudio = body.includes('audio'); // Si escribiste .delaudio... es Audio
                    const esIn = body.includes('2');        // Si escribiste ...2 (ej: .delaudio2) es Bienvenida
                    
                    // Seleccionamos la base de datos correcta
                    const db = esIn ? welcome2DB : welcomeDB;
                    
                    // Obtenemos el número (ej: .delaudio 2 -> index 1)
                    const index = parseInt(body.split(' ')[1]) - 1;
                    const lista = esAudio ? db.audios : db.files;
                    
                    if (isNaN(index) || !lista[index]) return sock.sendMessage(from, { text: '❌ Número inválido. Escribe el número del archivo a borrar.' }, { quoted: m });
                    
                    // Borrado físico del archivo
                    const borrar = esAudio ? lista[index] : lista[index].path;
                    if (fs.existsSync(borrar)) fs.unlinkSync(borrar);
                    
                    // Borrado de la lista
                    lista.splice(index, 1);
                    
                    esIn ? guardarWelcome2() : guardarWelcome();
                    
                    const tipo = esAudio ? "AUDIO" : "IMAGEN/VIDEO";
                    const lugar = esIn ? "BIENVENIDAS" : "DESPEDIDAS";
                    await sock.sendMessage(from, { text: `🗑️ ${tipo} eliminado de ${lugar} correctamente.` }, { quoted: m });
                }
            }




            // ==========================================
            // ℹ️ COMANDO: INFORMACIÓN DEL SISTEMA
            // ==========================================
             switch (command) { case 'info': case 'estado':
                const uptime = process.uptime();
                const horas = Math.floor(uptime / 3600);
                const minutos = Math.floor((uptime % 3600) / 60);
                const segundos = Math.floor(uptime % 60);
                const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const speed = new Date().getTime() - (m.messageTimestamp * 1000);
                const textoInfo = `💻 *INFORMACIÓN DEL SISTEMA* 💻\n\n👑 *Creador:* Criss\n🤖 *Bot:* ${BotName}\n🚀 *Velocidad:* ${speed}ms\n⏳ *Tiempo Activo:* ${horas}h ${minutos}m ${segundos}s\n💾 *RAM Usada:* ${ram} MB\n📱 *Plataforma:* Termux (Android)\n📚 *Base:* Baileys (JavaScript)\n🛡️ *Versión:* 1.0.0`;
                await sock.sendMessage(from, { text: textoInfo }, { quoted: m });
           break; }

            // ==========================================
            // 💿 COMANDO: PLAY (MÚSICA Y VIDEO)
            // ==========================================
               switch (command) { case 'play':
                const isVideo = !body.startsWith('.play2');
               const query = body.replace(isVideo ? '.play' : '.play2', '').trim();
                if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre.' }, { quoted: m });
                await sock.sendMessage(from, { text: `🔍 *Buscando:* ${query}...` }, { quoted: m });
                try {
                    const search = await yts(query);
                    const video = search.all[0];
                    if (!video) return sock.sendMessage(from, { text: '❌ No encontrado.' }, { quoted: m });
                    await sock.sendMessage(from, { image: { url: video.thumbnail }, caption: `💿 *ENCONTRADO*\n📌 ${video.title}\n🚀 *Descargando ${isVideo ? 'Video' : 'Audio'}...*` }, { quoted: m });

                    const nombreArchivo = `descargas/${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`;
                    const stream = ytdl(video.url, { quality: isVideo ? 'lowest' : 'highestaudio', filter: isVideo ? 'audioandvideo' : 'audioonly' });
                    const fileWriter = fs.createWriteStream(nombreArchivo);
                    stream.pipe(fileWriter);

                    fileWriter.on('finish', async () => {
                        if (isVideo) {
                            await sock.sendMessage(from, { video: { url: nombreArchivo }, caption: `🎥 *${video.title}*\n🤖 By: ${BotName}` }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { audio: { url: nombreArchivo }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                        }
                        fs.unlinkSync(nombreArchivo);
                    });
                    stream.on('error', (err) => {
                        sock.sendMessage(from, { text: '❌ Error en la descarga.' }, { quoted: m });
                    });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Error al procesar.' }, { quoted: m });
                }
           break; }


// ==========================================
// 🧠 COMANDO: IA (SERVIDOR WIDIPE - ESTABLE)
// ==========================================
   switch (command) { case 'ia': case 'chatgpt':
    const text = body.slice(body.indexOf(' ') + 1).trim();
    if (body.split(' ').length < 2) return sock.sendMessage(from, { text: `🤖 Dime, ¿qué necesitas?` }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "🧠", key: m.key } });

    try {
        // Servidor Widipe (Muy rápido)
        const { data } = await axios.get(`https://widipe.com.ua/api/ai/chatgpt?text=${encodeURIComponent(text)}`);
        
        if (data && data.result) {
            await sock.sendMessage(from, { text: `🤖 *${ownerData.botName}:*\n\n${data.result}` }, { quoted: m });
        } else {
            throw new Error("Sin respuesta");
        }
    } catch (e) {
        // Respaldo SimSimi
        try {
            const { data } = await axios.get(`https://api.simsimi.vn/v2/simsimi?text=${encodeURIComponent(text)}&lc=es`);
            if (data.success) await sock.sendMessage(from, { text: `🤖 ${data.success}` }, { quoted: m });
        } catch (e2) {
            await sock.sendMessage(from, { text: "❌ Error fatal en IA." }, { quoted: m });
        }
    }
break; }





            // ==========================================
            // 💎 COMANDO: HD (REMASTERIZAR)
            // ==========================================
               switch (command) { case 'hd':
                const getMedia = (msg) => {
                    if (!msg) return null;
                    if (msg.imageMessage) return { m: msg.imageMessage, t: 'image' };
                    if (msg.videoMessage) return { m: msg.videoMessage, t: 'video' };
                    if (msg.viewOnceMessage?.message?.imageMessage) return { m: msg.viewOnceMessage.message.imageMessage, t: 'image' };
                    return null;
                };

                let target = m.message;
                let media = getMedia(target);
                
                if (!media && m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                    target = m.message.extendedTextMessage.contextInfo.quotedMessage;
                    media = getMedia(target);
                }

                if (!media) return sock.sendMessage(from, { text: '⚠️ Responde a una foto o video con .hd' }, { quoted: m });

                await sock.sendMessage(from, { text: '💎 *Mejorando calidad...* (Esto puede tardar un poco)' }, { quoted: m });

                try {
                    const stream = await downloadContentFromMessage(media.m, media.t);
                    const buffer = await bufferToData(stream);
                    const ext = media.t === 'image' ? 'jpg' : 'mp4';
                    const inp = `./temp_hd_${Date.now()}.${ext}`;
                    const out = `./hd_${Date.now()}.${ext}`;
                    fs.writeFileSync(inp, buffer);

                    let command = '';
                    if (media.t === 'image') {
                        command = `ffmpeg -i ${inp} -vf "scale=iw*2:ih*2,unsharp=5:5:1.0:5:5:0.0" -q:v 2 ${out}`;
                    } else {
                        command = `ffmpeg -i ${inp} -vf "scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0" -c:v libx264 -preset fast -crf 23 -c:a copy ${out}`;
                    }

                    exec(command, async (err) => {
                        if (err) {
                            console.log("Error FFmpeg HD:", err);
                            try { fs.unlinkSync(inp); } catch {}
                            return sock.sendMessage(from, { text: '❌ El video es muy pesado o hubo error.' }, { quoted: m });
                        }
                        if (media.t === 'image') {
                            await sock.sendMessage(from, { image: fs.readFileSync(out), caption: '💎 *HD Mejorado*' }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { video: fs.readFileSync(out), caption: '💎 *Video Remasterizado*' }, { quoted: m });
                        }
                        try { fs.unlinkSync(inp); fs.unlinkSync(out); } catch {}
                    });

                } catch (e) {
                    console.log(e);
                    sock.sendMessage(from, { text: '❌ Error al procesar.' }, { quoted: m });
                }
          break;  }



// ==========================================
// 🔎 COMANDO: GOOGLE IMAGE SEARCH (.imagen)
// ==========================================
   switch (command) { case 'imagen':
    const text = body.slice(body.indexOf(' ') + 1).trim();
    if (body.split(' ').length < 2) return sock.sendMessage(from, { text: '❀ Por favor, ingrese un texto para buscar.' }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    // Función interna para buscar imágenes (Lógica adaptada)
    async function googleSearch(query) {
        try {
            // INTENTO 1: API Delirius (La que usaba tu código original)
            const { data } = await axios.get(`https://delirius-api-oficial.vercel.app/api/gimg?query=${encodeURIComponent(query)}`);
            if (data.status && Array.isArray(data.data)) {
                return data.data; // Retorna array de URLs
            }
        } catch (e) { console.log("Falló API 1"); }

        try {
            // INTENTO 2: API Respaldo (Bing/Google Scraper)
            const { data } = await axios.get(`https://api.vreden.web.id/api/gimage?query=${encodeURIComponent(query)}`);
            if (data.result && Array.isArray(data.result)) {
                return data.result;
            }
        } catch (e) { console.log("Falló API 2"); }
        
        return []; // Si todo falla
    }

    try {
        const urls = await googleSearch(text);

        if (!urls || urls.length === 0) {
            return sock.sendMessage(from, { text: '✧ No se encontraron imágenes sobre eso.' }, { quoted: m });
        }

        // LÓGICA DE ENVÍO (Adaptada a tu bot)
        // Enviamos máximo 5 imágenes para no hacer spam (tu código original pedía 10)
        const limit = Math.min(5, urls.length);
        
        await sock.sendMessage(from, { text: `❀ *Resultados para:* ${text}\nEnviando ${limit} imágenes...` }, { quoted: m });

        for (let i = 0; i < limit; i++) {
            await sock.sendMessage(from, { 
                image: { url: urls[i] }, 
                caption: i === 0 ? `🤖 By: ${ownerData.botName}` : null // Solo la primera lleva nombre
            });
            // Pequeña pausa para que WhatsApp no bloquee el envío
            await new Promise(r => setTimeout(r, 1000));
        }

        await sock.sendMessage(from, { react: { text: "✔️", key: m.key } });

    } catch (error) {
        console.log(error);
        await sock.sendMessage(from, { text: `⚠︎ Ocurrió un error al buscar las imágenes.` }, { quoted: m });
        await sock.sendMessage(from, { react: { text: "✖️", key: m.key } });
    }
break; }



            // ==========================================
            // 🎵 COMANDO: VIDEO A MP3 (.tomp3)
            // ==========================================
               switch (command) { case 'for3':
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quoted || !quoted.videoMessage) {
                    return sock.sendMessage(from, { text: '⚠️ Responde a un *video* con el comando *.tomp3* para convertirlo.' }, { quoted: m });
                }

                await sock.sendMessage(from, { text: '⏳ *Extrayendo audio... por favor espera.*' }, { quoted: m });

                try {
                    // Descargamos el video
                    const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
                    const buffer = await bufferToData(stream);

                    const tempIn = `./temp_vid_${Date.now()}.mp4`;
                    const tempOut = `./temp_aud_${Date.now()}.mp3`;
                    
                    fs.writeFileSync(tempIn, buffer);

                    // Usamos FFmpeg para convertir a mp3 (calidad 192kbps)
                    exec(`ffmpeg -i ${tempIn} -vn -ar 44100 -ac 2 -b:a 192k ${tempOut}`, async (err) => {
                        if (err) {
                            console.log("Error FFmpeg:", err);
                            return sock.sendMessage(from, { text: '❌ Hubo un error al procesar el audio.' }, { quoted: m });
                        }

                        // Enviamos el archivo final
                        await sock.sendMessage(from, { 
                            audio: fs.readFileSync(tempOut), 
                            mimetype: 'audio/mp4', 
                            ptt: false 
                        }, { quoted: m });

                        // Borramos los archivos temporales para no llenar la memoria de tu cel
                        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
                        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                    });

                } catch (e) {
                    console.log(e);
                    sock.sendMessage(from, { text: '❌ Ocurrió un fallo inesperado.' }, { quoted: m });
                }
           break; }




            // ==========================================
            // 🎮 ZONA: JUEGOS Y DIVERSIÓN
            // ==========================================

    switch (command) { case 'gay':
    let mencionado = m.message.extendedTextMessage?.contextInfo?.participant 
        || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] 
        || m.key.participant; // si no hay menciones, toma al autor

    const porcentaje = Math.floor(Math.random() * 501); // ahora hasta 500

    // Barra de porcentaje (20 bloques para más detalle)
    const totalBloques = 20;
    const bloquesLlenos = Math.round((porcentaje / 500) * totalBloques);
    const barra = '█'.repeat(bloquesLlenos) + '░'.repeat(totalBloques - bloquesLlenos);

    // Frases dinámicas según porcentaje
    let frase;
    if (porcentaje < 100) frase = "🌱 Apenas un toque sutil...";
    else if (porcentaje < 200) frase = "🌈 Con estilo y actitud...";
    else if (porcentaje < 300) frase = "🔥 Brillando con orgullo...";
    else if (porcentaje < 400) frase = "💃 Desbordando energía arcoíris...";
    else frase = "💖 ¡Explosión total de arcoíris, nivel legendario!";

    await sock.sendMessage(from, { 
        text: `🏳️‍🌈 *Escáner Gay:*\n\n🧐 @${mencionado.split('@')[0]} es *${porcentaje}%* Gay.\n\n[${barra}] ${porcentaje}%\n\n${frase}`, 
        mentions: [mencionado] 
    });
break; }

            // ==========================================
            // 🔥 COMANDO: PENETRAR (NSFW)
            // ==========================================
              switch (command) { case 'penetrar':
                // 1. Buscamos a quién mencionar (etiqueta o mensaje respondido)
                let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                             m.message?.extendedTextMessage?.contextInfo?.participant;

                // Si no hay nadie, avisamos
                if (!target) return sock.sendMessage(from, { text: '⚠️ Etiqueta a alguien o responde a su mensaje.' }, { quoted: m });

                // 2. Preparamos el nombre
                let userName = `@${target.split('@')[0]}`;

                // 3. Reacción de fuego
                await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

                // 4. El texto (Exacto como lo pediste)
                const responseMessage = `
*TE HAN LLENADO LA CARA DE SEMEN POR PUTA Y ZORRA!*

*Le ha metido el pene a* ${userName} *con todo y condón hasta quedar seco, has dicho "por favor más duroooooo!, ahhhhhhh, ahhhhhh, hazme un hijo que sea igual de pitudo que tú!" mientras te penetraba y luego te ha dejado en silla de ruedas!*

${userName} 
✿ *YA TE HAN PENETRADO!*`;

                // 5. Enviamos el mensaje con la mención funcionando
                await sock.sendMessage(from, { 
                    text: responseMessage, 
                    mentions: [target] 
                }, { quoted: m });
           break; }


            // ==========================================
            // 🔞 COMANDO: TETAS (VERIFICADO Y SIN ERRORES)
            // ==========================================
               switch (command) { case 'tetas': case 'tetitas':
                // 1. Reacción inmediata para confirmar respuesta
                await sock.sendMessage(from, { react: { text: "🔞", key: m.key } });

                try {
                    // 2. Usamos una API más estable para evitar el cuadro gris
                    // Agregamos un número aleatorio para que no se repitan las fotos
                    const randomId = Math.floor(Math.random() * 1000);
                    const response = await axios.get(`https://nekobot.xyz/api/image?type=boobs&seed=${randomId}`);
                    
                    // --- TUS VARIABLES ORIGINALES MANTENIDAS ---
                    let img = response.data.message; 
                    let text = '*😋 TETAS*';

                    // --- ENVÍO DE IMAGEN SEGURO ---
                    await sock.sendMessage(from, { 
                        image: { url: img }, 
                        caption: text 
                    }, { quoted: m });

                } catch (e) {
                    // Si la API principal falla, este respaldo envía una de Reddit
                    console.log("Error en comando tetas:", e.message);
                    const backup = await axios.get('https://meme-api.com/gimme/boobs');
                    await sock.sendMessage(from, { 
                        image: { url: backup.data.url }, 
                        caption: '*😋 TETAS*' 
                    }, { quoted: m });
                }
          break;  }


               switch (command) { case 'ppt':
                const usuarioElige = body.slice(5).trim().toLowerCase();
                const opciones = ["piedra", "papel", "tijera"];
                if (!opciones.includes(usuarioElige)) return sock.sendMessage(from, { text: '⚠️ Elige: piedra, papel o tijera.' }, { quoted: m });
                const botElige = opciones[Math.floor(Math.random() * opciones.length)];
                let resultado = (usuarioElige === botElige) ? "🤝 ¡Empate!" : ((usuarioElige === "piedra" && botElige === "tijera") || (usuarioElige === "papel" && botElige === "piedra") || (usuarioElige === "tijera" && botElige === "papel")) ? "🏆 ¡Tú ganas!" : "😭 ¡Yo gano!";
                await sock.sendMessage(from, { text: `🤖 Yo: *${botElige}*\n👤 Tú: *${usuarioElige}*\n\n${resultado}` }, { quoted: m });
           break; }

            // ==========================================
            // 💰 SISTEMA: ECONOMÍA (BANCO)
            // ==========================================
            
            if (!banco[usuarioKey]) banco[usuarioKey] = 0;


            // ==========================================
            // 🛒 COMANDO: TIENDA (.shop)
            // ==========================================
               switch (command) { case 'tienda': case 'shop':
                await sock.sendMessage(from, { react: { text: "🛍️", key: m.key } });

                let txt = `╭─── 〔 🏪 *MEGA MALL* 〕 ───\n`;
                txt += `│ Para comprar: *.buy [item]*\n`;
                txt += `│ Ej: *.buy ferrari*\n│\n`;

                // Generar lista automáticamente desde el catálogo
                let categorias = {};
                for (let id in shopItems) {
                    let item = shopItems[id];
                    if (!categorias[item.tipo]) categorias[item.tipo] = [];
                    categorias[item.tipo].push(`│ 🏷️ *${id}* ➔ $${item.precio.toLocaleString()} ${item.emoji}`);
                }

                txt += `│ 🚗 *VEHÍCULOS:*\n${categorias['coche'].join('\n')}\n│\n`;
                txt += `│ 🏰 *PROPIEDADES:*\n${categorias['casa'].join('\n')}\n│\n`;
                txt += `│ ⛏️ *MINERÍA (Dinero Diario):*\n${categorias['mineria'].join('\n')}\n│\n`;
                txt += `│ 💎 *LUJOS:*\n${categorias['joya'].join('\n')}\n`;
                txt += `╰──────────────────────`;

                await sock.sendMessage(from, { text: txt }, { quoted: m });
           break; }

            // ==========================================
            // 💳 COMANDO: COMPRAR (.buy)
            // ==========================================
               switch (command) { case 'buy': case 'comprar':
                let itemID = body.split(' ')[1]?.toLowerCase();
                let userKey = sender.split('@')[0];

                if (!itemID || !shopItems[itemID]) {
                    return sock.sendMessage(from, { text: `⚠️ ¿Qué quieres comprar? Mira la list con *.shop*` }, { quoted: m });
                }

                let item = shopItems[itemID];
                let saldo = banco[userKey] || 0;

                // 1. Verificar Dinero
                if (saldo < item.precio) {
                    return sock.sendMessage(from, { text: `💸 Estás pobre. Te faltan $${(item.precio - saldo).toLocaleString()} para el ${item.nombre}.` }, { quoted: m });
                }

                // 2. Verificar si ya lo tiene (Opcional, pero recomendado para coches/casas)
                if (!inventario[userKey]) inventario[userKey] = [];
                if (inventario[userKey].includes(itemID) && item.tipo !== 'joya' && item.tipo !== 'mineria') {
                    return sock.sendMessage(from, { text: `⚠️ Ya tienes un ${item.nombre} en tu garaje.` }, { quoted: m });
                }

                // 3. Transacción
                banco[userKey] -= item.precio;
                inventario[userKey].push(itemID);
                
                guardarJSON(rutaBanco, banco);
                guardarInventario();

                await sock.sendMessage(from, { text: `✅ *COMPRA EXITOSA*\nHas comprado: ${item.nombre} ${item.emoji}\n💰 Nuevo saldo: $${banco[userKey].toLocaleString()}` }, { quoted: m });
           break; }

            // ==========================================
            // 🎒 COMANDO: INVENTARIO (.inv)
            // ==========================================
               switch (command) { case 'inv': case 'inventario':
                let userKey = sender.split('@')[0];
                let items = inventario[userKey] || [];

                if (items.length === 0) return sock.sendMessage(from, { text: "🎒 Tu inventario está vacío. Ve a comprar con .shop" }, { quoted: m });

                // Contar items repetidos
                let conteo = {};
                items.forEach(i => { conteo[i] = (conteo[i] || 0) + 1; });

                let txt = `🎒 *INVENTARIO DE ${pushName}*\n\n`;
                for (let id in conteo) {
                    let item = shopItems[id];
                    txt += `▪️ ${item.emoji} *${item.nombre}* (x${conteo[id]})\n`;
                }

                // Valor total del inventario
                let valorTotal = items.reduce((acc, curr) => acc + shopItems[curr].precio, 0);
                txt += `\n💰 *Valor de Activos:* $${valorTotal.toLocaleString()}`;

                await sock.sendMessage(from, { text: txt }, { quoted: m });
           break; }

            // ==========================================
            // 🎰 COMANDO: TRAGAMONEDAS (.slot)
            // ==========================================
               switch (command) { case 'slot': case 'casino':
                let userKey = sender.split('@')[0];
                let args = body.split(' ');
                let apuestaStr = args[1];

                if (!apuestaStr) return sock.sendMessage(from, { text: `🎰 *CASINO ${ownerData.botName}*\nUso: .slot [cantidad]\nEj: .slot 1000` }, { quoted: m });

                let apuesta = apuestaStr === 'all' ? banco[userKey] : parseInt(apuestaStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));
                
                if (isNaN(apuesta) || apuesta < 100) return sock.sendMessage(from, { text: "⚠️ Apuesta mínima: $100" }, { quoted: m });
                if ((banco[userKey] || 0) < apuesta) return sock.sendMessage(from, { text: "💸 No tienes suficiente dinero." }, { quoted: m });

                // Lógica del juego
                const emojis = ["🍒", "🍋", "🍇", "💎", "🔔", "7️⃣"];
                let a = emojis[Math.floor(Math.random() * emojis.length)];
                let b = emojis[Math.floor(Math.random() * emojis.length)];
                let c = emojis[Math.floor(Math.random() * emojis.length)];

                // Animación (Fake delay)
                await sock.sendMessage(from, { react: { text: "🎰", key: m.key } });

                let resultado = "";
                let ganancia = 0;
                let mensajeFinal = "";

                // Restamos dinero primero (luego devolvemos si gana)
                banco[userKey] -= apuesta;

                if (a === b && b === c) {
                    // JACKPOT (3 iguales) - x4
                    ganancia = apuesta * 4;
                    banco[userKey] += ganancia;
                    resultado = "🌟 ¡JACKPOT! 🌟";
                    mensajeFinal = `🤑 Ganaste: $${ganancia.toLocaleString()}`;
                } else if (a === b || b === c || a === c) {
                    // PAR (2 iguales) - x1.5
                    ganancia = Math.floor(apuesta * 1.5);
                    banco[userKey] += ganancia;
                    resultado = "✨ ¡BUENA JUGADA!";
                    mensajeFinal = `💰 Ganaste: $${ganancia.toLocaleString()}`;
                } else {
                    // PERDEDOR
                    resultado = "📉 PERDISTE";
                    mensajeFinal = `💸 Perdiste: $${apuesta.toLocaleString()}`;
                }

                guardarJSON(rutaBanco, banco);

                let txt = `🎰 *TRAGAMONEDAS* 🎰\n\n`;
                txt += `      │${a}│${b}│${c}│\n\n`;
                txt += `${resultado}\n${mensajeFinal}\n🏦 Saldo: $${banco[userKey].toLocaleString()}`;

                await sock.sendMessage(from, { text: txt }, { quoted: m });
           break; }

            // ==========================================
            // 🔴 COMANDO: RULETA (.ruleta)
            // ==========================================
               switch (command) { case 'ruleta': case 'rulette':
                let args = body.split(' ');
                let color = args[1]?.toLowerCase(); // rojo, negro, verde
                let apuestaStr = args[2];

                if (!color || !apuestaStr || !['rojo', 'negro', 'verde'].includes(color)) {
                    return sock.sendMessage(from, { text: `🔴 *RULETA EUROPEA*\nUso: .ruleta [color] [cantidad]\nColores: rojo, negro, verde\nEj: .ruleta negro 500` }, { quoted: m });
                }

                let userKey = sender.split('@')[0];
                let apuesta = apuestaStr === 'all' ? banco[userKey] : parseInt(apuestaStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));

                if ((banco[userKey] || 0) < apuesta) return sock.sendMessage(from, { text: "💸 Fondos insuficientes." }, { quoted: m });

                banco[userKey] -= apuesta; // Cobramos entrada

                // Tiramos la bola
                let random = Math.floor(Math.random() * 37); // 0-36
                let resultadoColor = (random === 0) ? 'verde' : (random % 2 === 0) ? 'negro' : 'rojo';
                
                let ganancia = 0;
                let win = false;

                // Lógica de pagos
                if (color === resultadoColor) {
                    win = true;
                    if (color === 'verde') ganancia = apuesta * 14; // El verde paga x14
                    else ganancia = apuesta * 2; // Rojo/Negro paga x2
                    banco[userKey] += ganancia;
                }

                guardarJSON(rutaBanco, banco);

                let emojiBola = resultadoColor === 'rojo' ? '🔴' : resultadoColor === 'negro' ? '⚫' : '🟢';
                
                let txt = `🎲 *LA BOLA GIRA...* 🎲\n\n`;
                txt += `Resultado: ${emojiBola} *[ ${random} ${resultadoColor.toUpperCase()} ]*\n`;
                txt += win ? `🎉 *¡GANASTE!* Recibes: $${ganancia.toLocaleString()}` : `📉 *PERDISTE* todo...`;
                txt += `\n🏦 Saldo: $${banco[userKey].toLocaleString()}`;

                await sock.sendMessage(from, { text: txt }, { quoted: m });
           break; }

            // ==========================================
            // 🔫 COMANDO: ROBAR (.rob)
            // ==========================================
                switch (command) { case 'robar': case 'rob':
                let userKey = sender.split('@')[0];
                let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                if (!target) return sock.sendMessage(from, { text: "🔫 Etiqueta a tu víctima." }, { quoted: m });
                let targetKey = target.split('@')[0];

                if (userKey === targetKey) return sock.sendMessage(from, { text: "No te puedes robar a ti mismo." });

                // Cooldown de crimen (15 minutos)
                let time = cooldowns[userKey]?.rob || 0;
                let now = Date.now();
                if (now - time < 15 * 60 * 1000) {
                    return sock.sendMessage(from, { text: `🚓 La policía te está buscando. Escóndete ${msToTime(15 * 60 * 1000 - (now - time))}.` }, { quoted: m });
                }

                let dineroVictima = banco[targetKey] || 0;
                if (dineroVictima < 1000) return sock.sendMessage(from, { text: "🐀 Esa víctima es muy pobre, no vale la pena." });

                // Probabilidad 30% éxito
                let exito = Math.random() < 0.3;

                if (exito) {
                    let robado = Math.floor(dineroVictima * 0.2); // Robas 20%
                    banco[targetKey] -= robado;
                    banco[userKey] = (banco[userKey] || 0) + robado;
                    await sock.sendMessage(from, { text: `🔫 *¡ATRACO EXITOSO!*\nLe robaste $${robado.toLocaleString()} a @${targetKey}. Corre!`, mentions: [target] });
                } else {
                    let multa = 5000;
                    banco[userKey] = Math.max(0, (banco[userKey] || 0) - multa);
                    await sock.sendMessage(from, { text: `🚓 *¡TE ATRAPARON!*\nLa policía te dio una paliza y pagaste $${multa} de fianza.` });
                }

                cooldowns[userKey] = { ...cooldowns[userKey], rob: now };
                guardarJSON(rutaBanco, banco);
                guardarCooldowns();
           break; }

            // ==========================================
            // ⛏️ COMANDO: MINAR (.mine) - Requiere GPU
            // ==========================================
               switch (command) { case 'mine': case 'minar':
                let userKey = sender.split('@')[0];
                let misItems = inventario[userKey] || [];
                
                // Buscar la mejor GPU que tenga el usuario
                let poderMinado = 0;
                misItems.forEach(id => {
                    if (shopItems[id].tipo === 'mineria') poderMinado += shopItems[id].rate;
                });

                if (poderMinado === 0) return sock.sendMessage(from, { text: "⛏️ No tienes equipos de minería. Compra una GPU en la *.shop*" }, { quoted: m });

                // Cooldown 1 hora
                let time = cooldowns[userKey]?.mine || 0;
                let now = Date.now();
                if (now - time < 60 * 60 * 1000) {
                    return sock.sendMessage(from, { text: `🔋 Recargando equipos. Vuelve en ${msToTime(60 * 60 * 1000 - (now - time))}.` }, { quoted: m });
                }

                // Ganancia basada en tus máquinas
                banco[userKey] = (banco[userKey] || 0) + poderMinado;
                
                cooldowns[userKey] = { ...cooldowns[userKey], mine: now };
                guardarJSON(rutaBanco, banco);
                guardarCooldowns();

                await sock.sendMessage(from, { text: `🔌 *MINERÍA CRYPTO*\nTus máquinas generaron: 💰 $${poderMinado.toLocaleString()}` }, { quoted: m });
           break;



// ==========================================
// 👤 COMANDO: PERFIL PRO (SOLUCIÓN DEFINITIVA)
// ==========================================
 case 'perfil':
    await sock.sendMessage(from, { react: { text: "💳", key: m.key } });

     saldo = banco[userKey] || 0;
    
    // 1. DEFINICIÓN DE RANGOS (NIVELES)
    const roles = [
        { limit: 0, role: "Vagabundo 🏚️" },
        { limit: 500, role: "Mendigo 🪣" },
        { limit: 1000, role: "Aprendiz 🔨" },
        { limit: 5000, role: "Empleado 💼" },
        { limit: 10000, role: "Supervisor 🧐" },
        { limit: 25000, role: "Gerente 👔" },
        { limit: 50000, role: "Director 🥂" },
        { limit: 100000, role: "Empresario 📈" },
        { limit: 500000, role: "Lobo de WallSt 🐺" },
        { limit: 1000000, role: "Millonario 💰" },
        { limit: 10000000, role: "Magnate 💎" },
        { limit: 100000000, role: "Billonario 🏦" },
        { limit: 1000000000, role: "Elon Musk 🚀" },
        { limit: 10000000000, role: "Dios Griego ⚡" }
    ];

    // 2. CÁLCULO DE RANGO ACTUAL
    let role = roles[0].role;
    let nextRole = roles[1];
    let tituloPersonalizado = typeof titulos !== 'undefined' ? titulos[userKey] : null;

    for (let i = 0; i < roles.length; i++) {
        if (saldo >= roles[i].limit) {
            role = roles[i].role;
            if (i + 1 < roles.length) {
                nextRole = roles[i + 1];
            } else {
                nextRole = null; 
            }
        }
    }

    // 3. BARRA DE PROGRESO
    let barra = "";
    let falta = 0;
    if (nextRole) {
        let porcentaje = Math.floor((saldo / nextRole.limit) * 100);
        if (porcentaje > 100) porcentaje = 100;
        let bloquesLlenos = Math.floor(porcentaje / 10);
        let bloquesVacios = 10 - bloquesLlenos;
        barra = "█".repeat(bloquesLlenos) + "░".repeat(bloquesVacios) + ` ${porcentaje}%`;
        falta = nextRole.limit - saldo;
    } else {
        barra = "██████████ Nivel Máximo";
    }

    // 4. FOTO DE PERFIL BLINDADA (ESTO ARREGLA TU ERROR)
    let ppUrl;
    try {
        // Intenta sacar tu foto real
        ppUrl = await sock.profilePictureUrl(sender, 'image');
    } catch (e) {
        // Si falla, genera una imagen única con TUS iniciales y color aleatorio
        // Esto NUNCA da error 404 porque la crea al momento
        ppUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(pushName)}&background=random&size=500&color=fff`;
    }

    // 5. DISEÑO DEL MENSAJE
    let txt = `╭─── 〔 💳 *TARJETA VIP* 〕 ───\n`;
    txt += `│ 👤 *Usuario:* ${pushName}\n`;
    txt += `│ 🆔 *Tag:* @${userKey}\n`;
    txt += `│\n`;
    txt += `│ 💰 *Patrimonio:* $${saldo.toLocaleString()}\n`;
    txt += `│ 🏆 *Rango:* ${tituloPersonalizado || role}\n`;
    txt += `│\n`;
    txt += `│ 📊 *Progreso:* \n│ ${barra}\n`;
    
    if (nextRole) {
        txt += `│ 🎯 *Siguiente:* ${nextRole.role}\n`;
        txt += `│ 💸 *Falta:* $${falta.toLocaleString()}\n`;
    } else {
        txt += `│ 👑 *¡Cima del éxito!*\n`;
    }
    
    txt += `│\n`;
    txt += `│ 🤖 *Bot:* ${ownerData.botName}\n`;
    txt += `╰──────────────────────`;

    await sock.sendMessage(from, { 
        image: { url: ppUrl }, 
        caption: txt, 
        mentions: [sender] 
    }, { quoted: m });
break; }


// ==========================================
// ☢️ COMANDO: REINICIAR ECONOMÍA (RESET TOTAL)
// ==========================================
   switch (command) { case 'reseteco': case 'reseteconomia':
    if (!esOwner) return sock.sendMessage(from, { text: '⛔ ¡ALTO! Solo el Creador puede reiniciar la economía.' }, { quoted: m });

    // 1. Vaciamos las variables en memoria
    banco = {};
    cooldowns = {}; 
    // titulos = {}; // Descomenta si también quieres borrar los rangos

    // 2. Guardamos los archivos vacíos para que sea permanente
    fs.writeFileSync('./banco.json', JSON.stringify({}));
    fs.writeFileSync('./cooldowns.json', JSON.stringify({}));
    // fs.writeFileSync('./titulos.json', JSON.stringify({}));

    await sock.sendMessage(from, { 
        text: `☢️ *¡ECONOMÍA REINICIADA!* ☢️\n\nTodos los usuarios, dinero y tiempos han sido eliminados de la base de datos.\n\n🤖 *Sistema:* ${ownerData.botName}` 
    }, { quoted: m });
break; }



            // ==========================================
            // 🏆 COMANDO: BALTOP (RANKING MUNDIAL)
            // ==========================================
               switch (command) { case 'baltop':
                // Ordenamos la base de datos de mayor a menor
                let sorted = Object.entries(banco).sort((a, b) => b[1] - a[1]);
                let top = sorted.slice(0, 10); // Tomamos solo los 10 mejores

                let txt = `🏆 *TOP 10 MULTIMILLONARIOS* 🏆\n\n`;
                
                // Generamos la lista
                top.forEach((user, index) => {
                    let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    txt += `${medal} @${user[0]}\n   └── 💰 $${user[1].toLocaleString()}\n`;
                });

                txt += `\n> 🤖 *${ownerData.botName} Economy System*`;
                
                // Mencionamos a los usuarios para que el link funcione
                let mentions = top.map(u => u[0] + '@s.whatsapp.net');
                await sock.sendMessage(from, { text: txt, mentions: mentions }, { quoted: m });
           break; }

            // ==========================================
            // 📅 COMANDO: DAILY (RECOMPENSA DIARIA)
            // ==========================================
               switch (command) { case 'diario':
                let userKey = sender.split('@')[0];
                let time = cooldowns[userKey]?.daily || 0;
                let now = Date.now();
                let cooldown = 24 * 60 * 60 * 1000; // 24 Horas

                if (now - time < cooldown) {
                    let restante = msToTime(cooldown - (now - time));
                    return sock.sendMessage(from, { text: `⏱️ Vuelve en *${restante}* para reclamar tu diario.` }, { quoted: m });
                }

                // Premio aleatorio entre 500 y 2000
                let premio = Math.floor(Math.random() * 15000) + 5000;
                
                banco[userKey] = (banco[userKey] || 0) + premio;
                guardarJSON(rutaBanco, banco);
                
                // Actualizamos cooldown
                cooldowns[userKey] = { ...cooldowns[userKey], daily: now };
                guardarCooldowns();

                await sock.sendMessage(from, { text: `🎁 *RECOMPENSA DIARIA*\nHas recibido: 💰 $${premio}` }, { quoted: m });
           break; }

            // ==========================================
            // ⛏️ COMANDO: WORK (TRABAJAR)
            // ==========================================
                switch (command) { case 'work': case 'trabajar':
                let userKey = sender.split('@')[0];
                let time = cooldowns[userKey]?.work || 0;
                let now = Date.now();
                let cooldown = 30 * 60 * 1000; // 30 Minutos

                if (now - time < cooldown) {
                    let restante = msToTime(cooldown - (now - time));
                    return sock.sendMessage(from, { text: `😓 Estás cansado. Descansa *${restante}*.` }, { quoted: m });
                }

                // Trabajos aleatorios
                let trabajos = [
                    "Ayudaste a una anciana a cruzar y te dio", 
                    "Trabajaste en McDonald's y ganaste", 
                    "Vendiste limonada y ganaste", 
                    "Hackeaste un cajero (con suerte) y sacaste",
                    "Reparaste el bot y cobraste"
                ];
                let trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
                let sueldo = Math.floor(Math.random() * 8000) + 3000;

                banco[userKey] = (banco[userKey] || 0) + sueldo;
                guardarJSON(rutaBanco, banco);
                
                cooldowns[userKey] = { ...cooldowns[userKey], work: now };
                guardarCooldowns();

                await sock.sendMessage(from, { text: `🔨 ${trabajo}: 💰 $${sueldo}` }, { quoted: m });
           break; }

            // ==========================================
            // 💸 COMANDO: TRANSFER (TRANSFERENCIAS)
            // ==========================================
               switch (command) { case 'pay': case 'transferir':
                let args = body.split(' ');
                let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                let amountStr = args.find(a => !a.includes('@') && a !== '.transfer' && a !== '.pay');
                
                if (!target || !amountStr) {
                    return sock.sendMessage(from, { text: `⚠️ Uso: .transfer [cantidad] [@usuario]\nEj: .transfer 100 @Juan` }, { quoted: m });
                }

                // Traductor k/m
                let amount = parseInt(amountStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));
                let senderKey = sender.split('@')[0];
                let targetKey = target.split('@')[0];

                if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: "⚠️ Cantidad inválida." }, { quoted: m });
                if ((banco[senderKey] || 0) < amount) return sock.sendMessage(from, { text: "💸 No tienes suficiente dinero." }, { quoted: m });
                if (senderKey === targetKey) return sock.sendMessage(from, { text: "⚠️ No puedes transferirte a ti mismo." }, { quoted: m });

                // Transacción
                banco[senderKey] -= amount;
                banco[targetKey] = (banco[targetKey] || 0) + amount;
                guardarJSON(rutaBanco, banco);

                await sock.sendMessage(from, { 
                    text: `✅ *TRANSFERENCIA EXITOSA*\n📤 De: @${senderKey}\n📥 Para: @${targetKey}\n💰 Monto: $${amount.toLocaleString()}`, 
                    mentions: [sender, target] 
                }, { quoted: m });
           break; }


// ==========================================
// 💰 COMANDO: ADDCOIN (SISTEMA INTELIGENTE)
// ==========================================
   switch (command) { case 'addcoin': case 'dar':
    if (!esOwner) return sock.sendMessage(from, { text: '⛔ Solo para mi Creador.' }, { quoted: m });

    // 1. Detectar Cantidad (Busca k/m en el texto)
    let args = body.split(' ');
    let amountStr = args.find(a => a.match(/^\d+(k|m)?$/i)); 
    
    if (!amountStr) {
        return sock.sendMessage(from, { text: `⚠️ Escribe la cantidad.\nEj: .addcoin 10m (Para ti)\nEj: .addcoin 5k @usuario` }, { quoted: m });
    }

    // 2. Convertir cantidad (k=000, m=000000)
    let amount = parseInt(amountStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));

    // 3. Detectar Objetivo (Mención > Respuesta > TÚ MISMO)
    let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                 m.message.extendedTextMessage?.contextInfo?.participant || 
                 sender; // <--- ESTO ES LO QUE TE FALTABA

    // 4. Obtener la ID numérica correcta
    let userKey = target.split('@')[0];

    // 5. Ejecutar transacción
    banco[userKey] = (banco[userKey] || 0) + amount;
    fs.writeFileSync('./banco.json', JSON.stringify(banco, null, 2));

    await sock.sendMessage(from, { 
        text: `✅ *TRANSACCIÓN EXITOSA*\n💰 *Añadido:* $${amount.toLocaleString()}\n👤 *Usuario:* @${userKey}\n💳 *Nuevo Saldo:* $${banco[userKey].toLocaleString()}`, 
        mentions: [target] 
    }, { quoted: m });
break; }






// ==========================================
// 📲 COMANDO: APK DOWNLOADER (API DIRECTA)
// ==========================================
   switch (command) { case 'apk': case 'mod apk':
    const text = body.split(' ').slice(1).join(' ').trim();
    
    if (!text) {
        return sock.sendMessage(from, { text: `🍃 Ingresa el nombre. Ej: .apk WhatsApp` }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: '🕒', key: m.key } });

    try {
        const { data } = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${text}&limit=1`);

        if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
            return sock.sendMessage(from, { text: `❌ No encontré resultados para "${text}".` }, { quoted: m });
        }

        const app = data.datalist.list[0];

        let txt = `*乂  ${ownerData.botName} - DESCARGAS  乂*\n\n`; 
        txt += `≡ ▶️ *Nombre* : ${app.name}\n`;
        txt += `≡ 📢 *Package* : ${app.package}\n`;
        txt += `≡ 📌 *Versión* : ${app.vername}\n`;
        txt += `≡ 🚀 *Peso* :  ${(app.size / 1048576).toFixed(2)} MB\n`;
        txt += `≡ 👤 *Desarrollador* : ${app.developer.name}`;

        await sock.sendMessage(from, { image: { url: app.icon }, caption: txt }, { quoted: m });

        if (app.size > 900 * 1048576) { 
            return sock.sendMessage(from, { text: `ꕥ El archivo es muy pesado (+900MB).` }, { quoted: m });
        }

        await sock.sendMessage(from, { 
            document: { url: app.file.path }, 
            mimetype: 'application/vnd.android.package-archive', 
            fileName: `${app.name}.apk`,
            caption: null 
        }, { quoted: m });

        await sock.sendMessage(from, { react: { text: '✔️', key: m.key } });

    } catch (error) {
        console.log(error);
        await sock.sendMessage(from, { text: `❌ Error en la API de Aptoide.` }, { quoted: m });
    }
break; }



            // ==========================================
            // 📌 COMANDO: PINTEREST (10 IMÁGENES - SIN ERROR)
            // ==========================================
             switch (command) { case 'pin': case 'pinterest':
                const text = body.slice(body.indexOf(' ') + 1).trim();
                if (body.split(' ').length < 2) return sock.sendMessage(from, { text: '❀ Dime qué buscar. Ej: .pin polnito' }, { quoted: m });

                await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

                try {
                    // 1. TU FUNCIÓN EXACTA (NO TOCADA)
                    async function pinterestApi(query) {
                        const link = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22applied_unified_filters%22%3Anull%2C%22appliedProductFilters%22%3A%22---%22%2C%22article%22%3Anull%2C%22auto_correction_disabled%22%3Afalse%2C%22corpus%22%3Anull%2C%22customized_rerank_type%22%3Anull%2C%22domains%22%3Anull%2C%22dynamicPageSizeExpGroup%22%3A%22control%22%2C%22filters%22%3Anull%2C%22journey_depth%22%3Anull%2C%22page_size%22%3Anull%2C%22price_max%22%3Anull%2C%22price_min%22%3Anull%2C%22query_pin_sigs%22%3Anull%2C%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22redux_normalize_feed%22%3Atrue%2C%22request_params%22%3Anull%2C%22rs%22%3A%22typed%22%2C%22scope%22%3A%22pins%22%2C%22selected_one_bar_modules%22%3Anull%2C%22seoDrawerEnabled%22%3Afalse%2C%22source_id%22%3Anull%2C%22source_module_id%22%3Anull%2C%22source_url%22%3A%22%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}%22%2C%22top_pin_id%22%3Anull%2C%22top_pin_ids%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D`;
                        
                        const headers = {
                            'accept': 'application/json, text/javascript, */*; q=0.01',
                            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                            'referer': 'https://id.pinterest.com/',
                            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")',
                            'sec-fetch-mode': 'cors',
                            'sec-fetch-site': 'same-origin',
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                            'x-app-version': 'c056fb7',
                            'x-pinterest-appstate': 'active',
                            'x-pinterest-pws-handler': 'www/index.js',
                            'x-requested-with': 'XMLHttpRequest'
                        };

                        try {
                            const res = await axios.get(link, { headers });
                            if (res.data?.resource_response?.data?.results) {
                                return res.data.resource_response.data.results
                                    .filter(item => item.images?.orig?.url)
                                    .map(item => item.images.orig.url);
                            }
                            return [];
                        } catch (error) { 
                            console.log("Error API Pinterest:", error.message);
                            return []; 
                        }
                    }

                    // 2. EJECUCIÓN (SOLO CAMBIOS NECESARIOS)
                    if (text.includes("https://")) {
                        await sock.sendMessage(from, { text: "⚠️ Este comando es solo para búsqueda. Usa el botón de descarga de WhatsApp." }, { quoted: m });
                    } else {
                        const images = await pinterestApi(text);
                        
                        if (!images || images.length === 0) {
                            return sock.sendMessage(from, { text: `❌ No encontré nada. Pinterest se puso difícil.` }, { quoted: m });
                        }

                        // CAMBIO: 5 -> 10 IMÁGENES
                        const limit = Math.min(8, images.length);
                        await sock.sendMessage(from, { text: `📌 *Resultados para:* "${text}"\nEnviando ${limit} imágenes...` }, { quoted: m });

                        for (let i = 0; i < limit; i++) {
                            // Pequeña protección para que si falla UNA foto, no se pare todo
                            try {
                                await sock.sendMessage(from, { image: { url: images[i] } });
                                await new Promise(r => setTimeout(r, 1000));
                            } catch (e) {
                                console.log("Saltando imagen con error...");
                            }
                        }
                        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
                    }

                } catch (e) {
                    console.log(e);
                    // CAMBIO: ELIMINADO EL MENSAJE DE ERROR AL CHAT
                }
           break; }



            // ==========================================
            // 🧪 COMANDO: PROBAR WELCOME (OWNER)
            // ==========================================
            if (body === '.probarwel') {
                const esOwner = sender.includes("191809682694179") || sender.includes("526633147534");
                if (!esOwner) return sock.sendMessage(from, { text: '⛔ Solo mi creador puede usar este comando de prueba.' }, { quoted: m });

                await sock.sendMessage(from, { text: "🧪 *Iniciando prueba de sistemas de Bienvenida y Despedida...*" }, { quoted: m });

                // --- Prueba Despedida (Welcome 1) ---
                if (welcomeDB.files.length > 0) {
                    const fIdx = Math.floor(Math.random() * welcomeDB.files.length);
                    const media = welcomeDB.files[fIdx];
                    let txt = `👋 *PRUEBA DESPEDIDA*\n🚪 Saliste de: Grupo de Prueba\n👥 Quedan: 0 miembros`;
                    await sock.sendMessage(from, { [media.type]: fs.readFileSync(media.path), caption: txt, mentions: [sender] });
                    
                    if (welcomeDB.audios.length > 0) {
                        const aIdx = Math.floor(Math.random() * welcomeDB.audios.length);
                        await sock.sendMessage(from, { audio: fs.readFileSync(welcomeDB.audios[aIdx]), mimetype: 'audio/mp4', ptt: true });
                    }
                } else {
                    await sock.sendMessage(from, { text: "⚠️ No hay archivos configurados para Despedida (.setwel)" });
                }

                // --- Prueba Bienvenida (Welcome 2) ---
                if (welcome2DB.files.length > 0) {
                    const fIdx2 = Math.floor(Math.random() * welcome2DB.files.length);
                    const media2 = welcome2DB.files[fIdx2];
                    let txt2 = `🌟 *PRUEBA BIENVENIDA*\n🏰 Entraste a: Grupo de Prueba\n👥 Somos ya: 1 miembros`;
                    await sock.sendMessage(from, { [media2.type]: fs.readFileSync(media2.path), caption: txt2, mentions: [sender] });
                    
                    if (welcome2DB.audios.length > 0) {
                        const aIdx2 = Math.floor(Math.random() * welcome2DB.audios.length);
                        await sock.sendMessage(from, { audio: fs.readFileSync(welcome2DB.audios[aIdx2]), mimetype: 'audio/mp4', ptt: true });
                    }
                } else {
                    await sock.sendMessage(from, { text: "⚠️ No hay archivos configurados para Bienvenida (.setwel2)" });
                }
            }


 } catch (e) { console.log("Error recuperado:", e); }
    });

// --- FUNCIONES NECESARIAS (NO BORRAR) ---
const fetch = require('node-fetch');
const cheerio = require('cheerio');

function parseInfo(infoStr = '') {
    const lines = infoStr.split('\n').map(v => v.trim()).filter(Boolean);
    let dur = '', qual = '', views = '';
    if (lines.length > 0) {
        // Lógica simple para extraer info
        const parts = lines.join(' ').split('-');
        qual = parts[0]?.trim();
        views = parts[1]?.trim();
    }
    return { dur, qual, views };
}

async function xnxxdl(URL) {
    return new Promise((resolve, reject) => {
        fetch(URL).then(res => res.text()).then(res => {
            const $ = cheerio.load(res, { xmlMode: false });
            const title = $('meta[property="og:title"]').attr('content');
            const duration = $('meta[property="og:duration"]').attr('content') + 's'; 
            const info = $('span.metadata').text();
            const videoScript = $('#video-player-bg > script:nth-child(6)').html();
            const files = {
                low: (videoScript.match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],
                high: (videoScript.match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);') || [])[1]
            };
            resolve({ result: { title, duration, info: parseInfo(info), files } });
        }).catch(err => reject(err));
    });
}

async function search(query) {
    return new Promise((resolve, reject) => {
        const baseurl = 'https://www.xnxx.com';
        fetch(`${baseurl}/search/${query}`).then(res => res.text()).then(res => {
            const $ = cheerio.load(res, { xmlMode: false });
            const results = [];
            $('div.mozaique').find('div.thumb-under').each(function() {
                const title = $(this).find('a').attr('title');
                const link = baseurl + $(this).find('a').attr('href');
                if (title && link) results.push({ title, link });
            });
            resolve({ result: results });
        }).catch(err => reject(err));
    });
}

    // ==========================================
    // 🚪 DETECTOR DE EVENTOS PREMIUM (TODO EN UNO)
    // ==========================================
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu;
            const isRemove = action === 'remove';
            const db = isRemove ? welcomeDB : welcome2DB;
            
            // Verificamos si está activado en este grupo
            if (db.status[id]) {
                const metadata = await sock.groupMetadata(id);
                const descripcion = metadata.desc ? metadata.desc.toString().slice(0, 100) + "..." : "Sin descripción";
                const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const hora = new Date().toLocaleTimeString('es-ES');
                
                for (let item of participants) {
                    // 🛡️ ARREGLO ANTI-CRASH: Extrae el ID correctamente
                    const num = typeof item === 'object' ? item.id : item;

                    let fIdx = db.files.length > 0 ? Math.floor(Math.random() * db.files.length) : -1;
                    let aIdx = db.audios.length > 0 ? Math.floor(Math.random() * db.audios.length) : -1;
                    
                    // --- 🎨 DISEÑO 20X MEJORADO ---
                    let txt = "";
                    if (isRemove) {
                        // 💀 MENSAJE DE DESPEDIDA
                        txt = `╭─「 🕊️ *UN ADIÓS* 🕊️ 」\n` +
                              `│\n` +
                              `│ 👤 *Usuario:* @${num.split('@')[0]}\n` +
                              `│ 🚪 *Se fue de:* ${metadata.subject}\n` +
                              `│ 📅 *Fecha:* ${fecha}\n` +
                              `│ ⏰ *Hora:* ${hora}\n` +
                              `│\n` +
                              `│ 🥀 _Un soldado ha caído..._\n` +
                              `│ 👥 *Ahora somos:* ${metadata.participants.length} sobrevivientes.\n` +
                              `│\n` +
                              `╰───────────────────`;
                    } else {
                        // 🌟 MENSAJE DE BIENVENIDA
                        txt = `╭─「 ✨ *NUEVO MIEMBRO* ✨ 」\n` +
                              `│\n` +
                              `│ 👋 *Hola:* @${num.split('@')[0]}\n` +
                              `│ 🏰 *Bienvenido a:* ${metadata.subject}\n` +
                              `│\n` +
                              `│ 📅 *Fecha:* ${fecha}\n` +
                              `│ ⏰ *Hora:* ${hora}\n` +
                              `│ 👥 *Miembro N°:* ${metadata.participants.length}\n` +
                              `│\n` +
                              `│ 📝 *Descripción del Grupo:*\n` +
                              `│ _${descripcion}_\n` +
                              `│\n` +
                              `│ 🛡️ _Lee las reglas para evitar el ban._\n` +
                              `│\n` +
                              `╰───────────────────`;
                    }

                    // Enviar Foto/Video si existe
                    if (fIdx !== -1) {
                        const media = db.files[fIdx];
                        await sock.sendMessage(id, { [media.type]: fs.readFileSync(media.path), caption: txt, mentions: [num] });
                    } else {
                        await sock.sendMessage(id, { text: txt, mentions: [num] });
                    }

                    // Enviar Audio si existe
                    if (aIdx !== -1) {
                        await sock.sendMessage(id, { audio: fs.readFileSync(db.audios[aIdx]), mimetype: 'audio/mp4', ptt: true });
                    }
                }
            }
        } catch (e) {
            console.log("Error en bienvenida/despedida:", e);
        }
    }); 



} // <- Esta llave cierra la función "async function iniciarBot()"

iniciarBot(); // <- Esta línea arranca todo el proceso






// ==========================================
// 🛠️ FUNCIÓN AUXILIAR (LIMPIEZA DE CÓDIGO)
// ==========================================
async function bufferToData(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}



// ==========================================
// 🛠️ FUNCIÓN DE RASTREO (SCRAPER) DE GOOGLE
// ==========================================
async function googleImage(query) {
    try {
        const { data } = await axios.get(`https://www.google.com/search?q=${query}&tbm=isch`, { 
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36" 
            } 
        });
        const $ = cheerio.load(data);
        const results = [];
        // Google esconde las urls en scripts, las buscamos a la fuerza
        $('script').each((i, e) => {
            const txt = $(e).html();
            if (txt && txt.includes('http') && txt.includes('[')) {
                // Expresión regular para sacar links de imágenes
                const urls = txt.match(/\"https?:\/\/[^\"]+?\.(jpg|png|jpeg|webp)\"/g);
                if (urls) {
                    urls.forEach(url => {
                        results.push(url.replace(/\"/g, ''));
                    });
                }
            }
        });
        // Filtramos resultados basura
        return results.filter(url => !url.includes('gstatic') && !url.includes('google'));
    } catch (e) { return []; }
}




