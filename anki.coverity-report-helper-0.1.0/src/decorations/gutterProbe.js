'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const { lineDecorationRange } = require('./editorLineRange');
const { bundledGutterIcon } = require('./gutterIconUri');

/**
 * Gutter + line highlight probe — runs without a loaded report.
 * @returns {{ decorations: vscode.DecorationOptions[], logLines: string[] }}
 */
function buildGutterProbeDecorations(editor, context) {
  const cfg = vscode.workspace.getConfiguration('coverity');
  if (!cfg.get('gutterDebugProbe', true)) {
    return { decorations: [], logLines: [] };
  }

  const doc = editor.document;
  const lines = new Set([0, editor.selection.active.line]);
  const pngIcon = bundledGutterIcon(context, 'gutter-probe.png');
  const duckPath = path.join(context.extensionUri.fsPath, 'media', 'duck.svg');
  const pngPath = path.join(context.extensionUri.fsPath, 'media', 'gutter-probe.png');

  const logLines = [
    `gutter probe: lang=${doc.languageId} ext=${context.extensionUri.fsPath}`,
    `duck.svg exists=${fs.existsSync(duckPath)} gutter-probe.png exists=${fs.existsSync(pngPath)}`,
    `png gutter URI=${pngIcon.light.toString()}`,
  ];

  /** @type {vscode.DecorationOptions[]} */
  const decorations = [];
  for (const line of lines) {
    if (line >= doc.lineCount) {
      continue;
    }
    decorations.push({
      range: lineDecorationRange(doc, line),
      renderOptions: {
        gutterIconPath: pngIcon,
        gutterIconSize: 'contain',
      },
    });
  }

  logLines.push(`gutter probe: ${decorations.length} decoration(s) on lines ${[...lines].join(',')}`);
  return { decorations, logLines };
}

module.exports = { buildGutterProbeDecorations };
