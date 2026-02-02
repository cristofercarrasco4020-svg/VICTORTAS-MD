const axios = require('axios'); 
const fs = require('fs');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const ytdl = require('@distube/ytdl-core'); 
const yts = require('yt-search'); 
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, fetchLatestBaileysVersion, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require("pino");
const readline = require("readline");

// ==========================================
// 👑 CONFIGURACIÓN DEL OWNER (CENTRALIZADA)
// ==========================================
// CAMBIA ESTO Y SE ACTUALIZA EN TODO EL BOT
const globalConfig = {
    ownerNumber: "526633147534",  // Tu número principal
    ownerLID: "191809682694179",  // Tu ID técnico
    ownerName: "Criss",           // Tu nombre
    botName: "Crissbot"           // Nombre del Bot
};

// Inicializamos lista de amigos/owners extra
global.realOwners = global.realOwners || [];

// ==========================================
// 📂 BASES DE DATOS
// ==========================================
const rutaWelcome = './welcome_config.json';
const rutaWelcome2 = './welcome2_config.json';
const welcomeDB = fs.existsSync(rutaWelcome) ? JSON.parse(fs.readFileSync(rutaWelcome)) : { files: [], audios: [], status: {}, lastFile: {}, lastAudio: {} };
const welcome2DB = fs.existsSync(rutaWelcome2) ? JSON.parse(fs.readFileSync(rutaWelcome2)) : { files: [], audios: [], status: {}, lastFile: {}, lastAudio: {} };

const guardarWelcome = () => fs.writeFileSync(rutaWelcome, JSON.stringify(welcomeDB, null, 2));
const guardarWelcome2 = () => fs.writeFileSync(rutaWelcome2, JSON.stringify(welcome2DB, null, 2));

let botActivo = true; 

// ==========================================
// ⚙️ INICIO DEL SISTEMA
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

    // 🔗 VINCULACIÓN
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
        } catch (e) { console.log("❌ Error al pedir código:", e.message); }
    }

    sock.ev.on('creds.update', saveCreds);

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
    // 📩 MANEJADOR DE MENSAJES (NÚCLEO)
    // ==========================================
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            
            const from = m.key.remoteJid;
            const type = Object.keys(m.message)[0];
            const body = m.message.conversation || m.message[type]?.caption || m.message[type]?.text || "";
            const sender = m.key.participant || m.key.remoteJid; 
            const isGroup = from.endsWith('@g.us');

            // Cargar nombre dinámico (por si usaste .setname)
            let BotName = globalConfig.botName;
            if (fs.existsSync('./config.json')) {
                try { BotName = JSON.parse(fs.readFileSync('./config.json')).nombre; } catch {}
            }

            // ==========================================
            // 👮‍♂️ SEGURIDAD: VERIFICACIÓN DE OWNER (CENTRALIZADA)
            // ==========================================
            // Usa los datos de la variable 'globalConfig' del inicio
            const esOwner = m.key.fromMe || 
                            sender.includes(globalConfig.ownerNumber) || 
                            sender.includes(globalConfig.ownerLID) || 
                            (global.realOwners && global.realOwners.includes(sender));

            // ==========================================
            // 🔋 COMANDOS BÁSICOS
            // ==========================================
            if (body === '.bot off') {
                if (!esOwner) return sock.sendMessage(from, { text: `❌ Solo ${globalConfig.ownerName} puede apagarme.` }, { quoted: m });
                botActivo = false;
                await sock.sendMessage(from, { text: `😴 *${BotName} durmiendo...*` }, { quoted: m });
                return; 
            }
            if (body === '.bot on') {
                if (!esOwner) return; 
                botActivo = true;
                await sock.sendMessage(from, { text: `🔥 *${BotName} DESPIERTO.*` }, { quoted: m });
                return;
            }

            if (!botActivo && !esOwner) return; // 🔒 Candado Global

            // ==========================================
            // 🧠 MEMORIA XNXX
            // ==========================================
            global.xnxxSession = global.xnxxSession || {};
            if (global.xnxxSession[from] && !isNaN(body) && !body.startsWith('.')) {
                const session = global.xnxxSession[from];
                const n = parseInt(body.trim());
                if (n > 0 && n <= session.result.length) {
                    try {
                        const link = session.result[n - 1].link;
                        const res = await xnxxdl(link); 
                        const dll = res.result.files.high || res.result.files.low;
                        await sock.sendMessage(from, { video: { url: dll }, caption: `🎥 ${res.result.title}` }, { quoted: m });
                        delete global.xnxxSession[from];
                        return;
                    } catch (e) { console.log(e); }
                }
            }

            // Consola
            console.log(`[MSG] ${m.pushName || sender.split('@')[0]}: ${body.slice(0, 20)}...`);

            // ==========================================
            // 💰 ECONOMÍA
            // ==========================================
            const rutaBanco = './banco.json';
            const rutaTitulos = './titulos.json';
            const leerJSON = (f) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
            let banco = leerJSON(rutaBanco);
            let titulos = leerJSON(rutaTitulos);
            let usuarioKey = sender.split('@')[0];
            if (!banco[usuarioKey]) banco[usuarioKey] = 0;

            // ==========================================
            // 📜 COMANDO: MENU
            // ==========================================
            if (body === '.menu' || body === '.help') {
                let mensajeMenu = { video: { url: 'https://files.catbox.moe/tll9q5.mp4' }, gifPlayback: true }; 
                if (fs.existsSync('./media_menu.jpg')) mensajeMenu = { image: fs.readFileSync('./media_menu.jpg') };
                else if (fs.existsSync('./media_menu.mp4')) mensajeMenu = { video: fs.readFileSync('./media_menu.mp4'), gifPlayback: true };

                let txt = `✨ *HOLA ${m.pushName}* ✨\n\n`;
                txt += `👑 *Owner:* ${globalConfig.ownerName}\n`;
                txt += `🤖 *Bot:* ${BotName}\n`;
                txt += `💰 *Banco:* $${banco[usuarioKey].toLocaleString()}\n`;
                txt += `\n*COMANDOS PRINCIPALES:*\n`;
                txt += `🔹 .owner / .delowner / .addcoin\n`;
                txt += `🔹 .welcome on / .setwel / .welaudi\n`;
                txt += `🔹 .play / .tt / .xnxx / .sticker\n`;
                txt += `🔹 .kick / .admin / .grupo cerrar\n`;
                txt += `\nBy ${globalConfig.ownerName}`;
                
                await sock.sendMessage(from, { ...mensajeMenu, caption: txt }, { quoted: m });
            }

            // ==========================================
            // 👮‍♂️ COMANDOS ADMINISTRACIÓN (CORREGIDOS)
            // ==========================================
            if (body.startsWith('.kick') || body.startsWith('.grupo') || body.startsWith('.admin')) {
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Solo grupos.' }, { quoted: m });
                
                // 1. Obtenemos lista de participantes UNA sola vez
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                
                // 2. Verificamos si TÚ eres admin
                const isAdmin = participants.find(p => p.id === sender)?.admin;
                
                // 3. Verificamos si EL BOT es admin (FIX IMPORTANTE)
                const botId = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                const isBotAdmin = participants.find(p => p.id === botId)?.admin;

                // Reglas de acceso
                if (!isAdmin && !esOwner) return sock.sendMessage(from, { text: '⛔ No eres admin.' }, { quoted: m });
                if (!isBotAdmin) return sock.sendMessage(from, { text: '⛔ El Bot no es admin. Dame admin primero.' }, { quoted: m });

                // .kick
                if (body.startsWith('.kick')) {
                    let victim = m.message.extendedTextMessage?.contextInfo?.participant || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (victim) await sock.groupParticipantsUpdate(from, [victim], 'remove');
                    else sock.sendMessage(from, {text: "⚠️ Etiqueta a alguien."}, {quoted: m});
                }
                // .grupo
                if (body.startsWith('.grupo')) {
                    if (body.includes('cerrar')) await sock.groupSettingUpdate(from, 'announcement');
                    if (body.includes('abrir')) await sock.groupSettingUpdate(from, 'not_announcement');
                }
                // .admin
                if (body.startsWith('.admin')) {
                    let victim = m.message.extendedTextMessage?.contextInfo?.participant || m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (victim) await sock.groupParticipantsUpdate(from, [victim], 'promote');
                    else sock.sendMessage(from, {text: "⚠️ Etiqueta a alguien."}, {quoted: m});
                }
            }

            // ==========================================
            // 💎 CONFIGURACIÓN DE BIENVENIDAS
            // ==========================================
            const esCmdWelcome = body.startsWith('.welcome') || body.startsWith('.setwel') || 
                                 body.startsWith('.welaudi') || body.startsWith('.delwe') || 
                                 body.startsWith('.delaudio');

            if (esCmdWelcome) {
                const groupMetadata = isGroup ? await sock.groupMetadata(from) : null;
                const isAdmin = groupMetadata ? groupMetadata.participants.find(p => p.id === sender)?.admin : false;

                // Activar/Desactivar
                if (body.includes(' on') || body.includes(' off')) {
                    if (!esOwner && !isAdmin) return sock.sendMessage(from, { text: '⛔ Solo admins.' }, { quoted: m });
                    const esIn = body.includes('2');
                    const db = esIn ? welcome2DB : welcomeDB;
                    db.status[from] = body.includes('on');
                    esIn ? guardarWelcome2() : guardarWelcome();
                    await sock.sendMessage(from, { text: `✅ ${esIn ? 'Bienvenidas' : 'Despedidas'} ${body.includes('on') ? 'ACTIVADAS' : 'DESACTIVADAS'}` }, { quoted: m });
                }
                
                // Setwel (Fotos/Videos)
                if (body.startsWith('.setwel')) {
                    if (!esOwner && !isAdmin) return;
                    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    const mime = quoted ? Object.keys(quoted)[0] : null;
                    if (!mime || (!mime.includes('image') && !mime.includes('video'))) return sock.sendMessage(from, {text: "📸 Responde a una foto/video"}, {quoted: m});
                    
                    const db = body.includes('2') ? welcome2DB : welcomeDB;
                    if (db.files.length >= 7) return sock.sendMessage(from, {text: "⚠️ Cupos llenos (7/7)"}, {quoted: m});

                    const buffer = await downloadContentFromMessage(quoted[mime], mime === 'imageMessage' ? 'image' : 'video');
                    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
                    const path = `./media_${Date.now()}.${mime === 'imageMessage' ? 'jpg' : 'mp4'}`;
                    fs.writeFileSync(path, buf);
                    
                    db.files.push({ path, type: mime === 'imageMessage' ? 'image' : 'video' });
                    body.includes('2') ? guardarWelcome2() : guardarWelcome();
                    await sock.sendMessage(from, { text: "✅ Archivo guardado." }, { quoted: m });
                }

                // Welaudi (Solo Audios)
                if (body.startsWith('.welaudi')) {
                    if (!esOwner && !isAdmin) return;
                    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted || !quoted.audioMessage) return sock.sendMessage(from, { text: '🎵 Responde a un AUDIO o NOTA DE VOZ.' }, { quoted: m });
                    
                    const db = body.includes('2') ? welcome2DB : welcomeDB;
                    if (db.audios.length >= 4) return sock.sendMessage(from, {text: "⚠️ Cupos de audio llenos (4/4)"}, {quoted: m});

                    const buffer = await downloadContentFromMessage(quoted.audioMessage, 'audio');
                    let buf = Buffer.from([]); for await (const chunk of buffer) buf = Buffer.concat([buf, chunk]);
                    const path = `./audio_${Date.now()}.mp3`;
                    fs.writeFileSync(path, buf);
                    
                    db.audios.push(path);
                    body.includes('2') ? guardarWelcome2() : guardarWelcome();
                    await sock.sendMessage(from, { text: "✅ Audio guardado." }, { quoted: m });
                }

                // Borrar
                if (body.startsWith('.delwe') || body.startsWith('.delaudio')) {
                    if (!esOwner && !isAdmin) return;
                    const esAudio = body.includes('audio');
                    const esIn = body.includes('2');
                    const db = esIn ? welcome2DB : welcomeDB;
                    const index = parseInt(body.split(' ')[1]) - 1;
                    const lista = esAudio ? db.audios : db.files;
                    
                    if (isNaN(index) || !lista[index]) return sock.sendMessage(from, { text: '❌ Número inválido.' }, { quoted: m });
                    
                    const borrar = esAudio ? lista[index] : lista[index].path;
                    if (fs.existsSync(borrar)) fs.unlinkSync(borrar);
                    lista.splice(index, 1);
                    esIn ? guardarWelcome2() : guardarWelcome();
                    await sock.sendMessage(from, { text: "🗑️ Eliminado." }, { quoted: m });
                }
            }

            // ==========================================
            // 👑 COMANDOS DE OWNER (USAN LA VARIABLE CENTRAL)
            // ==========================================
            if (body.startsWith('.owner')) {
                if (!esOwner) return; 
                const part = m.message?.extendedTextMessage?.contextInfo?.participant || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (part && !global.realOwners.includes(part)) {
                    global.realOwners.push(part);
                    await sock.sendMessage(from, { text: `👑 Nuevo owner agregado: @${part.split('@')[0]}`, mentions: [part] }, { quoted: m });
                }
            }

            if (body.startsWith('.delowner')) {
                if (!esOwner) return; 
                const part = m.message?.extendedTextMessage?.contextInfo?.participant || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (part && global.realOwners.includes(part)) {
                    global.realOwners = global.realOwners.filter(p => p !== part);
                    await sock.sendMessage(from, { text: `🗑️ Owner eliminado.` }, { quoted: m });
                }
            }

            if (body.startsWith('.addcoin')) {
                if (!esOwner) return;
                let cantidad = parseInt(body.split(' ')[1]);
                if (body.includes('k')) cantidad = parseInt(body.split(' ')[1]) * 1000;
                if (body.includes('m')) cantidad = parseInt(body.split(' ')[1]) * 1000000;
                
                const target = m.message?.extendedTextMessage?.contextInfo?.participant || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (target && !isNaN(cantidad)) {
                    banco[target.split('@')[0]] = (banco[target.split('@')[0]] || 0) + cantidad;
                    fs.writeFileSync(rutaBanco, JSON.stringify(banco));
                    await sock.sendMessage(from, { text: `💰 Enviados ${cantidad.toLocaleString()} a @${target.split('@')[0]}` }, { quoted: m });
                }
            }

            // ==========================================
            // 🎨 COMANDO: STICKER (NATIVO FFMPEG - SEGURO)
            // ==========================================
            if (body === '.s' || body === '.sticker') {
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
                const mime = (quoted.imageMessage || quoted.videoMessage || quoted.stickerMessage)?.mimetype || '';
                
                if (/image|video/.test(mime)) {
                     const type = mime.split('/')[0];
                     const stream = await downloadContentFromMessage(quoted[Object.keys(quoted)[0]], type);
                     let buffer = Buffer.from([]);
                     for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                     
                     // Definir rutas (Usamos concatenación simple para evitar errores de sintaxis)
                     const ext = type === 'image' ? 'jpg' : 'mp4';
                     const tempFile = './temp_' + Date.now() + '.' + ext;
                     const tempOut = './stick_' + Date.now() + '.webp';
                     fs.writeFileSync(tempFile, buffer);
                     
                     let cmd = "";
                     if (type === 'image') {
                         cmd = "ffmpeg -i " + tempFile + " -vcodec libwebp -filter:v \"scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse\" -f webp " + tempOut;
                     } else {
                         cmd = "ffmpeg -i " + tempFile + " -vcodec libwebp -filter:v \"scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse\" -loop 0 -ss 00:00:00 -t 00:00:10 -preset default -an -vsync 0 -s 512:512 " + tempOut;
                     }

                     exec(cmd, async (err) => {
                         if (!err) await sock.sendMessage(from, { sticker: fs.readFileSync(tempOut) }, { quoted: m });
                         else sock.sendMessage(from, { text: "Error sticker" }, { quoted: m });
                         
                         try { fs.unlinkSync(tempFile); fs.unlinkSync(tempOut); } catch {}
                     });
                }
            }

            // ==========================================
            // 🔞 COMANDOS DE DESCARGA & PREGUNTAS
            // ==========================================
            // XNXX
            if (body.startsWith('.xnxx')) {
                const text = body.slice(6).trim();
                if (text) {
                    if (text.includes('xnxx.com')) {
                        try {
                            const res = await xnxxdl(text);
                            await sock.sendMessage(from, { video: { url: res.result.files.high }, caption: res.result.title }, { quoted: m });
                        } catch { sock.sendMessage(from, {text: "Error descarga"}, {quoted: m}); }
                    } else {
                        const res = await search(encodeURIComponent(text));
                        if(res.result) {
                            const list = res.result.slice(0, 10).map((v, i) => `*${i + 1}* ┃ ${v.title}`).join('\n');
                            global.xnxxSession[from] = { result: res.result, timeout: setTimeout(() => delete global.xnxxSession[from], 60000) };
                            await sock.sendMessage(from, { text: `🔎 *RESULTADOS:*\n${list}\n\nResponde con el número.` }, { quoted: m });
                        }
                    }
                }
            }
            // IA
            if (body.startsWith('.ai') || body.startsWith('.ia')) {
                const pregunta = body.slice(4).trim();
                if (pregunta) {
                    try {
                        const url = `https://text.pollinations.ai/${encodeURIComponent("Responde breve y sarcástico: " + pregunta)}`;
                        const { data } = await axios.get(url);
                        await sock.sendMessage(from, { text: data }, { quoted: m });
                    } catch {}
                }
            }
            // Pinterest
            if (body.startsWith('.pin')) {
                const q = body.slice(4).trim();
                if (q) sock.sendMessage(from, { text: "⚠️ Usa la búsqueda de WhatsApp o descarga directa." }, { quoted: m });
            }
            // TikTok (TT)
            if (body.startsWith('.tt')) {
                 const q = body.slice(4).trim();
                 if(q) sock.sendMessage(from, { text: "🔍 Buscando..." }, { quoted: m });
                 // (Aquí iría tu lógica de TikTok si la librería funciona)
            }
            // Gay / Tetas / Penetrar
            if (body.startsWith('.gay')) sock.sendMessage(from, { text: `🏳️‍🌈 *${Math.floor(Math.random()*100)}% Gay*` }, { quoted: m });
            if (body.startsWith('.tetas')) {
                try {
                    const res = await axios.get(`https://nekobot.xyz/api/image?type=boobs`);
                    await sock.sendMessage(from, { image: { url: res.data.message }, caption: "🔞" }, { quoted: m });
                } catch {}
            }
            if (body.startsWith('.penetrar')) sock.sendMessage(from, { text: "🔥 *Penetración exitosa*" }, { quoted: m });

            // Subir Actu
            if (body === '.subiractu' && esOwner) {
                exec('git add . && git commit -m "Auto Update" && git push origin main', (e) => {
                    sock.sendMessage(from, { text: e ? "Error: " + e.message : "✅ Código subido a GitHub" }, { quoted: m });
                });
            }
            if (body === '.actualizar' && esOwner) {
                exec('git pull origin main', (e) => {
                    sock.sendMessage(from, { text: "✅ Actualizado. Reiniciando..." }, { quoted: m });
                    setTimeout(() => process.exit(0), 2000);
                });
            }
            // Info
            if (body === '.info') sock.sendMessage(from, { text: `Bot activo.\nRAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB` }, { quoted: m });

        } catch (e) { console.log(e); }
    });

    // ==========================================
    // 🚪 DETECTOR DE EVENTOS (BIENVENIDAS FIX)
    // ==========================================
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu;
            
            // 🚨 FIX: IGNORAR PROMOTE/DEMOTE (No saluda si dan admin)
            if (action === 'promote' || action === 'demote') return;

            const isRemove = action === 'remove';
            const db = isRemove ? welcomeDB : welcome2DB;
            
            if (db.status[id]) {
                const metadata = await sock.groupMetadata(id);
                const desc = metadata.desc ? metadata.desc.toString().slice(0, 100) : "Sin descripción";
                const fecha = new Date().toLocaleDateString('es-ES');
                const hora = new Date().toLocaleTimeString('es-ES');
                
                for (let item of participants) {
                    const num = typeof item === 'object' ? item.id : item; // Anti-crash
                    let txt = "";

                    // DISEÑO PREMIUM
                    if (isRemove) {
                        txt = `╭─「 🕊️ *ADIÓS* 🕊️ 」\n│ 👤 @${num.split('@')[0]}\n│ 🚪 Salió de: ${metadata.subject}\n│ 📅 ${fecha} - ${hora}\n│ 👥 Quedan: ${metadata.participants.length}\n╰───────────────────`;
                    } else {
                        txt = `╭─「 ✨ *HOLA* ✨ 」\n│ 👋 @${num.split('@')[0]}\n│ 🏰 Bienvenido a: ${metadata.subject}\n│ 📝 Desc: ${desc}\n│ 📅 ${fecha} - ${hora}\n│ 👥 Somos: ${metadata.participants.length}\n╰───────────────────`;
                    }
                    
                    if (db.files.length > 0) {
                        const media = db.files[Math.floor(Math.random() * db.files.length)];
                        await sock.sendMessage(id, { [media.type]: fs.readFileSync(media.path), caption: txt, mentions: [num] });
                    } else {
                        await sock.sendMessage(id, { text: txt, mentions: [num] });
                    }
                    if (db.audios.length > 0) {
                         const audio = db.audios[Math.floor(Math.random() * db.audios.length)];
                         await sock.sendMessage(id, { audio: fs.readFileSync(audio), mimetype: 'audio/mp4', ptt: true });
                    }
                }
            }
        } catch (e) { console.log("Error welcome:", e); }
    });
}

// FUNCIONES AUXILIARES (XNXX)
function parseInfo(infoStr = '') {
    const lines = infoStr.split('\n').map(v => v.trim()).filter(Boolean);
    let dur = '', qual = '', views = '';
    if (lines.length > 0) { const parts = lines.join(' ').split('-'); qual = parts[0]?.trim(); views = parts[1]?.trim(); }
    return { dur, qual, views };
}
async function xnxxdl(URL) {
    return new Promise((resolve, reject) => {
        fetch(URL).then(res => res.text()).then(res => {
            const $ = cheerio.load(res, { xmlMode: false });
            const title = $('meta[property="og:title"]').attr('content');
            const videoScript = $('#video-player-bg > script:nth-child(6)').html();
            const files = {
                low: (videoScript.match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],
                high: (videoScript.match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);') || [])[1]
            };
            resolve({ result: { title, info: {qual: 'HD', views: 'N/A'}, files } });
        }).catch(reject);
    });
}
async function search(query) {
    return new Promise((resolve, reject) => {
        fetch(`https://www.xnxx.com/search/${query}`).then(res => res.text()).then(res => {
            const $ = cheerio.load(res, { xmlMode: false });
            const results = [];
            $('div.mozaique').find('div.thumb-under').each(function() {
                const title = $(this).find('a').attr('title');
                const link = 'https://www.xnxx.com' + $(this).find('a').attr('href');
                if (title && link) results.push({ title, link });
            });
            resolve({ result: results });
        }).catch(reject);
    });
}
const fetch = require('node-fetch');

iniciarBot();

