'use strict';

const vscode = require('vscode');
const { buildIssueDetailsHtml, emptyIssueDetailsHtml } = require('./buildIssueDetailsHtml');
const { lookupMisraRule, loadMisraRules } = require('../misra/misraRules');
const { describe } = require('../lookup/lookup');

const ISSUE_DETAILS_VIEW_ID = 'coverity.issueDetails';

/** @type {IssueDetailsViewProvider | null} */
let viewProvider = null;

function issueDetailsFollowActive() {
  return vscode.workspace.getConfiguration('coverity').get('issueDetailsFollowActive', true);
}

class IssueDetailsViewProvider {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {object} session
   */
  constructor(context, session) {
    this.context = context;
    this.session = session;
    /** @type {vscode.WebviewView | undefined} */
    this.view = undefined;
    /** @type {string | null} */
    this.pendingHtml = null;
    /** @type {string | null} */
    this.renderedFindingId = null;
    this._followInFlight = false;
  }

  resetToEmpty(message) {
    this.renderedFindingId = null;
    const html = emptyIssueDetailsHtml(message);
    if (this.view) {
      this.view.webview.html = html;
    } else {
      this.pendingHtml = html;
    }
  }

  /**
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [],
    };
    webviewView.onDidDispose(() => {
      this.view = undefined;
    });

    // Warm MISRA index once the view appears.
    loadMisraRules(this.context);

    if (this.pendingHtml) {
      webviewView.webview.html = this.pendingHtml;
      this.pendingHtml = null;
    } else if (this.session.hasReport() && this.session.activeFindingId) {
      void this.renderFinding(this.session.activeFindingId, { focus: false });
    } else {
      webviewView.webview.html = emptyIssueDetailsHtml();
    }
  }

  /**
   * @param {string} html
   * @param {string | null} [findingId]
   * @param {{ focus?: boolean }} [opts]
   */
  async setHtml(html, findingId = null, opts = {}) {
    const focus = opts.focus === true;
    this.renderedFindingId = findingId;
    if (this.view) {
      this.view.webview.html = html;
      if (focus) {
        this.view.show?.(true);
      }
    } else {
      this.pendingHtml = html;
    }
  }

  handleSessionChange() {
    if (!issueDetailsFollowActive()) {
      return;
    }
    if (!this.session.hasReport()) {
      this.resetToEmpty('Load a Coverity report to see issue details.');
      return;
    }
    const findingId = this.session.activeFindingId;
    if (!findingId) {
      return;
    }
    if (findingId === this.renderedFindingId) {
      return;
    }
    void this.renderFinding(findingId, { focus: false });
  }

  /**
   * @param {string} findingId
   * @param {{ focus?: boolean }} [opts]
   */
  async renderFinding(findingId, opts = {}) {
    if (this._followInFlight) {
      return;
    }
    this._followInFlight = true;
    try {
      const finding = this.session.getFinding(findingId);
      if (!finding) {
        this.resetToEmpty('Selected issue is no longer in the loaded report.');
        return;
      }
      const checkerId = finding.checkerId || '';
      const typeTitle = finding.typeTitle || checkerId;
      const rule = lookupMisraRule(this.context, checkerId, typeTitle);
      const mainEv = finding.events[finding.events.length - 1];
      const hint = describe(checkerId, mainEv?.label);
      const findingSummary = [hint, mainEv?.rawPayload].filter(Boolean).join(' — ');
      const html = buildIssueDetailsHtml({
        checkerId,
        typeTitle,
        findingSummary,
        rule,
      });
      await this.setHtml(html, findingId, opts);
    } finally {
      this._followInFlight = false;
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {object} session
 */
function registerIssueDetailsView(context, session) {
  viewProvider = new IssueDetailsViewProvider(context, session);
  context.subscriptions.push(
    session.onDidChange(() => viewProvider.handleSessionChange()),
    vscode.window.registerWebviewViewProvider(ISSUE_DETAILS_VIEW_ID, viewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
  return viewProvider;
}

/**
 * @param {object} session
 * @param {string | undefined} findingId
 */
async function showIssueDetails(session, findingId) {
  if (!session.hasReport()) {
    vscode.window.showWarningMessage('Coverity: load a report first.');
    return;
  }
  if (!viewProvider) {
    vscode.window.showWarningMessage('Coverity: Issue Details view is not registered.');
    return;
  }

  const fid = findingId || session.activeFindingId;
  if (!fid) {
    vscode.window.showWarningMessage('Coverity: no issue selected for Issue Details.');
    viewProvider.resetToEmpty();
    try {
      await vscode.commands.executeCommand(`${ISSUE_DETAILS_VIEW_ID}.focus`);
    } catch {
      // ignore
    }
    return;
  }

  await viewProvider.renderFinding(fid, { focus: true });
  try {
    await vscode.commands.executeCommand(`${ISSUE_DETAILS_VIEW_ID}.focus`);
  } catch {
    // View may be hidden; content is still updated.
  }
  viewProvider.view?.show?.(true);
}

module.exports = {
  ISSUE_DETAILS_VIEW_ID,
  registerIssueDetailsView,
  showIssueDetails,
};
