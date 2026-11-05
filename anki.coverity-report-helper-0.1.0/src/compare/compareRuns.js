'use strict';

const vscode = require('vscode');

/**
 * Optional compare-runs — retains previous snapshot in workspace state when enabled.
 */
async function compareRuns(session) {
  const enabled = vscode.workspace.getConfiguration('coverity').get('compareRunsEnabled', false);
  if (!enabled) {
    vscode.window.showInformationMessage(
      'Compare runs is optional. Enable coverity.compareRunsEnabled after two report loads are available.'
    );
    return;
  }
  const prev = session.context?.workspaceState?.get('coverity.previousReportHash');
  if (!prev || !session.reportHash) {
    vscode.window.showInformationMessage('Load at least two reports (reload after a new scan) to compare.');
    return;
  }
  vscode.window.showInformationMessage(
    `Compare placeholder: previous hash ${prev}, current ${session.reportHash}. Full diff deferred.`
  );
}

module.exports = { compareRuns };
