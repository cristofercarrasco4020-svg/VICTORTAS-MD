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
    botName: "VICTORTAS"      // Nombre del Bot
};

let botActivo = true; 

// ==========================================
// 🛒 CONFIGURACIÓN MAESTRA DE LA TIENDA
// ==========================================
const shopItems = {
    // 🚗 VEHÍCULOS
    'toyota':   { nombre: "Toyota Corolla", precio: 15000,   emoji: "🚗", tipo: 'coche' },
    'ferrari':  { nombre: "Ferrari 488",    precio: 250000,  emoji: "🏎️", tipo: 'coche' },
    'lambo':    { nombre: "Lamborghini",    precio: 500000,  emoji: "🚔", tipo: 'coche' },
    'bugatti':  { nombre: "Bugatti Chiron", precio: 2000000, emoji: "🚀", tipo: 'coche' },

    // 🏰 PROPIEDADES
    'choza':    { nombre: "Choza de Tierra", precio: 5000,     emoji: "⛺", tipo: 'casa' },
    'apto':     { nombre: "Apartamento",     precio: 50000,    emoji: "🏢", tipo: 'casa' },
    'mansion':  { nombre: "Mansión Lujosa",  precio: 1500000,  emoji: "🏰", tipo: 'casa' },
    'isla':     { nombre: "Isla Privada",    precio: 10000000, emoji: "🏝️", tipo: 'casa' },

    // ⛏️ MINERÍA
    'gpu':      { nombre: "Nvidia RTX 3090", precio: 20000,    emoji: "📼", tipo: 'mineria' },
    'asic':     { nombre: "Antminer S19",    precio: 100000,   emoji: "🔌", tipo: 'mineria' },
    'farm':     { nombre: "Granja de Minería", precio: 1000000, emoji: "🏭", tipo: 'mineria' },

    // 💍 LUJO
    'rolex':    { nombre: "Rolex de Oro",    precio: 30000,    emoji: "⌚", tipo: 'joya' },
    'diamante': { nombre: "Diamante Puro",   precio: 100000,   emoji: "💎", tipo: 'joya' }
};


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
            // Programamos la limpieza cada hora
            setInterval(() => {
                autoLimpiarSistema();
            }, 3600000); 
        } // <--- Esta llave cierra el "else if"
    }); // <--- Esta llave con paréntesis cierra el "sock.ev.on"

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
            // 🧠 CEREBRO: EXTRACCIÓN AUTOMÁTICA
            // ==========================================
            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(' ').slice(1);
            const text = args.join(' ');
            const q = args.join(' '); // Alias corto para texto
            const isGroup = from.endsWith('@g.us');


            // Solo imprimimos en consola si es un comando real
            if (isCmd) {
                console.log(`🎮 CMD: ${command} | DE: ${pushName}`);
            }


// ==========================================
// 🏦 ECONOMÍA (SISTEMA DE PERSISTENCIA ÚNICA)
// ==========================================
const rutaBanco = './banco.json';

// Esta función ahora solo se usa una vez al iniciar o para guardar
const gestionarJSON = {
    leer: (file) => {
        if (!fs.existsSync(file)) return {};
        try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return {}; }
    },
    guardar: (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))
};

// 🚨 CARGA INICIAL: Solo ocurre una vez. Los comandos usarán la variable global.
if (!global.banco_cargado) {
    global.banco = gestionarJSON.leer(rutaBanco);
    global.inventario = gestionarJSON.leer('./inventario.json');
    global.titulos = gestionarJSON.leer('./titulos.json'); 
    global.banco_cargado = true; 
}



// ==========================================
// 🧠 CEREBRO: UNIFICADOR DE IDENTIDAD (ANTI-FANTASMA)
// ==========================================
let rawSender = m.key.participant || m.key.remoteJid;
let userKey = rawSender.split('@')[0];

// 🛡️ REGLA DE ORO: Si eres el dueño (en cualquier forma), eres el número 52...
const esOwnerReal = rawSender.includes(ownerData.numero) || rawSender.includes(ownerData.lid) || m.key.fromMe;

if (esOwnerReal || userKey === 'sdk' || userKey.length < 5) {
    userKey = ownerData.numero; // Forzamos siempre a tu cuenta principal
}

// Ahora el saldo siempre lee de la cuenta correcta
let saldo = global.banco[userKey] || 0;

// Definimos el Target (Objetivo) para transferencias o regalos
let targetRaw = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                m.message.extendedTextMessage?.contextInfo?.participant || 
                rawSender;

let targetKey = targetRaw.split('@')[0];

// Si le vas a dar dinero al dueño, redirigirlo al número 52...
if (targetKey.includes(ownerData.numero) || targetKey.includes(ownerData.lid)) {
    targetKey = ownerData.numero;
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
// ⏱️ UTILIDAD: RELOJ (Para cooldowns futuros)
// ==========================================
const msToTime = (duration) => {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    return `${hours}h ${minutes}m ${seconds}s`;
};



            // ==========================================
            // 🎮 EL GRAN SWITCH (AQUÍ COMIENZAN LOS COMANDOS)
            // ==========================================
            switch (command) {  // 👈 ¡AQUÍ SE ABRE EL SWITCH PRINCIPAL!


            // ==========================================
            // 📜 COMANDO: MENU (ACTUALIZADO Y SIN ERRORES)
            // ==========================================
            case 'menu': case 'help': case 'hlp':
                await sock.sendMessage(from, { react: { text: "📂", key: m.key } });

                const horaActual = new Date().getHours();
                let saludo = horaActual >= 5 && horaActual < 12 ? "🌅 Buenos días" : 
                             horaActual >= 12 && horaActual < 19 ? "☀️ Buenas tardes" : "🌙 Buenas noches";

                // --- 🛠️ CORRECCIÓN DE DATOS (PARA QUE NO FALLE) ---
                // Leemos directamente de la memoria global para asegurar datos frescos
                const misTitulos = global.titulos || {};
                const miSaldo = global.banco[userKey] || 0;
                const miRango = misTitulos[userKey] || "Novato";

                // Lógica de Imagen o Video
                let mensajeMenu = {}; 
                const defaultUrl = 'https://files.catbox.moe/tll9q5.mp4'; 
                
                if (fs.existsSync('./media_menu.mp4')) {
                    mensajeMenu = { video: fs.readFileSync('./media_menu.mp4'), gifPlayback: true };
                } else if (fs.existsSync('./media_menu.jpg')) {
                    mensajeMenu = { image: fs.readFileSync('./media_menu.jpg') };
                } else {
                    mensajeMenu = { video: { url: defaultUrl }, gifPlayback: false }; 
                }

                // --- CABECERA ---
                let textoMenu = `✨ *${saludo} ${pushName}* ✨\n`;
                textoMenu += `👑 *Owner:* ${ownerData.nombre}\n`; 
                textoMenu += `🤖 *Bot:* ${ownerData.botName}\n`;
                textoMenu += `🎖️ *Rango:* ${miRango}\n`; 
                textoMenu += `💰 *Banco:* $${miSaldo.toLocaleString()}\n\n`; 

                // --- 💰 ECONOMÍA ---
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
                textoMenu += `│ℹ️ .info (Sistema)\n`;
                textoMenu += `│⚡ .ping (Velocidad)\n`;
                textoMenu += `│🕵️ .mied (Mi ID)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 🎡 DIVERSIÓN ---
                textoMenu += `╭─〔 🎡 EXTRAS 〕\n`;
                textoMenu += `│🏳️‍🌈 .gay (Scanner)\n`;
                textoMenu += `│✂️ .ppt (Jugar)\n`;
                textoMenu += `│🔥 .penetrar (Rol)\n`;
                textoMenu += `│🔞 .tetas (Pack)\n`;
                textoMenu += `│🍑 .vagina (Pack)\n`;
                textoMenu += `│🖼️ .s (Sticker)\n`;
                textoMenu += `╰──────────────\n\n`;

                // --- 👑 OWNER ---
                textoMenu += `╭─〔 👑 ZONA OWNER 〕\n`;
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
                // Usamos las variables globales 'sender' y 'userKey' y 'txt'
                txt = `🕵️ *DETECTOR DE IDENTIDAD*\n\n`;
                txt += `📱 *Tu Número:* ${userKey}\n`;
                txt += `🔑 *Tu ID Técnico:* ${sender}\n\n`;
                txt += `⚠️ *NOTA:* Para que los comandos de Owner te reconozcan, asegúrate de que el config incluya: *"${userKey}"*`;
                await sock.sendMessage(from, { text: txt }, { quoted: m });
            break;




            // ==========================================
            // 🖼️ COMANDO: SETMENU (CORREGIDO)
            // ==========================================
            case 'setmenu': case 'imagenmenu':
                // 1. Verificación de seguridad
                if (!esOwner) return sock.sendMessage(from, { text: '⛔ Solo mi Creador puede cambiar el menú.' }, { quoted: m });

                // 2. 👇 AQUÍ ESTÁ EL ARREGLO: Definimos qué es el mensaje citado
                let msgCitado = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

                // Si no respondió a nada...
                if (!msgCitado) return sock.sendMessage(from, { text: '📸 *Error:* Debes responder a una FOTO o VIDEO para ponerlo en el menú.' }, { quoted: m });

                // 3. Detectar si es imagen o video
                let tipoArchivo = Object.keys(msgCitado)[0];
                // Validamos que sea multimedia visual
                if (!/imageMessage|videoMessage/.test(tipoArchivo)) {
                    return sock.sendMessage(from, { text: '⚠️ Eso no es una imagen ni un video válido.' }, { quoted: m });
                }

                await sock.sendMessage(from, { text: '⏳ *Actualizando diseño del menú...*' }, { quoted: m });

                try {
                    // 4. Descargar el archivo (Lógica universal)
                    // Convertimos 'imageMessage' a 'image' o 'videoMessage' a 'video'
                    let streamType = tipoArchivo.replace('Message', '');
                    const stream = await downloadContentFromMessage(msgCitado[tipoArchivo], streamType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    // 5. Limpieza previa (Borramos el menú anterior para no ocupar espacio)
                    if (fs.existsSync('./media_menu.jpg')) fs.unlinkSync('./media_menu.jpg');
                    if (fs.existsSync('./media_menu.mp4')) fs.unlinkSync('./media_menu.mp4');

                    // 6. Guardar el nuevo archivo
                    if (tipoArchivo === 'imageMessage') {
                        fs.writeFileSync('./media_menu.jpg', buffer);
                    } else {
                        fs.writeFileSync('./media_menu.mp4', buffer);
                    }

                    await sock.sendMessage(from, { text: '✅ *¡Cambio Exitoso!*\nEscribe *.menu* para ver tu nueva portada.' }, { quoted: m });

                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: '❌ Error técnico al guardar la imagen.' }, { quoted: m });
                }
            break;



            // ==========================================
            // 🏷️ COMANDO: SETNAME (Solo Owner)
            // ==========================================
            case 'setname':
                // Verificamos si es el dueño (variable global 'esOwner')
                if (!esOwner) return;

                // Usamos la variable global 'text' que ya contiene el argumento
                if (!text) return sock.sendMessage(from, { text: '⚠️ Por favor, escribe el nuevo nombre del bot.' }, { quoted: m });
                // Actualizamos el nombre en la memoria
                ownerData.botName = text; 
                await sock.sendMessage(from, { text: `✅ Nombre actualizado a: *${ownerData.botName}*` }, { quoted: m }); 
            break;





            // ==========================================
            // 🔞 COMANDO: XNXX (BÚSQUEDA Y DESCARGA)
            // ==========================================
            case 'xnxx': case 'polnito':
                // Usamos la variable global 'text'
                if (!text) return sock.sendMessage(from, { text: '😈 Ingresa el nombre o link del video.' }, { quoted: m });

                const isUrl = text.includes('xnxx.com');

                // --- CASO 1: ES UN LINK DIRECTO ---
                if (isUrl) {
                    try {
                        await sock.sendMessage(from, { react: { text: "⬇️", key: m.key } });
                        
                        const res = await xnxxdl(text);
                        const { qual, views } = res.result.info;
                        const txt = `*乂 ¡${ownerData.botName} - DOWNLOAD! 乂*\n\n≡ Título: ${res.result.title}\n≡ Duración: ${res.result.duration}\n≡ Calidad: ${qual}\n≡ Vistas: ${views}`;
                        
                        const dll = res.result.files.high || res.result.files.low;
                        
                        await sock.sendMessage(from, { video: { url: dll }, caption: txt }, { quoted: m });
                        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

                    } catch (e) {
                        await sock.sendMessage(from, { text: `❌ Error al descargar: ${e.message}` }, { quoted: m });
                    }
                } 
                
                // --- CASO 2: ES UNA BÚSQUEDA ---
                else {
                    try {
                        await sock.sendMessage(from, { react: { text: "🔎", key: m.key } });
                        
                        // ⚠️ IMPORTANTE: Usamos 'searchXNXX' para no chocar con Aptoide
                        const res = await searchXNXX(text); 
                        
                        if (!res.result?.length) return sock.sendMessage(from, { text: '❌ No encontré nada, puerco.' }, { quoted: m });

                        // Creamos la lista numerada
                        const list = res.result.slice(0, 10).map((v, i) => `*${i + 1}* ┃ ${v.title}`).join('\n');

                        const caption = `*乂 ¡${ownerData.botName} - BÚSQUEDA! 乂*\n\n${list}\n\n> 🔢 *Responde con el número para descargar.*`;

                        // Guardamos en memoria para el selector (esto es global automático)
                        global.xnxxSession = global.xnxxSession || {};
                        global.xnxxSession[from] = {
                            result: res.result,
                            timeout: setTimeout(() => { 
                                if(global.xnxxSession[from]) delete global.xnxxSession[from];
                            }, 120000) // 2 minutos
                        };

                        await sock.sendMessage(from, { text: caption }, { quoted: m });
                    } catch (e) {
                        console.log(e);
                        await sock.sendMessage(from, { text: `❌ Error buscando.` }, { quoted: m });
                    }
                }
            break;




            // ==========================================
            // ☁️ COMANDO: SUBIR ACTUALIZACIÓN (OWNER)
            // ==========================================
            case 'subiractu':
                // Usamos la seguridad global 'esOwner'
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
            // 🔄 COMANDO: ACTUALIZAR (OWNER)
            // ==========================================
            case 'actualizar':
                // Validación usando la variable global 'esOwner'
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

                    // Reinicio automático
                    setTimeout(() => {
                        process.exit(0); 
                    }, 2000);
                });
            break;


            // ==========================================
            // 👑 COMANDO: AGREGAR REAL OWNER
            // ==========================================
            case 'owner':
                // 1. Verificación usando la variable global 'esOwner'
                if (!esOwner) {
                    return sock.sendMessage(from, { text: `❌ Solo ${ownerData.nombre} puede usar esto.` }, { quoted: m });
                }

                // 2. Obtener al nuevo owner (etiquetado o respondido)
                // Si definiste 'target' en las variables globales, podrías usar 'target', pero esto es más seguro:
                const nuevoOwner = m.message?.extendedTextMessage?.contextInfo?.participant || 
                                   m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

                if (!nuevoOwner) {
                    return sock.sendMessage(from, { text: "⚠️ Responde al mensaje o etiqueta a la persona." }, { quoted: m });
                }

                // 3. Guardar en memoria global
                global.realOwners = global.realOwners || [];
                
                if (!global.realOwners.includes(nuevoOwner)) {
                    global.realOwners.push(nuevoOwner);
                    await sock.sendMessage(from, { 
                        text: `✅ *¡Acceso Concedido!*\n👤 @${nuevoOwner.split('@')[0]} ahora es *Real Owner*.`, 
                        mentions: [nuevoOwner] 
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "💡 Esa persona ya es Owner." }, { quoted: m });
                }
            break;


            // ==========================================
            // 🗑️ COMANDO: ELIMINAR OWNER
            // ==========================================
            case 'delowner':
                // 1. Verificación Estricta (Solo TÚ, el número principal, puedes borrar)
                const soyElJefe = sender.includes(ownerData.numero) || sender.includes(ownerData.lid) || m.key.fromMe;

                if (!soyElJefe) {
                    return sock.sendMessage(from, { text: "❌ Solo el Creador Principal puede eliminar owners." }, { quoted: m });
                }

                // 2. Usamos la variable global 'target'
                // Si target es igual a sender, significa que no etiquetó a nadie (se seleccionó a sí mismo por defecto)
                if (target === sender) {
                    return sock.sendMessage(from, { text: "⚠️ Responde al mensaje del Owner a eliminar." }, { quoted: m });
                }

                // 3. Ejecutar la eliminación
                if (global.realOwners && global.realOwners.includes(target)) {
                    global.realOwners = global.realOwners.filter(owner => owner !== target);
                    await sock.sendMessage(from, { 
                        text: `✅ @${target.split('@')[0]} eliminado de la lista de Owners.`, 
                        mentions: [target] 
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ Esa persona no es Owner." }, { quoted: m });
                }
            break;




            // ==========================================
            // 👑 COMANDO: CREADOR (MEJORADO)
            // ==========================================
            case 'creador': case 'owner':
                // 1. Reacción para confirmar
                await sock.sendMessage(from, { react: { text: "👑", key: m.key } });

                const nombreOwner = ownerData.nombre; 
                const numeroOwner = ownerData.numero; 
                const instagram = "https://www.instagram.com/_.110418._?igsh=YW41MG52M3l4OHNq";
                
                // 2. VCard Mejorada (Truco para que salga el botón de Instagram)
                const vcard = 'BEGIN:VCARD\n' + 
                              'VERSION:3.0\n' + 
                              'FN:' + nombreOwner + '\n' + 
                              'ORG:Creador de ' + ownerData.botName + ';\n' + 
                              'TEL;type=CELL;type=VOICE;waid=' + numeroOwner + ':+' + numeroOwner + '\n' + 
                              'item1.URL:' + instagram + '\n' + 
                              'item1.X-ABLabel:Instagram\n' + 
                              'END:VCARD';

                // 3. Enviamos el Contacto
                await sock.sendMessage(from, { 
                    contacts: { displayName: nombreOwner, contacts: [{ vcard }] } 
                }, { quoted: m });

                // 4. Enviamos el Mensaje de Texto (Para asegurar que se vea el link)
                await sock.sendMessage(from, { 
                    text: `🌟 *CONTACTO OFICIAL*\n\nHola, él es mi creador *${nombreOwner}*.\n\n📸 *Síguelo en Instagram:*\n${instagram}\n\n_Escríbele solo para temas importantes._` 
                }, { quoted: m });
            break; 




            // ==========================================
            // 🎨 COMANDO: STICKER (CORREGIDO Y LIMPIO)
            // ==========================================
            case 's': case 'sticker': case 'stiker':
                // Usamos las variables globales (msg, mime) que ya definimos arriba
                if (!mime) return sock.sendMessage(from, { text: '⚠️ Responde a una imagen o video.' }, { quoted: m });

                if (/image|video|webp/.test(mime)) {
                    // Validación de duración para videos (máximo 10 seg)
                    if (msg.videoMessage && msg.videoMessage.seconds > 10) {
                        return sock.sendMessage(from, { text: '⚠️ El video no puede durar más de 10 segundos.' }, { quoted: m });
                    }

                    await sock.sendMessage(from, { react: { text: '🎨', key: m.key } });

                    try {
                        const type = mime.split('/')[0];
                        const stream = await downloadContentFromMessage(msg[Object.keys(msg)[0]], type);
                        
                        // Convertimos el stream a buffer
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        // Nombres temporales seguros
                        const ext = type === 'image' ? 'jpg' : 'mp4';
                        const tempFile = `./temp_stick_${Date.now()}.${ext}`;
                        const tempOut = `./sticker_${Date.now()}.webp`;

                        fs.writeFileSync(tempFile, buffer);

                        // Comando FFmpeg PRO (Centrado, sin bordes negros, calidad alta)
                        let ffmpegCmd = `ffmpeg -i ${tempFile} -vcodec libwebp -filter:v "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -f webp ${tempOut}`;

                        // Si es video, ajustamos parámetros para animación
                        if (type !== 'image') {
                            ffmpegCmd = `ffmpeg -i ${tempFile} -vcodec libwebp -filter:v "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" -loop 0 -ss 00:00:00 -t 00:00:10 -preset default -an -vsync 0 -s 512:512 ${tempOut}`;
                        }

                        exec(ffmpegCmd, async (err) => {
                            // Borramos el archivo original (Input) para no llenar memoria
                            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

                            if (err) {
                                console.log("Error FFmpeg:", err);
                                return sock.sendMessage(from, { text: '❌ Error al crear sticker.' }, { quoted: m });
                            }

                            // Enviamos el sticker final
                            await sock.sendMessage(from, { sticker: fs.readFileSync(tempOut) }, { quoted: m });

                            // Borramos el resultado (Output)
                            if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                        });

                    } catch (e) {
                        console.log(e);
                        await sock.sendMessage(from, { text: '❌ Error interno.' }, { quoted: m });
                    }
                } else {
                    await sock.sendMessage(from, { text: '⚠️ Eso no es una imagen o video válido.' }, { quoted: m });
                }
            break; 


            // ==========================================
            // 🏓 COMANDO: PING (DASHBOARD PRO CORREGIDO)
            // ==========================================
            case 'ping': case 'p': case 'velocidad':
                // 1. Reacción rápida
                await sock.sendMessage(from, { react: { text: "⚡", key: m.key } });

                // 2. Calculamos datos técnicos reales
                const velocidad = Date.now() - (m.messageTimestamp * 1000);
                const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                
                // 3. Calculamos tiempo activo (Uptime)
                const segundosTotales = Math.floor(process.uptime());
                const horas = Math.floor(segundosTotales / 3600);
                const minutos = Math.floor((segundosTotales % 3600) / 60); // Variable corregida
                const segundos = segundosTotales % 60;

                // 4. Diseño "Dashboard"
                const textoPing = `
🏓 *PONG!* ───────────────
🚀 *Velocidad:* ${velocidad}ms
💾 *RAM Usada:* ${ram} MB
⏳ *Activo:* ${horas}h ${minutos}m ${segundos}s
🤖 *Estado:* ✅ Online
───────────────
> ${ownerData.botName} System`.trim();

                await sock.sendMessage(from, { text: textoPing }, { quoted: m });
            break; 


            // ==========================================
            // 🎵 COMANDO: TIKTOK (LINK Y BÚSQUEDA X4)
            // ==========================================
            case 'tt': case 'tiktok':
                // Usamos la variable global 'text' para que funcione con cualquier prefijo
                if (!text) return sock.sendMessage(from, { text: '⚠️ Escribe el enlace o una búsqueda.\nEj: .tt gatos graciosos' }, { quoted: m });

                await sock.sendMessage(from, { react: { text: "🎵", key: m.key } });

                try {
                    // MODO 1: ES UN LINK (Descarga directa)
                    if (text.includes('http')) {
                        const { data } = await axios.get(`https://www.tikwm.com/api/?url=${text}`);
                        
                        if (data.code === 0) {
                            await sock.sendMessage(from, { 
                                video: { url: data.data.play }, 
                                caption: `✅ *TikTok Descargado*\n👤 *Autor:* ${data.data.author.nickname}\n🤖 By: ${ownerData.botName}` 
                            }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { text: '❌ Enlace privado o inválido.' }, { quoted: m });
                        }
                    } 
                    // MODO 2: ES UNA BÚSQUEDA (Envía 4 videos)
                    else {
                        await sock.sendMessage(from, { text: `🔍 *Buscando 4 videos de:* ${text}...` }, { quoted: m });
                        const { data } = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(text)}`);
                        if (data.data && data.data.videos) {
                            // Tomamos máximo 4 videos
                            const videos = data.data.videos.slice(0, 4); 
                            for (let i = 0; i < videos.length; i++) {
                                const v = videos[i];
                                await sock.sendMessage(from, { 
                                    video: { url: v.play }, 
                                    caption: `🎥 *Video ${i + 1}/4*\n📌 *Título:* ${v.title}\n🤖 By: ${ownerData.botName}` 
                                }, { quoted: m });

                                // Pequeña pausa de 2.5s entre videos para no saturar WhatsApp
                                if (i < videos.length - 1) { 
                                    await new Promise(res => setTimeout(res, 2500)); 
                                }
                            }
                            await sock.sendMessage(from, { text: '✅ ¡Listo! 4 videos enviados.' }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { text: '❌ No encontré videos sobre eso.' }, { quoted: m });
                        }
                    }
                } catch (e) {
                    console.log("Error TikTok:", e);
                    await sock.sendMessage(from, { text: '❌ Error al intentar descargar.' }, { quoted: m });
                }
            break;



            // ==========================================
            // ℹ️ COMANDO: INFORMACIÓN DEL SISTEMA
            // ==========================================
            case 'info': case 'estado': case 'infobot':
                await sock.sendMessage(from, { react: { text: "💻", key: m.key } });

                // 1. Calculamos el Uptime (Tiempo activo)
                const uptimeInfo = process.uptime();
                const horasInfo = Math.floor(uptimeInfo / 3600);
                const minutosInfo = Math.floor((uptimeInfo % 3600) / 60);
                const segundosInfo = Math.floor(uptimeInfo % 60);

                // 2. Calculamos RAM y Velocidad
                const ramInfo = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const speedInfo = Date.now() - (m.messageTimestamp * 1000);

                // 3. Diseño del Mensaje (Usando tus datos reales)
                const textoInfo = `
💻 *INFORMACIÓN DEL SISTEMA* 💻
───────────────
👑 *Creador:* ${ownerData.nombre}
🤖 *Bot:* ${ownerData.botName}
🚀 *Velocidad:* ${speedInfo}ms
⏳ *Tiempo Activo:* ${horasInfo}h ${minutosInfo}m ${segundosInfo}s
💾 *RAM Usada:* ${ramInfo} MB
📱 *Plataforma:* Termux (Android)
📚 *Base:* Baileys (JavaScript)
🛡️ *Versión:* 1.0.0 Pro
───────────────`.trim();

                await sock.sendMessage(from, { text: textoInfo }, { quoted: m });
            break;


            // ==========================================
            // 💿 COMANDO: PLAY (MÚSICA Y VIDEO - YTDL)
            // ==========================================
            case 'play': case 'play2':
                // 1. Validación de texto
                if (!text) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción o video.' }, { quoted: m });

                // 🔄 CAMBIO SOLICITADO: .play es VIDEO, .play2 es AUDIO
                const isVideo = command === 'play'; 

                // Reacción según lo que se va a descargar
                await sock.sendMessage(from, { react: { text: isVideo ? "🎥" : "🎧", key: m.key } });
                await sock.sendMessage(from, { text: `🔍 *Buscando:* ${text}...` }, { quoted: m });

                try {
                    // 2. Buscamos en YouTube
                    const search = await yts(text);
                    const video = search.all[0];

                    if (!video) return sock.sendMessage(from, { text: '❌ No encontré resultados.' }, { quoted: m });

                    // 3. Tarjeta de información
                    await sock.sendMessage(from, { 
                        image: { url: video.thumbnail }, 
                        caption: `💿 *ENCONTRADO*\n📌 *Título:* ${video.title}\n⏱️ *Duración:* ${video.timestamp}\n🚀 *Descargando ${isVideo ? 'Video' : 'Audio'}...*` 
                    }, { quoted: m });

                    // 4. Preparar descarga
                    const nombreArchivo = `./temp_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`;
                    
                    // Configuración de YTDL (Intentando saltar bloqueo)
                    const stream = ytdl(video.url, { 
                        quality: isVideo ? 'lowest' : 'highestaudio', 
                        filter: isVideo ? 'audioandvideo' : 'audioonly',
                    });

                    const fileWriter = fs.createWriteStream(nombreArchivo);
                    stream.pipe(fileWriter);

                    // 5. Finalización y Envío
                    fileWriter.on('finish', async () => {
                        try {
                            if (isVideo) {
                                await sock.sendMessage(from, { 
                                    video: { url: nombreArchivo }, 
                                    caption: `🎥 *${video.title}*\n🤖 By: ${ownerData.botName}` 
                                }, { quoted: m });
                            } else {
                                await sock.sendMessage(from, { 
                                    audio: { url: nombreArchivo }, 
                                    mimetype: 'audio/mp4', // Formato más compatible para WhatsApp
                                    ptt: false 
                                }, { quoted: m });
                            }
                        } catch (errEnvio) {
                            console.log("Error al enviar archivo:", errEnvio);
                        }

                        // Limpieza
                        if (fs.existsSync(nombreArchivo)) fs.unlinkSync(nombreArchivo);
                        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
                    });

                    // Manejo de Errores de YouTube (403 Forbidden)
                    stream.on('error', (err) => {
                        console.log("Error YTDL Stream:", err);
                        sock.sendMessage(from, { text: '❌ YouTube bloqueó la descarga (Error de IP). Intenta más tarde.' }, { quoted: m });
                        if (fs.existsSync(nombreArchivo)) fs.unlinkSync(nombreArchivo);
                    });

                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: '❌ Error al procesar el comando.' }, { quoted: m });
                }
            break;





            // ==========================================
            // 🧠 COMANDO: INTELIGENCIA ARTIFICIAL (CASCADA PRO)
            // ==========================================
            case 'ia': case 'chatgpt': case 'gpt': case 'bot':
                // 1. Usamos la variable global 'text'
                if (!text) return sock.sendMessage(from, { text: `🤖 Hola *${pushName}*, soy ${ownerData.botName}. \n\n¿En qué puedo ayudarte? Escribe tu pregunta después del comando.` }, { quoted: m });

                await sock.sendMessage(from, { react: { text: "🧠", key: m.key } });

                // 2. Definimos la personalidad del Bot
                const promptSistema = `Tu nombre es ${ownerData.botName}, un asistente de WhatsApp útil, sarcástico y divertido creado por ${ownerData.nombre}. Responde siempre en español y usa emojis.`;

                try {
                    // ---------------------------------------------------------
                    // 🟢 INTENTO 1: POLLINATIONS (La más potente y estable actual)
                    // ---------------------------------------------------------
                    // Esta API soporta GPT-4o-mini gratis y suele dar respuestas largas
                    const url1 = `https://text.pollinations.ai/${encodeURIComponent(promptSistema + " La pregunta es: " + text)}`;
                    const res1 = await axios.get(url1);
                    
                    if (res1.data) {
                        return await sock.sendMessage(from, { text: `🤖 *${ownerData.botName}:*\n\n${res1.data}` }, { quoted: m });
                    }
                    throw new Error("Falló Pollinations");

                } catch (e1) {
                    try {
                        // ---------------------------------------------------------
                        // 🟡 INTENTO 2: HERCAI (Respaldo sólido)
                        // ---------------------------------------------------------
                        const url2 = `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(text)}`;
                        const res2 = await axios.get(url2);
                        if (res2.data && res2.data.reply) {
                            return await sock.sendMessage(from, { text: `🤖 *${ownerData.botName} (R):*\n\n${res2.data.reply}` }, { quoted: m });
                        }
                        throw new Error("Falló Hercai");

                    } catch (e2) {
                        try {
                            // ---------------------------------------------------------
                            // 🔴 INTENTO 3: SIMSIMI (Último recurso, respuestas cortas)
                            // ---------------------------------------------------------
                            const url3 = `https://api.simsimi.vn/v2/simsimi?text=${encodeURIComponent(text)}&lc=es`;
                            const res3 = await axios.get(url3);
                            if (res3.data && res3.data.success) {
                                return await sock.sendMessage(from, { text: `🤖 ${res3.data.success}` }, { quoted: m });
                            }
                            throw new Error("Falló todo");

                        } catch (e3) {
                            // Si absolutamente todo falla:
                            console.log("Error Total IA:", e3);
                           await sock.sendMessage(from, { text: "❌ Mis neuronas están apagadas. Intenta más tarde." }, { quoted: m });
                        }
                    }
                }
            break;



            // ==========================================
            // 💎 COMANDO: HD (REMASTERIZAR FOTO Y VIDEO)
            // ==========================================
            case 'hd': case 'remini':
                // 1. Función rápida para detectar el medio (Foto/Video/ViewOnce)
                const getMedia = (m) => {
                    const msg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!msg) return null;
                    if (msg.imageMessage) return { m: msg.imageMessage, type: 'image' };
                    if (msg.videoMessage) return { m: msg.videoMessage, type: 'video' };
                    if (msg.viewOnceMessage?.message?.imageMessage) return { m: msg.viewOnceMessage.message.imageMessage, type: 'image' };
                    if (msg.viewOnceMessage?.message?.videoMessage) return { m: msg.viewOnceMessage.message.videoMessage, type: 'video' };
                    return null;
                };

                const mediaData = getMedia(m);

                if (!mediaData) {
                    return sock.sendMessage(from, { text: '⚠️ Responde a una foto o video con *.hd*' }, { quoted: m });
                }

                await sock.sendMessage(from, { react: { text: "💎", key: m.key } });
                await sock.sendMessage(from, { text: '💎 *Procesando mejora...* (Esto puede tardar unos segundos)' }, { quoted: m });

                try {
                    // 2. Descargar el archivo
                    const stream = await downloadContentFromMessage(mediaData.m, mediaData.type);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    // Nombres temporales
                    const ext = mediaData.type === 'image' ? 'jpg' : 'mp4';
                    const tempIn = `./temp_hd_in_${Date.now()}.${ext}`;
                    const tempOut = `./hd_out_${Date.now()}.${ext}`;

                    fs.writeFileSync(tempIn, buffer);

                    // 3. Construir comando FFmpeg (Sin conflicto de variables)
                    let ffmpegCmd = '';
                    if (mediaData.type === 'image') {
                        // Filtro para fotos: Escala x2 + Enfoque (Unsharp)
                        ffmpegCmd = `ffmpeg -i ${tempIn} -vf "scale=iw*2:ih*2,unsharp=5:5:1.0:5:5:0.0" -q:v 2 ${tempOut}`;
                    } else {
                        // Filtro para videos: Escala x2 + Enfoque + Codec rápido
                        ffmpegCmd = `ffmpeg -i ${tempIn} -vf "scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0" -c:v libx264 -preset fast -crf 23 -c:a copy ${tempOut}`;
                    }

                    // 4. Ejecutar la magia
                    exec(ffmpegCmd, async (err) => {
                        // Borrar entrada inmediatamente para ahorrar espacio
                        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);

                        if (err) {
                            console.log("Error FFmpeg HD:", err);
                            return sock.sendMessage(from, { text: '❌ El archivo es muy pesado o corrupto.' }, { quoted: m });
                        }

                        // Enviar resultado
                        if (mediaData.type === 'image') {
                            await sock.sendMessage(from, { 
                                image: fs.readFileSync(tempOut), 
                                caption: '💎 *Calidad Mejorada (HD)*' 
                            }, { quoted: m });
                        } else {
                            await sock.sendMessage(from, { 
                                video: fs.readFileSync(tempOut), 
                                caption: '💎 *Video Remasterizado*' 
                            }, { quoted: m });
                        }

                        // Borrar salida
                        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                        await sock.sendMessage(from, { react: { text: "✨", key: m.key } });
                    });

                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: '❌ Error interno al procesar.' }, { quoted: m });
                }
            break;




            // ==========================================
            // 🎨 COMANDO: GENERADOR DE IMÁGENES IA (POTENTE)
            // ==========================================
            case 'imagen': case 'img': case 'dalle': case 'generar':
                // 1. Validación: Necesitamos un texto (prompt)
                if (!text) return sock.sendMessage(from, { text: `🎨 *¿Qué quieres que dibuje?*\n\nDescribe tu idea detalladamente.\nEj: *.generar un gato astronauta en la luna, estilo cyberpunk, 4k*` }, { quoted: m });

                await sock.sendMessage(from, { react: { text: "🎨", key: m.key } });
                // Mensaje de espera para calmar ansias
                await sock.sendMessage(from, { text: `🧠 *Imaginando:* "${text}"...\n_Esto puede tardar unos segundos._` }, { quoted: m });

                try {
                    // ---------------------------------------------------------
                    // 🥇 MOTOR 1: POLLINATIONS AI (Calidad SDXL/Midjourney)
                    // ---------------------------------------------------------
                    // Esta API es brutal. Es rápida y la calidad es top.
                    // Agregamos una 'seed' aleatoria para que la misma frase siempre de resultados distintos.
                    const seed = Math.floor(Math.random() * 999999);
                    // Usamos 'nologo=true' para intentar que salga limpia.
                    const imageUrl1 = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?seed=${seed}&nologo=true&width=1024&height=1024`;

                    // NOTA: Pollinations devuelve la imagen directa, así que solo mandamos la URL.
                    // Si el servidor está caído, Baileys lanzará error al intentar descargarla y saltará al catch.
                    await sock.sendMessage(from, {
                        image: { url: imageUrl1 },
                        caption: `🎨 *Generado por IA*\n📝 *Prompt:* ${text}\n🤖 By: ${ownerData.botName}`
                    }, { quoted: m });

                    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

                } catch (e1) {
                    console.log("Falló Pollinations, intentando backup...", e1.message);
                    try {
                        // ---------------------------------------------------------
                        // 🥈 MOTOR 2: HERCAI (Respaldo Sólido)
                        // ---------------------------------------------------------
                        // Hercai devuelve un JSON con la URL, así que usamos axios.
                        const res2 = await axios.get(`https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(text)}`);

                        if (res2.data && res2.data.url) {
                            await sock.sendMessage(from, {
                                image: { url: res2.data.url },
                                caption: `🎨 *Generado por IA (Backup)*\n📝 *Prompt:* ${text}\n🤖 By: ${ownerData.botName}`
                            }, { quoted: m });
                            await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
                        } else {
                            throw new Error("API Hercai no devolvió imagen");
                        }

                    } catch (e2) {
                        // ---------------------------------------------------------
                        // ❌ ERROR TOTAL (Si los dos fallan)
                        // ---------------------------------------------------------
                        console.log("Error Total Generar Imagen:", e2.message);
                        await sock.sendMessage(from, { text: "❌ Mis pinceles digitales fallaron. Los servidores de IA están saturados en este momento. Intenta más tarde." }, { quoted: m });
                    }
                }
            break;





            // ==========================================
            // 🎵 COMANDO: VIDEO A AUDIO (TOMP3)
            // ==========================================
            case 'tomp3': case 'toaudio': case 'mp3':
                // 1. Verificamos que responda a un video
                const msgVideo = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!msgVideo || !msgVideo.videoMessage) {
                    return sock.sendMessage(from, { text: '⚠️ Responde a un video con *.tomp3* para convertirlo.' }, { quoted: m });
                }

                await sock.sendMessage(from, { react: { text: "🎼", key: m.key } });

                try {
                    // 2. Descargamos el video
                    const stream = await downloadContentFromMessage(msgVideo.videoMessage, 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    // Nombres temporales
                    const tempIn = `./temp_vid_${Date.now()}.mp4`;
                    const tempOut = `./temp_aud_${Date.now()}.mp3`;
                    fs.writeFileSync(tempIn, buffer);

                    // 3. Convertimos con FFmpeg (Extrae audio limpio 192kbps)
                    // -vn = Sin video, -ar 44100 = Frecuencia estándar
                    exec(`ffmpeg -i ${tempIn} -vn -ar 44100 -ac 2 -b:a 192k ${tempOut}`, async (err) => {
                        // Borramos el video original de inmediato para ahorrar espacio
                        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);

                        if (err) {
                            console.log("Error FFmpeg:", err);
                            return sock.sendMessage(from, { text: '❌ Error al convertir el audio.' }, { quoted: m });
                        }

                        // 4. Enviamos el audio
                        await sock.sendMessage(from, { 
                            audio: fs.readFileSync(tempOut), 
                            mimetype: 'audio/mp4', 
                            ptt: false // Pon 'true' si quieres que se envíe como nota de voz
                        }, { quoted: m });

                        // Borramos el audio final
                        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
                    });

                } catch (e) {
                    console.log(e);
                    // Limpieza de emergencia
                    try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch {}
                    sock.sendMessage(from, { text: '❌ Error inesperado.' }, { quoted: m });
                }
            break;



            // ==========================================
            // 🏳️‍🌈 COMANDO: GAY (BARRA DE CARGA + VIDEO SONIDO)
            // ==========================================
            case 'gay':
                // 1. Detectar a quién escanear
                let mencionado = m.message.extendedTextMessage?.contextInfo?.participant 
                    || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] 
                    || m.key.participant; 

                // 2. Calcular porcentaje
                const porcentaje = Math.floor(Math.random() * 501); 

                // 3. Frase según el resultado
                let frase;
                if (porcentaje < 100) frase = "🌱 Apenas un toque sutil...";
                else if (porcentaje < 200) frase = "🌈 Con estilo y actitud...";
                else if (porcentaje < 300) frase = "🔥 Brillando con orgullo...";
                else if (porcentaje < 400) frase = "💃 Desbordando energía arcoíris...";
                else frase = "💖 ¡Explosión total de arcoíris, nivel legendario!";

                // 4. ANIMACIÓN DE CARGA
                // Enviamos el mensaje inicial y guardamos su 'key' (llave) para editarlo/borrarlo
                let { key } = await sock.sendMessage(from, { text: "🏳️‍🌈 *Escaneando...* 0%\n░░░░░░░░░░" }, { quoted: m });

                const pasos = [
                    "🏳️‍🌈 *Cargando...* 20%\n██░░░░░░░░",
                    "🏳️‍🌈 *Cargando...* 40%\n████░░░░░░",
                    "🏳️‍🌈 *Cargando...* 60%\n██████░░░░",
                    "🏳️‍🌈 *Cargando...* 80%\n████████░░",
                    "🏳️‍🌈 *¡COMPLETADO!* 100%\n██████████"
                ];

                // Bucle de animación (se edita cada 600ms para que sea fluido)
                for (let i = 0; i < pasos.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 600)); 
                    await sock.sendMessage(from, { text: pasos[i], edit: key });
                }

                // 5. EL TRUCO: BORRAMOS EL MENSAJE DE CARGA
                // Así no quedan "dos mensajes"
                await sock.sendMessage(from, { delete: key });

                // 6. ENVIAMOS EL VIDEO FINAL CON LOS DATOS
                await sock.sendMessage(from, { 
                    video: { url: 'https://files.catbox.moe/7lvpbf.mp4' }, 
                    // Sin gifPlayback para que tenga SONIDO 🔊
                    caption: `🏳️‍🌈 *RESULTADO FINAL*\n\n🧐 @${mencionado.split('@')[0]} es *${porcentaje}%* Gay.\n\n${frase}`, 
                    mentions: [mencionado] 
                }, { quoted: m });
            break;




            // ==========================================
            // 🔥 COMANDO: PENETRAR (CONVERSOR GIF -> MP4)
            // ==========================================
            case 'penetrar':
                // 1. Validar objetivo
                let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                             m.message?.extendedTextMessage?.contextInfo?.participant;

                if (!target) return sock.sendMessage(from, { text: '⚠️ Etiqueta a alguien o responde a su mensaje para penetrarlo.' }, { quoted: m });

                // 2. Sistema "Bolsa Mágica" (No Repetir)
                const gifsPenetrar = [
                    "https://files.catbox.moe/iy2ur2.gif",
                    "https://files.catbox.moe/8sbyqg.gif",
                    "https://files.catbox.moe/y8pyzg.gif",
                    "https://files.catbox.moe/takpwk.gif",
                    "https://files.catbox.moe/8jde6p.gif"
                ];

                if (!global.poolPenetrar || global.poolPenetrar.length === 0) {
                    global.poolPenetrar = [...gifsPenetrar];
                }

                const indiceRandom = Math.floor(Math.random() * global.poolPenetrar.length);
                const linkGif = global.poolPenetrar[indiceRandom];
                global.poolPenetrar.splice(indiceRandom, 1);

                // 3. Preparar Texto y Reacción
                const userName = `@${target.split('@')[0]}`;
                const textoHard = `
*TE HAN LLENADO LA CARA DE SEMEN POR PUTA Y ZORRA!*

*Le ha metido el pene a* ${userName} *con todo y condón hasta quedar seco, has dicho "por favor más duroooooo!, ahhhhhhh, ahhhhhh, hazme un hijo que sea igual de pitudo que tú!" mientras te penetraba y luego te ha dejado en silla de ruedas!*

${userName} 
✿ *YA TE HAN PENETRADO!*`;

                await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

                try {
                    // 4. EL FIX DE ORO: Descargar y Convertir
                    // Descargamos el GIF
                    const { data } = await axios.get(linkGif, { responseType: 'arraybuffer' });
                    
                    // Creamos nombres temporales
                    const pathGif = `./temp_pen_${Date.now()}.gif`;
                    const pathMp4 = `./temp_pen_${Date.now()}.mp4`;
                    fs.writeFileSync(pathGif, data);

                    // COMANDO FFMPEG: Convierte GIF a MP4 real para que WhatsApp no dé error
                    // Usamos un filtro de escala para evitar errores de tamaño
                    exec(`ffmpeg -i ${pathGif} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${pathMp4}`, async (err) => {
                        // Borramos el GIF original (ya no sirve)
                        if (fs.existsSync(pathGif)) fs.unlinkSync(pathGif);

                        if (err) {
                            console.log("Error conversión:", err);
                            return sock.sendMessage(from, { text: '❌ Error procesando el video.' }, { quoted: m });
                        }

                        // 5. ENVIAMOS EL MP4 SÓLIDO (HD y sin errores)
                        await sock.sendMessage(from, { 
                            video: fs.readFileSync(pathMp4), 
                            gifPlayback: true, // Se reproduce en bucle como GIF
                            caption: textoHard, 
                            mentions: [target] 
                        }, { quoted: m });

                        // Borramos el video temporal
                        if (fs.existsSync(pathMp4)) fs.unlinkSync(pathMp4);
                    });

                } catch (e) {
                    console.log("Error General Penetrar:", e);
                    await sock.sendMessage(from, { text: "❌ Error de conexión con el GIF." }, { quoted: m });
                }
            break;



            // ==========================================
            // 🔞 COMANDO: TETAS (MEGA-PACK 30 FUENTES + MIXER)
            // ==========================================
            case 'tetas': case 'tetitas': case 'boobs':
                // 1. Reacción clásica
                await sock.sendMessage(from, { react: { text: "🔞", key: m.key } });

                try {
                    // 2. VERIFICAR SI HAY FOTOS EN LA BOLSA (CACHÉ)
                    if (!global.cacheTetas || global.cacheTetas.length === 0) {
                        console.log("🔄 Recargando el Mega-Pack de Tetas (30 Sources)...");

                        // --- LISTA MAESTRA DE 30 FUENTES (VARIEDAD TOTAL) ---
                        const fuentesMaestras = [
                            // Clásicos y Grandes
                            'boobs', 'boobies', 'HugeBoobs', 'bigtits', 'stacked',
                            // Naturales y Caída
                            'TittyDrop', 'TheHangingBoobs', 'naturaltitties', 'homegrown', 'saggy',
                            // Estéticos y Detalles
                            'PerfectTits', 'pokies', 'ghostnipples', 'areolas', 'Nipples',
                            // Acciones y Ropa
                            'BiggerThanYouThought', 'braless', 'cleavage', 'sweatermeat', 'burstout',
                            // Tipos específicos
                            'smallboobs', 'Tinytits', 'PuffyNipples', 'torpedotits', 'fortyfivefiftyfive',
                            // Contexto
                            'onoff', 'RealGirls', 'milf', 'titstouchingtits', 'nicehooters'
                        ];

                        // ESTRATEGIA MIXER:
                        // Elegimos 10 canales AL AZAR de los 30 para esta recarga.
                        // Así evitamos errores por URL muy larga y mantenemos la frescura.
                        const fuentesRandom = fuentesMaestras.sort(() => 0.5 - Math.random()).slice(0, 10).join('+');

                        // Pedimos 60 fotos de golpe de esa mezcla
                        const { data } = await axios.get(`https://meme-api.com/gimme/${fuentesRandom}/60`);

                        // 3. FILTRADO ESTRICTO (Solo imágenes HD)
                        let fotosLimpias = data.memes.filter(meme => {
                            const ext = meme.url.split('.').pop().toLowerCase();
                            // Solo JPG/PNG, nada de videos que rompen el comando
                            return (ext === 'jpg' || ext === 'png' || ext === 'jpeg');
                        });

                        // 4. BARAJAR EL MAZO (SHUFFLE) 🃏
                        // Mezclamos todo para que no salgan ordenadas por canal
                        for (let i = fotosLimpias.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [fotosLimpias[i], fotosLimpias[j]] = [fotosLimpias[j], fotosLimpias[i]];
                        }

                        // Guardamos en la memoria global
                        global.cacheTetas = fotosLimpias;
                        console.log(`✅ Cache Tetas recargado con ${global.cacheTetas.length} fotos únicas.`);
                    }

                    // 5. SACAR FOTO (EXTRAER Y BORRAR)
                    if (global.cacheTetas.length === 0) throw new Error("No quedaron fotos validas");
                    const imagen = global.cacheTetas.pop(); // Saca la última y la borra

                    // 6. ENVIAR (INSTANTÁNEO)
                    await sock.sendMessage(from, { 
                        image: { url: imagen.url }, 
                        caption: '*😋 TETAS*' // Tu texto original
                    }, { quoted: m });

                } catch (e) {
                    console.log("Error Tetas:", e.message);
                    // Respaldo de emergencia (Nekobot)
                    try {
                        const backup = await axios.get(`https://nekobot.xyz/api/image?type=boobs`);
                        await sock.sendMessage(from, { 
                            image: { url: backup.data.message }, 
                            caption: '*😋 TETAS*' 
                        }, { quoted: m });
                    } catch (e2) {
                        await sock.sendMessage(from, { text: "❌ Error: Intenta de nuevo." }, { quoted: m });
                    }
                }
            break;



            // ==========================================
            // 🔞 COMANDO: VAGINA (MEGA-PACK 30 FUENTES + TEXTO LIMPIO)
            // ==========================================
            case 'vagina': case 'pussy': case 'concha': case 'panocha': case 'vag':
                // 1. Reacción
                await sock.sendMessage(from, { react: { text: "🥵", key: m.key } });

                try {
                    // 2. VERIFICAR CACHÉ (BOLSA DE FOTOS)
                    if (!global.cachePussy || global.cachePussy.length === 0) {
                        
                        console.log("🔄 Recargando Mega-Pack Vagina (30 Sources)...");

                        // --- LISTA MAESTRA (30 FUENTES) ---
                        const fuentesMaestras = [
                            'godpussy', 'perfectpussies', 'Innies', 'LipsThatGrip', 'SpreadEm',
                            'cleanpussy', 'shavedpussy', 'HairyPussy', 'bush', 'PussyMound',
                            'grool', 'wet', 'squirt', 'PussyJuice', 'Msdrool',
                            'rearpussy', 'PussyGap', 'upskirt', 'PresentingPussy', 'Simps',
                            'AsianPussy', 'blackpussy', 'latinas', 'milf', 'Amateur',
                            'pussy', 'vagina', 'nsfw', 'gonewild', 'RealGirls'
                        ];

                        // MEZCLADOR: Elegimos 10 al azar para esta recarga
                        const fuentesRandom = fuentesMaestras.sort(() => 0.5 - Math.random()).slice(0, 10).join('+');

                        // Pedimos 60 fotos
                        const { data } = await axios.get(`https://meme-api.com/gimme/${fuentesRandom}/60`);

                        // 3. FILTRADO (Solo imágenes)
                        let fotosLimpias = data.memes.filter(meme => {
                            const ext = meme.url.split('.').pop().toLowerCase();
                            return (ext === 'jpg' || ext === 'png' || ext === 'jpeg');
                        });

                        // 4. BARAJAR (SHUFFLE)
                        for (let i = fotosLimpias.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [fotosLimpias[i], fotosLimpias[j]] = [fotosLimpias[j], fotosLimpias[i]];
                        }

                        global.cachePussy = fotosLimpias;
                        console.log(`✅ Cache Pussy recargado: ${global.cachePussy.length} fotos.`);
                    }

                    // 5. SACAR FOTO
                    if (global.cachePussy.length === 0) throw new Error("Cache vacío");
                    const imagen = global.cachePussy.pop(); 

                    // 6. ENVIAR (CON TU TEXTO ORIGINAL)
                    await sock.sendMessage(from, { 
                        image: { url: imagen.url }, 
                        caption: '*😋 VAGINA*' // Texto corregido
                    }, { quoted: m });

                } catch (e) {
                    console.log("Error Pussy:", e.message);
                    // Respaldo
                    try {
                        const backup = await axios.get(`https://nekobot.xyz/api/image?type=pussy`);
                        await sock.sendMessage(from, { 
                            image: { url: backup.data.message }, 
                            caption: '*😋 VAGINA*' 
                        }, { quoted: m });
                    } catch (e2) {
                        await sock.sendMessage(from, { text: "❌ Error: Intenta de nuevo." }, { quoted: m });
                    }
                }
            break;



            // ==========================================
            // 🎮 COMANDO: PPT (CORREGIDO - NO CRASHEA)
            // ==========================================
            case 'ppt': case 'pvp':
                // 1. Normalizar la elección
                let userChoice = text.trim().toLowerCase();
                
                const validOptions = {
                    "piedra": "🪨", "roca": "🪨", "🪨": "🪨",
                    "papel": "📄", "📄": "📄",
                    "tijera": "✂️", "tijeras": "✂️", "✂️": "✂️"
                };

                if (!validOptions[userChoice]) {
                    return sock.sendMessage(from, { 
                        text: `⚠️ *Modo de uso:*\n\nEscribe *.ppt* seguido de tu elección:\n\n🪨 .ppt piedra\n📄 .ppt papel\n✂️ .ppt tijera` 
                    }, { quoted: m });
                }

                const userEmoji = validOptions[userChoice];
                const choices = ["🪨", "📄", "✂️"];
                const botEmoji = choices[Math.floor(Math.random() * choices.length)];

                // 2. Lógica del Ganador
                let resultText = "";
                
                if (userEmoji === botEmoji) {
                    resultText = "🤝 ¡Es un EMPATE!";
                } else if (
                    (userEmoji === "🪨" && botEmoji === "✂️") ||
                    (userEmoji === "📄" && botEmoji === "🪨") ||
                    (userEmoji === "✂️" && botEmoji === "📄")
                ) {
                    resultText = "🏆 ¡TÚ GANAS! (+150 XP)";
                } else {
                    resultText = "☠️ ¡YO GANO! (Perdiste honor)";
                }

                // 3. ANIMACIÓN (Variables con nombre único para no dar error)
                // Usamos 'keyPPT' en lugar de 'key' para que no choque con el comando .gay
                let { key: keyPPT } = await sock.sendMessage(from, { text: "🎲 *¡Piedra!* 🪨..." }, { quoted: m });
                
                const steps = [
                    "🎲 *¡Papel!* 📄...",
                    "🎲 *¡Tijera!* ✂️...",
                    "💥 *¡SHOOT!*"
                ];

                for (let step of steps) {
                    await new Promise(r => setTimeout(r, 600)); 
                    // Editamos usando la nueva variable única
                    await sock.sendMessage(from, { text: step, edit: keyPPT });
                }

                // 4. RESULTADO FINAL
                await new Promise(r => setTimeout(r, 400)); 
                
                const finalMessage = `
🎮 *PIEDRA, PAPEL O TIJERA* 🎮

👤 Tú: ${userEmoji}
🤖 Bot: ${botEmoji}

${resultText}
`;
                await sock.sendMessage(from, { text: finalMessage, edit: keyPPT });
            break;



            // ==========================================
            // 🛒 COMANDO: TIENDA / SHOP (LIMPIO Y FUNCIONAL)
            // ==========================================
            case 'tienda': case 'shop': { // { <--- Protege las variables
                // 1. Obtener Saldo Global
                const usuarioKey = m.key.participant || m.key.remoteJid;
                // Asegurar base de datos
                if (!global.banco) global.banco = {};
                if (!global.banco[usuarioKey]) global.banco[usuarioKey] = 0;

                const saldoActual = global.banco[usuarioKey];

                // 2. Reacción
                await sock.sendMessage(from, { react: { text: "🛍️", key: m.key } });

                // 3. Crear Encabezado
                let txt = `╭─── 〔 🏪 *MEGA MALL* 〕 ───\n`;
                txt += `│ 👤 *Cliente:* @${usuarioKey.split('@')[0]}\n`;
                txt += `│ 💰 *Saldo:* $${saldoActual.toLocaleString()}\n`;
                txt += `│ 🛒 *Uso:* .buy [item] (Ej: .buy ferrari)\n`;
                txt += `│\n`;

                // 4. Generar lista automática desde 'shopItems'
                let categorias = {};

                for (let id in shopItems) {
                    let item = shopItems[id];
                    if (!categorias[item.tipo]) categorias[item.tipo] = [];
                    // Formato: 🚗 Ferrari 488 ➔ $250,000 (ID: ferrari)
                    // Usamos item.nombre para que se vea bonito y 'id' para saber qué comprar
                    categorias[item.tipo].push(`│ ${item.emoji} *${item.nombre}* \n│    └─ 🏷️ ID: ${id} | 💲 $${item.precio.toLocaleString()}`);
                }

                // 5. Construir Menú (Solo si hay items en la categoría)
                if (categorias['coche'])   txt += `🚗 *VEHÍCULOS:*\n${categorias['coche'].join('\n')}\n│\n`;
                if (categorias['casa'])    txt += `🏰 *PROPIEDADES:*\n${categorias['casa'].join('\n')}\n│\n`;
                if (categorias['mineria']) txt += `⛏️ *MINERÍA (Ingresos):*\n${categorias['mineria'].join('\n')}\n│\n`;
                if (categorias['joya'])    txt += `💎 *LUJOS:*\n${categorias['joya'].join('\n')}\n`;

                txt += `╰──────────────────────`;

                // 6. Enviar
                await sock.sendMessage(from, { 
                    text: txt, 
                    mentions: [usuarioKey] 
                }, { quoted: m });

            } break; // } <--- Cierra protección



            // ==========================================
            // 🛍️ COMANDO: BUY / COMPRAR (OPTIMIZADO)
            // ==========================================
            case 'buy': case 'comprar': { // { <--- Scope seguro
                // 1. Identificación y Argumentos
                let userKey = m.key.participant || m.key.remoteJid;
                let itemID = args[0]?.toLowerCase(); // Detecta lo que escriben después del comando

                // Validación: ¿Escribió algo?
                if (!itemID) {
                    return sock.sendMessage(from, { text: `⚠️ ¿Qué quieres comprar?\nMira la lista con *.shop*` }, { quoted: m });
                }

                // Validación: ¿Existe el item en el catálogo?
                let item = shopItems[itemID]; // Busca en la variable global shopItems
                if (!item) {
                    return sock.sendMessage(from, { text: `❌ El artículo *"${itemID}"* no existe en la tienda.` }, { quoted: m });
                }

                // 2. Cargar/Inicializar Datos del Usuario
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;
                if (!global.inventario) global.inventario = {};
                if (!global.inventario[userKey]) global.inventario[userKey] = [];

                let saldo = global.banco[userKey];

                // 3. Verificar Dinero
                if (saldo < item.precio) {
                    return sock.sendMessage(from, { 
                        text: `💸 *Estás pobre.*\nTe faltan *$${(item.precio - saldo).toLocaleString()}* para comprar: ${item.nombre}.` 
                    }, { quoted: m });
                }

                // 4. Verificar Duplicados (Lógica inteligente)
                // Si ya lo tiene Y NO ES (joya ni minería), bloqueamos la compra.
                // (O sea, solo puedes tener 1 Ferrari, pero infinitas GPUs o Anillos)
                if (global.inventario[userKey].includes(itemID) && item.tipo !== 'joya' && item.tipo !== 'mineria') {
                    return sock.sendMessage(from, { text: `⚠️ Ya tienes un *${item.nombre}* en tu propiedad.` }, { quoted: m });
                }

                // 5. TRANSACCIÓN
                global.banco[userKey] -= item.precio;      // Restamos dinero
                global.inventario[userKey].push(itemID);   // Agregamos al inventario

                // 6. GUARDADO AUTOMÁTICO (Para no perder datos si se apaga)
                // Usamos las rutas que definimos al principio del archivo
                guardarJSON(rutaBanco, global.banco);
                guardarJSON(rutaInventario, global.inventario);

                // 7. Mensaje de Éxito
                await sock.sendMessage(from, { 
                    text: `✅ *COMPRA EXITOSA*\n\n📦 Artículo: ${item.emoji} ${item.nombre}\n💰 Nuevo saldo: $${global.banco[userKey].toLocaleString()}` 
                }, { quoted: m });

            } break; // } <--- Cierre seguro



            // ==========================================
            // 🎒 COMANDO: INVENTARIO / INV (OPTIMIZADO)
            // ==========================================
            case 'inv': case 'inventario': { // { <--- Scope seguro
                // 1. Identificar Usuario
                const userKey = m.key.participant || m.key.remoteJid;

                // 2. Cargar Inventario Seguro
                if (!global.inventario) global.inventario = {};
                const items = global.inventario[userKey] || [];

                // Si no tiene nada...
                if (items.length === 0) {
                    return sock.sendMessage(from, { 
                        text: "🎒 *Tu inventario está vacío.*\nVe a gastar tu dinero con *.shop*" 
                    }, { quoted: m });
                }

                // 3. Lógica de Conteo (Agrupar items repetidos)
                // Convierte: ['gpu', 'gpu', 'coche']  --->  { gpu: 2, coche: 1 }
                let conteo = {};
                items.forEach(id => { 
                    conteo[id] = (conteo[id] || 0) + 1; 
                });

                // 4. Construir Mensaje
                let txt = `🎒 *INVENTARIO DE @${userKey.split('@')[0]}*\n──────────────────\n`;
                let valorTotal = 0;

                for (let id in conteo) {
                    let itemData = shopItems[id]; // Buscamos info en el catálogo global

                    // Solo mostramos si el item existe en la tienda (seguridad)
                    if (itemData) {
                        txt += `▪️ ${itemData.emoji} *${itemData.nombre}* (x${conteo[id]})\n`;
                        // Calculamos el valor acumulado
                        valorTotal += itemData.precio * conteo[id];
                    }
                }

                txt += `──────────────────\n`;
                txt += `💰 *Valor de Activos:* $${valorTotal.toLocaleString()}`;

                // 5. Enviar
                await sock.sendMessage(from, { 
                    text: txt, 
                    mentions: [userKey] 
                }, { quoted: m });

            } break; // } <--- Cierre seguro



            // ==========================================
            // 🎰 COMANDO: SLOT / CASINO (ANIMADO ULTRA)
            // ==========================================
            case 'slot': case 'casino': case 'apostar': { 
                // 1. Configuración Inicial
                const userKey = m.key.participant || m.key.remoteJid;
                const apuestaStr = args[0]; // Usamos args[0] limpio

                // Ayuda visual
                if (!apuestaStr) {
                    return sock.sendMessage(from, { 
                        text: `🎰 *CASINO ROYALE*\n\n📝 Uso: *.slot [cantidad]*\n🔥 Ej: .slot 1000\n🔥 Ej: .slot all (Todo o nada)` 
                    }, { quoted: m });
                }

                // 2. Gestión de Dinero (Global)
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;

                let saldo = global.banco[userKey];
                let apuesta = 0;

                // Lógica para "all" (Apostar todo) o números con k/m
                if (apuestaStr.toLowerCase() === 'all' || apuestaStr.toLowerCase() === 'todo') {
                    apuesta = saldo;
                } else {
                    apuesta = parseInt(apuestaStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));
                }

                // Validaciones
                if (isNaN(apuesta) || apuesta < 100) return sock.sendMessage(from, { text: "⚠️ La apuesta mínima es de $100." }, { quoted: m });
                if (saldo < apuesta) return sock.sendMessage(from, { text: `💸 *No tienes fondos.*\nTe faltan: $${(apuesta - saldo).toLocaleString()}` }, { quoted: m });

                // 3. COBRAMOS LA ENTRADA (Importante cobrar antes de girar)
                global.banco[userKey] -= apuesta;

                // 4. ANIMACIÓN DE GIRO (Suspenso) 🔄
                // Definimos los emojis (Items)
                const items = ["🍒", "🍋", "🍇", "🍉", "🔔", "💎", "7️⃣"];
                // Enviamos el mensaje base y guardamos su ID (keySlot)
                // Usamos 'keySlot' para que no choque con la variable 'key' de otros comandos
                let { key: keySlot } = await sock.sendMessage(from, { text: "🎰 | ⬜ | ⬜ | ⬜ | Girando..." }, { quoted: m });

                // Efecto de giro rápido (3 frames)
                for (let i = 0; i < 3; i++) {
                    await new Promise(r => setTimeout(r, 300)); // Velocidad de giro
                    const rAzar = items[Math.floor(Math.random() * items.length)];
                    await sock.sendMessage(from, { text: `🎰 | ${rAzar} | ${rAzar} | ${rAzar} | 💫`, edit: keySlot });
                }

                // 5. RESULTADO DEFINITIVO
                // Calculamos los 3 rodillos finales
                const r1 = items[Math.floor(Math.random() * items.length)];
                const r2 = items[Math.floor(Math.random() * items.length)];
                const r3 = items[Math.floor(Math.random() * items.length)];

                // 6. CÁLCULO DE GANANCIAS
                let ganancia = 0;
                let mensajeResultado = "";
                let estado = "";

                if (r1 === r2 && r2 === r3) {
                    // --- JACKPOT (3 Iguales) ---
                    // Si son 7️⃣ o 💎 paga MUCHO MÁS (x10), si no x5
                    const multiplicador = (r1 === "7️⃣" || r1 === "💎") ? 10 : 5;
                    ganancia = apuesta * multiplicador;
                    global.banco[userKey] += ganancia;
                    estado = "🏆 ¡JACKPOT MÍTICO!";
                } else if (r1 === r2 || r2 === r3 || r1 === r3) {
                    // --- PAR (2 Iguales) ---
                    ganancia = Math.floor(apuesta * 1.5); // Recuperas y ganas la mitad
                    global.banco[userKey] += ganancia;
                    estado = "🌟 ¡BUENA JUGADA!";
                    mensajeResultado = `🤏 Casi... 2 iguales.\n💰 Ganaste: $${ganancia.toLocaleString()}`;
                } else {
                    // --- PERDEDOR ---
                    estado = "📉 PERDISTE";
                    mensajeResultado = `💸 Se esfumaron $${apuesta.toLocaleString()}`;
                }

                // Guardamos en la base de datos (seguridad)
                if (typeof guardarJSON === 'function') guardarJSON(rutaBanco, global.banco);

                // 7. EDICIÓN FINAL (Muestra el resultado)
                const textoFinal = `
🎰 *CASINO ROYALE* 🎰
────────────────
       │ ${r1} │ ${r2} │ ${r3} │
────────────────
${estado}
${mensajeResultado}

🏦 *Saldo:* $${global.banco[userKey].toLocaleString()}
`.trim();

                await sock.sendMessage(from, { text: textoFinal, edit: keySlot });

            } break;



            // ==========================================
            // 🔴 COMANDO: RULETA / ROULETTE (ANIMADA + NÚMEROS)
            // ==========================================
            case 'ruleta': case 'roulette': { 
                const userKey = m.key.participant || m.key.remoteJid;
                // 1. Parsear argumentos (Elección y Apuesta)
                // args[0] = A qué apuestas (rojo, negro, verde, 0-36)
                // args[1] = Cuánto apuestas
                let eleccion = args[0]?.toLowerCase(); 
                let apuestaStr = args[1];

                if (!eleccion || !apuestaStr) {
                    return sock.sendMessage(from, { 
                        text: `🔴 *CASINO RULETA*\n\n📝 Uso: *.ruleta [opción] [cantidad]*\n\n📌 *Opciones:*\n🎨 Colores: rojo, negro, verde\n🔢 Números: 0-36 (Paga x36)\n\n🔥 *Ejemplos:*\n.ruleta rojo 500\n.ruleta 7 1000\n.ruleta negro all` 
                    }, { quoted: m });
                }

                // 2. Gestión de Dinero (Global)
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;

                let saldo = global.banco[userKey];
                let apuesta = 0;

                // Soporte "all" y "k/m"
                if (apuestaStr.toLowerCase() === 'all' || apuestaStr.toLowerCase() === 'todo') {
                    apuesta = saldo;
                } else {
                    apuesta = parseInt(apuestaStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));
                }

                // Validaciones
                if (isNaN(apuesta) || apuesta < 100) return sock.sendMessage(from, { text: "⚠️ Apuesta mínima: $100" }, { quoted: m });
                if (saldo < apuesta) return sock.sendMessage(from, { text: `💸 *No tienes fondos.*\nTe faltan: $${(apuesta - saldo).toLocaleString()}` }, { quoted: m });

                // 3. COBRAMOS LA ENTRADA
                global.banco[userKey] -= apuesta;

                // 4. ANIMACIÓN DE GIRO 🔄
                // Enviamos mensaje inicial
                let { key: keyRuleta } = await sock.sendMessage(from, { text: "🎲 La bola está girando...\n⚪ ... 🔴 ... ⚫ ... ⚪" }, { quoted: m });

                // Efecto de giro (simula la bola pasando por números)
                const frames = [
                    "🎲 Girando...\n🔴 32 ... ⚫ 15 ... 🔴 19",
                    "🎲 Girando...\n⚫ 4 ... 🔴 21 ... ⚫ 2",
                    "🎲 Girando...\n🔴 25 ... ⚫ 17 ... 🔴 34",
                    "🎲 Girando...\n🟢 0 ... 🔴 3 ... ⚫ 26"
                ];

                for (let frame of frames) {
                    await new Promise(r => setTimeout(r, 500)); // Velocidad
                    await sock.sendMessage(from, { text: frame, edit: keyRuleta });
                }

                // 5. RESULTADO FINAL
                await new Promise(r => setTimeout(r, 500)); // Pausa dramática
                // Generamos el número ganador (0 - 36)
                let resultadoNum = Math.floor(Math.random() * 37);
                // Determinamos el color del resultado
                // 0 = Verde, Pares = Negro, Impares = Rojo (Lógica simple)
                let resultadoColor = (resultadoNum === 0) ? 'verde' : (resultadoNum % 2 === 0) ? 'negro' : 'rojo';
                let emojiBola = resultadoColor === 'rojo' ? '🔴' : resultadoColor === 'negro' ? '⚫' : '🟢';

                // 6. CÁLCULO DE GANANCIAS
                let ganancia = 0;
                let estado = "📉 PERDISTE";
                let multiplicador = 0;

                // CASO A: Apostó a un NÚMERO exacto (Ej: .ruleta 7 100)
                if (!isNaN(eleccion)) {
                    if (parseInt(eleccion) === resultadoNum) {
                        multiplicador = 36; // ¡Paga x36!
                        ganancia = apuesta * multiplicador;
                        estado = "🏆 ¡PLENO! (Número Exacto)";
                    }
                } 
                // CASO B: Apostó a un COLOR (Ej: .ruleta rojo 100)
                else {
                    if (eleccion === resultadoColor) {
                        if (eleccion === 'verde') {
                            multiplicador = 15; // Verde paga x15
                            estado = "🍀 ¡VERDE DE LA SUERTE!";
                        } else {
                            multiplicador = 2; // Rojo/Negro paga x2
                            estado = "✅ ¡GANASTE!";
                        }
                        ganancia = apuesta * multiplicador;
                    }
                }

                // 7. PAGAR Y GUARDAR
                if (ganancia > 0) {
                    global.banco[userKey] += ganancia;
                }
                // Aseguramos guardado
                if (typeof guardarJSON === 'function') guardarJSON(rutaBanco, global.banco);

                // 8. MENSAJE FINAL
                let txt = `🔴 *RULETA CASINO* ⚫\n────────────────\n`;
                txt += `📢 Resultado: ${emojiBola} *[ ${resultadoNum} ${resultadoColor.toUpperCase()} ]*\n`;
                txt += `────────────────\n`;
                txt += `${estado}\n`;
                if (ganancia > 0) {
                    txt += `💰 Ganaste: $${ganancia.toLocaleString()}\n(Multiplicador x${multiplicador})`;
                } else {
                    txt += `💸 Perdiste: $${apuesta.toLocaleString()}`;
                }
                txt += `\n\n🏦 *Saldo:* $${global.banco[userKey].toLocaleString()}`;

                await sock.sendMessage(from, { text: txt, edit: keyRuleta });

            } break;



            // ==========================================
            // 🔫 COMANDO: ROBAR / ROB (CRIMEN)
            // ==========================================
            case 'robar': case 'rob': case 'crimen': { 
                const userKey = m.key.participant || m.key.remoteJid;
                // 1. Validar Víctima
                // Detecta mención (@) o respuesta a un mensaje
                let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                             m.message.extendedTextMessage?.contextInfo?.participant;

                if (!target) return sock.sendMessage(from, { text: "🔫 *Debes etiquetar a tu víctima o responder su mensaje.*" }, { quoted: m });
                // No robarse a sí mismo ni al bot
                if (target === userKey) return sock.sendMessage(from, { text: "⚠️ No puedes robarte a ti mismo, genio." }, { quoted: m });
                if (target.includes(sock.user.id.split(':')[0])) return sock.sendMessage(from, { text: "🛡️ ¡Soy la policía! No puedes robarme." }, { quoted: m });

                // 2. Inicializar Cooldowns (Tiempos de espera)
                if (!global.cooldowns) global.cooldowns = {};
                if (!global.cooldowns[userKey]) global.cooldowns[userKey] = {};

                // Tiempo de espera: 15 Minutos
                let tiempoEspera = 15 * 60 * 1000; 
                let ultimoRobo = global.cooldowns[userKey].rob || 0;
                let ahora = Date.now();

                if (ahora - ultimoRobo < tiempoEspera) {
                    let restante = msToTime(tiempoEspera - (ahora - ultimoRobo));
                    return sock.sendMessage(from, { text: `🚓 *La policía te está buscando.*\nEscóndete y vuelve a intentarlo en: *${restante}*` }, { quoted: m });
                }

                // 3. Inicializar Bancos
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;
                if (!global.banco[target]) global.banco[target] = 0;

                let dineroVictima = global.banco[target];
                let dineroLadron = global.banco[userKey];

                // Regla: La víctima debe tener algo que valga la pena (mínimo $1000)
                if (dineroVictima < 1000) {
                    return sock.sendMessage(from, { text: `🐀 @${target.split('@')[0]} es demasiado pobre (menos de $1000).\nNo vale la pena el riesgo.`, mentions: [target] }, { quoted: m });
                }

                // Regla opcional: El ladrón necesita dinero para la fianza ($500 mínimo)
                // if (dineroLadron < 500) return sock.sendMessage(from, { text: "⚠️ Necesitas mínimo $500 para sobornos o fianza." }, { quoted: m });

                // 4. EL ATRACO (Probabilidad 40% Éxito)
                // Math.random() da un número entre 0 y 1. Si es menor a 0.4, ganas.
                let esExito = Math.random() < 0.4; 

                if (esExito) {
                    // --- ÉXITO ---
                    // Robas entre el 10% y el 30% de su dinero
                    let porcentaje = (Math.random() * (0.30 - 0.10) + 0.10);
                    let botin = Math.floor(dineroVictima * porcentaje);

                    global.banco[target] -= botin;
                    global.banco[userKey] += botin;

                    await sock.sendMessage(from, { 
                        text: `🔫 *¡ATRACO EXITOSO!* 💰\n\nLe has robado *$${botin.toLocaleString()}* a @${target.split('@')[0]}.\n¡Corre antes de que llame a la policía!`, 
                        mentions: [target] 
                    }, { quoted: m });

                } else {
                    // --- FRACASO ---
                    // La multa es entre $1000 y $5000
                    let multa = Math.floor(Math.random() * 4000) + 1000;
                    global.banco[userKey] -= multa;

                    await sock.sendMessage(from, { 
                        text: `🚓 *¡TE ATRAPARON!* 🚔\n\nLa policía te detuvo y tuviste que pagar una fianza de *$${multa.toLocaleString()}*.\n(Ahora tu saldo es: $${global.banco[userKey].toLocaleString()})` 
                    }, { quoted: m });
                }

                // 5. Guardar Cooldown y Datos
                global.cooldowns[userKey].rob = ahora;
                // Usamos la función genérica guardarJSON que definimos antes
                if (typeof guardarJSON === 'function') {
                    guardarJSON(rutaBanco, global.banco);
                    guardarJSON(rutaCooldowns, global.cooldowns);
                }

            } break;



            // ==========================================
            // ⛏️ COMANDO: MINAR / MINE (CRYPTO FARM)
            // ==========================================
            case 'mine': case 'minar': { 
                const userKey = m.key.participant || m.key.remoteJid;

                // 1. Cargar Inventario Global
                if (!global.inventario) global.inventario = {};
                let misItems = global.inventario[userKey] || [];

                // 2. Calcular Poder de Minado
                // Aquí definimos cuánto paga cada máquina por hora
                let gananciaTotal = 0;
                let maquinas = 0;

                // Recorremos el inventario del usuario
                misItems.forEach(id => {
                    // Verificamos si el item existe en la tienda y es de tipo 'mineria'
                    if (shopItems[id] && shopItems[id].tipo === 'mineria') {
                        maquinas++;
                        // TABLA DE GANANCIAS (Ajusta los números si quieres)
                        if (id === 'gpu')  gananciaTotal += 1500;   // GPU paga $1,500
                        if (id === 'asic') gananciaTotal += 8000;   // ASIC paga $8,000
                        if (id === 'farm') gananciaTotal += 85000;  // Granja paga $85,000
                    }
                });

                // Si no tiene máquinas...
                if (gananciaTotal === 0) {
                    return sock.sendMessage(from, { 
                        text: "⛏️ *No tienes equipos de minería.*\nVe a la tienda con *.shop* y compra una GPU o una Granja para empezar a ganar dinero." 
                    }, { quoted: m });
                }

                // 3. Verificar Cooldown (1 Hora)
                if (!global.cooldowns) global.cooldowns = {};
                if (!global.cooldowns[userKey]) global.cooldowns[userKey] = {};

                let ultimoMinado = global.cooldowns[userKey].mine || 0;
                let ahora = Date.now();
                let tiempoEspera = 60 * 60 * 1000; // 1 Hora en milisegundos

                if (ahora - ultimoMinado < tiempoEspera) {
                    // Función simple para formatear tiempo restante
                    let restante = tiempoEspera - (ahora - ultimoMinado);
                    let minutos = Math.floor((restante / (1000 * 60)) % 60);
                    let segundos = Math.floor((restante / 1000) % 60);
                    return sock.sendMessage(from, { 
                        text: `🔋 *Equipos Recargando...*\nVuelve en: *${minutos}m ${segundos}s*` 
                    }, { quoted: m });
                }

                // 4. ANIMACIÓN DE TRABAJO (Opcional, le da realismo)
                await sock.sendMessage(from, { react: { text: "⚡", key: m.key } });

                // 5. PAGAR Y GUARDAR
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;

                global.banco[userKey] += gananciaTotal;
                // Actualizar tiempo
                global.cooldowns[userKey].mine = ahora;

                // Guardar en archivos
                if (typeof guardarJSON === 'function') {
                    guardarJSON(rutaBanco, global.banco);
                    // guardarJSON(rutaCooldowns, global.cooldowns); // Descomenta si usas archivo de cooldowns
                }

                // 6. REPORTE FINAL
                let txt = `🔌 *MINERÍA FINALIZADA* 🔌\n────────────────\n`;
                txt += `💻 Máquinas activas: *${maquinas}*\n`;
                txt += `💸 Ganancia generada: *$${gananciaTotal.toLocaleString()}*\n`;
                txt += `────────────────\n`;
                txt += `🏦 *Nuevo Saldo:* $${global.banco[userKey].toLocaleString()}`;

                await sock.sendMessage(from, { text: txt }, { quoted: m });

            } break;



            // ==========================================
            // 👤 COMANDO: PERFIL (PRO + IMAGEN FIJA)
            // ==========================================
            case 'perfil': case 'profile': case 'nivel': { 
                // 1. Reacción Estética
                await sock.sendMessage(from, { react: { text: "💳", key: m.key } });

                // 2. Datos Globales
                const userKey = m.key.participant || m.key.remoteJid;
                
                // Asegurar que existan los datos
                if (!global.banco) global.banco = {};
                if (!global.titulos) global.titulos = {};

                let saldo = global.banco[userKey] || 0;
                
                // 3. DEFINICIÓN DE RANGOS (NIVELES)
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

                // 4. CÁLCULO DE RANGO ACTUAL
                let role = roles[0].role;
                let nextRole = roles[1];
                let tituloPersonalizado = global.titulos[userKey] || null;

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

                // 5. BARRA DE PROGRESO
                let barra = ""; // Agregado 'let' para evitar errores
                let falta = 0;
                
                if (nextRole) {
                    let porcentaje = Math.floor((saldo / nextRole.limit) * 100);
                    if (porcentaje > 100) porcentaje = 100;
                    
                    // Dibujo de la barra (10 bloques)
                    let bloquesLlenos = Math.floor(porcentaje / 10);
                    let bloquesVacios = 10 - bloquesLlenos;
                    barra = "█".repeat(bloquesLlenos) + "░".repeat(bloquesVacios) + ` ${porcentaje}%`;
                    
                    falta = nextRole.limit - saldo;
                } else {
                    barra = "██████████ Nivel Máximo";
                }

                // 6. IMAGEN SOLICITADA (FIJA)
                const imagenPerfil = "https://files.catbox.moe/vnadnu.jpg";

                // 7. DISEÑO DEL MENSAJE
                let txt = `╭─── 〔 💳 *TARJETA VIP* 〕 ───\n`;
                txt += `│ 👤 *Usuario:* ${pushName}\n`;
                txt += `│ 🆔 *Tag:* @${userKey.split('@')[0]}\n`;
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
                    image: { url: imagenPerfil }, 
                    caption: txt, 
                    mentions: [userKey] 
                }, { quoted: m });

            } break; // <--- Cierre seguro



            // ==========================================
            // ☢️ COMANDO: REINICIAR ECONOMÍA (RESET TOTAL)
            // ==========================================
            case 'reseteco': case 'reseteconomia': { 
                // 1. Verificar si es el Dueño (Seguridad Extrema)
                if (!esOwner) {
                    return sock.sendMessage(from, { text: '⛔ *ACCESO DENEGADO*\nSolo mi Creador puede reiniciar la economía.' }, { quoted: m });
                }

                // 2. Vaciamos las variables GLOBALES en memoria
                global.banco = {};
                global.inventario = {}; // ¡Importante borrar los items también!
                global.cooldowns = {}; 
                // global.titulos = {}; // Descomenta si también quieres borrar los rangos personalizados

                // 3. Guardamos los archivos vacíos para que sea permanente
                // Usamos try-catch por si acaso falla la escritura
                try {
                    fs.writeFileSync('./banco.json', JSON.stringify({}));
                    fs.writeFileSync('./inventario.json', JSON.stringify({}));
                    fs.writeFileSync('./cooldowns.json', JSON.stringify({}));
                    // fs.writeFileSync('./titulos.json', JSON.stringify({}));

                    // 4. Mensaje de Confirmación
                    await sock.sendMessage(from, { 
                        text: `☢️ *¡ECONOMÍA REINICIADA!* ☢️\n\n🗑️ Se ha eliminado:\n- Todo el dinero\n- Todos los inventarios\n- Todos los tiempos de espera\n\n🤖 *Sistema:* ${ownerData.botName}` 
                    }, { quoted: m });

                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: '❌ Error al intentar borrar los archivos de la base de datos.' }, { quoted: m });
                }

            } break;



            // ==========================================
            // 🏆 COMANDO: BALTOP / RANKING (TOP 10 RICOS)
            // ==========================================
            case 'baltop': case 'ranking': case 'top': { 
                // 1. Obtener Base de Datos Global
                if (!global.banco) global.banco = {};

                // 2. Ordenar de Mayor a Menor (Ricos primero)
                // Convertimos el objeto { usuario: dinero } a un array [[usuario, dinero], ...]
                let sorted = Object.entries(global.banco).sort((a, b) => b[1] - a[1]);

                // Filtramos usuarios con dinero > 0 para no llenar la lista de pobres
                let ricos = sorted.filter(user => user[1] > 0);
                // Tomamos solo los 10 mejores
                let top10 = ricos.slice(0, 10); 

                if (top10.length === 0) {
                    return sock.sendMessage(from, { text: "📉 *Nadie tiene dinero aún.*\nSé el primero trabajando con *.work*" }, { quoted: m });
                }

                // 3. Construir la Lista
                let txt = `🏆 *TOP 10 MULTIMILLONARIOS* 🏆\n──────────────────\n`;
                let menciones = [];

                top10.forEach((user, index) => {
                    let medal = "";
                    if (index === 0) medal = "🥇";
                    else if (index === 1) medal = "🥈";
                    else if (index === 2) medal = "🥉";
                    else medal = `${index + 1}.`;

                    // user[0] es el ID (numero), user[1] es el dinero
                    txt += `${medal} @${user[0]}\n   └─ 💰 $${user[1].toLocaleString()}\n`;
                    // Guardamos la ID para que WhatsApp lo etiquete (azul)
                    menciones.push(user[0] + '@s.whatsapp.net');
                });

                txt += `──────────────────\n`;
                txt += `🤖 *${ownerData.botName} Economy System*`;
                // 4. Enviar con Menciones Reales
                await sock.sendMessage(from, { 
                    text: txt, 
                    mentions: menciones 
                }, { quoted: m });

            } break;


            // ==========================================
            // 📅 COMANDO: DAILY / DIARIO (5000 - 10000)
            // ==========================================
            case 'diario': case 'daily': { 
                const userKey = m.key.participant || m.key.remoteJid;

                // 1. Inicializar Cooldowns Globales
                if (!global.cooldowns) global.cooldowns = {};
                if (!global.cooldowns[userKey]) global.cooldowns[userKey] = {};

                let time = global.cooldowns[userKey].daily || 0;
                let now = Date.now();
                let cooldown = 24 * 60 * 60 * 1000; // 24 Horas exactas

                // 2. Verificar si ya lo reclamó
                if (now - time < cooldown) {
                    let restante = msToTime(cooldown - (now - time));
                    return sock.sendMessage(from, { 
                        text: `⏱️ *¡Ya reclamaste tu diario!*\nVuelve en: *${restante}*` 
                    }, { quoted: m });
                }

                // 3. Calcular Premio (Entre 5000 y 10000)
                // Math.random() * 5001 da un número entre 0 y 5000.
                // Le sumamos 5000 base. Resultado final: 5000 a 10000.
                let premio = Math.floor(Math.random() * 5001) + 5000;
                // 4. Entregar Dinero
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;

                global.banco[userKey] += premio;
                // 5. Guardar Cooldown y Datos
                global.cooldowns[userKey].daily = now;

                if (typeof guardarJSON === 'function') {
                    guardarJSON(rutaBanco, global.banco);
                    // guardarJSON(rutaCooldowns, global.cooldowns); // Descomenta si usas archivo cooldowns
                }

                // 6. Mensaje de Éxito
                await sock.sendMessage(from, { 
                    text: `🎁 *RECOMPENSA DIARIA*\n\nHas recibido: 💰 *$${premio.toLocaleString()}*\n\n🏦 *Nuevo Saldo:* $${global.banco[userKey].toLocaleString()}` 
                }, { quoted: m });

            } break;



            // ==========================================
            // 🔨 COMANDO: WORK / TRABAJAR (SUELDO MEJORADO)
            // ==========================================
            case 'work': case 'trabajar': case 'chambear': { 
                const userKey = m.key.participant || m.key.remoteJid;

                // 1. Inicializar Globales
                if (!global.cooldowns) global.cooldowns = {};
                if (!global.cooldowns[userKey]) global.cooldowns[userKey] = {};

                let time = global.cooldowns[userKey].work || 0;
                let now = Date.now();
                let cooldown = 30 * 60 * 1000; // 30 Minutos

                // 2. Verificar Cansancio (Cooldown)
                if (now - time < cooldown) {
                    let restante = msToTime(cooldown - (now - time));
                    return sock.sendMessage(from, { 
                        text: `😓 *Estás agotado.*\nDescansa un poco y vuelve a chambear en: *${restante}*` 
                    }, { quoted: m });
                }

                // 3. Lista de Trabajos (Más variedad)
                let trabajos = [
                    { texto: "Ayudaste a una anciana a cruzar y te dio", emoji: "👵" },
                    { texto: "Trabajaste en McDonald's y ganaste", emoji: "🍔" },
                    { texto: "Vendiste limonada en la esquina y sacaste", emoji: "🍋" },
                    { texto: "Hackeaste un cajero (con suerte) y robaste", emoji: "💻" },
                    { texto: "Reparaste el servidor del bot y cobraste", emoji: "🤖" },
                    { texto: "Fuiste albañil por un día y te pagaron", emoji: "🧱" },
                    { texto: "Hiciste de Uber y ganaste", emoji: "🚗" },
                    { texto: "Vendiste fotos de tus pies (sin juzgar) y ganaste", emoji: "🦶" }
                ];

                let chamba = trabajos[Math.floor(Math.random() * trabajos.length)];

                // 4. Calcular Sueldo (AUMENTADO: Entre 6,000 y 20,000)
                // Math.random() * 14001 da 0 a 14000. + 6000 base = 6000 a 20000.
                let sueldo = Math.floor(Math.random() * 14001) + 6000;

                // 5. Pagar y Guardar
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;

                global.banco[userKey] += sueldo;
                global.cooldowns[userKey].work = now;

                if (typeof guardarJSON === 'function') {
                    guardarJSON(rutaBanco, global.banco);
                    // guardarJSON(rutaCooldowns, global.cooldowns);
                }

                // 6. Mensaje Final
                await sock.sendMessage(from, { 
                    text: `🔨 *${chamba.emoji} ¡TRABAJO TERMINADO!* \n\n${chamba.texto}: 💰 *$${sueldo.toLocaleString()}*\n\n🏦 *Nuevo Saldo:* $${global.banco[userKey].toLocaleString()}` 
                }, { quoted: m });

            } break;



            // ==========================================
            // 💸 COMANDO: TRANSFER / PAY (TRANSFERENCIAS)
            // ==========================================
            case 'pay': case 'transfer': case 'transferir': { 
                const userKey = m.key.participant || m.key.remoteJid;

                // 1. Detectar Destinatario (Mención)
                let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                // 2. Detectar Cantidad (Busca el argumento que NO es una mención)
                // Esto permite escribir ".pay 100 @user" o ".pay @user 100" indistintamente
                let amountStr = args.find(a => !a.includes('@') && !isNaN(parseInt(a.replace(/k|m/g, ''))));

                if (!target || !amountStr) {
                    return sock.sendMessage(from, { 
                        text: `💸 *SISTEMA BANCARIO*\n\n📝 Uso: *.pay [cantidad] [@usuario]*\n🔥 Ej: .pay 5k @Amigo` 
                    }, { quoted: m });
                }

                let targetKey = target.split('@')[0];
                let senderKey = userKey.split('@')[0];

                // 3. Validaciones de Seguridad
                if (target === userKey) return sock.sendMessage(from, { text: "⚠️ No puedes transferirte a ti mismo (Lavado de dinero detectado 🤨)." }, { quoted: m });

                // 4. Parsear Cantidad (Soporte k/m)
                let amount = parseInt(amountStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));

                if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: "⚠️ La cantidad debe ser un número positivo." }, { quoted: m });

                // 5. Verificar Fondos (Global)
                if (!global.banco) global.banco = {};
                if (!global.banco[userKey]) global.banco[userKey] = 0;
                // Inicializamos al destinatario por si es nuevo (para que no de NaN)
                if (!global.banco[target]) global.banco[target] = 0;

                if (global.banco[userKey] < amount) {
                    return sock.sendMessage(from, { 
                        text: `💸 *Fondos Insuficientes*\nTe faltan: $${(amount - global.banco[userKey]).toLocaleString()}` 
                    }, { quoted: m });
                }

                // 6. EJECUTAR TRANSACCIÓN
                global.banco[userKey] -= amount; // Restamos al que envía
                global.banco[target] += amount;  // Sumamos al que recibe

                // 7. Guardar Datos
                if (typeof guardarJSON === 'function') guardarJSON(rutaBanco, global.banco);

                // 8. Recibo de Transferencia
                await sock.sendMessage(from, { 
                    text: `✅ *TRANSFERENCIA EXITOSA*\n\n📤 *De:* @${senderKey}\n📥 *Para:* @${targetKey}\n💰 *Monto:* $${amount.toLocaleString()}\n\n🏦 *Tu Saldo:* $${global.banco[userKey].toLocaleString()}`, 
                    mentions: [userKey, target] 
                }, { quoted: m });

            } break;




            // ==========================================
            // 💰 COMANDO: ADDCOIN V.FINAL (FORZADO LID)
            // ==========================================
            case 'addcoin': case 'dar': { 
                // 1. SEGURIDAD (Usamos la variable 'esOwner' que ya tienes definida)
                if (!esOwner) return sock.sendMessage(from, { text: '⛔ Solo mi Creador puede usar esto.' }, { quoted: m });

                // 2. DETECTAR CANTIDAD
                let argsLocal = body.split(' ');
                let amountStr = argsLocal.find(a => a.match(/^\d+(k|m)?$/i)); 
                
                if (!amountStr) return sock.sendMessage(from, { text: `⚠️ Uso: .dar 10m` }, { quoted: m });

                // Convertir k/m a ceros
                let amount = parseInt(amountStr.toLowerCase().replace(/k/g, '000').replace(/m/g, '000000'));

                // 3. DETERMINAR DESTINATARIO
                let beneficiario;
                let mention = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                if (mention) {
                    // Si etiquetas a alguien, se lo das a él
                    beneficiario = mention.split('@')[0];
                } else {
                    // 🚨 SI NO ETIQUETAS A NADIE, VA DIRECTO A TU LID
                    beneficiario = "191809682694179@lid"; 
                }

                // 4. TRANSACCIÓN (Usando global.banco como el resto de tus comandos)
                if (!global.banco) global.banco = {};
                
                // Sumamos el dinero
                global.banco[beneficiario] = (global.banco[beneficiario] || 0) + amount;

                // 5. GUARDADO FÍSICO
                fs.writeFileSync(rutaBanco, JSON.stringify(global.banco, null, 2));

                // 6. RESPUESTA
                await sock.sendMessage(from, { 
                    text: `✅ *TRANSACCIÓN EXITOSA*\n\n💰 *Añadido:* $${amount.toLocaleString()}\n👤 *Cuenta:* @${beneficiario.split('@')[0]}\n💳 *Saldo Actual:* $${global.banco[beneficiario].toLocaleString()}`,
                    mentions: [beneficiario.includes('@') ? beneficiario : beneficiario + '@s.whatsapp.net']
                }, { quoted: m });

            } break;




            // ==========================================
            // 📲 COMANDO: APK / MODAPK (DESCARGADOR PRO)
            // ==========================================
            case 'apk': case 'modapk': case 'app': { 
                // 1. Validación de Entrada
                // args.join(' ') toma todo el texto después del comando
                const busqueda = args.join(' ');

                if (!busqueda) {
                    return sock.sendMessage(from, { 
                        text: `📲 *APK DOWNLOADER*\n\n¿Qué aplicación buscas?\n📝 *Ej:* .apk WhatsApp\n📝 *Ej:* .apk Minecraft Mod` 
                    }, { quoted: m });
                }

                // 2. Feedback de "Buscando"
                await sock.sendMessage(from, { react: { text: "🔍", key: m.key } });
                try {
                    // 3. Consulta a la API (Aptoide)
                    const { data } = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(busqueda)}&limit=1`);

                    // Verificar si hubo resultados
                    if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
                        return sock.sendMessage(from, { text: `❌ No encontré resultados para: *"${busqueda}"*` }, { quoted: m });
                    }

                    const app = data.datalist.list[0];
                    const sizeMB = (app.size / 1048576).toFixed(2); // Convertir bytes a MB

                    // 4. Construcción de la Ficha Técnica
                    let txt = `╭─── 〔 📲 *STORE APP* 〕 ───\n`;
                    txt += `│ 🏷️ *Nombre:* ${app.name}\n`;
                    txt += `│ 📦 *Package:* ${app.package}\n`;
                    txt += `│ 🆚 *Versión:* ${app.vername}\n`;
                    txt += `│ ⚖️ *Peso:* ${sizeMB} MB\n`;
                    txt += `│ ⭐ *Rating:* ${app.stats.rating.avg.toFixed(1)}/5\n`;
                    txt += `│ 📅 *Actualizado:* ${app.updated.split(' ')[0]}\n`;
                    txt += `╰──────────────────────\n\n`;
                    // 5. Verificación de Seguridad (Peso)
                    // WhatsApp suele fallar enviando archivos de +100MB en bots simples.
                    // Ponemos límite de 200MB para proteger la conexión de tu bot.
                    if (app.size > 200 * 1048576) {
                        txt += `⚠️ *El archivo es muy pesado (${sizeMB} MB).*\nWhatsApp no permite enviarlo por aquí.\n\n🔗 *Descárgalo directo:* \n${app.file.path}`;
                        await sock.sendMessage(from, { 
                            image: { url: app.icon }, 
                            caption: txt 
                        }, { quoted: m });
                        return; // Detenemos aquí
                    }

                    txt += `🚀 *Descargando archivo... Por favor espera.*`;

                    // Enviar ficha con foto
                    await sock.sendMessage(from, { 
                        image: { url: app.icon }, 
                        caption: txt 
                    }, { quoted: m });

                    // 6. Enviar el Archivo (APK)
                    await sock.sendMessage(from, { react: { text: "⬇️", key: m.key } });

                    await sock.sendMessage(from, { 
                        document: { url: app.file.path }, 
                        mimetype: 'application/vnd.android.package-archive', 
                        fileName: `${app.name}.apk`,
                        caption: `🤖 *Descargado por ${ownerData.botName}*`
                    }, { quoted: m });

                    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

                } catch (error) {
                    console.log(error);
                    await sock.sendMessage(from, { text: `❌ Error de conexión con la tienda.` }, { quoted: m });
                }

            } break;



            // ==========================================
            // 📌 COMANDO: PINTEREST (ORIGINAL + SHUFFLE + LÍMITE 6)
            // ==========================================
            case 'pin': case 'pinterest': {
                // 1. Obtener texto de búsqueda
                const text = args.join(" ");
                
                if (!text) return sock.sendMessage(from, { text: `🍃 Ingresa lo que buscas. Ej: .pin Gatos` }, { quoted: m });

                await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

                try {
                    // ----------------------------------------------------
                    // TU FUNCIÓN ORIGINAL (EXACTA)
                    // ----------------------------------------------------
                    async function pinterestApi(query) {
                        const link = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=%7B%22options%22%3A%7B%22isPrefetch%22%3Afalse%2C%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%2C%22no_correct%22%3Atrue%2C%22rows%22%3A50%7D%2C%22context%22%3A%7B%7D%7D`;

                        const headers = {
                            'accept': 'application/json, text/javascript, */*; q=0.01',
                            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                            'referer': 'https://id.pinterest.com/',
                            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="114", "Chromium";v="114"',
                            'sec-fetch-mode': 'cors',
                            'sec-fetch-site': 'same-origin',
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
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
                    // ----------------------------------------------------

                    // 2. EJECUCIÓN MEJORADA
                    let images = await pinterestApi(text);

                    if (!images || images.length === 0) {
                        return sock.sendMessage(from, { text: `❌ No encontré resultados para "${text}".` }, { quoted: m });
                    }

                    // 👉 AQUÍ ESTÁ LA MAGIA DEL SHUFFLE (MEZCLAR)
                    // Baraja las fotos para que no salgan siempre las mismas al principio
                    images = images.sort(() => 0.5 - Math.random());

                    // 👉 AQUÍ ESTÁ EL LÍMITE DE 6 FOTOS
                    const limit = Math.min(6, images.length);
                    await sock.sendMessage(from, { text: `📌 *Pinterest:* ${text}\n🎲 *Enviando:* ${limit} imágenes aleatorias...` }, { quoted: m });

                    for (let i = 0; i < limit; i++) {
                        try {
                            await sock.sendMessage(from, { image: { url: images[i] } }, { quoted: m });
                            // Pequeña pausa de 1 segundo para evitar ban por spam
                            await new Promise(r => setTimeout(r, 1000));
                        } catch (e) {
                            console.log("Saltando imagen con error...");
                        }
                    }

                    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

                } catch (e) {
                    console.log(e);
                    await sock.sendMessage(from, { text: `❌ Error interno.` }, { quoted: m });
                }

            } break;



            // Cierre del Switch
            } 
        } catch (e) { 
            console.log("Error recuperado:", e); 
        }
    }); // Cierre del sock.ev.on('messages.upsert')
} // <--- 🛑 ESTA LLAVE CIERRA LA FUNCIÓN iniciarBot()

// ==========================================
// 🛠️ FUNCIONES AUXILIARES (FUERA DE iniciarBot)
// ==========================================

// 1. Función de Limpieza Automática
function autoLimpiarSistema() {
    try {
        const { exec } = require('child_process');
        const basura = [
            './*-player-script.js', 
            './temp_*', 
            './sticker_*', 
            './*.mp4', 
            './*.mp3', 
            './*.jpg', 
            './core.*'
        ];
        
        basura.forEach(patron => {
            exec(`rm -rf ${patron}`); 
        });

        console.log(`[${ownerData.botName}] 🧹 Mantenimiento automático ejecutado.`);
    } catch (e) {}
}

// 2. Parsers y Scrapers (XNXX, Google, etc)
function parseInfo(infoStr = '') {
    const lines = infoStr.split('\n').map(v => v.trim()).filter(Boolean);
    let dur = '', qual = '', views = '';
    if (lines.length > 0) {
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

async function searchXNXX(query) {
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

async function bufferToData(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// ==========================================
// 🚀 ARRANQUE DEL SISTEMA
// ==========================================

// 1. Limpieza inicial (segundo plano)
autoLimpiarSistema();

// 2. Encendido del Bot
iniciarBot(); 








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




