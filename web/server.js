// ============================================
// SAHIL 804 - Web Server (Main Entry for Hosting)
// Developer: Sahil Hacker
// ============================================
require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const bodyParser   = require('body-parser');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const helmet       = require('helmet');
const http         = require('http');
const { Server }   = require('socket.io');
const path         = require('path');
const fs           = require('fs-extra');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const pino         = require('pino');

const config       = require('../src/config/config');
const { logger }   = require('../src/utils/logger');
const { onMessagesUpsert, onMessagesDelete, onGroupParticipantsUpdate, onConnectionUpdate, storeMessage } = require('../src/handlers/messageHandler');
const { createSession, updateSession, getSession, getAllSessions, deleteSession, getSessionPath, activeSessions } = require('../src/utils/sessionManager');
const { generateSessionId } = require('../src/utils/helpers');

const SESSIONS_DIR = path.resolve(path.join(__dirname, '../sessions'));

const app    = express();
app.set('trust proxy', 1); // ✅ FIX: Reverse proxy (Render/Railway) ke liye zaroori
const server = http.createServer(app);
const io     = new Server(server);
const silentLogger = pino({ level: 'silent' });

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (path.extname(filePath) === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' },
}));

const generalLimiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Too many requests' } });
app.use('/api/', generalLimiter);

const pairLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 5,
  message: { error: 'Bahut zyada pair requests. 10 minute baad try karein.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function safeSessionPath(sessionId) {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(sessionId)) return null;
  const resolved = path.resolve(path.join(SESSIONS_DIR, sessionId));
  if (!resolved.startsWith(SESSIONS_DIR + path.sep) && resolved !== SESSIONS_DIR) return null;
  return resolved;
}

const waSockets = new Map();

async function launchUserBot(sessionId) {
  const authDir = safeSessionPath(sessionId);
  if (!authDir) { logger.warn(`Invalid sessionId blocked: ${sessionId}`); return; }
  await fs.ensureDir(authDir);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silentLogger) },
    logger: silentLogger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: '' }),
  });

  waSockets.set(sessionId, sock);

  function reconnect() {
    const s = getSession(sessionId);
    if (s?.status === 'logged_out') return;
    setTimeout(() => launchUserBot(sessionId), 5000);
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      io.to(sessionId).emit('qr', qr);
      updateSession(sessionId, { status: 'qr' });
    }
    if (connection === 'open') {
      updateSession(sessionId, { status: 'online', connectedAt: Date.now() });
      io.to(sessionId).emit('connected', { sessionId });
      io.emit('sessions_update', getAllSessions());
      try {
        const myJid = sock.user.id;
        await sock.sendMessage(myJid, {
          text: `✅ *${config.bot.name} Connected!*\n\n🔑 *Session ID:* ${sessionId}\n\n📌 Is ID ko website par "Deploy Bot" mein paste karein\n\n👑 Developer: ${config.owner.name}`,
        });
      } catch (_) {}
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      updateSession(sessionId, { status: code === 401 ? 'logged_out' : 'offline' });
      io.emit('sessions_update', getAllSessions());
      if (code !== 401) reconnect();
    }
    await onConnectionUpdate(sock, update, reconnect, sessionId);
  });

  sock.ev.on('messages.upsert', (m) => {
    for (const msg of m.messages || []) storeMessage(msg);
    onMessagesUpsert(sock, m);
  });
  sock.ev.on('messages.delete', (d) => onMessagesDelete(sock, d));
  sock.ev.on('group-participants.update', (u) => onGroupParticipantsUpdate(sock, u));

  return sock;
}

app.post('/api/pair', pairLimiter, async (req, res) => {
  try {
    let { number } = req.body;
    if (!number) return res.json({ success: false, error: 'Number dein.' });
    number = number.replace(/[^0-9]/g, '');
    if (number.length < 10) return res.json({ success: false, error: 'Sahi number dein.' });

    const sessionId = generateSessionId();
    const authDir   = safeSessionPath(sessionId);
    if (!authDir) return res.json({ success: false, error: 'Internal error.' });
    await fs.ensureDir(authDir);

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version }          = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silentLogger) },
      logger: silentLogger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
    });

    sock.ev.on('creds.update', saveCreds);

    // Socket ready hone ka wait — 3 second
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      sock.ev.on('connection.update', (update) => {
        if (update.connection === 'connecting') {
          clearTimeout(timeout);
          setTimeout(resolve, 1500);
        }
      });
    });

    let code;
    try {
      code = await sock.requestPairingCode(number);
    } catch (e) {
      logger.error('Pair code error:', e.message);
      return res.json({ success: false, error: `Pair code nahi mila: ${e.message}. Number check karein (country code ke saath, jaise 923001234567).` });
    }

    createSession(sessionId, { number, status: 'pairing' });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        updateSession(sessionId, { status: 'online', connectedAt: Date.now() });
        waSockets.set(sessionId, sock);
        try {
          const myJid = sock.user.id;
          await sock.sendMessage(myJid, {
            text: `✅ *SAHIL 804 Bot Paired!*\n\n🔑 *Aapka Session ID:*\n\n*${sessionId}*\n\n📌 *Ab kya karein:*\n1. Is ID ko copy karein\n2. Website par "Deploy Bot" tab mein jayein\n3. ID paste karein aur Start dabayein\n\n🔒 Yeh ID kisi ko mat dein!\n\n👑 Developer: ${config.owner.name}`,
          });
          io.emit('sessions_update', getAllSessions());
        } catch (_) {}

        setTimeout(() => {
          try { sock.ws.close(); } catch (_) {}
          waSockets.delete(sessionId);
          launchUserBot(sessionId).catch(err =>
            logger.warn(`Auto-deploy fail for ${sessionId}: ${err.message}`));
        }, 3000);
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== 401 && !waSockets.has(sessionId)) {
          setTimeout(() => launchUserBot(sessionId), 3000);
        }
      }
    });

    res.json({ success: true, code: code.match(/.{1,4}/g).join('-'), sessionId });
  } catch (err) {
    logger.error('Pair error:', err.message);
    res.json({ success: false, error: 'Server error. Dobara try karein.' });
  }
});

app.post('/api/deploy', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.json({ success: false, error: 'Session ID dein.' });

    const authDir = safeSessionPath(sessionId);
    if (!authDir || !fs.existsSync(authDir)) {
      return res.json({ success: false, error: 'Session nahi mili. Pehle pair karein.' });
    }

    const credsFile = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsFile)) {
      return res.json({ success: false, error: 'Credentials nahi milein. Pehle pair karein.' });
    }

    if (waSockets.has(sessionId)) {
      return res.json({ success: true, message: 'Bot pehle se chal raha hai!' });
    }

    updateSession(sessionId, { status: 'connecting' });
    launchUserBot(sessionId);
    res.json({ success: true, message: 'Bot start ho raha hai! WhatsApp par notification milegi.' });
  } catch (err) {
    logger.error('Deploy error:', err.message);
    res.json({ success: false, error: 'Server error.' });
  }
});

app.get('/health', (req, res) => {
  const sessions = getAllSessions();
  const online   = sessions.filter(s => s.status === 'online').length;
  res.json({
    status:   'ok',
    uptime:   Math.floor(process.uptime()),
    memory:   `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
    sessions: { total: sessions.length, online },
  });
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.json({ success: false, error: 'Login required.' });
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Wrong password.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admin/sessions', requireAdmin, (req, res) => {
  res.json({ success: true, sessions: getAllSessions() });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const sessions = getAllSessions();
  const online   = sessions.filter(s => s.status === 'online').length;
  const offline  = sessions.filter(s => s.status === 'offline' || s.status === 'logged_out').length;
  const uptime   = process.uptime();
  const memMB    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  res.json({ success: true, stats: { total: sessions.length, online, offline, uptime: Math.floor(uptime), memory: memMB } });
});

app.post('/api/admin/stop', requireAdmin, async (req, res) => {
  const { sessionId } = req.body;
  const sock = waSockets.get(sessionId);
  if (sock) {
    try { await sock.ws.close(); } catch (_) {}
    waSockets.delete(sessionId);
  }
  updateSession(sessionId, { status: 'stopped' });
  io.emit('sessions_update', getAllSessions());
  res.json({ success: true });
});

app.post('/api/admin/restart', requireAdmin, async (req, res) => {
  const { sessionId } = req.body;
  const sock = waSockets.get(sessionId);
  if (sock) { try { await sock.ws.close(); } catch (_) {} waSockets.delete(sessionId); }
  setTimeout(() => launchUserBot(sessionId), 2000);
  res.json({ success: true });
});

app.post('/api/admin/delete', requireAdmin, async (req, res) => {
  const { sessionId } = req.body;
  const sock = waSockets.get(sessionId);
  if (sock) { try { await sock.ws.close(); } catch (_) {} waSockets.delete(sessionId); }
  deleteSession(sessionId);
  io.emit('sessions_update', getAllSessions());
  res.json({ success: true });
});

app.post('/api/admin/feature', requireAdmin, (req, res) => {
  const { feature, value } = req.body;
  if (config.features.hasOwnProperty(feature)) {
    config.features[feature] = value === true || value === 'true';
    io.emit('feature_update', config.features);
    res.json({ success: true, features: config.features });
  } else {
    res.json({ success: false, error: 'Feature nahi mili.' });
  }
});

app.get('/api/admin/features', requireAdmin, (req, res) => {
  res.json({ success: true, features: config.features });
});

io.on('connection', (socket) => {
  socket.on('join', (sessionId) => socket.join(sessionId));
  socket.on('get_sessions', () => {
    if (socket.request?.session?.isAdmin) {
      socket.emit('sessions_update', getAllSessions());
    }
  });
});

async function autoStartSessions() {
  const sessions = getAllSessions();
  logger.info(`${sessions.length} sessions milein — restart ho rahi hain...`);
  for (const s of sessions) {
    if (s.status !== 'logged_out') {
      const authDir   = safeSessionPath(s.id);
      const credsFile = authDir ? path.join(authDir, 'creds.json') : null;
      if (!credsFile || !fs.existsSync(credsFile)) {
        logger.warn(`Session ${s.id} skipped — no creds.json`);
        continue;
      }
      await launchUserBot(s.id).catch(err => logger.warn(`Session ${s.id} start fail: ${err.message}`));
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} mila — graceful shutdown shuru...`);
  for (const [id, sock] of waSockets) {
    try { await sock.ws.close(); } catch (_) {}
    logger.info(`Socket closed: ${id}`);
  }
  waSockets.clear();
  server.close(() => {
    logger.info('HTTP server band ho gaya. Bye!');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Force exit after timeout'); process.exit(1); }, 10_000).unref();
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

server.listen(config.port, async () => {
  logger.info(`🌐 Server chalu: http://localhost:${config.port}`);
  logger.info(`👑 Developer: ${config.owner.name}`);
  logger.info(`🔑 Admin Panel: /admin`);
  await autoStartSessions();
});

module.exports = { app, server };
