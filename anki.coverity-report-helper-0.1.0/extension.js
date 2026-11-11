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
const {
  registerIssueDetailsView,
  showIssueDetails,
} = require('./src/issueDetails/issueDetailsPanel');
const { listFindingsOnLine, findingDisplayName } = require('./src/codelens/findingsAtLine');
const { formatStepLabel } = require('./src/model/stepDisplay');
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
    registerIssueDetailsView(context, session),
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
        description: `${checker} — event ${eventIndex + 1} of ${finding.events.length} on this line`,
        findingId: finding.id,
        eventIndex,
      };
    }),
    { title: 'Coverity issues at this line', placeHolder: 'Select issue' }
  );
  if (picked) {
    session.activateFindingAtLine(uri, line, picked.findingId, picked.eventIndex);
  }
}

/**
 * @param {object} session
 * @param {string} findingId
 * @param {number} eventIndex
 */
/**
 * @param {object} session
 * @param {string} findingId
 * @param {number} i
 * @param {object} ev
 */
function traceStepPickMeta(session, findingId, i, ev) {
  const tracked = session.getTracked(findingId, i);
  let location = '';
  if (tracked?.uri) {
    location = `${path.basename(tracked.uri.fsPath)}:${tracked.range.start.line + 1}`;
  } else if (ev.location?.rawPath) {
    location = `${ev.location.rawPath}:${ev.location.line}`;
  }

  const stepId = formatStepLabel(ev, i + 1);
  const payload = (ev.rawPayload || '').trim();
  const tag = (ev.label || '').trim();
  let description = payload || tag;
  if (!description && stepId !== String(i + 1)) {
    description = stepId;
  }

  return { location, description };
}

async function pickTraceStep(session, findingId, eventIndex) {
  const finding = session.getFinding(findingId);
  if (!finding || finding.events.length === 0) {
    return;
  }
  const n = finding.events.length;
  const ei = Math.max(0, Math.min(n - 1, Number(eventIndex) || 0));

  if (n === 1) {
    await session.navigateToStep(findingId, 0);
    return;
  }

  const picked = await vscode.window.showQuickPick(
    finding.events.map((ev, i) => {
      const { location, description } = traceStepPickMeta(session, findingId, i, ev);
      const current = i === ei;
      return {
        label: `${current ? '$(check) ' : ''}Event ${i + 1} of ${n}`,
        description: description || undefined,
        detail: location || undefined,
        stepIndex: i,
      };
    }),
    {
      title: 'Coverity events',
      placeHolder: `Current: event ${ei + 1} of ${n}`,
    }
  );
  if (picked && typeof picked.stepIndex === 'number') {
    await session.navigateToStep(findingId, picked.stepIndex);
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
    vscode.window.showInformationMessage(`Coverity: active event ${eventIndex + 1} (${findingId}).`);
  });
  reg('coverity.traceStepRelative', (findingId, eventIndex, delta) =>
    session.navigateRelativeFrom(findingId, eventIndex, delta)
  );
  reg('coverity.pickTraceStep', (findingId, eventIndex) => pickTraceStep(session, findingId, eventIndex));
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
  reg('coverity.showParseOutput', () => showParseOutput(session));
  reg('coverity.rerunCoverity', () => rerunCoverity(session, loadFromUri));
  reg('coverity.showTracePeek', (findingId, eventIndex) =>
    showTracePeek(session, findingId, eventIndex)
  );
  reg('coverity.showIssueDetails', (findingId) => showIssueDetails(session, findingId));
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
    `Coverity: loaded ${parsed.findings.length} issue(s). Use Problems panel and Explorer badges on source files.`
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
  outputChannel.appendLine(`Parsed ${parsed.findings.length} issue(s), ${parsed.warnings.length} warning(s).`);
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
