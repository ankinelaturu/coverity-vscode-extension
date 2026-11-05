'use strict';

const CACHE_SCHEMA = 1;
const CACHE_KEY = 'coverity.adjustedLocations';

/**
 * @param {import('vscode').Memento} storage
 * @param {string} reportHash
 * @param {object} payload
 */
async function saveLocationCache(storage, reportHash, payload) {
  await storage.update(CACHE_KEY, {
    schemaVersion: CACHE_SCHEMA,
    reportHash,
    savedAt: Date.now(),
    entries: payload.entries,
  });
}

/**
 * @param {import('vscode').Memento} storage
 * @param {string} reportHash
 */
function loadLocationCache(storage, reportHash) {
  const data = storage.get(CACHE_KEY);
  if (!data || data.schemaVersion !== CACHE_SCHEMA || data.reportHash !== reportHash) {
    return null;
  }
  return data.entries || null;
}

async function clearLocationCache(storage) {
  await storage.update(CACHE_KEY, undefined);
}

module.exports = {
  saveLocationCache,
  loadLocationCache,
  clearLocationCache,
};
