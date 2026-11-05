'use strict';

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
  formatStepLabel,
  stepIndentPx,
  stepMarkdownIndent,
};
