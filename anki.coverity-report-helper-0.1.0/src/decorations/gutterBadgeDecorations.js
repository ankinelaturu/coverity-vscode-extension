'use strict';

const vscode = require('vscode');
const { buildSimpleGutterStepSvg } = require('./gutterLaneSvg');
const { gutterIconUriForSvg } = require('./gutterIconCache');
const { lineDecorationRange } = require('./editorLineRange');

/**
 * Single-icon gutter badges (active finding steps in this editor).
 */
function buildSimpleGutterBadgeDecorations(session, editor, context) {
  session.ensureActiveFindingForUri(editor.document.uri);
  const findingId = session.activeFindingId;
  if (!findingId) {
    return [];
  }

  const docStr = editor.document.uri.toString();
  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];

  const finding = session.getFinding(findingId);
  if (!finding) {
    return [];
  }
  for (let ei = 0; ei < finding.events.length; ei++) {
    const t = session.getTracked(findingId, ei);
    if (!t?.uri || t.uri.toString() !== docStr || !t.range) {
      continue;
    }
    const line = t.range.start.line;
    const svg = buildSimpleGutterStepSvg(ei + 1, ei === session.activeEventIndex);
    const iconUri = gutterIconUriForSvg(context, svg);
    decorations.push({
      range: lineDecorationRange(editor.document, line),
      renderOptions: {
        gutterIconPath: { light: iconUri, dark: iconUri },
        gutterIconSize: 'contain',
      },
    });
  }

  return decorations;
}

module.exports = { buildSimpleGutterBadgeDecorations };
