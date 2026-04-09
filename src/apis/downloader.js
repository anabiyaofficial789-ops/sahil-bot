// ============================================
// SAHIL 804 - Universal Media Downloader (FIXED)
// ============================================

const axios = require('axios');

// ✅ FIX: axios-retry safe import (no crash)
let axiosRetry;
try {
  axiosRetry = require('axios-retry').default;
} catch (e) {
  console.warn("axios-retry not found, skipping retry system");
}

const config = require('../config/config');
const { logger } = require('../utils/logger');
const { downloadCache } = require('../utils/cache');

// ✅ Apply retry only if module exists
if (axiosRetry) {
  axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (err) =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) ||
      err.code === 'ECONNABORTED' ||
      (err.response && err.response.status >= 500),
    onRetry: (count, err) => logger.warn(`Retry ${count} — ${err.message}`),
  });
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json, text/plain, */*',
};

// ── TikTok ──────────────────────────────────
async function downloadTikTok(url) {
  try {
    const res = await axios.post('https://www.tikwm.com/api/',
      new URLSearchParams({ url, hd: 1 }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });

    if (res.data && res.data.code === 0) {
      const d = res.data.data;
      return {
        success: true,
        platform: 'TikTok',
        title: d.title || 'TikTok Video',
        video: d.hdplay || d.play,
      };
    }
  } catch (err) {
    logger.error("TikTok error: " + err.message);
  }

  return { success: false, error: 'TikTok download fail.' };
}

// ── Instagram ────────────────────────────────
async function downloadInstagram(url) {
  try {
    const res = await axios.post('https://v3.saveig.app/api/ajaxSearch',
      new URLSearchParams({ q: url, t: 'media', lang: 'en' }),
      { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });

    const match = res.data?.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) {
      return {
        success: true,
        platform: 'Instagram',
        video: match[1]
      };
    }
  } catch (err) {
    logger.error("Instagram error: " + err.message);
  }

  return { success: false, error: 'Instagram download fail.' };
}

// ── YouTube ────────────────────────────────
async function downloadYouTube(url) {
  if (!config.rapidApiKey) {
    return {
      success: false,
      error: 'RAPIDAPI_KEY missing'
    };
  }

  try {
    const res = await axios.get(
      `https://youtube-mp3-downloader2.p.rapidapi.com/ytmp3/ytmp3/custom/?url=${encodeURIComponent(url)}&quality=320`,
      {
        headers: {
          'X-RapidAPI-Key': config.rapidApiKey,
          'X-RapidAPI-Host': 'youtube-mp3-downloader2.p.rapidapi.com'
        }
      });

    if (res.data && res.data.link) {
      return {
        success: true,
        platform: 'YouTube',
        audio: res.data.link
      };
    }

  } catch (err) {
    logger.error("YouTube error: " + err.message);
  }

  return { success: false, error: 'YouTube download fail.' };
}

// ── Smart Downloader ────────────────────────
async function smartDownload(url) {
  url = url.trim();

  const cacheKey = `dl_${url}`;
  const cached = downloadCache.get(cacheKey);
  if (cached) return cached;

  let result;

  if (url.includes('tiktok')) result = await downloadTikTok(url);
  else if (url.includes('instagram')) result = await downloadInstagram(url);
  else if (url.includes('youtube') || url.includes('youtu.be')) result = await downloadYouTube(url);
  else result = { success: false, error: 'Platform not supported' };

  if (result.success) {
    downloadCache.set(cacheKey, result);
  }

  return result;
}

module.exports = {
  smartDownload,
  downloadTikTok,
  downloadInstagram,
  downloadYouTube
};
