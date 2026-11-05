'use strict';

const fs = require('fs');
const vscode = require('vscode');

/** One filesystem path → one Problems tree file node (relative + absolute report paths). */
function canonicalFileUri(uri) {
  if (!uri || uri.scheme !== 'file') {
    return uri;
  }
  try {
    const real = fs.realpathSync.native(uri.fsPath);
    return vscode.Uri.file(real);
  } catch {
    return vscode.Uri.file(uri.fsPath);
  }
}

function canonicalUriKey(uri) {
  return canonicalFileUri(uri).toString();
}

module.exports = {
  canonicalFileUri,
  canonicalUriKey,
};
