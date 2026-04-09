// ============================================
// SAHIL 804 - Full Commands Handler
// Developer: Sahil Hacker | v4.0.0
// ⚠️ Owner info is LOCKED & cannot be changed
// ============================================
const axios  = require('axios');
const fs     = require('fs-extra');
const path   = require('path');
const config = require('../config/config');
const { smartDownload, downloadTikTok, downloadInstagram, downloadFacebook, downloadYouTube, downloadTwitter } = require('../apis/downloader');
const { logger }       = require('../utils/logger');
const { isOwner, formatUptime, sleep, cleanUrl } = require('../utils/helpers');
const { updateSession } = require('../utils/sessionManager');
const { simCache, weatherCache, newsCache } = require('../utils/cache');

// ── Group Rules Storage ───────────────────────
const RULES_FILE = path.join(__dirname, '../../sessions/group-rules.json');

function loadRules() {
  try {
    if (fs.existsSync(RULES_FILE)) return fs.readJsonSync(RULES_FILE);
    return {};
  } catch (_) { return {}; }
}

function saveRules(rules) {
  try {
    fs.ensureDirSync(path.dirname(RULES_FILE));
    fs.writeJsonSync(RULES_FILE, rules, { spaces: 2 });
  } catch (err) { logger.error('saveRules error:', err.message); }
}

// ── Send helpers ─────────────────────────────
async function reply(sock, msg, text) {
  return sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}
async function react(sock, msg, emoji) {
  return sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}
async function sendImage(sock, msg, url, caption = '') {
  return sock.sendMessage(msg.key.remoteJid, { image: { url }, caption }, { quoted: msg });
}
async function sendVideo(sock, msg, url, caption = '') {
  return sock.sendMessage(msg.key.remoteJid, { video: { url }, caption, mimetype: 'video/mp4' }, { quoted: msg });
}
async function sendAudio(sock, msg, url) {
  return sock.sendMessage(msg.key.remoteJid, { audio: { url }, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
}

// ── MENU IMAGE (Sahil's image, locked) ───────
const MENU_IMAGE = 'https://i.ibb.co/b51SYm0X/IMG-20260408-WA0010.jpg';

// ── All Commands ─────────────────────────────
const commands = {

  // ════════════════════════════════════════════
  //  📋 MENU / HELP
  // ════════════════════════════════════════════
  async menu(sock, msg) {
    const uptime = formatUptime(Date.now() - config.bot.startTime);
    const text = `
╔═══════════════════════════╗
║    🤖 *${config.bot.name}* v${config.bot.version}    ║
╚═══════════════════════════╝

👑 *Developer:* ${config.owner.name}
📞 *Contact:* wa.me/${config.owner.number}
⚡ *Uptime:* ${uptime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOADS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}dl <url>\` — Smart Download (all sites)
▸ \`${config.bot.prefix}tiktok <url>\` — TikTok (no watermark)
▸ \`${config.bot.prefix}ig <url>\` — Instagram Reel/Post
▸ \`${config.bot.prefix}fb <url>\` — Facebook Video
▸ \`${config.bot.prefix}ytmp3 <url>\` — YouTube Audio
▸ \`${config.bot.prefix}twitter <url>\` — Twitter/X Video
▸ \`${config.bot.prefix}dm <url>\` — Dailymotion Video

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 *LOOKUP / INFO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}sim <number>\` — SIM record check
▸ \`${config.bot.prefix}weather <city>\` — Mausam ki khabar
▸ \`${config.bot.prefix}news\` — Pakistan News (BBC Urdu)
▸ \`${config.bot.prefix}calc <expr>\` — Calculator
▸ \`${config.bot.prefix}id\` — Aapka WhatsApp JID

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 *STICKER TOOLS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}sticker\` — Image/Video → Sticker
▸ \`${config.bot.prefix}toimg\` — Sticker → Image

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ *BOT INFO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}ping\` — Bot speed check
▸ \`${config.bot.prefix}alive\` — Bot status
▸ \`${config.bot.prefix}owner\` — Developer info
▸ \`${config.bot.prefix}menu\` — Yeh menu

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *FUN COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}joke\` — Random joke
▸ \`${config.bot.prefix}quote\` — Motivational quote
▸ \`${config.bot.prefix}flip\` — Coin flip
▸ \`${config.bot.prefix}dice\` — Dice roll
▸ \`${config.bot.prefix}fact\` — Random fact

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *GROUP COMMANDS* (Admin)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}kick @user\` — Group se nikalen
▸ \`${config.bot.prefix}add 923...\` — Group mein add karen
▸ \`${config.bot.prefix}promote @user\` — Admin banaen
▸ \`${config.bot.prefix}demote @user\` — Admin hataaen
▸ \`${config.bot.prefix}mute\` — Group mute (sirf admins)
▸ \`${config.bot.prefix}unmute\` — Group unmute
▸ \`${config.bot.prefix}tagall\` — Sab ko tag karen
▸ \`${config.bot.prefix}groupinfo\` — Group ki poori info
▸ \`${config.bot.prefix}resetlink\` — Group link reset
▸ \`${config.bot.prefix}rules\` — Group rules dekhein
▸ \`${config.bot.prefix}setrules <text>\` — Rules set karein

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *OWNER ONLY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${config.bot.prefix}autoreact on/off\`
▸ \`${config.bot.prefix}autoreply on/off\`
▸ \`${config.bot.prefix}antilink on/off\`
▸ \`${config.bot.prefix}antispam on/off\`
▸ \`${config.bot.prefix}broadcast <msg>\`
▸ \`${config.bot.prefix}bc <msg>\` — Short broadcast
▸ \`${config.bot.prefix}block @user\`
▸ \`${config.bot.prefix}unblock @user\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Powered by *${config.owner.name}* | v${config.bot.version}_`;

    await sock.sendMessage(msg.key.remoteJid, {
      image: { url: MENU_IMAGE },
      caption: text,
    }, { quoted: msg });
  },

  async help(sock, msg) { return commands.menu(sock, msg); },
  async start(sock, msg) { return commands.menu(sock, msg); },

  // ════════════════════════════════════════════
  //  📱 SIM LOOKUP
  // ════════════════════════════════════════════
  async sim(sock, msg, args) {
    await react(sock, msg, '🔍');
    const number = args[0];
    if (!number) {
      return reply(sock, msg,
        `❌ *Number dein!*\n\n📌 *Usage:* ${config.bot.prefix}sim 03XXXXXXXXX`
      );
    }
    const cleaned = number.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      return reply(sock, msg, '❌ *Sahi number format dein!*\nExample: .sim 03018787786');
    }

    // PERF #3: Check SIM cache
    const cacheKey = `sim_${cleaned}`;
    const cached = simCache.get(cacheKey);
    if (cached) {
      await react(sock, msg, '✅');
      return reply(sock, msg, cached);
    }

    try {
      await reply(sock, msg, '⏳ *Record dhundh raha hoon...*');
      const { data } = await axios.get(
        `https://sim-database-api.fly.dev/api/sim?number=${cleaned}`,
        { timeout: 10000 }
      );
      if (!data || !data.number) {
        return reply(sock, msg, '❌ *Koi record nahi mila!*\nNumber check karein.');
      }
      const text =
`╔════════════════════
║ 📂 *RECORD 1/1*
║ ──────────────────
║ 👤 *Name*     : ${data.owner || 'N/A'}
║ 📞 *Number*   : ${data.number || cleaned}
║ 🆔 *CNIC*     : ${data.cnic || 'N/A'}
║ 📡 *Network*  : ${data.network || 'N/A'}
║ 🏙️ *City*     : ${data.city || 'N/A'}
║ ✅ *Status*   : ${data.status || 'N/A'}
╚════════════════════
⚠️ *Developer: ${config.owner.name}*`;
      simCache.set(cacheKey, text);
      await react(sock, msg, '✅');
      return reply(sock, msg, text);
    } catch (err) {
      logger.error('SIM lookup error:', err.message);
      return reply(sock, msg, '❌ *Server se response nahi mila!*\nDobara try karein.');
    }
  },

  // ════════════════════════════════════════════
  //  🏓 PING / ALIVE / STATUS
  // ════════════════════════════════════════════
  async ping(sock, msg) {
    const start = Date.now();
    await react(sock, msg, '🏓');
    const ms = Date.now() - start;
    await reply(sock, msg, `🏓 *Pong!*\n⚡ Speed: *${ms}ms*\n✅ Bot active hai!`);
  },

  async alive(sock, msg) {
    const uptime = formatUptime(Date.now() - config.bot.startTime);
    const mem = process.memoryUsage();
    const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const text = `
✅ *${config.bot.name} ONLINE HAI!*
━━━━━━━━━━━━━━━━━
⏱ *Uptime:* ${uptime}
💾 *Memory:* ${memMB} MB
🌐 *Status:* Active
👑 *Developer:* ${config.owner.name}
━━━━━━━━━━━━━━━━━`;
    await sock.sendMessage(msg.key.remoteJid, { image: { url: MENU_IMAGE }, caption: text }, { quoted: msg });
  },

  async owner(sock, msg) {
    const text = `
👑 *BOT DEVELOPER*
━━━━━━━━━━━━━━━━━
🧑 *Name:* ${config.owner.name}
📞 *WhatsApp:* wa.me/${config.owner.number}
🤖 *Bot:* ${config.bot.name} v${config.bot.version}
━━━━━━━━━━━━━━━━━
_Kisi bhi masle k liye owner se contact karein_`;
    await sock.sendMessage(msg.key.remoteJid, { image: { url: MENU_IMAGE }, caption: text }, { quoted: msg });
  },

  // ════════════════════════════════════════════
  //  📥 DOWNLOADS
  // ════════════════════════════════════════════
  async dl(sock, msg, args) {
    if (!args[0]) return reply(sock, msg, `❌ URL dein!\nMisal: \`${config.bot.prefix}dl https://tiktok.com/...\``);
    const url = cleanUrl(args[0]);
    await react(sock, msg, '⏳');
    const result = await smartDownload(url);
    if (!result.success) {
      await react(sock, msg, '❌');
      return reply(sock, msg, `❌ *Download fail hua!*\n\n${result.error}`);
    }
    await react(sock, msg, '✅');
    const caption = `📥 *${result.platform} Download*\n📌 ${result.title || ''}\n👤 ${result.author || ''}\n\n_${config.bot.name} | ${config.owner.name}_`.trim();
    if (result.isImage && result.image) {
      return sendImage(sock, msg, result.image, caption);
    }
    if (result.isAudio && result.audio) {
      await reply(sock, msg, `🎵 *${result.title || 'Audio'}*\n_${config.bot.name}_`);
      return sendAudio(sock, msg, result.audio);
    }
    if (result.video || result.video_hd || result.video_sd) {
      return sendVideo(sock, msg, result.video || result.video_hd || result.video_sd, caption);
    }
    if (result.audio) return sendAudio(sock, msg, result.audio);
    await react(sock, msg, '❌');
    return reply(sock, msg, '❌ Download link nahi mila.');
  },

  async tiktok(sock, msg, args)  { return commands.dl(sock, msg, args); },
  async ig(sock, msg, args)      { return commands.dl(sock, msg, args); },
  async fb(sock, msg, args)      { return commands.dl(sock, msg, args); },
  async twitter(sock, msg, args) { return commands.dl(sock, msg, args); },
  async dm(sock, msg, args)      { return commands.dl(sock, msg, args); },

  async ytmp3(sock, msg, args) {
    if (!args[0]) return reply(sock, msg, `❌ YouTube link dein!\nMisal: \`${config.bot.prefix}ytmp3 https://youtube.com/...\``);
    const url = cleanUrl(args[0]);
    await react(sock, msg, '⏳');
    const result = await downloadYouTube(url, 'audio');
    if (!result.success) {
      await react(sock, msg, '❌');
      return reply(sock, msg, `❌ ${result.error}`);
    }
    await react(sock, msg, '✅');
    await reply(sock, msg, `🎵 *${result.title}*\n_Downloading..._`);
    return sendAudio(sock, msg, result.audio);
  },

  // ════════════════════════════════════════════
  //  🌤️ CMD #1 — WEATHER
  // ════════════════════════════════════════════
  async weather(sock, msg, args) {
    const city = args.join(' ').trim();
    if (!city) return reply(sock, msg, `❌ *City ka naam dein!*\n\n📌 Misal: ${config.bot.prefix}weather Karachi`);

    await react(sock, msg, '🌤️');

    // PERF #3: weather cache
    const cacheKey = `weather_${city.toLowerCase()}`;
    let data = weatherCache.get(cacheKey);

    if (!data) {
      try {
        const res = await axios.get(
          `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
          { headers: { 'User-Agent': 'curl/7.68.0' }, timeout: 10000 }
        );
        data = res.data;
        weatherCache.set(cacheKey, data);
      } catch (err) {
        await react(sock, msg, '❌');
        return reply(sock, msg, '❌ *Weather data nahi mila.*\nCity ka naam check karein ya dobara try karein.');
      }
    }

    try {
      const current = data.current_condition[0];
      const area    = data.nearest_area[0];
      const cityName = area.areaName[0].value;
      const country  = area.country[0].value;
      const desc     = current.weatherDesc[0].value;

      const text =
`╔═══════════════════
║ 🌤️ *Weather: ${cityName}, ${country}*
║ ───────────────────
║ 🌡️ Temp      : ${current.temp_C}°C / ${current.temp_F}°F
║ 💧 Humidity  : ${current.humidity}%
║ 💨 Wind      : ${current.windspeedKmph} km/h
║ ☁️ Condition : ${desc}
║ 👁️ Visibility: ${current.visibility} km
║ 🌬️ Feels Like: ${current.FeelsLikeC}°C
╚═══════════════════
⚡ ${config.bot.name}`;

      await react(sock, msg, '✅');
      return reply(sock, msg, text);
    } catch (err) {
      await react(sock, msg, '❌');
      return reply(sock, msg, '❌ Weather data parse nahi ho saka. Dobara try karein.');
    }
  },

  // ════════════════════════════════════════════
  //  🧮 CMD #2 — CALCULATOR
  // ════════════════════════════════════════════
  async calc(sock, msg, args) {
    const expr = args.join(' ').trim();
    if (!expr) return reply(sock, msg, `❌ *Expression dein!*\n\n📌 Misal: ${config.bot.prefix}calc 20*5+100`);

    // Strict whitelist — only digits, operators, parens, dot, percent, spaces
    if (!/^[0-9+\-*/.()%\s]+$/.test(expr)) {
      return reply(sock, msg, '❌ *Galat characters!*\nSirf: 0-9, +, -, *, /, (, ), ., %');
    }

    // Guard against empty-after-strip tricks like "  "
    if (!expr.replace(/\s/g, '')) return reply(sock, msg, '❌ Kuch toh likhein!');

    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result !== 'number' || !isFinite(result)) throw new Error('Invalid');
      const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
      return reply(sock, msg, `🧮 *Calculator*\n\n📝 Expression: \`${expr}\`\n✅ Result: *${formatted}*`);
    } catch (_) {
      return reply(sock, msg, '❌ Expression galat hai. Dobara check karein.\n\nMisal: .calc 20*5+100');
    }
  },

  // ════════════════════════════════════════════
  //  📰 CMD #3 — NEWS
  // ════════════════════════════════════════════
  async news(sock, msg) {
    await react(sock, msg, '📰');

    // PERF #3: news cache
    const cacheKey = 'news_bbc_urdu';
    let headlines = newsCache.get(cacheKey);

    if (!headlines) {
      try {
        const { data } = await axios.get(
          'https://rss2json.com/api.json?rss_url=https://feeds.bbcurdu.com/urduregional/rss.xml',
          { timeout: 10000 }
        );
        if (!data?.items?.length) throw new Error('No items');
        headlines = data.items.slice(0, 5).map((item, i) => `${i + 1}. ${item.title}`).join('\n');
        newsCache.set(cacheKey, headlines);
      } catch (err) {
        await react(sock, msg, '❌');
        return reply(sock, msg, '❌ *News nahi mili.*\nDobara try karein.');
      }
    }

    await react(sock, msg, '✅');
    return reply(sock, msg,
      `📰 *Pakistan News — BBC Urdu*\n━━━━━━━━━━━━━━━━━━\n${headlines}\n━━━━━━━━━━━━━━━━━━\n🔗 bbc.com/urdu\n\n_${config.bot.name}_`
    );
  },

  // ════════════════════════════════════════════
  //  🎨 CMD #4 — STICKER (image/video → sticker)
  // ════════════════════════════════════════════
  async sticker(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg,
        `❌ *Kisi image ya video ko reply karein!*\n\n📌 Misal:\n1. Kisi image ko reply karein\n2. \`${config.bot.prefix}sticker\` likhein`
      );
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    if (!['imageMessage', 'videoMessage'].includes(quotedType)) {
      return reply(sock, msg, '❌ *Sirf image ya video sticker banta hai.*\nSticker se image k liye: .toimg');
    }

    await react(sock, msg, '⏳');

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const quotedMsg = {
        key: {
          remoteJid: jid,
          id:        ctx.stanzaId,
          fromMe:    false,
          participant: ctx.participant,
        },
        message: ctx.quotedMessage,
      };

      const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
      await sock.sendMessage(jid, {
        sticker: buffer,
        stickerMetadata: { pack: config.bot.name, author: config.owner.name },
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      logger.error('Sticker error:', err.message);
      await reply(sock, msg,
        '❌ *Sticker nahi bana.*\n\n⚠️ Server mein sharp/ffmpeg hona chahiye.\n' +
        'Railway par kaam karta hai — Hostinger shared hosting par nahi.\n\n' +
        'Solution: VPS use karein ya Railway free tier.'
      );
    }
  },

  // ════════════════════════════════════════════
  //  🖼️ CMD #5 — TOIMG (sticker → image)
  // ════════════════════════════════════════════
  async toimg(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg, `❌ *Kisi sticker ko reply karein!*\n\n📌 Misal: Sticker ko reply karein aur \`${config.bot.prefix}toimg\` likhein`);
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    if (quotedType !== 'stickerMessage') {
      return reply(sock, msg, '❌ *Sirf sticker ko reply karein .toimg k liye.*\nImage se sticker k liye: .sticker');
    }

    await react(sock, msg, '⏳');

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const quotedMsg = {
        key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
        message: ctx.quotedMessage,
      };

      const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `🖼️ *Sticker → Image*\n_${config.bot.name} | ${config.owner.name}_`,
        mimetype: 'image/webp',
      }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      logger.error('toimg error:', err.message);
      return reply(sock, msg, '❌ Image convert nahi ho saka. Dobara try karein.');
    }
  },

  // ════════════════════════════════════════════
  //  👥 CMD #6 — GROUPINFO (enhanced + typo fix)
  // ════════════════════════════════════════════
  async groupinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Yeh command sirf groups mein kaam karta hai.*');

    try {
      const meta   = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin);
      const adminList = admins.map(p => `• @${p.id.split('@')[0]}`).join('\n') || '• N/A';

      let inviteLink = '';
      try {
        const code = await sock.groupInviteCode(jid);
        inviteLink = `\n🔗 *Invite Link:*\nhttps://chat.whatsapp.com/${code}`;
      } catch (_) {}

      const text =
`👥 *GROUP INFORMATION*
━━━━━━━━━━━━━━━━━
📛 *Naam:* ${meta.subject}
👤 *Members:* ${meta.participants.length}
👑 *Admins (${admins.length}):*
${adminList}
📅 *Bana:* ${new Date(meta.creation * 1000).toLocaleDateString('ur-PK')}
📝 *Description:*
${meta.desc || 'Koi description nahi'}${inviteLink}
━━━━━━━━━━━━━━━━━
_${config.bot.name}_`;

      const mentions = admins.map(p => p.id);
      await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    } catch (_) { await reply(sock, msg, '❌ Group info nahi mili. Admin permission chahiye.'); }
  },

  // Alias — fix the .grupinfo typo that existed in older versions
  async grupinfo(sock, msg) { return commands.groupinfo(sock, msg); },

  // ════════════════════════════════════════════
  //  🆔 CMD #7 — ID
  // ════════════════════════════════════════════
  async id(sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const number = sender.split('@')[0];
    const text =
`🆔 *Your WhatsApp ID*
━━━━━━━━━━━━━━━
📞 *Number:* +${number}
🔑 *JID:* ${sender}
💬 *Chat JID:* ${msg.key.remoteJid}
━━━━━━━━━━━━━━━
_${config.bot.name}_`;
    return reply(sock, msg, text);
  },

  // ════════════════════════════════════════════
  //  🔄 CMD #8 — RESETLINK (admin only)
  // ════════════════════════════════════════════
  async resetlink(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Sirf groups mein kaam karta hai.*');

    // Check admin
    try {
      const meta   = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
      if (!isAdmin && !isOwner(sender)) {
        return reply(sock, msg, '❌ *Sirf group admins link reset kar sakte hain.*');
      }
    } catch (_) { return reply(sock, msg, '❌ Admin check fail hua.'); }

    try {
      const newCode = await sock.groupRevokeInvite(jid);
      return reply(sock, msg,
        `✅ *Group link reset ho gaya!*\n\n🔗 *New Link:*\nhttps://chat.whatsapp.com/${newCode}\n\n_Purana link kaam nahi karega._`
      );
    } catch (_) {
      return reply(sock, msg, '❌ Link reset fail hua. Kya main admin hoon?');
    }
  },

  // ════════════════════════════════════════════
  //  📋 CMD #9 — RULES (show group rules)
  // ════════════════════════════════════════════
  async rules(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Sirf groups mein kaam karta hai.*');

    const allRules = loadRules();
    const groupRules = allRules[jid];

    if (!groupRules) {
      return reply(sock, msg,
        `📋 *Group Rules*\n━━━━━━━━━━━━━━━\n` +
        `⚠️ Is group k liye koi rules set nahi hain.\n\n` +
        `Admin rules set karne k liye:\n\`${config.bot.prefix}setrules <rules text>\``
      );
    }

    return reply(sock, msg, `📋 *Group Rules*\n━━━━━━━━━━━━━━━\n${groupRules}\n━━━━━━━━━━━━━━━\n_${config.bot.name}_`);
  },

  // ════════════════════════════════════════════
  //  ✏️ CMD #10 — SETRULES (admin only)
  // ════════════════════════════════════════════
  async setrules(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Sirf groups mein kaam karta hai.*');

    // Check admin
    try {
      const meta   = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
      if (!isAdmin && !isOwner(sender)) {
        return reply(sock, msg, '❌ *Sirf group admins rules set kar sakte hain.*');
      }
    } catch (_) { return reply(sock, msg, '❌ Admin check fail hua.'); }

    const rulesText = args.join(' ').trim();
    if (!rulesText) {
      return reply(sock, msg,
        `❌ *Rules text dein!*\n\n📌 Misal:\n\`${config.bot.prefix}setrules 1. Respect karein\n2. Spam mat karein\n3. Links allowed nahi\``
      );
    }

    const allRules = loadRules();
    allRules[jid] = rulesText;
    saveRules(allRules);

    return reply(sock, msg, `✅ *Group rules set ho gaye!*\n\nDekhne k liye: \`${config.bot.prefix}rules\``);
  },

  // ════════════════════════════════════════════
  //  🎮 FUN COMMANDS
  // ════════════════════════════════════════════
  async joke(sock, msg) {
    const jokes = [
      '🤣 Ek banda doctor ke paas gaya...\nDoctor: Kya hua?\nBanda: Sab theek hai, bas check karna tha!\nDoctor: Toh mera fee kya hua? 😂',
      '😂 Teacher: 2+2 kitna hota hai?\nStudent: Sir, depends karta hai... exam mein 5 bhi ho sakta hai!',
      '🤣 Biwi: Tum mujhe bhool gaye ho!\nShauhar: Nahi jaan, main try kar raha hoon! 😅',
      '😂 Dost: Yaar salary mili toh party dena!\nMain: Haan zaroor, agli salary mein! 💸',
      '🤣 Exam hall mein:\nStudent 1: Yaar copy karne do!\nStudent 2: Mere paas bhi kuch nahi!\nStudent 1: Phir bhi... ek dusre ko dekh ke confidence toh milega! 😂',
    ];
    await reply(sock, msg, jokes[Math.floor(Math.random() * jokes.length)]);
  },

  async quote(sock, msg) {
    const quotes = [
      '💪 *"Mushkilaat insaan ko torti nahi, balki banati hain."*\n— Sahil Hacker',
      '🌟 *"Kamyabi ka raasta mehnат se hota hai, shortcut se nahi."*',
      '🔥 *"Jo uthta hai gir ke, woh hi asal mein jeeta hai."*',
      '⚡ *"Kal ka intezaar mat karo, aaj hi shuru karo."*',
      '💡 *"Ilm woh roshni hai jo kabhi nahi bujhti."*',
      '🎯 *"Apna target khud set karo, doosron ki raah mat dekho."*',
      '🌈 *"Toofan ke baad hi noor aata hai."*',
    ];
    await reply(sock, msg, quotes[Math.floor(Math.random() * quotes.length)]);
  },

  async flip(sock, msg) {
    const result = Math.random() < 0.5 ? '🪙 *HEADS* (Chitt)' : '🪙 *TAILS* (Patt)';
    await reply(sock, msg, `🎲 Coin flip ka natija:\n\n${result}`);
  },

  async dice(sock, msg) {
    const num = Math.floor(Math.random() * 6) + 1;
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
    await reply(sock, msg, `🎲 Pasa giraya!\n\nNatija: ${emojis[num-1]} *${num}*`);
  },

  async fact(sock, msg) {
    const facts = [
      '🧠 Insaan ka dimaag 70% paani se bana hai.',
      '🐙 Octopus ke 3 dil hote hain!',
      '🌍 Duniya mein har second 100 bijliyan girti hain.',
      '🦋 Titli apni aankhon se rang nahi dekhti.',
      '🍯 Shahad kabhi kharab nahi hota — 3000 saal purana shahad bhi kha sakte hain!',
      '🐘 Hathi ek insaan ki awaaz lifetime yaad rakhta hai.',
      '🌙 Chaand par ek din 29 Earth days ka hota hai.',
    ];
    await reply(sock, msg, `💡 *Random Fact:*\n\n${facts[Math.floor(Math.random() * facts.length)]}`);
  },

  // ════════════════════════════════════════════
  //  👥 GROUP COMMANDS
  // ════════════════════════════════════════════
  async kick(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Yeh command sirf groups mein kaam karta hai.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Kisi user ko mention karein (@tag).');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'remove');
      await reply(sock, msg, `✅ *${mentioned.length}* user(s) ko group se nikal diya!`);
    } catch (_) { await reply(sock, msg, '❌ Fail hua. Kya main admin hoon?'); }
  },

  async add(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    const number = args[0]?.replace(/[^0-9]/g, '');
    if (!number) return reply(sock, msg, `❌ Misal: \`${config.bot.prefix}add 923001234567\``);
    try {
      await sock.groupParticipantsUpdate(jid, [`${number}@s.whatsapp.net`], 'add');
      await reply(sock, msg, `✅ *+${number}* ko group mein add kar diya!`);
    } catch (_) { await reply(sock, msg, '❌ Fail hua. Number WhatsApp par hona chahiye.'); }
  },

  async promote(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ User ko mention karein.');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'promote');
      await reply(sock, msg, '✅ User ko admin bana diya!');
    } catch (_) { await reply(sock, msg, '❌ Fail. Main admin hoon?'); }
  },

  async demote(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ User ko mention karein.');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'demote');
      await reply(sock, msg, '✅ User ko admin se hata diya!');
    } catch (_) { await reply(sock, msg, '❌ Fail. Main admin hoon?'); }
  },

  async mute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await reply(sock, msg, '🔇 Group mute kar diya! Sirf admins send kar sakte hain.');
    } catch (_) { await reply(sock, msg, '❌ Fail. Kya main admin hoon?'); }
  },

  async unmute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await reply(sock, msg, '🔊 Group unmute kar diya! Sab send kar sakte hain.');
    } catch (_) { await reply(sock, msg, '❌ Fail. Kya main admin hoon?'); }
  },

  async tagall(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Sirf groups mein.');
    try {
      const meta    = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const mentions = members.map(m => `@${m.split('@')[0]}`).join(' ');
      await sock.sendMessage(jid, { text: `📢 *Sab Members:*\n\n${mentions}`, mentions: members }, { quoted: msg });
    } catch (_) { await reply(sock, msg, '❌ Fail. Admin permission chahiye.'); }
  },

  // ════════════════════════════════════════════
  //  👑 OWNER COMMANDS
  // ════════════════════════════════════════════
  async autoreact(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Yeh sirf owner k liye hai.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.autoReact = true;  return reply(sock, msg, '✅ Auto React *ON* kar diya!'); }
    if (val === 'off') { config.features.autoReact = false; return reply(sock, msg, '🔴 Auto React *OFF* kar diya!'); }
    return reply(sock, msg, `Auto React filhal: *${config.features.autoReact ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async autoreply(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Yeh sirf owner k liye hai.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.autoReply = true;  return reply(sock, msg, '✅ Auto Reply *ON* kar diya!'); }
    if (val === 'off') { config.features.autoReply = false; return reply(sock, msg, '🔴 Auto Reply *OFF* kar diya!'); }
    return reply(sock, msg, `Auto Reply filhal: *${config.features.autoReply ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async antilink(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Sirf owner k liye.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.antiLink = true;  return reply(sock, msg, '✅ Anti-Link *ON*! Groups mein links ban hain.'); }
    if (val === 'off') { config.features.antiLink = false; return reply(sock, msg, '🔴 Anti-Link *OFF* kar diya.'); }
    return reply(sock, msg, `Anti-Link filhal: *${config.features.antiLink ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async antispam(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Sirf owner k liye.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.antiSpam = true;  return reply(sock, msg, '✅ Anti-Spam *ON*!'); }
    if (val === 'off') { config.features.antiSpam = false; return reply(sock, msg, '🔴 Anti-Spam *OFF*.'); }
    return reply(sock, msg, `Anti-Spam filhal: *${config.features.antiSpam ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async broadcast(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Sirf owner k liye.');
    const text = args.join(' ');
    if (!text) return reply(sock, msg, '❌ Message dein.');
    const chats = await sock.groupFetchAllParticipating();
    let count = 0;
    for (const jid of Object.keys(chats)) {
      try {
        await sock.sendMessage(jid, { text: `📢 *SAHIL 804 BROADCAST*\n\n${text}\n\n_${config.owner.name}_` });
        count++;
        await sleep(1200);
      } catch (_) {}
    }
    return reply(sock, msg, `✅ Broadcast *${count}* groups ko bhej diya!`);
  },

  async bc(sock, msg, args) { return commands.broadcast(sock, msg, args); },

  async block(sock, msg) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Sirf owner k liye.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ User ko mention karein.');
    for (const jid of mentioned) {
      try { await sock.updateBlockStatus(jid, 'block'); } catch (_) {}
    }
    await reply(sock, msg, `✅ *${mentioned.length}* user(s) block kar diye!`);
  },

  async unblock(sock, msg) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Sirf owner k liye.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ User ko mention karein.');
    for (const jid of mentioned) {
      try { await sock.updateBlockStatus(jid, 'unblock'); } catch (_) {}
    }
    await reply(sock, msg, `✅ *${mentioned.length}* user(s) unblock kar diye!`);
  },
};

// ════════════════════════════════════════════
//  🛡️ Anti-Spam Tracker (BUG #3 — memory leak fix)
// ════════════════════════════════════════════
const spamTracker = new Map();

// BUG #3 FIX: Clean up entries older than timeWindow every 5 minutes
setInterval(() => {
  const now = Date.now();
  let deleted = 0;
  for (const [jid, data] of spamTracker.entries()) {
    if (now - data.firstMsg > config.spam.timeWindow) {
      spamTracker.delete(jid);
      deleted++;
    }
  }
  if (deleted > 0) logger.info(`spamTracker cleanup: ${deleted} entries removed`);
}, 5 * 60 * 1000).unref(); // .unref() so it won't block process exit

function checkSpam(jid) {
  const now  = Date.now();
  const data = spamTracker.get(jid) || { count: 0, firstMsg: now };
  if (now - data.firstMsg > config.spam.timeWindow) {
    spamTracker.set(jid, { count: 1, firstMsg: now });
    return false;
  }
  data.count++;
  spamTracker.set(jid, data);
  return data.count > config.spam.maxMessages;
}

// ── Main Handler ─────────────────────────────
async function handleCommand(sock, msg) {
  try {
    const body = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption || ''
    ).trim();
    if (!body.startsWith(config.bot.prefix)) return;
    const [rawCmd, ...args] = body.slice(config.bot.prefix.length).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();

    // Spam check
    const senderJid = msg.key.participant || msg.key.remoteJid;
    if (config.features.antiSpam && !isOwner(senderJid) && checkSpam(senderJid)) {
      return reply(sock, msg, '⚠️ Aap bahut zyada messages bhej rahe hain! Thoda ruko.');
    }

    if (commands[cmd]) {
      logger.info(`CMD: ${cmd} | FROM: ${msg.key.remoteJid}`);
      await commands[cmd](sock, msg, args);
    }
  } catch (err) {
    logger.error('Command error:', err.message);
    try { await reply(sock, msg, `❌ Kuch masla hua: ${err.message}`); } catch (_) {}
  }
}

module.exports = { handleCommand, isOwner, react, reply };
