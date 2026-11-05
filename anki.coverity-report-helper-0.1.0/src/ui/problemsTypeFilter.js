'use strict';

const vscode = require('vscode');

/**
 * @param {import('../state/reportSession').ReportSession} session
 * @returns {string | null} selected checker id, or null for "all types"
 */
async function pickProblemsTypeFilter(session) {
  if (!session.indexes) {
    return null;
  }

  const active = session.getProblemsCheckerFilter();
  /** @type {vscode.QuickPickItem[]} */
  const items = [
    {
      label: 'All finding types',
      description: active ? '' : '$(check) current',
      detail: 'Show every Coverity diagnostic in Problems (does not change compiler/LSP issues).',
      picked: !active,
    },
  ];

  const checkerIds = [...session.indexes.byChecker.keys()].sort((a, b) => a.localeCompare(b));
  for (const checkerId of checkerIds) {
    const findingIds = session.indexes.byChecker.get(checkerId) || [];
    const sample = findingIds[0] ? session.indexes.findingById.get(findingIds[0]) : null;
    const title = (sample?.typeTitle || '').trim();
    const count = findingIds.length;
    const isActive = active === checkerId;
    items.push({
      label: checkerId,
      description: isActive ? '$(check) current' : `${count} finding${count === 1 ? '' : 's'}`,
      detail: title || undefined,
      picked: isActive,
    });
  }

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Filter Coverity markers in Problems by checker type',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (picked === undefined) {
    return active;
  }
  if (picked.label === 'All finding types') {
    return null;
  }
  return picked.label;
}

/**
 * @param {import('../state/reportSession').ReportSession} session
 */
async function runPickProblemsTypeFilter(session) {
  if (!session.hasReport()) {
    return;
  }
  const next = await pickProblemsTypeFilter(session);
  if (next === session.getProblemsCheckerFilter()) {
    return;
  }
  session.setProblemsCheckerFilter(next);
  session.fireChange();
  if (next) {
    vscode.window.setStatusBarMessage(`Coverity Problems filter: ${next}`, 4000);
  } else {
    vscode.window.setStatusBarMessage('Coverity Problems filter cleared', 3000);
  }
}

module.exports = {
  pickProblemsTypeFilter,
  runPickProblemsTypeFilter,
};
