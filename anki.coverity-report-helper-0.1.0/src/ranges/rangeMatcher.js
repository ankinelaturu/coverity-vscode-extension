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
/**
 * @param {string} lineText
 * @param {string} payload
 * @returns {{ startCol: number, endCol: number } | null}
 */
function findPayloadSpanOnLine(lineText, payload) {
  const exact = lineText.indexOf(payload);
  if (exact >= 0) {
    return { startCol: exact, endCol: exact + payload.length };
  }
  const trimmedLine = lineText.trim();
  const trimmedPayload = payload.trim();
  const idx = trimmedLine.indexOf(trimmedPayload);
  if (idx >= 0) {
    const lead = lineText.indexOf(trimmedLine);
    const startCol = lead + idx;
    return { startCol, endCol: startCol + trimmedPayload.length };
  }
  return null;
}

function matchEventRange(doc, reportLoc, rawPayload) {
  const lineIdx = Math.max(0, (reportLoc.line || 1) - 1);
  if (lineIdx >= doc.lineCount) {
    const pos = reportToPosition(reportLoc.line, reportLoc.column);
    return { range: new vscode.Range(pos, pos), status: 'fallback' };
  }

  const lineText = doc.lineAt(lineIdx).text;
  const payload = (rawPayload || '').trim();

  if (payload) {
    const span = findPayloadSpanOnLine(lineText, payload);
    if (span) {
      const start = new vscode.Position(lineIdx, span.startCol);
      const end = new vscode.Position(lineIdx, span.endCol);
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

/**
 * Re-align after edits: search payload near the tracked line first, then report line.
 * @param {vscode.TextDocument} doc
 * @param {{ line: number, column: number }} reportLoc 1-based
 * @param {string} rawPayload
 * @param {number | undefined} hintLine0 0-based line from current tracked range
 */
function rematchEventRange(doc, reportLoc, rawPayload, hintLine0) {
  const payload = (rawPayload || '').trim();
  const linesToTry = [];
  const addLine = (lineIdx) => {
    if (lineIdx >= 0 && lineIdx < doc.lineCount && !linesToTry.includes(lineIdx)) {
      linesToTry.push(lineIdx);
    }
  };
  if (hintLine0 != null && Number.isFinite(hintLine0)) {
    addLine(hintLine0);
    addLine(hintLine0 - 1);
    addLine(hintLine0 + 1);
  }
  addLine(Math.max(0, (reportLoc.line || 1) - 1));

  if (payload) {
    for (const lineIdx of linesToTry) {
      const span = findPayloadSpanOnLine(doc.lineAt(lineIdx).text, payload);
      if (span) {
        const start = new vscode.Position(lineIdx, span.startCol);
        const end = new vscode.Position(lineIdx, span.endCol);
        return { range: new vscode.Range(start, end), status: 'confident' };
      }
    }
  }

  return matchEventRange(doc, reportLoc, rawPayload);
}

module.exports = {
  matchEventRange,
  rematchEventRange,
};
