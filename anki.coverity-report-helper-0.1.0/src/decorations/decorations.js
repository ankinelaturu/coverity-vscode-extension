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
    /**
     * Wavy underline on non-main trace steps only (not the finding / last-step line — diagnostics own that).
     * text-decoration-color only; do not set `color` so glyph color stays the editor default.
     */
    this.traceStepMark = vscode.window.createTextEditorDecorationType({
      textDecoration:
        'underline wavy; text-underline-position: under; text-decoration-color: var(--vscode-editorInfo-foreground)',
      isWholeLine: false,
    });
    this.traceMargin = vscode.window.createTextEditorDecorationType({});

    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
    vscode.window.onDidChangeTextEditorSelection(() => this.update());
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('coverity.traceStripCodeLensBandPx') ||
        e.affectsConfiguration('coverity.traceStripConnectors') ||
        e.affectsConfiguration('coverity.traceBadgesEnabled') ||
        e.affectsConfiguration('coverity.traceStepMarkEnabled') ||
        e.affectsConfiguration('coverity.traceStepBackgroundEnabled')
      ) {
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
      editor.setDecorations(this.traceStepMark, []);
      return;
    }

    const cfg = vscode.workspace.getConfiguration('coverity');
    const lanesEnabled = cfg.get('experimentalTraceLanes', true);
    const badgesEnabled = cfg.get('traceBadgesEnabled', false);
    const markEnabled =
      typeof cfg.get('traceStepMarkEnabled', undefined) === 'boolean'
        ? cfg.get('traceStepMarkEnabled')
        : cfg.get('traceStepBackgroundEnabled', true);
    const active = [];
    const other = [];
    /** @type {vscode.Range[]} */
    const traceMarkRanges = [];
    const docKey = editor.document.uri.toString();
    const checkerFilter = this.session.getProblemsCheckerFilter();

    this.session.ensureActiveFindingForUri(editor.document.uri);

    for (const finding of this.session.indexes.findings) {
      if (checkerFilter && (finding.checkerId || 'Unknown') !== checkerFilter) {
        continue;
      }
      const lastEi = finding.events.length - 1;
      for (let ei = 0; ei < finding.events.length; ei++) {
        const t = this.session.getTracked(finding.id, ei);
        if (!t?.uri || t.uri.toString() !== docKey || !t.range) {
          continue;
        }
        if (markEnabled && ei !== lastEi) {
          traceMarkRanges.push(t.range);
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
    editor.setDecorations(this.traceStepMark, markEnabled ? traceMarkRanges : []);

    if (!badgesEnabled) {
      editor.setDecorations(this.traceMargin, []);
      return;
    }

    try {
      const codeLensRows = estimateCodeLensRowsPerLine(this.session, editor.document);
      editor.setDecorations(
        this.traceMargin,
        buildTraceMarginDecorations(this.session, editor, lanesEnabled, codeLensRows)
      );
    } catch (err) {
      console.error('[Coverity] trace margin decorations failed:', err);
      editor.setDecorations(this.traceMargin, []);
    }
  }

  dispose() {
    this.activeStep.dispose();
    this.otherStep.dispose();
    this.traceStepMark.dispose();
    this.traceMargin.dispose();
  }
}

module.exports = { DecorationManager };
