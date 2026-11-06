'use strict';

const vscode = require('vscode');
const { reportToPosition } = require('./coordinates');

/** @typedef {'confident' | 'uncertain' | 'fallback' | 'unresolved'} TrackingStatus */

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

/**
 * @param {vscode.TextDocument} doc
 * @param {number} lineIdx 0-based
 * @param {{ line: number, column: number }} reportLoc 1-based (for column when payload misses)
 * @param {string} rawPayload
 */
/**
 * Align a trace event to a range on a specific 0-based line using optional payload snippet, else column from report.
 * @returns {{ range: vscode.Range, status: TrackingStatus }}
 */
function matchEventRangeAtLine(doc, lineIdx, reportLoc, rawPayload) {
  if (lineIdx < 0 || lineIdx >= doc.lineCount) {
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
 * Align using the static report path:line:col (initial load).
 * @returns {{ range: vscode.Range, status: TrackingStatus }}
 */
function matchEventRange(doc, reportLoc, rawPayload) {
  const lineIdx = Math.max(0, (reportLoc.line || 1) - 1);
  return matchEventRangeAtLine(doc, lineIdx, reportLoc, rawPayload);
}

/**
 * Re-align after edits: search payload near the tracked line; if missing, column fallback on the hint line only
 * (never jump to stale report line while a hint exists — avoids duplicate Problems after line inserts + save).
 * @param {vscode.TextDocument} doc
 * @param {{ line: number, column: number }} reportLoc 1-based
 * @param {string} rawPayload
 * @param {number | undefined} hintLine0 0-based line from current tracked range
 */
function rematchEventRange(doc, reportLoc, rawPayload, hintLine0) {
  const payload = (rawPayload || '').trim();
  /** @type {number[]} */
  const linesToTry = [];
  const addLine = (lineIdx) => {
    if (lineIdx >= 0 && lineIdx < doc.lineCount && !linesToTry.includes(lineIdx)) {
      linesToTry.push(lineIdx);
    }
  };

  const hasHint = hintLine0 != null && Number.isFinite(hintLine0);
  if (hasHint) {
    addLine(Math.floor(hintLine0));
    addLine(Math.floor(hintLine0) - 1);
    addLine(Math.floor(hintLine0) + 1);
  } else {
    addLine(Math.max(0, (reportLoc.line || 1) - 1));
  }

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

  if (hasHint) {
    const hint = Math.min(Math.max(0, Math.floor(hintLine0)), Math.max(0, doc.lineCount - 1));
    return matchEventRangeAtLine(doc, hint, reportLoc, rawPayload);
  }

  return matchEventRange(doc, reportLoc, rawPayload);
}

module.exports = {
  matchEventRange,
  matchEventRangeAtLine,
  rematchEventRange,
};
