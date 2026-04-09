// ============================================
// SAHIL 804 - Full Commands Handler
// Developer: Sahil Hacker | v4.0.0
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

// ── Smart Emoji Picker ────────────────────────
// Picks emoji based on message text keywords, else random from pool
function pickEmoji(text = '') {
  const lower = text.toLowerCase();
  for (const [keyword, emoji] of Object.entries(config.reactKeywords || {})) {
    if (lower.includes(keyword)) return emoji;
  }
  const pool = config.reactEmojis;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── MENU IMAGE (Sahil's image, locked) ───────
const MENU_IMAGE = 'https://i.ibb.co/b51SYm0X/IMG-20260408-WA0010.jpg';

// ── Mode guard — blocks non-owners in private mode ──
function isBotAllowed(senderJid) {
  if (config.botMode === 'private') return isOwner(senderJid);
  return true; // public — everyone allowed
}

// ── All Commands ─────────────────────────────
const commands = {

  // ════════════════════════════════════════════
  //  📋 MENU / HELP
  // ════════════════════════════════════════════
  async menu(sock, msg) {
    const uptime = formatUptime(Date.now() - config.bot.startTime);
    const p = config.bot.prefix;
    const modeTag = config.botMode === 'private' ? '🔒 PRIVATE' : '🌐 PUBLIC';
    const text = `
╔═══════════════════════════╗
║    🤖 *${config.bot.name}* v${config.bot.version}    ║
╚═══════════════════════════╝

👑 *Developer:* ${config.owner.name}
📞 *Contact:* wa.me/${config.owner.number}
⚡ *Uptime:* ${uptime}
🔰 *Mode:* ${modeTag}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOADS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}dl <url>\` — Smart Download (all sites)
▸ \`${p}t <url>\` — TikTok (no watermark)
▸ \`${p}i <url>\` — Instagram Reel/Post
▸ \`${p}f <url>\` — Facebook Video
▸ \`${p}y <url>\` — YouTube Audio (MP3)
▸ \`${p}tw <url>\` — Twitter/X Video
▸ \`${p}dm <url>\` — Dailymotion Video

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 *LOOKUP / INFO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}sim <number>\` — SIM record check
▸ \`${p}weather <city>\` — Weather info
▸ \`${p}news\` — Pakistan News (BBC Urdu)
▸ \`${p}calc <expr>\` — Calculator
▸ \`${p}id\` — Your WhatsApp JID

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 *STICKER TOOLS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}sticker\` — Image/Video → Sticker
▸ \`${p}toimg\` — Sticker → Image
▸ \`${p}view\` — View once media save karein

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ *BOT INFO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}ping\` — Bot speed check
▸ \`${p}alive\` — Bot status
▸ \`${p}owner\` — Developer info
▸ \`${p}settings\` — Toggle features on/off
▸ \`${p}menu\` — This menu

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *FUN COMMANDS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}joke\` — Random joke
▸ \`${p}quote\` — Motivational quote
▸ \`${p}flip\` — Coin flip
▸ \`${p}dice\` — Dice roll
▸ \`${p}fact\` — Random fact

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *GROUP COMMANDS* (Admin)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}kick @user\` — Remove from group
▸ \`${p}add 923...\` — Add to group
▸ \`${p}promote @user\` — Make admin
▸ \`${p}demote @user\` — Remove admin
▸ \`${p}mute\` — Mute group
▸ \`${p}unmute\` — Unmute group
▸ \`${p}tagall\` — Tag all members
▸ \`${p}groupinfo\` — Group details
▸ \`${p}resetlink\` — Reset invite link
▸ \`${p}rules\` — Show group rules
▸ \`${p}setrules <text>\` — Set rules
▸ \`${p}setdp\` — Change group DP

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *OWNER ONLY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}public\` — Public mode (everyone)
▸ \`${p}private\` — Private mode (only you)
▸ \`${p}settings\` — All features toggle
▸ \`${p}broadcast <msg>\`
▸ \`${p}bc <msg>\` — Short broadcast
▸ \`${p}block @user\`
▸ \`${p}unblock @user\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 *Join Our Channel:*
${config.owner.channel}
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
  //  ⚙️ SETTINGS — Toggle all features
  // ════════════════════════════════════════════
  async settings(sock, msg, args) {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender)) return reply(sock, msg, '❌ Only owner can change settings.');

    // .settings — show current status
    if (!args[0]) {
      const f = config.features;
      const on  = '🟢 ON ';
      const off = '🔴 OFF';
      const text =
`⚙️ *BOT SETTINGS*
━━━━━━━━━━━━━━━━━━━━━
🔰 *Mode:* ${config.botMode === 'private' ? '🔒 PRIVATE' : '🌐 PUBLIC'}
━━━━━━━━━━━━━━━━━━━━━
${f.autoReact  ? on : off} \`autoreact\`  — Auto React
${f.autoReply  ? on : off} \`autoreply\`  — Auto Reply
${f.autoRead   ? on : off} \`autoread\`   — Auto Read
${f.antiDelete ? on : off} \`antidelete\` — Anti Delete
${f.welcomeMsg ? on : off} \`welcome\`    — Welcome Msg
${f.goodbyeMsg ? on : off} \`goodbye\`    — Goodbye Msg
${f.antiSpam   ? on : off} \`antispam\`   — Anti Spam
${f.antiLink   ? on : off} \`antilink\`   — Anti Link
${f.antiBot    ? on : off} \`antibot\`    — Anti Bot
━━━━━━━━━━━━━━━━━━━━━
📌 *Usage:* \`.settings <name> on/off\`
Example: \`.settings autoreact off\``;
      return reply(sock, msg, text);
    }

    // .settings <feature> on/off
    const feature = args[0].toLowerCase();
    const val     = args[1]?.toLowerCase();

    const map = {
      autoreact:  'autoReact',
      autoreply:  'autoReply',
      autoread:   'autoRead',
      antidelete: 'antiDelete',
      welcome:    'welcomeMsg',
      goodbye:    'goodbyeMsg',
      antispam:   'antiSpam',
      antilink:   'antiLink',
      antibot:    'antiBot',
    };

    const key = map[feature];
    if (!key) return reply(sock, msg, `❌ Unknown feature: *${feature}*\n\nAvailable: ${Object.keys(map).join(', ')}`);
    if (!val || !['on','off'].includes(val)) return reply(sock, msg, '❌ Use: on or off\nExample: .settings autoreact off');

    config.features[key] = (val === 'on');
    await react(sock, msg, '✅');
    return reply(sock, msg, `${val === 'on' ? '✅' : '🔴'} *${feature}* is now *${val.toUpperCase()}*`);
  },

  // ════════════════════════════════════════════
  //  🌐 PUBLIC / 🔒 PRIVATE MODE
  // ════════════════════════════════════════════
  async public(sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender)) return reply(sock, msg, '❌ Only owner can change bot mode.');
    config.botMode = 'public';
    await react(sock, msg, '🌐');
    return reply(sock, msg,
      `🌐 *Bot is now PUBLIC!*\n\nEveryone can use all commands.\n\n_${config.bot.name}_`
    );
  },

  async private(sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender)) return reply(sock, msg, '❌ Only owner can change bot mode.');
    config.botMode = 'private';
    await react(sock, msg, '🔒');
    return reply(sock, msg,
      `🔒 *Bot is now PRIVATE!*\n\nOnly you (owner) can use commands.\n\n_${config.bot.name}_`
    );
  },

  // ════════════════════════════════════════════
  //  📱 SIM LOOKUP
  // ════════════════════════════════════════════
  async sim(sock, msg, args) {
    await react(sock, msg, '🔍');
    const number = args[0];
    if (!number) {
      return reply(sock, msg,
        `❌ *Number required!*\n\n📌 *Usage:* ${config.bot.prefix}sim 03XXXXXXXXX`
      );
    }
    const cleaned = number.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      return reply(sock, msg, '❌ *Invalid number format!*\nExample: .sim 03018787786');
    }

    const cacheKey = `sim_${cleaned}`;
    const cached = simCache.get(cacheKey);
    if (cached) {
      await react(sock, msg, '✅');
      return reply(sock, msg, cached);
    }

    try {
      await reply(sock, msg, '⏳ *Searching record...*');
      const { data } = await axios.get(
        `https://sim-database-api.fly.dev/api/sim?number=${cleaned}`,
        { timeout: 10000 }
      );
      if (!data || !data.number) {
        return reply(sock, msg, '❌ *No record found!*\nPlease check the number.');
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
      return reply(sock, msg, '❌ *Server did not respond!*\nPlease try again.');
    }
  },

  // ════════════════════════════════════════════
  //  🏓 PING / ALIVE / STATUS
  // ════════════════════════════════════════════
  async ping(sock, msg) {
    const start = Date.now();
    await react(sock, msg, '🏓');
    const ms = Date.now() - start;
    await reply(sock, msg, `🏓 *Pong!*\n⚡ Speed: *${ms}ms*\n✅ Bot is active!`);
  },

  async alive(sock, msg) {
    const uptime = formatUptime(Date.now() - config.bot.startTime);
    const mem = process.memoryUsage();
    const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const modeTag = config.botMode === 'private' ? '🔒 PRIVATE' : '🌐 PUBLIC';
    const text = `
✅ *${config.bot.name} IS ONLINE!*
━━━━━━━━━━━━━━━━━
⏱ *Uptime:* ${uptime}
💾 *Memory:* ${memMB} MB
🌐 *Status:* Active
🔰 *Mode:* ${modeTag}
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
📢 *Channel:* ${config.owner.channel}
━━━━━━━━━━━━━━━━━
_Want your own bot? Contact owner!_`;
    await sock.sendMessage(msg.key.remoteJid, { image: { url: MENU_IMAGE }, caption: text }, { quoted: msg });
  },

  // ════════════════════════════════════════════
  //  📥 DOWNLOADS — Short aliases
  // ════════════════════════════════════════════
  async dl(sock, msg, args) {
    if (!args[0]) return reply(sock, msg, `❌ URL required!\nExample: \`${config.bot.prefix}dl https://tiktok.com/...\``);
    const url = cleanUrl(args[0]);
    await react(sock, msg, '⏳');
    const result = await smartDownload(url);
    if (!result.success) {
      await react(sock, msg, '❌');
      return reply(sock, msg, `❌ *Download failed!*\n\n${result.error}`);
    }
    await react(sock, msg, '✅');
    const caption = `📥 *${result.platform} Download*\n📌 ${result.title || ''}\n👤 ${result.author || ''}\n\n_${config.bot.name} | ${config.owner.name}_`.trim();
    if (result.isImage && result.image) return sendImage(sock, msg, result.image, caption);
    if (result.isAudio && result.audio) {
      await reply(sock, msg, `🎵 *${result.title || 'Audio'}*\n_${config.bot.name}_`);
      return sendAudio(sock, msg, result.audio);
    }
    if (result.video || result.video_hd || result.video_sd) {
      return sendVideo(sock, msg, result.video || result.video_hd || result.video_sd, caption);
    }
    if (result.audio) return sendAudio(sock, msg, result.audio);
    await react(sock, msg, '❌');
    return reply(sock, msg, '❌ Download link not found.');
  },

  // Short aliases — .t .i .f .tw .dm
  async t(sock, msg, args)  { return commands.dl(sock, msg, args); },  // TikTok
  async i(sock, msg, args)  { return commands.dl(sock, msg, args); },  // Instagram
  async f(sock, msg, args)  { return commands.dl(sock, msg, args); },  // Facebook
  async tw(sock, msg, args) { return commands.dl(sock, msg, args); },  // Twitter
  async dm(sock, msg, args) { return commands.dl(sock, msg, args); },  // Dailymotion

  // Long aliases still work
  async tiktok(sock, msg, args)  { return commands.dl(sock, msg, args); },
  async ig(sock, msg, args)      { return commands.dl(sock, msg, args); },
  async fb(sock, msg, args)      { return commands.dl(sock, msg, args); },
  async twitter(sock, msg, args) { return commands.dl(sock, msg, args); },

  async y(sock, msg, args) {  // Short alias for ytmp3
    if (!args[0]) return reply(sock, msg, `❌ YouTube link required!\nExample: \`${config.bot.prefix}y https://youtube.com/...\``);
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
  async ytmp3(sock, msg, args) { return commands.y(sock, msg, args); },

  // ════════════════════════════════════════════
  //  👁️ VIEW ONCE SAVER
  // ════════════════════════════════════════════
  async view(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg,
        `❌ *Reply to a view-once image/video!*\n\n📌 How to use:\n1. Reply to a view-once message\n2. Type \`${config.bot.prefix}view\``
      );
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    const viewOnceTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
    if (!viewOnceTypes.includes(quotedType)) {
      return reply(sock, msg, '❌ *Only images, videos, or audio supported.*');
    }

    await react(sock, msg, '⏳');

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const quotedMsg = {
        key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
        message: ctx.quotedMessage,
      };

      const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
      const ownerTag = `\n\n📞 *Contact:* wa.me/${config.owner.number}\n💬 *Want your own bot? Contact:* wa.me/${config.owner.number}`;

      if (quotedType === 'imageMessage') {
        await sock.sendMessage(jid, {
          image: buffer,
          caption: `🖼️ *View Once Saved!*${ownerTag}`,
        }, { quoted: msg });
      } else if (quotedType === 'videoMessage') {
        await sock.sendMessage(jid, {
          video: buffer,
          caption: `🎥 *View Once Saved!*${ownerTag}`,
          mimetype: 'video/mp4',
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: msg });
      }
      await react(sock, msg, '✅');
    } catch (err) {
      await react(sock, msg, '❌');
      logger.error('View error:', err.message);
      return reply(sock, msg, '❌ Could not save media. Please try again.');
    }
  },

  // ════════════════════════════════════════════
  //  🌤️ WEATHER
  // ════════════════════════════════════════════
  async weather(sock, msg, args) {
    const city = args.join(' ').trim();
    if (!city) return reply(sock, msg, `❌ *City name required!*\n\n📌 Example: ${config.bot.prefix}weather Karachi`);

    await react(sock, msg, '🌤️');

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
        return reply(sock, msg, '❌ *Weather data not found.*\nCheck city name and try again.');
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
      return reply(sock, msg, '❌ Weather data parse error. Try again.');
    }
  },

  // ════════════════════════════════════════════
  //  🧮 CALCULATOR
  // ════════════════════════════════════════════
  async calc(sock, msg, args) {
    const expr = args.join(' ').trim();
    if (!expr) return reply(sock, msg, `❌ *Expression required!*\n\n📌 Example: ${config.bot.prefix}calc 20*5+100`);

    if (!/^[0-9+\-*/.()%\s]+$/.test(expr)) {
      return reply(sock, msg, '❌ *Invalid characters!*\nAllowed: 0-9, +, -, *, /, (, ), ., %');
    }

    if (!expr.replace(/\s/g, '')) return reply(sock, msg, '❌ Please enter something!');

    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result !== 'number' || !isFinite(result)) throw new Error('Invalid');
      const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
      return reply(sock, msg, `🧮 *Calculator*\n\n📝 Expression: \`${expr}\`\n✅ Result: *${formatted}*`);
    } catch (_) {
      return reply(sock, msg, '❌ Invalid expression. Please check.\n\nExample: .calc 20*5+100');
    }
  },

  // ════════════════════════════════════════════
  //  📰 NEWS
  // ════════════════════════════════════════════
  async news(sock, msg) {
    await react(sock, msg, '📰');

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
        return reply(sock, msg, '❌ *News not available.*\nPlease try again.');
      }
    }

    await react(sock, msg, '✅');
    return reply(sock, msg,
      `📰 *Pakistan News — BBC Urdu*\n━━━━━━━━━━━━━━━━━━\n${headlines}\n━━━━━━━━━━━━━━━━━━\n🔗 bbc.com/urdu\n\n_${config.bot.name}_`
    );
  },

  // ════════════════════════════════════════════
  //  🎨 STICKER (image/video → sticker)
  // ════════════════════════════════════════════
  async sticker(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg,
        `❌ *Reply to an image or video!*\n\n📌 How to use:\n1. Reply to an image\n2. Type \`${config.bot.prefix}sticker\``
      );
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    if (!['imageMessage', 'videoMessage'].includes(quotedType)) {
      return reply(sock, msg, '❌ *Only image or video can become sticker.*\nSticker to image: .toimg');
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
        '❌ *Sticker creation failed.*\n\n⚠️ Server needs sharp/ffmpeg.\n' +
        'Works on Railway — may not work on shared hosting.\n\n' +
        'Solution: Use Railway or a VPS.'
      );
    }
  },

  // ════════════════════════════════════════════
  //  🖼️ TOIMG (sticker → image)
  // ════════════════════════════════════════════
  async toimg(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg, `❌ *Reply to a sticker!*\n\n📌 Reply to sticker and type \`${config.bot.prefix}toimg\``);
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    if (quotedType !== 'stickerMessage') {
      return reply(sock, msg, '❌ *Only reply to a sticker for .toimg.*\nImage to sticker: .sticker');
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
      return reply(sock, msg, '❌ Image conversion failed. Please try again.');
    }
  },

  // ════════════════════════════════════════════
  //  👥 GROUPINFO
  // ════════════════════════════════════════════
  async groupinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *This command only works in groups.*');

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
📛 *Name:* ${meta.subject}
👤 *Members:* ${meta.participants.length}
👑 *Admins (${admins.length}):*
${adminList}
📅 *Created:* ${new Date(meta.creation * 1000).toLocaleDateString('en-PK')}
📝 *Description:*
${meta.desc || 'No description'}${inviteLink}
━━━━━━━━━━━━━━━━━
_${config.bot.name}_`;

      const mentions = admins.map(p => p.id);
      await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    } catch (_) { await reply(sock, msg, '❌ Group info not found. Admin permission required.'); }
  },

  async grupinfo(sock, msg) { return commands.groupinfo(sock, msg); },

  // ════════════════════════════════════════════
  //  🖼️ SETDP — Change group or personal DP
  // ════════════════════════════════════════════
  async setdp(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    if (!ctx?.quotedMessage) {
      return reply(sock, msg,
        `❌ *Reply to an image!*\n\n📌 How to use:\n1. Reply to an image\n2. Type \`${config.bot.prefix}setdp\`\n\n_Works for group DP (admin only) or your personal DP_`
      );
    }

    const quotedType = Object.keys(ctx.quotedMessage)[0];
    if (quotedType !== 'imageMessage') {
      return reply(sock, msg, '❌ *Only image can be used for DP.*');
    }

    // Group DP — requires admin
    if (jid.endsWith('@g.us')) {
      try {
        const meta = await sock.groupMetadata(jid);
        const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
        if (!isAdmin && !isOwner(sender)) {
          return reply(sock, msg, '❌ *Only group admins can change group DP.*');
        }
      } catch (_) { return reply(sock, msg, '❌ Admin check failed.'); }
    }

    await react(sock, msg, '⏳');

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const quotedMsg = {
        key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
        message: ctx.quotedMessage,
      };

      const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
      const target = jid.endsWith('@g.us') ? jid : sender;
      await sock.updateProfilePicture(target, buffer);
      await react(sock, msg, '✅');
      return reply(sock, msg, `✅ *DP updated successfully!*\n_${config.bot.name}_`);
    } catch (err) {
      await react(sock, msg, '❌');
      logger.error('setdp error:', err.message);
      return reply(sock, msg, '❌ DP update failed. Make sure bot has permission.');
    }
  },

  // ════════════════════════════════════════════
  //  🆔 ID
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
  //  🔄 RESETLINK (admin only)
  // ════════════════════════════════════════════
  async resetlink(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Only works in groups.*');

    try {
      const meta   = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
      if (!isAdmin && !isOwner(sender)) {
        return reply(sock, msg, '❌ *Only group admins can reset the link.*');
      }
    } catch (_) { return reply(sock, msg, '❌ Admin check failed.'); }

    try {
      const newCode = await sock.groupRevokeInvite(jid);
      return reply(sock, msg,
        `✅ *Group link has been reset!*\n\n🔗 *New Link:*\nhttps://chat.whatsapp.com/${newCode}\n\n_Old link no longer works._`
      );
    } catch (_) {
      return reply(sock, msg, '❌ Reset failed. Am I an admin?');
    }
  },

  // ════════════════════════════════════════════
  //  📋 RULES
  // ════════════════════════════════════════════
  async rules(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Only works in groups.*');

    const allRules = loadRules();
    const groupRules = allRules[jid];

    if (!groupRules) {
      return reply(sock, msg,
        `📋 *Group Rules*\n━━━━━━━━━━━━━━━\n` +
        `⚠️ No rules set for this group yet.\n\n` +
        `Admin can set rules:\n\`${config.bot.prefix}setrules <rules text>\``
      );
    }

    return reply(sock, msg, `📋 *Group Rules*\n━━━━━━━━━━━━━━━\n${groupRules}\n━━━━━━━━━━━━━━━\n_${config.bot.name}_`);
  },

  // ════════════════════════════════════════════
  //  ✏️ SETRULES (admin only)
  // ════════════════════════════════════════════
  async setrules(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ *Only works in groups.*');

    try {
      const meta   = await sock.groupMetadata(jid);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = meta.participants.some(p => p.id === sender && p.admin);
      if (!isAdmin && !isOwner(sender)) {
        return reply(sock, msg, '❌ *Only group admins can set rules.*');
      }
    } catch (_) { return reply(sock, msg, '❌ Admin check failed.'); }

    const rulesText = args.join(' ').trim();
    if (!rulesText) {
      return reply(sock, msg,
        `❌ *Rules text required!*\n\n📌 Example:\n\`${config.bot.prefix}setrules 1. Be respectful\n2. No spam\n3. No links\``
      );
    }

    const allRules = loadRules();
    allRules[jid] = rulesText;
    saveRules(allRules);

    return reply(sock, msg, `✅ *Group rules have been set!*\n\nTo view: \`${config.bot.prefix}rules\``);
  },

  // ════════════════════════════════════════════
  //  🎮 FUN COMMANDS
  // ════════════════════════════════════════════
  async joke(sock, msg) {
    const jokes = [
      '🤣 A man went to the doctor...\nDoctor: What\'s wrong?\nMan: Nothing, just wanted to check!\nDoctor: Then what about my fee? 😂',
      '😂 Teacher: What is 2+2?\nStudent: Depends sir... in exams it could be 5!',
      '🤣 Wife: You\'ve forgotten me!\nHusband: No dear, I\'m still trying! 😅',
      '😂 Friend: Give a party when you get salary!\nMe: Sure, next salary! 💸',
      '🤣 Student 1: Let me copy!\nStudent 2: I have nothing either!\nStudent 1: Still... at least we\'ll feel confident! 😂',
    ];
    await reply(sock, msg, jokes[Math.floor(Math.random() * jokes.length)]);
  },

  async quote(sock, msg) {
    const quotes = [
      '💪 *"Difficulties don\'t break you, they build you."*\n— Sahil Hacker',
      '🌟 *"The path to success goes through hard work, not shortcuts."*',
      '🔥 *"The one who rises after falling is the one who truly wins."*',
      '⚡ *"Don\'t wait for tomorrow, start today."*',
      '💡 *"Knowledge is a light that never goes out."*',
      '🎯 *"Set your own targets, don\'t follow others\' path."*',
      '🌈 *"After every storm comes the light."*',
    ];
    await reply(sock, msg, quotes[Math.floor(Math.random() * quotes.length)]);
  },

  async flip(sock, msg) {
    const result = Math.random() < 0.5 ? '🪙 *HEADS*' : '🪙 *TAILS*';
    await reply(sock, msg, `🎲 Coin flip result:\n\n${result}`);
  },

  async dice(sock, msg) {
    const num = Math.floor(Math.random() * 6) + 1;
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
    await reply(sock, msg, `🎲 Dice rolled!\n\nResult: ${emojis[num-1]} *${num}*`);
  },

  async fact(sock, msg) {
    const facts = [
      '🧠 The human brain is 70% water.',
      '🐙 An octopus has 3 hearts!',
      '🌍 100 lightning bolts strike Earth every second.',
      '🦋 Butterflies taste with their feet.',
      '🍯 Honey never expires — 3000 year old honey is still edible!',
      '🐘 Elephants remember a human voice for a lifetime.',
      '🌙 One day on the Moon equals 29 Earth days.',
    ];
    await reply(sock, msg, `💡 *Random Fact:*\n\n${facts[Math.floor(Math.random() * facts.length)]}`);
  },

  // ════════════════════════════════════════════
  //  👥 GROUP COMMANDS
  // ════════════════════════════════════════════
  async kick(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ This command only works in groups.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Mention a user to kick (@tag).');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'remove');
      await reply(sock, msg, `✅ *${mentioned.length}* user(s) removed from group!`);
    } catch (_) { await reply(sock, msg, '❌ Failed. Am I an admin?'); }
  },

  async add(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    const number = args[0]?.replace(/[^0-9]/g, '');
    if (!number) return reply(sock, msg, `❌ Example: \`${config.bot.prefix}add 923001234567\``);
    try {
      await sock.groupParticipantsUpdate(jid, [`${number}@s.whatsapp.net`], 'add');
      await reply(sock, msg, `✅ *+${number}* added to group!`);
    } catch (_) { await reply(sock, msg, '❌ Failed. Number must be on WhatsApp.'); }
  },

  async promote(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Mention a user.');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'promote');
      await reply(sock, msg, '✅ User promoted to admin!');
    } catch (_) { await reply(sock, msg, '❌ Failed. Am I an admin?'); }
  },

  async demote(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Mention a user.');
    try {
      await sock.groupParticipantsUpdate(jid, mentioned, 'demote');
      await reply(sock, msg, '✅ User removed from admin!');
    } catch (_) { await reply(sock, msg, '❌ Failed. Am I an admin?'); }
  },

  async mute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await reply(sock, msg, '🔇 Group muted! Only admins can send messages.');
    } catch (_) { await reply(sock, msg, '❌ Failed. Am I an admin?'); }
  },

  async unmute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await reply(sock, msg, '🔊 Group unmuted! Everyone can send messages.');
    } catch (_) { await reply(sock, msg, '❌ Failed. Am I an admin?'); }
  },

  async tagall(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return reply(sock, msg, '❌ Only in groups.');
    try {
      const meta    = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const mentions = members.map(m => `@${m.split('@')[0]}`).join(' ');
      await sock.sendMessage(jid, { text: `📢 *All Members:*\n\n${mentions}`, mentions: members }, { quoted: msg });
    } catch (_) { await reply(sock, msg, '❌ Failed. Admin permission required.'); }
  },

  // ════════════════════════════════════════════
  //  👑 OWNER COMMANDS
  // ════════════════════════════════════════════
  async autoreact(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.autoReact = true;  return reply(sock, msg, '✅ Auto React *ON*!'); }
    if (val === 'off') { config.features.autoReact = false; return reply(sock, msg, '🔴 Auto React *OFF*!'); }
    return reply(sock, msg, `Auto React: *${config.features.autoReact ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async autoreply(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.autoReply = true;  return reply(sock, msg, '✅ Auto Reply *ON*!'); }
    if (val === 'off') { config.features.autoReply = false; return reply(sock, msg, '🔴 Auto Reply *OFF*!'); }
    return reply(sock, msg, `Auto Reply: *${config.features.autoReply ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async antilink(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.antiLink = true;  return reply(sock, msg, '✅ Anti-Link *ON*! Links banned in groups.'); }
    if (val === 'off') { config.features.antiLink = false; return reply(sock, msg, '🔴 Anti-Link *OFF*.'); }
    return reply(sock, msg, `Anti-Link: *${config.features.antiLink ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async antispam(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const val = args[0]?.toLowerCase();
    if (val === 'on')  { config.features.antiSpam = true;  return reply(sock, msg, '✅ Anti-Spam *ON*!'); }
    if (val === 'off') { config.features.antiSpam = false; return reply(sock, msg, '🔴 Anti-Spam *OFF*.'); }
    return reply(sock, msg, `Anti-Spam: *${config.features.antiSpam ? 'ON ✅' : 'OFF 🔴'}*`);
  },

  async broadcast(sock, msg, args) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const text = args.join(' ');
    if (!text) return reply(sock, msg, '❌ Message required.');
    const chats = await sock.groupFetchAllParticipating();
    let count = 0;
    for (const jid of Object.keys(chats)) {
      try {
        await sock.sendMessage(jid, { text: `📢 *SAHIL 804 BROADCAST*\n\n${text}\n\n_${config.owner.name}_` });
        count++;
        await sleep(1200);
      } catch (_) {}
    }
    return reply(sock, msg, `✅ Broadcast sent to *${count}* groups!`);
  },

  async bc(sock, msg, args) { return commands.broadcast(sock, msg, args); },

  async block(sock, msg) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Mention a user.');
    for (const jid of mentioned) {
      try { await sock.updateBlockStatus(jid, 'block'); } catch (_) {}
    }
    await reply(sock, msg, `✅ *${mentioned.length}* user(s) blocked!`);
  },

  async unblock(sock, msg) {
    if (!isOwner(msg.key.participant || msg.key.remoteJid))
      return reply(sock, msg, '❌ Owner only.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply(sock, msg, '❌ Mention a user.');
    for (const jid of mentioned) {
      try { await sock.updateBlockStatus(jid, 'unblock'); } catch (_) {}
    }
    await reply(sock, msg, `✅ *${mentioned.length}* user(s) unblocked!`);
  },
};

// ════════════════════════════════════════════
//  🛡️ Anti-Spam Tracker (BUG #3 fix)
// ════════════════════════════════════════════
const spamTracker = new Map();

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
}, 5 * 60 * 1000).unref();

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

    const senderJid = msg.key.participant || msg.key.remoteJid;

    // Mode guard — block non-owners in private mode
    if (!isBotAllowed(senderJid)) return;

    // Spam check
    if (config.features.antiSpam && !isOwner(senderJid) && checkSpam(senderJid)) {
      return reply(sock, msg, '⚠️ You are sending too many messages! Please slow down.');
    }

    if (commands[cmd]) {
      logger.info(`CMD: ${cmd} | FROM: ${msg.key.remoteJid}`);
      await commands[cmd](sock, msg, args);
    }
  } catch (err) {
    logger.error('Command error:', err.message);
    try { await reply(sock, msg, `❌ Error: ${err.message}`); } catch (_) {}
  }
}

module.exports = { handleCommand, isOwner, react, reply, pickEmoji };
