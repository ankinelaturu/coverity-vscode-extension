'use strict';

const vscode = require('vscode');
const { findingDisplayName } = require('./findingsAtLine');

/** @param {string} text @param {number} max */
function truncateLabel(text, max = 52) {
  const t = String(text || '').trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {vscode.Range} range
 * @param {string} title
 * @param {string} [command]
 * @param {unknown[]} [args]
 */
function pushLens(lenses, range, title, command, args) {
  if (command) {
    lenses.push(new vscode.CodeLens(range, { command, title, arguments: args }));
  } else {
    lenses.push(new vscode.CodeLens(range, { command: 'coverity.noop', title }));
  }
}

/**
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {number} line
 * @param {vscode.CodeLens[]} lenses
 * @param {vscode.Range} range
 */
function appendLineCodeLenses(session, document, line, lenses, range) {
  const ctx = session.resolveLineRuleContext(document.uri, line);
  if (!ctx) {
    return;
  }
  const { finding, eventIndex, choices, ruleIndex } = ctx;
  const uriStr = document.uri.toString();
  const k = choices.length;
  const ruleNum = ruleIndex + 1;
  const stepNum = eventIndex + 1;
  const stepTotal = finding.events.length;

  const ruleCanPrev = k > 1 && ruleIndex > 0;
  const ruleCanNext = k > 1 && ruleIndex < k - 1;
  const stepCanPrev = stepNum > 1;
  const stepCanNext = stepNum < stepTotal;
  const ruleTitle = `: ${truncateLabel(findingDisplayName(finding))}`;

  if (k === 1) {
    pushLens(lenses, range, `← rule 1/1 → ${ruleTitle}`);
  } else {
    pushLens(
      lenses,
      range,
      '← rule',
      ruleCanPrev ? 'coverity.cycleFindingAtLine' : undefined,
      ruleCanPrev ? [uriStr, line, -1] : undefined
    );
    pushLens(
      lenses,
      range,
      `${ruleNum}/${k}`,
      'coverity.pickFindingAtLine',
      [uriStr, line]
    );
    pushLens(
      lenses,
      range,
      `→ ${ruleTitle}`,
      ruleCanNext ? 'coverity.cycleFindingAtLine' : undefined,
      ruleCanNext ? [uriStr, line, 1] : undefined
    );
  }

  if (stepTotal === 1) {
    pushLens(lenses, range, '← step 1/1 →');
  } else {
    pushLens(
      lenses,
      range,
      '← step',
      stepCanPrev ? 'coverity.traceStepRelative' : undefined,
      stepCanPrev ? [finding.id, eventIndex, -1] : undefined
    );
    pushLens(lenses, range, `${stepNum}/${stepTotal}`);
    pushLens(
      lenses,
      range,
      '→',
      stepCanNext ? 'coverity.traceStepRelative' : undefined,
      stepCanNext ? [finding.id, eventIndex, 1] : undefined
    );
  }

  pushLens(lenses, range, 'Full Trace', 'coverity.showTracePeek', [finding.id, eventIndex]);
}

function registerCodeLens(session) {
  const provider = {
    onDidChangeCodeLenses: session.onDidChange,
    provideCodeLenses(document) {
      if (!session.hasReport()) {
        return [];
      }
      if (!vscode.workspace.getConfiguration('coverity').get('codeLensEnabled', true)) {
        return [];
      }

      /** @type {Set<number>} */
      const lines = new Set();
      for (const h of session.getEventsForUri(document.uri)) {
        if (h.tracked?.range) {
          lines.add(h.tracked.range.start.line);
        }
      }

      /** @type {vscode.CodeLens[]} */
      const lenses = [];
      for (const line of [...lines].sort((a, b) => a - b)) {
        const range = new vscode.Range(line, 0, line, 0);
        appendLineCodeLenses(session, document, line, lenses, range);
      }
      return lenses;
    },
  };

  return vscode.languages.registerCodeLensProvider(['c', 'cpp'], provider);
}

module.exports = { registerCodeLens };
