// ============================================
// SAHIL 804 - Response Cache Utility
// Developer: Sahil Hacker | v4.0.0
// PERF #3: node-cache with per-use-case TTLs
// ============================================
const NodeCache = require('node-cache');

// Download URL results — 5 minutes
const downloadCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// SIM API responses — 10 minutes
const simCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Weather API responses — 15 minutes
const weatherCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

// News headlines — 10 minutes
const newsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

module.exports = { downloadCache, simCache, weatherCache, newsCache };
