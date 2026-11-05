'use strict';

const PILL_HEIGHT = 18;
const FONT_SIZE = 12;
const PAD_X = 2;
const MIN_WIDTH = 18;
const MAX_WIDTH = 460;
const CHAR_WIDTH = 6.5;

const COLORS = {
  inactiveText: '#b8bcc4',
  activeText: '#e8a838',
};

const SECTION_PAD_X = 10;
const SECTION_RX = 4;
const SECTION_FILL = '#3a3d44';
const SECTION_STROKE = '#52565e';
const SECTION_TEXT = '#d0d3da';

function escapeSvgText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateForWidth(text, maxInnerWidth) {
  let t = String(text || '');
  if (estimateInnerWidth(t) <= maxInnerWidth) {
    return t;
  }
  const ell = '…';
  while (t.length > 1 && estimateInnerWidth(t + ell) > maxInnerWidth) {
    t = t.slice(0, -1);
  }
  return t + ell;
}

function estimateInnerWidth(text) {
  return Math.ceil(String(text).length * CHAR_WIDTH);
}

function pillWidthForText(text) {
  const innerMax = MAX_WIDTH - PAD_X * 2;
  const display = truncateForWidth(text, innerMax);
  const inner = estimateInnerWidth(display);
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, inner + PAD_X * 2));
}

/**
 * 18px-tall link strip: text only (transparent SVG, no border/fill).
 * @param {string} text label — location (and optional suffix)
 * @param {boolean} active
 * @returns {{ svg: string, width: number, height: number, text: string }}
 */
function buildLinkPillSvg(text, active) {
  const width = pillWidthForText(text);
  const innerMax = width - PAD_X * 2;
  const display = truncateForWidth(text, innerMax);
  const textFill = active ? COLORS.activeText : COLORS.inactiveText;
  const textY = PILL_HEIGHT / 2 + 4;
  const textX = PAD_X;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${PILL_HEIGHT}" viewBox="0 0 ${width} ${PILL_HEIGHT}">`,
    `<text x="${textX}" y="${textY}" text-anchor="start" font-size="${FONT_SIZE}" font-weight="${
      active ? 600 : 400
    }" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${textFill}">${escapeSvgText(display)}</text>`,
    '</svg>',
  ];
  return { svg: parts.join(''), width, height: PILL_HEIGHT, text: display };
}

function linkPillDataUri(text, active) {
  const built = buildLinkPillSvg(text, active);
  return {
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(built.svg)}`,
    width: built.width,
    height: built.height,
    text: built.text,
  };
}

function sectionPillWidthForText(text) {
  const display = String(text || '');
  return Math.max(MIN_WIDTH, estimateInnerWidth(display) + SECTION_PAD_X * 2);
}

/**
 * Rounded-rectangle label (non-link) for section headers above the trace table.
 */
function buildSectionPillSvg(text) {
  const display = String(text || '');
  const width = sectionPillWidthForText(display);
  const rx = SECTION_RX;
  const textY = PILL_HEIGHT / 2 + 4;
  const textX = SECTION_PAD_X;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${PILL_HEIGHT}" viewBox="0 0 ${width} ${PILL_HEIGHT}">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${PILL_HEIGHT - 1}" rx="${rx}" fill="${SECTION_FILL}" stroke="${SECTION_STROKE}" stroke-width="1"/>`,
    `<text x="${textX}" y="${textY}" text-anchor="start" font-size="${FONT_SIZE}" font-weight="600" font-family="-apple-system,Segoe UI,Helvetica,sans-serif" fill="${SECTION_TEXT}">${escapeSvgText(display)}</text>`,
    '</svg>',
  ];
  return { svg: parts.join(''), width, height: PILL_HEIGHT, text: display };
}

function sectionPillDataUri(text) {
  const built = buildSectionPillSvg(text);
  return {
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(built.svg)}`,
    width: built.width,
    height: built.height,
    text: built.text,
  };
}

module.exports = {
  buildLinkPillSvg,
  linkPillDataUri,
  buildSectionPillSvg,
  sectionPillDataUri,
  PILL_HEIGHT,
};
