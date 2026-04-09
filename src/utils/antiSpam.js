// ============================================
// SAHIL 804 - Anti-Spam Protection
// ============================================
const config = require('../config/config');
const spamMap = new Map();

function isSpam(jid) {
  const now    = Date.now();
  const record = spamMap.get(jid) || { count: 0, firstMsg: now };

  if (now - record.firstMsg > config.spam.windowMs) {
    spamMap.set(jid, { count: 1, firstMsg: now });
    return false;
  }

  record.count++;
  spamMap.set(jid, record);
  return record.count > config.spam.maxMessages;
}

module.exports = { isSpam };
