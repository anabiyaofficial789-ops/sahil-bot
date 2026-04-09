// ============================================
// SAHIL 804 - Universal Media Downloader
// Supports: TikTok, Instagram, Facebook,
//           YouTube, Twitter/X, Dailymotion,
//           Likee, Snack Video
// Developer: Sahil Hacker
// PERF #2: axios-retry with exponential backoff
// CHECK #1: Clear API-key error messages
// ============================================
const axios      = require('axios');
const axiosRetry = require('axios-retry');
const config     = require('../config/config');
const { logger } = require('../utils/logger');
const { downloadCache } = require('../utils/cache');

// PERF #2: Configure retry — 3 attempts, exponential backoff, network errors only
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    err.code === 'ECONNABORTED' ||
    (err.response?.status >= 500 && err.response?.status < 600),
  onRetry: (count, err) => logger.warn(`Retry ${count} — ${err.message}`),
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
};

// ── TikTok ──────────────────────────────────
async function downloadTikTok(url) {
  // API 1: tikwm.com (Free, No key needed)
  try {
    const res = await axios.post('https://www.tikwm.com/api/',
      new URLSearchParams({ url, hd: 1 }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
    if (res.data?.code === 0) {
      const d = res.data.data;
      return {
        success: true, platform: 'TikTok',
        title: d.title || 'TikTok Video',
        author: d.author?.nickname || 'Unknown',
        video: d.hdplay || d.play,
        audio: d.music,
        thumbnail: d.cover,
        duration: d.duration,
      };
    }
  } catch (_) {}

  // API 2: tiklydown
  try {
    const res = await axios.get(
      `https://api.tiklydown.eu.org/api/download/v3?url=${encodeURIComponent(url)}`,
      { headers: HEADERS, timeout: 20000 });
    if (res.data?.video) {
      return {
        success: true, platform: 'TikTok',
        title: res.data.title || 'TikTok Video',
        author: res.data.author?.name || 'Unknown',
        video: res.data.video?.noWatermark || res.data.video?.watermark,
        audio: res.data.music?.play_url,
        thumbnail: res.data.thumbnail,
      };
    }
  } catch (_) {}

  // API 3: ssstik fallback
  try {
    const res = await axios.post('https://ssstik.io/abc?url=dl',
      new URLSearchParams({ id: url, locale: 'en', tt: 'NWFiNjE4' }),
      { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://ssstik.io/' }, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'TikTok', title: 'TikTok Video', video: match[1] };
  } catch (_) {}

  return { success: false, error: 'TikTok download fail hua. URL check karein.' };
}

// ── Instagram ────────────────────────────────
async function downloadInstagram(url) {
  function extractShortcode(u) {
    const m = u.match(/\/(p|reel|tv|reels)\/([A-Za-z0-9_-]+)/);
    return m ? m[2] : '';
  }

  // API 1: instaloader
  try {
    const sc = extractShortcode(url);
    if (sc) {
      const res = await axios.get(`https://api.instaloader.de/v1/post?shortcode=${sc}`,
        { headers: HEADERS, timeout: 20000 });
      if (res.data?.videos?.length > 0) {
        return { success: true, platform: 'Instagram', title: res.data.caption?.slice(0, 80) || 'Instagram Video', video: res.data.videos[0].url };
      }
      if (res.data?.images?.length > 0) {
        return { success: true, platform: 'Instagram', title: 'Instagram Image', image: res.data.images[0].url, isImage: true };
      }
    }
  } catch (_) {}

  // API 2: saveig
  try {
    const res = await axios.post('https://v3.saveig.app/api/ajaxSearch',
      new URLSearchParams({ q: url, t: 'media', lang: 'en' }),
      { headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
    const vMatch = res.data?.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (vMatch) return { success: true, platform: 'Instagram', title: 'Instagram Video', video: vMatch[1] };
    const iMatch = res.data?.data?.match(/href="(https:\/\/[^"]+\.jpg[^"]*)"/);
    if (iMatch) return { success: true, platform: 'Instagram', title: 'Instagram Image', image: iMatch[1], isImage: true };
  } catch (_) {}

  // API 3: snapsave
  try {
    const res = await axios.post('https://snapsave.app/action.php',
      new URLSearchParams({ url }),
      { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://snapsave.app/' }, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'Instagram', title: 'Instagram Video', video: match[1] };
  } catch (_) {}

  return { success: false, error: 'Instagram download fail hua. Post public honi chahiye.' };
}

// ── Facebook ──────────────────────────────────
async function downloadFacebook(url) {
  // API 1: fdownloader
  try {
    const res = await axios.post('https://fdownloader.net/api/ajaxSearch',
      new URLSearchParams({ q: url, lang: 'en', cftoken: '' }),
      { headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
    const match = res.data?.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'Facebook', title: 'Facebook Video', video: match[1] };
  } catch (_) {}

  // API 2: getfvid
  try {
    const res = await axios.post('https://getfvid.com/downloader',
      new URLSearchParams({ url }),
      { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://getfvid.com/' }, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'Facebook', title: 'Facebook Video', video: match[1] };
  } catch (_) {}

  // CHECK #1: API 3: RapidAPI — only if key is present, otherwise clear error
  if (config.rapidApiKey) {
    try {
      const res = await axios.get(
        `https://facebook-downloader.p.rapidapi.com/v1/download?url=${encodeURIComponent(url)}`,
        { headers: { 'X-RapidAPI-Key': config.rapidApiKey, 'X-RapidAPI-Host': 'facebook-downloader.p.rapidapi.com' }, timeout: 20000 });
      if (res.data?.sd) return { success: true, platform: 'Facebook', title: 'Facebook Video', video: res.data.hd || res.data.sd };
    } catch (_) {}
  }

  return { success: false, error: 'Facebook download fail hua. Video public honi chahiye.' };
}

// ── YouTube (Audio + Video) ──────────────────
async function downloadYouTube(url, type = 'audio') {
  function extractId(u) {
    const m = u.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  const videoId = extractId(url);
  if (!videoId) return { success: false, error: 'YouTube link sahi nahi hai.' };

  if (type === 'audio') {
    // CHECK #1: RapidAPI — only if key present, with clear error if missing
    if (config.rapidApiKey) {
      try {
        const res = await axios.get(
          `https://youtube-mp3-downloader2.p.rapidapi.com/ytmp3/ytmp3/custom/?url=${encodeURIComponent(url)}&quality=320`,
          { headers: { 'X-RapidAPI-Key': config.rapidApiKey, 'X-RapidAPI-Host': 'youtube-mp3-downloader2.p.rapidapi.com' }, timeout: 25000 });
        if (res.data?.link) return { success: true, platform: 'YouTube', title: res.data.title || 'YouTube Audio', audio: res.data.link, isAudio: true };
      } catch (_) {}
    } else {
      // CHECK #1: No RapidAPI key — show clear actionable message to user
      logger.warn('YouTube MP3: RAPIDAPI_KEY not set');
    }

    // API 2: yt-download.org fallback (free, no key)
    try {
      const res = await axios.post('https://www.yt-download.org/api/button/mp3',
        { url },
        { headers: { ...HEADERS, 'Content-Type': 'application/json' }, timeout: 20000 });
      if (res.data?.url) return { success: true, platform: 'YouTube', title: res.data.name || 'YouTube Audio', audio: res.data.url, isAudio: true };
    } catch (_) {}

    // CHECK #1: Clear message when no API key AND fallback failed
    if (!config.rapidApiKey) {
      return {
        success: false,
        error: '❌ *YouTube MP3 k liye RAPIDAPI_KEY nahi hai.*\n\n📌 Free key lein: rapidapi.com\nAdmin se rabta karein: wa.me/' + config.owner.number,
      };
    }

    return { success: false, error: 'YouTube audio download fail hua. Dobara try karein.' };
  }

  // Video download
  try {
    const res = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { timeout: 10000 });
    return { success: false, error: `YouTube video direct download available nahi.\n🎵 Audio k liye: .ytmp3\n\n📹 Title: ${res.data?.title || 'Unknown'}` };
  } catch (_) {}

  return { success: false, error: 'YouTube video direct download available nahi. .ytmp3 use karein audio k liye.' };
}

// ── Twitter / X ──────────────────────────────
async function downloadTwitter(url) {
  // API 1: twitsave
  try {
    const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(url)}`,
      { headers: HEADERS, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/video\.twimg\.com[^"]+)"/);
    if (match) return { success: true, platform: 'Twitter/X', title: 'Twitter Video', video: match[1] };
  } catch (_) {}

  // API 2: ssstwitter
  try {
    const res = await axios.get(`https://ssstwitter.com/?url=${encodeURIComponent(url)}`,
      { headers: { ...HEADERS, 'Referer': 'https://ssstwitter.com/' }, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/video\.twimg\.com[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'Twitter/X', title: 'Twitter Video', video: match[1] };
  } catch (_) {}

  return { success: false, error: 'Twitter/X download fail hua. Account public hona chahiye.' };
}

// ── Dailymotion ──────────────────────────────
async function downloadDailymotion(url) {
  try {
    const idMatch = url.match(/video\/([a-z0-9]+)/i);
    if (!idMatch) return { success: false, error: 'Dailymotion URL sahi nahi.' };
    const res = await axios.get(
      `https://api.dailymotion.com/video/${idMatch[1]}?fields=stream_h264_url,title,thumbnail_url`,
      { headers: HEADERS, timeout: 20000 });
    if (res.data?.stream_h264_url) {
      return { success: true, platform: 'Dailymotion', title: res.data.title || 'Dailymotion Video', video: res.data.stream_h264_url, thumbnail: res.data.thumbnail_url };
    }
  } catch (_) {}
  return { success: false, error: 'Dailymotion download fail hua.' };
}

// ── Snack Video / Likee ─────────────────────
async function downloadSnackOrLikee(url) {
  try {
    const res = await axios.post('https://snapsave.app/action.php',
      new URLSearchParams({ url }),
      { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
    const match = res.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { success: true, platform: 'Video', title: 'Video', video: match[1] };
  } catch (_) {}
  return { success: false, error: 'Is platform ka download available nahi.' };
}

// ── Auto-Detect & Smart Download (with PERF #3 cache) ────────────────────────
async function smartDownload(url) {
  url = url.trim().replace(/[<>]/g, '');

  // PERF #3: Check download cache first
  const cacheKey = `dl_${url}`;
  const cached = downloadCache.get(cacheKey);
  if (cached) {
    logger.info(`Cache hit: ${url}`);
    return cached;
  }

  let result;
  if (url.includes('tiktok.com') || url.includes('vm.tiktok'))    result = await downloadTikTok(url);
  else if (url.includes('instagram.com'))                          result = await downloadInstagram(url);
  else if (url.includes('facebook.com') || url.includes('fb.watch')) result = await downloadFacebook(url);
  else if (url.includes('youtube.com')  || url.includes('youtu.be')) result = await downloadYouTube(url, 'audio');
  else if (url.includes('twitter.com')  || url.includes('x.com')) result = await downloadTwitter(url);
  else if (url.includes('dailymotion.com'))                        result = await downloadDailymotion(url);
  else if (url.includes('snack.video') || url.includes('likee.video')) result = await downloadSnackOrLikee(url);
  else result = { success: false, error: '❌ Yeh platform support nahi hai.\n\n✅ Supported:\nTikTok | Instagram | Facebook | YouTube | Twitter | Dailymotion' };

  // PERF #3: Cache successful results only
  if (result.success) downloadCache.set(cacheKey, result);

  return result;
}

module.exports = { smartDownload, downloadTikTok, downloadInstagram, downloadFacebook, downloadYouTube, downloadTwitter, downloadDailymotion };
