'use strict';

const vscode = require('vscode');
const path = require('path');
const { normalizePathKey } = require('../model/indexBuilder');

class FindingsTreeProvider {
  /**
   * @param {import('../state/reportSession').ReportSession} session
   */
  constructor(session) {
    this.session = session;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    session.onDidChange(() => this.refresh());
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    if (element instanceof FindingNode) {
      element.initLabel(this.session);
    }
    return element;
  }

  getChildren(element) {
    if (!this.session.indexes) {
      return [new InfoItem('Load a Coverity report to begin.')];
    }
    if (!element) {
      return this.buildRoots();
    }
    return element.getChildren(this.session);
  }

  buildRoots() {
    const layout = this.session.viewLayout;
    if (layout === 'errorType') {
      return this.buildErrorTypeRoots();
    }
    if (layout === 'folders') {
      return this.buildFolderRoots();
    }
    return this.buildFileRoots();
  }

  buildFileRoots() {
    const paths = [...this.session.indexes.byFilePath.keys()].sort();
    return paths
      .filter((p) => this.filePassesFilter(p))
      .map((p) => new FileNode(p));
  }

  buildFolderRoots() {
    const files = this.buildFileRoots();
    /** @type {Map<string, FolderNode>} */
    const folders = new Map();
    for (const f of files) {
      if (!(f instanceof FileNode)) {
        continue;
      }
      const dir = path.posix.dirname(f.fileKey);
      let node = folders.get(dir);
      if (!node) {
        node = new FolderNode(dir);
        folders.set(dir, node);
      }
      node.files.push(f);
    }
    return [...folders.values()].sort((a, b) => a.folderPath.localeCompare(b.folderPath));
  }

  buildErrorTypeRoots() {
    const groups = this.session.indexes.byChecker;
    const roots = [];
    for (const [checkerId, findingIds] of groups.entries()) {
      const unique = [...new Set(findingIds)];
      if (!this.checkerPassesFilter(checkerId, unique)) {
        continue;
      }
      roots.push(new CheckerNode(checkerId, unique.length));
    }
    return roots.sort((a, b) => a.checkerId.localeCompare(b.checkerId));
  }

  filePassesFilter(fileKey) {
    if (this.session.activeFileOnly) {
      const active = vscode.window.activeTextEditor?.document.uri;
      if (!active) {
        return false;
      }
      const activePath = normalizePathKey(active.fsPath);
      const matches = [...this.session.indexes.byFilePath.get(fileKey) || []].some((ref) => {
        const finding = this.session.getFinding(ref.findingId);
        if (!finding) {
          return false;
        }
        return finding.events.some((ev, ei) => {
          const t = this.session.getTracked(finding.id, ei);
          return t?.uri && normalizePathKey(t.uri.fsPath) === activePath;
        });
      });
      if (!matches) {
        return false;
      }
    }
    const q = (this.session.filterText || '').toLowerCase();
    if (!q) {
      return true;
    }
    return fileKey.toLowerCase().includes(q);
  }

  checkerPassesFilter(checkerId, findingIds) {
    const q = (this.session.filterText || '').toLowerCase();
    if (q && !checkerId.toLowerCase().includes(q)) {
      const any = findingIds.some((id) => findingMatchesQuery(this.session, id, q));
      if (!any) {
        return false;
      }
    }
    return true;
  }
}

function findingMatchesQuery(session, findingId, q) {
  const f = session.getFinding(findingId);
  if (!f) {
    return false;
  }
  const hay = [f.typeTitle, f.checkerId, f.cid, ...(f.events || []).map((e) => e.label + e.rawPayload)].join(' ').toLowerCase();
  return hay.includes(q);
}

class InfoItem extends vscode.TreeItem {
  constructor(msg) {
    super(msg, vscode.TreeItemCollapsibleState.None);
  }
  getChildren() {
    return [];
  }
}

class FolderNode extends vscode.TreeItem {
  /**
   * @param {string} folderPath posix dir
   */
  constructor(folderPath) {
    super(folderPath || '.', vscode.TreeItemCollapsibleState.Expanded);
    this.folderPath = folderPath;
    this.files = [];
    this.contextValue = 'coverityFolder';
  }
  getChildren(session) {
    return this.files.sort((a, b) => a.fileKey.localeCompare(b.fileKey));
  }
}

class FileNode extends vscode.TreeItem {
  constructor(fileKey) {
    super(path.posix.basename(fileKey), vscode.TreeItemCollapsibleState.Collapsed);
    this.fileKey = fileKey;
    this.description = path.posix.dirname(fileKey);
    this.tooltip = fileKey;
    this.contextValue = 'coverityFile';
  }
  getChildren(session) {
    const refs = session.indexes.byFilePath.get(this.fileKey) || [];
    return refs.map((ref) => new FindingNode(ref.findingId, this.fileKey));
  }
}

class CheckerNode extends vscode.TreeItem {
  constructor(checkerId, count) {
    const label = checkerId === 'Unknown' ? 'Unknown type' : checkerId;
    super(`${label} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
    this.checkerId = checkerId;
    this.count = count;
    this.tooltip = `${count} unique finding(s) in this checker group`;
  }
  getChildren(session) {
    const ids = session.indexes.byChecker.get(this.checkerId) || [];
    const fileMap = new Map();
    for (const id of ids) {
      for (const [fileKey, refs] of session.indexes.byFilePath.entries()) {
        if (refs.some((r) => r.findingId === id)) {
          if (!fileMap.has(fileKey)) {
            fileMap.set(fileKey, []);
          }
          if (!fileMap.get(fileKey).includes(id)) {
            fileMap.get(fileKey).push(id);
          }
        }
      }
    }
    return [...fileMap.keys()].sort().map((fk) => new CheckerFileNode(fk, fileMap.get(fk)));
  }
}

class CheckerFileNode extends vscode.TreeItem {
  constructor(fileKey, findingIds) {
    super(path.posix.basename(fileKey), vscode.TreeItemCollapsibleState.Collapsed);
    this.fileKey = fileKey;
    this.findingIds = findingIds;
    this.description = path.posix.dirname(fileKey);
  }
  getChildren(session) {
    return this.findingIds.map((id) => new FindingNode(id, this.fileKey));
  }
}

class FindingNode extends vscode.TreeItem {
  constructor(findingId, fileKey) {
    const session = null;
    super('', vscode.TreeItemCollapsibleState.Collapsed);
    this.findingId = findingId;
    this.fileKey = fileKey;
    this.contextValue = 'coverityFinding';
  }

  /** @param {import('../state/reportSession').ReportSession} session */
  initLabel(session) {
    const f = session.getFinding(this.findingId);
    if (!f) {
      this.label = this.findingId;
      return;
    }
    const steps = f.events.length;
    const title = f.typeTitle || f.checkerId || 'Finding';
    this.label = `${title} (${steps} step${steps === 1 ? '' : 's'})`;
    this.description = f.checkerId || undefined;
    this.tooltip = `CID ${f.cid || '—'} · ${f.id}`;
    if (steps === 1) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
      this.command = {
        command: 'coverity.navigateToStep',
        title: 'Navigate',
        arguments: [this.findingId, 0],
      };
    }
  }

  getChildren(session) {
    this.initLabel(session);
    const f = session.getFinding(this.findingId);
    if (!f || f.events.length <= 1) {
      return [];
    }
    return f.events.map((ev, ei) => new StepNode(this.findingId, ei, ev));
  }
}

class StepNode extends vscode.TreeItem {
  constructor(findingId, eventIndex, ev) {
    super(`${ev.stepNumber || eventIndex + 1}. ${ev.label}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${ev.location.rawPath}:${ev.location.line}`;
    this.findingId = findingId;
    this.eventIndex = eventIndex;
    this.command = {
      command: 'coverity.navigateToStep',
      title: 'Navigate',
      arguments: [findingId, eventIndex],
    };
  }
  getChildren() {
    return [];
  }
}

module.exports = {
  FindingsTreeProvider,
};
