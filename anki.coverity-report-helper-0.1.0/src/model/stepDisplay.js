'use strict';

/**
 * Index of the finding's primary event: last root-level step (depth 1),
 * not the last nested leaf (e.g. prefer `4` over `4.3`).
 * @param {{ events?: Array<{ stepDepth?: number }> } | null | undefined} finding
 * @returns {number} 0-based index, or -1 if no events
 */
function mainEventIndex(finding) {
  const events = finding?.events || [];
  if (events.length === 0) {
    return -1;
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const depth = events[i].stepDepth;
    if (depth == null || depth <= 1) {
      return i;
    }
  }
  return events.length - 1;
}

/**
 * @param {{ events?: Array<{ stepDepth?: number }> } | null | undefined} finding
 * @param {number} eventIndex
 */
function isMainEvent(finding, eventIndex) {
  return eventIndex === mainEventIndex(finding);
}

/**
 * @param {{ stepPath?: string, stepNumber?: number }} step
 * @param {number} oneBasedIndex fallback when report has no step prefix
 */
function formatStepLabel(step, oneBasedIndex) {
  if (step.stepPath) {
    return step.stepPath;
  }
  if (step.stepNumber != null && !Number.isNaN(step.stepNumber)) {
    return String(step.stepNumber);
  }
  return String(oneBasedIndex);
}

/**
 * @param {{ stepDepth?: number }} step
 * @param {number} [pxPerLevel]
 */
function stepIndentPx(step, pxPerLevel = 28) {
  const depth = step.stepDepth || 1;
  return Math.max(0, depth - 1) * pxPerLevel;
}

/**
 * @param {{ stepDepth?: number }} step
 */
function stepMarkdownIndent(step) {
  const depth = step.stepDepth || 1;
  if (depth <= 1) {
    return '';
  }
  return '\u00A0'.repeat((depth - 1) * 5);
}

module.exports = {
  mainEventIndex,
  isMainEvent,
  formatStepLabel,
  stepIndentPx,
  stepMarkdownIndent,
};
