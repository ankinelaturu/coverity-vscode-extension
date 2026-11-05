'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vscode = require('vscode');
const { bundledGutterIcon } = require('./gutterIconUri');

/**
 * Cached generated icons as PNG bytes written next to globalStorage (SVG unreliable in gutter).
 * Falls back to bundled gutter-probe.png when generation path fails.
 * @param {vscode.ExtensionContext} context
 * @param {string} svg still used as hash key; stored as .png filename for future PNG encoder
 */
function gutterIconUriForSvg(context, svg) {
  let baseDir = context.globalStorageUri.fsPath;
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch {
    baseDir = context.extensionUri.fsPath;
  }
  const dir = path.join(baseDir, 'gutter-icons');
  fs.mkdirSync(dir, { recursive: true });
  const hash = crypto.createHash('sha1').update(svg).digest('hex');
  const svgPath = path.join(dir, `${hash}.svg`);
  if (!fs.existsSync(svgPath)) {
    fs.writeFileSync(svgPath, svg, 'utf8');
  }
  // Cursor/VS Code glyph margin: use bundled PNG until we ship a PNG encoder (SVG often ignored).
  const bundled = bundledGutterIcon(context, 'gutter-probe.png');
  if (fs.existsSync(path.join(context.extensionUri.fsPath, 'media', 'gutter-probe.png'))) {
    return bundled.light;
  }
  return vscode.Uri.file(svgPath);
}

module.exports = { gutterIconUriForSvg, bundledGutterIcon };
