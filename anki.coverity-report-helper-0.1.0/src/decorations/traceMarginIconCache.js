'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vscode = require('vscode');

/** Cached SVG files for `before.contentIconPath` in the line-decorations column. */
function traceMarginIconUri(context, svg) {
  let baseDir = context.globalStorageUri.fsPath;
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch {
    baseDir = context.extensionUri.fsPath;
  }
  const dir = path.join(baseDir, 'trace-margin-icons');
  fs.mkdirSync(dir, { recursive: true });
  const hash = crypto.createHash('sha1').update(svg).digest('hex');
  const filePath = path.join(dir, `${hash}.svg`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, svg, 'utf8');
  }
  const uri = vscode.Uri.file(filePath);
  return { light: uri, dark: uri };
}

module.exports = { traceMarginIconUri };
