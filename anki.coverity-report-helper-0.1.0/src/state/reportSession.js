'use strict';

const vscode = require('vscode');
const crypto = require('crypto');
const { parseCoverityTextReport, fingerprintReportText } = require('../parser/textReportParser');
const { buildReportIndexes } = require('../model/indexBuilder');
const { resolveReportPath } = require('../paths/pathResolver');
const { matchEventRange, rematchEventRange } = require('../ranges/rangeMatcher');
const { transformRangeForChange } = require('../tracking/rangeTracker');
const { saveLocationCache, loadLocationCache, clearLocationCache } = require('../persistence/locationCache');
const { rebuildExplorerDecorationIndex } = require('../explorer/decorationIndex');
const { describe } = require('../lookup/lookup');
const { listFindingsOnLine, resolveLineRuleContext: resolveLineRuleContextForSession } =
  require('../codelens/findingsAtLine');
const { applyNavigationTarget, rememberLineFinding } = require('../navigation/editorNavigation');

const DIAGNOSTIC_SOURCE = 'Coverity Report';

/** Session state: `findings` / `findingId` in code = Coverity issues; `events` / `eventIndex` = path events. */

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
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._rematchTimer = null;
    /** @type {vscode.Uri | null} */
    this._rematchUri = null;
    /** @type {vscode.Uri | null} */
    this.activeEditorUri = null;
    /** @type {object | null} */
    this.explorerDecorationIndex = null;
    /** @type {Map<string, string>} `${uri}\0${line}` → findingId */
    this._lineFindingMemory = new Map();
    /** @type {string | null} When set, Problems publishes only this checkerId's findings. */
    this.problemsCheckerFilter = null;
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
    vscode.commands.executeCommand(
      'setContext',
      'coverity.problemsTypeFilterActive',
      Boolean(this.problemsCheckerFilter)
    );
  }

  /** @returns {string | null} */
  getProblemsCheckerFilter() {
    return this.problemsCheckerFilter;
  }

  /** @param {string | null} checkerId */
  setProblemsCheckerFilter(checkerId) {
    this.problemsCheckerFilter = checkerId || null;
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
    this.problemsCheckerFilter = null;
    this._lineFindingMemory.clear();
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
    applyNavigationTarget(this, findingId, eventIndex);
  }

  lineMemoryKey(uri, line) {
    return `${uri.toString()}\0${line}`;
  }

  /** @param {vscode.Uri} uri @param {number} line */
  getLineFindingMemory(uri, line) {
    return this._lineFindingMemory.get(this.lineMemoryKey(uri, line)) || null;
  }

  /** @param {vscode.Uri} uri @param {number} line @param {string} findingId */
  setLineFindingMemory(uri, line, findingId) {
    this._lineFindingMemory.set(this.lineMemoryKey(uri, line), findingId);
  }

  /**
   * @param {vscode.Uri} uri
   * @param {number} line
   * @param {vscode.Position} [position]
   */
  resolveLineRuleContext(uri, line, position) {
    return resolveLineRuleContextForSession(this, uri, line, position);
  }

  /**
   * @param {vscode.Uri} uri
   * @param {number} line
   * @param {number} delta
   */
  cycleFindingAtLine(uri, line, delta) {
    const ctx = resolveLineRuleContextForSession(this, uri, line);
    if (!ctx || ctx.choices.length <= 1) {
      return false;
    }
    const n = ctx.choices.length;
    const next = (ctx.ruleIndex + delta + n) % n;
    const pick = ctx.choices[next];
    applyNavigationTarget(this, pick.finding.id, pick.eventIndex);
    rememberLineFinding(this, uri, line, pick.finding.id);
    return true;
  }

  /**
   * @param {vscode.Uri} uri
   * @param {number} line
   */
  activateFindingAtLine(uri, line, findingId, eventIndex) {
    applyNavigationTarget(this, findingId, eventIndex);
    rememberLineFinding(this, uri, line, findingId);
  }

  /**
   * @param {vscode.TextDocumentChangeEvent} e
   */
  handleDocumentChange(e) {
    if (!this.indexes) {
      return;
    }
    let touched = false;
    let scheduleRematch = false;
    const docKey = e.document.uri.toString();
    for (const t of this.tracked.values()) {
      if (!t.uri || t.uri.toString() !== docKey || !t.range) {
        continue;
      }
      const result = transformRangeForChange(t.range, e);
      t.range = result.range;
      if (result.status === 'uncertain') {
        t.status = 'uncertain';
        scheduleRematch = true;
      }
      t.contentHash = hashContent(e.document.getText());
      touched = true;
    }
    if (scheduleRematch) {
      this.scheduleRematchForUri(e.document.uri);
    } else if (touched) {
      this.scheduleRefresh();
    }
  }

  /**
   * @param {vscode.Uri} uri
   */
  async handleDocumentSave(uri) {
    if (!this.indexes) {
      return;
    }
    const rematched = await this.rematchTrackedInUri(uri);
    if (rematched) {
      await this.persistCache();
      this.fireChange();
    }
  }

  /**
   * @param {vscode.Uri} uri
   * @returns {Promise<boolean>}
   */
  async rematchTrackedInUri(uri) {
    const docKey = uri.toString();
    let any = false;
    let doc;
    for (const t of this.tracked.values()) {
      if (!t.uri || t.uri.toString() !== docKey || !t.range) {
        continue;
      }
      const finding = this.getFinding(t.findingId);
      const ev = finding?.events[t.eventIndex];
      if (!ev) {
        continue;
      }
      if (!doc) {
        doc = await vscode.workspace.openTextDocument(uri);
      }
      const hintLine = t.range.start.line;
      const matched = rematchEventRange(doc, ev.location, ev.rawPayload, hintLine);
      t.range = matched.range;
      t.status = matched.status;
      t.contentHash = hashContent(doc.getText());
      any = true;
    }
    return any;
  }

  /**
   * @param {vscode.Uri} uri
   */
  scheduleRematchForUri(uri) {
    this._rematchUri = uri;
    if (this._rematchTimer) {
      clearTimeout(this._rematchTimer);
    }
    this._rematchTimer = setTimeout(() => {
      this._rematchTimer = null;
      const pending = this._rematchUri;
      this._rematchUri = null;
      if (!pending) {
        return;
      }
      void this.rematchTrackedInUri(pending).then((rematched) => {
        if (rematched) {
          this.scheduleRefresh();
        }
      });
    }, 400);
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
    applyNavigationTarget(this, findingId, eventIndex);
    const tracked = this.getTracked(findingId, eventIndex);
    if (!tracked || tracked.status === 'unresolved' || !tracked.uri) {
      vscode.window.showWarningMessage(tracked?.reason || 'Unresolved location — configure path mapping.');
      return;
    }
    rememberLineFinding(this, tracked.uri, tracked.range.start.line, findingId);
    const doc = await vscode.workspace.openTextDocument(tracked.uri);
    const range = tracked.range;
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      selection: new vscode.Selection(range.start, range.end),
      preserveFocus: false,
    });
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
    applyNavigationTarget(this, findingId, eventIndex);
    const next = eventIndex + delta;
    if (next < 0 || next >= finding.events.length) {
      return;
    }
    return this.navigateToStep(findingId, next);
  }

  getEventsOnLine(uri, line) {
    return this.getEventsForUri(uri).filter(({ tracked }) => tracked.range.start.line === line);
  }

  /**
   * Pick an active finding/step when this file has trace hits but none is selected yet.
   * @param {vscode.Uri} uri
   */
  ensureActiveFindingForUri(uri) {
    if (!this.indexes) {
      return;
    }
    const hits = this.getEventsForUri(uri);
    if (hits.length === 0) {
      return;
    }
    if (this.activeFindingId) {
      const still = hits.some((h) => h.finding.id === this.activeFindingId);
      if (still) {
        return;
      }
    }
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.uri.toString() === uri.toString()) {
      const pos = editor.selection.active;
      const onCursor = hits.filter(({ tracked }) => tracked.range.contains(pos));
      if (onCursor.length) {
        const pick = onCursor[0];
        this.setActive(pick.finding.id, pick.eventIndex);
        return;
      }
    }
    const first = hits[0];
    this.setActive(first.finding.id, first.eventIndex);
  }

  /**
   * One Problem per issue: range + message on the last event. Earlier events are
   * relatedInformation in event order (0..n-1), not sorted by line number.
   */
  collectDiagnostics() {
    /** @type {Map<string, vscode.Diagnostic[]>} */
    const map = new Map();
    if (!this.indexes) {
      return map;
    }
    const checkerFilter = this.problemsCheckerFilter;

    for (const finding of this.indexes.findings) {
      if (checkerFilter && (finding.checkerId || 'Unknown') !== checkerFilter) {
        continue;
      }
      const n = finding.events.length;
      if (n === 0) {
        continue;
      }
      const lastEi = n - 1;
      const mainTracked = this.getTracked(finding.id, lastEi);
      if (!mainTracked?.uri || !mainTracked.range) {
        continue;
      }

      const title = finding.typeTitle || finding.checkerId || 'Coverity issue';
      const mainEv = finding.events[lastEi];
      const hint = describe(finding.checkerId, mainEv.label);
      const core = `[${finding.checkerId || 'Unknown'}] ${mainEv.label}${hint ? ` — ${hint}` : ''}: ${mainEv.rawPayload || title}`.trim();
      const msg = `${core} — CodeLens/Hover: Full Trace`;
      const diag = new vscode.Diagnostic(mainTracked.range, msg, vscode.DiagnosticSeverity.Warning);
      diag.source = DIAGNOSTIC_SOURCE;
      diag.code = finding.checkerId || undefined;

      /** @type {vscode.DiagnosticRelatedInformation[]} */
      const related = [];
      for (let ei = 0; ei < n; ei++) {
        const ev = finding.events[ei];
        const t = this.getTracked(finding.id, ei);
        if (!t?.uri || !t.range) {
          continue;
        }
        const stepHint = describe(finding.checkerId, ev.label);
        const stepCore = `Event ${ei + 1}/${n}: ${ev.label}${stepHint ? ` — ${stepHint}` : ''}: ${ev.rawPayload || title}`.trim();
        related.push(new vscode.DiagnosticRelatedInformation(new vscode.Location(t.uri, t.range), stepCore));
      }
      diag.relatedInformation = related;

      const key = mainTracked.uri.toString();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(diag);
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
