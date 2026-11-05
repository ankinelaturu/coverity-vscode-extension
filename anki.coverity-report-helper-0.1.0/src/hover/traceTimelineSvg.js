'use strict';

const CELL = 18;
const CX = CELL / 2;
const CY = CELL / 2;
const R = 7;

const COLORS = {
  line: '#5a6270',
  inactiveFill: '#3c424a',
  inactiveText: '#b8bcc4',
  inactiveStroke: '#6b7280',
  activeFill: '#e8a838',
  activeText: '#1a1a1a',
  activeStroke: '#f5d078',
};

/**
 * One continuous timeline (single SVG): full-height spine + numbered circles every 18px.
 * Used in hover as one &lt;img&gt; so the vertical line has no seams between rows.
 * @param {number} stepCount
 * @param {number} activeIndex 0-based
 * @returns {{ svg: string, width: number, height: number, row: number } | null}
 */
function buildTraceTimelineSvg(stepCount, activeIndex) {
  if (stepCount <= 0) {
    return null;
  }
  const height = stepCount * CELL;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${height}" viewBox="0 0 ${CELL} ${height}">`,
  ];

  if (stepCount > 0) {
    parts.push(
      `<line x1="${CX}" y1="0" x2="${CX}" y2="${height}" stroke="${COLORS.line}" stroke-width="1.5"/>`
    );
  }

  for (let i = 0; i < stepCount; i++) {
    const cy = CY + i * CELL;
    const active = i === activeIndex;
    const fill = active ? COLORS.activeFill : COLORS.inactiveFill;
    const stroke = active ? COLORS.activeStroke : COLORS.inactiveStroke;
    const text = active ? COLORS.activeText : COLORS.inactiveText;
    const sw = active ? 2 : 1;
    parts.push(
      `<circle cx="${CX}" cy="${cy}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    );
    parts.push(
      `<text x="${CX}" y="${cy + 3}" text-anchor="middle" font-size="8" font-weight="${
        active ? 700 : 500
      }" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${text}">${i + 1}</text>`
    );
  }

  parts.push('</svg>');
  return { svg: parts.join(''), width: CELL, height, row: CELL };
}

function traceTimelineDataUri(stepCount, activeIndex) {
  const built = buildTraceTimelineSvg(stepCount, activeIndex);
  if (!built) {
    return '';
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(built.svg)}`;
}

/**
 * One 18×18 cell: full vertical line + numbered circle (per table row).
 */
function buildTraceStepCellSvg(stepIndex, activeIndex) {
  const active = stepIndex === activeIndex;
  const fill = active ? COLORS.activeFill : COLORS.inactiveFill;
  const stroke = active ? COLORS.activeStroke : COLORS.inactiveStroke;
  const text = active ? COLORS.activeText : COLORS.inactiveText;
  const sw = active ? 2 : 1;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}">`,
    `<line x1="${CX}" y1="0" x2="${CX}" y2="${CELL}" stroke="${COLORS.line}" stroke-width="1.5"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
    `<text x="${CX}" y="${CY + 3}" text-anchor="middle" font-size="8" font-weight="${
      active ? 700 : 500
    }" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${text}">${stepIndex + 1}</text>`,
    '</svg>',
  ];
  return { svg: parts.join(''), width: CELL, height: CELL };
}

function traceStepCellDataUri(stepIndex, activeIndex) {
  const built = buildTraceStepCellSvg(stepIndex, activeIndex);
  return `data:image/svg+xml;utf8,${encodeURIComponent(built.svg)}`;
}

module.exports = {
  buildTraceTimelineSvg,
  traceTimelineDataUri,
  buildTraceStepCellSvg,
  traceStepCellDataUri,
  TRACE_ROW_HEIGHT: CELL,
  TRACE_COL_WIDTH: CELL,
};
