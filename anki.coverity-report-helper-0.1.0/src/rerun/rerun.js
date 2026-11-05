'use strict';

const vscode = require('vscode');

/**
 * Optional rerun hook — user must configure command line and report output path.
 * Does not execute anything from report contents; requires workspace trust.
 */
async function rerunCoverity(session) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  if (!cfg.get('rerun.enabled')) {
    const enable = await vscode.window.showInformationMessage(
      'Coverity rerun is disabled. Enable coverity.rerun.enabled and set coverity.rerun.commandLine in settings.',
      'Open Settings'
    );
    if (enable === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'coverity.rerun');
    }
    return;
  }

  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('Rerun requires a trusted workspace.');
    return;
  }

  const commandLine = cfg.get('rerun.commandLine') || '';
  if (!commandLine.trim()) {
    vscode.window.showWarningMessage('Set coverity.rerun.commandLine to your WSL/Docker wrapper (placeholder).');
    return;
  }

  vscode.window.showInformationMessage(
    'Rerun is not wired to your lab command yet. Configure coverity.rerun.commandLine and coverity.rerun.reportOutputPath, then extend rerun.js to launch a task.'
  );
}

module.exports = { rerunCoverity };
