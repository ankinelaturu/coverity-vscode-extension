'use strict';

const vscode = require('vscode');
const { ROW_HEIGHT } = require('./gutterLaneSvg');

function codeLensBandPx() {
  const configured = vscode.workspace.getConfiguration('coverity').get('traceStripCodeLensBandPx', 0);
  return Math.max(0, configured);
}

/**
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

/** Fixed row height — taller per-line fills show as extra rectangles in Cursor (see DEC-011). */
function stripLineLayout(_line, _lineCount, _codeLensRows) {
  void _line;
  void _lineCount;
  void _codeLensRows;
  return {
    heightPx: `${ROW_HEIGHT}px`,
    margin: '0',
  };
}

module.exports = {
  codeLensBandPx,
  estimateCodeLensRowsPerLine,
  stripLineLayout,
};
