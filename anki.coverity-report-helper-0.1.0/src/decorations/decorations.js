'use strict';

const vscode = require('vscode');
const { buildTraceLaneGutterDecorations } = require('./gutterLaneDecorations');

/**
 * Overview ruler + optional trace gutter (multi-lane SVG icons or simple badges).
 */
class DecorationManager {
  /**
   * @param {object} session
   * @param {import('vscode').ExtensionContext} context
   */
  constructor(session, context) {
    this.session = session;
    this.context = context;
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
      before: { contentText: '●', margin: '0 0 0 1em', color: new vscode.ThemeColor('charts.yellow') },
    });
    this.traceLaneGutter = vscode.window.createTextEditorDecorationType({
      gutterIconSize: 'contain',
    });
    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
  }

  update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.session.hasReport()) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration('coverity');
    const lanesEnabled = cfg.get('experimentalTraceLanes', false);
    const badgesEnabled = cfg.get('traceBadgesEnabled', true);
    const active = [];
    const other = [];
    const badgeMarks = [];
    const laneMarks = [];

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
          } else {
            other.push(t.range);
          }
          if (badgesEnabled && !lanesEnabled) {
            badgeMarks.push({ range: t.range, renderOptions: { before: { contentText: `${ei + 1}` } } });
          }
        }
      }
    }

    if (lanesEnabled) {
      laneMarks.push(...buildTraceLaneGutterDecorations(this.session, editor, this.context));
    }

    editor.setDecorations(this.activeStep, active);
    editor.setDecorations(this.otherStep, other);
    editor.setDecorations(this.traceLaneGutter, laneMarks);
    if (badgesEnabled && !lanesEnabled && badgeMarks.length) {
      editor.setDecorations(this.badge, badgeMarks);
    } else {
      editor.setDecorations(this.badge, []);
    }
  }

  dispose() {
    this.activeStep.dispose();
    this.otherStep.dispose();
    this.badge.dispose();
    this.traceLaneGutter.dispose();
  }
}

module.exports = { DecorationManager };
