'use strict';

const vscode = require('vscode');
const crypto = require('crypto');
const { parseCoverityTextReport, fingerprintReportText } = require('../parser/textReportParser');
const { buildReportIndexes } = require('../model/indexBuilder');
const { resolveReportPath } = require('../paths/pathResolver');
const { matchEventRange } = require('../ranges/rangeMatcher');
const { transformRangeForChange } = require('../tracking/rangeTracker');
const { saveLocationCache, loadLocationCache, clearLocationCache } = require('../persistence/locationCache');
const { rebuildExplorerDecorationIndex } = require('../explorer/decorationIndex');
const { describe } = require('../lookup/lookup');

const DIAGNOSTIC_SOURCE = 'Coverity Report';

class ReportSession {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.reportUri = null;
    this.reportHash = null;
    this.parsed = null;
    this.indexes = null;
    /** @type {Map<string, object>} key findingId:eventIndex */
    this.tracked = new Map();
    this.activeFindingId = null;
    this.activeEventIndex = 0;
    this._onDidChange = new vscode.EventEmitter();
    this.onDidChange = this._onDidChange.event;
    this._refreshTimer = null;
    /** @type {vscode.Uri | null} */
    this.activeEditorUri = null;
    /** @type {object | null} */
    this.explorerDecorationIndex = null;
  }

  hasReport() {
    return Boolean(this.indexes);
  }

  fireChange() {
    this._onDidChange.fire();
    this.syncViewContexts();
  }

  syncViewContexts() {
    vscode.commands.executeCommand('setContext', 'coverity.hasReport', this.hasReport());
  }

  getMappings() {
    return vscode.workspace.getConfiguration('coverity').get('pathMappings') || [];
  }

  /**
   * @param {vscode.Uri} uri
   * @param {string} text
   */
  async loadReport(uri, text) {
    this.reportUri = uri;
    this.reportHash = fingerprintReportText(text);
    this.parsed = parseCoverityTextReport(text);
    this.indexes = buildReportIndexes(this.parsed);
    this.tracked.clear();
    await this.rebuildAllTracking();
    const cached = loadLocationCache(this.context.workspaceState, this.reportHash);
    if (cached) {
      this.applyCacheEntries(cached);
    }
    await this.context.workspaceState.update('coverity.lastReportPath', uri.fsPath);
    this.fireChange();
    return this.parsed;
  }

  async reloadReportFromDisk() {
    if (!this.reportUri) {
      return null;
    }
    const doc = await vscode.workspace.fs.readFile(this.reportUri);
    return this.loadReport(this.reportUri, Buffer.from(doc).toString('utf8'));
  }

  async rebuildAllTracking() {
    if (!this.indexes) {
      return;
    }
    this.tracked.clear();
    for (const finding of this.indexes.findings) {
      for (let ei = 0; ei < finding.events.length; ei++) {
        const ev = finding.events[ei];
        const key = trackKey(finding.id, ei);
        const resolved = resolveReportPath(ev.location.rawPath, vscode.workspace.workspaceFolders || [], this.getMappings());
        if (resolved.status !== 'resolved' || !resolved.uri) {
          this.tracked.set(key, {
            findingId: finding.id,
            eventIndex: ei,
            status: 'unresolved',
            reason: resolved.reason,
            rawPath: ev.location.rawPath,
          });
          continue;
        }
        try {
          const doc = await vscode.workspace.openTextDocument(resolved.uri);
          const contentHash = hashContent(doc.getText());
          const matched = matchEventRange(doc, ev.location, ev.rawPayload);
          this.tracked.set(key, {
            findingId: finding.id,
            eventIndex: ei,
            uri: doc.uri,
            range: matched.range,
            status: matched.status,
            contentHash,
            rawPath: ev.location.rawPath,
          });
        } catch (err) {
          this.tracked.set(key, {
            findingId: finding.id,
            eventIndex: ei,
            status: 'unresolved',
            reason: String(err.message || err),
            rawPath: ev.location.rawPath,
          });
        }
      }
    }
    await this.persistCache();
    rebuildExplorerDecorationIndex(this);
  }

  applyCacheEntries(entries) {
    for (const entry of entries) {
      const key = trackKey(entry.findingId, entry.eventIndex);
      const current = this.tracked.get(key);
      if (!current || !entry.range) {
        continue;
      }
      if (entry.contentHash && current.contentHash && entry.contentHash !== current.contentHash) {
        continue;
      }
      const start = new vscode.Position(entry.range.start.line, entry.range.start.character);
      const end = new vscode.Position(entry.range.end.line, entry.range.end.character);
      current.range = new vscode.Range(start, end);
      current.status = entry.status || current.status;
    }
  }

  async persistCache() {
    if (!this.reportHash) {
      return;
    }
    const entries = [];
    for (const [key, t] of this.tracked.entries()) {
      if (!t.range || !t.uri) {
        continue;
      }
      entries.push({
        findingId: t.findingId,
        eventIndex: t.eventIndex,
        contentHash: t.contentHash,
        status: t.status,
        range: {
          start: { line: t.range.start.line, character: t.range.start.character },
          end: { line: t.range.end.line, character: t.range.end.character },
        },
      });
    }
    await saveLocationCache(this.context.workspaceState, this.reportHash, { entries });
  }

  getFinding(id) {
    return this.indexes?.findingById.get(id);
  }

  getTracked(findingId, eventIndex) {
    return this.tracked.get(trackKey(findingId, eventIndex));
  }

  setActive(findingId, eventIndex) {
    this.activeFindingId = findingId;
    this.activeEventIndex = eventIndex;
    this.fireChange();
  }

  /**
   * @param {vscode.TextDocumentChangeEvent} e
   */
  handleDocumentChange(e) {
    if (!this.indexes) {
      return;
    }
    let touched = false;
    for (const t of this.tracked.values()) {
      if (!t.uri || t.uri.toString() !== e.document.uri.toString() || !t.range) {
        continue;
      }
      if (e.document.isDirty) {
        t.status = 'uncertain';
        touched = true;
        continue;
      }
      const result = transformRangeForChange(t.range, e);
      t.range = result.range;
      if (result.status === 'uncertain') {
        t.status = 'uncertain';
      }
      t.contentHash = hashContent(e.document.getText());
      touched = true;
    }
    if (touched) {
      this.scheduleRefresh();
    }
  }

  /**
   * Best-effort: keep tracked URIs aligned when a source file is renamed in the workspace.
   * @param {import('vscode').FileRenameEvent[]} renames
   */
  handleFilesRenamed(renames) {
    if (!this.indexes || !renames?.length) {
      return;
    }
    let touched = false;
    for (const { oldUri, newUri } of renames) {
      const oldStr = oldUri.toString();
      for (const t of this.tracked.values()) {
        if (t.uri?.toString() === oldStr) {
          t.uri = newUri;
          touched = true;
        }
      }
    }
    if (touched) {
      this.persistCache();
      this.fireChange();
    }
  }

  scheduleRefresh() {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = setTimeout(() => {
      this.persistCache();
      this.fireChange();
    }, 300);
  }

  async resetAdjustedLocations() {
    await clearLocationCache(this.context.workspaceState);
    await this.rebuildAllTracking();
    this.fireChange();
  }

  async navigateToStep(findingId, eventIndex) {
    const finding = this.getFinding(findingId);
    if (!finding) {
      return;
    }
    const ev = finding.events[eventIndex];
    if (!ev) {
      return;
    }
    this.setActive(findingId, eventIndex);
    const tracked = this.getTracked(findingId, eventIndex);
    if (!tracked || tracked.status === 'unresolved' || !tracked.uri) {
      vscode.window.showWarningMessage(tracked?.reason || 'Unresolved location — configure path mapping.');
      return;
    }
    const doc = await vscode.workspace.openTextDocument(tracked.uri);
    const editor = await vscode.window.showTextDocument(doc);
    const range = tracked.range;
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }

  navigateRelative(delta) {
    if (!this.activeFindingId) {
      return;
    }
    return this.navigateRelativeFrom(this.activeFindingId, this.activeEventIndex, delta);
  }

  /**
   * Step prev/next for a specific finding (CodeLens / disambiguation).
   */
  navigateRelativeFrom(findingId, eventIndex, delta) {
    const finding = this.getFinding(findingId);
    if (!finding) {
      return;
    }
    this.setActive(findingId, eventIndex);
    const next = eventIndex + delta;
    if (next < 0 || next >= finding.events.length) {
      return;
    }
    return this.navigateToStep(findingId, next);
  }

  getEventsOnLine(uri, line) {
    return this.getEventsForUri(uri).filter(({ tracked }) => tracked.range.start.line === line);
  }

  /** Diagnostics grouped by document URI string */
  collectDiagnostics() {
    /** @type {Map<string, vscode.Diagnostic[]>} */
    const map = new Map();
    if (!this.indexes) {
      return map;
    }
    for (const finding of this.indexes.findings) {
      const isMain = (ei) => ei === finding.events.length - 1;
      for (let ei = 0; ei < finding.events.length; ei++) {
        const ev = finding.events[ei];
        const tracked = this.getTracked(finding.id, ei);
        if (!tracked?.uri || !tracked.range) {
          continue;
        }
        const key = tracked.uri.toString();
        if (!map.has(key)) {
          map.set(key, []);
        }
        const title = finding.typeTitle || finding.checkerId || 'Coverity finding';
        const hint = describe(finding.checkerId, ev.label);
        const msg = `[${finding.checkerId || 'Unknown'}] ${ev.label}${hint ? ` — ${hint}` : ''}: ${ev.rawPayload || title}`.trim();
        const severity = isMain(ei)
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;
        const diag = new vscode.Diagnostic(tracked.range, msg, severity);
        diag.source = DIAGNOSTIC_SOURCE;
        diag.code = finding.checkerId || undefined;
        map.get(key).push(diag);
      }
    }
    return map;
  }

  getEventsForUri(uri) {
    const out = [];
    if (!this.indexes) {
      return out;
    }
    const uriStr = uri.toString();
    for (const finding of this.indexes.findings) {
      for (let ei = 0; ei < finding.events.length; ei++) {
        const t = this.getTracked(finding.id, ei);
        if (t?.uri?.toString() === uriStr && t.range) {
          out.push({ finding, eventIndex: ei, tracked: t });
        }
      }
    }
    return out;
  }

  /** Unique findings with at least one resolved event in this file (for Explorer badge). */
  countFindingsForUri(uri) {
    if (!this.indexes) {
      return 0;
    }
    const uriStr = uri.toString();
    const findingIds = new Set();
    for (const finding of this.indexes.findings) {
      for (let ei = 0; ei < finding.events.length; ei++) {
        const t = this.getTracked(finding.id, ei);
        if (t?.uri?.toString() === uriStr) {
          findingIds.add(finding.id);
          break;
        }
      }
    }
    return findingIds.size;
  }
}

function trackKey(findingId, eventIndex) {
  return `${findingId}:${eventIndex}`;
}

function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

module.exports = {
  ReportSession,
  DIAGNOSTIC_SOURCE,
};
