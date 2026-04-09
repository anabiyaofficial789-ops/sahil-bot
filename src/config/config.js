// ============================================
// SAHIL 804 - Configuration
// Developer: Sahil Hacker
// ============================================
require('dotenv').config();

const config = {
  owner: {
    name:    'Sahil Hacker',
    number:  '923496049312',
    image:   'https://i.ibb.co/b51SYm0X/IMG-20260408-WA0010.jpg',
    email:   'sahil804@owner.com',
    channel: 'https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l',
  },
  bot: {
    name:      process.env.BOT_NAME   || 'SAHIL 804',
    prefix:    process.env.BOT_PREFIX || '.',
    version:   '4.0.0',
    developer: 'Sahil Hacker',
    startTime: Date.now(),
  },
  port:          parseInt(process.env.PORT)  || 8000,
  sessionSecret: process.env.SESSION_SECRET  || 'sahil804secret',
  websiteUrl:    process.env.WEBSITE_URL     || 'http://localhost:8000',
  adminPassword: process.env.ADMIN_PASSWORD  || 'sahil804admin',
  rapidApiKey:   process.env.RAPIDAPI_KEY    || '',

  // PUBLIC = everyone can use | PRIVATE = only bot owner
  // Changed at runtime via .public / .private command
  botMode: 'public',

  features: {
    autoReact:  process.env.AUTO_REACT  !== 'false',
    autoReply:  process.env.AUTO_REPLY  !== 'false',
    autoRead:   process.env.AUTO_READ   !== 'false',
    antiDelete: process.env.ANTI_DELETE !== 'false',
    welcomeMsg: process.env.WELCOME_MSG !== 'false',
    goodbyeMsg: process.env.GOODBYE_MSG !== 'false',
    antiSpam:   process.env.ANTI_SPAM   !== 'false',
    antiLink:   process.env.ANTI_LINK   === 'true',
    antiBot:    process.env.ANTI_BOT    !== 'false',
  },

  // 30 context-aware emojis — used based on message keywords
  reactEmojis: ['❤️','🔥','😍','👏','🎉','💯','⚡','🌟','💪','👌',
                 '😂','🥰','🤩','🙌','✨','💥','🎊','🏆','💎','🚀',
                 '😎','🤣','💀','👀','🫶','🥳','😘','🫡','🤙','💫'],

  // Keyword → emoji mapping for smart reactions
  reactKeywords: {
    // Sad / problems
    sad:      '😢', cry: '😢', dukh: '😢', rona: '😢', broken: '💔',
    // Happy / celebration
    happy:    '🎉', khushi: '🎉', mubarak: '🎊', congrats: '🎊', birthday: '🎂',
    // Love
    love:     '❤️', pyar: '❤️', dil: '🥰', ishq: '😍',
    // Funny
    lol:      '😂', haha: '😂', funny: '😂', joke: '🤣', maza: '😂',
    // Anger
    angry:    '😡', gussa: '😡', mad: '😡',
    // Wow / surprise
    wow:      '🤩', masha: '✨', subhan: '✨', amazing: '🤩', wah: '🤩',
    // Food
    food:     '😋', khana: '😋', pizza: '🍕', biryani: '😋',
    // Fire / hype
    fire:     '🔥', lit: '🔥', beast: '💪', strong: '💪',
    // Win
    win:      '🏆', champ: '🏆', legend: '⭐', bhai: '🫡',
  },

  spam: { maxMessages: 10, timeWindow: 10000, warnBefore: 7 },
};

module.exports = config;
