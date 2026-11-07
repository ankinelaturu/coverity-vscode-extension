'use strict';

const vscode = require('vscode');
const path = require('path');
const { ReportSession } = require('./src/state/reportSession');
const { DiagnosticsManager } = require('./src/diagnostics/diagnosticsManager');
const { registerHoverProvider } = require('./src/hover/hoverProvider');
const { registerCodeLens } = require('./src/codelens/codelensProvider');
const { DecorationManager } = require('./src/decorations/decorations');
const { registerFileDecorations } = require('./src/explorer/fileDecorations');
const { registerReportStatusBar } = require('./src/ui/reportStatusBar');
const { runPickProblemsTypeFilter } = require('./src/ui/problemsTypeFilter');
const { rerunCoverity } = require('./src/rerun/rerun');
const {
  showTracePeek,
  registerFullTraceView,
  registerTracePeekCodeActions,
} = require('./src/tracePeek/tracePeekPanel');
const { listFindingsOnLine, findingDisplayName } = require('./src/codelens/findingsAtLine');
const { syncEditorNavigationContext } = require('./src/navigation/editorNavigation');

/** @type {vscode.OutputChannel | null} */
let outputChannel = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let navSyncTimer = null;
/** @type {{ uri: string, line: number, character: number } | null} */
let navSyncPending = null;

function isCpp(doc) {
  return doc.languageId === 'c' || doc.languageId === 'cpp';
}

/**
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position | undefined} position
 */
function scheduleNavSync(session, document, position) {
  if (!position || !session.hasReport()) {
    return;
  }
  navSyncPending = {
    uri: document.uri.toString(),
    line: position.line,
    character: position.character,
  };
  if (navSyncTimer) {
    clearTimeout(navSyncTimer);
  }
  navSyncTimer = setTimeout(() => {
    navSyncTimer = null;
    const pending = navSyncPending;
    navSyncPending = null;
    if (!pending) {
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== pending.uri) {
      return;
    }
    const pos = editor.selection.active;
    if (pos.line !== pending.line || pos.character !== pending.character) {
      return;
    }
    syncEditorNavigationContext(session, editor.document, pos);
  }, 120);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Coverity Report');
  context.subscriptions.push(outputChannel);

  const session = new ReportSession(context);
  const diagnostics = new DiagnosticsManager(session);
  const decorations = new DecorationManager(session, context);

  context.subscriptions.push(
    diagnostics,
    decorations,
    registerFileDecorations(session),
    registerHoverProvider(session),
    registerCodeLens(session),
    registerFullTraceView(context, session),
    registerTracePeekCodeActions(context, session),
    registerReportStatusBar(session),
    vscode.workspace.onDidChangeTextDocument((e) => session.handleDocumentChange(e)),
    vscode.workspace.onDidSaveTextDocument((doc) => session.handleDocumentSave(doc.uri)),
    vscode.workspace.onDidRenameFiles((e) => session.handleFilesRenamed(e.files)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      session.activeEditorUri = editor?.document.uri ?? null;
      session.fireChange();
      decorations.update();
      if (editor?.document && isCpp(editor.document)) {
        syncEditorNavigationContext(session, editor.document, editor.selection.active);
      }
    }),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!isCpp(e.textEditor.document)) {
        return;
      }
      scheduleNavSync(session, e.textEditor.document, e.selections[0]?.active);
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

  outputChannel.appendLine('Coverity Report Helper activated.');
  maybeAutoLoadReport(session);
  decorations.update();
}

/**
 * @param {object} session
 * @param {string | import('vscode').Uri} uriStr
 * @param {number} line
 */
/**
 * @param {object} session
 * @param {string} uriStr
 * @param {number} line
 */
async function ruleStripMenu(session, uriStr, line) {
  const uri = vscode.Uri.parse(uriStr);
  const ctx = session.resolveLineRuleContext(uri, line);
  if (!ctx || ctx.choices.length <= 1) {
    return;
  }
  const { ruleIndex, choices } = ctx;
  const ruleNum = ruleIndex + 1;
  const k = choices.length;
  const picked = await vscode.window.showQuickPick(
    [
      { label: '← Previous rule', action: 'prev' },
      { label: `${ruleNum}/${k} — choose rule…`, action: 'pick' },
      { label: 'Next rule →', action: 'next' },
    ],
    { title: `← rule ${ruleNum}/${k} →`, placeHolder: 'Rule navigation' }
  );
  if (!picked) {
    return;
  }
  if (picked.action === 'prev') {
    session.cycleFindingAtLine(uri, line, -1);
  } else if (picked.action === 'next') {
    session.cycleFindingAtLine(uri, line, 1);
  } else {
    await pickFindingAtLine(session, uriStr, line);
  }
}

/**
 * @param {object} session
 * @param {string} findingId
 * @param {number} eventIndex
 */
async function stepStripMenu(session, findingId, eventIndex) {
  const finding = session.getFinding(findingId);
  if (!finding) {
    return;
  }
  const stepNum = eventIndex + 1;
  const stepTotal = finding.events.length;
  const picked = await vscode.window.showQuickPick(
    [
      { label: '← Previous step', action: 'prev' },
      { label: 'Next step →', action: 'next' },
    ],
    { title: `← step ${stepNum}/${stepTotal} →`, placeHolder: 'Step navigation' }
  );
  if (!picked) {
    return;
  }
  const delta = picked.action === 'prev' ? -1 : 1;
  session.navigateRelativeFrom(findingId, eventIndex, delta);
}

async function pickFindingAtLine(session, uriStr, line) {
  const uri = typeof uriStr === 'string' ? vscode.Uri.parse(uriStr) : uriStr;
  const choices = listFindingsOnLine(session, uri, line);
  if (choices.length === 0) {
    return;
  }
  if (choices.length === 1) {
    session.activateFindingAtLine(uri, line, choices[0].finding.id, choices[0].eventIndex);
    return;
  }
  const picked = await vscode.window.showQuickPick(
    choices.map(({ finding, eventIndex }) => {
      const checker = finding.checkerId || 'Unknown';
      return {
        label: findingDisplayName(finding),
        description: `${checker} — step ${eventIndex + 1} of ${finding.events.length} on this line`,
        findingId: finding.id,
        eventIndex,
      };
    }),
    { title: 'Coverity rules at this line', placeHolder: 'Select finding' }
  );
  if (picked) {
    session.activateFindingAtLine(uri, line, picked.findingId, picked.eventIndex);
  }
}

function registerCommands(context, session) {
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg('coverity.loadReport', () => pickAndLoad(session));
  reg('coverity.reloadReport', () => reload(session));
  reg('coverity.showProblems', () => vscode.commands.executeCommand('workbench.actions.view.problems'));
  reg('coverity.pickProblemsTypeFilter', () => runPickProblemsTypeFilter(session));
  reg('coverity.configurePathMapping', () => configureMapping());
  reg('coverity.resetAdjustedLocations', () => session.resetAdjustedLocations());
  reg('coverity.navigateToStep', (findingId, eventIndex) => session.navigateToStep(findingId, eventIndex));
  reg('coverity.setActiveFindingStep', (findingId, eventIndex) => {
    session.setActive(findingId, eventIndex);
    vscode.window.showInformationMessage(`Coverity: active trace step ${eventIndex + 1} (${findingId}).`);
  });
  reg('coverity.traceStepRelative', (findingId, eventIndex, delta) =>
    session.navigateRelativeFrom(findingId, eventIndex, delta)
  );
  reg('coverity.previousTraceStep', () => session.navigateRelative(-1));
  reg('coverity.nextTraceStep', () => session.navigateRelative(1));
  reg('coverity.cycleFindingAtLine', (uriStr, line, delta) => {
    const uri = typeof uriStr === 'string' ? vscode.Uri.parse(uriStr) : uriStr;
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      return;
    }
    session.cycleFindingAtLine(uri, line, d);
  });
  reg('coverity.pickFindingAtLine', (uriStr, line) => pickFindingAtLine(session, uriStr, line));
  reg('coverity.chooseFindingsAtLine', (uriStr, line) => pickFindingAtLine(session, uriStr, line));
  reg('coverity.ruleStripMenu', (uriStr, line) => ruleStripMenu(session, uriStr, line));
  reg('coverity.stepStripMenu', (findingId, eventIndex) => stepStripMenu(session, findingId, eventIndex));
  reg('coverity.showParseOutput', () => showParseOutput(session));
  reg('coverity.rerunCoverity', () => rerunCoverity(session, loadFromUri));
  reg('coverity.showTracePeek', (findingId, eventIndex) =>
    showTracePeek(session, findingId, eventIndex)
  );
  reg('coverity.noop', () => {});
  reg('coverity.cycleHoverFinding', (arg) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const delta = Array.isArray(arg) ? Number(arg[0]) : Number(arg);
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }
    const line = editor.selection.active.line;
    session.cycleFindingAtLine(editor.document.uri, line, delta);
  });
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
