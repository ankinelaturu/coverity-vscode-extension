'use strict';

const vscode = require('vscode');
const { reportToPosition } = require('./coordinates');

/** @typedef {'confident' | 'uncertain' | 'fallback' | 'unresolved'} TrackingStatus */

/**
 * Align a trace event to a range in an open document using reported line/column and optional payload snippet.
 * @param {vscode.TextDocument} doc
 * @param {{ line: number, column: number }} reportLoc 1-based
 * @param {string} rawPayload
 * @returns {{ range: vscode.Range, status: TrackingStatus }}
 */
function matchEventRange(doc, reportLoc, rawPayload) {
  const lineIdx = Math.max(0, (reportLoc.line || 1) - 1);
  if (lineIdx >= doc.lineCount) {
    const pos = reportToPosition(reportLoc.line, reportLoc.column);
    return { range: new vscode.Range(pos, pos), status: 'fallback' };
  }

  const lineText = doc.lineAt(lineIdx).text;
  const payload = (rawPayload || '').trim();

  if (payload) {
    const exact = lineText.indexOf(payload);
    if (exact >= 0) {
      const start = new vscode.Position(lineIdx, exact);
      const end = new vscode.Position(lineIdx, exact + payload.length);
      return { range: new vscode.Range(start, end), status: 'confident' };
    }
    const trimmedLine = lineText.trim();
    const trimmedPayload = payload.trim();
    const idx = trimmedLine.indexOf(trimmedPayload);
    if (idx >= 0) {
      const lead = lineText.indexOf(trimmedLine);
      const startCol = lead + idx;
      const start = new vscode.Position(lineIdx, startCol);
      const end = new vscode.Position(lineIdx, startCol + trimmedPayload.length);
      return { range: new vscode.Range(start, end), status: 'confident' };
    }
  }

  const col = Math.max(0, (reportLoc.column || 1) - 1);
  const safeCol = Math.min(col, lineText.length);
  const start = new vscode.Position(lineIdx, safeCol);
  const endChar = Math.min(lineText.length, safeCol + Math.max(1, payload.length || 1));
  const end = new vscode.Position(lineIdx, endChar);
  return { range: new vscode.Range(start, end), status: payload ? 'uncertain' : 'fallback' };
}

module.exports = {
  matchEventRange,
};
