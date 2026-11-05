'use strict';

const vscode = require('vscode');

/**
 * Problems tree view rejects some ranges that table view tolerates (out-of-doc, empty).
 * @param {vscode.Range} range
 * @param {number | undefined} lineCount
 */
function normalizeDiagnosticRange(range, lineCount) {
  if (!range || !lineCount || lineCount < 1) {
    return range;
  }
  const maxLine = lineCount - 1;
  let startLine = Math.min(Math.max(range.start.line, 0), maxLine);
  let endLine = Math.min(Math.max(range.end.line, 0), maxLine);
  let startChar = Math.max(0, range.start.character);
  let endChar = Math.max(0, range.end.character);
  if (endLine < startLine) {
    endLine = startLine;
  }
  if (endLine === startLine && endChar < startChar) {
    endChar = startChar;
  }
  let out = new vscode.Range(startLine, startChar, endLine, endChar);
  if (out.isEmpty) {
    endChar = Math.max(startChar + 1, 1);
    out = new vscode.Range(startLine, startChar, endLine, endChar);
  }
  return out;
}

module.exports = {
  normalizeDiagnosticRange,
};
