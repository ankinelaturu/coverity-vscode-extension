'use strict';

const vscode = require('vscode');
const { buildTraceLaneGutterDecorations } = require('./gutterLaneDecorations');
const { buildSimpleGutterBadgeDecorations } = require('./gutterBadgeDecorations');
const { buildGutterProbeDecorations } = require('./gutterProbe');

const CPP_LANGS = new Set(['c', 'cpp']);

/**
 * Overview ruler + trace gutter (multi-lane or simple step icons).
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
    this.traceGutter = vscode.window.createTextEditorDecorationType({
      gutterIconSize: 'contain',
    });
    this.gutterProbe = vscode.window.createTextEditorDecorationType({
      gutterIconSize: 'contain',
    });
    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
    vscode.window.onDidChangeTextEditorSelection(() => this.update());
    setTimeout(() => this.update(), 500);
  }

  update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !CPP_LANGS.has(editor.document.languageId)) {
      return;
    }

    const probeMarks = buildGutterProbeDecorations(editor, this.context);
    editor.setDecorations(this.gutterProbe, probeMarks);

    if (!this.session.hasReport()) {
      editor.setDecorations(this.activeStep, []);
      editor.setDecorations(this.otherStep, []);
      editor.setDecorations(this.traceGutter, []);
      return;
    }

    const cfg = vscode.workspace.getConfiguration('coverity');
    const lanesEnabled = cfg.get('experimentalTraceLanes', true);
    const badgesEnabled = cfg.get('traceBadgesEnabled', true);
    const active = [];
    const other = [];
    const gutterMarks = [];

    this.session.ensureActiveFindingForUri(editor.document.uri);

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
        }
      }
    }

    if (badgesEnabled) {
      if (lanesEnabled) {
        gutterMarks.push(...buildTraceLaneGutterDecorations(this.session, editor, this.context));
      } else {
        gutterMarks.push(...buildSimpleGutterBadgeDecorations(this.session, editor, this.context));
      }
    }

    editor.setDecorations(this.activeStep, active);
    editor.setDecorations(this.otherStep, other);
    editor.setDecorations(this.traceGutter, gutterMarks);
  }

  dispose() {
    this.activeStep.dispose();
    this.otherStep.dispose();
    this.traceGutter.dispose();
    this.gutterProbe.dispose();
  }
}

module.exports = { DecorationManager };
