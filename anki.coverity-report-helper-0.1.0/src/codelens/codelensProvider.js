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
 * @param {vscode.CodeLens[]} lenses
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
 * @param {import('vscode').Uri} uri
 * @param {number} line
 */
function ruleStripCommand(session, uri, line) {
  const ctx = session.resolveLineRuleContext(uri, line);
  if (!ctx || ctx.choices.length <= 1) {
    return undefined;
  }
  const { ruleIndex, choices } = ctx;
  const ruleCanPrev = ruleIndex > 0;
  const ruleCanNext = ruleIndex < choices.length - 1;
  if (ruleCanPrev && !ruleCanNext) {
    return { command: 'coverity.cycleFindingAtLine', args: [uri.toString(), line, -1] };
  }
  if (ruleCanNext && !ruleCanPrev) {
    return { command: 'coverity.cycleFindingAtLine', args: [uri.toString(), line, 1] };
  }
  return { command: 'coverity.ruleStripMenu', args: [uri.toString(), line] };
}

/**
 * @param {number} stepNum
 * @param {number} stepTotal
 * @param {string} findingId
 * @param {number} eventIndex
 */
function stepStripCommand(stepNum, stepTotal, findingId, eventIndex) {
  const stepCanPrev = stepNum > 1;
  const stepCanNext = stepNum < stepTotal;
  if (stepTotal <= 1) {
    return undefined;
  }
  if (stepCanPrev && !stepCanNext) {
    return { command: 'coverity.traceStepRelative', args: [findingId, eventIndex, -1] };
  }
  if (stepCanNext && !stepCanPrev) {
    return { command: 'coverity.traceStepRelative', args: [findingId, eventIndex, 1] };
  }
  return { command: 'coverity.stepStripMenu', args: [findingId, eventIndex] };
}

/**
 * Four CodeLens items: VS Code adds ` | ` only between them (not inside groups).
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

  if (k === 1) {
    pushLens(lenses, range, '← rule 1/1 →');
  } else {
    const ruleCmd = ruleStripCommand(session, document.uri, line);
    pushLens(
      lenses,
      range,
      `← rule ${ruleNum}/${k} →`,
      ruleCmd?.command,
      ruleCmd?.args
    );
  }

  pushLens(lenses, range, `: ${truncateLabel(findingDisplayName(finding))}`);

  if (stepTotal === 1) {
    pushLens(lenses, range, '← step 1/1 →');
  } else {
    const stepCmd = stepStripCommand(stepNum, stepTotal, finding.id, eventIndex);
    pushLens(lenses, range, `← step ${stepNum}/${stepTotal} →`, stepCmd?.command, stepCmd?.args);
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
