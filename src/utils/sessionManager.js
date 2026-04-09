const fs   = require('fs-extra');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
fs.ensureDirSync(SESSIONS_DIR);

const activeSessions = new Map();

function getSessionPath(sessionId) {
  return path.join(SESSIONS_DIR, sessionId);
}

function createSession(sessionId, data = {}) {
  const sessionPath = getSessionPath(sessionId);
  fs.ensureDirSync(sessionPath);
  const session = { id: sessionId, status: 'connecting', createdAt: Date.now(), ...data };
  fs.writeJsonSync(path.join(sessionPath, 'meta.json'), session, { spaces: 2 });
  activeSessions.set(sessionId, session);
  return session;
}

function updateSession(sessionId, data) {
  const session = activeSessions.get(sessionId) || {};
  const updated = { ...session, ...data, updatedAt: Date.now() };
  activeSessions.set(sessionId, updated);
  const sessionPath = getSessionPath(sessionId);
  if (fs.existsSync(sessionPath)) {
    const metaFile = path.join(sessionPath, 'meta.json');
    const existing = fs.existsSync(metaFile) ? fs.readJsonSync(metaFile) : {};
    const { sock, ...safeData } = { ...existing, ...data, updatedAt: Date.now() };
    fs.writeJsonSync(metaFile, safeData, { spaces: 2 });
  }
  return updated;
}

function getSession(sessionId) {
  return activeSessions.get(sessionId) || null;
}

function getAllSessions() {
  const sessions = [];
  if (!fs.existsSync(SESSIONS_DIR)) return sessions;
  const dirs = fs.readdirSync(SESSIONS_DIR);
  for (const dir of dirs) {
    const metaFile = path.join(SESSIONS_DIR, dir, 'meta.json');
    if (fs.existsSync(metaFile)) {
      try {
        const meta = fs.readJsonSync(metaFile);
        const live = activeSessions.get(dir);
        sessions.push({ ...meta, status: live?.status || meta.status || 'offline' });
      } catch (_) {}
    }
  }
  return sessions;
}

function deleteSession(sessionId) {
  activeSessions.delete(sessionId);
  const sessionPath = getSessionPath(sessionId);
  if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
}

function sessionExists(sessionId) {
  return fs.existsSync(getSessionPath(sessionId));
}

module.exports = { createSession, updateSession, getSession, getAllSessions, deleteSession, sessionExists, getSessionPath, activeSessions };
