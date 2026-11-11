'use strict';

const vscode = require('vscode');
const { suggestPossibleFix } = require('./possibleFix');
const { lookupMisraRule } = require('./misraRules');
const { DIAGNOSTIC_SOURCE } = require('../state/reportSession');

/** @type {import('vscode').ExtensionContext | null} */
let extensionContext = null;

/**
 * Resolve document + focus line for a finding's primary (last) event.
 * @param {object} session
 * @param {string} findingId
 * @returns {Promise<{ finding: object, document: import('vscode').TextDocument, focusLine: number, uri: import('vscode').Uri } | null>}
 */
async function resolveFindingSource(session, findingId) {
  const finding = session.getFinding(findingId);
  if (!finding || !finding.events?.length) {
    return null;
  }
  const lastEi = finding.events.length - 1;
  const tracked = session.getTracked(findingId, lastEi);
  if (!tracked?.uri) {
    return null;
  }
  // Prefer the first tracked event on this file (often the statement start / `if`).
  let focusLine = tracked.range?.start.line ?? 0;
  for (let ei = 0; ei < finding.events.length; ei++) {
    const t = session.getTracked(findingId, ei);
    if (t?.uri?.toString() === tracked.uri.toString() && t.range) {
      focusLine = t.range.start.line;
      break;
    }
  }
  try {
    const document = await vscode.workspace.openTextDocument(tracked.uri);
    return { finding, document, focusLine, uri: tracked.uri };
  } catch {
    return null;
  }
}

/**
 * @param {object} session
 * @param {string} findingId
 * @returns {Promise<import('./possibleFix').PossibleFixSuggestion | null>}
 */
async function computePossibleFixForFinding(session, findingId) {
  const src = await resolveFindingSource(session, findingId);
  if (!src) {
    return null;
  }
  const rule = extensionContext
    ? lookupMisraRule(extensionContext, src.finding.checkerId, src.finding.typeTitle)
    : null;
  return suggestPossibleFix({
    checkerId: src.finding.checkerId,
    typeTitle: src.finding.typeTitle,
    documentText: src.document.getText(),
    focusLine: src.focusLine,
    events: src.finding.events,
    rule,
  });
}

/**
 * @param {object} session
 * @param {string} findingId
 */
async function applyPossibleFix(session, findingId) {
  if (!session.hasReport()) {
    vscode.window.showWarningMessage('Coverity: load a report first.');
    return;
  }
  const src = await resolveFindingSource(session, findingId);
  if (!src) {
    vscode.window.showWarningMessage('Coverity: could not resolve source for this finding.');
    return;
  }
  const rule = extensionContext
    ? lookupMisraRule(extensionContext, src.finding.checkerId, src.finding.typeTitle)
    : null;
  const fix = suggestPossibleFix({
    checkerId: src.finding.checkerId,
    typeTitle: src.finding.typeTitle,
    documentText: src.document.getText(),
    focusLine: src.focusLine,
    events: src.finding.events,
    rule,
  });
  if (!fix?.applyable || fix.referenceOnly) {
    vscode.window.showInformationMessage(
      'Coverity: no applyable offline rewrite for this finding. See Issue Details for guidance / reference pattern.'
    );
    return;
  }

  const start = src.document.positionAt(fix.startOffset);
  const end = src.document.positionAt(fix.endOffset);
  const range = new vscode.Range(start, end);
  const current = src.document.getText(range);
  if (current !== fix.originalText) {
    vscode.window.showWarningMessage(
      'Coverity: source changed since the suggestion was built. Refresh Issue Details and try again.'
    );
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  edit.replace(src.uri, range, fix.proposedText);
  const ok = await vscode.workspace.applyEdit(edit);
  if (ok) {
    vscode.window.showInformationMessage(`Coverity: applied possible fix (${fix.ruleKey}).`);
  } else {
    vscode.window.showWarningMessage('Coverity: failed to apply possible fix.');
  }
}

/**
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {number} line
 */
function findingIdOnLine(session, document, line) {
  const onLine = session.getEventsOnLine?.(document.uri, line) || [];
  if (onLine.length === 0) {
    return null;
  }
  if (session.activeFindingId && onLine.some((h) => h.finding.id === session.activeFindingId)) {
    return session.activeFindingId;
  }
  return onLine[0].finding.id;
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

/**
 * @param {vscode.ExtensionContext} context
 * @param {object} session
 */
function registerPossibleFixSupport(context, session) {
  extensionContext = context;
  const applyCmd = vscode.commands.registerCommand(
    'coverity.applyPossibleFix',
    async (findingId) => {
      let fid = findingId || session.activeFindingId;
      if (!fid) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          fid = findingIdOnLine(session, editor.document, editor.selection.active.line);
        }
      }
      if (!fid) {
        vscode.window.showWarningMessage('Coverity: no finding selected for possible fix.');
        return;
      }
      await applyPossibleFix(session, fid);
    }
  );

  const provider = vscode.languages.registerCodeActionsProvider(
    ['c', 'cpp'],
    {
      async provideCodeActions(document, range, ctx) {
        if (!session.hasReport()) {
          return [];
        }
        const line = range.start.line;
        const diags = ctx.diagnostics?.length
          ? ctx.diagnostics.filter((d) => d.source === DIAGNOSTIC_SOURCE)
          : coverityDiagnosticsTouchingLine(document, line);

        const findingIds = new Set();
        for (const diag of diags) {
          // Match by checker on last-event diagnostics via line hits.
          const fid = findingIdOnLine(session, document, diag.range.start.line);
          if (fid) {
            findingIds.add(fid);
          }
        }
        if (findingIds.size === 0) {
          const fid = findingIdOnLine(session, document, line);
          if (fid) {
            findingIds.add(fid);
          }
        }

        /** @type {vscode.CodeAction[]} */
        const actions = [];
        for (const fid of findingIds) {
          const fix = await computePossibleFixForFinding(session, fid);
          if (!fix?.applyable || fix.referenceOnly) {
            continue;
          }
          const action = new vscode.CodeAction(
            `Apply possible fix (${fix.ruleKey}: ${fix.title})`,
            vscode.CodeActionKind.QuickFix
          );
          action.isPreferred = fix.confidence === 'high';
          action.command = {
            command: 'coverity.applyPossibleFix',
            title: 'Apply possible fix',
            arguments: [fid],
          };
          if (diags[0]) {
            action.diagnostics = [diags[0]];
          }
          actions.push(action);
        }
        return actions;
      },
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );

  context.subscriptions.push(applyCmd, provider);
  return { applyCmd, provider };
}

module.exports = {
  registerPossibleFixSupport,
  computePossibleFixForFinding,
  applyPossibleFix,
  resolveFindingSource,
};
