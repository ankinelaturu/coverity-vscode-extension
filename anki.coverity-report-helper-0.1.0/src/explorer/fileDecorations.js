'use strict';

const vscode = require('vscode');
const path = require('path');
const {
  rebuildExplorerDecorationIndex,
  rankToThemeColor,
  summarizeFolder,
  buildTooltip,
  formatBadge,
} = require('./decorationIndex');

/**
 * Explorer file/folder decorations via FileDecorationProvider.
 *
 * Note: VS Code only supports a short text badge (1–2 chars) and theme colors — not custom PNG/SVG
 * icons in the file tree. The "duck" style shows 🦆1–🦆9 or 🦆+ for 10+ unique findings.
 */
function registerFileDecorations(session) {
  const emitter = new vscode.EventEmitter();

  const provider = {
    onDidChangeFileDecorations: emitter.event,
    provideFileDecoration(uri) {
      return provideDecoration(session, uri);
    },
  };

  const registration = vscode.window.registerFileDecorationProvider(provider);

  const refresh = () => emitter.fire(undefined);
  session.onDidChange(refresh);

  return registration;
}

/**
 * @param {import('../state/reportSession').ReportSession} session
 * @param {vscode.Uri} uri
 */
async function provideDecoration(session, uri) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  if (!cfg.get('explorerDecorationsEnabled', true) || !session.hasReport()) {
    return undefined;
  }

  const index = session.explorerDecorationIndex;
  if (!index) {
    return undefined;
  }

  const badgeStyle = cfg.get('explorerBadgeStyle', 'duck');
  const isActive =
    cfg.get('explorerHighlightActiveFile', true) &&
    session.activeEditorUri &&
    session.activeEditorUri.toString() === uri.toString();

  let summary = null;
  let isFolder = false;

  try {
    const stat = await vscode.workspace.fs.stat(uri);
    isFolder = stat.type === vscode.FileType.Directory;
  } catch {
    return undefined;
  }

  if (isFolder) {
    summary = summarizeFolder(uri.fsPath, index);
  } else {
    const entry = index.byFileUri.get(uri.toString());
    if (entry && entry.findingIds.size > 0) {
      summary = {
        count: entry.findingIds.size,
        maxRank: entry.maxRank,
        checkers: entry.checkers,
        findingIds: entry.findingIds,
      };
    }
  }

  if (!summary) {
    return undefined;
  }

  let colorKey = rankToThemeColor(summary.maxRank);
  if (isActive) {
    colorKey = 'charts.orange';
  }

  return {
    badge: formatBadge(summary.count, badgeStyle),
    tooltip: buildTooltip(summary, {
      findingById: session.indexes?.findingById,
      isActive,
      isFolder,
    }),
    color: new vscode.ThemeColor(colorKey),
    propagate: isFolder,
  };
}

module.exports = {
  registerFileDecorations,
  rebuildExplorerDecorationIndex,
};
