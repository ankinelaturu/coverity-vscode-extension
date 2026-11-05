'use strict';

const vscode = require('vscode');

/**
 * Overview ruler + optional gutter badges for the active finding's steps.
 * Experimental trace lanes are not implemented (API limitation); see DECISIONS_LOG.
 */
class DecorationManager {
  constructor(session) {
    this.session = session;
    this.activeStep = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('editor.wordHighlightStrongBackground'),
      overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    this.otherStep = vscode.window.createTextEditorDecorationType({
      opacity: '0.35',
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Center,
    });
    this.badge = vscode.window.createTextEditorDecorationType({
      gutterIconPath: undefined,
      before: { contentText: '●', margin: '0 0 0 1em', color: new vscode.ThemeColor('charts.yellow') },
    });
    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
  }

  update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.session.hasReport()) {
      return;
    }
    const badgesEnabled = vscode.workspace.getConfiguration('coverity').get('traceBadgesEnabled', true);
    const active = [];
    const other = [];
    const badgeMarks = [];

    for (const finding of this.session.indexes.findings) {
      for (let ei = 0; ei < finding.events.length; ei++) {
        const t = this.session.getTracked(finding.id, ei);
        if (!t?.uri || t.uri.toString() !== editor.document.uri.toString() || !t.range) {
          continue;
        }
        const isActiveFinding = finding.id === this.session.activeFindingId;
        if (isActiveFinding) {
          if (ei === this.session.activeEventIndex) {
            active.push(t.range);
            if (badgesEnabled) {
              badgeMarks.push({ range: t.range, renderOptions: { before: { contentText: `${ei + 1}` } } });
            }
          } else {
            other.push(t.range);
            if (badgesEnabled) {
              badgeMarks.push({ range: t.range, renderOptions: { before: { contentText: `${ei + 1}` } } });
            }
          }
        }
      }
    }

    editor.setDecorations(this.activeStep, active);
    editor.setDecorations(this.otherStep, other);
    if (badgesEnabled && badgeMarks.length) {
      editor.setDecorations(this.badge, badgeMarks);
    }
  }

  dispose() {
    this.activeStep.dispose();
    this.otherStep.dispose();
    this.badge.dispose();
  }
}

module.exports = { DecorationManager };
