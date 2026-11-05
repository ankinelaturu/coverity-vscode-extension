'use strict';

const ROW_HEIGHT = 18;

const COLORS = {
  grid: '#4a4f58',
  line: '#5a6270',
  inactiveFill: '#3c424a',
  inactiveText: '#b8bcc4',
  inactiveStroke: '#6b7280',
  activeFill: '#e8a838',
  activeText: '#1a1a1a',
  activeStroke: '#f5d078',
};

/**
 * @param {number} laneCount
 * @param {number} laneWidth px per lane column
 */
function gutterWidth(laneCount, laneWidth) {
  return laneCount * laneWidth;
}

function laneCenterX(lane, laneWidth) {
  return lane * laneWidth + laneWidth / 2;
}

/**
 * One gutter row: fixed-width multi-lane grid, optional spine segments, optional step node.
 * @param {object} opts
 * @param {number} opts.laneCount
 * @param {number} opts.laneWidth
 * @param {number[]} opts.spineLanes lanes with vertical line through this row
 * @param {number | null} opts.stepNumber 1-based; null = spine-only row
 * @param {number} [opts.nodeLane]
 * @param {boolean} [opts.isActiveStep]
 * @param {number | null} [opts.connectFromLane] draw horizontal connector from this lane to nodeLane on step rows
 */
function buildGutterLaneRowSvg(opts) {
  const {
    laneCount,
    laneWidth,
    spineLanes = [],
    stepNumber = null,
    nodeLane = 0,
    isActiveStep = false,
    connectFromLane = null,
  } = opts;

  const width = gutterWidth(laneCount, laneWidth);
  const h = ROW_HEIGHT;
  const cy = h / 2;
  const spineSet = new Set(spineLanes);

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">`,
  ];

  for (let lane = 0; lane < laneCount; lane++) {
    const x = laneCenterX(lane, laneWidth);
    parts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.35"/>`
    );
  }

  for (const lane of spineSet) {
    if (lane < 0 || lane >= laneCount) {
      continue;
    }
    const x = laneCenterX(lane, laneWidth);
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${COLORS.line}" stroke-width="1.5"/>`);
  }

  if (stepNumber != null && connectFromLane != null && connectFromLane !== nodeLane) {
    const x1 = laneCenterX(connectFromLane, laneWidth);
    const x2 = laneCenterX(nodeLane, laneWidth);
    parts.push(`<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${COLORS.line}" stroke-width="1.5"/>`);
  }

  if (stepNumber != null) {
    const x = laneCenterX(nodeLane, laneWidth);
    const r = Math.min(6, laneWidth / 2 - 1);
    const fill = isActiveStep ? COLORS.activeFill : COLORS.inactiveFill;
    const stroke = isActiveStep ? COLORS.activeStroke : COLORS.inactiveStroke;
    const text = isActiveStep ? COLORS.activeText : COLORS.inactiveText;
    const sw = isActiveStep ? 2 : 1;
    parts.push(`<circle cx="${x}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    const fontSize = stepNumber > 9 ? 6 : 7;
    parts.push(
      `<text x="${x}" y="${cy + 2.5}" text-anchor="middle" font-size="${fontSize}" font-weight="${
        isActiveStep ? 700 : 500
      }" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${text}">${stepNumber}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

/**
 * Assign horizontal lanes (git-graph style) for in-file steps in trace order.
 * @param {{ line: number }[]} steps sorted by eventIndex
 * @param {number} laneCount
 */
function assignTraceLanes(steps, laneCount) {
  if (!steps.length) {
    return [];
  }
  /** @type {number[]} */
  const laneLastLine = [];
  return steps.map((step) => {
    let lane = 0;
    for (; lane < laneCount; lane++) {
      if (laneLastLine[lane] === undefined || laneLastLine[lane] < step.line) {
        break;
      }
    }
    if (lane >= laneCount) {
      lane = laneCount - 1;
    }
    laneLastLine[lane] = step.line;
    return { ...step, lane };
  });
}

/** Compact single-lane step badge for gutter when multi-lane mode is off. */
function buildSimpleGutterStepSvg(stepNumber, isActive) {
  return buildStepBadgeSvg(stepNumber, isActive, 18);
}

/** Filled circle + step number; `sizePx` is width and height of the square badge icon. */
function buildStepBadgeSvg(stepNumber, isActive, sizePx) {
  const size = Math.max(14, sizePx);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;
  const fill = isActive ? COLORS.activeFill : COLORS.inactiveFill;
  const text = isActive ? COLORS.activeText : COLORS.inactiveText;
  const fontSize = stepNumber > 9 ? 7 : 9;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`,
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="${
      isActive ? 700 : 600
    }" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${text}">${stepNumber}</text>`,
    '</svg>',
  ].join('');
}

module.exports = {
  ROW_HEIGHT,
  COLORS,
  gutterWidth,
  buildGutterLaneRowSvg,
  buildSimpleGutterStepSvg,
  buildStepBadgeSvg,
  assignTraceLanes,
};
