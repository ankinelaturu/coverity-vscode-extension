'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/**
 * VS Code gutter icons: prefer bundled PNG under extension media/ (SVG often not rendered).
 * @param {vscode.ExtensionContext} context
 * @param {string} fileName e.g. trace-margin-lanes.png
 */
function bundledGutterIcon(context, fileName) {
  const filePath = path.join(context.extensionUri.fsPath, 'media', fileName);
  let resolved = filePath;
  try {
    resolved = fs.realpathSync(filePath);
  } catch {
    // use as-is
  }
  const uri = vscode.Uri.file(resolved);
  return { light: uri, dark: uri };
}

module.exports = { bundledGutterIcon };
