'use strict';

const path = require('path');
const fs = require('fs');
const { normalizePathKey } = require('../model/indexBuilder');

/**
 * Resolves report paths against workspace folder roots and user mappings.
 * Report-relative paths are relative to workspace root, NOT the report file directory.
 */

/**
 * @param {string} rawPath from report
 * @param {import('vscode').WorkspaceFolder[]} workspaceFolders
 * @param {Array<{reportPrefix: string, workspaceFolder: string}>} mappings
 * @returns {{ status: 'resolved' | 'unresolved', uri?: import('vscode').Uri, reason?: string }}
 */
function resolveReportPath(rawPath, workspaceFolders, mappings) {
  if (!rawPath) {
    return { status: 'unresolved', reason: 'Empty path' };
  }

  const normalizedRaw = rawPath.replace(/\\/g, '/');

  if (path.isAbsolute(rawPath)) {
    const fsPath = path.normalize(rawPath);
    if (fs.existsSync(fsPath)) {
      return { status: 'resolved', uri: require('vscode').Uri.file(fsPath) };
    }
    return { status: 'unresolved', reason: `Absolute path not found: ${rawPath}` };
  }

  for (const folder of workspaceFolders) {
    const candidate = path.join(folder.uri.fsPath, rawPath);
    if (fs.existsSync(candidate)) {
      return { status: 'resolved', uri: require('vscode').Uri.file(candidate) };
    }
    const candidateNorm = path.join(folder.uri.fsPath, normalizedRaw);
    if (fs.existsSync(candidateNorm)) {
      return { status: 'resolved', uri: require('vscode').Uri.file(candidateNorm) };
    }
  }

  for (const map of mappings || []) {
    if (!map.reportPrefix || !map.workspaceFolder) {
      continue;
    }
    const prefix = normalizePathKey(map.reportPrefix);
    if (normalizedRaw === prefix || normalizedRaw.startsWith(prefix + '/')) {
      const suffix = normalizedRaw.slice(prefix.length).replace(/^\//, '');
      for (const folder of workspaceFolders) {
        const base = path.join(folder.uri.fsPath, map.workspaceFolder);
        const candidate = path.join(base, suffix);
        if (fs.existsSync(candidate)) {
          return { status: 'resolved', uri: require('vscode').Uri.file(candidate) };
        }
      }
    }
  }

  return { status: 'unresolved', reason: `No file matched for: ${rawPath}` };
}

module.exports = {
  resolveReportPath,
};
