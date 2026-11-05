'use strict';

const vscode = require('vscode');

/**
 * Coverity multiline reports use 1-based line and column in our synthetic fixture.
 * VS Code positions are 0-based; columns are UTF-16 code units.
 */

/**
 * @param {number} reportLine 1-based
 * @param {number} reportColumn 1-based
 */
function reportToPosition(reportLine, reportColumn) {
  const line = Math.max(0, (reportLine || 1) - 1);
  const character = Math.max(0, (reportColumn || 1) - 1);
  return new vscode.Position(line, character);
}

/**
 * @param {vscode.Position} pos
 */
function positionToReport(pos) {
  return { line: pos.line + 1, column: pos.character + 1 };
}

module.exports = {
  reportToPosition,
  positionToReport,
};
