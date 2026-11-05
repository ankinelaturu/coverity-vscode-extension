'use strict';

const { ROW_HEIGHT, COLORS } = require('./gutterLaneSvg');

const LINE = COLORS.line;

function columnCenterX(column, columnWidth) {
  return column * columnWidth + columnWidth / 2;
}

/**
 * Per editor row: staggered step digits + connector segments to the next/previous in-file step.
 * @param {object} opts
 * @param {number} opts.stripWidth
 * @param {number} opts.columnWidth
 * @param {{ stepNumber: number, column: number, isActive: boolean }[]} opts.steps
 * @param {number[]} opts.fullSpineColumns
 * @param {{ fromColumn: number, toColumn: number, sameLine?: boolean } | null} opts.outgoing
 * @param {{ column: number, fromColumn: number, sameLine?: boolean } | null} opts.incoming
 */
function buildStripTraceRowSvg(opts) {
  const w = opts.stripWidth;
  const h = ROW_HEIGHT;
  const cw = opts.columnWidth;
  const cy = h / 2;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<defs><marker id="covArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${LINE}"/></marker></defs>`,
  ];

  for (const col of opts.fullSpineColumns || []) {
    const x = columnCenterX(col, cw);
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${LINE}" stroke-width="1.5"/>`);
  }

  if (opts.incoming && !opts.incoming.sameLine) {
    const x = columnCenterX(opts.incoming.column, cw);
    parts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${cy}" stroke="${LINE}" stroke-width="1.5" marker-end="url(#covArrow)"/>`
    );
    if (opts.incoming.fromColumn !== opts.incoming.column) {
      const x0 = columnCenterX(opts.incoming.fromColumn, cw);
      parts.push(`<line x1="${x0}" y1="0" x2="${x}" y2="0" stroke="${LINE}" stroke-width="1.5"/>`);
    }
  }

  if (opts.outgoing && !opts.outgoing.sameLine) {
    const { fromColumn, toColumn } = opts.outgoing;
    const x0 = columnCenterX(fromColumn, cw);
    const x1 = columnCenterX(toColumn, cw);
    parts.push(`<line x1="${x0}" y1="${cy}" x2="${x0}" y2="${h}" stroke="${LINE}" stroke-width="1.5"/>`);
    parts.push(
      `<line x1="${x0}" y1="${h}" x2="${x1}" y2="${h}" stroke="${LINE}" stroke-width="1.5" marker-end="url(#covArrow)"/>`
    );
  }

  if (opts.outgoing?.sameLine) {
    const { fromColumn, toColumn } = opts.outgoing;
    const x0 = columnCenterX(fromColumn, cw);
    const x1 = columnCenterX(toColumn, cw);
    parts.push(
      `<line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" stroke="${LINE}" stroke-width="1.5" marker-end="url(#covArrow)"/>`
    );
  }

  for (const step of opts.steps || []) {
    const x = columnCenterX(step.column, cw);
    const color = step.isActive ? COLORS.activeFill : COLORS.inactiveText;
    const weight = step.isActive ? 700 : 500;
    parts.push(
      `<text x="${x}" y="${cy + 3.5}" text-anchor="middle" font-size="9" font-weight="${weight}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="${color}">${step.stepNumber}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

/**
 * @param {{ line: number, eventIndex: number }[]} rawSteps sorted by eventIndex
 * @returns {Map<number, { steps: object[], fullSpineColumns: Set<number>, outgoing: object | null, incoming: object | null }>}
 */
function computeStripTraceRowSpecs(rawSteps) {
  /** @type {Map<number, { steps: object[], fullSpineColumns: Set<number>, outgoing: object | null, incoming: object | null }>} */
  const byLine = new Map();

  function ensure(line) {
    if (!byLine.has(line)) {
      byLine.set(line, {
        steps: [],
        fullSpineColumns: new Set(),
        outgoing: null,
        incoming: null,
      });
    }
    return byLine.get(line);
  }

  for (let i = 0; i < rawSteps.length; i++) {
    const s = rawSteps[i];
    ensure(s.line).steps.push({
      stepNumber: s.eventIndex + 1,
      column: i,
      isActive: false,
    });
  }

  for (let i = 0; i < rawSteps.length - 1; i++) {
    const a = rawSteps[i];
    const b = rawSteps[i + 1];
    const ca = i;
    const cb = i + 1;
    const La = a.line;
    const Lb = b.line;

    if (Lb > La) {
      ensure(La).outgoing = { fromColumn: ca, toColumn: cb };
      for (let line = La + 1; line < Lb; line++) {
        ensure(line).fullSpineColumns.add(cb);
      }
      ensure(Lb).incoming = { column: cb, fromColumn: ca };
    } else if (Lb === La) {
      const spec = ensure(La);
      spec.outgoing = { fromColumn: ca, toColumn: cb, sameLine: true };
    }
  }

  return byLine;
}

const LINE_V = '\u2502';
const LINE_H = '\u2500';
const ARROW_D = '\u2193';
const ARROW_R = '\u2192';
const STRIP_PAD = '\u2007';

function isDigitChar(ch) {
  return ch >= '0' && ch <= '9';
}

/**
 * Monospace strip row for Cursor (SVG contentIconPath is not shown in the COV column).
 * @param {object | undefined} rowSpec
 * @param {number} fieldChars
 */
function buildStripTraceRowText(rowSpec, fieldChars) {
  const chars = STRIP_PAD.repeat(Math.max(1, fieldChars)).split('');

  const paintLine = (col, ch) => {
    if (col < 0 || col >= fieldChars) {
      return;
    }
    if (!isDigitChar(chars[col])) {
      chars[col] = ch;
    }
  };

  const paintDigits = (col, stepNumber) => {
    const s = String(stepNumber);
    for (let i = 0; i < s.length; i++) {
      const at = col + i;
      if (at >= fieldChars) {
        break;
      }
      chars[at] = s[i];
    }
  };

  if (!rowSpec) {
    return chars.join('');
  }

  for (const col of rowSpec.fullSpineColumns) {
    paintLine(col, LINE_V);
  }

  if (rowSpec.incoming && !rowSpec.incoming.sameLine) {
    const { column, fromColumn } = rowSpec.incoming;
    paintLine(column, LINE_V);
    for (let c = fromColumn; c < column; c++) {
      paintLine(c, LINE_H);
    }
  }

  if (rowSpec.outgoing && !rowSpec.outgoing.sameLine) {
    const { fromColumn, toColumn } = rowSpec.outgoing;
    for (let c = fromColumn + 1; c <= toColumn; c++) {
      paintLine(c, c === toColumn ? ARROW_D : LINE_H);
    }
  }

  if (rowSpec.outgoing?.sameLine) {
    const { fromColumn, toColumn } = rowSpec.outgoing;
    for (let c = fromColumn + 1; c <= toColumn; c++) {
      paintLine(c, c === toColumn ? ARROW_R : LINE_H);
    }
  }

  for (const step of rowSpec.steps) {
    paintDigits(step.column, step.stepNumber);
  }

  return chars.join('');
}

module.exports = {
  buildStripTraceRowSvg,
  buildStripTraceRowText,
  computeStripTraceRowSpecs,
  columnCenterX,
};
