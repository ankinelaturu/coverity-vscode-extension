'use strict';

const vscode = require('vscode');
const { lineDecorationRange } = require('./editorLineRange');
const { gutterIconUriForSvg } = require('./gutterIconCache');

/** Obvious magenta bar — easy to spot in the line-number gutter. */
function buildProbeBarSvg(width = 64, height = 18) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#e040fb" stroke="#fff" stroke-width="1"/>`,
    `<text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" font-size="9" font-weight="700" fill="#1a1a1a" font-family="sans-serif">COV</text>`,
    '</svg>',
  ].join('');
}

/**
 * Always-on gutter probe (line 0 + cursor line) — no report required.
 * @returns {vscode.DecorationOptions[]}
 */
function buildGutterProbeDecorations(editor, context) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  if (!cfg.get('gutterDebugProbe', true)) {
    return [];
  }

  const doc = editor.document;
  const lines = new Set([0, editor.selection.active.line]);
  const barUri = gutterIconUriForSvg(context, buildProbeBarSvg(64, 18));
  const duckUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'duck.svg');

  /** @type {vscode.DecorationOptions[]} */
  const out = [];

  for (const line of lines) {
    if (line >= doc.lineCount) {
      continue;
    }
    const range = lineDecorationRange(doc, line);
    const useBundled = line === 0;
    out.push({
      range,
      renderOptions: {
        gutterIconPath: useBundled ? duckUri : barUri,
        gutterIconSize: 'contain',
      },
    });
  }

  return out;
}

module.exports = { buildGutterProbeDecorations, buildProbeBarSvg };
