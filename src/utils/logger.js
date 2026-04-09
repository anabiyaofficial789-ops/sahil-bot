const pino = require('pino');
const fs   = require('fs-extra');
const path = require('path');
fs.ensureDirSync(path.join(__dirname, '../../logs'));
const logger = pino({
  level: 'info',
  transport: {
    targets: [
      { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' }, level: 'info' },
      { target: 'pino/file',   options: { destination: path.join(__dirname, '../../logs/bot.log') }, level: 'info' },
    ],
  },
});
module.exports = { logger };
