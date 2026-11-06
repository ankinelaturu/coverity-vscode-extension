'use strict';

const vscode = require('vscode');

/**
 * Adjust tracked ranges after a single document edit batch.
 * Overlapping edits mark the range uncertain (conservative policy).
 */

/**
 * @param {vscode.Range} range
 * @param {vscode.TextDocumentChangeEvent} e
 */
function transformRangeForChange(range, e) {
  const originalRange = range;
  let start = range.start;
  let end = range.end;
  let uncertain = false;

  const changes = [...e.contentChanges].sort((a, b) => {
    const posA = a.range.start;
    const posB = b.range.start;
    if (posA.line !== posB.line) {
      return posB.line - posA.line;
    }
    return posB.character - posA.character;
  });

  for (const change of changes) {
    if (rangesOverlap(originalRange, change.range)) {
      uncertain = true;
    }
    start = shiftPosition(start, change);
    end = shiftPosition(end, change);
  }

  return {
    range: new vscode.Range(start, end),
    status: uncertain ? 'uncertain' : 'confident',
  };
}

function rangesOverlap(a, b) {
  const startA = a.start;
  const endA = a.end;
  const startB = b.start;
  const endB = b.end;
  if (startA.line > endB.line || startB.line > endA.line) {
    return false;
  }
  if (startA.line === endB.line && startA.character > endB.character) {
    return false;
  }
  if (startB.line === endA.line && startB.character > endA.character) {
    return false;
  }
  return true;
}

/**
 * @param {vscode.Position} pos
 * @param {vscode.TextDocumentContentChangeEvent} change
 */
function shiftPosition(pos, change) {
  const editStart = change.range.start;
  const editEnd = change.range.end;
  if (pos.isBefore(editStart)) {
    return pos;
  }
  if (pos.isAfter(editEnd) || pos.isEqual(editEnd)) {
    const deltaLines = countNewLines(change.text) - (editEnd.line - editStart.line);
    let newLine = pos.line + deltaLines;
    let newChar = pos.character;
    if (deltaLines === 0 && editStart.line === pos.line) {
      newChar = pos.character + (change.text.length - (editEnd.character - editStart.character));
    } else if (deltaLines !== 0 && editStart.line < pos.line) {
      newChar = pos.character;
    }
    return new vscode.Position(Math.max(0, newLine), Math.max(0, newChar));
  }
  return pos;
}

function countNewLines(text) {
  let n = 0;
  for (const ch of text) {
    if (ch === '\n') {
      n++;
    }
  }
  return n;
}

module.exports = {
  transformRangeForChange,
};
