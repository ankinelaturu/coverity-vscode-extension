'use strict';

const vscode = require('vscode');
const path = require('path');
const { ReportSession } = require('./src/state/reportSession');
const { DiagnosticsManager } = require('./src/diagnostics/diagnosticsManager');
const { registerHoverProvider } = require('./src/hover/hoverProvider');
const { registerCodeLens } = require('./src/codelens/codelensProvider');
const { DecorationManager } = require('./src/decorations/decorations');
const { registerFileDecorations } = require('./src/explorer/fileDecorations');
const { rerunCoverity } = require('./src/rerun/rerun');
const { compareRuns } = require('./src/compare/compareRuns');

/** @type {vscode.OutputChannel | null} */
let outputChannel = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Coverity Report');
  context.subscriptions.push(outputChannel);

  const session = new ReportSession(context);
  const diagnostics = new DiagnosticsManager(session);
  const decorations = new DecorationManager(session);

  context.subscriptions.push(
    diagnostics,
    decorations,
    registerFileDecorations(session),
    registerHoverProvider(session),
    registerCodeLens(session),
    vscode.workspace.onDidChangeTextDocument((e) => session.handleDocumentChange(e)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      session.activeEditorUri = editor?.document.uri ?? null;
      session.fireChange();
      decorations.update();
    })
  );

  registerCommands(context, session);

  session.syncViewContexts();
  session.activeEditorUri = vscode.window.activeTextEditor?.document.uri ?? null;

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('coverity')) {
        session.fireChange();
        decorations.update();
      }
    })
  );

  maybeAutoLoadReport(session);
}

function registerCommands(context, session) {
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg('coverity.loadReport', () => pickAndLoad(session));
  reg('coverity.reloadReport', () => reload(session));
  reg('coverity.showProblems', () => vscode.commands.executeCommand('workbench.actions.view.problems'));
  reg('coverity.configurePathMapping', () => configureMapping());
  reg('coverity.resetAdjustedLocations', () => session.resetAdjustedLocations());
  reg('coverity.navigateToStep', (findingId, eventIndex) => session.navigateToStep(findingId, eventIndex));
  reg('coverity.previousTraceStep', () => session.navigateRelative(-1));
  reg('coverity.nextTraceStep', () => session.navigateRelative(1));
  reg('coverity.showParseOutput', () => showParseOutput(session));
  reg('coverity.rerunCoverity', () => rerunCoverity(session));
  reg('coverity.compareRuns', () => compareRuns(session));
}

async function pickAndLoad(session) {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { Text: ['txt', 'log'] },
  });
  if (!uris?.length) {
    return;
  }
  await loadFromUri(session, uris[0]);
}

async function loadFromUri(session, uri) {
  const bytes = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(bytes).toString('utf8');
  const prevHash = session.reportHash;
  const parsed = await session.loadReport(uri, text);
  if (prevHash && prevHash !== session.reportHash) {
    await session.context.workspaceState.update('coverity.previousReportHash', prevHash);
  }
  logParseResult(parsed);
  vscode.window.showInformationMessage(
    `Coverity: loaded ${parsed.findings.length} finding(s). Use Problems panel and Explorer badges on source files.`
  );
}

async function reload(session) {
  if (!session.reportUri) {
    return pickAndLoad(session);
  }
  const parsed = await session.reloadReportFromDisk();
  if (parsed) {
    logParseResult(parsed);
    vscode.window.showInformationMessage('Coverity: report reloaded.');
  }
}

function logParseResult(parsed) {
  if (!outputChannel) {
    return;
  }
  outputChannel.clear();
  outputChannel.appendLine(`Parsed ${parsed.findings.length} finding(s), ${parsed.warnings.length} warning(s).`);
  for (const w of parsed.warnings) {
    outputChannel.appendLine(`L${w.line}: ${w.message}`);
  }
  outputChannel.show(true);
}

function showParseOutput(session) {
  if (session.parsed) {
    logParseResult(session.parsed);
  } else {
    outputChannel?.show(true);
  }
}

async function maybeAutoLoadReport(session) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  if (!cfg.get('autoLoadReport', true)) {
    return;
  }
  const rel = cfg.get('defaultReportPath', 'deploy/coverity/coverity-report.txt');
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return;
  }
  for (const folder of folders) {
    const candidate = vscode.Uri.file(path.join(folder.uri.fsPath, rel));
    try {
      await vscode.workspace.fs.stat(candidate);
      await loadFromUri(session, candidate);
      return;
    } catch {
      // not in this folder
    }
  }
  const last = session.context.workspaceState.get('coverity.lastReportPath');
  if (last) {
    try {
      await loadFromUri(session, vscode.Uri.file(last));
    } catch {
      // ignore
    }
  }
}

async function configureMapping() {
  const cfg = vscode.workspace.getConfiguration('coverity');
  const current = cfg.get('pathMappings') || [];
  const value = await vscode.window.showInputBox({
    prompt: 'Path mappings JSON array [{ reportPrefix, workspaceFolder }]',
    value: JSON.stringify(current, null, 2),
  });
  if (value === undefined) {
    return;
  }
  try {
    const parsed = JSON.parse(value);
    await cfg.update('pathMappings', parsed, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage('Coverity path mappings updated. Reload report to apply.');
  } catch (err) {
    vscode.window.showErrorMessage(`Invalid JSON: ${err.message}`);
  }
}

function deactivate() {
  outputChannel?.dispose();
}

module.exports = { activate, deactivate };
