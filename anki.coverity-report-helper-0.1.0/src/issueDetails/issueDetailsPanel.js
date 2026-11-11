'use strict';

const vscode = require('vscode');
const { buildIssueDetailsHtml, emptyIssueDetailsHtml } = require('./buildIssueDetailsHtml');
const { lookupMisraRule, loadMisraRules } = require('../misra/misraRules');
const { computePossibleFixForFinding } = require('../misra/possibleFixActions');
const { describe } = require('../lookup/lookup');
const { listFindingsOnLine } = require('../codelens/findingsAtLine');
const { matchDiagnosticFinding } = require('../navigation/editorNavigation');

const ISSUE_DETAILS_VIEW_ID = 'coverity.issueDetails';
const LINE_FOLLOW_DEBOUNCE_MS = 80;

/** @type {IssueDetailsViewProvider | null} */
let viewProvider = null;

function issueDetailsFollowActive() {
  return vscode.workspace.getConfiguration('coverity').get('issueDetailsFollowActive', true);
}

function isCpp(doc) {
  return doc && (doc.languageId === 'c' || doc.languageId === 'cpp');
}

/**
 * Pick the finding that should drive Issue Details for the caret line.
 * @param {object} session
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 * @returns {string | null}
 */
function resolveFindingIdForLine(session, document, position) {
  if (!session.hasReport() || !document) {
    return null;
  }
  const line = position.line;
  const choices = listFindingsOnLine(session, document.uri, line);
  if (choices.length === 0) {
    return null;
  }

  const diagHit = matchDiagnosticFinding(session, document, line);
  if (diagHit) {
    return diagHit.findingId;
  }

  if (session.activeFindingId && choices.some((c) => c.finding.id === session.activeFindingId)) {
    return session.activeFindingId;
  }

  const remembered = session.getLineFindingMemory?.(document.uri, line);
  if (remembered && choices.some((c) => c.finding.id === remembered)) {
    return remembered;
  }

  return choices[0].finding.id;
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
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._lineTimer = null;
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

    loadMisraRules(this.context);

    if (this.pendingHtml) {
      webviewView.webview.html = this.pendingHtml;
      this.pendingHtml = null;
    } else if (this.session.hasReport() && this.session.activeFindingId) {
      void this.renderFinding(this.session.activeFindingId, { focus: false });
    } else {
      webviewView.webview.html = emptyIssueDetailsHtml();
    }

    // Catch up to current caret when the view appears.
    this.scheduleFollowEditorLine();
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
    // Prefer caret-line finding; fall back to active finding from navigation/Problems.
    this.scheduleFollowEditorLine();
  }

  scheduleFollowEditorLine() {
    if (!issueDetailsFollowActive()) {
      return;
    }
    if (this._lineTimer) {
      clearTimeout(this._lineTimer);
    }
    this._lineTimer = setTimeout(() => {
      this._lineTimer = null;
      void this.followEditorLine();
    }, LINE_FOLLOW_DEBOUNCE_MS);
  }

  async followEditorLine() {
    if (!issueDetailsFollowActive()) {
      return;
    }
    if (!this.session.hasReport()) {
      this.resetToEmpty('Load a Coverity report to see issue details.');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || !isCpp(editor.document)) {
      this.resetToEmpty('Open a C/C++ file and place the caret on a Coverity finding line.');
      return;
    }

    const findingId = resolveFindingIdForLine(
      this.session,
      editor.document,
      editor.selection.active
    );
    if (!findingId) {
      this.resetToEmpty(
        'No Coverity issue or event on this line. Move the caret to a finding line (or select an issue in Problems).'
      );
      return;
    }
    if (findingId === this.renderedFindingId) {
      return;
    }
    await this.renderFinding(findingId, { focus: false });
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
      let possibleFix = null;
      try {
        possibleFix = await computePossibleFixForFinding(this.session, findingId);
      } catch (err) {
        console.warn('Coverity: possible fix failed', err);
      }
      const html = buildIssueDetailsHtml({
        checkerId,
        typeTitle,
        findingSummary,
        rule,
        possibleFix,
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
    vscode.window.onDidChangeActiveTextEditor(() => viewProvider.scheduleFollowEditorLine()),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!isCpp(e.textEditor.document)) {
        return;
      }
      viewProvider.scheduleFollowEditorLine();
    }),
    {
      dispose() {
        if (viewProvider?._lineTimer) {
          clearTimeout(viewProvider._lineTimer);
          viewProvider._lineTimer = null;
        }
      },
    },
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

  let fid = findingId || null;
  if (!fid) {
    const editor = vscode.window.activeTextEditor;
    if (editor && isCpp(editor.document)) {
      fid = resolveFindingIdForLine(session, editor.document, editor.selection.active);
    }
  }
  fid = fid || session.activeFindingId;
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
  resolveFindingIdForLine,
};
