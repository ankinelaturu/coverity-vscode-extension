'use strict';

const vscode = require('vscode');

/** Non-empty range for gutter decorations (VS Code rejects empty ranges). */
function lineDecorationRange(document, line) {
  const lineCount = document.lineCount;
  const safeLine = Math.max(0, Math.min(line, lineCount - 1));
  const textLine = document.lineAt(safeLine);
  const endChar = Math.max(textLine.firstNonWhitespaceCharacterIndex + 1, textLine.range.end.character, 1);
  return new vscode.Range(safeLine, 0, safeLine, endChar);
}

module.exports = { lineDecorationRange };
