// ============================================
// SAHIL 804 - Main Entry (Owner Bot)
// Developer: Sahil Hacker
// ============================================
require('dotenv').config();
const { launchBot } = require('./botLauncher');
const { logger }    = require('./utils/logger');
const config        = require('./config/config');

logger.info(`🚀 ${config.bot.name} v${config.bot.version} start ho raha hai...`);
logger.info(`👑 Developer: ${config.owner.name}`);
launchBot('owner').catch(err => logger.error('Bot launch error:', err));
