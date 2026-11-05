'use strict';

const vscode = require('vscode');
const { COLORS, ROW_HEIGHT } = require('./gutterLaneSvg');

const EDITOR_BG = new vscode.ThemeColor('editor.background');

/** Black circle + white digit (❶…❿), when CSS pill styling is ignored. */
function filledCircledDigitGlyph(stepNumber) {
  if (stepNumber >= 1 && stepNumber <= 10) {
    return String.fromCodePoint(0x2775 + stepNumber);
  }
  if (stepNumber >= 11 && stepNumber <= 20) {
    return String.fromCodePoint(0x24eb + stepNumber - 11);
  }
  return null;
}

function badgeDiameter(stepNumber) {
  return stepNumber > 9 ? 15 : 14;
}

/**
 * Step badge via `contentText` + attachment CSS (SVG `contentIconPath` is unreliable in Cursor).
 */
function beforeStripStepBadge(widthPx, layout, stepNumber, isActiveStep) {
  const diameter = badgeDiameter(stepNumber);
  const padLeft = Math.max(0, Math.floor((widthPx - diameter) / 2));
  const padTop = Math.max(0, Math.floor((ROW_HEIGHT - diameter) / 2));
  const fill = isActiveStep ? COLORS.activeFill : COLORS.inactiveFill;
  const stroke = isActiveStep ? COLORS.activeStroke : COLORS.inactiveStroke;
  const textColor = isActiveStep ? COLORS.activeText : COLORS.inactiveText;
  const fontSize = stepNumber > 99 ? 7 : stepNumber > 9 ? 8 : 9;
  const borderW = isActiveStep ? 2 : 1;
  const inner = diameter - 2 * borderW;

  return {
    before: {
      contentText: String(stepNumber),
      width: `${diameter}px`,
      height: `${diameter}px`,
      margin: `${padTop}px 0 0 ${padLeft}px`,
      borderRadius: '50%',
      backgroundColor: fill,
      color: textColor,
      fontWeight: isActiveStep ? 'bold' : '600',
      fontSize: `${fontSize}px`,
      border: `${borderW}px solid ${stroke}`,
      textDecoration: `none; display:inline-block; box-sizing:border-box; text-align:center; line-height:${inner}px`,
    },
  };
}

/** Unicode circled digits when attachment CSS (border-radius, etc.) is stripped. */
function beforeStripStepBadgeGlyph(widthPx, layout, stepNumber, isActiveStep) {
  const glyph = filledCircledDigitGlyph(stepNumber);
  const contentText = glyph ?? String(stepNumber);
  const padLeft = Math.max(0, Math.floor((widthPx - 14) / 2));
  const padTop = Math.max(0, Math.floor((ROW_HEIGHT - 14) / 2));
  return {
    before: {
      contentText,
      width: `${widthPx}px`,
      height: layout.heightPx,
      margin: `${padTop}px 0 0 ${padLeft}px`,
      backgroundColor: EDITOR_BG,
      color: isActiveStep ? COLORS.activeFill : COLORS.inactiveText,
      fontWeight: isActiveStep ? 'bold' : 'normal',
      textDecoration: 'none',
    },
  };
}

module.exports = { beforeStripStepBadge, beforeStripStepBadgeGlyph, filledCircledDigitGlyph };
