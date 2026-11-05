'use strict';

const vscode = require('vscode');
const { buildTracePeekHtml } = require('./buildTracePeekHtml');
const { DIAGNOSTIC_SOURCE } = require('../state/reportSession');

/** @type {vscode.WebviewPanel | null} */
let panel = null;

/** @type {object | null} */
let panelSession = null;

/**
 * @param {vscode.ExtensionContext} context
 * @param {object} session
 */
function wireTracePeekPanel(context, session) {
  if (!panel) {
    return;
  }
  panelSession = session;
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (!panelSession || msg?.type !== 'navigate') {
      return;
    }
    const findingId = msg.findingId;
    const eventIndex = Number(msg.eventIndex);
    if (!findingId || !Number.isFinite(eventIndex)) {
      return;
    }
    await panelSession.navigateToStep(findingId, eventIndex);
    const finding = panelSession.getFinding(findingId);
    if (finding && panel) {
      const html = await buildTracePeekHtml(panelSession, finding, eventIndex);
      panel.webview.html = html;
    }
  });
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
 * @param {vscode.ExtensionContext} context
 * @param {object} session
 * @param {string | undefined} findingId
 * @param {number | undefined} eventIndex
 */
async function showTracePeek(context, session, findingId, eventIndex) {
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

  const title = finding.typeTitle || finding.checkerId || 'Coverity trace';
  const html = await buildTracePeekHtml(session, finding, ei);

  if (panel) {
    panelSession = session;
    panel.title = `Coverity: ${title}`;
    panel.webview.html = html;
    panel.reveal(vscode.ViewColumn.Beside, true);
    return;
  }

  panel = vscode.window.createWebviewPanel('coverityTracePeek', `Coverity: ${title}`, vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  panel.webview.html = html;
  wireTracePeekPanel(context, session);
  panel.onDidDispose(() => {
    panel = null;
    panelSession = null;
  });
  context.subscriptions.push(panel);
}

/**
 * Match a Coverity diagnostic to a finding step (or active finding for merged line diags).
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

  if (diag.message.includes('Coverity findings on this line')) {
    if (session.activeFindingId) {
      return {
        findingId: session.activeFindingId,
        eventIndex: session.activeEventIndex,
      };
    }
    const line = diag.range.start.line;
    const onLine = session.getEventsOnLine(document.uri, line);
    if (onLine.length > 0) {
      return { findingId: onLine[0].finding.id, eventIndex: onLine[0].eventIndex };
    }
    return null;
  }

  for (const finding of session.indexes.findings) {
    for (let ei = 0; ei < finding.events.length; ei++) {
      const t = session.getTracked(finding.id, ei);
      if (!t?.uri || t.uri.toString() !== document.uri.toString() || !t.range) {
        continue;
      }
      if (t.range.intersection(diag.range) || t.range.contains(diag.range.start)) {
        return { findingId: finding.id, eventIndex: ei };
      }
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
  registerTracePeekCodeActions,
  resolveTracePeekTarget,
  fullTraceCommandUri,
  primaryFindingHitOnLine,
};
