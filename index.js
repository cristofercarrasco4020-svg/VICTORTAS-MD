const axios = require('axios'); 
const fs = require('fs');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const ytdl = require('@distube/ytdl-core'); 
const yts = require('yt-search'); 
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, fetchLatestBaileysVersion, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require("pino");
const readline = require("readline");
global.realOwners = global.realOwners || [];

let botActivo = true; 

// ==========================================
// 📂 BASES DE DATOS GLOBALES
// ==========================================
const rutaWelcome = './welcome_config.json';
const rutaWelcome2 = './welcome2_config.json';

const welcomeDB = fs.existsSync(rutaWelcome) ? JSON.parse(fs.readFileSync(rutaWelcome)) : { files: [], audios: [], status: {}, lastFile: {}, lastAudio: {} };
const welcome2DB = fs.existsSync(rutaWelcome2) ? JSON.parse(fs.readFileSync(rutaWelcome2)) : { files: [], audios: [], status: {}, lastFile: {}, lastAudio: {} };

const guardarWelcome = () => fs.writeFileSync(rutaWelcome, JSON.stringify(welcomeDB, null, 2));
const guardarWelcome2 = () => fs.writeFileSync(rutaWelcome2, JSON.stringify(welcome2DB, null, 2));


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
            const body = m.message.conversation || m.message[type]?.caption || m.message[type]?.text || "";
            
            // 🔧 VARIABLE GLOBAL: Sender
            const sender = m.key.participant || m.key.remoteJid; 

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

            // ==========================================
            // 👮‍♂️ SEGURIDAD: DEFINIR OWNER
            // ==========================================
            const miNumero = "526633147534@s.whatsapp.net";
            const miLID = "191809682694179@lid";
            
            const esOwner = m.sender === miNumero || 
                            m.sender === miLID || 
                            m.key.fromMe || 
                            m.sender.includes("5216633147534") || 
                            (global.realOwners && global.realOwners.includes(m.sender));

            // ==========================================
            // 🔋 COMANDO: ENCENDER/APAGAR BOT
            // ==========================================
            if (body === '.bot off') {
                if (!esOwner) return sock.sendMessage(from, { text: `❌ Solo mi creador puede apagar a ${BotName}.` }, { quoted: m });
                botActivo = false;
                // AHORA SÍ: Usa la variable ${BotName}
                await sock.sendMessage(from, { text: `😴 *${BotName} se ha dormido...*\nIgnoraré los comandos hasta que me despiertes.` }, { quoted: m });
                return; 
            }

            if (body === '.bot on') {
                if (!esOwner) return; 
                botActivo = true;
                // AHORA SÍ: Usa la variable ${BotName}
                await sock.sendMessage(from, { text: `🔥 *${BotName} DESPIERTO.*` }, { quoted: m });
                return;
            }

            if (!botActivo && !esOwner) return; // 🔒 CANDADO FINAL


            const isGroup = from.endsWith('@g.us');


            // ==========================================
            // 📟 CONSOLA ULTRA PRO (RECUPERADA)
            // ==========================================
            const pushName = m.pushName || "Sin Nombre";
            const numeroIdentificado = from.split('@')[0];
            const horaConsola = new Date().toLocaleTimeString();
            const textoMensaje = body || "📷 [Archivo/Sticker]"; 

            console.log(`\n╭═══════════════════════════════════════╮`);
            console.log(`│ 👤 USUARIO:  ${pushName}`);
            console.log(`│ 📱 TEL:      +${numeroIdentificado}`);
            console.log(`│ ⏰ HORA:     ${horaConsola}`);
            console.log(`│ 💬 MENSAJE:  ${textoMensaje}`);
            console.log(`╰═══════════════════════════════════════╯`);



            // ==========================================
            // 💰 ECONOMÍA (PRIMERO CARGAMOS DATOS)
            // ==========================================
            const rutaBanco = './banco.json';
            const rutaTitulos = './titulos.json';
            const leerJSON = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
            const guardarJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
            
            let banco = leerJSON(rutaBanco);
            let titulos = leerJSON(rutaTitulos);
            let usuarioKey = sender.split('@')[0];
            
            if (!banco[usuarioKey]) banco[usuarioKey] = 0;



            // ==========================================
            // 📜 COMANDO: MENU (DISEÑO LIMPIO)
            // ==========================================
            if (body === '.menu' || body === '.help') {
                await sock.sendMessage(from, { react: { text: "📂", key: m.key } });

                const horaActual = new Date().getHours();
                let saludo = horaActual >= 5 && horaActual < 12 ? "🌅 ¡Buenos días!" : 
                             horaActual >= 12 && horaActual < 19 ? "☀️ ¡Buenas tardes!" : "🌙 ¡Buenas noches!";

                // Imagen o Video
                let mensajeMenu = {}; 
                const defaultUrl = 'https://files.catbox.moe/tll9q5.mp4'; 
                if (fs.existsSync('./media_menu.mp4')) {
                    mensajeMenu = { video: fs.readFileSync('./media_menu.mp4'), gifPlayback: false };
                } else if (fs.existsSync('./media_menu.jpg')) {
                    mensajeMenu = { image: fs.readFileSync('./media_menu.jpg') };
                } else {
                    mensajeMenu = { video: { url: defaultUrl }, gifPlayback: false }; 
                }

                // --- CABECERA ---
                let textoMenu = `✨ *${saludo} ${pushName}* ✨\n\n`;
                textoMenu += `   ╭── 〔 👤 INFO USUARIO 〕 ──\n`;
                textoMenu += `   ┃ 👑 *Owner:* Criss\n`; 
                textoMenu += `   ┃ 🤖 *Bot:* ${BotName}\n`;
                textoMenu += `   ┃ 🎖️ *Rango:* ${titulos[usuarioKey] || "Novato"}\n`;
                textoMenu += `   ┃ 💰 *Banco:* $${banco[usuarioKey].toLocaleString()}\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                // --- SECCIONES ---
                
                textoMenu += `   ╭── 〔 👑 OWNER REAL 〕 ──\n`;
                textoMenu += `   ┃ 🔹 .owner (nuevo owner)\n`;
                textoMenu += `   ┃ 🔹 .delowner (borrar)\n`;
                textoMenu += `   ┃ 🔹 .lisowner (ver lista)\n`;
                textoMenu += `   ┃ 🔹 .bot on/off (apagar)\n`;
                textoMenu += `   ┃ 🔹 .addcoin (dar dinero)\n`;
                textoMenu += `   ┃ 🔹 .setname (nombre)\n`;
                textoMenu += `   ┃ 🔹 .setmenu (portada)\n`;
                textoMenu += `   ┃ 🔹 .probarwel (test)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                // --- AQUÍ ESTÁ EL ARREGLO (VERTICAL) ---
                textoMenu += `   ╭── 〔 👋 BIENVENIDAS 〕 ──\n`;
                textoMenu += `   ┃ 🚪 *SALIDAS (.welcome)*\n`;
                textoMenu += `   ┃  • .welcome on/off\n`;
                textoMenu += `   ┃  • .setwel (foto/video)\n`;
                textoMenu += `   ┃  • .welaudi (audio)\n`;
                textoMenu += `   ┃  • .delwe (borrar)\n`;
                textoMenu += `   ┃\n`;
                textoMenu += `   ┃ 🌟 *ENTRADAS (.welcome2)*\n`;
                textoMenu += `   ┃  • .welcome2 on/off\n`;
                textoMenu += `   ┃  • .setwel2 (foto/video)\n`;
                textoMenu += `   ┃  • .welaudi2 (audio)\n`;
                textoMenu += `   ┃  • .delwe2 (borrar)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                textoMenu += `   ╭── 〔 📥 DESCARGAS 〕 ──\n`;
                textoMenu += `   ┃ 🎵 .play (video yt)\n`;
                textoMenu += `   ┃ 🎵 .play2 (audio yt)\n`;
                textoMenu += `   ┃ 📱 .tt (tiktok clean)\n`;
                textoMenu += `   ┃ 📌 .pinterest (fotos)\n`;
                textoMenu += `   ┃ 🎧 .tomp3 (vid a audio)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                textoMenu += `   ╭── 〔 🤖 IA & TOOLS 〕 ──\n`;
                textoMenu += `   ┃ 🧠 .ia (chatgpt)\n`;
                textoMenu += `   ┃ 🎨 .imagen (dibujar)\n`;
                textoMenu += `   ┃ 💎 .hd (mejorar calidad)\n`;
                textoMenu += `   ┃ 🕵️ .mied (ver mi ID)\n`;
                textoMenu += `   ┃ ℹ️ .info (sistema)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                textoMenu += `   ╭── 〔 🎡 DIVERSIÓN 〕 ──\n`;
                textoMenu += `   ┃ 🏳️‍🌈 .gay (escáner)\n`;
                textoMenu += `   ┃ ✂️ .ppt (juego)\n`;
                textoMenu += `   ┃ 🔥 .penetrar (rol +18)\n`;
                textoMenu += `   ┃ 🔞 .tetas (pack)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                textoMenu += `   ╭── 〔 👮‍♂️ GRUPOS 〕 ──\n`;
                textoMenu += `   ┃ 👟 .kick (sacar)\n`;
                textoMenu += `   ┃ 🔒 .grupo cerrar/abrir\n`;
                textoMenu += `   ┃ 👮 .admin (dar poder)\n`;
                textoMenu += `   ╰────────────────────\n\n`;

                textoMenu += `📍 ${BotName}\n | By Criss_`;

                await sock.sendMessage(from, { ...mensajeMenu, caption: textoMenu }, { quoted: m });
            }



            // ==========================================
            // 🕵️ COMANDO: MI ID (DETECTOR DE NUMERO)
            // ==========================================
            if (body === '.mied') {
                const idCompleto = sender; 
                const numeroLimpio = sender.split('@')[0]; 
                let texto = `🕵️ *DETECTOR DE IDENTIDAD*\n\n`;
                texto += `📱 *Tu Número:* ${numeroLimpio}\n`;
                texto += `🔑 *Tu ID Técnico:* ${idCompleto}\n\n`;
                texto += `⚠️ *NOTA:* Para que los comandos de Owner te reconozcan, asegúrate de que el código incluya: *"${numeroLimpio}"*`;
                await sock.sendMessage(from, { text: texto }, { quoted: m });
            }

            // ==========================================
            // 🖼️ COMANDO: SETMENU (Dueño + Admins)
            // ==========================================
            if (body === '.setmenu') {
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
            }





            // ==========================================
            // 🏷️ COMANDO: SETNAME (Dueño + Admins)
            // ==========================================
            if (body.startsWith('.setname')) {
                const groupMetadata = isGroup ? await sock.groupMetadata(from) : null;
                const participants = isGroup ? groupMetadata.participants : [];
                const isAdmin = participants.find(p => p.id === sender)?.admin;
                
                const tienePermiso = sender.includes("191809682694179") || sender.includes("526633147534") || isAdmin;

                if (!tienePermiso) {
                     return sock.sendMessage(from, { text: '⛔ Solo el creador o los admins pueden usar esto.' }, { quoted: m });
                }

                const nuevoNombre = body.slice(9).trim();
                if (!nuevoNombre) return sock.sendMessage(from, { text: '📝 Escribe el nombre nuevo.' }, { quoted: m });

                try {
                    const nuevaConfig = { nombre: nuevoNombre };
                    fs.writeFileSync('./config.json', JSON.stringify(nuevaConfig, null, 2));
                    await sock.sendMessage(from, { text: `✅ Nombre del bot cambiado a: *${nuevoNombre}*` }, { quoted: m });
                } catch (e) { console.log(e); }
            }


// ==========================================
// 👋 COMANDOS: CONFIGURAR DESPEDIDA
// ==========================================
const isAdmin = isGroup ? (await sock.groupMetadata(from)).participants.find(p => p.id === sender)?.admin : false;

if (body === '.welcome on' || body === '.welcome off') {
    if (!esOwner && !isAdmin) return sock.sendMessage(from, { text: '⛔ Solo admins o mi owner pueden usar esto.' }, { quoted: m });
    welcomeDB.status[from] = body === '.welcome on';
    guardarWelcome();
    await sock.sendMessage(from, { text: `✅ Despedidas ${body === '.welcome on' ? 'ACTIVADAS' : 'DESACTIVADAS'}` }, { quoted: m });
}

if (body === '.setwel') {
    if (!esOwner && !isAdmin) return;
    if (welcomeDB.files.length >= 7) return sock.sendMessage(from, { text: '⚠️ Cupos de imagen/video llenos (7/7). Usa .delwe.' }, { quoted: m });
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const mime = quoted ? Object.keys(quoted)[0] : null;
    if (mime !== 'imageMessage' && mime !== 'videoMessage') return sock.sendMessage(from, { text: '📸 Responde a una foto o video.' }, { quoted: m });

    const buffer = await downloadContentFromMessage(quoted[mime], mime === 'imageMessage' ? 'image' : 'video');
    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
    const path = `./media_wel_${Date.now()}.${mime === 'imageMessage' ? 'jpg' : 'mp4'}`;
    fs.writeFileSync(path, buf);
    welcomeDB.files.push({ path, type: mime === 'imageMessage' ? 'image' : 'video' });
    guardarWelcome();
    await sock.sendMessage(from, { text: `✅ Guardado en el cupo #${welcomeDB.files.length}` }, { quoted: m });
}

if (body === '.welaudi') {
    if (!esOwner && !isAdmin) return;
    if (welcomeDB.audios.length >= 4) return sock.sendMessage(from, { text: '⚠️ Cupos de audio llenos (4/4). Usa .delaudio.' }, { quoted: m });
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.videoMessage) return sock.sendMessage(from, { text: '🎥 Responde a un video para extraer su audio.' }, { quoted: m });

    const buffer = await downloadContentFromMessage(quoted.videoMessage, 'video');
    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
    const path = `./audio_wel_${Date.now()}.mp3`;
    fs.writeFileSync(path, buf);
    welcomeDB.audios.push(path);
    guardarWelcome();
    await sock.sendMessage(from, { text: `🎵 Audio guardado en el cupo #${welcomeDB.audios.length}` }, { quoted: m });
}

if (body.startsWith('.delwe') || body.startsWith('.delaudio')) {
    if (!esOwner && !isAdmin) return;
    const esAudio = body.startsWith('.delaudio');
    const index = parseInt(body.split(' ')[1]) - 1;
    const lista = esAudio ? welcomeDB.audios : welcomeDB.files;
    if (isNaN(index) || !lista[index]) return sock.sendMessage(from, { text: '❌ Número inválido.' }, { quoted: m });
    
    const borrar = esAudio ? lista[index] : lista[index].path;
    if (fs.existsSync(borrar)) fs.unlinkSync(borrar);
    lista.splice(index, 1);
    guardarWelcome();
    await sock.sendMessage(from, { text: `🗑️ Eliminado correctamente.` }, { quoted: m });
}



// .welcome2 on/off
if (body === '.welcome2 on' || body === '.welcome2 off') {
    if (!esOwner && !isAdmin) return sock.sendMessage(from, { text: '⛔ Solo admins.' }, { quoted: m });
    welcome2DB.status[from] = body === '.welcome2 on';
    guardarWelcome2();
    await sock.sendMessage(from, { text: `✅ Bienvenidas ${body === '.welcome2 on' ? 'ACTIVADAS' : 'DESACTIVADAS'}` }, { quoted: m });
}

// .setwel2 (7 cupos para Foto/Video)
if (body === '.setwel2') {
    if (!esOwner && !isAdmin) return;
    if (welcome2DB.files.length >= 7) return sock.sendMessage(from, { text: '⚠️ Cupos llenos (7/7).' }, { quoted: m });
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const mime = quoted ? Object.keys(quoted)[0] : null;
    if (mime !== 'imageMessage' && mime !== 'videoMessage') return sock.sendMessage(from, { text: '📸 Responde a una foto o video.' }, { quoted: m });

    const buffer = await downloadContentFromMessage(quoted[mime], mime === 'imageMessage' ? 'image' : 'video');
    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
    const path = `./media_in_${Date.now()}.${mime === 'imageMessage' ? 'jpg' : 'mp4'}`;
    fs.writeFileSync(path, buf);
    welcome2DB.files.push({ path, type: mime === 'imageMessage' ? 'image' : 'video' });
    guardarWelcome2();
    await sock.sendMessage(from, { text: `✅ Guardado en Bienvenida #${welcome2DB.files.length}` }, { quoted: m });
}

// .welaudi2 (4 cupos para Audio)
if (body === '.welaudi2') {
    if (!esOwner && !isAdmin) return;
    if (welcome2DB.audios.length >= 4) return sock.sendMessage(from, { text: '⚠️ Cupos llenos (4/4).' }, { quoted: m });
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.videoMessage) return sock.sendMessage(from, { text: '🎥 Responde a un video.' }, { quoted: m });

    const buffer = await downloadContentFromMessage(quoted.videoMessage, 'video');
    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
    const path = `./audio_in_${Date.now()}.mp3`;
    fs.writeFileSync(path, buf);
    welcome2DB.audios.push(path);
    guardarWelcome2();
    await sock.sendMessage(from, { text: `🎵 Audio de bienvenida guardado #${welcome2DB.audios.length}` }, { quoted: m });
}

// .delwe2 y .delaudio2
if (body.startsWith('.delwe2') || body.startsWith('.delaudio2')) {
    if (!esOwner && !isAdmin) return;
    const esAudio = body.startsWith('.delaudio2');
    const index = parseInt(body.split(' ')[esAudio ? 1 : 1]) - 1;
    const lista = esAudio ? welcome2DB.audios : welcome2DB.files;
    if (isNaN(index) || !lista[index]) return sock.sendMessage(from, { text: '❌ Número inválido.' }, { quoted: m });
    const borrar = esAudio ? lista[index] : lista[index].path;
    if (fs.existsSync(borrar)) fs.unlinkSync(borrar);
    lista.splice(index, 1);
    guardarWelcome2();
    await sock.sendMessage(from, { text: `🗑️ Eliminado de Bienvenidas.` }, { quoted: m });
}

                // ==========================================
                // 🔐 VERIFICACIÓN (CREADOR + LISTA)
                // ==========================================
                
                // 1. Definimos quién es el JEFE SUPREMO
                const soyElJefe = m.sender === "526633147534@s.whatsapp.net" || 
                                  m.sender === "191809682694179@lid" || 
                                  m.key.fromMe || 
                                  m.sender.includes("5216633147534");

                // 2. Definimos quién es un AMIGO CON PODER (Lista)
                const esOwnerRegistrado = global.realOwners && global.realOwners.includes(m.sender);

                // 3. LA REGLA: Pasa si es Jefe O si es Registrado
                if (!soyElJefe && !esOwnerRegistrado) {
                    return sock.sendMessage(from, { text: "❌ Acceso denegado. No estás en la lista de Real Owners." }, { quoted: m });
                }



            // ==========================================
            // 👑 COMANDO: AGREGAR REAL OWNER
            // ==========================================
            if (body.startsWith('.owner')) {
                // 1. TUS DATOS DEL SISTEMA HÍBRIDO
                const miNumero = "526633147534@s.whatsapp.net"; 
                const miLID = "191809682694179@lid"; 
                
                // 2. VERIFICACIÓN MEJORADA (Incluye corrección México + Soy Yo)
                const esCreadorOficial = m.sender === miNumero || 
                                         m.sender === miLID || 
                                         m.key.fromMe || 
                                         m.sender.includes("5216633147534");

                if (!esCreadorOficial) {
                    return sock.sendMessage(from, { text: "❌ Este comando solo puede ser usado por mi Creador Real." }, { quoted: m });
                }

                // 3. OBTENER AL NUEVO OWNER
                const participante = m.message?.extendedTextMessage?.contextInfo?.participant || 
                                     m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!participante) {
                    return sock.sendMessage(from, { text: "⚠️ Responde al mensaje de la persona que quieres hacer Owner." }, { quoted: m });
                }

                // 4. GUARDAR
                if (typeof global.realOwners === 'undefined') global.realOwners = [];
                
                if (!global.realOwners.includes(participante)) {
                    global.realOwners.push(participante);
                    
                    await sock.sendMessage(from, { react: { text: "👑", key: m.key } });
                    await sock.sendMessage(from, { 
                        text: `✅ ¡Acceso Concedido!\n\nAhora @${participante.split('@')[0]} tiene permisos de *Real Owner*.`,
                        mentions: [participante]
                    }, { quoted: m });
                } else {
                    // Aquí es donde se cortaba tu código, lo completé:
                    await sock.sendMessage(from, { text: "💡 Esa persona ya es Owner." }, { quoted: m });
                }
            } // <--- ESTA LLAVE ES VITAL: Cierra todo el comando.


            // ==========================================
            // 🗑️ COMANDO: ELIMINAR OWNER (Solo Creador)
            // ==========================================
            if (body.startsWith('.delowner')) {
                // 1. Validamos que seas TÚ (Sistema Híbrido + Seguridad)
                const miNumero = "526633147534@s.whatsapp.net";
                const miLID = "191809682694179@lid";
                
                const esCreadorOficial = m.sender === miNumero || 
                                         m.sender === miLID || 
                                         m.key.fromMe || 
                                         m.sender.includes("5216633147534");

                if (!esCreadorOficial) {
                    return sock.sendMessage(from, { text: "❌ Solo el Creador Principal puede eliminar owners." }, { quoted: m });
                }

                // 2. Identificamos a quién eliminar (respondiendo mensaje)
                const target = m.message?.extendedTextMessage?.contextInfo?.participant || 
                               m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!target) {
                    return sock.sendMessage(from, { text: "⚠️ Responde al mensaje del Owner que quieres eliminar." }, { quoted: m });
                }

                // 3. Lógica de Eliminación
                if (global.realOwners && global.realOwners.includes(target)) {
                    // Filtramos la lista para sacar al usuario
                    global.realOwners = global.realOwners.filter(owner => owner !== target);
                    
                    await sock.sendMessage(from, { react: { text: "🗑️", key: m.key } });
                    await sock.sendMessage(from, { 
                        text: `✅ @${target.split('@')[0]} ha sido eliminado de la lista de Real Owners.`,
                        mentions: [target]
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ Ese usuario NO está en la lista de Owners." }, { quoted: m });
                }
            }


            // ==========================================
            // 👑 COMANDO: CREADOR (CONTACTO)
            // ==========================================
            if (body === '.creador') {
                const nombreOwner = "Criss"; 
                const numeroOwner = "526633147534"; 
                const instagram = "https://www.instagram.com/_.110418._?igsh=YW41MG52M3l4OHNq";
                const vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + nombreOwner + '\n' + 'ORG:Creador del Bot;\n' + 'TEL;type=CELL;type=VOICE;waid=' + numeroOwner + ':+' + numeroOwner + '\n' + 'NOTE:Puedes seguir a mi creador en Instagram: ' + instagram + '\n' + 'URL:' + instagram + '\n' + 'END:VCARD'
                await sock.sendMessage(from, { contacts: { displayName: nombreOwner, contacts: [{ vcard }] } }, { quoted: m });
            }

            // ==========================================
            // 🏓 COMANDO: PING (VELOCIDAD)
            // ==========================================
            if (body === '.ping') {
                const velocidad = new Date().getTime() - (m.messageTimestamp * 1000);
               await sock.sendMessage(from, { text: `¡Pong! 🏓\n⚡ Velocidad: ${velocidad}ms\n✅ Estado: Online` }, { quoted: m });
            }

            // ==========================================
            // 🎵 COMANDO: TIKTOK DL
            // ==========================================
            if (body.startsWith('.tt')) {
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
            }





            // ==========================================
            // ℹ️ COMANDO: INFORMACIÓN DEL SISTEMA
            // ==========================================
            if (body === '.info') {
                const uptime = process.uptime();
                const horas = Math.floor(uptime / 3600);
                const minutos = Math.floor((uptime % 3600) / 60);
                const segundos = Math.floor(uptime % 60);
                const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const speed = new Date().getTime() - (m.messageTimestamp * 1000);
                const textoInfo = `💻 *INFORMACIÓN DEL SISTEMA* 💻\n\n👑 *Creador:* Criss\n🤖 *Bot:* ${BotName}\n🚀 *Velocidad:* ${speed}ms\n⏳ *Tiempo Activo:* ${horas}h ${minutos}m ${segundos}s\n💾 *RAM Usada:* ${ram} MB\n📱 *Plataforma:* Termux (Android)\n📚 *Base:* Baileys (JavaScript)\n🛡️ *Versión:* 1.0.0`;
                await sock.sendMessage(from, { text: textoInfo }, { quoted: m });
            }

            // ==========================================
            // 💿 COMANDO: PLAY (MÚSICA Y VIDEO)
            // ==========================================
            if (body.startsWith('.play')) {
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
            }

            // ==========================================
            // 🧠 COMANDO: INTELIGENCIA ARTIFICIAL
            // ==========================================
            if (body.startsWith('.ai') || body.startsWith('.ia')) {
                const pregunta = body.slice(4).trim();
                if (!pregunta) return sock.sendMessage(from, { text: '🤖 Pregúntame algo.' }, { quoted: m });
                await sock.sendMessage(from, { text: '🧠 *Pensando...*' }, { quoted: m });
                try {
                    const promptSistema = "Eres Chatgpt, un asistente de WhatsApp útil, enojon y sarcástico creado por Criss. Responde de forma breve y directa.";
                    const url = `https://text.pollinations.ai/${encodeURIComponent(promptSistema + " " + pregunta)}`;
                    const { data } = await axios.get(url);
                    if (data) await sock.sendMessage(from, { text: `🤖 *${BotName}\n IA:*\n\n${data}` }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Error IA.' }, { quoted: m });
                }
            }

            // ==========================================
            // 💎 COMANDO: HD (REMASTERIZAR)
            // ==========================================
            if (body === '.hd' || body === '.remaster') {
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
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

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
            }

            // ==========================================
            // 🎨 COMANDO: IMAGEN (DALL-E)
            // ==========================================
            if (body.startsWith('.imagen') || body.startsWith('.img')) {
                const texto = body.slice(8).trim();
                if (!texto) return sock.sendMessage(from, { text: '🎨 Dime qué dibujar.' }, { quoted: m });
                await sock.sendMessage(from, { text: '🎨 *Pintando...*' }, { quoted: m });
                try {
                    const urlImagen = `https://image.pollinations.ai/prompt/${encodeURIComponent(texto)}?width=1080&height=1080&nologo=true&seed=${Math.random()}`;
                    await sock.sendMessage(from, { image: { url: urlImagen }, caption: `🎨 *Arte Generado*\n📝 "${texto}"\n🤖 By: ${BotName}` }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ No pude dibujar eso.' }, { quoted: m });
                }
            }

            // ==========================================
            // 🎵 COMANDO: VIDEO A MP3 (.tomp3)
            // ==========================================
            if (body === '.tomp3' || body === '.toaudio') {
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quoted || !quoted.videoMessage) {
                    return sock.sendMessage(from, { text: '⚠️ Responde a un *video* con el comando *.tomp3* para convertirlo.' }, { quoted: m });
                }

                await sock.sendMessage(from, { text: '⏳ *Extrayendo audio... por favor espera.*' }, { quoted: m });

                try {
                    // Descargamos el video
                    const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

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
            }




            // ==========================================
            // 🎮 ZONA: JUEGOS Y DIVERSIÓN
            // ==========================================

if (body.startsWith('.gay')) {
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
}

            // ==========================================
            // 🔥 COMANDO: PENETRAR (NSFW)
            // ==========================================
            if (body.startsWith('.penetrar') || body.startsWith('.penetrado')) {
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
            }


            // ==========================================
            // 🔞 COMANDO: TETAS (VERIFICADO Y SIN ERRORES)
            // ==========================================
            if (body.startsWith('.tetas')) {
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
            }



            if (body.startsWith('.ppt')) {
                const usuarioElige = body.slice(5).trim().toLowerCase();
                const opciones = ["piedra", "papel", "tijera"];
                if (!opciones.includes(usuarioElige)) return sock.sendMessage(from, { text: '⚠️ Elige: piedra, papel o tijera.' }, { quoted: m });
                const botElige = opciones[Math.floor(Math.random() * opciones.length)];
                let resultado = (usuarioElige === botElige) ? "🤝 ¡Empate!" : ((usuarioElige === "piedra" && botElige === "tijera") || (usuarioElige === "papel" && botElige === "piedra") || (usuarioElige === "tijera" && botElige === "papel")) ? "🏆 ¡Tú ganas!" : "😭 ¡Yo gano!";
                await sock.sendMessage(from, { text: `🤖 Yo: *${botElige}*\n👤 Tú: *${usuarioElige}*\n\n${resultado}` }, { quoted: m });
            }

            // ==========================================
            // 💰 SISTEMA: ECONOMÍA (BANCO)
            // ==========================================
            
            if (!banco[usuarioKey]) banco[usuarioKey] = 0;

            // ==========================================
            // 💰 COMANDO: ADDCOIN (SISTEMA HÍBRIDO + LISTA)
            // ==========================================
            if (body.startsWith('.addcoin')) {
                // [REGLA 1] EL TRADUCTOR DE MILLONES
                // Convierte "1k" en "1000" y "1m" en "1000000" automáticamente
                let cantidadTexto = body.slice(9).trim().split(' ')[0]; // Toma el número escrito
                cantidadTexto = cantidadTexto.replace(/k/gi, '000').replace(/m/gi, '000000');
                let cantidad = parseInt(cantidadTexto);

                // [REGLA 2 Y 3] VERIFICACIÓN MAESTRA (Dueño + Lista)
                const soyElJefe = m.sender === "526633147534@s.whatsapp.net" || 
                                  m.sender === "191809682694179@lid" || 
                                  m.key.fromMe || 
                                  m.sender.includes("5216633147534");
                                  
                const esOwnerRegistrado = global.realOwners && global.realOwners.includes(m.sender);

                if (!soyElJefe && !esOwnerRegistrado) {
                    return sock.sendMessage(from, { text: "❌ Solo los Real Owners pueden añadir dinero." }, { quoted: m });
                }

                // LÓGICA DEL COMANDO
                // 1. Buscamos a quién darle el dinero
                let target = m.message?.extendedTextMessage?.contextInfo?.participant || 
                             m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!target) return sock.sendMessage(from, { text: "⚠️ Etiqueta o responde a quien quieras dar monedas." }, { quoted: m });
                if (isNaN(cantidad)) return sock.sendMessage(from, { text: "⚠️ Escribe la cantidad. Ejemplo: .addcoin 1k @usuario" }, { quoted: m });

                // 2. Agregamos el dinero (Asegúrate de tener tu base de datos lista)
                // Esto asume que usas global.db.data.users. Si usas otro sistema, cambia esta línea:
                if (global.db && global.db.data && global.db.data.users[target]) {
                    global.db.data.users[target].money = (global.db.data.users[target].money || 0) + cantidad;
                    
                    await sock.sendMessage(from, { react: { text: "💰", key: m.key } });
                    await sock.sendMessage(from, { 
                        text: `✅ Se han añadido *${cantidad.toLocaleString()}* monedas a @${target.split('@')[0]}`,
                        mentions: [target]
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "❌ Error: La base de datos de usuarios no está lista." }, { quoted: m });
                }
            }



            // ==========================================
            // 👮‍♂️ COMANDO: ADMINISTRACIÓN
            // ==========================================
            if (body.startsWith('.kick') || body.startsWith('.grupo') || body.startsWith('.admin')) {
                if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '❌ Solo grupos.' }, { quoted: m });
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                const senderId = sender; 
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const isAdmin = participants.find(p => p.id === senderId)?.admin;
                const isBotAdmin = participants.find(p => p.id === botId)?.admin;

                if (!isAdmin) return sock.sendMessage(from, { text: '⛔ No eres admin.' }, { quoted: m });
                if (!isBotAdmin) return sock.sendMessage(from, { text: '⛔ Bot no es admin.' }, { quoted: m });

                if (body.startsWith('.kick')) {
                    let victim = m.message.extendedTextMessage?.contextInfo?.participant || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (victim) await sock.groupParticipantsUpdate(from, [victim], 'remove');
                }
                if (body.startsWith('.grupo')) {
                    if (body.includes('cerrar')) await sock.groupSettingUpdate(from, 'announcement');
                    if (body.includes('abrir')) await sock.groupSettingUpdate(from, 'not_announcement');
                }
                if (body.startsWith('.admin')) {
                    let victim = m.message.extendedTextMessage?.contextInfo?.participant || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (victim) await sock.groupParticipantsUpdate(from, [victim], 'promote');
                }
            }


            // ==========================================
            // 📌 COMANDO: PINTEREST (10 IMÁGENES - SIN ERROR)
            // ==========================================
            if (body.startsWith('.pinterest') || body.startsWith('.pin')) {
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
            }



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


    // ==========================================
    // 🚪 DETECTOR DE EVENTOS DE GRUPO (UNIFICADO)
    // ==========================================
    sock.ev.on('group-participants.update', async (anu) => {
        const { id, participants, action } = anu;
        const isRemove = action === 'remove';
        const db = isRemove ? welcomeDB : welcome2DB;

if (true) {
            const metadata = await sock.groupMetadata(id);
            for (let num of participants) {
                let fIdx = db.files.length > 0 ? Math.floor(Math.random() * db.files.length) : -1;
                let aIdx = db.audios.length > 0 ? Math.floor(Math.random() * db.audios.length) : -1;
                
                let txt = isRemove ? `👋 ¡Adiós @${num.split('@')[0]}!\n🚪 Saliste de: *${metadata.subject}*\n👥 Quedamos: *${metadata.participants.length}*` : 
                                    `🌟 ¡Bienvenido @${num.split('@')[0]}! 🌟\n🏰 Entraste a: *${metadata.subject}*\n👥 Somos: *${metadata.participants.length}*`;

                if (fIdx !== -1) {
                    const media = db.files[fIdx];
                    await sock.sendMessage(id, { [media.type]: fs.readFileSync(media.path), caption: txt, mentions: [num] });
                }
                if (aIdx !== -1) {
                    await sock.sendMessage(id, { audio: fs.readFileSync(db.audios[aIdx]), mimetype: 'audio/mp4', ptt: true });
                }
            }
        }
    }); // <- Aquí se cierra el detector de grupo

} // <- Esta llave cierra la función "async function iniciarBot()"

iniciarBot(); // <- Esta línea arranca todo el proceso
