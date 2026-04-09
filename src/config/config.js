// ============================================
// SAHIL 804 - Configuration
// Developer: Sahil Hacker
// ⚠️ DO NOT MODIFY OWNER DETAILS
// ============================================
require('dotenv').config();

const config = {
  owner: {
    name:   'Sahil Hacker',
    number: '923496049312',
    image:  'https://i.ibb.co/b51SYm0X/IMG-20260408-WA0010.jpg',
    email:  'sahil804@owner.com',
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
  reactEmojis: ['❤️','🔥','😍','👏','🎉','💯','⚡','🌟','💪','👌'],
  spam: { maxMessages: 10, timeWindow: 10000, warnBefore: 7 },
};

module.exports = config;
