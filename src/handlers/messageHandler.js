// ============================================
// SAHIL 804 - Message Handler
// Developer: Sahil Hacker
// BUG #4: msgStore replaced with proper
//         circular-buffer approach — O(1) eviction
// ============================================
const config = require('../config/config');
const { handleCommand, react, isOwner } = require('../commands');
const { logger } = require('../utils/logger');
const { updateSession } = require('../utils/sessionManager');
const { formatUptime } = require('../utils/helpers');

const autoReplies = {
  'hi':        `👋 *Salam!* Main *${config.bot.name}* hoon!\n📌 *.menu* likh kar sab commands dekhein`,
  'hello':     `😊 *Hello!* Khush amdeed!\n📌 *.menu* likh kar commands dekhein`,
  'salam':     `☪️ *Wa Alaikum Assalam!*\n📌 *.menu* likh kar commands dekhein`,
  'assalam':   `☪️ *Wa Alaikum Assalam wa Rahmatullahi wa Barakatuh!*\n📌 *.menu* likh kar commands dekhein`,
  'bot':       `🤖 *Jee haan! Main yahan hoon!*\n📌 *.menu* likhein`,
  'help':      `💡 Help k liye *.menu* likhein`,
  'alive':     `✅ *Haan! Main bilkul theek hoon!* 💪`,
  'owner':     `👑 *Developer: ${config.owner.name}*\n📞 wa.me/${config.owner.number}`,
  'developer': `👑 *Developer: ${config.owner.name}*\n📞 wa.me/${config.owner.number}`,
  'speed':     `⚡ Bot fast chal raha hai! Uptime: ${formatUptime(Date.now() - config.bot.startTime)}`,
};

function getMsgText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || ''
  ).trim().toLowerCase();
}

// Anti-link regex
const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com\/)/i;

async function onMessagesUpsert(sock, { messages, type }) {
  if (type !== 'notify') return;

  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    if (msg.key.remoteJid === 'status@broadcast') continue;

    const jid    = msg.key.remoteJid;
    const text   = getMsgText(msg);
    const sender = msg.key.participant || msg.key.remoteJid;

    try {
      // Auto read
      if (config.features.autoRead) {
        await sock.readMessages([msg.key]).catch(() => {});
      }

      // Anti-link (groups only)
      if (config.features.antiLink && jid.endsWith('@g.us') && LINK_REGEX.test(text) && !isOwner(sender)) {
        try {
          await sock.sendMessage(jid, { delete: msg.key });
          await sock.sendMessage(jid, { text: `⚠️ @${sender.split('@')[0]}, links allowed nahi hain!`, mentions: [sender] }, { quoted: msg });
        } catch (_) {}
        continue;
      }

      // Auto react
      if (config.features.autoReact && text) {
        const emoji = config.reactEmojis[Math.floor(Math.random() * config.reactEmojis.length)];
        await react(sock, msg, emoji).catch(() => {});
      }

      // Commands
      if (text.startsWith(config.bot.prefix)) {
        await handleCommand(sock, msg);
        continue;
      }

      // Auto reply
      if (config.features.autoReply) {
        for (const [trigger, response] of Object.entries(autoReplies)) {
          if (text === trigger || text.includes(trigger)) {
            await sock.sendMessage(jid, { text: response }, { quoted: msg });
            break;
          }
        }
      }

    } catch (err) {
      logger.error(`Message handler error: ${err.message}`);
    }
  }
}

// ════════════════════════════════════════════
//  🗑️ Anti-delete: circular-buffer msgStore
//  BUG #4 FIX: O(1) eviction using a separate
//  keys array as a queue — no slow Map iteration
// ════════════════════════════════════════════
const MSG_STORE_LIMIT = 500;
const msgStore     = new Map();   // id → stored data
const msgStoreKeys = [];          // insertion-order queue

async function onMessagesDelete(sock, { keys }) {
  if (!config.features.antiDelete) return;
  for (const key of keys) {
    const stored = msgStore.get(key.id);
    if (stored && !stored.fromMe) {
      try {
        const sender = stored.participant || stored.remoteJid;
        await sock.sendMessage(stored.remoteJid, {
          text: `🗑️ *Deleted Message Alert!*\n👤 From: @${sender.split('@')[0]}\n\n📝 Message:\n${stored.text || '[Media]'}`,
          mentions: [sender],
        });
      } catch (_) {}
    }
    msgStore.delete(key.id);
  }
}

function storeMessage(msg) {
  if (!msg.key?.id) return;

  // If we already have this message ID, just update in-place (no key duplication)
  if (msgStore.has(msg.key.id)) {
    msgStore.set(msg.key.id, {
      fromMe:     msg.key.fromMe,
      remoteJid:  msg.key.remoteJid,
      participant: msg.key.participant,
      text:       getMsgText(msg),
    });
    return;
  }

  // Add new entry
  msgStore.set(msg.key.id, {
    fromMe:     msg.key.fromMe,
    remoteJid:  msg.key.remoteJid,
    participant: msg.key.participant,
    text:       getMsgText(msg),
  });
  msgStoreKeys.push(msg.key.id);

  // BUG #4 FIX: O(1) eviction — shift() removes the oldest key from the queue
  while (msgStoreKeys.length > MSG_STORE_LIMIT) {
    const oldestKey = msgStoreKeys.shift();
    msgStore.delete(oldestKey);
  }
}

async function onGroupParticipantsUpdate(sock, { id, participants, action }) {
  if (action === 'add' && config.features.welcomeMsg) {
    try {
      const meta = await sock.groupMetadata(id);
      for (const jid of participants) {
        const num = jid.split('@')[0];
        await sock.sendMessage(id, {
          text: `🎉 *Welcome to ${meta.subject}!*\n\n👋 @${num} aap ka swaagat hai!\n📌 *.menu* likh kar bot commands dekhein\n\n_${config.bot.name} | ${config.owner.name}_`,
          mentions: [jid],
        });
      }
    } catch (_) {}
  }

  if (action === 'remove' && config.features.goodbyeMsg) {
    try {
      const meta = await sock.groupMetadata(id);
      for (const jid of participants) {
        const num = jid.split('@')[0];
        await sock.sendMessage(id, {
          text: `👋 *Alvida!*\n\n@${num} group chhod gaye.\n\n_${config.bot.name}_`,
          mentions: [jid],
        });
      }
    } catch (_) {}
  }
}

async function onConnectionUpdate(sock, update, reconnect, sessionId) {
  const { connection, lastDisconnect, qr } = update;
  if (qr) logger.info(`[${sessionId}] QR updated — scan karein`);
  if (connection === 'open') {
    logger.info(`[${sessionId}] ✅ WhatsApp connected!`);
    if (sessionId) updateSession(sessionId, { status: 'online', connectedAt: Date.now() });
    try {
      await sock.sendMessage(`${config.owner.number}@s.whatsapp.net`, {
        text: `✅ *${config.bot.name}* online ho gaya!\n⏰ ${new Date().toLocaleString('ur-PK')}`,
      });
    } catch (_) {}
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    logger.warn(`[${sessionId}] Connection closed. Code: ${code}`);
    if (sessionId) updateSession(sessionId, { status: 'offline' });
    if (code !== 401) {
      logger.info(`[${sessionId}] 5 second mein reconnect ho raha hai...`);
      setTimeout(reconnect, 5000);
    } else {
      logger.error(`[${sessionId}] Logout! Session khatam.`);
      if (sessionId) updateSession(sessionId, { status: 'logged_out' });
    }
  }
}

module.exports = { onMessagesUpsert, onMessagesDelete, onGroupParticipantsUpdate, onConnectionUpdate, storeMessage };
