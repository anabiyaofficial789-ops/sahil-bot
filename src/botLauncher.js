// ============================================
// SAHIL 804 - Bot Launcher
// Developer: Sahil Hacker
// ============================================
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { logger } = require('./utils/logger');
const { onMessagesUpsert, onMessagesDelete, onGroupParticipantsUpdate, onConnectionUpdate, storeMessage } = require('./handlers/messageHandler');
const { getSessionPath, updateSession } = require('./utils/sessionManager');
const path = require('path');
const pino = require('pino');

const silentLogger = pino({ level: 'silent' });

async function launchBot(sessionId) {
  const authDir = getSessionPath(sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silentLogger) },
    logger: silentLogger,
    printQRInTerminal: false,
    browser: ['SAHIL 804', 'Chrome', '4.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: '' }),
  });

  function reconnect() { launchBot(sessionId); }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => onConnectionUpdate(sock, update, reconnect, sessionId));
  sock.ev.on('messages.upsert', (m) => {
    for (const msg of m.messages || []) storeMessage(msg);
    onMessagesUpsert(sock, m);
  });
  sock.ev.on('messages.delete', (d) => onMessagesDelete(sock, d));
  sock.ev.on('group-participants.update', (update) => onGroupParticipantsUpdate(sock, update));

  return sock;
}

module.exports = { launchBot };
