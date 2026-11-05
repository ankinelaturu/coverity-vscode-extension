'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vscode = require('vscode');

/**
 * Persist SVG gutter icons under globalStorage (gutterIconPath requires file URIs).
 * @param {vscode.ExtensionContext} context
 * @param {string} svg
 * @returns {vscode.Uri}
 */
function gutterIconUriForSvg(context, svg) {
  const dir = path.join(context.globalStorageUri.fsPath, 'gutter-icons');
  fs.mkdirSync(dir, { recursive: true });
  const hash = crypto.createHash('sha1').update(svg).digest('hex');
  const filePath = path.join(dir, `${hash}.svg`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, svg, 'utf8');
  }
  return vscode.Uri.file(filePath);
}

module.exports = { gutterIconUriForSvg };
