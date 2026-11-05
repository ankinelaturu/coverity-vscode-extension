'use strict';

const vscode = require('vscode');
const { ROW_HEIGHT } = require('./gutterLaneSvg');

/**
 * Extra strip height (px) below a line when the next line has CodeLens (fills the inter-line band).
 * Does not change CodeLens; tune via `coverity.traceStripCodeLensBandPx` if gaps remain.
 */
function codeLensBandPx() {
  return Math.max(0, vscode.workspace.getConfiguration('coverity').get('traceStripCodeLensBandPx', 18));
}

/**
 * Expected lens rows per line (mirrors codelensProvider).
 * @returns {Map<number, number>}
 */
function estimateCodeLensRowsPerLine(session, document) {
  if (!vscode.workspace.getConfiguration('coverity').get('codeLensEnabled', true)) {
    return new Map();
  }
  const hits = session.getEventsForUri(document.uri);
  /** @type {Map<number, object[]>} */
  const byLine = new Map();
  for (const h of hits) {
    const line = h.tracked.range.start.line;
    if (!byLine.has(line)) {
      byLine.set(line, []);
    }
    byLine.get(line).push(h);
  }
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const [line, list] of byLine.entries()) {
    if (list.length > 1) {
      counts.set(line, 1);
      continue;
    }
    const { finding, eventIndex } = list[0];
    let n = 1;
    if (eventIndex > 0) {
      n++;
    }
    if (eventIndex < finding.events.length - 1) {
      n++;
    }
    counts.set(line, n);
  }
  return counts;
}

/**
 * @param {number} line
 * @param {number} lineCount
 * @param {Map<number, number>} codeLensRows
 */
function stripLineLayout(line, lineCount, codeLensRows) {
  const band = codeLensBandPx();
  const bridgeDown = line + 1 < lineCount ? codeLensRows.get(line + 1) || 0 : 0;
  const heightPx = ROW_HEIGHT + bridgeDown * band;
  return {
    heightPx: `${heightPx}px`,
    margin: '0',
  };
}

module.exports = {
  estimateCodeLensRowsPerLine,
  stripLineLayout,
};
