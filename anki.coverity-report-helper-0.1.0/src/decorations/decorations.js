'use strict';

const vscode = require('vscode');
const { buildTraceLaneGutterDecorations } = require('./gutterLaneDecorations');
const { buildSimpleGutterBadgeDecorations } = require('./gutterBadgeDecorations');
const { buildGutterProbeDecorations } = require('./gutterProbe');
const { bundledGutterIcon } = require('./gutterIconUri');

const CPP_LANGS = new Set(['c', 'cpp']);

/** @type {import('vscode').OutputChannel | null} */
let gutterLog = null;

function setGutterLog(channel) {
  gutterLog = channel;
}

/**
 * Overview ruler + trace gutter (multi-lane or simple step icons).
 */
class DecorationManager {
  /**
   * @param {object} session
   * @param {import('vscode').ExtensionContext} context
   * @param {import('vscode').OutputChannel} [outputChannel]
   */
  constructor(session, context, outputChannel) {
    this.session = session;
    this.context = context;
    if (outputChannel) {
      setGutterLog(outputChannel);
    }

    const probeIcon = bundledGutterIcon(context, 'gutter-probe.png');

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
    /** Type-level gutter icon (some hosts only honor this form). */
    this.gutterProbeType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: probeIcon,
      gutterIconSize: 'contain',
      backgroundColor: 'rgba(224, 64, 251, 0.12)',
      overviewRulerColor: 'rgba(224, 64, 251, 0.9)',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
    this.gutterProbeInstance = vscode.window.createTextEditorDecorationType({
      gutterIconSize: 'contain',
    });

    session.onDidChange(() => this.update());
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
    vscode.window.onDidChangeTextEditorSelection(() => this.update());
    setTimeout(() => this.update(), 300);
    setTimeout(() => this.update(), 1500);
  }

  update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const cfg = vscode.workspace.getConfiguration('coverity');
    const probeOn = cfg.get('gutterDebugProbe', true);

    if (probeOn) {
      const { decorations: probeInstance } = buildGutterProbeDecorations(editor, this.context);
      const { lineDecorationRange } = require('./editorLineRange');
      const probeRanges =
        editor.document.lineCount > 0 ? [lineDecorationRange(editor.document, 0)] : [];
      editor.setDecorations(this.gutterProbeType, probeRanges);
      editor.setDecorations(this.gutterProbeInstance, probeInstance);
    } else {
      editor.setDecorations(this.gutterProbeType, []);
      editor.setDecorations(this.gutterProbeInstance, []);
    }

    if (!CPP_LANGS.has(editor.document.languageId) || !this.session.hasReport()) {
      editor.setDecorations(this.activeStep, []);
      editor.setDecorations(this.otherStep, []);
      editor.setDecorations(this.traceGutter, []);
      return;
    }

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
    this.gutterProbeType.dispose();
    this.gutterProbeInstance.dispose();
  }
}

module.exports = { DecorationManager, setGutterLog };
