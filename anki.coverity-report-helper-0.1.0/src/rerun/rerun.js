'use strict';

const vscode = require('vscode');
const path = require('path');

/** @type {Promise<void> | null} */
let rerunInFlight = null;

/**
 * Run user-configured analysis, wait for output report, reload into session.
 * Command line and paths come from settings only — never from report contents.
 * @param {object} session
 * @param {(session: object, uri: vscode.Uri) => Promise<void>} loadFromUri
 */
async function rerunCoverity(session, loadFromUri) {
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

  const commandLine = (cfg.get('rerun.commandLine') || '').trim();
  const reportRel = (cfg.get('rerun.reportOutputPath') || cfg.get('defaultReportPath', '')).trim();
  if (!commandLine) {
    vscode.window.showWarningMessage('Set coverity.rerun.commandLine to your analysis wrapper script.');
    return;
  }
  if (!reportRel) {
    vscode.window.showWarningMessage('Set coverity.rerun.reportOutputPath (or defaultReportPath) for the new report file.');
    return;
  }

  if (rerunInFlight) {
    vscode.window.showWarningMessage('Coverity rerun is already in progress.');
    return;
  }

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showWarningMessage('Open a workspace folder before rerunning Coverity.');
    return;
  }

  if (cfg.get('rerun.saveBeforeRun', true)) {
    const dirty = vscode.workspace.textDocuments.filter((d) => d.isDirty && !d.isUntitled);
    if (dirty.length) {
      const save = await vscode.window.showWarningMessage(
        `${dirty.length} unsaved file(s). Save before rerun?`,
        'Save All',
        'Cancel'
      );
      if (save !== 'Save All') {
        return;
      }
      await vscode.workspace.saveAll(false);
    }
  }

  const reportUri = reportRel.startsWith('/') || /^[A-Za-z]:/.test(reportRel)
    ? vscode.Uri.file(reportRel)
    : vscode.Uri.file(path.join(folder.uri.fsPath, reportRel));

  rerunInFlight = vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Coverity rerun',
      cancellable: true,
    },
    async (_progress, token) => {
      const ok = await runShellTask(commandLine, folder.uri.fsPath, token);
      if (!ok || token.isCancellationRequested) {
        return;
      }
      await waitForReportFile(reportUri, token, 600_000);
      if (token.isCancellationRequested) {
        return;
      }
      await loadFromUri(session, reportUri);
      vscode.window.showInformationMessage('Coverity: rerun finished and report reloaded.');
    }
  );

  try {
    await rerunInFlight;
  } finally {
    rerunInFlight = null;
  }
}

function runShellTask(commandLine, cwd, token) {
  return new Promise((resolve) => {
    const task = new vscode.Task(
      { type: 'shell', taskType: 'coverityRerun' },
      vscode.TaskScope.Workspace,
      'Coverity Rerun',
      'coverity',
      new vscode.ShellExecution(commandLine, { cwd })
    );
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.Dedicated };

    /** @type {vscode.TaskExecution | undefined} */
    let execution;
    const endSub = vscode.tasks.onDidEndTaskProcess((e) => {
      if (!execution || e.execution !== execution) {
        return;
      }
      endSub.dispose();
      cancelSub.dispose();
      if (e.exitCode !== 0) {
        vscode.window.showErrorMessage(`Coverity rerun exited with code ${e.exitCode}. Previous report retained.`);
        resolve(false);
        return;
      }
      resolve(true);
    });
    const cancelSub = token.onCancellationRequested(() => {
      endSub.dispose();
      cancelSub.dispose();
      if (execution) {
        execution.terminate();
      }
      resolve(false);
    });

    vscode.tasks.executeTask(task).then((ex) => {
      execution = ex;
    });
  });
}

async function waitForReportFile(uri, token, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (token.isCancellationRequested) {
      return;
    }
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > 0) {
        return;
      }
    } catch {
      // not written yet
    }
    await sleep(1500);
  }
  vscode.window.showWarningMessage('Timed out waiting for report file after rerun.');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { rerunCoverity };
