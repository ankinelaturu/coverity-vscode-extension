'use strict';

const vscode = require('vscode');
const { buildTracePeekHtml } = require('./buildTracePeekHtml');
const { DIAGNOSTIC_SOURCE } = require('../state/reportSession');

/** @type {FullTraceViewProvider | null} */
let viewProvider = null;

const FULL_TRACE_VIEW_ID = 'coverity.fullTrace';

function emptyTraceViewHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" />
<style>body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:12px;line-height:1.5;}</style></head>
<body><p><strong>Full Trace</strong></p><p>Load a Coverity report, then use Full Trace from the editor hover, light bulb, or Command Palette.</p></body></html>`;
}

class FullTraceViewProvider {
  /**
   * @param {object} session
   */
  constructor(session) {
    this.session = session;
    /** @type {vscode.WebviewView | undefined} */
    this.view = undefined;
    /** @type {string | null} */
    this.pendingHtml = null;
  }

  /**
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type !== 'navigate') {
        return;
      }
      const findingId = msg.findingId;
      const eventIndex = Number(msg.eventIndex);
      if (!findingId || !Number.isFinite(eventIndex)) {
        return;
      }
      await this.session.navigateToStep(findingId, eventIndex);
      const finding = this.session.getFinding(findingId);
      if (finding) {
        await this.setHtml(await buildTracePeekHtml(this.session, finding, eventIndex));
      }
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
    });

    if (this.pendingHtml) {
      webviewView.webview.html = this.pendingHtml;
      this.pendingHtml = null;
    } else {
      webviewView.webview.html = emptyTraceViewHtml();
    }
  }

  /** @param {string} html */
  async setHtml(html) {
    if (this.view) {
      this.view.webview.html = html;
      this.view.show?.(true);
    } else {
      this.pendingHtml = html;
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {object} session
 */
function registerFullTraceView(context, session) {
  viewProvider = new FullTraceViewProvider(session);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(FULL_TRACE_VIEW_ID, viewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
  return viewProvider;
}

function fullTraceCommandUri(findingId, eventIndex) {
  return `command:coverity.showTracePeek?${encodeURIComponent(JSON.stringify([findingId, eventIndex]))}`;
}

function createFullTraceCodeAction(document, hit, diag) {
  const action = new vscode.CodeAction('Full Trace', vscode.CodeActionKind.QuickFix);
  action.isPreferred = true;
  action.command = {
    command: 'coverity.showTracePeek',
    title: 'Full Trace',
    arguments: [hit.findingId, hit.eventIndex],
  };
  if (diag) {
    action.diagnostics = [diag];
  }
  return action;
}

function coverityDiagnosticsTouchingLine(document, line) {
  const all = vscode.languages.getDiagnostics(document.uri);
  return all.filter(
    (d) =>
      d.source === DIAGNOSTIC_SOURCE &&
      d.range.start.line <= line &&
      line <= d.range.end.line
  );
}

function primaryFindingHitOnLine(session, document, line) {
  const onLine = session.getEventsOnLine(document.uri, line);
  if (onLine.length === 0) {
    return null;
  }
  /** @type {Map<string, { findingId: string, eventIndex: number }>} */
  const byFinding = new Map();
  for (const h of onLine) {
    if (!byFinding.has(h.finding.id)) {
      byFinding.set(h.finding.id, { findingId: h.finding.id, eventIndex: h.eventIndex });
    }
  }
  const fid = session.activeFindingId;
  if (fid && byFinding.has(fid)) {
    const h = onLine.find((x) => x.finding.id === fid);
    return { findingId: fid, eventIndex: h?.eventIndex ?? session.activeEventIndex };
  }
  const first = onLine[0];
  return { findingId: first.finding.id, eventIndex: first.eventIndex };
}

/**
 * @param {object} session
 * @param {string | undefined} findingId
 * @param {number | undefined} eventIndex
 */
function resolveTracePeekTarget(session, findingId, eventIndex) {
  let fid = findingId || session.activeFindingId;
  let ei = typeof eventIndex === 'number' ? eventIndex : session.activeEventIndex;

  const editor = vscode.window.activeTextEditor;
  if (editor && session.hasReport()) {
    const pos = editor.selection.active;
    const hits = session
      .getEventsForUri(editor.document.uri)
      .filter(({ tracked }) => tracked.range.contains(pos));
    if (hits.length > 0) {
      const pick = (fid && hits.find((h) => h.finding.id === fid)) || hits[0];
      fid = pick.finding.id;
      ei = pick.eventIndex;
    }
  }

  if (!fid) {
    return null;
  }
  const finding = session.getFinding(fid);
  if (!finding) {
    return null;
  }
  ei = Math.max(0, Math.min(finding.events.length - 1, ei ?? 0));
  return { finding, eventIndex: ei };
}

/**
 * @param {object} session
 * @param {string | undefined} findingId
 * @param {number | undefined} eventIndex
 */
async function showTracePeek(session, findingId, eventIndex) {
  if (!session.hasReport()) {
    vscode.window.showWarningMessage('Coverity: load a report first.');
    return;
  }

  const target = resolveTracePeekTarget(session, findingId, eventIndex);
  if (!target) {
    vscode.window.showWarningMessage('Coverity: no finding selected for trace peek.');
    return;
  }

  const { finding, eventIndex: ei } = target;
  session.setActive(finding.id, ei);

  const html = await buildTracePeekHtml(session, finding, ei);
  if (!viewProvider) {
    vscode.window.showWarningMessage('Coverity: Full Trace view is not registered.');
    return;
  }

  await viewProvider.setHtml(html);
  try {
    await vscode.commands.executeCommand(`${FULL_TRACE_VIEW_ID}.focus`);
  } catch {
    // View may be hidden when coverity.hasReport when-clause toggles; content is still updated.
  }
  viewProvider.view?.show?.(true);
}

/**
 * @param {object} session
 * @param {vscode.TextDocument} document
 * @param {vscode.Diagnostic} diag
 */
function findingStepForDiagnostic(session, document, diag) {
  if (diag.source !== DIAGNOSTIC_SOURCE) {
    return null;
  }
  if (!session.indexes) {
    return null;
  }

  /** Primary diagnostic range is the last trace step only. */
  for (const finding of session.indexes.findings) {
    const lastEi = finding.events.length - 1;
    if (lastEi < 0) {
      continue;
    }
    const t = session.getTracked(finding.id, lastEi);
    if (!t?.uri || t.uri.toString() !== document.uri.toString() || !t.range) {
      continue;
    }
    if (t.range.intersection(diag.range) || t.range.contains(diag.range.start)) {
      return { findingId: finding.id, eventIndex: lastEi };
    }
  }
  return null;
}

function registerTracePeekCodeActions(context, session) {
  return vscode.languages.registerCodeActionsProvider(
    ['c', 'cpp'],
    {
      provideCodeActions(document, range, ctx) {
        if (!session.hasReport()) {
          return [];
        }
        const line = range.start.line;
        /** @type {vscode.Diagnostic[]} */
        const diags = ctx.diagnostics?.length
          ? ctx.diagnostics.filter((d) => d.source === DIAGNOSTIC_SOURCE)
          : coverityDiagnosticsTouchingLine(document, line);

        /** @type {vscode.CodeAction[]} */
        const actions = [];
        const seen = new Set();

        for (const diag of diags) {
          const hit = findingStepForDiagnostic(session, document, diag);
          if (!hit || seen.has(hit.findingId)) {
            continue;
          }
          seen.add(hit.findingId);
          actions.push(createFullTraceCodeAction(document, hit, diag));
        }

        if (actions.length === 0) {
          const lineHit = primaryFindingHitOnLine(session, document, line);
          if (lineHit && !seen.has(lineHit.findingId)) {
            actions.push(createFullTraceCodeAction(document, lineHit, diags[0] ?? null));
          }
        }

        return actions;
      },
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );
}

module.exports = {
  showTracePeek,
  registerFullTraceView,
  registerTracePeekCodeActions,
  resolveTracePeekTarget,
  fullTraceCommandUri,
  primaryFindingHitOnLine,
  FULL_TRACE_VIEW_ID,
};
