// ============================================
// SAHIL 804 - Message Handler
// Developer: Sahil Hacker
// ============================================
const config = require('../config/config');
const { handleCommand, react, isOwner, pickEmoji } = require('../commands');
const { logger } = require('../utils/logger');
const { updateSession } = require('../utils/sessionManager');
const { formatUptime } = require('../utils/helpers');

// Track which sessions have already sent the "connected" message
// So it only sends ONCE per session, not on every reconnect
const connectedSessions = new Set();

const autoReplies = {
  'hi':        `👋 *Hello!* I am *${config.bot.name}*!\n📌 Type *.menu* to see all commands`,
  'hello':     `😊 *Hello!* Welcome!\n📌 Type *.menu* to see commands`,
  'salam':     `☪️ *Wa Alaikum Assalam!*\n📌 Type *.menu* to see commands`,
  'assalam':   `☪️ *Wa Alaikum Assalam wa Rahmatullahi wa Barakatuh!*\n📌 Type *.menu* to see commands`,
  'bot':       `🤖 *Yes! I am here!*\n📌 Type *.menu*`,
  'help':      `💡 Type *.menu* for help`,
  'alive':     `✅ *Yes! I am online!* 💪`,
  'owner':     `👑 *Developer: ${config.owner.name}*\n📞 wa.me/${config.owner.number}`,
  'developer': `👑 *Developer: ${config.owner.name}*\n📞 wa.me/${config.owner.number}`,
  'speed':     `⚡ Bot is running fast! Uptime: ${formatUptime(Date.now() - config.bot.startTime)}`,
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
          await sock.sendMessage(jid, { text: `⚠️ @${sender.split('@')[0]}, links are not allowed!`, mentions: [sender] }, { quoted: msg });
        } catch (_) {}
        continue;
      }

      // Auto react — smart emoji based on message content
      if (config.features.autoReact && text) {
        const emoji = pickEmoji(text);
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
//  Anti-delete: circular-buffer msgStore
// ════════════════════════════════════════════
const MSG_STORE_LIMIT = 500;
const msgStore     = new Map();
const msgStoreKeys = [];

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

  if (msgStore.has(msg.key.id)) {
    msgStore.set(msg.key.id, {
      fromMe:     msg.key.fromMe,
      remoteJid:  msg.key.remoteJid,
      participant: msg.key.participant,
      text:       getMsgText(msg),
    });
    return;
  }

  msgStore.set(msg.key.id, {
    fromMe:     msg.key.fromMe,
    remoteJid:  msg.key.remoteJid,
    participant: msg.key.participant,
    text:       getMsgText(msg),
  });
  msgStoreKeys.push(msg.key.id);

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
          text: `🎉 *Welcome to ${meta.subject}!*\n\n👋 @${num} welcome!\n📌 Type *.menu* to see bot commands\n\n📞 *Want your own bot?*\nContact: wa.me/${config.owner.number}\n\n_${config.bot.name} | ${config.owner.name}_`,
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
          text: `👋 *Goodbye!*\n\n@${num} has left the group.\n\n_${config.bot.name}_`,
          mentions: [jid],
        });
      }
    } catch (_) {}
  }
}

async function onConnectionUpdate(sock, update, reconnect, sessionId) {
  const { connection, lastDisconnect, qr } = update;
  if (qr) logger.info(`[${sessionId}] QR updated`);

  if (connection === 'open') {
    logger.info(`[${sessionId}] ✅ WhatsApp connected!`);
    if (sessionId) updateSession(sessionId, { status: 'online', connectedAt: Date.now() });

    // ✅ FIX: Only send "connected" message ONCE per session lifetime
    // Not on every reconnect — prevents 1000 message spam
    if (!connectedSessions.has(sessionId)) {
      connectedSessions.add(sessionId);
      try {
        const ownerJid = `${config.owner.number}@s.whatsapp.net`;
        await sock.sendMessage(ownerJid, {
          text:
`✅ *${config.bot.name} is now ONLINE!*
⏰ ${new Date().toLocaleString('en-PK')}
🔑 *Session ID:* ${sessionId}

📢 *Join Our Channel:*
${config.owner.channel}

📞 *Want your own bot? Contact:*
wa.me/${config.owner.number}

👑 Developer: ${config.owner.name}`,
        });
      } catch (_) {}
    }
  }

  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    logger.warn(`[${sessionId}] Connection closed. Code: ${code}`);
    if (sessionId) updateSession(sessionId, { status: 'offline' });
    if (code !== 401) {
      logger.info(`[${sessionId}] Reconnecting in 5 seconds...`);
      setTimeout(reconnect, 5000);
    } else {
      logger.error(`[${sessionId}] Logged out! Session ended.`);
      if (sessionId) updateSession(sessionId, { status: 'logged_out' });
      // Remove from connected set so if user re-pairs, message sends again
      connectedSessions.delete(sessionId);
    }
  }
}

module.exports = { onMessagesUpsert, onMessagesDelete, onGroupParticipantsUpdate, onConnectionUpdate, storeMessage };
