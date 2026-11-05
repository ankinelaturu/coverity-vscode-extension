'use strict';

const vscode = require('vscode');
const { buildTraceMarginDecorations } = require('./traceMarginDecorations');
const { estimateCodeLensRowsPerLine } = require('./codeLensLayout');

const CPP_LANGS = new Set(['c', 'cpp']);

/**
 * Line numbers | COV strip (line-decorations column) | source.
 * See DEC-011 — not the breakpoint glyph margin.
 */
class DecorationManager {
  constructor(session, context) {
    this.session = session;
    this.context = context;

    this.activeStep = vscode.window.createTextEditorDecorationType({
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      borderColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    this.otherStep = vscode.window.createTextEditorDecorationType({
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Center,
    });
    this.traceMargin = vscode.window.createTextEditorDecorationType({});

    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
    vscode.window.onDidChangeTextEditorSelection(() => this.update());
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('coverity.traceStripCodeLensBandPx')) {
        this.update();
      }
    });
    setTimeout(() => this.update(), 300);
  }

  update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    if (!CPP_LANGS.has(editor.document.languageId) || !this.session.hasReport()) {
      editor.setDecorations(this.traceMargin, []);
      editor.setDecorations(this.activeStep, []);
      editor.setDecorations(this.otherStep, []);
      return;
    }

    const cfg = vscode.workspace.getConfiguration('coverity');
    const lanesEnabled = cfg.get('experimentalTraceLanes', true);
    const badgesEnabled = cfg.get('traceBadgesEnabled', true);
    const active = [];
    const other = [];

    this.session.ensureActiveFindingForUri(editor.document.uri);

    for (const finding of this.session.indexes.findings) {
      for (let ei = 0; ei < finding.events.length; ei++) {
        const t = this.session.getTracked(finding.id, ei);
        if (!t?.uri || t.uri.toString() !== editor.document.uri.toString() || !t.range) {
          continue;
        }
        if (finding.id === this.session.activeFindingId) {
          if (ei === this.session.activeEventIndex) {
            active.push(t.range);
          } else {
            other.push(t.range);
          }
        }
      }
    }

    editor.setDecorations(this.activeStep, active);
    editor.setDecorations(this.otherStep, other);

    if (!badgesEnabled) {
      editor.setDecorations(this.traceMargin, []);
      return;
    }

    try {
      const codeLensRows = estimateCodeLensRowsPerLine(this.session, editor.document);
      editor.setDecorations(
        this.traceMargin,
        buildTraceMarginDecorations(this.session, editor, this.context, lanesEnabled, codeLensRows)
      );
    } catch (err) {
      console.error('[Coverity] trace margin decorations failed:', err);
      editor.setDecorations(this.traceMargin, []);
    }
  }

  dispose() {
    this.activeStep.dispose();
    this.otherStep.dispose();
    this.traceMargin.dispose();
  }
}

module.exports = { DecorationManager };
