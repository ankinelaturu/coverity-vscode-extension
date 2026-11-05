'use strict';

/**
 * Builds indexes over immutable parse results for tree views and navigation.
 * One canonical finding; at most one file-node reference per finding per file.
 */

/**
 * @param {object} parsed parseCoverityTextReport result
 * @returns {object}
 */
function buildReportIndexes(parsed) {
  const findings = parsed.findings.map((f, i) => ({
    ...f,
    id: f.cid || f.localId || `finding-${i + 1}`,
  }));

  /** @type {Map<string, { findingId: string, eventIndices: number[] }[]>} */
  const byFilePath = new Map();

  /** @type {Map<string, string[]>} checkerId -> findingIds */
  const byChecker = new Map();

  for (const finding of findings) {
    const checkerKey = finding.checkerId || 'Unknown';
    if (!byChecker.has(checkerKey)) {
      byChecker.set(checkerKey, []);
    }
    byChecker.get(checkerKey).push(finding.id);

    const filesForFinding = new Set();
    for (let ei = 0; ei < finding.events.length; ei++) {
      const ev = finding.events[ei];
      const raw = ev.location?.rawPath;
      if (!raw) {
        continue;
      }
      filesForFinding.add(normalizePathKey(raw));
    }
    if (finding.headerLocation?.rawPath) {
      filesForFinding.add(normalizePathKey(finding.headerLocation.rawPath));
    }

    for (const fileKey of filesForFinding) {
      if (!byFilePath.has(fileKey)) {
        byFilePath.set(fileKey, []);
      }
      const list = byFilePath.get(fileKey);
      if (!list.some((e) => e.findingId === finding.id)) {
        list.push({ findingId: finding.id, eventIndices: eventIndicesForFile(finding, fileKey) });
      }
    }
  }

  const findingById = new Map(findings.map((f) => [f.id, f]));

  return {
    findings,
    findingById,
    byFilePath,
    byChecker,
    uniqueFindingCount: findings.length,
  };
}

function normalizePathKey(rawPath) {
  return rawPath.replace(/\\/g, '/');
}

function eventIndicesForFile(finding, fileKey) {
  const indices = [];
  for (let i = 0; i < finding.events.length; i++) {
    const raw = finding.events[i].location?.rawPath;
    if (raw && normalizePathKey(raw) === fileKey) {
      indices.push(i);
    }
  }
  return indices;
}

module.exports = {
  buildReportIndexes,
  normalizePathKey,
};
