'use strict';

const path = require('path');
const vscode = require('vscode');

/**
 * Precomputed Coverity finding data per resolved file URI for Explorer decorations.
 * Folder summaries are derived by path prefix (unique findings under that folder).
 */

/**
 * @param {import('../state/reportSession').ReportSession} session
 */
function rebuildExplorerDecorationIndex(session) {
  /** @type {Map<string, { findingIds: Set<string>, maxRank: number, checkers: Map<string, number> }>} */
  const byFileUri = new Map();
  /** @type {{ fsPath: string, entry: object }[]} */
  const fileEntries = [];

  if (!session.indexes) {
    session.explorerDecorationIndex = { byFileUri, fileEntries };
    return;
  }

  for (const finding of session.indexes.findings) {
    const rank = severityRank(finding);
    const checker = finding.checkerId || 'Unknown';

    for (let ei = 0; ei < finding.events.length; ei++) {
      const t = session.getTracked(finding.id, ei);
      if (!t?.uri) {
        continue;
      }
      const key = t.uri.toString();
      let entry = byFileUri.get(key);
      if (!entry) {
        entry = { findingIds: new Set(), maxRank: 0, checkers: new Map() };
        byFileUri.set(key, entry);
      }
      if (entry.findingIds.has(finding.id)) {
        continue;
      }
      entry.findingIds.add(finding.id);
      entry.maxRank = Math.max(entry.maxRank, rank);
      entry.checkers.set(checker, (entry.checkers.get(checker) || 0) + 1);
    }
  }

  for (const [uriStr, entry] of byFileUri.entries()) {
    const fsPath = vscode.Uri.parse(uriStr).fsPath;
    fileEntries.push({ fsPath, entry });
  }

  session.explorerDecorationIndex = { byFileUri, fileEntries };
}

/**
 * @param {object} finding
 * @returns {number} 1=info, 2=warning, 3=error
 */
function severityRank(finding) {
  const sev = (finding.severity || '').toLowerCase();
  const checker = (finding.checkerId || '').toLowerCase();
  const title = (finding.typeTitle || '').toLowerCase();

  if (sev.includes('high') || sev.includes('error')) {
    return 3;
  }
  if (checker.includes('required') || checker.includes('mandatory') || title.includes('mandatory')) {
    return 3;
  }
  if (sev.includes('medium') || sev.includes('warning')) {
    return 2;
  }
  if (
    checker.includes('forward_null') ||
    checker.includes('deadcode') ||
    checker.includes('overrun') ||
    title.includes('null')
  ) {
    return 2;
  }
  if (checker.includes('advisory') || title.includes('advisory')) {
    return 1;
  }
  return 2;
}

function rankToThemeColor(rank) {
  if (rank >= 3) {
    return 'list.errorForeground';
  }
  if (rank >= 2) {
    return 'list.warningForeground';
  }
  return 'list.infoForeground';
}

/**
 * @param {string} folderFsPath
 * @param {{ fileEntries: { fsPath: string, entry: object }[] }} index
 */
function summarizeFolder(folderFsPath, index) {
  const prefix = normalizePath(folderFsPath);
  const prefixWithSep = prefix.endsWith(path.sep) ? prefix : prefix + path.sep;

  const findingIds = new Set();
  const checkers = new Map();
  let maxRank = 0;

  for (const { fsPath, entry } of index.fileEntries) {
    const np = normalizePath(fsPath);
    if (np === prefix || np.startsWith(prefixWithSep)) {
      for (const id of entry.findingIds) {
        findingIds.add(id);
      }
      for (const [c, n] of entry.checkers.entries()) {
        checkers.set(c, (checkers.get(c) || 0) + n);
      }
      maxRank = Math.max(maxRank, entry.maxRank);
    }
  }

  if (findingIds.size === 0) {
    return null;
  }
  return { count: findingIds.size, maxRank, checkers, findingIds };
}

function normalizePath(p) {
  return path.normalize(p);
}

const TOOLTIP_FINDING_LIMIT = 12;

/**
 * @param {object} finding
 */
function formatFindingTooltipLine(finding) {
  const checker = finding.checkerId || 'Unknown';
  const cid = finding.cid ? `CID ${finding.cid}` : finding.id;
  const title = (finding.typeTitle || '').trim();
  if (title) {
    return `  • ${title} (${checker}, ${cid})`;
  }
  return `  • ${checker} (${cid})`;
}

/**
 * @param {object} summary
 * @param {{ findingById?: Map<string, object>, isActive: boolean, isFolder: boolean }} ctx
 */
function buildTooltip(summary, ctx) {
  const { findingById, isActive, isFolder } = ctx;
  const n = summary.count;
  const scope = isFolder ? ' (folder incl. subfolders)' : '';
  const lines = [`Coverity: ${n} finding${n === 1 ? '' : 's'}${scope}`];
  if (isActive) {
    lines.push('Active editor file');
  }

  if (findingById && summary.findingIds?.size) {
    const findings = [...summary.findingIds]
      .map((id) => findingById.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const dr = severityRank(b) - severityRank(a);
        if (dr !== 0) {
          return dr;
        }
        return formatFindingTooltipLine(a).localeCompare(formatFindingTooltipLine(b));
      });

    for (const finding of findings.slice(0, TOOLTIP_FINDING_LIMIT)) {
      lines.push(formatFindingTooltipLine(finding));
    }
    if (findings.length > TOOLTIP_FINDING_LIMIT) {
      lines.push(`  • … and ${findings.length - TOOLTIP_FINDING_LIMIT} more finding(s)`);
    }
  }

  return lines.join('\n');
}

/**
 * @param {number} count
 * @param {string} style count | brand | duck
 */
function formatBadge(count, style) {
  if (style === 'duck' || style === 'brand') {
    if (count > 9) {
      return '🦆+';
    }
    return `🦆${count}`;
  }
  if (count > 99) {
    return '99+';
  }
  return String(count);
}

module.exports = {
  rebuildExplorerDecorationIndex,
  severityRank,
  rankToThemeColor,
  summarizeFolder,
  buildTooltip,
  formatBadge,
};
