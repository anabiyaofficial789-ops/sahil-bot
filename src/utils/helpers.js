const config = require('../config/config');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} din ${h % 24} ghante`;
  if (h > 0) return `${h} ghante ${m % 60} minute`;
  if (m > 0) return `${m} minute ${s % 60} second`;
  return `${s} second`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOwner(sender) {
  const num = sender.replace(/[^0-9]/g, '');
  return num.includes(config.owner.number.replace(/[^0-9]/g, ''));
}

function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SAH-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractNumber(text) {
  const m = text.match(/\d{10,15}/);
  return m ? m[0] : null;
}

function cleanUrl(url) {
  return url.trim().replace(/[<>]/g, '');
}

function isSupportedPlatform(url) {
  return url.includes('tiktok.com') || url.includes('vm.tiktok') ||
         url.includes('instagram.com') || url.includes('facebook.com') ||
         url.includes('fb.watch') || url.includes('youtube.com') ||
         url.includes('youtu.be') || url.includes('twitter.com') ||
         url.includes('x.com') || url.includes('dailymotion.com') ||
         url.includes('likee.video') || url.includes('snack.video');
}

module.exports = { formatUptime, formatBytes, isOwner, generateSessionId, sleep, extractNumber, cleanUrl, isSupportedPlatform };
